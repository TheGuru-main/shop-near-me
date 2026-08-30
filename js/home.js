window.SNM = window.SNM || {};

SNM.cardHtml = function (item) {
  var title = SNM.escapeHtml(item.name || item.title || item.business_name || "Item");
  var price =
    item.price != null
      ? SNM.escapeHtml(String(item.currency || "NGN") + " " + item.price)
      : "";
  var meta = [
    item.owner_name || item.merchant_name || "",
    item.community || item.city || item.primary_location || "",
    item.km != null ? item.km + " km" : "",
    item.perishable ? "Perishable" : ""
  ]
    .filter(Boolean)
    .map(SNM.escapeHtml)
    .join(" · ");
  return (
    '<div class="product-card">' +
    '<div class="title">' +
    title +
    (price ? " · " + price : "") +
    "</div>" +
    (meta ? '<div class="meta">' + meta + "</div>" : "") +
    "</div>"
  );
};

SNM.fillHomeHeader = function () {
  var u = SNM.getUser() || {};
  var n = document.getElementById("homeName");
  var r = document.getElementById("homeRole");
  var p = document.getElementById("homePlace");
  var h = document.getElementById("homeHb");
  if (n) n.textContent = u.name || "—";
  if (r) r.textContent = u.role || "—";
  if (p) {
    p.textContent = [u.primary_location, u.community, u.city, u.country]
      .filter(Boolean)
      .join(" · ");
  }
  if (h) h.textContent = u.live ? "Live / active" : "Standard presence";

  var seller = u.role && u.role !== "buyer";
  var btnLive = document.getElementById("btnToggleLive");
  var btnHb = document.getElementById("btnHeartbeat");
  if (btnLive) btnLive.classList.toggle("hidden", !seller);
  if (btnHb) btnHb.classList.toggle("hidden", !seller);
};

SNM.loadFeed = async function () {
  var box = document.getElementById("homeFeed");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var u = SNM.getUser() || {};
    var q = (u.prefs && u.prefs[0]) || "";
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          community: u.community || "",
          max_km: 100,
          limit: 40
        })
    );
    var rows = data.results || data.items || [];
    if (!rows.length) {
      box.innerHTML =
        "<p class='muted'>No listings near you yet. Try Search or Fairly used.</p>";
      return;
    }
    box.innerHTML = rows.map(SNM.cardHtml).join("");
  } catch (e) {
    box.innerHTML =
      "<p class='muted'>" + SNM.escapeHtml(e.message || "Feed unavailable") + "</p>";
  }
};

SNM.enterHome = function () {
  SNM.showScreen("home");
  SNM.renderBottomNav("home");
  SNM.fillHomeHeader();
  SNM.loadFeed();
};

SNM.onAuthed = function () {
  SNM.enterHome();
};

SNM.bindHome = function () {
  var menu = document.getElementById("btnMenu");
  var sheet = document.getElementById("menuSheet");
  if (menu && sheet) {
    menu.onclick = function () {
      sheet.classList.remove("hidden");
    };
  }
  if (sheet) {
    sheet.onclick = function (e) {
      if (e.target === sheet) sheet.classList.add("hidden");
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      sheet.classList.add("hidden");
      if (act === "close") return;
      if (act === "logout") {
        SNM.clearSession();
        SNM.showScreen("role-select");
        return;
      }
      if (act === "about") return SNM.showScreen("about");
      if (act === "premium") {
        SNM.showScreen("premium");
        if (typeof SNM.loadPremium === "function") SNM.loadPremium();
        return;
      }
      if (act === "documents") {
        SNM.showScreen("documents");
        if (typeof SNM.loadDocuments === "function") SNM.loadDocuments();
        return;
      }
      if (act === "fairly") {
        SNM.showScreen("fairly-used");
        if (typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
        return;
      }
      if (act === "banqueue") {
        SNM.showScreen("banqueue");
        if (typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
        return;
      }
      if (act === "emergency") {
        SNM.showScreen("emergency");
        if (typeof SNM.loadEmergency === "function") SNM.loadEmergency();
        return;
      }
      if (act === "checkout") return SNM.showScreen("checkout");
      if (act === "trust") return SNM.showScreen("trust");
      if (act === "admin") return SNM.showScreen("admin-contact");
      if (act === "notifications") return SNM.toast("Notifications — inbox empty");
    };
  }

  var searchTop = document.getElementById("btnSearchTop");
  if (searchTop) {
    searchTop.onclick = function () {
      SNM.showScreen("search");
      SNM.renderBottomNav("search");
    };
  }

  var refresh = document.getElementById("btnRefreshFeed");
  if (refresh) refresh.onclick = function () {
    SNM.loadFeed();
  };

  var fu = document.getElementById("btnFairlyUsed");
  if (fu) {
    fu.onclick = function () {
      SNM.showScreen("fairly-used");
      if (typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
    };
  }
  var peri = document.getElementById("btnPerishables");
  if (peri) {
    peri.onclick = async function () {
      SNM.showScreen("search");
      SNM.renderBottomNav("search");
      var box = document.getElementById("searchResults");
      if (box) box.innerHTML = "<p class='muted'>Loading perishables…</p>";
      try {
        var data = await SNM.api(
          "/search/products" + SNM.qs({ perishable: true, max_km: 100, limit: 40 })
        );
        var rows = data.results || data.items || [];
        if (box) {
          box.innerHTML = rows.length
            ? rows.map(SNM.cardHtml).join("")
            : "<p class='muted'>No perishables nearby.</p>";
        }
      } catch (e) {
        if (box) box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
      }
    };
  }
  var bq = document.getElementById("btnBanqueue");
  if (bq) {
    bq.onclick = function () {
      SNM.showScreen("banqueue");
      if (typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
    };
  }
  var em = document.getElementById("btnEmergency");
  if (em) {
    em.onclick = function () {
      SNM.showScreen("emergency");
      if (typeof SNM.loadEmergency === "function") SNM.loadEmergency();
    };
  }

  document.body.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-nav]");
    if (!nav) return;
    var id = nav.getAttribute("data-nav");
    if (id === "home") return SNM.enterHome();
    if (id === "search") {
      SNM.showScreen("search");
      SNM.renderBottomNav("search");
      return;
    }
    if (id === "saved") {
      if (!SNM.isBuyer()) {
        SNM.toast("Saved is for buyers");
        return;
      }
      SNM.showScreen("saved");
      SNM.renderBottomNav("saved");
      return;
    }
    if (id === "shop") {
      if (SNM.isBuyer()) {
        SNM.toast("Shop is for sellers");
        return;
      }
      SNM.showScreen("shop");
      SNM.renderBottomNav("shop");
      if (typeof SNM.loadMyProducts === "function") SNM.loadMyProducts();
      var hint = document.getElementById("shopRoleHint");
      var u = SNM.getUser() || {};
      if (hint) {
        hint.textContent =
          u.role === "driver"
            ? "Drivers: list coverage / capacity as items."
            : u.role === "emergency"
            ? "Emergency units: list unit availability."
            : "Manage catalogue.";
      }
      return;
    }
    if (id === "messages") {
      SNM.showScreen("messages");
      SNM.renderBottomNav("messages");
      if (typeof SNM.loadInbox === "function") SNM.loadInbox();
      return;
    }
    if (id === "news") {
      SNM.showScreen("news");
      SNM.renderBottomNav("news");
      if (typeof SNM.loadNews === "function") SNM.loadNews("local");
      return;
    }
    if (id === "profile") {
      SNM.showScreen("profile");
      SNM.renderBottomNav("profile");
      var body = document.getElementById("profileBody");
      var u2 = SNM.getUser() || {};
      if (body) {
        body.innerHTML =
          "<p><strong>" +
          SNM.escapeHtml(u2.name || "") +
          "</strong></p><p class='muted'>" +
          SNM.escapeHtml(u2.role || "") +
          "</p><p class='muted'>" +
          SNM.escapeHtml(u2.phone || "") +
          "</p><p class='muted'>" +
          SNM.escapeHtml(u2.primary_location || "") +
          "</p>";
      }
    }
  });
};
