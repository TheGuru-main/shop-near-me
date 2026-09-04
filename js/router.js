window.SNM = window.SNM || {};

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  SNM.showScreen = function (id) {
    if (!id) return;
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    var target = $(id);
    if (!target) {
      console.warn("showScreen: missing #" + id);
      return;
    }
    target.classList.add("active");

    try {
      if (location.hash !== "#" + id) {
        history.replaceState(null, "", "#" + id);
      }
    } catch (e) {}

    // Enter hooks
    if (id === "home" && typeof SNM.refreshHome === "function") {
      SNM.refreshHome();
    }
    if (id === "search" && typeof SNM.bindSearch === "function") {
      /* results stay until user searches */ 
    }
    if (id === "news" && typeof SNM.loadNews === "function") {
      SNM.loadNews();
    }
    if (id === "messages") {
      if (typeof SNM.onMessagesEnter === "function") SNM.onMessagesEnter();
      else if (typeof SNM.loadMessages === "function") SNM.loadMessages();
    }
    if (id === "fairly-used" && typeof SNM.loadFairlyUsed === "function") {
      SNM.loadFairlyUsed();
    }
    if (id === "shop" && typeof SNM.loadShop === "function") {
      SNM.loadShop();
    }
    if (id === "banqueue" && typeof SNM.loadBanqueue === "function") {
      SNM.loadBanqueue();
    }
    if (id === "emergency" && typeof SNM.loadEmergency === "function") {
      SNM.loadEmergency();
    }
    if (id === "documents" && typeof SNM.loadDocuments === "function") {
      SNM.loadDocuments();
    }
    if (id === "premium" && typeof SNM.loadPremium === "function") {
      SNM.loadPremium();
    }
    if (id === "profile" && typeof SNM.fillProfile === "function") {
      SNM.fillProfile();
    }

    if (typeof SNM.renderBottomNav === "function") {
      SNM.renderBottomNav(id);
    }

    var menu = $("menuSheet");
    if (menu) menu.classList.add("hidden");
  };

  SNM.go = function (id) {
    SNM.showScreen(id);
  };

  SNM.startSplash = function () {
    var splash = $("splash");
    var done = function () {
      if (splash) splash.classList.add("hidden");
      if (typeof SNM.getToken === "function" && SNM.getToken() && SNM.getUser && SNM.getUser()) {
        if (typeof SNM.onAuthed === "function") SNM.onAuthed();
        else SNM.showScreen("home");
      } else {
        SNM.showScreen("role-select");
      }
    };
    if (splash) setTimeout(done, 2200);
    else done();
  };

  function navItemsForRole(role) {
    if (role === "buyer") {
      return [
        { id: "home", label: "Home", icon: "fa-home" },
        { id: "search", label: "Search", icon: "fa-search" },
        { id: "fairly-used", label: "Used", icon: "fa-tags" },
        { id: "messages", label: "Msg", icon: "fa-comments" },
        { id: "news", label: "News", icon: "fa-newspaper" },
        { id: "profile", label: "Profile", icon: "fa-user" }
      ];
    }
    return [
      { id: "home", label: "Home", icon: "fa-home" },
      { id: "search", label: "Search", icon: "fa-search" },
      { id: "shop", label: "Shop", icon: "fa-store" },
      { id: "messages", label: "Msg", icon: "fa-comments" },
      { id: "news", label: "News", icon: "fa-newspaper" },
      { id: "profile", label: "Profile", icon: "fa-user" }
    ];
  }

  SNM.renderBottomNav = function (active) {
    var user = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    var role = user.role || (typeof SNM.getRole === "function" && SNM.getRole()) || "buyer";
    var items = navItemsForRole(role);

    document.body.classList.remove(
      "role-buyer",
      "role-merchant",
      "role-service_provider",
      "role-driver",
      "role-emergency"
    );
    document.body.classList.add("role-" + String(role).replace(/\s+/g, "_"));

    var html = items
      .map(function (it) {
        var cls = it.id === active ? "active" : "";
        return (
          '<button type="button" class="' +
          cls +
          '" data-nav="' +
          it.id +
          '"><i class="fa ' +
          it.icon +
          '"></i><span>' +
          it.label +
          "</span></button>"
        );
      })
      .join("");

    document.querySelectorAll(".bottom-nav").forEach(function (nav) {
      var isBuyerNav = nav.classList.contains("nav-buyer");
      var isSellerNav = nav.classList.contains("nav-seller");
      if (role === "buyer") {
        if (isSellerNav) {
          nav.classList.add("hidden");
          return;
        }
        if (isBuyerNav) nav.classList.remove("hidden");
      } else {
        if (isBuyerNav) {
          nav.classList.add("hidden");
          return;
        }
        if (isSellerNav) nav.classList.remove("hidden");
      }
      nav.innerHTML = html;
    });
  };

  SNM.bindRouter = function () {
    // Back links: <button class="back-link" data-back="home">
    document.body.addEventListener("click", function (e) {
      var back = e.target.closest("[data-back]");
      if (back) {
        e.preventDefault();
        var to = back.getAttribute("data-back");
        if (to) SNM.showScreen(to);
        return;
      }

      var nav = e.target.closest("[data-nav]");
      if (nav) {
        e.preventDefault();
        var id = nav.getAttribute("data-nav");
        if (id) SNM.showScreen(id);
        return;
      }

      var menuBtn = e.target.closest("[data-menu]");
      if (menuBtn) {
        e.preventDefault();
        var act = menuBtn.getAttribute("data-menu");
        var menu = $("menuSheet");
        if (menu) menu.classList.add("hidden");
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          SNM.showScreen("role-select");
          return;
        }
        if (act) SNM.showScreen(act);
        return;
      }
    });

    window.addEventListener("hashchange", function () {
      var id = (location.hash || "").replace(/^#/, "");
      if (id) SNM.showScreen(id);
    });
  };
})();
