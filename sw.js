var CACHE = "snm-shell-v3";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            if (k !== CACHE) return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  /* never cache API */
  if (url.pathname.indexOf("/api/") !== -1) return;

  var path = url.pathname || "";
  var isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1 ||
    /\.html?$/.test(path);

  /* JS + CSS always from network so deploys apply */
  var isCode =
    /\.js$/i.test(path) ||
    /\.css$/i.test(path) ||
    /\.webmanifest$/i.test(path) ||
    /manifest\.json$/i.test(path);

  if (isHTML || isCode) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          return res;
        })
        .catch(function () {
          if (isHTML) return caches.match("./index.html");
          return caches.match(req);
        })
    );
    return;
  }

  /* other assets: network first, then cache */
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