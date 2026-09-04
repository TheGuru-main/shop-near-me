window.SNM = window.SNM || {};

SNM.loadFairlyUsed = async function () {
  var feed = document.getElementById("fairlyUsedFeed");
  if (!feed) return;
  feed.innerHTML = "<p class='muted'>Loading market…</p>";
  try {
    /* Backend: GET /fairly-used */
    var data = await SNM.api("/fairly-used");
    var rows = data.results || data.posts || data.items || [];
    if (!Array.isArray(rows) || !rows.length) {
      feed.innerHTML = "<p class='muted'>No posts yet — be the first.</p>";
      return;
    }
    feed.innerHTML = rows
      .map(function (row) {
        var p = row.post || row;
        var author = row.author || {};
        var id = p.id || "";
        var price =
          p.price != null
            ? (p.currency ? p.currency + " " : "") + p.price
            : "";
        return (
          '<div class="product-card">' +
          '<div class="title">' +
          (p.title || "Item") +
          (price ? " · " + price : "") +
          "</div>" +
          '<div class="meta">' +
          (p.body || p.note || "") +
          (author.name ? " · " + author.name : "") +
          "</div>" +
          '<div class="btn-row">' +
          '<button type="button" class="btn small secondary" data-fu="comment" data-id="' +
          id +
          '">Comment</button>' +
          '<button type="button" class="btn small secondary" data-fu="share" data-id="' +
          id +
          '">Share</button>' +
          '<button type="button" class="btn small" data-fu="msg" data-id="' +
          id +
          '" data-author="' +
          (author.id || "") +
          '">Message seller</button>' +
          "</div></div>"
        );
      })
      .join("");
  } catch (e) {
    feed.innerHTML =
      "<p class='muted'>" + (e.message || "Market unavailable") + "</p>";
  }
};

SNM.bindFairlyUsed = function () {
  var btn = document.getElementById("btnFuPost");
  if (btn)
    btn.onclick = async function () {
      try {
        var title = (document.getElementById("fu-title").value || "").trim();
        var note = (document.getElementById("fu-note").value || "").trim();
        var priceRaw = (document.getElementById("fu-price").value || "").trim();
        var body = {
          title: title,
          body: note
        };
        if (priceRaw !== "") {
          body.price = parseFloat(priceRaw);
          body.currency = "NGN";
        }
        if (!title && !note) {
          SNM.toast("Add a title or note");
          return;
        }
        /* Backend: POST /fairly-used */
        await SNM.api("/fairly-used", { method: "POST", body: body });
        SNM.toast("Posted");
        document.getElementById("fu-title").value = "";
        document.getElementById("fu-note").value = "";
        document.getElementById("fu-price").value = "";
        SNM.loadFairlyUsed();
      } catch (e) {
        SNM.toast(e.message || "Post failed");
      }
    };
};
