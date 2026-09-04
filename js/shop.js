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
      list.innerHTML = "<p class='muted'>No listings yet. Add your first item above.</p>";
      return;
    }
    list.innerHTML = rows.map(function (p) {
      return (
        '<div class="product-card"><div class="title">' + (p.name || "") +
        (p.price != null ? " · " + p.price : "") + "</div>" +
        '<div class="meta">qty ' + (p.qty != null ? p.qty : "—") +
        (p.available === false ? " · unavailable" : " · available") + "</div></div>"
      );
    }).join("");
  } catch (e) {
    list.innerHTML = "<p class='muted'>Catalogue: " + (e.message || "unavailable") + "</p>";
  }
};

SNM.bindShop = function () {
  var btn = document.getElementById("btnAddShopItem");
  if (!btn) return;
  btn.onclick = async function () {
    try {
      var body = {
        name: (document.getElementById("shop-name").value || "").trim(),
        price: parseFloat(document.getElementById("shop-price").value) || 0,
        qty: parseFloat(document.getElementById("shop-qty").value) || 0,
        perishable: !!(document.getElementById("shop-perishable") || {}).checked,
        available: !!(document.getElementById("shop-available") || {}).checked
      };
      if (!body.name) return SNM.toast("Item name required");
      await SNM.api("/products", { method: "POST", body: body });
      SNM.toast("Listed");
      SNM.loadShop();
    } catch (e) {
      SNM.toast(e.message || "Add failed");
    }
  };
};
