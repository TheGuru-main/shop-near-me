/* Shop Near Me — fairly_used.js (global open market) */
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

  SNM.loadFairlyUsed = async function () {
    var box = el("fairlyUsedFeed") || el("fuFeed");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading fairly used…</p>';
    try {
      var data = await SNM.api("/fairly-used/posts", { method: "GET" });
      var posts = (data && (data.posts || data.items || data)) || [];
      if (!Array.isArray(posts)) posts = [];
      if (!posts.length) {
        box.innerHTML =
          '<p class="muted">No posts yet. Be first to list a fairly used item.</p>';
        return;
      }
      box.innerHTML = posts
        .map(function (p) {
          var id = escapeHtml(p.id || "");
          var title = escapeHtml(p.title || p.body || "Listing");
          var price =
            p.price != null
              ? escapeHtml(String(p.price)) + " NGN"
              : "Contact seller";
          var seller = escapeHtml(p.owner_name || p.seller_name || "Seller");
          var peer = escapeHtml(p.owner_id || p.seller_id || "");
          var place = escapeHtml(p.primary_location || p.city || "");
          return (
            '<article class="feed-card">' +
            "<strong>" +
            title +
            "</strong>" +
            '<p class="meta">' +
            price +
            (place ? " · " + place : "") +
            "</p>" +
            '<p class="muted">Seller: ' +
            seller +
            "</p>" +
            '<div class="row gap">' +
            '<button type="button" class="btn small" data-fu-comment="' +
            id +
            '">Comment</button>' +
            '<button type="button" class="btn small secondary" data-fu-share="' +
            id +
            '">Share</button>' +
            '<button type="button" class="btn small" data-message-seller="' +
            peer +
            '" data-seed="Hi — about your fairly used post">Message seller</button>' +
            "</div></article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.postFairlyUsed = async function () {
    var bodyEl = el("fu-body") || el("fuText");
    var priceEl = el("fu-price");
    var titleEl = el("fu-title");
    var body = bodyEl ? bodyEl.value.trim() : "";
    var title = titleEl ? titleEl.value.trim() : body.slice(0, 80);
    var price = priceEl ? parseFloat(priceEl.value) : null;
    if (!body && !title) {
      SNM.toast("Write a short note or title");
      return;
    }
    try {
      await SNM.api("/fairly-used/posts", {
        method: "POST",
        body: {
          title: title || "Fairly used",
          body: body,
          price: isNaN(price) ? null : price,
        },
      });
      SNM.toast("Posted");
      if (bodyEl) bodyEl.value = "";
      if (titleEl) titleEl.value = "";
      if (priceEl) priceEl.value = "";
      await SNM.loadFairlyUsed();
    } catch (e) {
      SNM.toast(e.message || "Post failed");
    }
  };

  SNM.bindFairlyUsed = function () {
    var postBtn = el("btnFuPost") || el("btnFairlyPost");
    if (postBtn) {
      postBtn.onclick = function () {
        SNM.postFairlyUsed();
      };
    }
    var openBtn = el("btnFairlyUsed") || el("btnOpenFairlyUsed");
    if (openBtn) {
      openBtn.onclick = function () {
        if (typeof SNM.showScreen === "function") {
          SNM.showScreen("fairly-used");
        }
        SNM.loadFairlyUsed();
      };
    }
    document.body.addEventListener("click", function (e) {
      var c = e.target.closest("[data-fu-comment]");
      if (c) {
        var text = prompt("Comment:");
        if (!text) return;
        SNM.api(
          "/fairly-used/posts/" +
            encodeURIComponent(c.getAttribute("data-fu-comment")) +
            "/comments",
          { method: "POST", body: { body: text } }
        )
          .then(function () {
            SNM.toast("Comment added");
          })
          .catch(function (err) {
            SNM.toast(err.message || "Failed");
          });
        return;
      }
      var s = e.target.closest("[data-fu-share]");
      if (s) {
        var url = location.origin + location.pathname + "#fairly-used";
        if (navigator.share) {
          navigator.share({ title: "Fairly used", url: url }).catch(function () {});
        } else {
          SNM.toast("Link: " + url);
        }
      }
    });
  };
})();
