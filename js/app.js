window.SNM = window.SNM || {};

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function bindChipsAndChrome() {
    var map = [
      ["btnFairlyUsedTop", "fairly-used"],
      ["btnPerishables", "search"],
      ["btnBanqueue", "banqueue"],
      ["btnEmergency", "emergency"],
      ["btnCheckoutAssist", "calculator"],
      ["btnSearchTop", "search"],
      ["btnRules", "rules"],
      ["btnRulesFromAbout", "rules"],
      ["btnAboutFromRole", "about"],
      ["btnGoLogin", "login"]
    ];

    map.forEach(function (pair) {
      var btn = $(pair[0]);
      if (!btn) return;
      btn.onclick = function () {
        if (pair[0] === "btnPerishables") {
          SNM.showScreen("search");
          var q = $("searchQ");
          if (q) q.value = "perishable";
          if (typeof SNM.doSearch === "function") SNM.doSearch();
          return;
        }
        SNM.showScreen(pair[1]);
      };
    });

    var menu = $("btnMenu");
    var sheet = $("menuSheet");
    if (menu && sheet) {
      menu.onclick = function (e) {
        e.stopPropagation();
        sheet.classList.toggle("hidden");
      };
    }
    document.addEventListener("click", function (e) {
      if (!sheet || !menu) return;
      if (sheet.classList.contains("hidden")) return;
      if (sheet.contains(e.target) || menu.contains(e.target)) return;
      sheet.classList.add("hidden");
    });

    var backOtp = $("btnBackFromOtp");
    if (backOtp) {
      backOtp.onclick = function () {
        var role = typeof SNM.getRole === "function" ? SNM.getRole() : null;
        SNM.showScreen(role ? "register" : "role-select");
      };
    }

    var logout = $("btnLogoutProfile");
    if (logout) {
      logout.onclick = function () {
        if (typeof SNM.clearSession === "function") SNM.clearSession();
        SNM.showScreen("role-select");
      };
    }

    var closeProf = $("btnCloseProfile");
    if (closeProf) {
      closeProf.onclick = function () {
        SNM.showScreen("home");
      };
    }
  }

  SNM.fillProfile = function () {
    var box = $("profileBody");
    var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    if (!box) return;
    box.innerHTML =
      "<p><strong>" +
      (u.name || "") +
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
      [u.community, u.city, u.country].filter(Boolean).join(" · ") +
      "</p>";
  };

  function boot() {
    if (typeof SNM.initParticles === "function") SNM.initParticles();
    if (typeof SNM.bindRouter === "function") SNM.bindRouter();
    if (typeof SNM.bindCascade === "function") SNM.bindCascade();
    if (typeof SNM.bindAuth === "function") SNM.bindAuth();
    if (typeof SNM.bindSetup === "function") SNM.bindSetup();
    if (typeof SNM.bindHome === "function") SNM.bindHome();
    if (typeof SNM.bindSearch === "function") SNM.bindSearch();
    if (typeof SNM.bindNews === "function") SNM.bindNews();
    if (typeof SNM.bindShop === "function") SNM.bindShop();
    if (typeof SNM.bindMessages === "function") SNM.bindMessages();
    if (typeof SNM.bindFairlyUsed === "function") SNM.bindFairlyUsed();
    if (typeof SNM.bindLocalServices === "function") SNM.bindLocalServices();
    if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
    if (typeof SNM.bindPlatformRules === "function") SNM.bindPlatformRules();
    if (typeof SNM.bindCalculator === "function") SNM.bindCalculator();
    if (typeof SNM.bindInvoiceStudio === "function") SNM.bindInvoiceStudio();
    if (typeof SNM.bindPremium === "function") SNM.bindPremium();
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(document);

    bindChipsAndChrome();

    if (typeof SNM.startSplash === "function") SNM.startSplash();
    else {
      var splash = $("splash");
      if (splash) splash.classList.add("hidden");
      SNM.showScreen("role-select");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
