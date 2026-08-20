const CACHE = "kertotaikuri-v4";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg", "./src/styles.css", "./src/main.js", "./src/domain/curriculum.js", "./src/domain/question.js", "./src/domain/hints.js", "./src/domain/finaleScoring.js", "./src/domain/mastery.js", "./src/domain/dailyPractice.js", "./src/data/progressStore.js", "./src/data/progressBackup.js"];
self.addEventListener("install", (event) => event.waitUntil(Promise.all([
  self.skipWaiting(),
  caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
])));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
])));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
});
