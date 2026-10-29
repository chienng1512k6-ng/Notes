const PREFIX = 'mini-notes-shell-';
const CACHE = `${PREFIX}v2`;
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate' && url.pathname === '/';
  const asset = url.pathname.startsWith('/_next/static/') || SHELL.slice(1).includes(url.pathname);
  // Never cache arbitrary pages, API responses, or unrelated images.
  if (!navigation && !asset) return;
  const network = async () => {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(navigation ? '/' : request, copy)));
    }
    return response;
  };
  event.respondWith(navigation
    ? network().catch(async () => (await caches.match('/')) || Response.error())
    : caches.match(request).then(cached => cached || network()));
});
