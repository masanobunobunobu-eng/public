const CACHE_NAME = "akichecker-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./aki-icon-192.png",
  "./aki-icon-512.png",
  "./aki-icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// このアプリは予約データを扱う実務ツールなので、
// 「オフラインでも一応開ける」より「常に最新版を出す」ことを優先する。
// ただし、ネットには繋がるが正常な応答が返らない場合(リポジトリ削除後の404など)は
// 壊れた内容を表示せず、キャッシュされた最後の正常な状態を優先する。
// 他ドメイン(Googleフォント等)には一切手を出さない。
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }
        // 200番台以外の応答(404など) → 更新扱いにせず、キャッシュを優先
        return caches.match(req).then((cached) => cached || res);
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
