window.SNM = window.SNM || {};

SNM.showScreen = function (id) {
  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });
  var el = document.getElementById(id);
  if (el) el.classList.add("active");

  var sheet = document.getElementById("profileSheet");
  if (sheet) sheet.classList.remove("open");
  var menu = document.getElementById("menuSheet");
  if (menu) menu.classList.add("hidden");

  if (location.hash !== "#" + id) {
    try {
      history.replaceState(null, "", "#" + id);
    } catch (e) {}
  }

  if (typeof SNM.renderBottomNav === "function") {
    SNM.renderBottomNav(id);
  }

  if (id === "home" && typeof SNM.refreshHome === "function") SNM.refreshHome();
  if (id === "news" && typeof SNM.loadNews === "function") SNM.loadNews();
  if (id === "shop" && typeof SNM.loadShop === "function") SNM.loadShop();
  if (id === "messages" && typeof SNM.loadThreads === "function") SNM.loadThreads();
  if (id === "fairly-used" && typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
  if (id === "banqueue" && typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
  if (id === "emergency" && typeof SNM.loadEmergency === "function") SNM.loadEmergency();
  if (id === "documents" && typeof SNM.loadDocuments === "function") SNM.loadDocuments();
  if (id === "premium" && typeof SNM.loadPremium === "function") SNM.loadPremium();
  if (id === "rules" && typeof SNM.renderPlatformRules === "function") SNM.renderPlatformRules();
};

SNM.go = function (id) {
  SNM.showScreen(id);
};

SNM.startSplash = function () {
  var splash = document.getElementById("splash");
  setTimeout(function () {
    if (splash) splash.classList.add("hidden");
    if (SNM.getToken() && SNM.getUser()) {
      if (typeof SNM.onAuthed === "function") SNM.onAuthed();
      else SNM.showScreen("home");
    } else {
      SNM.showScreen("role-select");
    }
  }, 2200);
};

SNM.renderBottomNav = function (active) {
  var user = SNM.getUser() || {};
  var role = user.role || SNM.getRole() || "buyer";
  var items =
    role === "buyer" || role === "emergency"
      ? SNM.BUYER_TABS
      : SNM.SELLER_TABS;

  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.innerHTML = items
      .map(function (it) {
        var isActive = active === it.id || (active === "profile" && it.id === "profile");
        return (
          '<button type="button" data-nav="' +
          it.id +
          '" class="' +
          (isActive ? "active" : "") +
          '"><i class="fa ' +
          it.icon +
          '"></i><span>' +
          it.label +
          "</span></button>"
        );
      })
      .join("");
  });
};

SNM.bindRouter = function () {
  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace(/^#/, "");
    if (id && document.getElementById(id)) SNM.showScreen(id);
  });

  document.body.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) {
      var id = a.getAttribute("href").slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        SNM.showScreen(id);
      }
    }
    var nav = e.target.closest("[data-nav]");
    if (nav) {
      var nid = nav.getAttribute("data-nav");
      if (nid === "profile") {
        var u = SNM.getUser() || {};
        var body = document.getElementById("profileBody");
        if (body) {
          body.innerHTML =
            "<p><strong>" +
            (u.name || "") +
            "</strong></p><p class='muted'>" +
            (u.role || "") +
            "</p><p class='muted'>" +
            (u.phone || "") +
            "</p><p class='muted'>" +
            (u.primary_location || u.city || "") +
            "</p>";
        }
        var sheet = document.getElementById("profileSheet");
        if (sheet) sheet.classList.add("open");
        return;
      }
      if (document.getElementById(nid)) SNM.showScreen(nid);
    }
  });
};
