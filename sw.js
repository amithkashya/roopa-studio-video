const CACHE_NAME = "roopa-studio-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/services.html",
  "/offers.html",
  "/portfolio.html",
  "/contact.html",
  "/admin",
  "/admin.html",
  "/styles.css",
  "/script.js",
  "/admin.js",
  "/site.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (!isSameOrigin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ ok: false, offline: true }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
          return caches.match("/index.html");
        });
    })
  );
});
