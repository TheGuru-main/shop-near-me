window.SNM = window.SNM || {};

SNM.loadBanqueue = async function () {
  var list = document.getElementById("banqueueList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading banqueue…</p>";
  var user = SNM.getUser() || {};
  try {
    var data = await SNM.api(
      "/banqueue/locations" +
        SNM.qs({
          community: user.community || "",
          city: user.city || "",
          max_km: SNM.DEFAULT_MAX_KM || 2000
        })
    );
    var rows = data.locations || data.items || data.results || [];
    if (!rows.length) {
      list.innerHTML =
        "<div class='card'><p>No banqueue points nearby.</p></div>";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          (r.name || r.title || "Queue point") +
          "</div>" +
          '<div class="meta">' +
          [r.category, r.primary_location || r.address, r.wait_note]
            .filter(Boolean)
            .join(" · ") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Banqueue failed") +
      "</p></div>";
  }
};

SNM.loadEmergency = async function () {
  var list = document.getElementById("emergencyList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading emergency units…</p>";
  var user = SNM.getUser() || {};
  try {
    var data = await SNM.api(
      "/emergency/nearby" +
        SNM.qs({
          community: user.community || "",
          city: user.city || "",
          max_km: SNM.DEFAULT_MAX_KM || 2000
        })
    );
    var rows = data.units || data.items || data.results || [];
    if (!rows.length) {
      list.innerHTML =
        "<div class='card'><p>No emergency units listed nearby.</p></div>";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        var phone = r.phone || r.contact || "";
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          (r.name || r.type || "Unit") +
          "</div>" +
          '<div class="meta">' +
          [r.type, r.primary_location || r.city, phone]
            .filter(Boolean)
            .join(" · ") +
          "</div>" +
          (phone
            ? '<a class="btn small" href="tel:' +
              phone +
              '">Call</a>'
            : "") +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Emergency list failed") +
      "</p></div>";
  }
};

SNM.bindLocalServices = function () {
  /* loads on showScreen via router */
};
