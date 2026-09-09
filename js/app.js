(function () {
  function boot() {
    if (typeof SNM === "undefined") {
      console.error("SNM missing");
      return;
    }
    if (typeof SNM.initParticles === "function") SNM.initParticles();
    try {
      if (typeof SNM.bindRouter === "function") SNM.bindRouter();
      if (typeof SNM.bindAuth === "function") SNM.bindAuth();
      if (typeof SNM.bindHome === "function") SNM.bindHome();
      if (typeof SNM.initPresenceForRole === "function") SNM.initPresenceForRole();
      if (typeof SNM.bindSetup === "function") SNM.bindSetup();
      if (typeof SNM.bindFairlyUsed === "function") SNM.bindFairlyUsed();
      if (typeof SNM.bindShell === "function") SNM.bindShell();
      if (typeof SNM.bindSearch === "function") SNM.bindSearch();
      if (typeof SNM.bindShop === "function") SNM.bindShop();
      if (typeof SNM.bindMessages === "function") SNM.bindMessages();
      if (typeof SNM.bindPremium === "function") SNM.bindPremium();
      if (typeof SNM.bindInvoiceStudio === "function") SNM.bindInvoiceStudio();
      if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
      if (typeof SNM.bindTrust === "function") SNM.bindTrust();
    } catch (err) {
      console.error("bind error", err);
      alert("Boot error: " + (err && err.message));
    }

    document
      .querySelectorAll(
        "a.choice-card[data-role], #roleGrid [data-role], button[data-role]"
      )
      .forEach(function (el) {
        el.addEventListener("click", function (ev) {
          var role = el.getAttribute("data-role");
          if (!role) return;
          ev.preventDefault();
          SNM.selectedRole = role;
          try {
            sessionStorage.setItem("snm_reg_role", role);
          } catch (e) {}
          var label = document.getElementById("regRoleLabel");
          if (label) label.textContent = role;
          if (typeof SNM.toggleRoleExtras === "function")
            SNM.toggleRoleExtras(role);
          if (typeof SNM.bindCascade === "function") SNM.bindCascade();
          if (typeof SNM.initRegisterCascade === "function")
            SNM.initRegisterCascade();
          SNM.showScreen("register");
        });
      });

    var splash = document.getElementById("splash");

    function start() {
      if (typeof SNM.hideSplash === "function") SNM.hideSplash();
      else if (splash) {
        splash.classList.remove("active");
        splash.classList.add("hidden");
        splash.style.display = "none";
      }

      if (
        typeof SNM.getToken === "function" &&
        SNM.getToken() &&
        typeof SNM.getUser === "function" &&
        SNM.getUser()
      ) {
        SNM.showScreen("home");
        return;
      }

      var hash = (location.hash || "").replace(/^#/, "");
      if (
        hash &&
        hash !== "splash" &&
        hash !== "home" &&
        document.getElementById(hash)
      ) {
        SNM.showScreen(hash);
      } else {
        SNM.showScreen("role-select");
      }
    }

    if (splash && splash.classList.contains("active")) setTimeout(start, 2000);
    else start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  if (typeof SNM.renderTabbar === "function") SNM.renderTabbar("home");
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  });
}


SNM._deferredPrompt = null;

window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  SNM._deferredPrompt = e;
  var btn = document.getElementById("btnInstallApp");
  if (btn) btn.classList.remove("hidden");
});

window.addEventListener("appinstalled", function () {
  SNM._deferredPrompt = null;
  var btn = document.getElementById("btnInstallApp");
  if (btn) btn.classList.add("hidden");
});

SNM.promptInstall = function () {
  var btn = document.getElementById("btnInstallApp");
  if (SNM._deferredPrompt) {
    SNM._deferredPrompt.prompt();
    SNM._deferredPrompt.userChoice.then(function () {
      SNM._deferredPrompt = null;
      if (btn) btn.classList.add("hidden");
    });
    return;
  }
  /* Fallback instructions */
  var ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    alert("On iPhone: tap Share → Add to Home Screen");
  } else {
    alert("In Chrome: tap the ⋮ menu (top right) → Install app / Add to Home screen");
  }
};

document.addEventListener("click", function (e) {
  var t = e.target.closest("#btnInstallApp");
  if (t) {
    e.preventDefault();
    SNM.promptInstall();
  }
});
