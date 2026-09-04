window.SNM = window.SNM || {};

SNM.loadBanqueue = async function () {
  var el = document.getElementById("banqueueList");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/banqueue/locations");
    var rows = data.locations || data.items || data || [];
    if (!Array.isArray(rows) || !rows.length) {
      el.innerHTML = "<p class='muted'>No banqueue locations nearby.</p>";
      return;
    }
    el.innerHTML = rows.map(function (r) {
      return '<div class="product-card"><div class="title">' + (r.name || "Location") +
        '</div><div class="meta">' + (r.address || r.primary_location || "") + "</div></div>";
    }).join("");
  } catch (e) {
    el.innerHTML = "<p class='muted'>" + (e.message || "Unavailable") + "</p>";
  }
};

SNM.loadEmergency = async function () {
  var el = document.getElementById("emergencyList");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading…</p>";
  var u = SNM.getUser() || {};
  try {
    var data = await SNM.api("/emergency/nearby" + SNM.qs({ lat: u.lat, lng: u.lng }));
    var rows = data.units || data.items || data || [];
    if (!Array.isArray(rows) || !rows.length) {
      el.innerHTML = "<p class='muted'>No emergency units listed yet.</p>";
      return;
    }
    el.innerHTML = rows.map(function (r) {
      return '<div class="product-card"><div class="title">' + (r.name || r.type || "Unit") +
        '</div><div class="meta">' + (r.contact || r.phone || "") + "</div></div>";
    }).join("");
  } catch (e) {
    el.innerHTML = "<p class='muted'>" + (e.message || "Unavailable") + "</p>";
  }
};

SNM.bindLocalServices = function () {};
