window.SNM = window.SNM || {};

SNM._homeMap = null;

SNM.renderUserMap = function () {
  var el = document.getElementById("gsgMap");
  if (!el || typeof L === "undefined") return;
  var u = SNM.getUser() || {};
  var lat = u.lat != null ? Number(u.lat) : null;
  var lng = u.lng != null ? Number(u.lng) : null;

  function mount(la, ln) {
    if (SNM._homeMap) {
      try {
        SNM._homeMap.remove();
      } catch (e) {}
      SNM._homeMap = null;
    }
    el.innerHTML = "";
    SNM._homeMap = L.map(el).setView([la, ln], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM"
    }).addTo(SNM._homeMap);
    L.marker([la, ln]).addTo(SNM._homeMap).bindPopup("You · primary pin");
    setTimeout(function () {
      if (SNM._homeMap) SNM._homeMap.invalidateSize();
    }, 250);
  }

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    mount(lat, lng);
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        mount(pos.coords.latitude, pos.coords.longitude);
      },
      function () {
        el.innerHTML = "<p class='muted' style='padding:1rem'>Enable GPS to show your pin.</p>";
      },
      { timeout: 10000 }
    );
  }
};

SNM.refreshHome = async function () {
  var feed = document.getElementById("homeFeed");
  if (!feed) return;
  feed.innerHTML = "<p class='muted'>Loading…</p>";
  var u = SNM.getUser() || {};
  var perishableOnly = !!SNM._perishableFilter;
  try {
    var q =
      "/search/products" +
      SNM.qs({
        q: "",
        lat: u.lat,
        lng: u.lng,
        max_km: SNM.MAX_KM || 2000,
        perishable: perishableOnly ? true : undefined,
        limit: 40
      });
    var data = await SNM.api(q);
    var rows = data.results || data.items || data || [];
    if (!Array.isArray(rows)) rows = [];
    rows.sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    if (!rows.length) {
      feed.innerHTML = "<p class='muted'>No listings near you yet.</p>";
      return;
    }
    feed.innerHTML = rows.map(SNM.cardHtml).join("");
  } catch (err) {
    feed.innerHTML =
      "<p class='muted'>Feed unavailable. " +
      SNM.esc((err && err.message) || "") +
      "</p>";
  }
};

SNM.onHomeEnter = function () {
  SNM.renderUserMap();
  SNM.refreshHome();
};

SNM.bindHome = function () {
  var btn = document.getElementById("btnRefreshFeed");
  if (btn) btn.onclick = function () {
    SNM.refreshHome();
  };
  var peri = document.getElementById("btnPerishables");
  if (peri) {
    peri.onclick = function () {
      SNM._perishableFilter = !SNM._perishableFilter;
      peri.classList.toggle("active", !!SNM._perishableFilter);
      SNM.refreshHome();
    };
  }
};
