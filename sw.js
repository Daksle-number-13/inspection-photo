const REV = new URL(location.href).searchParams.get('v') || 'r1';

// 활성화: 기존 캐시 전부 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// 모든 요청은 네트워크에서 직접 가져옴 (캐시 사용 안 함)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
