const CACHE_NAME = 'borteh-v1';
const ASSETS_TO_CACHE = [
  './', 
  './html/index.html',       // SPLASH SCREEN
  './html/home.html',        // HOME PAGE
  './html/about.html',       // ABOUT PAGE
  './html/cart.html',        // CART PAGE
  './html/wishlist.html',    // WISHLIST PAGE
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
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Fetch Event: Serve from Cache, then Network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      console.log('[Service Worker] Fetching resource: ' + e.request.url);
      // If found in cache, return it. If not, go to network.
      return r || fetch(e.request);
    })
  );
});