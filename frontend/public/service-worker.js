const CACHE_NAME = 'smart-attendance-shell-v2';
const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.svg',
  '/mediapipe/camera_utils.js',
  '/mediapipe/face_mesh.js'
];

// Install: precache offline vendor assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[ServiceWorker] Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: purge older caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Always prefer fresh network for HTML/app bundles so git pushes reflect immediately without version bumps
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.includes('/api/v1/') || url.origin !== self.location.origin) {
    return;
  }

  // HTML navigation: always bypass HTTP cache so latest deployed Vercel entry loads immediately
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(new Request(request.url, { cache: 'no-store' }))
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html') || await caches.match('/');
          if (cached) return cached;
          return new Response('<h1>Offline</h1><p>Smart Attendance System is offline.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Heavy MediaPipe runtime scripts: cache-first
  if (url.pathname.startsWith('/mediapipe/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Hashed Vite assets & other static files: Network-first with offline cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
