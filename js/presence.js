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


/* ========== PRESENCE_CONTROL_V2 ========== */
SNM._hbTimer = SNM._hbTimer || null;
SNM._liveOn = !!SNM._liveOn;
SNM._hbLastOk = SNM._hbLastOk || 0;
SNM._hbDecayMs = 3600000;
SNM._lastAutoActiveAt = SNM._lastAutoActiveAt || 0;

SNM.roleNeedsHeartbeat = function (role) {
  role = String(role || "").toLowerCase();
  return (
    role === "merchant" ||
    role === "service" ||
    role === "driver" ||
    role === "logistics" ||
    role === "emergency"
  );
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
    if (wantLive) {
      await SNM.heartbeat();
      SNM._hbLastOk = Date.now();
    }
    SNM._liveOn = !!wantLive;
    SNM.startHeartbeatLoop(wantLive);
    SNM.syncPresenceUI();
    if (typeof SNM.paintOwnLiveOnCards === "function") SNM.paintOwnLiveOnCards();
    return true;
  } catch (e) {
    console.warn("setPresence", e);
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
    if (typeof SNM.getToken === "function" && SNM.getToken()) {
      SNM.heartbeat().then(function () {
        SNM._hbLastOk = Date.now();
      });
    }
  }, 45000);
};

SNM.syncPresenceUI = function () {
  var live = !!SNM._liveOn;
  ["shop-open", "svc-open", "drv-active", "emg-active", "homeActiveToggle"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.type === "checkbox") el.checked = live;
  });
  var wrap = document.querySelector(".header-active");
  if (wrap) {
    wrap.classList.toggle("is-live", live);
    wrap.classList.toggle("is-off", !live);
  }
  var lab = document.querySelector(".header-active-label");
  if (lab) lab.textContent = live ? "Live" : "Off";
  if (typeof SNM.paintOwnLiveOnCards === "function") SNM.paintOwnLiveOnCards();
};

SNM.paintLiveChipOnCard = function (card, live) {
  if (!card) return;
  var chip = card.querySelector(".badge-live");
  if (!chip) {
    chip = document.createElement("span");
    chip.className = "badge-live";
    card.insertBefore(chip, card.firstChild);
  }
  chip.classList.toggle("hb-off", !live);
  chip.textContent = live ? "● Live" : "○ Offline";
};

SNM.paintOwnLiveOnCards = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var my = String(u.phone || "").replace(/\D/g, "");
  if (!my) return;
  var live = !!SNM._liveOn;
  document.querySelectorAll(".listing-card[data-phone], article.card[data-phone]").forEach(function (card) {
    var ph = String(card.getAttribute("data-phone") || "").replace(/\D/g, "");
    if (!ph) return;
    if (ph !== my && ph.slice(-10) !== my.slice(-10)) return;
    SNM.paintLiveChipOnCard(card, live);
  });
};

SNM.refreshFeedLiveChips = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var my = String(u.phone || "").replace(/\D/g, "");
  document.querySelectorAll(".listing-card, article.card[data-id]").forEach(function (card) {
    var id = card.getAttribute("data-listing-id") || card.getAttribute("data-id");
    var item = id && SNM._listingsById ? SNM._listingsById[id] : null;
    var live = !!(item && (item.live || item.seller_live || item.active));
    var ph = String(card.getAttribute("data-phone") || "").replace(/\D/g, "");
    if (my && ph && (ph === my || ph.slice(-10) === my.slice(-10))) live = !!SNM._liveOn;
    SNM.paintLiveChipOnCard(card, live);
  });
};

SNM.activateOnAppEnter = async function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = String(u.role || "").toLowerCase();
  if (!SNM.roleNeedsHeartbeat(role)) return;
  if (typeof SNM.getToken === "function" && !SNM.getToken()) return;
  if (SNM._lastAutoActiveAt && Date.now() - SNM._lastAutoActiveAt < 8000) {
    SNM._liveOn = true;
    SNM.syncPresenceUI();
    return;
  }
  var flags = { live: true, active: true, heartbeat: true, available: true };
  if (role === "merchant" || role === "service") flags.shop_open = true;
  var ok = await SNM.setPresence(flags);
  if (ok) {
    SNM._liveOn = true;
    SNM._hbLastOk = Date.now();
    SNM._lastAutoActiveAt = Date.now();
    SNM.syncPresenceUI();
  }
};

SNM.initPresenceForRole = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  if (!SNM.roleNeedsHeartbeat(u.role || "")) return;
  SNM.api("/presence/me")
    .then(function (res) {
      if (res && res.live != null) SNM._liveOn = !!res.live;
      SNM.syncPresenceUI();
      if (SNM._liveOn) SNM.startHeartbeatLoop(true);
      else SNM.activateOnAppEnter();
    })
    .catch(function () {
      SNM.activateOnAppEnter();
    });
};

(function () {
  if (window._snmPresenceToggles) return;
  window._snmPresenceToggles = true;
  function wire(id) {
    var el = document.getElementById(id);
    if (!el || el._snmWired) return;
    el._snmWired = true;
    el.addEventListener("change", function () {
      var on = !!el.checked;
      var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var role = String(u.role || "").toLowerCase();
      var flags = { live: on, active: on, heartbeat: on, available: on };
      if (role === "merchant" || role === "service") flags.shop_open = on;
      SNM.setPresence(flags);
    });
  }
  setInterval(function () {
    ["homeActiveToggle", "shop-open", "svc-open", "drv-active", "emg-active"].forEach(wire);
  }, 1500);
})();

(function () {
  var prev = SNM.onHomeEnter;
  SNM.onHomeEnter = function () {
    if (typeof prev === "function") prev.apply(this, arguments);
    SNM.initPresenceForRole();
    SNM.activateOnAppEnter();
    setTimeout(function () {
      if (typeof SNM.refreshFeedLiveChips === "function") SNM.refreshFeedLiveChips();
    }, 400);
  };
})();

