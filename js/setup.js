window.SNM = window.SNM || {};

SNM.initSetupScreens = function () {
  var cats = document.getElementById("buyerPrefCats");
  var items = document.getElementById("buyerPrefItems");
  if (cats && !cats.dataset.ready) {
    cats.dataset.ready = "1";
    (SNM.BUYER_PREF_CATS || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c;
      b.onclick = function () { b.classList.toggle("active"); updateCount(); };
      cats.appendChild(b);
    });
  }
  if (items && !items.dataset.ready) {
    items.dataset.ready = "1";
    (SNM.BUYER_PREF_ITEMS || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c;
      b.onclick = function () { b.classList.toggle("active"); updateCount(); };
      items.appendChild(b);
    });
  }
  function updateCount() {
    var n = document.querySelectorAll("#buyerPrefCats .chip.active, #buyerPrefItems .chip.active").length;
    var el = document.getElementById("buyerPrefCount");
    if (el) el.textContent = n + " selected";
  }

  function finish(data) {
    SNM.saveSetupData(data || {});
    SNM.markSetupDone();
    SNM.go("home");
  }

  var b1 = document.getElementById("btnSetupBuyerDone");
  if (b1) b1.onclick = function () {
    var selected = [];
    document.querySelectorAll("#buyerPrefCats .chip.active, #buyerPrefItems .chip.active").forEach(function (c) {
      selected.push(c.textContent);
    });
    finish({ prefs: selected });
  };

  var b2 = document.getElementById("btnSetupMerchantDone");
  if (b2) b2.onclick = function () {
    finish({
      shop_name: (document.getElementById("m-shop-name") || {}).value,
      category: (document.getElementById("m-category") || {}).value,
      walkin: !!(document.getElementById("m-walkin") || {}).checked,
      pod: !!(document.getElementById("m-pod") || {}).checked,
      delivery: !!(document.getElementById("m-delivery") || {}).checked,
      hours: (document.getElementById("m-hours") || {}).value,
      open_now: !!(document.getElementById("m-open-now") || {}).checked
    });
  };

  var b3 = document.getElementById("btnSetupServiceDone");
  if (b3) b3.onclick = function () {
    finish({
      display: (document.getElementById("s-name") || {}).value,
      type: (document.getElementById("s-type") || {}).value,
      services: (document.getElementById("s-services") || {}).value,
      home: !!(document.getElementById("s-home") || {}).checked,
      hours: (document.getElementById("s-hours") || {}).value,
      available: !!(document.getElementById("s-available") || {}).checked
    });
  };

  var b4 = document.getElementById("btnSetupDriverDone");
  if (b4) b4.onclick = function () {
    finish({
      vehicle: (document.getElementById("d-vehicle") || {}).value,
      coverage: (document.getElementById("d-coverage") || {}).value,
      bulky: !!(document.getElementById("d-bulky") || {}).checked,
      active: !!(document.getElementById("d-active") || {}).checked
    });
  };

  var b5 = document.getElementById("btnSetupEmergencyDone");
  if (b5) b5.onclick = function () {
    finish({
      type: (document.getElementById("e-type") || {}).value,
      contact: (document.getElementById("e-contact") || {}).value,
      visible: !!(document.getElementById("e-visible") || {}).checked
    });
  };
};

SNM.bindSetup = function () {
  SNM.initSetupScreens();
};
