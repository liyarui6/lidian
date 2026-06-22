// 小点记账 - Service Worker
const CACHE_NAME = 'xiaodian-v1';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json'
];

// 安装：预缓存关键文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] 预缓存文件:', FILES_TO_CACHE);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // 立即激活，不等待旧SW
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：优先从缓存读取，缓存未命中时走网络
self.addEventListener('fetch', function(event) {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        return cached;
      }
      // 缓存未命中，尝试网络并缓存
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // 网络也失败，对于HTML请求返回缓存的首页
        if (event.request.headers.get('accept').indexOf('text/html') !== -1) {
          return caches.match('./index.html');
        }
        return new Response('离线状态，请连接网络后重试', { status: 503 });
      });
    })
  );
});
