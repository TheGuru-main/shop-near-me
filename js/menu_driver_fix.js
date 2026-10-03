
window.SNM = window.SNM || {};

SNM.closeMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) return;
  m.classList.add("hidden");
  m.classList.remove("open");
  m.style.setProperty("display", "none", "important");
  m.setAttribute("aria-hidden", "true");
};

SNM.openMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) return;
  m.classList.remove("hidden");
  m.classList.add("open");
  m.style.setProperty("display", "block", "important");
  m.setAttribute("aria-hidden", "false");
};

SNM.bindMenuFixed = function () {
  if (window._snmMenuFixed2) return;
  window._snmMenuFixed2 = true;
  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("#btnMenuClose")) {
        e.preventDefault();
        e.stopPropagation();
        SNM.closeMenuSheet();
        return;
      }
      if (e.target.closest("#btnMenu")) {
        e.preventDefault();
        e.stopPropagation();
        var m = document.getElementById("menuSheet");
        if (!m) return;
        if (m.classList.contains("hidden")) SNM.openMenuSheet();
        else SNM.closeMenuSheet();
        return;
      }
      var item = e.target.closest("#menuSheet [data-go], #menuSheet [data-menu]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var act = item.getAttribute("data-menu") || item.getAttribute("data-go");
        SNM.closeMenuSheet();
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          if (typeof SNM.showScreen === "function") SNM.showScreen("role-select");
          return;
        }
        if (act && typeof SNM.showScreen === "function") SNM.showScreen(act);
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
    if (!el) return;
    el.classList.add("hidden");
    el.style.display = "none";
  });
  var d = document.getElementById("shop-driver");
  if (!d) return;
  d.classList.remove("hidden");
  d.removeAttribute("hidden");
  d.style.display = "block";
  d.style.visibility = "visible";
  d.style.opacity = "1";
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

  var liveEl = document.getElementById("drvStatusLive");
  var locEl = document.getElementById("drvStatusLoc");
  var detail = document.getElementById("drvStatusDetail");
  var on = !!(meta.active || meta.live);

  if (liveEl) {
    liveEl.textContent = on
      ? "Status: LIVE — accepting jobs"
      : "Status: Offline — not accepting jobs";
  }
  if (locEl) {
    if (meta.lat != null && meta.lng != null) {
      locEl.textContent =
        "Location: " +
        Number(meta.lat).toFixed(5) +
        ", " +
        Number(meta.lng).toFixed(5);
    } else if (meta.primary_location || meta.primary) {
      locEl.textContent =
        "Location: " + (meta.primary_location || meta.primary);
    } else {
      locEl.textContent = "Location: —";
    }
  }
  if (detail) {
    var bits = [];
    if (meta.vehicle_type) bits.push("Vehicle: " + meta.vehicle_type);
    if (meta.coverage) bits.push("Coverage: " + meta.coverage);
    if (meta.base_park) bits.push("Base: " + meta.base_park);
    detail.innerHTML = bits.length
      ? "<p class='muted small' style='margin:0.35rem 0 0'>" +
        bits.join(" · ") +
        "</p>"
      : "";
  }
  var msg = document.getElementById("drvStatusMsg");
  if (msg) {
    msg.textContent = on ? "Saved — you are live." : "Saved — you are offline.";
  }
};

SNM.saveDriverWorkspace = async function () {
  var active = !!((document.getElementById("drv-active") || {}).checked);
  var useGps = !!((document.getElementById("drv-use-gps") || {}).checked);
  var coverage = ((document.getElementById("drv-coverage") || {}).value || "").trim();
  var primary = ((document.getElementById("drv-primary") || {}).value || "").trim();
  var vehicle = ((document.getElementById("drv-vehicle") || {}).value || "").trim();
  var basePark = ((document.getElementById("drv-base-park") || {}).value || "").trim();

  var meta = {
    active: active,
    live: active,
    coverage: coverage,
    primary_location: primary,
    primary: primary,
    vehicle_type: vehicle,
    base_park: basePark,
    use_gps: useGps,
    saved_at: new Date().toISOString()
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

  try {
    localStorage.setItem("snm_driver_meta", JSON.stringify(meta));
  } catch (e2) {}

  // paint UI first so card always updates
  SNM.paintDriverStatusCard(meta);

  // form fields stay in sync
  var actEl = document.getElementById("drv-active");
  if (actEl) actEl.checked = active;

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
    } catch (e3) {
      console.warn("presence", e3);
    }
  }

  if (typeof SNM.toast === "function") {
    SNM.toast(active ? "You're now online" : "You're offline");
  }

  return meta;
};

SNM.wireDriverWorkspace = function () {
  var save = document.getElementById("btnDrvSave");
  if (save) {
    save.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.saveDriverWorkspace().catch(function (err) {
        alert((err && err.message) || "Save failed");
      });
    };
  }
  var act = document.getElementById("drv-active");
  if (act && !act._snmPaintWired) {
    act._snmPaintWired = true;
    act.onchange = function () {
      // light paint without full save
      var meta = {};
      try {
        meta = JSON.parse(localStorage.getItem("snm_driver_meta") || "{}");
      } catch (e) {}
      meta.active = !!act.checked;
      meta.live = !!act.checked;
      SNM.paintDriverStatusCard(meta);
    };
  }
};

SNM.onShopEnter = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = String(
    (u && u.role) ||
      sessionStorage.getItem("snm_role") ||
      ""
  )
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
  if (role === "merchant") {
    var m = document.getElementById("shop-merchant");
    if (m) {
      m.classList.remove("hidden");
      m.style.display = "block";
    }
    if (typeof SNM.loadShop === "function") SNM.loadShop();
    return;
  }
  if (role === "service") {
    var s = document.getElementById("shop-service");
    if (s) {
      s.classList.remove("hidden");
      s.style.display = "block";
    }
    if (typeof SNM.loadShop === "function") SNM.loadShop();
    return;
  }
  if (role === "emergency") {
    var em = document.getElementById("shop-emergency");
    if (em) {
      em.classList.remove("hidden");
      em.style.display = "block";
    }
  }
};

// boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    SNM.bindMenuFixed();
  });
} else {
  SNM.bindMenuFixed();
}
