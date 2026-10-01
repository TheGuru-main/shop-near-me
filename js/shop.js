window.SNM = window.SNM || {};

/** Small thumbs for mobile POST */
SNM.compressImageFile = function (file, maxSide, quality) {
  maxSide = maxSide || 160;
  quality = quality || 0.4;
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        var scale = Math.min(1, maxSide / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/** Hard cap \~40KB data URL so POST does not abort */
SNM.readCompressedItemImage = async function (camId, fileId) {
  var cam = document.getElementById(camId);
  var fileIn = document.getElementById(fileId);
  var file =
    (cam && cam.files && cam.files[0]) ||
    (fileIn && fileIn.files && fileIn.files[0]) ||
    null;
  if (!file) return null;

  var dataUrl = await SNM.compressImageFile(file, 160, 0.4);
  if (dataUrl.length > 40000) {
    dataUrl = await SNM.compressImageFile(file, 120, 0.32);
  }
  if (dataUrl.length > 40000) {
    dataUrl = await SNM.compressImageFile(file, 96, 0.28);
  }
  if (dataUrl.length > 40000) {
    throw new Error(
      "Photo too large for upload. Pick a smaller image or post without photo."
    );
  }
  return dataUrl;
};

SNM.esc =
  SNM.esc ||
  SNM.escapeHtml ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM._shopItems = [];

SNM.showShopPanels = function () {
  var user = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role =
    (user && user.role) ||
    (typeof SNM.getRole === "function" && SNM.getRole()) ||
    "buyer";
  role = String(role).toLowerCase().trim();
  if (role === "logistics") role = "driver";

  var panels = {
    merchant: document.getElementById("shop-merchant"),
    service: document.getElementById("shop-service"),
    driver: document.getElementById("shop-driver"),
    emergency: document.getElementById("shop-emergency"),
    buyer: document.getElementById("shop-buyer")
  };

  Object.keys(panels).forEach(function (k) {
    if (panels[k]) {
      panels[k].classList.add("hidden");
      panels[k].style.display = "none";
    }
  });

  var show = null;
  if (role === "merchant") show = panels.merchant;
  else if (role === "service") show = panels.service;
  else if (role === "driver") show = panels.driver;
  else if (role === "emergency") show = panels.emergency;
  else show = panels.buyer;

  if (show) {
    show.classList.remove("hidden");
    show.style.display = "flex";
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
    el.innerHTML = items
      .map(function (it) {
        var id = it.id || it.product_id || "";
        var name = it.name || it.title || "";
        var qty =
          it.quantity != null ? it.quantity : it.qty != null ? it.qty : "";
        var avail = it.available !== false;
        var img = it.image_url || it.media_url || "";
        var thumb = img
          ? '<div class="shop-card-media">' +
            '<img class="card-thumb shop-thumb" src="' +
            SNM.esc(String(img)) +
            '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
            "</div>"
          : "";
        return (
          '<article class="card shop-item-card" data-product-id="' +
          SNM.esc(String(id)) +
          '">' +
          thumb +
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
          '">Save</button> ' +
          '<button type="button" class="btn secondary small" data-shop-del="' +
          SNM.esc(String(id)) +
          '">Delete</button>' +
          '<span class="muted small shop-edit-status"></span>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    if (typeof SNM.bindShopListActions === "function") {
      SNM.bindShopListActions(el);
    }
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

SNM.deleteProduct = async function (productId) {
  return SNM.api("/products/" + encodeURIComponent(productId), {
    method: "DELETE"
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
      var quantity = qtyRaw === "" ? null : parseFloat(qtyRaw);
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

  root.querySelectorAll("[data-shop-del]").forEach(function (btn) {
    if (btn._snmDelWired) return;
    btn._snmDelWired = true;
    btn.onclick = async function () {
      var id = btn.getAttribute("data-shop-del");
      if (!id) return;
      if (!confirm("Delete this listing?")) return;
      try {
        await SNM.deleteProduct(id);
        await SNM.loadShop();
      } catch (e) {
        alert("Delete failed: " + ((e && e.message) || ""));
      }
    };
  });
};

SNM.loadShop = async function () {
  SNM.showShopPanels();

  var role =
    (typeof SNM.getRole === "function" && SNM.getRole()) ||
    (((typeof SNM.getUser === "function" && SNM.getUser()) || {}).role ||
      "buyer");
  role = String(role).toLowerCase().trim();
  if (role === "logistics") role = "driver";

  if (role === "driver" || role === "emergency") {
    try {
      var meta = JSON.parse(localStorage.getItem("snm_driver_meta") || "null");
      if (meta && role === "driver") {
        var cov = document.getElementById("drv-coverage");
        var act = document.getElementById("drv-active");
        if (cov && meta.coverage) cov.value = meta.coverage;
        if (act && typeof meta.active === "boolean") act.checked = meta.active;
      }
    } catch (e) {}
    return;
  }

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
    SNM.renderShopList(items);
  } catch (e) {
    var msg = (e && e.message) || "error";
    if (el)
      el.innerHTML =
        "<p class='muted'>Catalogue unavailable: " + SNM.esc(msg) + "</p>";
    if (svcList)
      svcList.innerHTML =
        "<p class='muted'>Services unavailable: " + SNM.esc(msg) + "</p>";
  }
};

SNM.loadMyProducts = SNM.loadShop;

SNM.wirePhotoButtons = function (
  camBtnId,
  fileBtnId,
  camInputId,
  fileInputId,
  previewId
) {
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
    box.innerHTML =
      '<div class="shop-card-media preview">' +
      '<img class="card-thumb shop-thumb" src="' +
      url +
      '" alt="Item preview" />' +
      "</div>";
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

SNM._clearShopImageInputs = function () {
  ["shop-item-image-cam", "shop-item-image-file"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var prev = document.getElementById("shop-item-preview");
  if (prev) {
    prev.innerHTML = "";
    prev.classList.add("hidden");
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

  var image_url = null;
  var media_refs = null;
  try {
    var files = SNM._filesFromInputs("shop-item-image-cam", "shop-item-image-file");
    if (files.length) {
      var up = await SNM.uploadMediaFiles(files, "product");
      if (up.urls && up.urls.length) {
        image_url = up.urls[0];
        media_refs = up.urls.join(",");
      }
    }
  } catch (imgErr) {
    alert((imgErr && imgErr.message) || "Image failed");
    return;
  }

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
    description: desc
  };

  if (image_url) body.image_url = image_url;
  if (media_refs) body.media_refs = media_refs;
  if (g && g.lat != null) body.lat = g.lat;
  if (g && g.lng != null) body.lng = g.lng;

  try {
    await SNM.api("/products", { method: "POST", body: body });
    if (nameEl) nameEl.value = "";
    if (priceEl) priceEl.value = "";
    if (qtyEl) qtyEl.value = "";
    SNM._clearShopImageInputs();
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
  var fromD = (
    (document.getElementById("svc-from-date") || {}).value || ""
  ).trim();
  var toD = ((document.getElementById("svc-to-date") || {}).value || "").trim();
  var fromT = (
    (document.getElementById("svc-from-time") || {}).value || ""
  ).trim();
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

  var image_url = null;
  var media_refs = null;
  try {
    var files = SNM._filesFromInputs("svc-item-image-cam", "svc-item-image-file");
    if (files.length) {
      var up = await SNM.uploadMediaFiles(files, "product");
      if (up.urls && up.urls.length) {
        image_url = up.urls[0];
        media_refs = up.urls.join(",");
      }
    }
  } catch (imgErr) {
    alert((imgErr && imgErr.message) || "Image failed");
    return;
  }

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
    description: fullDesc
  };
  if (image_url) body.image_url = image_url;
  if (media_refs) body.media_refs = media_refs;
  if (g && g.lat != null) body.lat = g.lat;
  if (g && g.lng != null) body.lng = g.lng;

  try {
    await SNM.api("/products", { method: "POST", body: body });
    if (nameEl) nameEl.value = "";
    if (descEl) descEl.value = "";
    if (rateEl) rateEl.value = "";
    ["svc-item-image-cam", "svc-item-image-file"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
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
  if (drvActive) {
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
  if (drvSave) {
    drvSave.onclick = function () {
      var active = !!((document.getElementById("drv-active") || {}).checked);
      var coverage = (
        (document.getElementById("drv-coverage") || {}).value || ""
      ).trim();
      var useGps = !!((document.getElementById("drv-use-gps") || {}).checked);
      var meta = {
        coverage: coverage,
        active: active,
        live: active,
        use_gps: useGps
      };
      function finish() {
        try {
          localStorage.setItem("snm_driver_meta", JSON.stringify(meta));
        } catch (e) {}
        if (typeof SNM.setPresence === "function") {
          SNM.setPresence({
            active: active,
            heartbeat: active,
            available: active,
            live: active,
            lat: meta.lat,
            lng: meta.lng
          });
        }
        if (typeof SNM.paintDriverStatusCard === "function") {
          SNM.paintDriverStatusCard(meta);
        if (typeof SNM.toast === "function") {
          SNM.toast(active ? "You're now online" : "You're offline");
        } else {
          alert(active ? "You're now online" : "You're offline");
        }
        }
      }
      if (useGps && typeof SNM._geo === "function") {
        SNM._geo().then(function (g) {
          if (g && g.lat != null) {
            meta.lat = g.lat;
            meta.lng = g.lng;
            SNM._lastLat = g.lat;
            SNM._lastLng = g.lng;
          }
          finish();
        });
      } else {
        finish();
      }
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
  try {
    var raw = localStorage.getItem("snm_driver_meta");
    if (raw && typeof SNM.paintDriverStatusCard === "function") {
      SNM.paintDriverStatusCard(JSON.parse(raw));
    }
  } catch (e) {}
};


SNM.SERVICE_LABELS = {
  hotel: "Hotel",
  guest_house: "Guest house",
  short_let: "Short-let / home for let",
  salon: "Salon",
  barber: "Barber",
  spa: "Spa / beauty",
  plumber: "Plumber",
  electrician: "Electrician",
  carpenter: "Carpenter",
  mechanic: "Mechanic",
  painter: "Painter",
  cleaner: "Cleaning",
  clinic: "Clinic / healthcare",
  tutoring: "Tutoring / lessons",
  other_service: "Other service",
  hospitality: "Hospitality",
  trade: "Trade",
  healthcare: "Healthcare",
  service: "Service"
};

SNM.applyShopCategoryFromSetup = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var setup = u.setup || {};
  try {
    var raw = localStorage.getItem("snm_setup_data");
    if (raw) setup = Object.assign({}, JSON.parse(raw), setup);
  } catch (e) {}

  var role = String(u.role || setup.role || "").toLowerCase();
  var type =
    setup.service_type ||
    setup.category ||
    u.service_type ||
    u.category ||
    "";
  type = String(type || "").trim();

  var hid = document.getElementById("svc-type");
  var lab = document.getElementById("svcCategoryLabel");
  if (role === "service" || document.getElementById("shop-service")) {
    if (hid && type) hid.value = type;
    if (lab) {
      lab.textContent =
        (SNM.SERVICE_LABELS && SNM.SERVICE_LABELS[type]) || type || "Not set at signup";
    }
  }
};

(function () {
  var prev = SNM.onShopEnter || SNM.loadShop;
  SNM.onShopEnter = function () {
    if (typeof SNM.applyShopCategoryFromSetup === "function") {
      SNM.applyShopCategoryFromSetup();
    }
    if (typeof prev === "function") return prev.apply(this, arguments);
  };
})();


SNM.paintDriverStatusCard = function (meta) {
  meta = meta || {};
  var liveEl = document.getElementById("drvStatusLive");
  var locEl = document.getElementById("drvStatusLoc");
  var detail = document.getElementById("drvStatusDetail");
  var on = !!(meta.active || meta.live);
  if (liveEl) {
    liveEl.textContent = on
      ? "Status: LIVE — accepting jobs"
      : "Status: You're not live";
  }
  if (locEl) {
    if (meta.lat != null && meta.lng != null && !isNaN(Number(meta.lat))) {
      locEl.textContent =
        "GPS: " +
        Number(meta.lat).toFixed(5) +
        ", " +
        Number(meta.lng).toFixed(5);
    } else {
      locEl.textContent = "GPS: not updated";
    }
  }
  if (detail) {
    var primary = meta.primary_location || meta.primary || "—";
    detail.innerHTML =
      "<p class='muted small' style='margin:0.25rem 0'><strong>Vehicle:</strong> " +
      (meta.vehicle_type || "—") +
      "</p>" +
      "<p class='muted small' style='margin:0.25rem 0'><strong>Coverage:</strong> " +
      (meta.coverage || "—") +
      "</p>" +
      "<p class='muted small' style='margin:0.25rem 0'><strong>Base park:</strong> " +
      (meta.base_park || "—") +
      "</p>" +
      "<p class='muted small' style='margin:0.25rem 0'><strong>Primary:</strong> " +
      primary +
      "</p>";
  }
};

SNM.saveDriverWorkspace = async function () {
  var active = !!((document.getElementById("drv-active") || {}).checked);
  var coverage = (
    (document.getElementById("drv-coverage") || {}).value || ""
  ).trim();
  var vehicle = (
    (document.getElementById("drv-vehicle") || {}).value || ""
  ).trim();
  var basePark = (
    (document.getElementById("drv-base-park") || {}).value || ""
  ).trim();
  var useGps = !!((document.getElementById("drv-use-gps") || {}).checked);
  // Always try GPS when going live
  if (active) useGps = true;

  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var meta = {
    active: active,
    live: active,
    coverage: coverage,
    vehicle_type: vehicle,
    base_park: basePark,
    use_gps: useGps,
    primary_location:
      u.primary_location ||
      [u.community, u.city, u.region].filter(Boolean).join(", ") ||
      "",
    updated_at: new Date().toISOString()
  };

  if (useGps && typeof SNM._geo === "function") {
    try {
      var g = await SNM._geo();
      if (g && g.lat != null && g.lng != null) {
        meta.lat = g.lat;
        meta.lng = g.lng;
        SNM._lastLat = g.lat;
        SNM._lastLng = g.lng;
      }
    } catch (e) {}
  }

  try {
    localStorage.setItem("snm_driver_meta", JSON.stringify(meta));
  } catch (e2) {}

  if (typeof SNM.setPresence === "function") {
    try {
      await SNM.setPresence({
        active: active,
        heartbeat: active,
        available: active,
        live: active,
        lat: meta.lat,
        lng: meta.lng,
        vehicle_type: meta.vehicle_type,
        coverage: meta.coverage,
        base_park: meta.base_park,
        primary_location: meta.primary_location
      });
    } catch (e3) {
      alert("Presence save failed: " + ((e3 && e3.message) || ""));
    }
  }

  SNM.paintDriverStatusCard(meta);
  if (typeof SNM.toast === "function") {
    SNM.toast(active ? "You're now online" : "You're offline");
  } else {
    alert(active ? "You're now online" : "You're offline");
  }
};


/* driver save override */
(function(){

  var drvSave = document.getElementById("btnDrvSave");
  if (drvSave) {
    drvSave.onclick = function () {
      if (typeof SNM.saveDriverWorkspace === "function") {
        SNM.saveDriverWorkspace();
      }
    };
  }
  var drvActive = document.getElementById("drv-active");
  if (drvActive && !drvActive._snmLiveWired) {
    drvActive._snmLiveWired = true;
    drvActive.onchange = function () {
      if (typeof SNM.saveDriverWorkspace === "function") {
        SNM.saveDriverWorkspace();
      }
    };
  }

})();
