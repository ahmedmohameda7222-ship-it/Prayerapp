const CACHE_NAME = "deggendorf-prayer-v3";
const STATIC_ASSETS = [
  "/offline",
  "/assets/app-icon-main.png",
  "/assets/hero-home-mosque-night.png",
  "/assets/hero-friday-mosque-night.png",
  "/assets/hero-donations-charity.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

function isPrivateOrDataRequest(request) {
  const url = new URL(request.url);
  return request.method !== "GET" || url.pathname.startsWith("/admin") || url.pathname.startsWith("/api") || url.hostname.includes("supabase");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (isPrivateOrDataRequest(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match("/offline"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Deggendorf Prayer", body: "New mosque update", url: "/news" };
  try { payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: "/assets/app-icon-main.png", data: { url: payload.url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/news"));
});
