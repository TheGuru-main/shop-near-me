window.SNM = window.SNM || {};

SNM.loadBanqueue = async function () {
  var el = document.getElementById("banqueueList") || document.getElementById("bqList");
  if (el) el.innerHTML = "<p class='muted'>Loading banqueue…</p>";
  try {
    var data = await SNM.api("/banqueue/locations");
    var items =
      (data && (data.items || data.locations || data.results)) ||
      (Array.isArray(data) ? data : []);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = "<p class='muted'>No queue locations nearby yet.</p>";
      return;
    }
    el.innerHTML = items
      .map(function (it) {
        return (
          '<article class="card">' +
          "<strong>" + SNM.esc(it.name || it.title || "Location") + "</strong>" +
          "<p class='muted small'>" +
          SNM.esc(it.address || it.primary_location || it.community || "") +
          (it.wait_minutes != null ? " · \~" + it.wait_minutes + " min" : "") +
          "</p></article>"
        );
      })
      .join("");
  } catch (e) {
    if (el) {
      el.innerHTML =
        "<p class='muted'>Banqueue: " + SNM.esc((e && e.message) || "unavailable") + "</p>";
    }
  }
};

SNM.loadEmergency = async function () {
  var el = document.getElementById("emergencyList") || document.getElementById("emList");
  if (el) el.innerHTML = "<p class='muted'>Loading emergency units…</p>";
  var u = SNM.getUser() || {};
  var qs = SNM.qs
    ? SNM.qs({ lat: u.lat, lng: u.lng, community: u.community })
    : "";
  try {
    var data = await SNM.api("/emergency/nearby" + qs);
    var items =
      (data && (data.items || data.units || data.results)) ||
      (Array.isArray(data) ? data : []);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = "<p class='muted'>No emergency pins nearby.</p>";
      return;
    }
    if (typeof SNM.cardHtml === "function") {
      el.innerHTML = items
        .map(function (it) {
          return SNM.cardHtml(SNM.normalizeListing(it));
        })
        .join("");
      if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
    } else {
      el.innerHTML = items
        .map(function (it) {
          return (
            '<article class="card">' +
            "<strong>" + SNM.esc(it.name || "Unit") + "</strong>" +
            "<p class='muted small'>" +
            SNM.esc(it.type || it.category || "") +
            " · " +
            SNM.esc(it.phone || "") +
            "</p>" +
            '<button type="button" class="btn small" data-act="message" data-phone="' +
            SNM.esc(it.phone || "") +
            '">Message</button></article>'
          );
        })
        .join("");
    }
  } catch (e) {
    if (el) {
      el.innerHTML =
        "<p class='muted'>Emergency: " + SNM.esc((e && e.message) || "unavailable") + "</p>";
    }
  }
};

SNM.loadCheckoutAssist = async function () {
  var el = document.getElementById("checkoutAssistBody");
  if (!el) return;
  el.innerHTML =
    "<p class='muted'>For bulky / PoD checkout: book a nearby driver after confirming goods.</p>" +
    "<button type='button' class='btn' id='btnFindDriverAssist'>Find drivers near me</button>";
  var btn = document.getElementById("btnFindDriverAssist");
  if (btn) {
    btn.onclick = async function () {
      SNM.showScreen("search");
      var q = document.getElementById("searchQ");
      if (q) q.value = "driver delivery";
      if (typeof SNM.doSearch === "function") SNM.doSearch();
    };
  }
};

SNM.bindLocalServices = function () {
  var bq = document.getElementById("btnBanqueue");
  if (bq) {
    bq.onclick = function () {
      SNM.showScreen("banqueue");
      SNM.loadBanqueue();
    };
  }
  var em = document.getElementById("btnEmergency");
  if (em) {
    em.onclick = function () {
      SNM.showScreen("emergency");
      SNM.loadEmergency();
    };
  }
  var ca = document.getElementById("btnCheckoutAssist");
  if (ca) {
    ca.onclick = function () {
      SNM.showScreen("checkout-assist");
      SNM.loadCheckoutAssist();
    };
  }
};

SNM.onBanqueueEnter = function () {
  SNM.loadBanqueue();
};
SNM.onEmergencyEnter = function () {
  SNM.loadEmergency();
};
