const CACHE_NAME = "deggendorf-prayer-v4";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/times",
  "/friday",
  "/news",
  "/donations",
  "/mosque",
  "/events",
  "/azkar",
  "/ramadan",
  "/qibla",
  "/settings",
  "/more",
  "/assets/app-icon-main.png",
  "/assets/hero-home-mosque-night.png",
  "/assets/hero-home-mosque-night-desktop.png",
  "/assets/hero-friday-mosque-night.png",
  "/assets/hero-friday-mosque-night-desktop.png",
  "/assets/hero-donations-charity.png",
  "/assets/hero-donations-charity-desktop.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isPrivateOrDataRequest(request) {
  const url = new URL(request.url);
  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase")
  );
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".json") ||
    url.pathname.startsWith("/_next/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (isPrivateOrDataRequest(request)) return;

  // Static assets: cache-first, then network
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response("You are offline", {
            status: 503,
            headers: { "Content-Type": "text/html" },
          });
        })
    );
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Deggendorf Prayer", body: "New mosque update", url: "/news" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/assets/app-icon-main.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/news"));
});
