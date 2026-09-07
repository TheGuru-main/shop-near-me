var CACHE = "snm-shell-v1";
var SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./js/config.js",
  "./js/app.js",
  "./js/router.js",
  "./js/auth.js",
  "./js/home.js",
  "./js/shop.js",
  "./js/messages.js",
  "./js/search.js",
  "./js/local.js",
  "./js/api.js",
  "./js/cascade.js",
  "./js/countries.js",
  "./js/cards.js",
  "./js/particles.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          return k !== CACHE;
        }).map(function (k) {
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
  /* Never cache API */
  if (url.pathname.indexOf("/api/") !== -1) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      return (
        hit ||
        fetch(req).then(function (res) {
          return res;
        }).catch(function () {
          return caches.match("./index.html");
        })
      );
    })
  );
});