(function () {
  function boot() {
    if (typeof SNM === "undefined") {
      console.error("SNM missing — check script order");
      return;
    }

    if (typeof SNM.initParticles === "function") SNM.initParticles();
    if (typeof SNM.bindRouter === "function") SNM.bindRouter();
    if (typeof SNM.bindCascade === "function") SNM.bindCascade();
    if (typeof SNM.bindAuth === "function") SNM.bindAuth();
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

    if (typeof SNM.startSplash === "function") {
      SNM.startSplash();
    } else {
      document.getElementById("splash")?.classList.add("hidden");
      if (SNM.getToken && SNM.getToken() && SNM.getUser && SNM.getUser()) {
        SNM.showScreen("home");
      } else {
        SNM.showScreen("role-select");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
