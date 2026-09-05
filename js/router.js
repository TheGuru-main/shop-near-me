window.SNM = window.SNM || {};

SNM.showScreen = function (id) {
  if (!id) return;
  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });
  var el = document.getElementById(id);
  if (el) el.classList.add("active");

  try {
    if (location.hash !== "#" + id) location.hash = id;
  } catch (e) {}

  SNM.renderBottomNav(id);
  SNM._onEnter(id);
};

SNM._onEnter = function (id) {
  if (id === "home" && typeof SNM.onHomeEnter === "function") SNM.onHomeEnter();
  if (id === "search" && typeof SNM.onSearchEnter === "function") SNM.onSearchEnter();
  if (id === "news" && typeof SNM.loadNews === "function") SNM.loadNews();
  if (id === "shop" && typeof SNM.onShopEnter === "function") SNM.onShopEnter();
  if (id === "messages" && typeof SNM.loadMessages === "function") SNM.loadMessages();
  if (id === "fairly-used" && typeof SNM.onFairlyUsedEnter === "function") SNM.onFairlyUsedEnter();
  if (id === "banqueue" && typeof SNM.onBanqueueEnter === "function") SNM.onBanqueueEnter();
  if (id === "emergency" && typeof SNM.onEmergencyEnter === "function") SNM.onEmergencyEnter();
  if (id === "documents" && typeof SNM.onDocumentsEnter === "function") SNM.onDocumentsEnter();
  if (id === "premium" && typeof SNM.onPremiumEnter === "function") SNM.onPremiumEnter();
  if (id === "rules" && typeof SNM.onRulesEnter === "function") SNM.onRulesEnter();
  if (id === "checkout-assist" && typeof SNM.loadCheckoutAssist === "function") {
    SNM.loadCheckoutAssist();
  }
};

SNM.navItemsForRole = function (role) {
  role = role || "buyer";
  if (role === "buyer") {
    return [
      { id: "home", label: "Home", icon: "🏠" },
      { id: "search", label: "Search", icon: "🔍" },
      { id: "saved", label: "Saved", icon: "⭐" },
      { id: "messages", label: "Msg", icon: "💬" },
      { id: "news", label: "News", icon: "📰" },
      { id: "profile", label: "Profile", icon: "👤" }
    ];
  }
  return [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "search", label: "Search", icon: "🔍" },
    { id: "shop", label: "Shop", icon: "🏪" },
    { id: "messages", label: "Msg", icon: "💬" },
    { id: "news", label: "News", icon: "📰" },
    { id: "profile", label: "Profile", icon: "👤" }
  ];
};

SNM.renderBottomNav = function (active) {
  var user = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = user.role || "buyer";
  var items = SNM.navItemsForRole(role);
  var html = items
    .map(function (it) {
      var isActive = it.id === active || (it.id === "profile" && active === "profile");
      return (
        '<button type="button" class="' +
        (isActive ? "active" : "") +
        '" data-nav="' +
        it.id +
        '"><span class="nav-ico">' +
        it.icon +
        "</span><span>" +
        it.label +
        "</span></button>"
      );
    })
    .join("");
  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.innerHTML = html;
  });
};

SNM.openProfile = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var body = document.getElementById("profileBody");
  if (body) {
    body.innerHTML =
      "<p><strong>" +
      (typeof SNM.esc === "function" ? SNM.esc(u.name || "") : u.name || "") +
      "</strong></p>" +
      "<p class='muted'>" +
      (u.role || "") +
      "</p>" +
      "<p class='muted'>" +
      (u.phone || "") +
      "</p>" +
      "<p class='muted'>" +
      (u.primary_location || "") +
      "</p>" +
      "<p class='muted'>" +
      [u.community, u.city, u.region, u.country].filter(Boolean).join(" · ") +
      "</p>";
  }
  var sheet = document.getElementById("profileSheet");
  if (sheet) sheet.classList.add("open");
};

SNM.closeProfile = function () {
  var sheet = document.getElementById("profileSheet");
  if (sheet) sheet.classList.remove("open");
};

SNM.openMenu = function () {
  var m = document.getElementById("menuSheet");
  if (m) m.classList.remove("hidden");
};

SNM.closeMenu = function () {
  var m = document.getElementById("menuSheet");
  if (m) m.classList.add("hidden");
};

SNM.bindRouter = function () {
  document.body.addEventListener("click", function (e) {
    var back = e.target.closest("[data-back]");
    if (back) {
      e.preventDefault();
      var to = back.getAttribute("data-back");
      if (to) SNM.showScreen(to);
      return;
    }

    var go = e.target.closest("[data-go]");
    if (go) {
      e.preventDefault();
      var gid = go.getAttribute("data-go");
      if (gid) SNM.showScreen(gid);
      return;
    }

    var nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      var id = nav.getAttribute("data-nav");
      if (id === "profile") {
        SNM.openProfile();
        return;
      }
      if (id) SNM.showScreen(id);
      return;
    }

    var menuBtn = e.target.closest("#btnMenu");
    if (menuBtn) {
      e.preventDefault();
      SNM.openMenu();
      return;
    }

    var menuItem = e.target.closest("#menuSheet [data-menu]");
    if (menuItem) {
      e.preventDefault();
      var act = menuItem.getAttribute("data-menu");
      SNM.closeMenu();
      if (act === "logout") {
        if (typeof SNM.clearUser === "function") SNM.clearUser();
        if (typeof SNM.clearToken === "function") SNM.clearToken();
        try {
          localStorage.removeItem("snm_token");
          localStorage.removeItem("snm_user");
        } catch (err) {}
        SNM.showScreen("role-select");
        return;
      }
      if (act === "about") SNM.showScreen("about");
      else if (act === "rules") SNM.showScreen("rules");
      else if (act === "premium") SNM.showScreen("premium");
      else if (act === "documents") SNM.showScreen("documents");
      else if (act === "calculator") SNM.showScreen("calculator");
      else if (act === "invoice") SNM.showScreen("invoice");
      else if (act) SNM.showScreen(act);
      return;
    }

    var closeProf = e.target.closest("#btnCloseProfile");
    if (closeProf) {
      SNM.closeProfile();
      return;
    }

    var logoutProf = e.target.closest("#btnLogoutProfile");
    if (logoutProf) {
      if (typeof SNM.clearUser === "function") SNM.clearUser();
      if (typeof SNM.clearToken === "function") SNM.clearToken();
      try {
        localStorage.removeItem("snm_token");
        localStorage.removeItem("snm_user");
      } catch (err) {}
      SNM.closeProfile();
      SNM.showScreen("role-select");
    }
  });

  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace(/^#/, "");
    if (id && document.getElementById(id)) SNM.showScreen(id);
  });
};
