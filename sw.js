const CACHE_NAME = 'mbp-credit-v3'; // Nimebadilisha jina la cache tena ili kuhakikisha upakiaji mpya

const urlsToCache = [
  './', // Hii inawakilisha index.html na saraka kuu
  './index.html',
  './style.css',
  './app.js',
  './1.jpg',
  './1.png',
  './1.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js'
];

// Event: Install (Wakati service worker inaposakinishwa)
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache imefunguliwa na faili zimehifadhiwa.');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Kuna tatizo wakati wa kuhifadhi cache:', error);
      })
  );
});

// Event: Activate (Wakati service worker inapoanza kufanya kazi)
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Cache ya zamani inafutwa:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event: Fetch (Wakati app inapoomba rasilimali)
self.addEventListener('fetch', (event) => {
  // Epuka kukamata maombi ya 'chrome-extension://' ambayo yanaweza kutokea kwenye baadhi ya vivinjari
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Kama rasilimali ipo kwenye cache, irudishe
        if (response) {
          console.log('Service Worker: Kutumikia kutoka cache:', event.request.url);
          return response;
        }
        // Kama haipo, omba kutoka mtandaoni na uhifadhi kwenye cache
        return fetch(event.request)
          .then((res) => {
            // Hakikisha jibu ni halali na si opaque response (e.g., cross-origin)
            // Pia, usihifadhi "chrome-extension://" requests
            if (!res || res.status !== 200 || res.type !== 'basic') {
              console.log('Service Worker: Imepakua kutoka mtandao (sio cacheable):', event.request.url);
              return res;
            }
            const responseToCache = res.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Inahifadhi cache:', event.request.url);
                cache.put(event.request, responseToCache);
              });
            return res;
          })
          .catch((error) => {
            // Hii hutokea kama hakuna mtandao na rasilimali haipo kwenye cache
            console.error('Service Worker: Kushindwa kupakua rasilimali au rasilimali haipo cache:', event.request.url, error);
            // Hapa unaweza kurudisha ukurasa wa 'offline' kama umeuandaa
            // return caches.match('./offline.html'); // Kumbuka kubadilisha kuwa './offline.html'
          });
      })
  );
});