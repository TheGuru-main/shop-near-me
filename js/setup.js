window.SNM = window.SNM || {};

SNM.BUYER_PREF_CATS = SNM.BUYER_PREF_CATS || [
  "Food",
  "Groceries",
  "Fashion",
  "Electronics",
  "Pharmacy",
  "Services",
  "Hospitality",
  "Logistics"
];

SNM.BUYER_PREF_ITEMS = SNM.BUYER_PREF_ITEMS || [
  "Rice",
  "Beans",
  "Oil",
  "Bread",
  "Phone",
  "Hair",
  "Hotel",
  "Ride",
  "Water",
  "Gas"
];

SNM.saveSetupData = function (data) {
  try {
    localStorage.setItem("snm_setup_data", JSON.stringify(data || {}));
  } catch (e) {}
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  u.setup = data || {};
  if (data && data.prefs) u.prefs = data.prefs;
  if (typeof SNM.setUser === "function") SNM.setUser(u);
  else {
    try {
      localStorage.setItem("snm_user", JSON.stringify(u));
    } catch (e2) {}
  }
};

SNM.markSetupDone = function () {
  if (typeof SNM.setSetupDone === "function") SNM.setSetupDone(true);
  else {
    try {
      localStorage.setItem("snm_setup_done", "1");
    } catch (e) {}
  }
};

SNM.collectSetupPayload = function () {
  var role = (
    ((typeof SNM.getUser === "function" && SNM.getUser()) || {}).role ||
    (typeof SNM.getRole === "function" && SNM.getRole()) ||
    "buyer"
  )
    .toString()
    .toLowerCase();

  var extra = { role: role };

  if (role === "buyer") {
    var prefs = [];
    document.querySelectorAll("#buyerPrefs .chip.active").forEach(function (c) {
      prefs.push(c.textContent);
    });
    extra.prefs = prefs;
  } else if (role === "merchant") {
    extra.shop_name =
      (document.getElementById("setup-biz-name") || {}).value || "";
    extra.category =
      (document.getElementById("setup-biz-category") || {}).value || "";
    extra.walkin = !!(document.getElementById("setup-walkin") || {}).checked;
    extra.pod = !!(document.getElementById("setup-pod") || {}).checked;
    extra.delivery = !!(document.getElementById("setup-delivery") || {})
      .checked;
    extra.hours = (document.getElementById("setup-hours") || {}).value || "";
  } else if (role === "service") {
    extra.service_type =
      (document.getElementById("setup-service-type") || {}).value || "";
    extra.home_service = !!(
      document.getElementById("setup-home-service") || {}
    ).checked;
    extra.hours =
      (document.getElementById("setup-service-hours") || {}).value || "";
  } else if (role === "driver" || role === "logistics") {
    extra.coverage =
      (document.getElementById("setup-driver-coverage") || {}).value || "";
    extra.active = !!(document.getElementById("setup-driver-active") || {})
      .checked;
  } else if (role === "emergency") {
    extra.emerg_type =
      (document.getElementById("setup-emerg-type") || {}).value || "";
    extra.contact =
      (document.getElementById("setup-emerg-contact") || {}).value || "";
    extra.active = !!(document.getElementById("setup-emerg-active") || {})
      .checked;
  }

  return extra;
};

SNM.finishSetup = function () {
  try {
    var data = SNM.collectSetupPayload();
    SNM.saveSetupData(data);
  } catch (e) {
    console.error("setup save", e);
  }

  if (typeof SNM.setSetupDone === "function") SNM.setSetupDone(true);
  else if (typeof SNM.markSetupDone === "function") SNM.markSetupDone();

  // Navigate immediately — several fallbacks
  try {
    if (typeof SNM.showScreen === "function") SNM.showScreen("home");
  } catch (e2) {
    console.error(e2);
  }
  try {
    location.hash = "#home";
  } catch (e3) {}

  // Presence in background only
  try {
    var data2 = null;
    try {
      data2 = JSON.parse(localStorage.getItem("snm_setup_data") || "null");
    } catch (e4) {}
    if (data2 && data2.active && typeof SNM.setPresence === "function") {
      var p = SNM.setPresence({
        active: true,
        heartbeat: true,
        live: true
      });
      if (p && typeof p.then === "function") p.catch(function () {});
    }
  } catch (e5) {}
};

SNM.wireSetupDoneButton = function () {
  var btn = document.getElementById("btnSetupDone");
  if (!btn) return;
  btn.onclick = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    SNM.finishSetup();
  };
};

SNM.initSetupScreens = function () {
  SNM.renderBuyerPrefs();
  SNM.wireSetupDoneButton();
};

SNM.bindSetup = function () {
  SNM.initSetupScreens();
};


SNM.renderBuyerPrefs = function () {
  var box = document.getElementById("buyerPrefs");
  if (!box || box.dataset.ready === "1") return;
  box.dataset.ready = "1";
  box.innerHTML = "";

  function addChip(label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.onclick = function () {
      b.classList.toggle("active");
    };
    box.appendChild(b);
  }

  (SNM.BUYER_PREF_CATS || []).forEach(addChip);
  (SNM.BUYER_PREF_ITEMS || []).forEach(addChip);
};

SNM.initSetupScreens = function () {
  SNM.renderBuyerPrefs();

  var btn = document.getElementById("btnSetupDone");
  if (btn && !btn._snmSetupWired) {
    btn._snmSetupWired = true;
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.finishSetup();
    };
  }
};

SNM.bindSetup = function () {
  SNM.initSetupScreens();
};

/* auth.js may call showSetupForRole — keep panels in sync */
SNM.showSetupForRole =
  SNM.showSetupForRole ||
  function (role) {
    role = String(role || "buyer").toLowerCase();
    var label = document.getElementById("setupRoleLabel");
    if (label) label.textContent = role;
    ["buyer", "merchant", "service", "driver", "emergency"].forEach(function (
      r
    ) {
      var panel = document.getElementById("setup-" + r);
      if (panel) panel.classList.toggle("hidden", r !== role);
    });
    if (role === "logistics") {
      var d = document.getElementById("setup-driver");
      if (d) d.classList.remove("hidden");
    }
    SNM.renderBuyerPrefs();
  };
