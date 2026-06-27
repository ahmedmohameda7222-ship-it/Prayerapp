const CACHE_PREFIX = "deggendorf-prayer";
const VERSION = "v13";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) =>
        Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)))
      ),
      self.skipWaiting(),
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim(),
    ])
  );
});

function isPrivateOrDataRequest(request) {
  const url = new URL(request.url);
  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase") ||
    request.headers.has("authorization")
  );
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    ["font", "image", "script", "style"].includes(request.destination) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isNextPageRequest(request) {
  return request.headers.get("RSC") === "1" || request.headers.has("next-router-prefetch");
}

function isCacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "cors");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function storeResponse(cacheName, request, response, maxEntries) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, copy);
    await trimCache(cacheName, maxEntries);
  } catch {
    // A cache write failure must never block the live response.
  }
}

async function fetchWithTimeout(request, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function cacheTargetForUrl(url) {
  const isImage = url.pathname.startsWith("/_next/image") || /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(url.pathname);
  return isImage
    ? { cacheName: IMAGE_CACHE, maxEntries: 24 }
    : { cacheName: STATIC_CACHE, maxEntries: 48 };
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_RESOURCES" || !Array.isArray(event.data.urls)) return;

  event.waitUntil((async () => {
    const urls = event.data.urls.slice(0, 48).filter((value) => {
      if (typeof value !== "string") return false;
      const url = new URL(value, self.location.origin);
      return url.origin === self.location.origin && (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/_next/image") ||
        url.pathname.startsWith("/assets/")
      );
    });

    await Promise.allSettled(urls.map(async (value) => {
      const url = new URL(value, self.location.origin);
      const target = cacheTargetForUrl(url);
      const cache = await caches.open(target.cacheName);
      const request = new Request(url.href, { credentials: "same-origin" });
      if (await cache.match(request)) return;
      const response = await fetch(request);
      await storeResponse(target.cacheName, request, response, target.maxEntries);
    }));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateOrDataRequest(request)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(request);
        await storeResponse(PAGE_CACHE, request, response, 18);
        return response;
      } catch {
        return (
          (await caches.match(request)) ||
          (url.pathname === "/" ? await caches.match("/") : undefined) ||
          (await caches.match(OFFLINE_URL)) ||
          new Response("You are offline", { status: 503, headers: { "Content-Type": "text/plain" } })
        );
      }
    })());
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const isImage = request.destination === "image" || url.pathname.startsWith("/_next/image");
      await storeResponse(isImage ? IMAGE_CACHE : STATIC_CACHE, request, response, isImage ? 24 : 48);
      return response;
    })());
    return;
  }

  if (isNextPageRequest(request)) {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(request);
        await storeResponse(PAGE_CACHE, request, response, 18);
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "Masjid El-Rahman", body: "New mosque update", url: "/news", tag: "mosque-update" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/assets/app-icon-192.png",
      tag: payload.tag,
      renotify: false,
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const requestedUrl = new URL(event.notification.data?.url || "/news", self.location.origin);
    const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : `${self.location.origin}/`;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if ("focus" in client) {
        if ("navigate" in client) await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
