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
  if (data && data.role) u.role = data.role;
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
    .toLowerCase()
    .trim();
  if (role === "logistics") role = "driver";

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
  } else if (role === "driver") {
    extra.coverage =
      (document.getElementById("setup-driver-coverage") || {}).value || "";
    extra.primary_location =
      (document.getElementById("setup-driver-primary") || {}).value || "";
    extra.use_gps = !!(document.getElementById("setup-driver-use-gps") || {})
      .checked;
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

/** Always paint home — do not rely on showScreen alone */
SNM.goHomeNow = function () {
  try {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
      s.style.display = "none";
    });

    var home = document.getElementById("home");
    if (home) {
      home.classList.add("active");
      home.style.display = "flex";
    }

    document.body.classList.add("has-nav");

    try {
      history.replaceState(null, "", "#home");
    } catch (e) {
      try {
        location.hash = "#home";
      } catch (e2) {}
    }

    if (typeof SNM.renderTabbar === "function") SNM.renderTabbar("home");
    if (typeof SNM.fillHomeHeader === "function") SNM.fillHomeHeader();

    setTimeout(function () {
      if (typeof SNM.loadFeed === "function") SNM.loadFeed();
      if (typeof SNM.initHomeMap === "function") SNM.initHomeMap();
    }, 50);
  } catch (err) {
    console.error("goHomeNow", err);
    try {
      location.hash = "#home";
      location.reload();
    } catch (e3) {}
  }
};

SNM.finishSetup = function () {
  var data = null;
  try {
    data = SNM.collectSetupPayload();
    SNM.saveSetupData(data);
  } catch (e) {
    console.error("setup save", e);
  }

  SNM.markSetupDone();

  /* Prefer router, then always force home UI */
  try {
    if (typeof SNM.showScreen === "function") SNM.showScreen("home");
  } catch (e2) {}

  SNM.goHomeNow();

  try {
    if (data && data.active && typeof SNM.setPresence === "function") {
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
  if (!btn) {
    console.warn("btnSetupDone missing");
    return;
  }
  btn.type = "button";
  btn.onclick = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    SNM.finishSetup();
  };
};

SNM.renderBuyerPrefs = function () {
  var box = document.getElementById("buyerPrefs");
  if (!box) return;

  box.classList.add("chip-row");
  box.innerHTML = "";
  box.dataset.ready = "1";

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

SNM.showSetupForRole = function (role) {
  role = String(role || "buyer").toLowerCase().trim();
  if (role === "logistics") role = "driver";

  var label = document.getElementById("setupRoleLabel");
  if (label) label.textContent = role;

  ["buyer", "merchant", "service", "driver", "emergency"].forEach(function (r) {
    var panel = document.getElementById("setup-" + r);
    if (panel) {
      if (r === role) {
        panel.classList.remove("hidden");
        panel.style.display = "";
      } else {
        panel.classList.add("hidden");
      }
    }
  });

  if (role === "buyer") SNM.renderBuyerPrefs();
  SNM.wireSetupDoneButton();
};

SNM.initSetupScreens = function () {
  SNM.wireSetupDoneButton();
};

SNM.bindSetup = function () {
  SNM.initSetupScreens();
};