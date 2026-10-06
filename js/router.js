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
  "premium-pay": 1,
  documents: 1,
  banqueue: 1,
  emergency: 1,
  checkout: 1,
  "checkout-assist": 1,
  trust: 1,
  "admin-contact": 1,
  calculator: 1,
  invoice: 1,
  dashboard: 1,
  settings: 1,
  notifications: 1
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
  /* close hamburger when leaving home */
  try {
    if (id !== "home" && typeof SNM.closeMenuSheet === "function") {
      SNM.closeMenuSheet();
    }
  } catch (eMenu) {}


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
    target.style.visibility = "visible";
    target.style.opacity = "1";
  } else {
    console.error("showScreen: missing", id);
    return;
  }

  if (SNM.AUTHED[id]) {
    document.body.classList.add("has-nav");
    if (typeof SNM.renderTabbar === "function") SNM.renderTabbar(id);
  } else {
    document.body.classList.remove("has-nav");
  }

  try {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  } catch (e) {}

  target.scrollTop = 0;
  var scrollBody =
    target.querySelector(":scope > .container") ||
    target.querySelector(":scope > .home-body") ||
    target.querySelector(":scope > .msg-layout") ||
    target.querySelector(".container");
  if (scrollBody) scrollBody.scrollTop = 0;

  if (id === "register") {
    if (typeof SNM.bindCascade === "function") SNM.bindCascade();
    if (typeof SNM.initRegisterCascade === "function") SNM.initRegisterCascade();
  }
  if (id === "setup") {
    if (typeof SNM.wireSetupDoneButton === "function") SNM.wireSetupDoneButton();
    if (typeof SNM.initSetupScreens === "function") SNM.initSetupScreens();
  }
  if (id === "shop") {
    if (typeof SNM.onShopEnter === "function") SNM.onShopEnter();
    /* loadShop is owned by onShopEnter — do not call again (hides driver panel) */
  }
  if (id === "home" && typeof SNM.enterHome === "function") {
    SNM.enterHome(false);
  }
  if (id === "messages") {
    if (typeof SNM.bindMessages === "function") SNM.bindMessages();
    if (typeof SNM.onMessagesEnter === "function") SNM.onMessagesEnter();
    else if (typeof SNM.loadInbox === "function") {
      SNM.loadInbox({ closeThread: true });
    }
  }
  if (id === "search") {
    if (typeof SNM.bindSearch === "function") SNM.bindSearch();
  }
  if (id === "news") {
    if (typeof SNM.onNewsEnter === "function") SNM.onNewsEnter();
    else if (typeof SNM.loadNews === "function") SNM.loadNews(SNM._newsCat || "business");
  }
  if (id === "checkout" && typeof SNM.onCheckoutEnter === "function") SNM.onCheckoutEnter();
  if (id === "rules" && typeof SNM.onRulesEnter === "function") SNM.onRulesEnter();

  if (id === "fairly-used") {
    if (typeof SNM.onFairlyUsedEnter === "function") SNM.onFairlyUsedEnter();
    else if (typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
  }
  if (id === "documents" && typeof SNM.loadDocuments === "function") {
    SNM.loadDocuments();
  }
  if (id === "banqueue" && typeof SNM.loadBanqueue === "function") {
    SNM.loadBanqueue();
  }
  if (id === "emergency" && typeof SNM.loadEmergency === "function") {
    SNM.loadEmergency();
  }
  if (id === "premium" || id === "premium-pay") {
    if (typeof SNM.bindPremium === "function") SNM.bindPremium();
    if (id === "premium" && typeof SNM.loadPremium === "function") {
      SNM.loadPremium();
    }
  }
  if (id === "calculator" && typeof SNM.bindCalculator === "function") {
    SNM.bindCalculator();
  }

  try {
    if (location.hash !== "#" + id) {
      history.replaceState(null, "", "#" + id);
    }
  } catch (e2) {}
};

SNM.go = function (id) {
  SNM.showScreen(id);
};

SNM.enterHome = function (navigate) {
  if (navigate === true) {
    SNM.showScreen("home");
    return;
  }
  if (typeof SNM.fillHomeHeader === "function") SNM.fillHomeHeader();
  if (typeof SNM.renderTabbar === "function") SNM.renderTabbar("home");
  setTimeout(function () {
    if (typeof SNM.loadFeed === "function") SNM.loadFeed();
    if (typeof SNM.initHomeMap === "function") SNM.initHomeMap();
  }, 0);
};

SNM.renderTabbar = function (active) {
  active = active || "home";
  var role =
    (typeof SNM.getRole === "function" && SNM.getRole()) ||
    ((typeof SNM.getUser === "function" && SNM.getUser()) || {}).role ||
    "buyer";
  role = String(role).toLowerCase().trim();
  if (role === "logistics") role = "driver";

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
      var navBtn = e.target.closest("[data-nav]");
      if (navBtn) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(navBtn.getAttribute("data-nav"));
        return;
      }

      /* btnMenu -> menu_driver_fix.js */

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

      if (e.target.closest("#btnSearchTop")) {
        e.preventDefault();
        SNM.showScreen("search");
        return;
      }

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

SNM.bindRouter = function () {
  if (SNM._routerBound) return;
  SNM._routerBound = true;

  document.addEventListener(
    "click",
    function (e) {
      /* Only role-select buttons — never listing cards (they also use data-role) */
      var roleBtn = e.target.closest(
        "#role-select [data-role], button[data-role], .role-pick[data-role], .role-btn[data-role]"
      );
      if (roleBtn && roleBtn.getAttribute("data-role")) {
        if (roleBtn.closest(".listing-card, article.card, #searchResults, #homeFeed, .feed-list")) {
          /* ignore */
        } else {
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
      }

      var backEl = e.target.closest("[data-back]");
      if (backEl) {
        e.preventDefault();
        e.stopPropagation();
        var dest = backEl.getAttribute("data-back") || "home";
        var hasToken =
          typeof SNM.getToken === "function" && !!SNM.getToken();

        if (
          hasToken &&
          (dest === "role-select" || dest === "login" || dest === "register")
        ) {
          var screen =
            (backEl.closest(".screen") &&
              backEl.closest(".screen").getAttribute("data-screen")) ||
            "";
          if (screen === "rules" || screen === "about" || screen === "setup") {
            dest = "home";
          }
        }
        SNM.showScreen(dest);
        return;
      }

      var goEl = e.target.closest("[data-go]");
      if (goEl) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(goEl.getAttribute("data-go"));
        return;
      }

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

  SNM.bindShell();

  window.addEventListener("hashchange", function () {
    var hid = (location.hash || "").replace(/^#/, "");
    if (hid) SNM.showScreen(hid);
  });
};

/* MENU_HAMBURGER_V1 */
SNM.toggleMenuSheet = function () {
  var menu = document.getElementById("menuSheet");
  if (!menu) {
    console.warn("menuSheet missing");
    return;
  }
  var open = menu.classList.contains("open") || !menu.classList.contains("hidden");
  if (menu.classList.contains("hidden") || !menu.classList.contains("open")) {
    menu.classList.remove("hidden");
    menu.classList.add("open");
    menu.style.display = "block";
    menu.setAttribute("aria-hidden", "false");
  } else {
    menu.classList.add("hidden");
    menu.classList.remove("open");
    menu.style.display = "none";
    menu.setAttribute("aria-hidden", "true");
  }
};

SNM.bindMenuHamburger = function () {
  if (SNM._menuHamWired) return;
  SNM._menuHamWired = true;
  document.addEventListener(
    "click",
    function (e) {
      var btn =
        e.target.closest("#btnMenu") ||
        e.target.closest("[data-menu-toggle]") ||
        e.target.closest(".btn-menu");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        SNM.toggleMenuSheet();
        return;
      }
      var item = e.target.closest("#menuSheet [data-menu], #menuSheet [data-go]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var menu = document.getElementById("menuSheet");
        if (menu) {
          menu.classList.add("hidden");
          menu.classList.remove("open");
          menu.style.display = "none";
        }
        var act = item.getAttribute("data-menu") || item.getAttribute("data-go");
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          if (typeof SNM.showScreen === "function") SNM.showScreen("role-select");
          return;
        }
        if (act && typeof SNM.showScreen === "function") SNM.showScreen(act);
        return;
      }
      var menu2 = document.getElementById("menuSheet");
      if (
        menu2 &&
        (menu2.classList.contains("open") || !menu2.classList.contains("hidden")) &&
        !e.target.closest("#menuSheet") &&
        !e.target.closest("#btnMenu")
      ) {
        menu2.classList.add("hidden");
        menu2.classList.remove("open");
        menu2.style.display = "none";
      }
    },
    true
  );
};


/* MENU_CLOSE_NAV_V1 */
SNM.closeMenuSheet = function () {
  var menu = document.getElementById("menuSheet");
  if (!menu) return;
  menu.classList.add("hidden");
  menu.classList.remove("open");
  menu.style.display = "none";
  menu.setAttribute("aria-hidden", "true");
};

SNM.openMenuSheet = function () {
  var menu = document.getElementById("menuSheet");
  if (!menu) return;
  menu.classList.remove("hidden");
  menu.classList.add("open");
  menu.style.display = "block";
  menu.setAttribute("aria-hidden", "false");
};


/* MENU_WIRE_SLIM_V1 */
SNM.bindMenuSlim = function () {
  if (SNM._menuSlimWired) return;
  SNM._menuSlimWired = true;
  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("#btnMenuClose")) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof SNM.closeMenuSheet === "function") SNM.closeMenuSheet();
        return;
      }
      if (e.target.closest("#btnMenu")) {
        e.preventDefault();
        e.stopPropagation();
        var menu = document.getElementById("menuSheet");
        if (!menu) return;
        if (menu.classList.contains("hidden") || menu.style.display === "none") {
          if (typeof SNM.openMenuSheet === "function") SNM.openMenuSheet();
        } else {
          if (typeof SNM.closeMenuSheet === "function") SNM.closeMenuSheet();
        }
        return;
      }
      var item = e.target.closest("#menuSheet [data-go], #menuSheet [data-menu]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var act = item.getAttribute("data-menu") || item.getAttribute("data-go");
        if (typeof SNM.closeMenuSheet === "function") SNM.closeMenuSheet();
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          SNM.showScreen("role-select");
          return;
        }
        if (act) SNM.showScreen(act);
        return;
      }
      var menu2 = document.getElementById("menuSheet");
      if (
        menu2 &&
        !menu2.classList.contains("hidden") &&
        !e.target.closest("#menuSheet") &&
        !e.target.closest("#btnMenu")
      ) {
        if (typeof SNM.closeMenuSheet === "function") SNM.closeMenuSheet();
      }
    },
    true
  );
};
if (typeof SNM.bindShell === "function") {
  var _bs = SNM.bindShell;
  SNM.bindShell = function () {
    _bs.apply(this, arguments);
    SNM.bindMenuSlim();
  };
} else {
  SNM.bindMenuSlim();
}
