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

  if (typeof SNM.compressImageFile === "function") {
    var dataUrl = await SNM.compressImageFile(file, 320, 0.5);
    if (dataUrl.length > 90000) {
      dataUrl = await SNM.compressImageFile(file, 240, 0.4);
    }
    if (dataUrl.length > 90000) {
      throw new Error(
        "Photo too large. Try a smaller image or post without photo."
      );
    }
    return dataUrl;
  }

  return await new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
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

  var phone =
    author.phone ||
    post.author_phone ||
    post.owner_phone ||
    post.phone ||
    row.phone ||
    "";

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
    phone: phone,
    owner_phone: phone,
    author_phone: phone,
    owner_name: author.name || post.author_name || post.owner_name || "",
    seller_name: author.name || post.author_name || "",
    author_start_row:
      author.start_row != null
        ? author.start_row
        : post.author_start_row != null
          ? post.author_start_row
          : null,
    primary_location: author.primary_location || "",
    city: author.city || "",
    community: author.community || "",
    lat: post.lat != null ? post.lat : author.lat,
    lng: post.lng != null ? post.lng : author.lng,
    kind: "fairly_used"
  };
};

/** Always DELETE /fairly-used/{id} — never /products/ */
SNM.deleteFairlyUsed = async function (postId) {
  postId = String(postId || "").trim();
  if (!postId) {
    alert("Missing post id");
    return;
  }
  if (!confirm("Delete this fairly used post?")) return;
  try {
    await SNM.api("/fairly-used/" + encodeURIComponent(postId), {
      method: "DELETE"
    });
    await SNM.loadFairlyUsed();
  } catch (e) {
    var msg =
      (typeof SNM._msgErr === "function" && SNM._msgErr(e)) ||
      (e && e.message) ||
      "Delete failed";
    alert(msg);
  }
};

SNM._fuIsMine = function (it) {
  var me = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var myPhone = (me.phone || "").toString().replace(/\s/g, "");
  var postPhone = (it.phone || it.owner_phone || it.author_phone || "")
    .toString()
    .replace(/\s/g, "");
  if (myPhone && postPhone && myPhone === postPhone) return true;
  if (myPhone && postPhone) {
    var a = myPhone.replace(/\D/g, "");
    var b = postPhone.replace(/\D/g, "");
    if (a && b && (a === b || a.endsWith(b) || b.endsWith(a))) return true;
  }
  return false;
};

SNM._fuCardHtml = function (it) {
  var img = it.image_url || it.media_url || "";
  var phone = it.phone || it.owner_phone || it.author_phone || "";
  var price =
    it.price != null && it.price !== ""
      ? SNM.esc(String(it.currency || "NGN")) +
        " " +
        SNM.esc(String(it.price))
      : "";
  var delBtn = SNM._fuIsMine(it)
    ? '<button type="button" class="btn secondary small" data-fu-del="' +
      SNM.esc(String(it.id || "")) +
      '">Delete</button>'
    : "";

  return (
    '<article class="card listing-card cat-fairly_used" data-id="' +
    SNM.esc(String(it.id || "")) +
    '" data-kind="fairly_used" data-phone="' +
    SNM.esc(String(phone)) +
    '" data-seller-name="' +
    SNM.esc(it.owner_name || it.seller_name || "") +
    '">' +
    (img
      ? '<div class="shop-card-media"><img class="card-thumb shop-thumb" src="' +
        SNM.esc(img) +
        '" alt="" loading="lazy" /></div>'
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
    (phone ? " · " + SNM.esc(phone) : "") +
    "</div>" +
    '<div class="card-actions">' +
    '<button type="button" data-act="message">Message seller</button>' +
    '<button type="button" data-act="detail">Details</button> ' +
    delBtn +
    "</div>" +
    "</article>"
  );
};

SNM._fuBindDelete = function (root) {
  if (!root) return;
  root.querySelectorAll("[data-fu-del]").forEach(function (btn) {
    if (btn._snmFuDel) return;
    btn._snmFuDel = true;
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.deleteFairlyUsed(btn.getAttribute("data-fu-del"));
    };
  });
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
    /* Prefer FU cards so delete stays on /fairly-used */
    list.innerHTML = items.map(SNM._fuCardHtml).join("");
    SNM._fuBindDelete(list);
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
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
  var mediaRefsJoined = null;
  var mediaTypeUp = null;
  try {
    var files = SNM._filesFromInputs("fu-item-image-cam", "fu-item-image-file");
    if (files.length) {
      var up = await SNM.uploadMediaFiles(files, "fairly_used");
      if (up.urls && up.urls.length) {
        imageUrl = up.urls[0];
        mediaRefsJoined = up.urls.join(",");
        mediaTypeUp = up.media_type;
      }
    }
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
    body: bodyText,
    price: price,
    currency: "NGN"
  };
  if (imageUrl) {
    payload.image_url = imageUrl;
    payload.media_url = imageUrl;
    if (mediaRefsJoined) payload.media_refs = mediaRefsJoined;
    if (mediaTypeUp) payload.media_type = mediaTypeUp;
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