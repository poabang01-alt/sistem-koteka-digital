/* Koteka Digital: bounded, same-origin, static-public-content PWA cache. */
'use strict';
const VERSION = 'v11-audit9';
const PREFIX = 'koteka-digital-';
const SHELL_CACHE = `${PREFIX}shell-${VERSION}`;
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const MEDIA_CACHE = `${PREFIX}media-${VERSION}`;
const NAV_LIMIT = 22;
const STATIC_LIMIT = 70;
const MEDIA_LIMIT = 65;
const SHELL_URLS = [
  '/', '/offline.html', '/manifest.webmanifest',
  '/assets/index-B3BNhf1J.js', '/assets/kd-de0747668b.css',
  '/assets/kd-37f189b118.js', '/assets/kd-icons-loader-20261010.js',
  '/assets/kd-offline-20261010.js', '/assets/koteka-audit9-public.css',
  '/assets/koteka-audit9-public.js',
  '/img/koteka-app-icon-192.png', '/img/koteka-app-icon-512.png'
];
const isPublicPage = (path) => path === '/' ||
  /^\/(?:layanan|portofolio|blog|privacy-policy)\/$/.test(path) ||
  /^\/blog\/[a-z0-9-]+\/$/.test(path);
const isCacheable = (response) => response && response.ok &&
  (response.type === 'basic' || response.type === 'default');

const trimCache = async (cache, maxEntries, protectedUrls = []) => {
  const keys = await cache.keys();
  const removable = keys.filter((request) => !protectedUrls.includes(new URL(request.url).pathname));
  const excess = Math.max(0, keys.length - maxEntries);
  await Promise.all(removable.slice(0, excess).map((request) => cache.delete(request)));
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) &&
      ![SHELL_CACHE, STATIC_CACHE, MEDIA_CACHE].includes(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

const navigation = async (request) => {
  const path = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    if (isPublicPage(path) && isCacheable(response)) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
      await trimCache(cache, NAV_LIMIT, SHELL_URLS);
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || (await caches.match('/offline.html')) || Response.error();
  }
};

const staticAsset = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
      await trimCache(cache, STATIC_LIMIT);
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || Response.error();
  }
};

const mediaAsset = async (request, event) => {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
      await trimCache(cache, MEDIA_LIMIT);
    }
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh.catch(() => Response.error());
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept API/auth requests or private data.
  if (/^\/(?:api|admin|auth|login|dashboard)(?:\/|$)/.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
  } else if (/\.(?:js|css)$/.test(url.pathname) && url.pathname.startsWith('/assets/')) {
    event.respondWith(staticAsset(request));
  } else if (/^\/(?:assets|img|downloads)\//.test(url.pathname)) {
    event.respondWith(mediaAsset(request, event));
  }
});
