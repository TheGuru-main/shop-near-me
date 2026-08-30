window.SNM = window.SNM || {};

SNM.productPayloadFromForm = function () {
  return {
    name: (document.getElementById("prod-name").value || "").trim(),
    category: (document.getElementById("prod-cat").value || "").trim() || null,
    price: parseFloat(document.getElementById("prod-price").value) || 0,
    currency: (document.getElementById("prod-currency").value || "NGN").trim(),
    quantity: parseFloat(document.getElementById("prod-qty").value) || 0,
    perishable: !!(document.getElementById("prod-perishable") || {}).checked,
    available: !!(document.getElementById("prod-available") || {}).checked
  };
};

SNM.loadMyProducts = async function () {
  var box = document.getElementById("myProducts");
  if (!box) return;
  if (SNM.isBuyer()) {
    box.innerHTML = "<p class='muted'>Buyers do not manage a shop catalogue.</p>";
    return;
  }
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/products/mine");
    var rows = data.items || data.results || data || [];
    if (!Array.isArray(rows)) rows = [];
    box.innerHTML = rows.length
      ? rows.map(SNM.cardHtml).join("")
      : "<p class='muted'>No listings yet.</p>";
  } catch (e) {
    try {
      var data2 = await SNM.api("/products");
      var rows2 = data2.items || data2.results || data2 || [];
      if (!Array.isArray(rows2)) rows2 = [];
      box.innerHTML = rows2.length
        ? rows2.map(SNM.cardHtml).join("")
        : "<p class='muted'>No listings yet.</p>";
    } catch (e2) {
      box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
    }
  }
};

SNM.saveProduct = async function (keepForm) {
  if (SNM.isBuyer()) return SNM.toast("Buyers cannot add shop items");
  var body = SNM.productPayloadFromForm();
  if (!body.name) return SNM.toast("Enter item name");
  try {
    await SNM.api("/products", { method: "POST", body: body });
    SNM.toast("Saved");
    if (!keepForm) {
      document.getElementById("prod-name").value = "";
      document.getElementById("prod-price").value = "";
    } else {
      document.getElementById("prod-name").value = "";
      document.getElementById("prod-price").value = "";
      document.getElementById("prod-name").focus();
    }
    SNM.loadMyProducts();
  } catch (e) {
    SNM.toast(e.message || "Save failed");
  }
};

SNM.bindShop = function () {
  var add = document.getElementById("btnAddProduct");
  var again = document.getElementById("btnSaveAddAnother");
  var reload = document.getElementById("btnReloadProducts");
  if (add) add.onclick = function () {
    SNM.saveProduct(false);
  };
  if (again) again.onclick = function () {
    SNM.saveProduct(true);
  };
  if (reload) reload.onclick = function () {
    SNM.loadMyProducts();
  };
};
