/**
 * LedgerLine Progressive Web App Service Worker (Bypass Cache for update)
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network and never use cache
  event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
});
