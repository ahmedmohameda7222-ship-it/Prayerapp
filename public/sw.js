const CACHE_NAME = "deggendorf-prayer-v1";
const STATIC_ASSETS = [
  "/",
  "/times",
  "/friday",
  "/news",
  "/more",
  "/donations",
  "/azkar",
  "/ramadan",
  "/events",
  "/mosque",
  "/qibla",
  "/settings",
  "/assets/app-icon-main.png",
  "/assets/hero-home-mosque-night.png",
  "/assets/hero-friday-mosque-night.png",
  "/assets/hero-donations-charity.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      .catch(() => {})
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = (event as FetchEvent).request;
  if (request.method !== "GET") return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        return response;
      });
    })
  );
});
