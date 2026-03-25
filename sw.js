const REV = new URL(location.href).searchParams.get('v') || 'r1';
const CACHE_NAME = `inspection-photo-${REV}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// 설치: 정적 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 항상 네트워크 우선으로 가져올 파일 (버전 업데이트 즉시 반영)
const NETWORK_FIRST = ['index.html', 'app.js', 'sw.js'];

// 요청 가로채기
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNetworkFirst = NETWORK_FIRST.some(f => url.pathname.endsWith(f));

  if (isNetworkFirst) {
    // 네트워크 우선 → 실패 시 캐시 폴백
    event.respondWith(
      fetch(event.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return resp;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // 캐시 우선 → 네트워크 폴백
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        });
      })
    );
  }
});
