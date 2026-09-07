window.SNM = window.SNM || {};

SNM._shopItems = [];

SNM.showShopPanels = function () {
  var user = SNM.getUser() || {};
  var role = user.role || "buyer";
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
  if (role === "merchant" && panels.merchant) panels.merchant.classList.remove("hidden");
  else if (role === "service" && panels.service) panels.service.classList.remove("hidden");
  else if (role === "driver" && panels.driver) panels.driver.classList.remove("hidden");
  else if (role === "emergency" && panels.emergency) panels.emergency.classList.remove("hidden");
  else if (panels.buyer) panels.buyer.classList.remove("hidden");
};

SNM.renderShopList = function (items) {
  var el = document.getElementById("shopList") || document.getElementById("catalogueList");
  if (!el) return;
  items = items || [];
  SNM._shopItems = items;
  if (!items.length) {
    el.innerHTML = "<p class='muted'>No catalogue items yet. Add one above.</p>";
    return;
  }
  /* latest first */
  items = items.slice().sort(function (a, b) {
    var ta = new Date(a.created_at || a.addedAt || 0).getTime();
    var tb = new Date(b.created_at || b.addedAt || 0).getTime();
    return tb - ta;
  });
  if (typeof SNM.cardHtml === "function") {
    el.innerHTML = items.map(function (it) {
      return SNM.cardHtml(SNM.normalizeListing(it));
    }).join("");
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
  } else {
    el.innerHTML = items
      .map(function (it) {
        return (
          '<article class="card">' +
          "<strong>" + SNM.esc(it.name || it.title || "Item") + "</strong>" +
          "<p class='muted small'>" +
          SNM.esc(String(it.price != null ? it.price : "")) +
          " · qty " + SNM.esc(String(it.qty != null ? it.qty : it.quantity || "")) +
          (it.currency ? " · " + SNM.esc(it.currency) : "") +
          "</p></article>"
        );
      })
      .join("");
  }
};

SNM.loadShop = async function () {
  SNM.showShopPanels();
  var el = document.getElementById("shopList") || document.getElementById("catalogueList");
  if (el) el.innerHTML = "<p class='muted'>Loading catalogue…</p>";
  try {
    var data = await SNM.api("/products/mine" + (SNM.qs ? SNM.qs({}) : ""));
    var items =
      (data && (data.items || data.products || data.results)) ||
      (Array.isArray(data) ? data : []);
    SNM.renderShopList(items);
  } catch (e) {
    try {
      var data2 = await SNM.api("/products" + (SNM.qs ? SNM.qs({ mine: true }) : "?mine=true"));
      var items2 =
        (data2 && (data2.items || data2.products || data2.results)) ||
        (Array.isArray(data2) ? data2 : []);
      SNM.renderShopList(items2);
    } catch (e2) {
      if (el) {
        el.innerHTML =
          "<p class='muted'>Catalogue unavailable: " +
          SNM.esc((e2 && e2.message) || "error") +
         "</p>";
      }
    }

var svcList = document.getElementById("svcList");
var mainList = document.getElementById("shopList");
if (svcList && mainList) svcList.innerHTML = mainList.innerHTML;

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

  var body = {
    name: name,
    price: parseFloat(priceRaw) || 0,
    quantity: qtyEl && qtyEl.value ? parseFloat(qtyEl.value) || null : null,
    currency: ((curEl && curEl.value) || "NGN").trim(),
    perishable: !!(perEl && perEl.checked),
    available: !availEl || !!availEl.checked,
    business_type: "merchant",
    category: "retail"
  };

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
  var currency = ((document.getElementById("svc-currency") || {}).value || "NGN").trim();
  var unit = ((document.getElementById("svc-rate-unit") || {}).value || "per_night").trim();
  var type = ((document.getElementById("svc-type") || {}).value || "hospitality").trim();
  var desc = ((document.getElementById("svc-desc") || {}).value || "").trim();
  var qtyRaw = ((document.getElementById("svc-qty") || {}).value || "").trim();
  var mode = ((document.getElementById("svc-avail-mode") || {}).value || "flexible").trim();
  var available = !!((document.getElementById("svc-available") || {}).checked);

  if (!name) return alert("Enter service / room / package name.");
  if (!rate) return alert("Enter rate.");

  var days = [];
  document.querySelectorAll(".svc-day:checked").forEach(function (cb) {
    days.push(cb.value);
  });

  var schedule = {
    mode: mode,
    rate_unit: unit,
    from_date: ((document.getElementById("svc-from-date") || {}).value || "") || null,
    to_date: ((document.getElementById("svc-to-date") || {}).value || "") || null,
    from_time: ((document.getElementById("svc-from-time") || {}).value || "") || null,
    to_time: ((document.getElementById("svc-to-time") || {}).value || "") || null,
    days: days
  };

  /* Encode schedule into description so backend ProductCreate accepts it */
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
      (schedule.from_date || "") +
      " " +
      (schedule.from_time || "") +
      "] [to:" +
      (schedule.to_date || "") +
      " " +
      (schedule.to_time || "") +
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
    var list = document.getElementById("svcList");
    if (list && typeof SNM.renderShopList === "function") {
      /* loadShop fills shopList — also mirror into svcList */
      var el = document.getElementById("shopList");
      if (el && list) list.innerHTML = el.innerHTML;
    }
  } catch (e) {
    alert("Add service failed: " + ((e && e.message) || "check API"));
  }
};

SNM.bindShop = function () {
  var addBtn = document.getElementById("btnShopAdd");
  if (addBtn && !addBtn._snmWired) {
    addBtn._snmWired = true;
    addBtn.onclick = function () {
      SNM.addShopItem();
    };
  }

  var svcBtn = document.getElementById("btnSvcAdd");
  if (svcBtn && !svcBtn._snmWired) {
    svcBtn._snmWired = true;
    svcBtn.onclick = function () {
      SNM.addServiceItem();
    };
  }

  var svcOpen = document.getElementById("svc-open");
  if (svcOpen && !svcOpen._snmWired) {
    svcOpen._snmWired = true;
    svcOpen.onchange = function () {
      SNM.setPresence({
        shop_open: !!svcOpen.checked,
        heartbeat: !!svcOpen.checked,
        active: !!svcOpen.checked
      });
    };
  }

  var shopOpen = document.getElementById("shop-open");
  if (shopOpen && !shopOpen._snmWired) {
    shopOpen._snmWired = true;
    shopOpen.onchange = function () {
      SNM.setPresence({
        shop_open: !!shopOpen.checked,
        heartbeat: !!shopOpen.checked
      });
    };
  }

  var drvSave = document.getElementById("btnDrvSave");
  if (drvSave && !drvSave._snmWired) {
    drvSave._snmWired = true;
    drvSave.onclick = function () {
      var active = !!((document.getElementById("drv-active") || {}).checked);
      SNM.setPresence({ active: active, heartbeat: active, available: active });
    };
  }

  var emgSave = document.getElementById("btnEmgSave");
  if (emgSave && !emgSave._snmWired) {
    emgSave._snmWired = true;
    emgSave.onclick = function () {
      var active = !!((document.getElementById("emg-active") || {}).checked);
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
    };
  }
};

SNM.onShopEnter = function () {
  SNM.loadShop();
};
