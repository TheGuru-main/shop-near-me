/* Shop Near Me — app.js boot */
(function () {
  function boot() {
    if (typeof SNM === "undefined") {
      console.error("SNM missing — load config/api/local first");
      return;
    }

    if (typeof SNM.bindAuth === "function") SNM.bindAuth();
    if (typeof SNM.bindHome === "function") SNM.bindHome();
    if (typeof SNM.bindSearch === "function") SNM.bindSearch();
    if (typeof SNM.bindShop === "function") SNM.bindShop();
    if (typeof SNM.bindMessages === "function") SNM.bindMessages();
    if (typeof SNM.bindFairlyUsed === "function") SNM.bindFairlyUsed();
    if (typeof SNM.bindLocalServices === "function") SNM.bindLocalServices();
    if (typeof SNM.bindPremium === "function") SNM.bindPremium();
    if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
    if (typeof SNM.bindTrust === "function") SNM.bindTrust();

    if (typeof SNM.startSplash === "function") {
      SNM.startSplash();
    } else {
      var splash = document.getElementById("splash");
      var start = function () {
        if (splash) splash.classList.add("hidden");
        if (SNM.getToken && SNM.getToken() && SNM.getUser && SNM.getUser()) {
          if (typeof SNM.onAuthed === "function") SNM.onAuthed();
          else if (typeof SNM.showScreen === "function") SNM.showScreen("home");
        } else if (typeof SNM.showScreen === "function") {
          SNM.showScreen("role-select");
        }
      };
      if (splash) setTimeout(start, 2200);
      else start();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
