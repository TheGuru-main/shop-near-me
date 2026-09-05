window.SNM = window.SNM || {};

SNM.loadFairlyUsed = async function () {
  var list = document.getElementById("fairlyUsedList") || document.getElementById("fuList");
  if (list) list.innerHTML = "<p class='muted'>Loading fairly used…</p>";
  try {
    var data = await SNM.api("/fairly-used" + (SNM.qs ? SNM.qs({}) : ""));
    var items =
      (data && (data.items || data.posts || data.results)) ||
      (Array.isArray(data) ? data : []);
    /* LILO / latest first */
    items = items.slice().sort(function (a, b) {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });
    if (!list) return;
    if (!items.length) {
      list.innerHTML = "<p class='muted'>No posts yet. Be first to list.</p>";
      return;
    }
    if (typeof SNM.cardHtml === "function") {
      list.innerHTML = items
        .map(function (it) {
          var n = SNM.normalizeListing(it);
          n.kind = "fairly_used";
          return SNM.cardHtml(n);
        })
        .join("");
      if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
    } else {
      list.innerHTML = items
        .map(function (it) {
          return (
            '<article class="card">' +
            "<strong>" + SNM.esc(it.title || it.name || "Post") + "</strong>" +
            "<p class='muted small'>" + SNM.esc(it.body || it.note || "") + "</p>" +
            '<div class="card-actions">' +
            '<button type="button" class="btn small" data-act="comment">Comment</button>' +
            '<button type="button" class="btn small secondary" data-act="share">Share</button>' +
            '<button type="button" class="btn small" data-act="message" data-phone="' +
            SNM.esc(it.owner_phone || it.phone || "") +
            '">Message seller</button>' +
            "</div></article>"
          );
        })
        .join("");
    }
  } catch (e) {
    if (list) {
      list.innerHTML =
        "<p class='muted'>Fairly used unavailable: " +
        SNM.esc((e && e.message) || "") +
        "</p>";
    }
  }
};

SNM.createFairlyUsed = async function () {
  var titleEl = document.getElementById("fu-title") || document.getElementById("fuTitle");
  var bodyEl = document.getElementById("fu-body") || document.getElementById("fuBody");
  var priceEl = document.getElementById("fu-price");
  var title = ((titleEl && titleEl.value) || "").trim();
  var body = ((bodyEl && bodyEl.value) || "").trim();
  var price = ((priceEl && priceEl.value) || "").trim();
  if (!title) {
    alert("Add a title.");
    return;
  }
  try {
    await SNM.api("/fairly-used", {
      method: "POST",
      body: {
        title: title,
        name: title,
        body: body,
        note: body,
        price: price ? parseFloat(price) : null
      }
    });
    if (titleEl) titleEl.value = "";
    if (bodyEl) bodyEl.value = "";
    if (priceEl) priceEl.value = "";
    await SNM.loadFairlyUsed();
  } catch (e) {
    alert("Post failed: " + ((e && e.message) || ""));
  }
};

SNM.bindFairlyUsed = function () {
  var btn =
    document.getElementById("btnFuPost") ||
    document.getElementById("btnFairlyUsedPost");
  if (btn) {
    btn.onclick = function () {
      SNM.createFairlyUsed();
    };
  }
};

SNM.onFairlyUsedEnter = function () {
  SNM.loadFairlyUsed();
};
