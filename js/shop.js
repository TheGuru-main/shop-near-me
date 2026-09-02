/* Shop Near Me — shop.js (catalogue for non-buyers) */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isSeller(role) {
    return role && role !== "buyer";
  }

  SNM.loadShop = async function () {
    var box = el("shopList") || el("shopFeed") || el("homeFeed");
    if (!box) return;
    var user = SNM.getUser() || {};
    if (!isSeller(user.role)) {
      box.innerHTML =
        '<p class="muted">Shop catalogue is for merchants, service providers, drivers, and emergency units. Buyers use Home, Search, and Fairly Used.</p>';
      return;
    }
    box.innerHTML = '<p class="muted">Loading your listings…</p>';
    try {
      var data = await SNM.api("/products/mine", { method: "GET" });
      var items = (data && (data.items || data.results || data)) || [];
      if (!Array.isArray(items)) items = [];
      if (!items.length) {
        box.innerHTML =
          '<p class="muted">No listings yet. Add a product or service below.</p>';
        return;
      }
      box.innerHTML = items
        .map(function (p) {
          var name = escapeHtml(p.name || p.title || "Item");
          var price =
            p.price != null
              ? escapeHtml(String(p.price)) +
                " " +
                escapeHtml(p.currency || "NGN")
              : "Price on request";
          var qty = p.qty != null ? " · qty " + escapeHtml(String(p.qty)) : "";
          var av = p.available === false ? " · unavailable" : "";
          var id = escapeHtml(p.id || "");
          return (
            '<article class="feed-card" data-product-id="' +
            id +
            '">' +
            "<strong>" +
            name +
            "</strong>" +
            '<p class="meta">' +
            price +
            qty +
            av +
            "</p>" +
            '<div class="row gap">' +
            '<button type="button" class="btn small secondary" data-shop-edit="' +
            id +
            '">Edit</button>' +
            '<button type="button" class="btn small danger" data-shop-del="' +
            id +
            '">Remove</button>' +
            "</div></article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">Could not load shop: ' +
        escapeHtml(e.message || e) +
        "</p>";
    }
  };

  SNM.addShopItem = async function () {
    var nameEl = el("shop-name") || el("prod-name");
    var priceEl = el("shop-price") || el("prod-price");
    var qtyEl = el("shop-qty") || el("prod-qty");
    var catEl = el("shop-category") || el("prod-category");
    var name = nameEl ? nameEl.value.trim() : "";
    var price = priceEl ? parseFloat(priceEl.value) : NaN;
    var qty = qtyEl ? parseFloat(qtyEl.value) : 0;
    var category = catEl ? catEl.value.trim() : "";
    if (!name) {
      SNM.toast("Enter item or service name");
      return;
    }
    var body = {
      name: name,
      price: isNaN(price) ? null : price,
      qty: isNaN(qty) ? 0 : qty,
      category: category || null,
      available: true,
      currency: "NGN",
    };
    try {
      await SNM.api("/products", { method: "POST", body: body });
      SNM.toast("Listing saved");
      if (nameEl) nameEl.value = "";
      if (priceEl) priceEl.value = "";
      if (qtyEl) qtyEl.value = "";
      await SNM.loadShop();
    } catch (e) {
      SNM.toast(e.message || "Save failed");
    }
  };

  SNM.bindShop = function () {
    var addBtn = el("btnShopAdd") || el("btnAddProduct");
    if (addBtn) {
      addBtn.onclick = function () {
        SNM.addShopItem();
      };
    }
    document.body.addEventListener("click", function (e) {
      var del = e.target.closest("[data-shop-del]");
      if (del) {
        var id = del.getAttribute("data-shop-del");
        if (!id || !confirm("Remove this listing?")) return;
        SNM.api("/products/" + encodeURIComponent(id), { method: "DELETE" })
          .then(function () {
            SNM.toast("Removed");
            return SNM.loadShop();
          })
          .catch(function (err) {
            SNM.toast(err.message || "Delete failed");
          });
        return;
      }
      var ed = e.target.closest("[data-shop-edit]");
      if (ed) {
        SNM.toast("Quick edit: change price/qty from listing card in next patch");
      }
    });
  };
})();
