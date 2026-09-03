window.SNM = window.SNM || {};

SNM.loadFairlyUsed = async function () {
  var feed = document.getElementById("fairlyUsedFeed");
  if (!feed) return;
  feed.innerHTML = "<p class='muted'>Loading fairly used…</p>";
  try {
    var data = await SNM.api("/fairly-used/posts");
    var rows = data.posts || data.items || data.results || [];
    if (!rows.length) {
      feed.innerHTML =
        "<div class='card'><p>No posts yet.</p><p class='muted'>Be the first to list a fairly used item.</p></div>";
      return;
    }
    feed.innerHTML = rows
      .map(function (p) {
        var title = p.title || p.name || "Post";
        var note = p.note || p.body || "";
        var price = p.price != null ? p.price : "";
        var who = p.owner_name || p.seller_name || "";
        var id = p.id || "";
        var ownerId = p.owner_id || p.user_id || "";
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          title +
          "</div>" +
          (note ? "<p>" + note + "</p>" : "") +
          '<div class="meta">' +
          [price, who].filter(Boolean).join(" · ") +
          "</div>" +
          '<div class="btn-row" style="margin-top:0.5rem">' +
          '<button type="button" class="btn small secondary" data-fu-msg="' +
          ownerId +
          '" data-fu-name="' +
          who +
          '">Message seller</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    feed.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Fairly used failed") +
      "</p></div>";
  }
};

SNM.bindFairlyUsed = function () {
  document.getElementById("btnFuPost")?.addEventListener("click", async function () {
    var title = (document.getElementById("fu-title")?.value || "").trim();
    var note = (document.getElementById("fu-note")?.value || "").trim();
    var priceRaw = document.getElementById("fu-price")?.value;
    var price = priceRaw === "" || priceRaw == null ? null : parseFloat(priceRaw);
    if (!title) {
      SNM.toast("Enter a title");
      return;
    }
    try {
      await SNM.api("/fairly-used/posts", {
        method: "POST",
        body: {
          title: title,
          note: note,
          body: note,
          price: price
        }
      });
      document.getElementById("fu-title").value = "";
      document.getElementById("fu-note").value = "";
      if (document.getElementById("fu-price"))
        document.getElementById("fu-price").value = "";
      SNM.toast("Posted");
      SNM.loadFairlyUsed();
    } catch (err) {
      SNM.toast(err.message || "Post failed");
    }
  });

  document.getElementById("fairlyUsedFeed")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-fu-msg]");
    if (!btn) return;
    var uid = btn.getAttribute("data-fu-msg");
    var name = btn.getAttribute("data-fu-name") || "";
    if (uid && typeof SNM.startChatWith === "function") SNM.startChatWith(uid, name);
    else SNM.toast("Seller unavailable");
  });
};
