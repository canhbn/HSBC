const CACHE = "hsbc-mock-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always try network for TXT files (so edits show immediately)
  if (url.pathname.endsWith(".txt")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache-first for core assets
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
