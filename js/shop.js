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
  }
};

SNM.addShopItem = async function () {
  var nameEl = document.getElementById("shop-item-name") || document.getElementById("prod-name");
  var priceEl = document.getElementById("shop-item-price") || document.getElementById("prod-price");
  var qtyEl = document.getElementById("shop-item-qty") || document.getElementById("prod-qty");
  var curEl = document.getElementById("shop-item-currency") || document.getElementById("prod-currency");
  var perEl = document.getElementById("shop-item-perishable");

  var name = ((nameEl && nameEl.value) || "").trim();
  var priceRaw = ((priceEl && priceEl.value) || "").trim();
  var qtyRaw = ((qtyEl && qtyEl.value) || "").trim();
  var currency = ((curEl && curEl.value) || "NGN").trim() || "NGN";
  var perishable = !!(perEl && perEl.checked);

  if (!name) {
    alert("Enter item / service name.");
    return;
  }
  if (!priceRaw) {
    alert("Enter price amount (currency selected separately).");
    return;
  }

  var body = {
    name: name,
    price: parseFloat(priceRaw) || 0,
    qty: qtyRaw,
    quantity: qtyRaw,
    currency: currency,
    perishable: perishable,
    available: true
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

SNM.setPresence = async function (flags) {
  flags = flags || {};
  try {
    await SNM.api("/presence", {
      method: "POST",
      body: {
        active: flags.active,
        available: flags.available,
        heartbeat: flags.heartbeat,
        shop_open: flags.shop_open
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
  var addBtn =
    document.getElementById("btnShopAdd") ||
    document.getElementById("btnAddProduct") ||
    document.getElementById("btnCatalogueAdd");
  if (addBtn) {
    addBtn.onclick = function () {
      SNM.addShopItem();
    };
  }

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
