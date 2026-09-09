window.SNM = window.SNM || {};

SNM._unwrapFairly = function (row) {
  row = row || {};
  var post = row.post || row;
  var author = row.author || row.owner || {};
  return {
    id: post.id || post.post_id || row.id || "",
    title: post.title || post.name || "Fairly used",
    name: post.title || post.name || "Fairly used",
    body: post.body || post.note || "",
    note: post.body || post.note || "",
    price: post.price,
    currency: post.currency || "NGN",
    created_at: post.created_at || "",
    phone: author.phone || post.phone || row.phone || "",
    owner_phone: author.phone || post.phone || "",
    owner_name: author.name || post.owner_name || "",
    seller_name: author.name || "",
    primary_location: author.primary_location || "",
    city: author.city || "",
    community: author.community || "",
    lat: author.lat != null ? author.lat : post.lat,
    lng: author.lng != null ? author.lng : post.lng,
    kind: "fairly_used"
  };
};

SNM.loadFairlyUsed = async function () {
  var list =
    document.getElementById("fuList") ||
    document.getElementById("fairlyUsedList");
  if (list) list.innerHTML = "<p class='muted'>Loading fairly used…</p>";
  try {
    var data = await SNM.api("/fairly-used");
    var raw =
      (data && (data.results || data.items || data.posts)) ||
      (Array.isArray(data) ? data : []);
    var items = raw.map(SNM._unwrapFairly);
    items.sort(function (a, b) {
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
          return SNM.cardHtml(it);
        })
        .join("");
      if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
    } else {
      list.innerHTML = items
        .map(function (it) {
          return (
            '<article class="card"><strong>' +
            SNM.esc(it.title) +
            "</strong><p class='muted small'>" +
            SNM.esc(it.body) +
            "</p><div class='meta'>" +
            SNM.esc(it.owner_name || "") +
            (it.phone ? " · " + SNM.esc(it.phone) : "") +
            "</div></article>"
          );
        })
        .join("");
    }
  } catch (e) {
    if (list) {
      list.innerHTML =
        "<p class='muted'>Fairly used unavailable: " +
        SNM.esc((e && e.message) || "error") +
        "</p>";
    }
  }
};

SNM.createFairlyUsed = async function () {
  var media_url = await SNM.readItemImage("fu-item-image");
  var titleEl = document.getElementById("fu-title");
  var bodyEl =
    document.getElementById("fu-note") ||
    document.getElementById("fu-body");
  var priceEl = document.getElementById("fu-price");
var g = SNM.posterGeo();
var bodyText = SNM.geoStamp(noteOrBody);

await SNM.api("/fairly-used", {
  method: "POST",
  body: {
    title: title,
    body: bodyText,
    price: price,
    currency: currency || "NGN"
  }
});
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
  if (SNM._fuBound) return;
  SNM._fuBound = true;

  if (typeof SNM.previewItemImage === "function") {
    SNM.previewItemImage("fu-item-image", "fu-item-preview");
  }

  var btn = document.getElementById("btnFuPost");
  if (btn && !btn._snmWired) {
    btn._snmWired = true;
    btn.onclick = function () {
      SNM.createFairlyUsed();
    };
  }
};

SNM.onFairlyUsedEnter = function () {
  SNM.loadFairlyUsed();
};
