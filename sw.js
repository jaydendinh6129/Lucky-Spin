/* Party Spinner service worker — cache-first for the app shell and CDN libs so it works offline. */
const VERSION = 'party-games-v2.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './css/app.css',
  './js/engine/util.js', './js/data/themes.js', './js/data/i18n.js', './js/data/challenges.js', './js/data/questions.js', './js/data/cards.js', './js/data/registry.js',
  './js/engine/audio.js', './js/engine/effects.js', './js/engine/randomEngine.js', './js/engine/scoreEngine.js', './js/engine/timerEngine.js', './js/engine/playerEngine.js',
  './js/engine/gameEngine.js', './js/engine/sessionEngine.js', './js/subscription/plans.js', './js/venue/venue.js',
  './js/components/ui.js', './js/components/premium.js', './js/components/wheel.js', './js/components/items.js', './js/components/reveals.js', './js/components/modals.js',
  './js/components/game.js', './js/components/sidebar.js', './js/realtime/transport.js', './js/realtime/host.js', './js/realtime/player.js', './js/venue/venueView.js', './js/venue/bigscreen.js', './js/games/spinner.js', './js/games/party.js', './js/games/battle.js', './js/games/king.js', './js/games/quiz.js', './js/games/minigames.js', './js/games/cards.js', './js/app.js',
];
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7/babel.min.js',
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
  const fetchAndCache = () => fetch(isShell ? new Request(req, { cache: 'no-cache' }) : req).then((res) => {
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
