var CACHE = "snm-shell-v2";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.pathname.indexOf("/api/") !== -1) return;

  /* HTML always from network so deploys show up */
  var isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1 ||
    /\.html?$/.test(url.pathname);

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          return res;
        })
        .catch(function () {
          return caches.match("./index.html");
        })
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(function (res) {
        var copy = res.clone();
        if (res.ok) {
          caches.open(CACHE).then(function (c) {
            c.put(req, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req);
      })
  );
});