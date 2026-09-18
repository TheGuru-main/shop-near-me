window.SNM = window.SNM || {};

SNM.esc =
  SNM.esc ||
  SNM.escapeHtml ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM._fuReadImage = async function () {
  var cam = document.getElementById("fu-item-image-cam");
  var gal = document.getElementById("fu-item-image-file");
  var file =
    (cam && cam.files && cam.files[0]) ||
    (gal && gal.files && gal.files[0]) ||
    null;
  if (!file) return null;

  var dataUrl;
  if (typeof SNM.compressImageFile === "function") {
    dataUrl = await SNM.compressImageFile(file, 400, 0.5);
    if (dataUrl.length > 100000) {
      dataUrl = await SNM.compressImageFile(file, 320, 0.4);
    }
    if (dataUrl.length > 100000) {
      throw new Error("Photo too large. Try a smaller image or post without photo.");
    }
  } else if (typeof SNM.readItemImageFrom === "function") {
    dataUrl = await SNM.readItemImageFrom(
      "fu-item-image-cam",
      "fu-item-image-file"
    );
  } else {
    dataUrl = await new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  return dataUrl;
};

SNM._fuClearImage = function () {
  var cam = document.getElementById("fu-item-image-cam");
  var gal = document.getElementById("fu-item-image-file");
  var prev = document.getElementById("fu-item-preview");
  if (cam) cam.value = "";
  if (gal) gal.value = "";
  if (prev) {
    prev.innerHTML = "";
    prev.classList.add("hidden");
  }
};

SNM._unwrapFairly = function (row) {
  row = row || {};
  var post = row.post || row;
  var author = row.author || row.owner || {};
  var img =
    post.image_url ||
    post.media_url ||
    post.photo_url ||
    row.image_url ||
    "";
  return {
    id: post.id || post.post_id || row.id || "",
    title: post.title || post.name || "Fairly used",
    name: post.title || post.name || "Fairly used",
    body: post.body || post.note || "",
    note: post.body || post.note || "",
    price: post.price,
    currency: post.currency || "NGN",
    created_at: post.created_at || "",
    image_url: img,
    media_url: img,
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

SNM._fuCardHtml = function (it) {
  var img = it.image_url || it.media_url || "";
  var price =
    it.price != null && it.price !== ""
      ? SNM.esc(String(it.currency || "NGN")) + " " + SNM.esc(String(it.price))
      : "";
  return (
    '<article class="card listing-card cat-fairly_used">' +
    (img
      ? '<img class="card-thumb" src="' +
        SNM.esc(img) +
        '" alt="" loading="lazy" />'
      : "") +
    '<div class="title">' +
    SNM.esc(it.title || it.name || "Fairly used") +
    "</div>" +
    (it.body
      ? "<p class='meta'>" + SNM.esc(String(it.body).slice(0, 160)) + "</p>"
      : "") +
    (price ? "<p class='meta'><strong>" + price + "</strong></p>" : "") +
    '<div class="meta">' +
    SNM.esc(it.owner_name || it.seller_name || "") +
    (it.phone || it.owner_phone
      ? " · " + SNM.esc(it.phone || it.owner_phone)
      : "") +
    "</div></article>"
  );
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
      list.innerHTML = items.map(SNM._fuCardHtml).join("");
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
  var titleEl = document.getElementById("fu-title");
  var bodyEl =
    document.getElementById("fu-note") || document.getElementById("fu-body");
  var priceEl = document.getElementById("fu-price");

  var title = titleEl ? (titleEl.value || "").trim() : "";
  var note = bodyEl ? (bodyEl.value || "").trim() : "";
  var priceRaw = priceEl ? (priceEl.value || "").trim() : "";
  var price = priceRaw ? parseFloat(priceRaw) : null;
  if (price != null && isNaN(price)) price = null;

  if (!title) {
    alert("Add a title.");
    return;
  }

  var imageUrl = null;
  try {
    imageUrl = await SNM._fuReadImage();
  } catch (imgErr) {
    alert((imgErr && imgErr.message) || "Image failed");
    return;
  }

  var bodyText = note;
  if (typeof SNM.geoStamp === "function") {
    try {
      bodyText = SNM.geoStamp(note || title) || note;
    } catch (e) {}
  }

  var payload = {
    title: title,
    name: title,
    body: bodyText,
    note: bodyText,
    price: price,
    currency: "NGN"
  };
  if (imageUrl) {
    payload.image_url = imageUrl;
    payload.media_url = imageUrl;
  }

  if (typeof SNM.posterGeo === "function") {
    try {
      var g = SNM.posterGeo();
      if (g && g.lat != null) payload.lat = g.lat;
      if (g && g.lng != null) payload.lng = g.lng;
    } catch (e2) {}
  }

  try {
    await SNM.api("/fairly-used", { method: "POST", body: payload });
    if (titleEl) titleEl.value = "";
    if (bodyEl) bodyEl.value = "";
    if (priceEl) priceEl.value = "";
    SNM._fuClearImage();
    await SNM.loadFairlyUsed();
  } catch (e) {
    var msg =
      (e && e.message) ||
      (typeof SNM._msgErr === "function" && SNM._msgErr(e)) ||
      "Post failed";
    alert("Post failed: " + msg);
  }
};

SNM.bindFairlyUsed = function () {
  if (SNM._fuBound) return;
  SNM._fuBound = true;

  if (typeof SNM.wirePhotoButtons === "function") {
    SNM.wirePhotoButtons(
      "btnFuCam",
      "btnFuGallery",
      "fu-item-image-cam",
      "fu-item-image-file",
      "fu-item-preview"
    );
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