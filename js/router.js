/* Shop Near Me — router.js */
window.SNM = window.SNM || {};

SNM.currentScreen = "splash";

SNM.showScreen = function (id) {
  var target = id || "role-select";
  if (target.charAt(0) === "#") target = target.slice(1);

  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });

  var el = document.getElementById(target);
  if (!el) {
    target =
      SNM.getToken && SNM.getToken() && SNM.getUser && SNM.getUser()
        ? "home"
        : "role-select";
    el = document.getElementById(target);
  }
  if (el) el.classList.add("active");
  SNM.currentScreen = target;

  try {
    if (location.hash.replace(/^#/, "") !== target) {
      history.replaceState(null, "", "#" + target);
    }
  } catch (e) {}

  if (typeof SNM.renderTabbars === "function") {
    SNM.renderTabbars(target);
  }

  if (target === "home" && typeof SNM.refreshHome === "function") {
    SNM.refreshHome();
  }
  if (target === "profile" && typeof SNM.renderProfile === "function") {
    SNM.renderProfile();
  }
  if (target === "news" && typeof SNM.loadNews === "function") {
    SNM.loadNews();
  }
  if (target === "shop") {
    if (typeof SNM.loadShop === "function") SNM.loadShop();
    else if (typeof SNM.loadMyProducts === "function") SNM.loadMyProducts();
  }
  if (target === "messages") {
    if (typeof SNM.loadThreads === "function") SNM.loadThreads();
    else if (typeof SNM.loadInbox === "function") SNM.loadInbox();
  }
  if (target === "fairly-used" && typeof SNM.loadFairlyUsed === "function") {
    SNM.loadFairlyUsed();
  }
  if (target === "banqueue" && typeof SNM.loadBanqueue === "function") {
    SNM.loadBanqueue();
  }
  if (target === "emergency" && typeof SNM.loadEmergency === "function") {
    SNM.loadEmergency();
  }
  if (target === "documents") {
    if (typeof SNM.loadReceipts === "function") SNM.loadReceipts();
    if (typeof SNM.loadEInvoices === "function") SNM.loadEInvoices();
  }
  if (target === "invoice-studio" && typeof SNM.loadStudioInvoices === "function") {
    SNM.loadStudioInvoices();
  }
  if (target === "rules" && typeof SNM.renderPlatformRules === "function") {
    SNM.renderPlatformRules();
  }
  if (target === "premium" && typeof SNM.loadPremiumPlans === "function") {
    SNM.loadPremiumPlans();
  }

  var menu = document.getElementById("menuSheet");
  if (menu) menu.classList.add("hidden");
};

SNM.go = function (hash) {
  var h = hash || "#role-select";
  if (h.charAt(0) !== "#") h = "#" + h;
  if (location.hash === h) {
    SNM.showScreen(h.slice(1));
  } else {
    location.hash = h;
  }
};

SNM.tabsFor = SNM.tabsFor || function (user) {
  var role = (user && user.role) || "buyer";
  if (role === "buyer") {
    return [
      { id: "home", label: "Home", icon: "fa-home" },
      { id: "search", label: "Search", icon: "fa-search" },
      { id: "messages", label: "Msg", icon: "fa-comments" },
      { id: "news", label: "News", icon: "fa-newspaper" },
      { id: "profile", label: "Profile", icon: "fa-user" },
    ];
  }
  return [
    { id: "home", label: "Home", icon: "fa-home" },
    { id: "search", label: "Search", icon: "fa-search" },
    { id: "shop", label: "Shop", icon: "fa-store" },
    { id: "messages", label: "Msg", icon: "fa-comments" },
    { id: "news", label: "News", icon: "fa-newspaper" },
    { id: "profile", label: "Profile", icon: "fa-user" },
  ];
};

SNM.renderTabbars = function (activeId) {
  var tabs = SNM.tabsFor(SNM.getUser && SNM.getUser());
  document.querySelectorAll(".bottom-nav, .tabbar").forEach(function (nav) {
    nav.innerHTML = tabs
      .map(function (t) {
        var active = t.id === activeId ? " active" : "";
        return (
          '<a href="#' +
          t.id +
          '" class="tab' +
          active +
          '"><span>' +
          t.label +
          "</span></a>"
        );
      })
      .join("");
  });
};

SNM.handleMenuAction = function (act) {
  if (!act) return;
  if (act === "documents") {
    SNM.go("#documents");
    return;
  }
  if (act === "calculator") {
    SNM.go("#calculator");
    return;
  }
  if (act === "invoice" || act === "invoice-studio") {
    SNM.go("#invoice-studio");
    return;
  }
  if (act === "premium") {
    SNM.go("#premium");
    return;
  }
  if (act === "about") {
    SNM.go("#about");
    return;
  }
  if (act === "notifications") {
    if (typeof SNM.toast === "function") {
      SNM.toast("Notifications — connected to API in next slice");
    }
    return;
  }
  if (act === "logout") {
    if (typeof SNM.clearUser === "function") SNM.clearUser();
    if (typeof SNM.clearToken === "function") SNM.clearToken();
    try {
      localStorage.removeItem("snm_token");
      localStorage.removeItem("snm_user");
    } catch (e) {}
    SNM.go("#role-select");
  }
};

SNM.bindRouter = function () {
  window.addEventListener("hashchange", function () {
    var id = (location.hash || "#role-select").replace(/^#/, "");
    if (id === "splash") id = "role-select";
    SNM.showScreen(id);
  });

  document.querySelectorAll(".choice-card[data-role]").forEach(function (card) {
    card.addEventListener("click", function () {
      var role = card.getAttribute("data-role") || "buyer";
      if (typeof SNM.setRole === "function") SNM.setRole(role);
      var label = document.getElementById("regRoleLabel");
      if (label) label.textContent = role;
      if (typeof SNM.applyRoleExtras === "function") SNM.applyRoleExtras(role);
    });
  });

  var menuBtn = document.getElementById("btnMenu");
  var menuSheet = document.getElementById("menuSheet");
  if (menuBtn && menuSheet) {
    menuBtn.onclick = function (e) {
      e.stopPropagation();
      menuSheet.classList.toggle("hidden");
    };
  }

  if (menuSheet) {
    menuSheet.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-menu]");
      if (!btn) return;
      var act = btn.getAttribute("data-menu");
      menuSheet.classList.add("hidden");
      SNM.handleMenuAction(act);
    });
  }

  var btnDocs = document.getElementById("btnDocuments");
  if (btnDocs && !btnDocs.getAttribute("data-menu")) {
    btnDocs.onclick = function () {
      SNM.go("#documents");
    };
  }

  document.body.addEventListener("click", function (e) {
    var assist = e.target.closest("#btnCheckoutAssist");
    if (assist) {
      SNM.go("#checkout-assist");
    }
  });
};

SNM.startSplash = function () {
  var splash = document.getElementById("splash");
  var done = function () {
    if (splash) {
      splash.classList.add("hidden");
      splash.classList.remove("active");
    }
    if (SNM.getToken && SNM.getToken() && SNM.getUser && SNM.getUser()) {
      SNM.go("#home");
    } else {
      var hash = (location.hash || "").replace(/^#/, "");
      if (hash && hash !== "splash") SNM.go("#" + hash);
      else SNM.go("#role-select");
    }
  };
  setTimeout(done, 2200);
};
