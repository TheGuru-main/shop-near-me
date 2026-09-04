(function () {
  function boot() {
    if (typeof SNM === "undefined") {
      console.error("SNM missing");
      return;
    }
    if (typeof SNM.initParticles === "function") SNM.initParticles();
    if (typeof SNM.bindRouter === "function") SNM.bindRouter();
    if (typeof SNM.bindAuth === "function") SNM.bindAuth();
    if (typeof SNM.bindSetup === "function") SNM.bindSetup();
    if (typeof SNM.bindHome === "function") SNM.bindHome();
    if (typeof SNM.bindSearch === "function") SNM.bindSearch();
    if (typeof SNM.bindShop === "function") SNM.bindShop();
    if (typeof SNM.bindMessages === "function") SNM.bindMessages();
    if (typeof SNM.bindFairlyUsed === "function") SNM.bindFairlyUsed();
    if (typeof SNM.bindLocalServices === "function") SNM.bindLocalServices();
    if (typeof SNM.bindDocuments === "function") SNM.bindDocuments();
    if (typeof SNM.bindPlatformRules === "function") SNM.bindPlatformRules();
    if (typeof SNM.bindCalculator === "function") SNM.bindCalculator();
    if (typeof SNM.bindInvoiceStudio === "function") SNM.bindInvoiceStudio();
    if (typeof SNM.bindPremium === "function") SNM.bindPremium();

    var ver = document.getElementById("aboutVersion");
    if (ver) ver.textContent = SNM.APP_VERSION || "1.0.0.1p";

    SNM.startSplash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
