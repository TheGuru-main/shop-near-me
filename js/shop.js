window.SNM = window.SNM || {};

SNM.loadShop = async function () {
  var list = document.getElementById("shopList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading catalogue…</p>";
  try {
    var data = await SNM.api("/products/me");
    var rows = Array.isArray(data) ? data : (data.items || data.results || []);
    if (!rows.length) {
      list.innerHTML =
        "<p class='muted'>No listings yet. Add your first item above.</p>";
      return;
    }
    list.innerHTML = rows
      .map(function (p) {
        var cur = p.currency || "";
        var price =
          p.price != null && p.price !== ""
            ? (cur ? cur + " " : "") + p.price
            : "";
        var qty = p.quantity != null ? p.quantity : p.qty;
        return (
          '<div class="product-card">' +
          '<div class="title">' +
          (p.name || "") +
          (price ? " · " + price : "") +
          "</div>" +
          '<div class="line"><strong>Qty:</strong> ' +
          (qty != null && qty !== "" ? qty : "—") +
          "</div>" +
          '<div class="meta">' +
          (p.available === false ? "unavailable" : "available") +
          (p.perishable ? " · perishable" : "") +
          "</div></div>"
        );
      })
      .join("");
  } catch (e) {
    list.innerHTML =
      "<p class='muted'>Catalogue: " + (e.message || "unavailable") + "</p>";
  }
};

SNM.bindShop = function () {
  var btn = document.getElementById("btnAddShopItem");
  if (!btn) return;
  btn.onclick = async function () {
    try {
      var name = (document.getElementById("shop-name").value || "").trim();
      var priceRaw = (document.getElementById("shop-price").value || "").trim();
      var currency =
        (document.getElementById("shop-currency") || {}).value || "NGN";
      var qty = (document.getElementById("shop-qty").value || "").trim();
      var perishable = !!(document.getElementById("shop-perishable") || {})
        .checked;
      var available = !!(document.getElementById("shop-available") || {})
        .checked;

      if (!name) {
        SNM.toast("Item name required");
        return;
      }

      var body = {
        name: name,
        available: available,
        perishable: perishable,
        quantity: qty || null,
        description: ""
      };

      if (priceRaw !== "") {
        var price = parseFloat(priceRaw);
        if (isNaN(price)) {
          SNM.toast("Price must be a number");
          return;
        }
        if (!currency) {
          SNM.toast("Select currency when setting a price");
          return;
        }
        body.price = price;
        body.currency = currency;
      }

      await SNM.api("/products", { method: "POST", body: body });
      SNM.toast("Listed");
      document.getElementById("shop-name").value = "";
      document.getElementById("shop-price").value = "";
      document.getElementById("shop-qty").value = "";
      SNM.loadShop();
    } catch (e) {
      SNM.toast(e.message || "Add failed");
    }
  };
};
