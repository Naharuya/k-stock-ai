const SHELL_CACHE = "kstock-shell-2.5.1-pwa-1";
const SHELL_PATHS = ["/", "/styles.css", "/app.js", "/pwa.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_PATHS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("kstock-shell-") && key !== SHELL_CACHE).map((key) => caches.delete(key))
  )));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Financial/API responses must never be replayed from the offline cache.
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !SHELL_PATHS.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(url.pathname);
    return cached || Response.error();
  }));
});
