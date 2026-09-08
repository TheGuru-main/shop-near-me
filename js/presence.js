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
  ["shop-open", "svc-open", "drv-active", "emg-active"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.type === "checkbox") el.checked = live;
  });
  document.querySelectorAll("[data-hb-marker]").forEach(function (el) {
    el.classList.toggle("hb-live", live);
    el.classList.toggle("hb-off", !live);
    el.textContent = live ? "● Live" : "○ Offline";
  });
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
