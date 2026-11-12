const CACHE_PREFIX = "deggendorf-prayer";
const VERSION = "v19";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-${VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-offline-prayers-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const OFFLINE_PRAYER_API = "/api/offline/prayer-schedule";
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/offline.js",
  "/manifest.webmanifest",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/app-header-arch-background-mobile-v2.png",
  "/assets/app-header-arch-background-desktop-v2.png",
  "/assets/hero-home-mosque-night.png",
  "/assets/hero-home-mosque-night-desktop.png",
  "/assets/hero-friday-mosque-night.png",
  "/assets/hero-friday-mosque-night-desktop.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) =>
        Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)))
      ),
      networkFirstOfflinePrayerSnapshot(new Request(new URL(OFFLINE_PRAYER_API, self.location.origin), { credentials: "omit" })).catch(() => undefined),
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
            .filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE, DATA_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      ),
      purgePrivatePageEntries(PAGE_CACHE),
      self.clients.claim(),
    ])
  );
});

function isPrivateOrDataRequest(request) {
  const url = new URL(request.url);
  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/account") ||
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
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isImmutableStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith("/_next/static/");
}

function isNextPageRequest(request) {
  return request.headers.get("RSC") === "1" || request.headers.has("next-router-prefetch");
}

function isCacheable(response) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "cors")) return false;
  const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
  return !cacheControl.includes("no-store") && !cacheControl.includes("private");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function purgePrivatePageEntries(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => {
        const url = new URL(request.url);
        return url.origin === self.location.origin && (
          url.pathname.startsWith("/account") ||
          url.pathname.startsWith("/admin")
        );
      })
      .map((request) => cache.delete(request))
  );
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
    ? { cacheName: IMAGE_CACHE, maxEntries: 120 }
    : { cacheName: STATIC_CACHE, maxEntries: 120 };
}

async function networkFirstAsset(request, target) {
  try {
    const response = await fetchWithTimeout(request, 3500);
    await storeResponse(target.cacheName, request, response, target.maxEntries);
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}


const OFFLINE_PRAYER_NAMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const OFFLINE_IQAMA_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const OFFLINE_CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const OFFLINE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validOfflinePrayerSnapshot(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)
    || Object.keys(data).length !== 5
    || !["schemaVersion", "timezone", "fetchedAt", "iqamaDelays", "rows"].every(key => Object.hasOwn(data, key))
    || data.schemaVersion !== 1 || typeof data.timezone !== "string"
    || data.timezone.length === 0 || data.timezone.length > 100
    || typeof data.fetchedAt !== "string" || !Number.isFinite(Date.parse(data.fetchedAt))
    || Date.parse(data.fetchedAt) > Date.now() + 5 * 60_000
    || Date.now() - Date.parse(data.fetchedAt) > 370 * 24 * 60 * 60_000
    || !Array.isArray(data.rows) || data.rows.length > 400) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: data.timezone }); } catch { return false; }
  const delays = data.iqamaDelays;
  if (delays !== null && (!delays || typeof delays !== "object" || Array.isArray(delays)
    || Object.keys(delays).length !== 5
    || !OFFLINE_IQAMA_NAMES.every(key => Number.isInteger(delays[key]) && delays[key] >= 0 && delays[key] <= 180))) return false;

  let previous = "";
  for (const day of data.rows) {
    if (!day || typeof day !== "object" || Array.isArray(day)
      || Object.keys(day).length !== 7 || typeof day.date !== "string"
      || !OFFLINE_DATE.test(day.date) || day.date <= previous
      || !OFFLINE_PRAYER_NAMES.every(key => typeof day[key] === "string" && OFFLINE_CLOCK.test(day[key]))) return false;
    const parsedDate = new Date(day.date + "T00:00:00Z");
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== day.date) return false;
    previous = day.date;
  }
  return true;
}

async function readValidOfflineSnapshot(response) {
  if (!response || response.status !== 200 || !isCacheable(response)
    || !(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) return false;
  const declaredBytes = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > 192 * 1024) return false;
  try {
    const body = await response.clone().text();
    if (body.length > 192 * 1024) return false;
    return validOfflinePrayerSnapshot(JSON.parse(body));
  } catch {
    return false;
  }
}

async function networkFirstOfflinePrayerSnapshot(request) {
  const key = new Request(new URL(OFFLINE_PRAYER_API, self.location.origin), { credentials: "omit" });
  try {
    const response = await fetchWithTimeout(request, 8000);
    if (await readValidOfflineSnapshot(response)) {
      await storeResponse(DATA_CACHE, key, response, 1);
      return response;
    }
    // A temporarily unhealthy server must not overwrite the last verified
    // public schedule. Invalid 200 bodies are never stored either.
  } catch {
    // Offline or timeout: try the previously verified public snapshot.
  }
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(key);
  if (cached && await readValidOfflineSnapshot(cached)) return cached;
  return new Response(JSON.stringify({ error: "Offline prayer times unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "REFRESH_OFFLINE_PRAYERS") {
    event.waitUntil(networkFirstOfflinePrayerSnapshot(new Request(new URL(OFFLINE_PRAYER_API, self.location.origin), { credentials: "omit" })).then(() => undefined));
    return;
  }
  if (event.data?.type !== "CACHE_RESOURCES" || !Array.isArray(event.data.urls)) return;

  event.waitUntil((async () => {
    const urls = event.data.urls.slice(0, 120).filter((value) => {
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
      const request = new Request(url.href, { credentials: "same-origin" });
      const response = await fetch(request);
      await storeResponse(target.cacheName, request, response, target.maxEntries);
    }));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === OFFLINE_PRAYER_API && !url.search && request.method === "GET"
    && !request.headers.has("authorization")) {
    event.respondWith(networkFirstOfflinePrayerSnapshot(request));
    return;
  }
  if (isPrivateOrDataRequest(request)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(request);
        await storeResponse(PAGE_CACHE, request, response, 40);
        return response;
      } catch {
        const offlineHome = await caches.match(OFFLINE_URL);
        // The previous SSR homepage only embedded a 30-day snapshot and may
        // be outdated. On disconnected app launch prefer the annual offline
        // dashboard over a cached stale root HTML response.
        if (url.pathname === "/" && offlineHome) return offlineHome;
        return (
          (await caches.match(request)) ||
          offlineHome ||
          new Response("You are offline", { status: 503, headers: { "Content-Type": "text/plain" } })
        );
      }
    })());
    return;
  }

  if (isStaticAsset(request)) {
    const target = cacheTargetForUrl(url);
    if (isImmutableStaticAsset(request)) {
      event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        await storeResponse(target.cacheName, request, response, target.maxEntries);
        return response;
      })());
      return;
    }

    // Assets under /assets, optimized images and the manifest have stable URLs
    // across deploys. Prefer the network so a new production deploy cannot be
    // masked indefinitely by an older PWA cache; retain cache as offline fallback.
    event.respondWith(networkFirstAsset(request, target));
    return;
  }

  if (isNextPageRequest(request)) {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(request);
        await storeResponse(PAGE_CACHE, request, response, 40);
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});

function isStalePrayerPush(payload) {
  if (payload.kind !== "adhan" && payload.kind !== "prayer-reminder") return false;
  if (typeof payload.expiresAt !== "string" || payload.expiresAt.length === 0) return false;
  const expiresAt = Date.parse(payload.expiresAt);
  return Number.isFinite(expiresAt) && Date.now() >= expiresAt;
}

async function broadcastAdhanToOpenApp(payload) {
  if (payload.kind !== "adhan") return;

  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  // Admin routes do not mount AdhanAudioProvider. Only a single public
  // window should receive playback instructions, otherwise separate tabs
  // can play the same Adhan concurrently on one device.
  const publicClients = clients.filter((client) => {
    try {
      const url = new URL(client.url);
      return url.origin === self.location.origin
        && url.pathname !== "/admin"
        && !url.pathname.startsWith("/admin/");
    } catch {
      return false;
    }
  });
  const target = publicClients.find((client) => client.focused)
    || publicClients.find((client) => client.visibilityState === "visible")
    || publicClients[0];
  if (!target) return;

  target.postMessage({
    type: "ADHAN_DUE",
    tag: payload.tag,
    prayer: payload.prayer,
    date: payload.date,
    eventId: payload.eventId,
    dueAt: payload.dueAt,
  });
}

self.addEventListener("push", (event) => {
  let payload = { title: "مسجد الدوناو", body: "تحديث جديد من المسجد", url: "/news", tag: "mosque-update", kind: "content" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}

  event.waitUntil((async () => {
    if (isStalePrayerPush(payload)) return;
    await Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/assets/app-icon-192.png",
        tag: payload.tag,
        renotify: false,
        data: {
          url: payload.url,
          kind: payload.kind,
          prayer: payload.prayer,
          date: payload.date,
          eventId: payload.eventId,
          dueAt: payload.dueAt,
          expiresAt: payload.expiresAt,
        },
      }),
      broadcastAdhanToOpenApp(payload),
    ]);
  })());
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
