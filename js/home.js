window.SNM = window.SNM || {};

SNM.renderNav = function (navId) {
  var nav = document.getElementById(navId);
  if (!nav) return;
  var items = [
    { id: "home", ico: "🏠", label: "Home" },
    { id: "search", ico: "🔍", label: "Search" },
    { id: "shop", ico: "📦", label: "Shop" },
    { id: "messages", ico: "💬", label: "Messages" },
    { id: "news", ico: "📰", label: "News" },
    { id: "profile", ico: "👤", label: "Profile" }
  ];
  nav.innerHTML = items.map(function (it) {
    return (
      "<button type=\"button\" data-nav=\"" + it.id + "\">" +
      "<span class=\"ico\">" + it.ico + "</span>" + it.label +
      "</button>"
    );
  }).join("");
};

SNM.fillHomeHeader = function () {
  var u = SNM.getUser() || {};
  var name = document.getElementById("homeName");
  var role = document.getElementById("homeRole");
  var place = document.getElementById("homePlace");
  var hb = document.getElementById("homeHb");
  if (name) name.textContent = u.name || "—";
  if (role) role.textContent = u.role || "";
  if (place) {
    place.textContent = [u.primary_location, u.community, u.city, u.country]
      .filter(Boolean)
      .join(" · ");
  }
  if (hb) {
    var live = u.live || {};
    hb.textContent = live.active
      ? "Heartbeat / live: active"
      : "Heartbeat / live: idle";
  }

  var isBuyer = (u.role || "") === "buyer";
  var liveBtn = document.getElementById("btnToggleLive");
  var hbBtn = document.getElementById("btnHeartbeat");
  if (liveBtn) liveBtn.classList.toggle("hidden", isBuyer);
  if (hbBtn) hbBtn.classList.toggle("hidden", isBuyer);
};

SNM.cardHtml = function (item) {
  var title = item.name || item.title || item.item || "Item";
  var price =
    item.price != null
      ? item.price + " " + (item.currency || "")
      : item.total != null
        ? item.total + " " + (item.currency || "")
        : "";
  var who = item.merchant_name || item.owner_name || item.merchant || item.seller || "";
  var km =
    item.km != null
      ? Number(item.km).toFixed(1) + " km"
      : item.distance_km != null
        ? Number(item.distance_km).toFixed(1) + " km"
        : "";
  var place = item.primary_location || item.community || item.city || "";
  var tags = [];
  if (item.perishable) tags.push("<span class=\"chip\">perishable</span>");
  if (item.available === false) tags.push("<span class=\"chip\">unavailable</span>");

  return (
    "<div class=\"product-card\">" +
    "<strong>" + SNM.escapeHtml(title) + "</strong>" +
    (price ? "<div>" + SNM.escapeHtml(String(price)) + "</div>" : "") +
    "<div class=\"muted\">" +
    SNM.escapeHtml([who, place, km].filter(Boolean).join(" · ")) +
    "</div>" +
    (tags.length ? "<div>" + tags.join(" ") + "</div>" : "") +
    "</div>"
  );
};

SNM.loadFeed = async function () {
  var box = document.getElementById("homeFeed");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading feed…</p>";
  try {
    var data = await SNM.api("/feed");
    var items = data.items || data.results || data || [];
    if (!Array.isArray(items)) items = [];
    if (!items.length) {
      box.innerHTML =
        "<p class=\"muted\">No feed yet. Search, add catalogue items, or set preferences.</p>";
      return;
    }
    box.innerHTML = items.map(SNM.cardHtml).join("");
  } catch (e) {
    box.innerHTML =
      "<p class=\"muted\">Feed unavailable (" +
      SNM.escapeHtml(e.message || "error") +
      "). Try Search.</p>";
  }
};

SNM.goHome = function () {
  if (!SNM.requireAuth()) return;
  SNM.fillHomeHeader();
  SNM.showScreen("home");
  SNM.loadFeed();
};

SNM.onAuthed = function () {
  SNM.goHome();
};

SNM.bindHome = function () {
  ["mainNav", "searchNav", "shopNav", "messagesNav", "newsNav", "profileNav"].forEach(
    SNM.renderNav
  );

  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-nav]");
      if (!btn) return;
      var id = btn.getAttribute("data-nav");
      if (!SNM.requireAuth()) return;
      if (id === "home") return SNM.goHome();
      if (id === "search") {
        SNM.showScreen("search");
        return;
      }
      if (id === "shop") {
        SNM.showScreen("shop");
        if (typeof SNM.loadMyProducts === "function") SNM.loadMyProducts();
        return;
      }
      if (id === "messages") {
        SNM.showScreen("messages");
        if (typeof SNM.loadInbox === "function") SNM.loadInbox();
        return;
      }
      if (id === "news") {
        SNM.showScreen("news");
        if (typeof SNM.loadNews === "function") SNM.loadNews("local");
        return;
      }
      if (id === "profile") {
        SNM.showScreen("profile");
        SNM.renderProfile();
      }
    });
  });

  var refresh = document.getElementById("btnRefreshFeed");
  if (refresh) refresh.onclick = function () { SNM.loadFeed(); };

  var searchTop = document.getElementById("btnSearchTop");
  if (searchTop) {
    searchTop.onclick = function () {
      if (SNM.requireAuth()) SNM.showScreen("search");
    };
  }

  var fairly = document.getElementById("btnFairlyUsed");
  if (fairly) {
    fairly.onclick = function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("fairly-used");
      if (typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
    };
  }

  var perish = document.getElementById("btnPerishables");
  if (perish) {
    perish.onclick = async function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("search");
      var box = document.getElementById("searchResults");
      if (box) box.innerHTML = "<p class=\"muted\">Loading perishables…</p>";
      try {
        var rows = await SNM.api("/products/perishables");
        if (!Array.isArray(rows)) rows = rows.items || rows.results || [];
        if (box) {
          box.innerHTML = rows.length
            ? rows.map(SNM.cardHtml).join("")
            : "<p class=\"muted\">No perishables listed</p>";
        }
      } catch (e) {
        if (box) box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message) + "</p>";
      }
    };
  }

  var prem = document.getElementById("btnPremiumHub");
  if (prem) {
    prem.onclick = function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("premium");
      if (typeof SNM.loadPremium === "function") SNM.loadPremium();
    };
  }

  var ban = document.getElementById("btnBanqueue");
  if (ban) {
    ban.onclick = function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("banqueue");
      if (typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
    };
  }

  var em = document.getElementById("btnEmergency");
  if (em) {
    em.onclick = function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("emergency");
      if (typeof SNM.loadEmergency === "function") SNM.loadEmergency();
    };
  }

  var co = document.getElementById("btnCheckoutAssist");
  if (co) {
    co.onclick = function () {
      if (!SNM.requireAuth()) return;
      SNM.showScreen("checkout");
    };
  }

  var hbBtn = document.getElementById("btnHeartbeat");
  if (hbBtn) {
    hbBtn.onclick = async function () {
      try {
        await SNM.api("/presence/heartbeat", { method: "POST", body: {} });
        SNM.toast("Heartbeat sent");
        var me = await SNM.api("/auth/me");
        SNM.setSession(SNM.getToken(), me);
        SNM.fillHomeHeader();
      } catch (e) {
        SNM.toast(e.message || "Heartbeat failed");
      }
    };
  }

  var liveBtn = document.getElementById("btnToggleLive");
  if (liveBtn) {
    liveBtn.onclick = async function () {
      try {
        await SNM.api("/live/toggle", { method: "POST", body: { active: true } });
        SNM.toast("Live on");
        var me = await SNM.api("/auth/me");
        SNM.setSession(SNM.getToken(), me);
        SNM.fillHomeHeader();
      } catch (e) {
        SNM.toast(e.message || "Live toggle failed");
      }
    };
  }

  var menuBtn = document.getElementById("btnMenu");
  var sheet = document.getElementById("menuSheet");
  if (menuBtn && sheet) {
    menuBtn.onclick = function () {
      sheet.hidden = false;
    };
    sheet.onclick = function (e) {
      if (e.target === sheet || e.target.getAttribute("data-act") === "close") {
        sheet.hidden = true;
        return;
      }
      var act = e.target.getAttribute("data-act");
      if (!act) return;
      sheet.hidden = true;
      if (act === "logout") {
        SNM.clearSession();
        SNM.showScreen("role-select");
        return;
      }
      if (act === "premium") {
        SNM.showScreen("premium");
        if (typeof SNM.loadPremium === "function") SNM.loadPremium();
      }
      if (act === "documents") SNM.showScreen("documents");
      if (act === "fairly") {
        SNM.showScreen("fairly-used");
        if (typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
      }
      if (act === "banqueue") {
        SNM.showScreen("banqueue");
        if (typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
      }
      if (act === "emergency") {
        SNM.showScreen("emergency");
        if (typeof SNM.loadEmergency === "function") SNM.loadEmergency();
      }
      if (act === "checkout") SNM.showScreen("checkout");
      if (act === "trust") SNM.showScreen("trust");
      if (act === "admin") SNM.showScreen("admin-contact");
      if (act === "about") SNM.showScreen("about");
      if (act === "notifications") SNM.toast("Notifications · coming next");
    };
  }
};

SNM.renderProfile = function () {
  var box = document.getElementById("profileBody");
  if (!box) return;
  var u = SNM.getUser() || {};
  box.innerHTML =
    "<p><strong>" + SNM.escapeHtml(u.name || "") + "</strong></p>" +
    "<p class=\"muted\">" + SNM.escapeHtml(u.phone || "") + "</p>" +
    "<p class=\"muted\">" + SNM.escapeHtml(u.role || "") + "</p>" +
    "<p class=\"muted\">" +
    SNM.escapeHtml(
      [u.primary_location, u.community, u.city, u.country].filter(Boolean).join(" · ")
    ) +
    "</p>";
};
