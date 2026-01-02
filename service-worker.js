const CACHE_NAME = 'borteh-v2'; // Incremented version
const ASSETS_TO_CACHE = [
  './',                   // Root
  './index.html',         // Splash Screen in Root
  './manifest.json',      // Manifest in Root
  './html/home.html',     // Home Page in html/
  './html/about.html',    // About Page
  './html/cart.html',     // Cart Page
  './html/wishlist.html', // Wishlist Page
  './assets/css/style.css',
  './js/app.js',
  './js/cart.js',
  './js/supabase-client.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Install Event: Cache files
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: Cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// 3. Fetch Event: Serve from Cache, then Network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      return r || fetch(e.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Only cache successful requests
          if (e.request.url.startsWith('http')) {
             cache.put(e.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});