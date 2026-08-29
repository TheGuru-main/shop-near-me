window.SNM = window.SNM || {};

SNM.productPayloadFromForm = function () {
  var priceEl = document.getElementById("prod-price");
  var priceRaw = priceEl ? priceEl.value : "";
  return {
    name: (document.getElementById("prod-name").value || "").trim(),
    category: (document.getElementById("prod-cat").value || "").trim() || null,
    price: priceRaw === "" ? null : Number(priceRaw),
    currency: (document.getElementById("prod-currency").value || "NGN").trim(),
    quantity: Number(document.getElementById("prod-qty").value) || 0,
    available: !!(document.getElementById("prod-available") &&
      document.getElementById("prod-available").checked),
    perishable: !!(document.getElementById("prod-perishable") &&
      document.getElementById("prod-perishable").checked)
  };
};

SNM.clearProductForm = function () {
  var name = document.getElementById("prod-name");
  var cat = document.getElementById("prod-cat");
  var price = document.getElementById("prod-price");
  var qty = document.getElementById("prod-qty");
  var perish = document.getElementById("prod-perishable");
  var avail = document.getElementById("prod-available");
  if (name) name.value = "";
  if (cat) cat.value = "";
  if (price) price.value = "";
  if (qty) qty.value = "1";
  if (perish) perish.checked = false;
  if (avail) avail.checked = true;
};

SNM.loadMyProducts = async function () {
  var box = document.getElementById("myProducts");
  var hint = document.getElementById("shopRoleHint");
  var u = SNM.getUser() || {};
  if (hint) {
    if (u.role === "buyer") {
      hint.textContent = "Buyers browse via Search and Feed. Catalogue tools are for sellers.";
    } else {
      hint.textContent = "Add and update your listings. Price is optional but strongly recommended.";
    }
  }
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading listings…</p>";
  try {
    var rows = await SNM.api("/products/me");
    if (!Array.isArray(rows)) rows = rows.items || rows.results || [];
    if (!rows.length) {
      box.innerHTML = "<p class=\"muted\">No listings yet</p>";
      return;
    }
    box.innerHTML = rows
      .map(function (p) {
        return (
          SNM.cardHtml(p) +
          "<div style=\"margin:-0.4rem 0 0.7rem\">" +
          "<button type=\"button\" class=\"btn small secondary\" data-del-prod=\"" +
          SNM.escapeHtml(p.id || "") +
          "\">Remove</button></div>"
        );
      })
      .join("");

    box.querySelectorAll("[data-del-prod]").forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute("data-del-prod");
        if (!id) return;
        try {
          await SNM.api("/products/" + encodeURIComponent(id), { method: "DELETE", body: {} });
          SNM.toast("Removed");
          SNM.loadMyProducts();
        } catch (e) {
          SNM.toast(e.message || "Delete failed");
        }
      };
    });
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Load failed") + "</p>";
  }
};

SNM.saveProduct = async function (andAnother) {
  var body = SNM.productPayloadFromForm();
  if (!body.name) {
    SNM.toast("Item name required");
    return;
  }
  try {
    await SNM.api("/products", { method: "POST", body: body });
    SNM.toast("Listed");
    if (andAnother) SNM.clearProductForm();
    await SNM.loadMyProducts();
  } catch (e) {
    SNM.toast(e.message || "Save failed");
  }
};

SNM.bindShop = function () {
  var add = document.getElementById("btnAddProduct");
  if (add) {
    add.onclick = function () {
      SNM.saveProduct(false);
    };
  }
  var again = document.getElementById("btnSaveAddAnother");
  if (again) {
    again.onclick = function () {
      SNM.saveProduct(true);
    };
  }
  var reload = document.getElementById("btnReloadProducts");
  if (reload) {
    reload.onclick = function () {
      SNM.loadMyProducts();
    };
  }
};
