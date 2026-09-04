window.SNM = window.SNM || {};

(function () {
  function el(id) {
    return document.getElementById(id);
  }

  SNM.renderUserMap = function () {
    var box = el("gsgMap");
    if (!box || !window.L) return;

    var user = typeof SNM.getUser === "function" ? SNM.getUser() || {} : {};
    var lat = Number(user.lat);
    var lng = Number(user.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      box.innerHTML = '<p class="muted" style="padding:1rem">Location pin unavailable — enable GPS at signup/search.</p>';
      return;
    }

    if (SNM._homeMap) {
      try {
        SNM._homeMap.remove();
      } catch (e) {}
      SNM._homeMap = null;
    }

    box.innerHTML = "";
    SNM._homeMap = window.L.map(box).setView([lat, lng], 15);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM"
    }).addTo(SNM._homeMap);
    window.L.marker([lat, lng]).addTo(SNM._homeMap).bindPopup(user.name || "You");
    setTimeout(function () {
      if (SNM._homeMap) SNM._homeMap.invalidateSize();
    }, 100);
  };

  SNM.refreshHome = async function () {
    var feed = el("homeFeed");
    if (!feed) return;
    feed.innerHTML = '<p class="muted">Loading nearby…</p>';

    var user = typeof SNM.getUser === "function" ? SNM.getUser() || {} : {};
    var params = {
      q: "",
      max_km: SNM.DEFAULT_MAX_KM != null ? SNM.DEFAULT_MAX_KM : 2000
    };
    if (user.lat != null) params.lat = user.lat;
    if (user.lng != null) params.lng = user.lng;
    if (user.community) params.community = user.community;

    try {
      var qs = Object.keys(params)
        .map(function (k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
        })
        .join("&");
      var data = await SNM.api("/search/products?" + qs);
      var results = data.results || data.items || [];
      results = results.slice().sort(function (a, b) {
        var ta = Date.parse(a.created_at || 0) || 0;
        var tb = Date.parse(b.created_at || 0) || 0;
        return tb - ta;
      });
      if (!results.length) {
        feed.innerHTML = '<div class="empty-state">No nearby listings yet. Try search.</div>';
      } else {
        feed.innerHTML = results.map(function (r) {
          return SNM.cardHtml(r);
        }).join("");
      }
    } catch (err) {
      feed.innerHTML = '<div class="empty-state">Feed unavailable</div>';
    }

    SNM.renderUserMap();
  };

  SNM.bindHome = function () {
    var refresh = el("btnRefreshFeed");
    if (refresh) refresh.onclick = function () {
      SNM.refreshHome();
    };
    var expand = el("btnExpandMap");
    if (expand) {
      expand.onclick = function () {
        var stub = el("homeMapStub");
        if (stub) stub.classList.toggle("expanded");
        if (SNM._homeMap) setTimeout(function () {
          SNM._homeMap.invalidateSize();
        }, 100);
      };
    }
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(document);
  };
})();
