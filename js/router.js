window.SNM = window.SNM || {};

/* Screens that need a token. Pre-auth screens are NOT listed. */
SNM.AUTHED = {
  home: 1,
  search: 1,
  saved: 1,
  shop: 1,
  messages: 1,
  news: 1,
  profile: 1,
  menu: 1,
  "fairly-used": 1,
  premium: 1,
  documents: 1,
  banqueue: 1,
  emergency: 1,
  checkout: 1,
  "checkout-assist": 1,
  trust: 1,
  "admin-contact": 1,
  calculator: 1,
  invoice: 1,
  setup: 1,
  dashboard: 1
};

SNM.hideSplash = function () {
  var el = document.getElementById("splash");
  if (!el) return;
  el.classList.remove("active");
  el.classList.add("hidden");
  el.style.display = "none";
};

SNM.showScreen = function (id) {
  if (!id) return;
  id = String(id).replace(/^#/, "");

  if (SNM.AUTHED[id] && typeof SNM.getToken === "function" && !SNM.getToken()) {
    id = "role-select";
  }

  SNM.hideSplash();

  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
    s.style.display = "none";
  });

  var target = document.getElementById(id);
  if (!target) {
    id = "role-select";
    target = document.getElementById("role-select");
  }
  if (target) {
    target.classList.add("active");
    target.style.display = "flex";
  }

  if (SNM.AUTHED[id]) {
    document.body.classList.add("has-nav");
    if (typeof SNM.renderTabbar === "function") SNM.renderTabbar(id);
  } else {
    document.body.classList.remove("has-nav");
  }

  try {
    window.scrollTo(0, 0);
  } catch (e) {}

  if (id === "register") {
    if (typeof SNM.bindCascade === "function") SNM.bindCascade();
    if (typeof SNM.initRegisterCascade === "function") SNM.initRegisterCascade();
  }
  if (id === "home" && typeof SNM.enterHome === "function") SNM.enterHome(false);
  if (id === "shop" && typeof SNM.loadMyProducts === "function") SNM.loadMyProducts();
  if (id === "shop" && typeof SNM.loadShop === "function") SNM.loadShop();
  if (id === "messages" && typeof SNM.loadInbox === "function") SNM.loadInbox();
  if (id === "news" && typeof SNM.loadNews === "function") SNM.loadNews("local");
  if (id === "fairly-used" && typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
  if (id === "premium" && typeof SNM.loadPremium === "function") SNM.loadPremium();
  if (id === "documents" && typeof SNM.loadDocuments === "function") SNM.loadDocuments();
  if (id === "banqueue" && typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
  if (id === "emergency" && typeof SNM.loadEmergency === "function") SNM.loadEmergency();

  try {
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  } catch (e) {}
};

SNM.go = function (id) {
  SNM.showScreen(id);
};

SNM.bindRouter = function () {
  if (SNM._routerBound) return;
  SNM._routerBound = true;

  document.addEventListener(
    "click",
    function (e) {
      /* Role pick → register */
      var roleBtn = e.target.closest("[data-role]");
      if (roleBtn && roleBtn.getAttribute("data-role")) {
        e.preventDefault();
        e.stopPropagation();
        var role = roleBtn.getAttribute("data-role");
        SNM.selectedRole = role;
        try {
          sessionStorage.setItem("snm_role", role);
          sessionStorage.setItem("snm_reg_role", role);
        } catch (err) {}
        if (typeof SNM.setRolePick === "function") SNM.setRolePick(role);
        var label = document.getElementById("regRoleLabel");
        if (label) label.textContent = role;
        SNM.showScreen("register");
        return;
      }

  /* data-back — smart: stay logged in when possible */
      var backEl = e.target.closest("[data-back]");
      if (backEl) {
        e.preventDefault();
        e.stopPropagation();
        var dest = backEl.getAttribute("data-back") || "home";
        var hasToken =
          typeof SNM.getToken === "function" && !!SNM.getToken();

        /* Rules / about opened while authed → home, not role-select */
        if (
          hasToken &&
          (dest === "role-select" || dest === "login" || dest === "register")
        ) {
          var screen =
            (backEl.closest(".screen") &&
              backEl.closest(".screen").getAttribute("data-screen")) ||
            "";
          if (screen === "rules" || screen === "about") {
            dest = "home";
          }
        }
        SNM.showScreen(dest);
        return;
      }

      /* data-go */
      var goEl = e.target.closest("[data-go]");
      if (goEl) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(goEl.getAttribute("data-go"));
        return;
      }

      /* hash links (fallback) */
      var a = e.target.closest("a[href^='#']");
      if (a) {
        var href = a.getAttribute("href") || "";
        if (href.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          SNM.showScreen(href.slice(1));
        }
      }
    },
    true
  );
if (typeof SNM.bindShell === "function") SNM.bindShell();

SNM.renderTabbar = function (active) {
  active = active || "home";
  var role = (typeof SNM.getRole === "function" && SNM.getRole()) || "buyer";

  var tabs;
  if (role === "merchant" || role === "service") {
    tabs = [
      { id: "home", icon: "fa-house", label: "Home" },
      { id: "search", icon: "fa-magnifying-glass", label: "Search" },
      { id: "shop", icon: "fa-store", label: "Shop" },
      { id: "messages", icon: "fa-comments", label: "Msgs" },
      { id: "news", icon: "fa-newspaper", label: "News" }
    ];
  } else if (role === "driver") {
    tabs = [
      { id: "home", icon: "fa-house", label: "Home" },
      { id: "search", icon: "fa-magnifying-glass", label: "Search" },
      { id: "shop", icon: "fa-motorcycle", label: "Status" },
      { id: "messages", icon: "fa-comments", label: "Msgs" },
      { id: "news", icon: "fa-newspaper", label: "News" }
    ];

  } else if (role === "emergency") {
    tabs = [
      { id: "home", icon: "fa-house", label: "Home" },
      { id: "emergency", icon: "fa-truck-medical", label: "Units" },
      { id: "messages", icon: "fa-comments", label: "Msgs" },
      { id: "news", icon: "fa-newspaper", label: "News" }
    ];
  } else {
    /* buyer default */
    tabs = [
      { id: "home", icon: "fa-house", label: "Home" },
      { id: "search", icon: "fa-magnifying-glass", label: "Search" },
      { id: "saved", icon: "fa-bookmark", label: "Saved" },
      { id: "messages", icon: "fa-comments", label: "Msgs" },
      { id: "news", icon: "fa-newspaper", label: "News" }
    ];
  }

  var html = tabs
    .map(function (t) {
      return (
        '<button type="button" data-nav="' +
        t.id +
        '" class="' +
        (t.id === active ? "active" : "") +
        '"><i class="fa-solid ' +
        t.icon +
        '"></i><span>' +
        t.label +
        "</span></button>"
      );
    })
    .join("");

  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.innerHTML = html;
  });
};

SNM.bindShell = function () {
  if (SNM._shellBound) return;
  SNM._shellBound = true;

  document.addEventListener(
    "click",
    function (e) {
      /* bottom nav */
      var navBtn = e.target.closest("[data-nav]");
      if (navBtn) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(navBtn.getAttribute("data-nav"));
        return;
      }

      /* hamburger */
      if (e.target.closest("#btnMenu")) {
        e.preventDefault();
        e.stopPropagation();
        var menu = document.getElementById("menuSheet");
        if (menu) menu.classList.toggle("hidden");
        return;
      }

      /* menu items */
      var item = e.target.closest("#menuSheet [data-menu]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var act = item.getAttribute("data-menu");
        var menuEl = document.getElementById("menuSheet");
        if (menuEl) menuEl.classList.add("hidden");
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          SNM.showScreen("role-select");
          return;
        }
        SNM.showScreen(act);
        return;
      }

      /* search icon on home */
      if (e.target.closest("#btnSearchTop")) {
        e.preventDefault();
        SNM.showScreen("search");
        return;
      }

      /* close menu when tapping outside */
      var menu2 = document.getElementById("menuSheet");
      if (
        menu2 &&
        !menu2.classList.contains("hidden") &&
        !e.target.closest("#menuSheet") &&
        !e.target.closest("#btnMenu")
      ) {
        menu2.classList.add("hidden");
      }
    },
    true
  );
};

  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace(/^#/, "");
    if (id) SNM.showScreen(id);
  });
};
