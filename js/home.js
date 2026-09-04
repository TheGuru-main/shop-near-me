window.SNM = window.SNM || {};

var _map = null;
var _marker = null;

SNM.renderUserMap = function () {
  var el = document.getElementById("gsgMap");
  if (!el || typeof L === "undefined") return;
  var u = SNM.getUser() || {};
  var lat = parseFloat(u.lat);
  var lng = parseFloat(u.lng);
  if (isNaN(lat) || isNaN(lng)) {
    el.innerHTML =
      "<div style='padding:1rem;text-align:center;color:#166534'>No pin yet — enable GPS on register/login</div>";
    return;
  }
  if (!_map) {
    el.innerHTML = "";
    _map = L.map(el).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM"
    }).addTo(_map);
    _marker = L.marker([lat, lng]).addTo(_map);
  } else {
    _map.setView([lat, lng], 14);
    if (_marker) _marker.setLatLng([lat, lng]);
    else _marker = L.marker([lat, lng]).addTo(_map);
    setTimeout(function () {
      _map.invalidateSize();
    }, 200);
  }
};

SNM.refreshHome = function () {
  if (typeof SNM.applyRoleChrome === "function") SNM.applyRoleChrome();
  SNM.renderUserMap();
  var feed = document.getElementById("homeFeed");
  if (!feed) return;
  feed.innerHTML = "<p class='muted'>Loading…</p>";
  var u = SNM.getUser() || {};
  var q = SNM.qs({
    q: "",
    lat: u.lat,
    lng: u.lng,
    max_km: SNM.DEFAULT_MAX_KM,
    limit: 40
  });
  SNM.api("/search/products" + q)
    .then(function (data) {
      var rows = (data && data.results) || data || [];
      if (!Array.isArray(rows)) rows = [];
      if (!rows.length) {
        feed.innerHTML =
          "<p class='muted'>No nearby listings yet. Try Search or Fairly used.</p>";
        return;
      }
      if (typeof SNM.cardHtml === "function") {
        feed.innerHTML = rows.map(SNM.cardHtml).join("");
      } else {
        feed.innerHTML = rows
          .map(function (r) {
            return (
              '<div class="product-card"><div class="title">' +
              (r.item || r.name || "Item") +
              "</div></div>"
            );
          })
          .join("");
      }
    })
    .catch(function (e) {
      feed.innerHTML =
        "<p class='error'>" + (e.message || "Feed error") + "</p>";
    });
};

SNM.bindHome = function () {
  var btn = document.getElementById("btnRefreshFeed");
  if (btn) {
    btn.onclick = function () {
      SNM.refreshHome();
    };
  }
  var exp = document.getElementById("btnExpandMap");
  if (exp) {
    exp.onclick = function () {
      var m = document.getElementById("gsgMap");
      if (!m) return;
      m.style.height = m.style.height === "280px" ? "160px" : "280px";
      if (_map) {
        setTimeout(function () {
          _map.invalidateSize();
        }, 200);
      }
    };
  }
};
