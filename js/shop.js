window.SNM = window.SNM || {};

SNM._shopItems = [];

SNM.showShopPanels = function () {
  var user = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role =
    (user && user.role) ||
    (typeof SNM.getRole === "function" && SNM.getRole()) ||
    "buyer";
  role = String(role).toLowerCase().trim();

  var panels = {
    merchant: document.getElementById("shop-merchant"),
    service: document.getElementById("shop-service"),
    driver: document.getElementById("shop-driver"),
    emergency: document.getElementById("shop-emergency"),
    buyer: document.getElementById("shop-buyer")
  };

  Object.keys(panels).forEach(function (k) {
    if (panels[k]) panels[k].classList.add("hidden");
  });

  if (role === "merchant" && panels.merchant) {
    panels.merchant.classList.remove("hidden");
  } else if (role === "service" && panels.service) {
    panels.service.classList.remove("hidden");
  } else if (role === "driver" && panels.driver) {
    panels.driver.classList.remove("hidden");
  } else if (role === "emergency" && panels.emergency) {
    panels.emergency.classList.remove("hidden");
  } else if (panels.buyer) {
    panels.buyer.classList.remove("hidden");
  }
};

SNM.renderShopList = function (items) {
  items = items || [];
  SNM._shopItems = items;

  items = items.slice().sort(function (a, b) {
    var ta = new Date(a.created_at || a.addedAt || 0).getTime();
    var tb = new Date(b.created_at || b.addedAt || 0).getTime();
    return tb - ta;
  });

  function paint(el) {
    if (!el) return;
    if (!items.length) {
      el.innerHTML =
        "<p class='muted'>No catalogue items yet. Add one above.</p>";
      return;
    }
    if (typeof SNM.cardHtml === "function") {
      el.innerHTML = items
        .map(function (it) {
          return SNM.cardHtml(
            typeof SNM.normalizeListing === "function"
              ? SNM.normalizeListing(it)
              : it
          );
        })
        .join("");
      if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
    } else {
      el.innerHTML = items
        .map(function (it) {
          return (
            '<article class="card"><strong>' +
            SNM.esc(it.name || it.title || "Item") +
            "</strong><p class='muted small'>" +
            SNM.esc(String(it.price != null ? it.price : "")) +
            (it.currency ? " · " + SNM.esc(it.currency) : "") +
            "</p></article>"
          );
        })
        .join("");
    }
  }

  paint(document.getElementById("shopList") || document.getElementById("catalogueList"));
  paint(document.getElementById("svcList"));
};

SNM.loadShop = async function () {
  SNM.showShopPanels();
  var el =
    document.getElementById("shopList") ||
    document.getElementById("catalogueList");
  var svcList = document.getElementById("svcList");
  if (el) el.innerHTML = "<p class='muted'>Loading catalogue…</p>";
  if (svcList) svcList.innerHTML = "<p class='muted'>Loading…</p>";

  try {
    /* Correct path: GET /products/me */
    var data = await SNM.api("/products/me");
    var items =
      (data && (data.items || data.products || data.results)) ||
      (Array.isArray(data) ? data : []);
    SNM.renderShopList(items);
  } catch (e) {
    if (el) {
      el.innerHTML =
        "<p class='muted'>Catalogue unavailable: " +
        SNM.esc((e && e.message) || "error") +
        "</p>";
    }
    if (svcList) {
      svcList.innerHTML =
        "<p class='muted'>" + SNM.esc((e && e.message) || "error") + "</p>";
    }
  }
};

SNM.addShopItem = async function () {
  var nameEl = document.getElementById("shop-name");
  var priceEl = document.getElementById("shop-price");
  var qtyEl = document.getElementById("shop-qty");
  var curEl = document.getElementById("shop-currency");
  var perEl = document.getElementById("shop-perishable");
  var availEl = document.getElementById("shop-available");

  var name = ((nameEl && nameEl.value) || "").trim();
  var priceRaw = ((priceEl && priceEl.value) || "").trim();
  if (!name) return alert("Enter item name.");
  if (!priceRaw) return alert("Enter price.");

  var g = SNM.posterGeo();
var desc = SNM.geoStamp(""); /* or existing description field */

var body = {
  name: name,
  price: parseFloat(priceRaw) || 0,
  quantity: qtyEl && qtyEl.value ? parseFloat(qtyEl.value) || null : null,
  currency: ((curEl && curEl.value) || "NGN").trim(),
  perishable: !!(perEl && perEl.checked),
  available: !availEl || !!availEl.checked,
  business_type: "merchant",
  category: "retail",
  description: desc
};
/* extra fields — ignored if API rejects; stamp still in description */
if (g.lat != null) body.lat = g.lat;
if (g.lng != null) body.lng = g.lng;

  try {
    await SNM.api("/products", { method: "POST", body: body });
    if (nameEl) nameEl.value = "";
    if (priceEl) priceEl.value = "";
    if (qtyEl) qtyEl.value = "";
    await SNM.loadShop();
  } catch (e) {
    alert("Add failed: " + ((e && e.message) || "check API"));
  }
};

SNM.addServiceItem = async function () {
  var name = ((document.getElementById("svc-name") || {}).value || "").trim();
  var rate = ((document.getElementById("svc-rate") || {}).value || "").trim();
  var currency = (
    (document.getElementById("svc-currency") || {}).value || "NGN"
  ).trim();
  var unit = (
    (document.getElementById("svc-rate-unit") || {}).value || "per_night"
  ).trim();
  var type = (
    (document.getElementById("svc-type") || {}).value || "hospitality"
  ).trim();
  var desc = ((document.getElementById("svc-desc") || {}).value || "").trim();
  var qtyRaw = ((document.getElementById("svc-qty") || {}).value || "").trim();
  var mode = (
    (document.getElementById("svc-avail-mode") || {}).value || "flexible"
  ).trim();
  var available = !!((document.getElementById("svc-available") || {}).checked);

  if (!name) return alert("Enter service / room / package name.");
  if (!rate) return alert("Enter rate.");

  var days = [];
  document.querySelectorAll(".svc-day:checked").forEach(function (cb) {
    days.push(cb.value);
  });

  var fromDate = (document.getElementById("svc-from-date") || {}).value || "";
  var toDate = (document.getElementById("svc-to-date") || {}).value || "";
  var fromTime = (document.getElementById("svc-from-time") || {}).value || "";
  var toTime = (document.getElementById("svc-to-time") || {}).value || "";

  var description = desc;
  description +=
    (description ? "\n" : "") +
    "[availability:" +
    mode +
    "] [rate_unit:" +
    unit +
    "]";
  if (mode === "scheduled") {
    description +=
      " [from:" +
      fromDate +
      " " +
      fromTime +
      "] [to:" +
      toDate +
      " " +
      toTime +
      "] [days:" +
      days.join(",") +
      "]";
  }

  var body = {
    name: name,
    price: parseFloat(rate) || 0,
    currency: currency,
    quantity: qtyRaw ? parseFloat(qtyRaw) || null : null,
    available: available,
    perishable: false,
    business_type: "service",
    category: type,
    description: description
  };

  try {
    await SNM.api("/products", { method: "POST", body: body });
    ["svc-name", "svc-rate", "svc-desc", "svc-qty"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    await SNM.loadShop();
  } catch (e) {
    alert("Add service failed: " + ((e && e.message) || "check API"));
  }
};

SNM.setPresence = async function (flags) {
  flags = flags || {};
  try {
    await SNM.api("/presence", {
      method: "POST",
      body: {
        active: !!flags.active,
        available: !!flags.available,
        heartbeat: !!flags.heartbeat,
        shop_open: !!flags.shop_open
      }
    });
    return true;
  } catch (e) {
    try {
      await SNM.api("/presence/update", { method: "POST", body: flags });
      return true;
    } catch (e2) {
      alert("Status update failed: " + ((e2 && e2.message) || ""));
      return false;
    }
  }
};

SNM.bindShop = function () {
  if (SNM._shopBound) return;
  SNM._shopBound = true;

  var addBtn = document.getElementById("btnShopAdd");
  if (addBtn) {
    addBtn.onclick = function () {
      SNM.addShopItem();
    };
  }


var g = SNM.posterGeo();
var desc = SNM.geoStamp(""); 

var body = {
  name: name,
  price: parseFloat(priceRaw) || 0,
  quantity: qtyEl && qtyEl.value ? parseFloat(qtyEl.value) || null : null,
  currency: ((curEl && curEl.value) || "NGN").trim(),
  perishable: !!(perEl && perEl.checked),
  available: !availEl || !!availEl.checked,
  business_type: "merchant",
  category: "retail",
  description: desc
};
/* extra fields — ignored if API rejects; stamp still in description */
if (g.lat != null) body.lat = g.lat;
if (g.lng != null) body.lng = g.lng;

  var svcBtn = document.getElementById("btnSvcAdd");
  if (svcBtn) {
    svcBtn.onclick = function () {
      SNM.addServiceItem();
    };
  }

  var shopOpen = document.getElementById("shop-open");
  if (shopOpen) {
    shopOpen.onchange = function () {
      SNM.setPresence({
        shop_open: !!shopOpen.checked,
        heartbeat: !!shopOpen.checked
      });
    };
  }

  var svcOpen = document.getElementById("svc-open");
  if (svcOpen) {
    svcOpen.onchange = function () {
      SNM.setPresence({
        shop_open: !!svcOpen.checked,
        heartbeat: !!svcOpen.checked,
        active: !!svcOpen.checked
      });
    };
  }

  var drvSave = document.getElementById("btnDrvSave");
  if (drvSave) {
    drvSave.onclick = function () {
      var active = !!((document.getElementById("drv-active") || {}).checked);
      SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active
      });
    };
  }

  var emgSave = document.getElementById("btnEmgSave");
  if (emgSave) {
    emgSave.onclick = function () {
      var active = !!((document.getElementById("emg-active") || {}).checked);
<<<<<<< HEAD
      SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active
      });
=======
      SNM.setPresence({ active: active, heartbeat: active, available: active });
    };
  }
};


  var hb =
    document.getElementById("toggleHeartbeat") ||
    document.getElementById("shop-heartbeat");
  if (hb) {
    hb.onchange = function () {
      SNM.setPresence({ heartbeat: !!hb.checked, active: !!hb.checked });
    };
  }

var description = SNM.geoStamp(desc + (description extras you already add));
kl
body.description = description;
var g = SNM.posterGeo();
if (g.lat != null) body.lat = g.lat;
if (g.lng != null) body.lng = g.lng;

  var act =
    document.getElementById("toggleActive") ||
    document.getElementById("shop-active");
  if (act) {
    act.onchange = function () {
      SNM.setPresence({ active: !!act.checked });
    };
  }

  var av =
    document.getElementById("toggleAvailable") ||
    document.getElementById("shop-available");
  if (av) {
    av.onchange = function () {
      SNM.setPresence({ available: !!av.checked });
    };
  }

  var open =
    document.getElementById("toggleShopOpen") ||
    document.getElementById("shop-open");
  if (open) {
    open.onchange = function () {
      SNM.setPresence({ shop_open: !!open.checked, heartbeat: !!open.checked });
>>>>>>> a2cb266 (Ship: geo stamp on posts, presence heartbeat, messages fix, PWA icons/SW)
    };
  }
};

SNM.setPresence = async function (flags) {
  flags = flags || {};
  var body = {
    active: !!flags.active,
    available: !!flags.available,
    heartbeat: !!flags.heartbeat,
    shop_open: !!flags.shop_open,
    live: !!(flags.active || flags.heartbeat || flags.shop_open)
  };
  try {
    await SNM.api("/presence/heartbeat", { method: "POST", body: body });
    return true;
  } catch (e1) {
    try {
      await SNM.api("/presence/live", { method: "POST", body: body });
      return true;
    } catch (e2) {
      alert("Status update failed: " + ((e2 && e2.message) || e1.message || ""));
      return false;
    }
  }
};

SNM.onShopEnter = function () {
  SNM.loadShop();
};

<<<<<<< HEAD
/* Also reload when router opens shop */
SNM.loadMyProducts = SNM.loadShop;
=======
>>>>>>> a2cb266 (Ship: geo stamp on posts, presence heartbeat, messages fix, PWA icons/SW)
