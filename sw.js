const CACHE_NAME = 'zappdf-cache-v3';

const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/pages/about.html',
    '/pages/faq.html',
    '/pages/privacy.html',
    '/pages/terms.html',
    '/pages/cookies.html',
    '/tools/convert.html',
    '/tools/merge.html',
    '/tools/split.html',
    '/tools/organize.html',
    '/tools/redact.html',
    '/tools/number.html',
    '/tools/rotate.html',
    '/tools/ocr.html',
    '/tools/protect.html',
    '/tools/watermark.html',
    '/assets/css/main.css',
    '/assets/css/navbar.css',
    '/assets/css/hero.css',
    '/assets/css/tool.css',
    '/assets/css/results.css',
    '/assets/css/sections.css',
    '/assets/css/responsive.css',
    '/assets/css/chat.css',
    '/assets/icons/logo.svg',
    '/assets/icons/upload.svg',
    '/assets/js/main.js',
    '/assets/js/ui.js',
    '/assets/js/upload.js',
    '/assets/js/compress.js',
    '/assets/js/download.js',
    '/assets/js/worker.js',
    '/assets/js/chat.js',
    '/assets/js/tools/convert.js',
    '/assets/js/tools/merge.js',
    '/assets/js/tools/split.js',
    '/assets/js/tools/organize.js',
    '/assets/js/tools/redact.js',
    '/assets/js/tools/number.js',
    '/assets/js/tools/rotate.js',
    '/assets/js/tools/ocr.js',
    '/assets/js/tools/protect.js',
    '/assets/js/tools/watermark.js',
    '/manifest.json',
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // Use cache.addAll, but wrap in try/catch or ignore failures for external domains
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Return from cache
                }
                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response to put in cache
                        let responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});
