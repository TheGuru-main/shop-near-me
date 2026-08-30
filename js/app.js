(function () {
  function boot() {
    try {
      if (typeof SNM === "undefined") {
        console.error("SNM missing");
        return;
      }
      if (typeof SNM.bindAuth === "function") SNM.bindAuth();
      if (typeof SNM.bindHome === "function") SNM.bindHome();
      if (typeof SNM.bindSearch === "function") SNM.bindSearch();
      if (typeof SNM.bindShop === "function") SNM.bindShop();
      if (typeof SNM.bindMessages === "function") SNM.bindMessages();
      if (typeof SNM.bindPremium === "function") SNM.bindPremium();
      if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
      if (typeof SNM.bindTrust === "function") SNM.bindTrust();
    } catch (err) {
      console.error("bind error", err);
    }

    var splash = document.getElementById("splash");
    function start() {
      if (splash) {
        splash.classList.remove("active");
        splash.classList.add("hidden");
      }
      try {
        if (SNM.getToken && SNM.getToken() && SNM.getUser && SNM.getUser()) {
          if (typeof SNM.onAuthed === "function") SNM.onAuthed();
          else SNM.showScreen("home");
          document.body.classList.add("has-nav");
        } else {
          SNM.showScreen("role-select");
          document.body.classList.remove("has-nav");
        }
      } catch (e) {
        console.error(e);
        var rs = document.getElementById("role-select");
        if (splash) splash.classList.add("hidden");
        if (rs) {
          document.querySelectorAll(".screen").forEach(function (s) {
            s.classList.remove("active");
          });
          rs.classList.add("active");
        }
      }
    }
    if (splash) setTimeout(start, 1800);
    else start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();