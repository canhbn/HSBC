const CACHE = "hsbc-mock-v3";
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

// Install: cache core assets only
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// Fetch: network-first for transactions txt, cache-first for others
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always try network for the txt so edits show up immediately
  if (url.pathname.endsWith("/transactions_current.txt") || url.pathname.endsWith("transactions_current.txt")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
