// 오프라인 사용: 화면은 인터넷을 먼저 보고 끊기면 저장본, 이름에 해시가 붙은 파일(assets)은 저장본을 먼저 쓴다
// shortcut: 예전 배포의 assets 파일이 캐시에 쌓임, 용량이 문제 되면 배포마다 CACHE 이름을 바꾸기
const CACHE = 'ssamtool-v1'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  const save = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) } return res }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then(r => r || caches.match('./'))))
  } else if (req.url.includes('/assets/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(save)))
  } else {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req)))
  }
})
