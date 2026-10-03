/* JParty service worker — cache-first for the app shell and CDN libs so it works offline. */
const VERSION = 'jparty-vdylz2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './css/app.css', './css/tailwind.css',
  './dist/data.js', './dist/app.js',
];
const CDN = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      await cache.addAll(SHELL);
      // CDN assets are best-effort: a failure here must not block install.
      await Promise.all(CDN.map((url) => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isShell = url.origin === self.location.origin;
  const isCdn = CDN.some((u) => req.url.startsWith(u));
  if (!isShell && !isCdn) return;

  // Always revalidate our own files with the server so updates are never served from a stale HTTP cache
  // Navigation requests cannot be re-wrapped in a Request (mode 'navigate'), so re-fetch by URL instead
  const freshRequest = () => (req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(new Request(req, { cache: 'no-cache' })));
  const fetchAndCache = () => (isShell ? freshRequest() : fetch(req)).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
    }
    return res;
  });

  if (isShell) {
    // Network-first for our own files so updates land immediately; cache is the offline fallback.
    event.respondWith(fetchAndCache().catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    // Cache-first for pinned CDN libraries.
    event.respondWith(caches.match(req).then((cached) => cached || fetchAndCache()));
  }
});
