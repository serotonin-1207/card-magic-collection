// 인터넷이 되면 최신 파일을, 안 되거나 느리면 저장해 둔 파일을 쓴다.
const VERSION = 'card-magic-2';
const FONT_CACHE = 'card-magic-fonts';
const NETWORK_WAIT_MS = 2500;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/logic.js',
  'js/tricks.js',
  'js/stage.js',
  'js/app.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function fontFirstFromCache(request) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

async function networkThenCache(request) {
  const cache = await caches.open(VERSION);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  const saved = () => cache.match(request, { ignoreSearch: true })
    .then((hit) => hit || (request.mode === 'navigate' ? cache.match('index.html') : undefined));

  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(saved);
  try {
    const first = await Promise.race([network, slow]);
    return first || await network;
  } catch (err) {
    const hit = await saved();
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(fontFirstFromCache(e.request));
  } else if (url.origin === location.origin) {
    e.respondWith(networkThenCache(e.request));
  }
});
