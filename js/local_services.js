/* Shop Near Me — banqueue + emergency */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function placeParams() {
    var u = SNM.getUser() || {};
    return SNM.qs({
      community: u.community || "",
      city: u.city || "",
      lat: u.lat,
      lng: u.lng,
    });
  }

  SNM.loadBanqueue = async function () {
    var box = el("banqueueList") || el("banqueueFeed");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading queues…</p>';
    try {
      var data = await SNM.api("/banqueue/locations" + placeParams(), {
        method: "GET",
      });
      var rows = (data && (data.locations || data.items || data)) || [];
      if (!Array.isArray(rows)) rows = [];
      if (!rows.length) {
        box.innerHTML =
          '<p class="muted">No banqueue locations near you yet.</p>';
        return;
      }
      box.innerHTML = rows
        .map(function (r) {
          return (
            '<article class="feed-card">' +
            "<strong>" +
            escapeHtml(r.name || r.title || "Location") +
            "</strong>" +
            '<p class="meta">' +
            escapeHtml(r.kind || r.type || "") +
            (r.wait_minutes != null
              ? " · \~" + escapeHtml(String(r.wait_minutes)) + " min"
              : "") +
            "</p>" +
            '<p class="muted">' +
            escapeHtml(r.primary_location || r.address || "") +
            "</p></article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.loadEmergency = async function () {
    var box = el("emergencyList") || el("emergencyFeed");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading emergency contacts…</p>';
    try {
      var data = await SNM.api("/emergency/nearby" + placeParams(), {
        method: "GET",
      });
      var rows = (data && (data.items || data.units || data)) || [];
      if (!Array.isArray(rows)) rows = [];
      if (!rows.length) {
        box.innerHTML =
          '<p class="muted">No emergency units pinned near you yet.</p>';
        return;
      }
      box.innerHTML = rows
        .map(function (r) {
          var phone = r.phone || r.contact || "";
          return (
            '<article class="feed-card">' +
            "<strong>" +
            escapeHtml(r.name || r.type || "Unit") +
            "</strong>" +
            '<p class="meta">' +
            escapeHtml(r.type || r.category || "") +
            "</p>" +
            (phone
              ? '<p><a href="tel:' +
                escapeHtml(phone) +
                '">' +
                escapeHtml(phone) +
                "</a></p>"
              : "") +
            '<p class="muted">' +
            escapeHtml(r.primary_location || r.address || "") +
            "</p></article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.bindLocalServices = function () {
    var bq = el("btnBanqueue") || el("btnOpenBanqueue");
    if (bq) {
      bq.onclick = function () {
        if (typeof SNM.showScreen === "function") SNM.showScreen("banqueue");
        SNM.loadBanqueue();
      };
    }
    var em = el("btnEmergency") || el("btnOpenEmergency");
    if (em) {
      em.onclick = function () {
        if (typeof SNM.showScreen === "function") SNM.showScreen("emergency");
        SNM.loadEmergency();
      };
    }
    var fab = el("btnFab");
    if (fab) {
      fab.onclick = function () {
        if (typeof SNM.showScreen === "function") SNM.showScreen("banqueue");
        SNM.loadBanqueue();
      };
    }
  };
})();
