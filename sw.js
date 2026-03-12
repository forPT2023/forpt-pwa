const CACHE_NAME = 'forpt-app-v1';
const CACHE_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/data/playlists.json',
    '/data/videos.json',
    '/data/lastSync.json',
    '/assets/logo.png',
    '/manifest.json'
];

// インストール時: キャッシュ作成
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(CACHE_URLS);
        })
    );
    self.skipWaiting();
});

// アクティベーション時: 古いキャッシュ削除
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// フェッチ時: キャッシュ優先、フォールバック
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // キャッシュにあればそれを返す
            if (response) {
                return response;
            }

            // なければネットワークから取得
            return fetch(event.request).then((response) => {
                // 有効なレスポンスでない場合はそのまま返す
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // レスポンスをクローンしてキャッシュに保存
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            }).catch(() => {
                // ネットワークエラー時: オフライン用のフォールバック
                return caches.match('/index.html');
            });
        })
    );
});
