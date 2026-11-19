/* Офлайн-оболочка приложения. Запросы к GitHub API не кэшируются. */
const CACHE = "zal-v1.0.3";
const SHELL = ["./", "index.html", "app.css?v=4", "js/catalog.js?v=4", "js/anim.js?v=4", "js/app.js?v=4", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "js/figdata.js?v=4"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // сеть в приоритете (чтобы обновления доходили), кэш — если связи нет
  const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; });
  const timeout = new Promise(res => setTimeout(res, 3500));
  e.respondWith(Promise.race([net.catch(() => null), timeout]).then(r => r || caches.match(e.request).then(c => c || net.catch(() => caches.match("index.html")))));
});
