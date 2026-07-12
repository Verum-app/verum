// ✦ VERUM · сервис-воркер (появился со сборкой 69)
// Задача: держать приложение и шрифты прямо на телефоне.
// Правила простые и безопасные для обновлений:
//   • шрифты (fonts/*.woff2) — из кэша навсегда: они не меняются;
//   • страница — СНАЧАЛА СЕТЬ (новые сборки доезжают как раньше),
//     кэш используется только как офлайн-запаска;
//   • аудио и всё чужое (воркер Cloudflare, telegram.org) — не трогаем вовсе.

const CACHE = 'verum-app-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // чужие домены не трогаем
  if (e.request.method !== 'GET') return;

  // шрифты: кэш в приоритете — мгновенно и без сети
  if (url.pathname.endsWith('.woff2')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(e.request);
      if (hit) return hit;
      const resp = await fetch(e.request);
      if (resp && resp.ok) c.put(e.request, resp.clone());
      return resp;
    })());
    return;
  }

  // страница приложения: сеть в приоритете, кэш — запаска на офлайн/плохую сеть
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const resp = await fetch(e.request);
        if (resp && resp.ok) c.put(e.request, resp.clone());
        return resp;
      } catch (err) {
        const hit = await c.match(e.request, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    })());
  }
});
