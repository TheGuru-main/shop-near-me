window.SNM = window.SNM || {};

SNM.posterGeo = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var lat =
    u.lat != null ? Number(u.lat) : SNM._lastLat != null ? Number(SNM._lastLat) : null;
  var lng =
    u.lng != null ? Number(u.lng) : SNM._lastLng != null ? Number(SNM._lastLng) : null;
  if (lat != null && isNaN(lat)) lat = null;
  if (lng != null && isNaN(lng)) lng = null;
  return {
    lat: lat,
    lng: lng,
    primary_location: u.primary_location || "",
    community: u.community || "",
    city: u.city || "",
    region: u.region || "",
    country: u.country || ""
  };
};

SNM.geoStamp = function (text) {
  var g = SNM.posterGeo();
  var base = String(text || "").replace(/\s*\[geo:[^\]]+\]\s*/gi, "").trim();
  base = base.replace(/\s*\[place:[^\]]+\]\s*/gi, "").trim();
  var place = [g.primary_location, g.community, g.city, g.region, g.country]
    .filter(Boolean)
    .join(", ");
  var parts = [];
  if (base) parts.push(base);
  if (g.lat != null && g.lng != null) {
    parts.push("[geo:" + g.lat.toFixed(6) + "," + g.lng.toFixed(6) + "]");
  }
  if (place) parts.push("[place:" + place + "]");
  return parts.join("\n");
};

SNM.parseGeoStamp = function (text) {
  var m = String(text || "").match(
    /\[geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\]/i
  );
  if (!m) return null;
  var lat = parseFloat(m[1]);
  var lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat: lat, lng: lng };
};

SNM._hbTimer = null;
SNM._liveOn = false;

SNM.setLive = async function (live) {
  var res = await SNM.api("/presence/live", {
    method: "POST",
    body: { live: !!live }
  });
  SNM._liveOn = !!(res && res.live != null ? res.live : live);
  SNM.syncPresenceUI();
  return res;
};

SNM.heartbeat = async function () {
  try {
    var res = await SNM.api("/presence/heartbeat", { method: "POST" });
    if (res && res.live != null) SNM._liveOn = !!res.live;
    SNM.syncPresenceUI();
    return res;
  } catch (e) {
    return null;
  }
};

SNM.setPresence = async function (flags) {
  flags = flags || {};
  var wantLive = !!(
    flags.live ||
    flags.active ||
    flags.heartbeat ||
    flags.shop_open ||
    flags.available
  );
  try {
    await SNM.setLive(wantLive);
    if (wantLive) await SNM.heartbeat();
    SNM.startHeartbeatLoop(wantLive);
    return true;
  } catch (e) {
    alert("Status update failed: " + ((e && e.message) || "check login"));
    return false;
  }
};

SNM.startHeartbeatLoop = function (on) {
  if (SNM._hbTimer) {
    clearInterval(SNM._hbTimer);
    SNM._hbTimer = null;
  }
  if (!on) return;
  SNM._hbTimer = setInterval(function () {
    if (typeof SNM.getToken === "function" && SNM.getToken()) SNM.heartbeat();
  }, 45000);
};

SNM.syncPresenceUI = function () {
  var live = !!SNM._liveOn;
  ["shop-open", "svc-open", "drv-active", "emg-active", "homeActiveToggle"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.type === "checkbox") el.checked = live;
  });
  document.querySelectorAll("[data-hb-marker]").forEach(function (el) {
    el.classList.toggle("hb-live", live);
    el.classList.toggle("hb-off", !live);
    el.textContent = live ? "● Live" : "○ Offline";
  });
  var wrap = document.querySelector(".header-active");
  if (wrap) {
    wrap.classList.toggle("is-live", live);
    wrap.classList.toggle("is-off", !live);
  }
  var lab = document.querySelector(".header-active-label");
  if (lab) lab.textContent = live ? "Live" : "Off";
  document.body.classList.toggle("snm-presence-live", live);
};

SNM.roleNeedsHeartbeat = function (role) {
  role = String(role || "").toLowerCase();
  return (
    role === "merchant" ||
    role === "service" ||
    role === "driver" ||
    role === "emergency" ||
    role === "logistics"
  );
};

SNM.initPresenceForRole = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = u.role || (typeof SNM.getRole === "function" && SNM.getRole()) || "";
  if (!SNM.roleNeedsHeartbeat(role)) return;
  SNM.api("/presence/me")
    .then(function (res) {
      if (res && res.live != null) SNM._liveOn = !!res.live;
      SNM.syncPresenceUI();
      if (SNM._liveOn) SNM.startHeartbeatLoop(true);
    })
    .catch(function () {});
};

SNM._localNotes = SNM._localNotes || [];

SNM.pushLocalNotification = function (title, body) {
  var item = {
    id: Date.now(),
    title: title || "Shop Near Me",
    body: body || "",
    at: new Date().toISOString()
  };
  SNM._localNotes.unshift(item);
  try {
    localStorage.setItem("snm_local_notes", JSON.stringify(SNM._localNotes.slice(0, 50)));
  } catch (e) {}
  return item;
};

SNM.renderNotifications = function () {
  var el = document.getElementById("notificationsList");
  if (!el) return;
  try {
    SNM._localNotes = JSON.parse(localStorage.getItem("snm_local_notes") || "[]");
  } catch (e) {
    SNM._localNotes = SNM._localNotes || [];
  }
  if (!SNM._localNotes.length) {
    el.innerHTML = "<p class='muted'>No notifications yet.</p>";
    return;
  }
  el.innerHTML = SNM._localNotes
    .map(function (n) {
      return (
        '<article class="card"><strong>' +
        (typeof SNM.esc === "function" ? SNM.esc(n.title) : n.title) +
        "</strong><p class='muted small">' +
        (typeof SNM.esc === "function" ? SNM.esc(n.body) : n.body) +
        "</p></article>"
      );
    })
    .join("");
};


/* HB_DECAY_V1 — miss 2 intervals (\~90s) => offline locally + API */
SNM._hbLastOk = 0;
SNM._hbDecayMs = 90000;

(function () {
  var _hb = SNM.heartbeat;
  if (typeof _hb !== "function") return;
  SNM.heartbeat = async function () {
    try {
      var res = await _hb.apply(this, arguments);
      if (res != null) {
        SNM._hbLastOk = Date.now();
        SNM._liveOn = true;
        SNM.syncPresenceUI();
      } else {
        SNM._checkHbDecay();
      }
      return res;
    } catch (e) {
      SNM._checkHbDecay();
      return null;
    }
  };
})();

SNM._checkHbDecay = function () {
  if (!SNM._liveOn) return;
  if (!SNM._hbLastOk) SNM._hbLastOk = Date.now();
  if (Date.now() - SNM._hbLastOk < (SNM._hbDecayMs || 90000)) return;
  SNM._liveOn = false;
  SNM.startHeartbeatLoop(false);
  SNM.syncPresenceUI();
  if (typeof SNM.setLive === "function") {
    SNM.setLive(false).catch(function () {});
  }
};

(function () {
  if (SNM._hbDecayTimer) return;
  SNM._hbDecayTimer = setInterval(function () {
    SNM._checkHbDecay();
  }, 15000);
})();

(function () {
  if (window._homeActiveWired) return;
  window._homeActiveWired = true;
  function wire() {
    var el = document.getElementById("homeActiveToggle");
    if (!el || el._snmWired) return;
    el._snmWired = true;
    el.addEventListener("change", function () {
      var on = !!el.checked;
      var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var role = String(u.role || "").toLowerCase();
      if (role === "buyer" || !role) {
        el.checked = false;
        if (typeof SNM.toast === "function") SNM.toast("Live is for merchants, services, drivers");
        else alert("Live is for merchants, services, and drivers");
        return;
      }
      if (typeof SNM.setPresence === "function") {
        SNM.setPresence({ live: on, active: on, heartbeat: on });
      } else if (typeof SNM.setLive === "function") {
        SNM.setLive(on).then(function () {
          if (on && typeof SNM.startHeartbeatLoop === "function") SNM.startHeartbeatLoop(true);
          if (!on && typeof SNM.startHeartbeatLoop === "function") SNM.startHeartbeatLoop(false);
          if (typeof SNM.syncPresenceUI === "function") SNM.syncPresenceUI();
        });
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
  /* re-sync when entering home */
  var prev = SNM.onHomeEnter;
  SNM.onHomeEnter = function () {
    if (typeof prev === "function") prev.apply(this, arguments);
    if (typeof SNM.initPresenceForRole === "function") SNM.initPresenceForRole();
    if (typeof SNM.syncPresenceUI === "function") SNM.syncPresenceUI();
  };
})();
