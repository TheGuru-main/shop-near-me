window.SNM = window.SNM || {};

SNM.loadShop = async function () {
  var list = document.getElementById("shopList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading catalogue…</p>";
  try {
    var data = await SNM.api("/products/mine");
    var rows = data.items || data.results || data || [];
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      list.innerHTML =
        "<div class='card'><p>No listings yet.</p><p class='muted'>Add goods above.</p></div>";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        var name = r.name || "Item";
        var price = r.price != null ? r.price : "—";
        var qty = r.qty != null ? r.qty : r.quantity;
        var avail = r.available === false ? "Unavailable" : "Available";
        var per = r.perishable ? " · Perishable" : "";
        return (
          '<article class="product-card" data-id="' +
          (r.id || "") +
          '">' +
          '<div class="title">' +
          name +
          "</div>" +
          '<div class="meta">' +
          price +
          (qty != null ? " · qty " + qty : "") +
          " · " +
          avail +
          per +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Could not load shop") +
      "</p></div>";
  }
};

SNM.bindShop = function () {
  document.getElementById("btnAddShopItem")?.addEventListener("click", async function () {
    var name = (document.getElementById("shop-name")?.value || "").trim();
    var price = parseFloat(document.getElementById("shop-price")?.value || "0");
    var qty = parseFloat(document.getElementById("shop-qty")?.value || "0");
    var perishable = !!document.getElementById("shop-perishable")?.checked;
    if (!name) {
      SNM.toast("Enter item name");
      return;
    }
    try {
      await SNM.api("/products", {
        method: "POST",
        body: {
          name: name,
          price: isNaN(price) ? 0 : price,
          qty: isNaN(qty) ? 0 : qty,
          quantity: isNaN(qty) ? 0 : qty,
          available: true,
          perishable: perishable
        }
      });
      document.getElementById("shop-name").value = "";
      document.getElementById("shop-price").value = "";
      document.getElementById("shop-qty").value = "";
      if (document.getElementById("shop-perishable"))
        document.getElementById("shop-perishable").checked = false;
      SNM.toast("Listing added");
      SNM.loadShop();
    } catch (err) {
      SNM.toast(err.message || "Add failed");
    }
  });
};
