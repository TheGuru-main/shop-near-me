window.SNM = window.SNM || {};

SNM.closeMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) return;
  m.classList.add("hidden");
  m.style.setProperty("display", "none", "important");
  m.setAttribute("aria-hidden", "true");
};

SNM.openMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) {
    console.warn("menuSheet missing");
    return;
  }
  m.classList.remove("hidden");
  m.style.setProperty("display", "block", "important");
  m.setAttribute("aria-hidden", "false");
};

SNM.bindMenuFixed = function () {
  if (window._snmMenuV3) return;
  window._snmMenuV3 = true;
  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("#btnMenuClose")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        SNM.closeMenuSheet();
        return;
      }
      if (e.target.closest("#btnMenu")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var m = document.getElementById("menuSheet");
        if (!m) return;
        if (m.classList.contains("hidden")) SNM.openMenuSheet();
        else SNM.closeMenuSheet();
        return;
      }
      var item = e.target.closest("#menuSheet [data-go], #menuSheet [data-menu]");
      if (item) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var act = item.getAttribute("data-menu") || item.getAttribute("data-go");
        SNM.closeMenuSheet();
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          SNM.showScreen("role-select");
          return;
        }
        if (act) SNM.showScreen(act);
        return;
      }
      var m2 = document.getElementById("menuSheet");
      if (
        m2 &&
        !m2.classList.contains("hidden") &&
        !e.target.closest("#menuSheet") &&
        !e.target.closest("#btnMenu")
      ) {
        SNM.closeMenuSheet();
      }
    },
    true
  );
};

SNM.showDriverWorkspace = function () {
  ["shop-merchant", "shop-service", "shop-emergency"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.style.display = "none";
    }
  });
  var d = document.getElementById("shop-driver");
  if (!d) return;
  d.classList.remove("hidden");
  d.style.display = "block";
};

SNM.paintDriverStatusCard = function (meta) {
  meta = meta || {};
  try {
    meta = Object.assign(
      {},
      JSON.parse(localStorage.getItem("snm_driver_meta") || "{}"),
      meta
    );
  } catch (e) {}
  var on = !!(meta.active || meta.live);
  var liveEl = document.getElementById("drvStatusLive");
  var locEl = document.getElementById("drvStatusLoc");
  var detail = document.getElementById("drvStatusDetail");
  var msg = document.getElementById("drvStatusMsg");
  if (liveEl)
    liveEl.textContent = on
      ? "Status: LIVE — accepting jobs"
      : "Status: Offline — not accepting jobs";
  if (locEl) {
    if (meta.lat != null && meta.lng != null)
      locEl.textContent =
        "Location: " + Number(meta.lat).toFixed(5) + ", " + Number(meta.lng).toFixed(5);
    else
      locEl.textContent =
        "Location: " + (meta.primary_location || meta.primary || "—");
  }
  if (detail) {
    var bits = [];
    if (meta.vehicle_type) bits.push(meta.vehicle_type);
    if (meta.coverage) bits.push(meta.coverage);
    if (meta.base_park) bits.push(meta.base_park);
    detail.innerHTML = bits.length
      ? "<p class='muted small'>" + bits.join(" · ") + "</p>"
      : "";
  }
  if (msg) msg.textContent = on ? "Live listing is searchable." : "Offline — hidden from search.";
};

/** Upsert product so driver appears in /search/products within max_km */
SNM.upsertDriverListing = async function (meta) {
  meta = meta || {};
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var name = (u.name || "Driver").trim();
  var vehicle = (meta.vehicle_type || "keke").trim();
  var coverage = (meta.coverage || "").trim();
  var primary = (meta.primary_location || meta.primary || u.primary_location || "").trim();
  var base = (meta.base_park || "").trim();

  // Searchable text: name, vehicle, place, related seeds
  var title = name + " · " + vehicle + " ride";
  var descParts = [
    "driver",
    "logistics",
    vehicle,
    "okada",
    "keke",
    "dispatch",
    "ride",
    "delivery",
    name,
    coverage,
    primary,
    base,
    u.community || "",
    u.city || ""
  ];
  var description =
    descParts.filter(Boolean).join(" ") +
    (typeof SNM.geoStamp === "function" ? "\n" + SNM.geoStamp("") : "");

  var body = {
    name: title,
    category: "logistics",
    business_type: "driver",
    price: 0,
    currency: "NGN",
    quantity: 1,
    available: !!meta.active,
    perishable: false,
    description: description,
    live: !!meta.active
  };
  if (meta.lat != null) body.lat = meta.lat;
  if (meta.lng != null) body.lng = meta.lng;

  var lid = null;
  try {
    lid = localStorage.getItem("snm_driver_listing_id");
  } catch (e) {}

  if (lid) {
    try {
      await SNM.api("/products/" + encodeURIComponent(lid), {
        method: "PATCH",
        body: body
      });
      return lid;
    } catch (e) {
      /* create new if patch fails */
    }
  }

  var created = await SNM.api("/products", { method: "POST", body: body });
  var id =
    (created && (created.id || created.product_id)) ||
    (created && created.product && created.product.id) ||
    "";
  if (id) {
    try {
      localStorage.setItem("snm_driver_listing_id", String(id));
    } catch (e2) {}
  }
  return id;
};

SNM.saveDriverWorkspace = async function () {
  var active = !!((document.getElementById("drv-active") || {}).checked);
  var useGps = !!((document.getElementById("drv-use-gps") || {}).checked);
  var meta = {
    active: active,
    live: active,
    coverage: ((document.getElementById("drv-coverage") || {}).value || "").trim(),
    primary_location: ((document.getElementById("drv-primary") || {}).value || "").trim(),
    vehicle_type: ((document.getElementById("drv-vehicle") || {}).value || "keke").trim(),
    base_park: ((document.getElementById("drv-base-park") || {}).value || "").trim(),
    use_gps: useGps
  };

  if (useGps && typeof SNM._geo === "function") {
    try {
      var g = await SNM._geo();
      if (g && g.lat != null) {
        meta.lat = g.lat;
        meta.lng = g.lng;
        SNM._lastLat = g.lat;
        SNM._lastLng = g.lng;
      }
    } catch (e) {}
  }
  if (meta.lat == null) {
    var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    if (u.lat != null) {
      meta.lat = u.lat;
      meta.lng = u.lng;
    }
  }

  try {
    localStorage.setItem("snm_driver_meta", JSON.stringify(meta));
  } catch (e2) {}

  SNM.paintDriverStatusCard(meta);

  if (typeof SNM.setPresence === "function") {
    try {
      await SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active,
        live: active,
        lat: meta.lat,
        lng: meta.lng
      });
    } catch (e3) {}
  }

  try {
    if (active) {
      await SNM.upsertDriverListing(meta);
    } else {
      var lid = localStorage.getItem("snm_driver_listing_id");
      if (lid) {
        await SNM.api("/products/" + encodeURIComponent(lid), {
          method: "PATCH",
          body: { available: false, live: false }
        });
      }
    }
  } catch (e4) {
    alert("Listing: " + ((e4 && e4.message) || "failed"));
  }

  return meta;
};

SNM.wireDriverWorkspace = function () {
  var save = document.getElementById("btnDrvSave");
  if (save) {
    save.onclick = function (e) {
      if (e) e.preventDefault();
      SNM.saveDriverWorkspace().catch(function (err) {
        alert((err && err.message) || "Save failed");
      });
    };
  }
};

SNM.onShopEnter = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = String((u && u.role) || sessionStorage.getItem("snm_role") || "")
    .toLowerCase()
    .trim();
  if (role === "logistics") role = "driver";
  if (role === "driver") {
    SNM.showDriverWorkspace();
    SNM.wireDriverWorkspace();
    try {
      var raw = localStorage.getItem("snm_driver_meta");
      if (raw) SNM.paintDriverStatusCard(JSON.parse(raw));
    } catch (e) {}
    return;
  }
  if (role === "merchant" || role === "service") {
    if (typeof SNM.loadShop === "function") SNM.loadShop();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    SNM.bindMenuFixed();
  });
} else {
  SNM.bindMenuFixed();
}
