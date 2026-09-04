window.SNM = window.SNM || {};

SNM.showScreen = function (id) {
  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });
  var el = document.getElementById(id);
  if (el) el.classList.add("active");
  try {
    if (id && id !== "splash") history.replaceState(null, "", "#" + id);
  } catch (e) {}
  var menu = document.getElementById("menuSheet");
  if (menu) menu.classList.add("hidden");
};

SNM.applyRoleChrome = function () {
  var role = SNM.getRole() || "buyer";
  document.body.classList.remove(
    "role-buyer", "role-merchant", "role-service_provider",
    "role-driver", "role-emergency"
  );
  document.body.classList.add("role-" + role);

  var seller = role === "merchant" || role === "service_provider" || role === "driver";
  document.querySelectorAll(".nav-buyer").forEach(function (n) {
    n.classList.toggle("hidden", seller);
  });
  document.querySelectorAll(".nav-seller").forEach(function (n) {
    n.classList.toggle("hidden", !seller);
  });
  SNM.renderBottomNav("home");
};

SNM.renderBottomNav = function (active) {
  var role = SNM.getRole() || "buyer";
  var seller = role === "merchant" || role === "service_provider" || role === "driver";
  var tabs = seller ? SNM.SELLER_TABS : SNM.BUYER_TABS;
  var html = tabs.map(function (t) {
    return (
      '<button type="button" data-nav="' + t.id + '" class="' +
      (t.id === active ? "active" : "") + '">' +
      '<i class="fa ' + t.icon + '"></i>' + t.label +
      "</button>"
    );
  }).join("");

  document.querySelectorAll(seller ? ".nav-seller" : ".nav-buyer").forEach(function (nav) {
    nav.innerHTML = html;
  });
};

SNM.go = function (id) {
  if (id === "profile") {
    var u = SNM.getUser() || {};
    var body = document.getElementById("profileBody");
    if (body) {
      body.innerHTML =
        "<p><strong>" + (u.name || "") + "</strong></p>" +
        "<p class='muted'>" + (u.role || "") + "</p>" +
        "<p class='muted'>" + (u.phone || "") + "</p>" +
        "<p class='muted'>" + (u.primary_location || "") + "</p>" +
        "<p class='muted'>" + [u.community, u.city, u.country].filter(Boolean).join(", ") + "</p>";
    }
    var sheet = document.getElementById("profileSheet");
    if (sheet) sheet.classList.add("open");
    return;
  }
  SNM.showScreen(id);
  SNM.renderBottomNav(id === "shop" ? "shop" : id === "search" ? "search" : id === "messages" ? "messages" : id === "news" ? "news" : "home");
  if (id === "home" && typeof SNM.refreshHome === "function") SNM.refreshHome();
  if (id === "search" && typeof SNM.bindSearch === "function") { /* ready */ }
  if (id === "news" && typeof SNM.loadNews === "function") SNM.loadNews();
  if (id === "shop" && typeof SNM.loadShop === "function") SNM.loadShop();
  if (id === "messages" && typeof SNM.loadMessages === "function") SNM.loadMessages();
  if (id === "fairly-used" && typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
  if (id === "banqueue" && typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
  if (id === "emergency" && typeof SNM.loadEmergency === "function") SNM.loadEmergency();
  if (id === "premium" && typeof SNM.loadPremium === "function") SNM.loadPremium();
  if (id === "documents" && typeof SNM.loadDocuments === "function") SNM.loadDocuments();
  if (id === "rules" && typeof SNM.loadRules === "function") SNM.loadRules();
};

SNM.startSplash = function () {
  var splash = document.getElementById("splash");
  setTimeout(function () {
    if (splash) splash.classList.add("hidden");
    if (SNM.getToken() && SNM.getUser()) {
      if (typeof SNM.onAuthed === "function") SNM.onAuthed();
      else SNM.go("home");
    } else {
      SNM.showScreen("role-select");
    }
  }, 2200);
};

SNM.bindRouter = function () {
  document.body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-nav]");
    if (btn) {
      e.preventDefault();
      SNM.go(btn.getAttribute("data-nav"));
      return;
    }
    var a = e.target.closest("a[href^='#']");
    if (a && a.getAttribute("href").length > 1) {
      var id = a.getAttribute("href").slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        SNM.go(id);
      }
    }
  });

  var menuBtn = document.getElementById("btnMenu");
  var menu = document.getElementById("menuSheet");
  if (menuBtn && menu) {
    menuBtn.onclick = function () {
      menu.classList.toggle("hidden");
    };
  }
  if (menu) {
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("[data-menu]");
      if (!b) return;
      var act = b.getAttribute("data-menu");
      menu.classList.add("hidden");
      if (act === "logout") {
        SNM.clearSession();
        SNM.showScreen("role-select");
        return;
      }
      SNM.go(act);
    });
  }

  var closeProf = document.getElementById("btnCloseProfile");
  var logoutProf = document.getElementById("btnLogoutProfile");
  if (closeProf) closeProf.onclick = function () {
    document.getElementById("profileSheet").classList.remove("open");
  };
  if (logoutProf) logoutProf.onclick = function () {
    SNM.clearSession();
    document.getElementById("profileSheet").classList.remove("open");
    SNM.showScreen("role-select");
  };

  var searchTop = document.getElementById("btnSearchTop");
  if (searchTop) searchTop.onclick = function () { SNM.go("search"); };
};
