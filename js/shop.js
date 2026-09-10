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
  } else if ((role === "driver" || role === "logistics") && panels.driver) {
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
          var img = it.image_url
            ? '<img class="card-thumb" src="' +
              SNM.esc(it.image_url) +
              '" alt="" />'
            : "";
          return (
            '<article class="card">' +
            img +
            "<strong>" +
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

  paint(
    document.getElementById("shopList") ||
      document.getElementById("catalogueList")
  );
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
    var data = await SNM.api("/products/me");
    var items =
      (data && (data.items || data.products || data.results)) ||
      (Array.isArray(data) ? data : []);

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
    el.innerHTML = items
      .map(function (it) {
        var id = it.id || it.product_id || "";
        var name = it.name || it.title || "";
        var qty = it.quantity != null ? it.quantity : it.qty != null ? it.qty : "";
        var avail = it.available !== false;
        var img = it.image_url
          ? '<img class="card-thumb" src="' +
            SNM.esc(String(it.image_url)) +
            '" alt="" />'
          : "";
        return (
          '<article class="card shop-item-card" data-product-id="' +
          SNM.esc(String(id)) +
          '">' +
          img +
          '<div class="shop-edit-row">' +
          '<input type="text" class="shop-edit-name" value="' +
          SNM.esc(String(name)) +
          '" placeholder="Name" />' +
          "</div>" +
          '<div class="shop-edit-row">' +
          '<input type="number" class="shop-edit-qty" value="' +
          SNM.esc(String(qty)) +
          '" placeholder="Qty" inputmode="decimal" />' +
          '<label class="check-row"><input type="checkbox" class="shop-edit-avail"' +
          (avail ? " checked" : "") +
          " /> In stock</label>" +
          "</div>" +
          '<div class="shop-edit-row">' +
          '<button type="button" class="btn small" data-shop-save="' +
          SNM.esc(String(id)) +
          '">Save</button>' +
          '<span class="muted small shop-edit-status"></span>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    SNM.bindShopListActions(el);
  }

  paint(
    document.getElementById("shopList") ||
      document.getElementById("catalogueList")
  );
  paint(document.getElementById("svcList"));
};

SNM.patchProduct = async function (productId, body) {
  return SNM.api("/products/" + encodeURIComponent(productId), {
    method: "PATCH",
    body: body
  });
};

SNM.bindShopListActions = function (root) {
  if (!root) return;
  root.querySelectorAll("[data-shop-save]").forEach(function (btn) {
    if (btn._snmSaveWired) return;
    btn._snmSaveWired = true;
    btn.onclick = async function () {
      var id = btn.getAttribute("data-shop-save");
      var card = btn.closest(".shop-item-card");
      if (!id || !card) return;
      var nameEl = card.querySelector(".shop-edit-name");
      var qtyEl = card.querySelector(".shop-edit-qty");
      var availEl = card.querySelector(".shop-edit-avail");
      var status = card.querySelector(".shop-edit-status");
      var name = nameEl ? (nameEl.value || "").trim() : "";
      var qtyRaw = qtyEl ? (qtyEl.value || "").trim() : "";
      var quantity =
        qtyRaw === "" ? null : parseFloat(qtyRaw);
      if (quantity != null && isNaN(quantity)) quantity = null;
      var available = !!(availEl && availEl.checked);
      if (!name) {
        alert("Name required");
        return;
      }
      btn.disabled = true;
      if (status) status.textContent = "Saving…";
      try {
        await SNM.patchProduct(id, {
          name: name,
          quantity: quantity,
          available: available
        });
        if (status) status.textContent = "Saved";
        await SNM.loadShop();
      } catch (e) {
        if (status) status.textContent = "Failed";
        alert("Update failed: " + ((e && e.message) || ""));
      }
      btn.disabled = false;
    };
  });
};

SNM.loadMyProducts = SNM.loadShop;

/** Camera or gallery → data URL for this item */
SNM.readItemImage = function (inputId, maxBytes) {
  maxBytes = maxBytes || 900000;
  return new Promise(function (resolve) {
    var el = document.getElementById(inputId);
    if (!el || !el.files || !el.files[0]) {
      resolve(null);
      return;
    }
    var file = el.files[0];
    if (file.size > maxBytes) {
      alert("Photo too large. Use under \~900KB.");
      resolve(null);
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      resolve(r.result || null);
    };
    r.onerror = function () {
      resolve(null);
    };
    r.readAsDataURL(file);
  });
};

SNM.readItemImageFrom = async function (camId, fileId, maxBytes) {
  maxBytes = maxBytes || 900000;
  var cam = document.getElementById(camId);
  var file = document.getElementById(fileId);
  var input =
    cam && cam.files && cam.files[0]
      ? cam
      : file && file.files && file.files[0]
        ? file
        : null;
  if (!input || !input.files[0]) return null;
  var f = input.files[0];
  if (f.size > maxBytes) {
    alert("Photo too large. Use under \~900KB.");
    return null;
  }
  return await new Promise(function (resolve) {
    var r = new FileReader();
    r.onload = function () {
      resolve(r.result || null);
    };
    r.onerror = function () {
      resolve(null);
    };
    r.readAsDataURL(f);
  });
};

SNM.wirePhotoButtons = function (camBtnId, fileBtnId, camInputId, fileInputId, previewId) {
  var camBtn = document.getElementById(camBtnId);
  var fileBtn = document.getElementById(fileBtnId);
  var camIn = document.getElementById(camInputId);
  var fileIn = document.getElementById(fileInputId);
  var box = document.getElementById(previewId);

  function previewFrom(input) {
    if (!box) return;
    var f = input.files && input.files[0];
    if (!f) {
      box.innerHTML = "";
      box.classList.add("hidden");
      return;
    }
    var url = URL.createObjectURL(f);
    box.innerHTML = '<img src="' + url + '" alt="Item preview" />';
    box.classList.remove("hidden");
  }

  if (camBtn && camIn) {
    camBtn.onclick = function () {
      if (fileIn) fileIn.value = "";
      camIn.click();
    };
    camIn.onchange = function () {
      previewFrom(camIn);
    };
  }
  if (fileBtn && fileIn) {
    fileBtn.onclick = function () {
      if (camIn) camIn.value = "";
      fileIn.click();
    };
    fileIn.onchange = function () {
      previewFrom(fileIn);
    };
  }
};

SNM.addShopItem = async function () {
  var nameEl = document.getElementById("shop-name");
  var priceEl = document.getElementById("shop-price");
  var curEl = document.getElementById("shop-currency");
  var qtyEl = document.getElementById("shop-qty");
  var perEl = document.getElementById("shop-perishable");
  var availEl = document.getElementById("shop-available");

  var name = ((nameEl && nameEl.value) || "").trim();
  var priceRaw = ((priceEl && priceEl.value) || "").trim();
  if (!name) {
    alert("Item name required.");
    return;
  }

  var image_url = await SNM.readItemImageFrom(
    "shop-item-image-cam",
    "shop-item-image-file"
  );
["shop-item-image-cam", "shop-item-image-file"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });

  var desc = typeof SNM.geoStamp === "function" ? SNM.geoStamp("") : "";
  var g = typeof SNM.posterGeo === "function" ? SNM.posterGeo() : {};

  var body = {
    name: name,
    price: parseFloat(priceRaw) || 0,
    quantity:
      qtyEl && qtyEl.value
        ? parseFloat(String(qtyEl.value).replace(/[^\d.]/g, "")) || null
        : null,
    currency: ((curEl && curEl.value) || "NGN").trim(),
    perishable: !!(perEl && perEl.checked),
    available: !availEl || !!availEl.checked,
    business_type: "merchant",
    category: perEl && perEl.checked ? "food" : "retail",
    description: desc,
    image_url: image_url
  };
  if (g.lat != null) body.lat = g.lat;
  if (g.lng != null) body.lng = g.lng;

  try {
    await SNM.api("/products", { method: "POST", body: body });
    if (nameEl) nameEl.value = "";
    if (priceEl) priceEl.value = "";
    if (qtyEl) qtyEl.value = "";
    var imgIn = document.getElementById("shop-item-image");
    if (imgIn) imgIn.value = "";
    var prev = document.getElementById("shop-item-preview");
    if (prev) {
      prev.innerHTML = "";
      prev.classList.add("hidden");
    }
    await SNM.loadShop();
  } catch (e) {
    alert("Add listing failed: " + ((e && e.message) || "check API"));
  }
};

SNM.addServiceItem = async function () {
  var nameEl = document.getElementById("svc-name");
  var name = ((nameEl && nameEl.value) || "").trim();
  if (!name) {
    alert("Service name required.");
    return;
  }

  var typeEl = document.getElementById("svc-type");
  var descEl = document.getElementById("svc-desc");
  var rateEl = document.getElementById("svc-rate");
  var curEl = document.getElementById("svc-currency");
  var unitEl = document.getElementById("svc-rate-unit");
  var qtyEl = document.getElementById("svc-qty");
  var modeEl = document.getElementById("svc-avail-mode");
  var availEl = document.getElementById("svc-available");

  var desc = ((descEl && descEl.value) || "").trim();
  var mode = ((modeEl && modeEl.value) || "flexible").trim();
  var days = [];
  document.querySelectorAll(".svc-day:checked").forEach(function (c) {
    days.push(c.value);
  });
  var fromD = ((document.getElementById("svc-from-date") || {}).value || "").trim();
  var toD = ((document.getElementById("svc-to-date") || {}).value || "").trim();
  var fromT = ((document.getElementById("svc-from-time") || {}).value || "").trim();
  var toT = ((document.getElementById("svc-to-time") || {}).value || "").trim();

  var scheduleBits = [];
  scheduleBits.push("mode:" + mode);
  if (days.length) scheduleBits.push("days:" + days.join(","));
  if (fromD) scheduleBits.push("from:" + fromD);
  if (toD) scheduleBits.push("to:" + toD);
  if (fromT || toT) scheduleBits.push("time:" + fromT + "-" + toT);
  if (unitEl && unitEl.value) scheduleBits.push("unit:" + unitEl.value);

  var fullDesc = [desc, scheduleBits.join(" | ")].filter(Boolean).join("\n");
  if (typeof SNM.geoStamp === "function") fullDesc = SNM.geoStamp(fullDesc);

  var image_url = await SNM.readItemImage("svc-item-image");
  var g = typeof SNM.posterGeo === "function" ? SNM.posterGeo() : {};

  var body = {
    name: name,
    price: parseFloat(((rateEl && rateEl.value) || "0").trim()) || 0,
    currency: ((curEl && curEl.value) || "NGN").trim(),
    quantity: qtyEl && qtyEl.value ? parseFloat(qtyEl.value) || null : null,
    available: !availEl || !!availEl.checked,
    perishable: false,
    business_type: "service",
    category: ((typeEl && typeEl.value) || "service").trim(),
    description: fullDesc,
    image_url: image_url
  };
  if (g.lat != null) body.lat = g.lat;
  if (g.lng != null) body.lng = g.lng;

  try {
    await SNM.api("/products", { method: "POST", body: body });
    if (nameEl) nameEl.value = "";
    if (descEl) descEl.value = "";
    if (rateEl) rateEl.value = "";
    var imgIn = document.getElementById("svc-item-image");
    if (imgIn) imgIn.value = "";
    var prev = document.getElementById("svc-item-preview");
    if (prev) {
      prev.innerHTML = "";
      prev.classList.add("hidden");
    }
    await SNM.loadShop();
  } catch (e) {
    alert("Add service failed: " + ((e && e.message) || "check API"));
  }
};

SNM.setPresence = async function (flags) {
  flags = flags || {};
  var wantLive = !!(
    flags.live ||
    flags.active ||
    flags.heartbeat ||
    flags.shop_open ||
    flags.available
  );
  try {
    if (typeof SNM.setLive === "function") {
      await SNM.setLive(wantLive);
      if (wantLive && typeof SNM.heartbeat === "function") await SNM.heartbeat();
      if (typeof SNM.startHeartbeatLoop === "function")
        SNM.startHeartbeatLoop(wantLive);
      return true;
    }
    await SNM.api("/presence/live", {
      method: "POST",
      body: { live: wantLive }
    });
    if (wantLive) await SNM.api("/presence/heartbeat", { method: "POST" });
    return true;
  } catch (e) {
    alert("Status update failed: " + ((e && e.message) || "check login"));
    return false;
  }
};

SNM.bindShop = function () {
  if (SNM._shopBound) return;
  SNM._shopBound = true;

  SNM.wirePhotoButtons(
    "btnShopCam",
    "btnShopGallery",
    "shop-item-image-cam",
    "shop-item-image-file",
    "shop-item-preview"
  );
  SNM.wirePhotoButtons(
    "btnSvcCam",
    "btnSvcGallery",
    "svc-item-image-cam",
    "svc-item-image-file",
    "svc-item-preview"
  );

  var addBtn = document.getElementById("btnShopAdd");
  if (addBtn) {
    addBtn.onclick = function () {
      SNM.addShopItem();
    };
  }

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
        heartbeat: !!shopOpen.checked,
        active: !!shopOpen.checked
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

  var drvActive = document.getElementById("drv-active");
  if (drvActive && !drvActive._snmWired) {
    drvActive._snmWired = true;
    drvActive.onchange = function () {
      var on = !!drvActive.checked;
      SNM.setPresence({
        active: on,
        heartbeat: on,
        available: on,
        live: on
      });
    };
  }

  var drvSave = document.getElementById("btnDrvSave");
  if (drvSave && !drvSave._snmWired) {
    drvSave._snmWired = true;
    drvSave.onclick = function () {
      var active = !!((document.getElementById("drv-active") || {}).checked);
      var coverage =
        ((document.getElementById("drv-coverage") || {}).value || "").trim();
      try {
        localStorage.setItem(
          "snm_driver_meta",
          JSON.stringify({ coverage: coverage, active: active })
        );
      } catch (e) {}
      SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active,
        live: active
      });
    };
  }

  var emgSave = document.getElementById("btnEmgSave");
  if (emgSave) {
    emgSave.onclick = function () {
      var active = !!((document.getElementById("emg-active") || {}).checked);
      SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active
      });
    };
  }
};

SNM.onShopEnter = function () {
  SNM.loadShop();
};
