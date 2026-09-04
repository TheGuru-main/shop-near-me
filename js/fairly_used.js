window.SNM = window.SNM || {};

(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  SNM.loadFairlyUsed = async function () {
    var feed = el("fuFeed") || el("fairlyUsedFeed") || el("fuList");
    if (!feed) return;
    feed.innerHTML = '<p class="muted">Loading market…</p>';
    try {
      var data = await SNM.api("/fairly-used").catch(function () {
        return SNM.api("/fairly-used/posts");
      });
      var items = data.items || data.results || data.posts || (Array.isArray(data) ? data : []);
      items = items.slice().sort(function (a, b) {
        var ta = Date.parse(a.created_at || 0) || 0;
        var tb = Date.parse(b.created_at || 0) || 0;
        return tb - ta;
      });
      if (!items.length) {
        feed.innerHTML = '<div class="empty-state">No fairly used posts yet.</div>';
        return;
      }
      feed.innerHTML = items
        .map(function (p) {
          var row = {
            id: p.id,
            name: p.title || p.name || "Fairly used item",
            description: p.body || p.description || p.note || "",
            price: p.price,
            currency: p.currency || "NGN",
            merchant_name: (p.owner && p.owner.name) || p.seller_name || p.owner_name,
            merchant_phone: (p.owner && p.owner.phone) || p.seller_phone || p.phone,
            primary_location: p.primary_location || (p.owner && p.owner.primary_location),
            lat: p.lat,
            lng: p.lng,
            created_at: p.created_at
          };
          return SNM.cardHtml(row);
        })
        .join("");
    } catch (err) {
      feed.innerHTML =
        '<div class="empty-state">' +
        esc((err && (err.message || err.detail)) || "Could not load posts") +
        "</div>";
    }
  };

  SNM.bindFairlyUsed = function () {
    var btn = el("btnFuPost") || el("btnFairlyPost");
    if (btn) {
      btn.onclick = async function () {
        var title = (el("fu-title") || el("fuTitle") || {}).value || "";
        var body = (el("fu-body") || el("fuBody") || {}).value || "";
        var price = (el("fu-price") || el("fuPrice") || {}).value || "";
        title = String(title).trim();
        if (!title) {
          if (typeof SNM.toast === "function") SNM.toast("Add a title");
          return;
        }
        try {
          await SNM.api("/fairly-used/posts", {
            method: "POST",
            body: {
              title: title,
              body: String(body).trim(),
              price: price === "" ? null : Number(price),
              currency: "NGN"
            }
          }).catch(function () {
            return SNM.api("/fairly-used", {
              method: "POST",
              body: {
                title: title,
                body: String(body).trim(),
                price: price === "" ? null : Number(price)
              }
            });
          });
          if (el("fu-title")) el("fu-title").value = "";
          if (el("fu-body")) el("fu-body").value = "";
          if (el("fu-price")) el("fu-price").value = "";
          await SNM.loadFairlyUsed();
        } catch (err) {
          if (typeof SNM.toast === "function") {
            SNM.toast((err && (err.message || err.detail)) || "Post failed");
          }
        }
      };
    }
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(document);
  };
})();
