window.SNM = window.SNM || {};

SNM.esc =
  SNM.esc ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM.bootRoles = function () {
  var grid = document.getElementById("roleGrid");
  if (!grid) return;
  var roles =
    SNM.ROLES ||
    [
      { id: "buyer", label: "Buyer", icon: "🛒" },
      { id: "merchant", label: "Merchant", icon: "🏪" },
      { id: "service", label: "Service", icon: "🔧" },
      { id: "driver", label: "Driver", icon: "🛵" },
      { id: "emergency", label: "Emergency", icon: "🚨" }
    ];
  grid.innerHTML = roles
    .map(function (r) {
      return (
        '<button type="button" class="role-btn" data-role="' +
        r.id +
        '"><span class="role-ico">' +
        (r.icon || "") +
        "</span><span>" +
        r.label +
        "</span></button>"
      );
    })
    .join("");
};

SNM.bindShell = function () {
  var about = document.getElementById("btnAboutFromRole");
  if (about) {
    about.onclick = function () {
      SNM.showScreen("about");
    };
  }
  var goLogin = document.getElementById("btnGoLogin");
  if (goLogin) {
    goLogin.onclick = function () {
      SNM.showScreen("login");
    };
  }
  var searchTop = document.getElementById("btnSearchTop");
  if (searchTop) {
    searchTop.onclick = function () {
      SNM.showScreen("search");
    };
  }
  var fab = document.getElementById("btnFab");
  if (fab) {
    fab.onclick = function () {
      SNM.showScreen("banqueue");
      if (typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
    };
  }
  var fuChip = document.getElementById("btnFairlyUsed");
  if (fuChip) {
    fuChip.onclick = function () {
      SNM.showScreen("fairly-used");
    };
  }
};

SNM.onAuthed = function () {
  var user = typeof SNM.getUser === "function" ? SNM.getUser() : null;
  if (!user) {
    SNM.showScreen("role-select");
    return;
  }
  try {
    document.body.className = document.body.className
      .split(/\s+/)
      .filter(function (c) {
        return c && c.indexOf("role-") !== 0;
      })
      .join(" ");
    document.body.classList.add("role-" + (user.role || "buyer"));
  } catch (e) {}

  var setupDone = false;
  try {
    setupDone = localStorage.getItem("snm_setup_done") === "1";
  } catch (e) {}
  if (!setupDone && typeof SNM.showSetupForRole === "function") {
    SNM.showSetupForRole(user.role || "buyer");
    SNM.showScreen("setup");
    return;
  }
  SNM.showScreen("home");
};

function boot() {
  if (typeof SNM === "undefined") {
    console.error("SNM missing");
    return;
  }

  if (typeof SNM.initParticles === "function") {
    try {
      SNM.initParticles();
    } catch (e) {}
  }

  SNM.bootRoles();
  if (typeof SNM.bindRouter === "function") SNM.bindRouter();
  SNM.bindShell();

  if (typeof SNM.bindAuth === "function") SNM.bindAuth();
  if (typeof SNM.bindHome === "function") SNM.bindHome();
  if (typeof SNM.bindSearch === "function") SNM.bindSearch();
  if (typeof SNM.bindShop === "function") SNM.bindShop();
  if (typeof SNM.bindMessages === "function") SNM.bindMessages();
  if (typeof SNM.bindCalls === "function") SNM.bindCalls();
  if (typeof SNM.bindFairlyUsed === "function") SNM.bindFairlyUsed();
  if (typeof SNM.bindLocalServices === "function") SNM.bindLocalServices();
  if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
  if (typeof SNM.bindCalculator === "function") SNM.bindCalculator();
  if (typeof SNM.bindInvoiceStudio === "function") SNM.bindInvoiceStudio();
  if (typeof SNM.bindPremium === "function") SNM.bindPremium();
  if (typeof SNM.bindPlatformRules === "function") SNM.bindPlatformRules();
  if (typeof SNM.bindCardActions === "function") {
    try {
      SNM.bindCardActions(document.body);
    } catch (e) {}
  }

  document.body.addEventListener("click", function (e) {
    var roleBtn = e.target.closest("[data-role]");
    if (!roleBtn || !roleBtn.closest("#roleGrid")) return;
    var role = roleBtn.getAttribute("data-role");
    try {
      sessionStorage.setItem("snm_reg_role", role);
    } catch (err) {}
    var label = document.getElementById("regRoleLabel");
    if (label) label.textContent = role;
    if (typeof SNM.initRegisterCascade === "function") SNM.initRegisterCascade();
    SNM.showScreen("register");
  });

  var splash = document.getElementById("splash");
  var start = function () {
    if (splash) splash.classList.add("hidden");
    var token = typeof SNM.getToken === "function" ? SNM.getToken() : null;
    var user = typeof SNM.getUser === "function" ? SNM.getUser() : null;
    if (token && user) SNM.onAuthed();
    else SNM.showScreen("role-select");
  };

  if (splash) setTimeout(start, 2200);
  else start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
