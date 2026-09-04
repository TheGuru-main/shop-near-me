window.SNM = window.SNM || {};

SNM.loadFairlyUsed = async function () {
  var feed = document.getElementById("fairlyUsedFeed");
  if (!feed) return;
  feed.innerHTML = "<p class='muted'>Loading market…</p>";
  try {
    var data = await SNM.api("/fairly-used/posts");
    var rows = data.posts || data.items || data || [];
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      feed.innerHTML = "<p class='muted'>No posts yet — be the first.</p>";
      return;
    }
    feed.innerHTML = rows.map(function (p) {
      return (
        '<div class="product-card">' +
        '<div class="title">' + (p.title || p.name || "Item") +
        (p.price != null ? " · " + p.price : "") + "</div>" +
        '<div class="meta">' + (p.note || p.body || "") + "</div>" +
        '<div class="btn-row">' +
        '<button type="button" class="btn small secondary" data-fu="comment" data-id="' + (p.id || "") + '">Comment</button>' +
        '<button type="button" class="btn small secondary" data-fu="share" data-id="' + (p.id || "") + '">Share</button>' +
        '<button type="button" class="btn small" data-fu="msg" data-id="' + (p.id || "") + '">Message seller</button>' +
        "</div></div>"
      );
    }).join("");
  } catch (e) {
    feed.innerHTML = "<p class='muted'>" + (e.message || "Market unavailable") + "</p>";
  }
};

SNM.bindFairlyUsed = function () {
  var btn = document.getElementById("btnFuPost");
  if (btn) btn.onclick = async function () {
    try {
      await SNM.api("/fairly-used/posts", {
        method: "POST",
        body: {
          title: (document.getElementById("fu-title").value || "").trim(),
          note: (document.getElementById("fu-note").value || "").trim(),
          price: parseFloat(document.getElementById("fu-price").value) || null
        }
      });
      SNM.toast("Posted");
      SNM.loadFairlyUsed();
    } catch (e) {
      SNM.toast(e.message || "Post failed");
    }
  };
};
