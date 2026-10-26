'use strict';
// Bump this version whenever any shell asset changes. Never cache event data.
const CACHE = 'my-event-planner-shell-v2';
const ROOT = new URL('./', self.location.href);
const ASSETS = ['./', 'index.html', 'style.css', 'storage.js', 'app.js', 'pwa.js',
  'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/icon-maskable-512.png'];
const URLS = new Set(ASSETS.map(path => new URL(path, ROOT).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...URLS])));
  // Updates wait for all old app windows to close, avoiding unsaved-state loss.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('my-event-planner-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== ROOT.origin) return;
  if (request.mode === 'navigate' && request.url.startsWith(ROOT.href)) {
    event.respondWith(fetch(request).catch(() => caches.match(new URL('index.html', ROOT).href)));
  } else if (URLS.has(request.url)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
