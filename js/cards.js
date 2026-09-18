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

SNM.formatDistance = function (km) {
  if (km == null || isNaN(Number(km))) return "";
  km = Number(km);
  if (km < 1) return Math.round(km * 1000) + " m away";
  return Math.round(km * 10) / 10 + " km away";
};

SNM.normalizeListing = function (raw) {
  raw = raw || {};
  var owner =
    raw.owner ||
    raw.merchant ||
    raw.seller ||
    raw.author ||
    {};

  var phone =
    raw.phone ||
    owner.phone ||
    raw.owner_phone ||
    raw.author_phone ||
    raw.seller_phone ||
    "";

  var img =
    raw.image_url ||
    raw.media_url ||
    raw.photo_url ||
    owner.image_url ||
    "";

  return {
    id: raw.id || raw.product_id || raw.post_id || "",
    title: raw.name || raw.title || raw.item || "Listing",
    price: raw.price != null ? raw.price : raw.amount,
    currency: raw.currency || "NGN",
    qty: raw.qty != null ? raw.qty : raw.quantity,
    perishable: !!raw.perishable,
    available: raw.available !== false,
    phone: phone,
    sellerName:
      owner.name ||
      raw.business_name ||
      raw.seller_name ||
      raw.owner_name ||
      raw.author_name ||
      "Seller",
    primary: owner.primary_location || raw.primary_location || "",
    community: owner.community || raw.community || "",
    city: owner.city || raw.city || "",
    lat: raw.lat != null ? raw.lat : owner.lat,
    lng: raw.lng != null ? raw.lng : owner.lng,
    km: raw.km != null ? raw.km : raw.distance_km,
    active: !!(raw.active || raw.open || owner.live || raw.live),
    image_url: img,
    kind: raw.kind || raw.business_type || raw.category || "",
    created_at: raw.created_at || raw.addedAt || "",
    raw: raw
  };
};

SNM._catClass = function (kind) {
  var k = String(kind || "").toLowerCase();
  if (k.indexOf("food") >= 0 || k.indexOf("perish") >= 0) return "cat-food";
  if (k.indexOf("service") >= 0) return "cat-service";
  if (k.indexOf("driver") >= 0 || k.indexOf("logistics") >= 0)
    return "cat-driver";
  if (k.indexOf("fairly") >= 0) return "cat-fairly_used";
  if (k.indexOf("merchant") >= 0 || k.indexOf("retail") >= 0)
    return "cat-merchant";
  return "cat-retail";
};

SNM.cardHtml = function (item) {
  var x = SNM.normalizeListing(item);
  var dist = SNM.formatDistance(x.km);
  var priceLine =
    x.price != null && x.price !== ""
      ? "<div class='price'>" +
        SNM.esc(x.currency) +
        " " +
        SNM.esc(String(x.price)) +
        "</div>"
      : "";
  var stock =
    x.available === false
      ? '<span class="badge-stock out">Out of stock</span>'
      : '<span class="badge-stock in">In stock</span>';
  var live = x.active
    ? ' <span class="badge-live">· Live</span>'
    : "";
  var thumb = x.image_url
    ? '<div class="shop-card-media">' +
      '<img class="card-thumb shop-thumb" src="' +
      SNM.esc(x.image_url) +
      '" alt="" loading="lazy" />' +
      "</div>"
    : "";

  return (
    '<article class="listing-card ' +
    SNM._catClass(x.kind) +
    '" data-id="' +
    SNM.esc(String(x.id)) +
    '" data-phone="' +
    SNM.esc(String(x.phone)) +
    '" data-seller-name="' +
    SNM.esc(x.sellerName) +
    '" data-lat="' +
    SNM.esc(x.lat != null ? x.lat : "") +
    '" data-lng="' +
    SNM.esc(x.lng != null ? x.lng : "") +
    '" data-km="' +
    SNM.esc(x.km != null ? x.km : "") +
    '" data-primary="' +
    SNM.esc(x.primary) +
    '">' +
    thumb +
    '<div class="title">' +
    SNM.esc(x.title) +
    "</div>" +
    priceLine +
    "<div class='meta'>" +
    stock +
    live +
    "</div>" +
    "<div class='meta'>" +
    SNM.esc(x.sellerName) +
    (x.phone ? " · " + SNM.esc(x.phone) : "") +
    "</div>" +
    "<div class='meta'>" +
    SNM.esc([x.primary, x.community, x.city].filter(Boolean).join(" · ")) +
    (dist ? " · " + SNM.esc(dist) : "") +
    "</div>" +
    '<div class="card-actions">' +
    '<button type="button" data-act="comment">Comment</button>' +
    '<button type="button" data-act="share">Share</button>' +
    '<button type="button" data-act="message">Message seller</button>' +
    '<button type="button" data-act="detail">Details</button>' +
    "</div>" +
    '<div class="card-comment hidden" data-comment-box>' +
    '<div class="muted small">Comments</div>' +
    '<div data-comment-list></div>' +
    '<input type="text" placeholder="Write a comment…" data-comment-input />' +
    '<button type="button" class="btn small" data-act="comment-send" style="margin-top:0.35rem">Post comment</button>' +
    "</div>" +
    "</article>"
  );
};

SNM._listingFromCard = function (card) {
  if (!card) return {};
  var img = card.querySelector(".card-thumb");
  return {
    id: card.getAttribute("data-id") || "",
    name: (card.querySelector(".title") || {}).textContent || "",
    phone: card.getAttribute("data-phone") || "",
    seller_name: card.getAttribute("data-seller-name") || "",
    primary_location: card.getAttribute("data-primary") || "",
    lat: card.getAttribute("data-lat") || null,
    lng: card.getAttribute("data-lng") || null,
    km: card.getAttribute("data-km") || null,
    image_url: img ? img.getAttribute("src") || "" : ""
  };
};

SNM.ensureShareSheet = function () {
  var id = "snmShareSheet";
  var el = document.getElementById(id);
  if (el) return el;
  el = document.createElement("div");
  el.id = id;
  el.className = "sheet";
  el.innerHTML =
    '<div class="sheet-handle"></div><div class="sheet-body">' +
    "<p><strong>Share</strong></p>" +
    '<div class="share-sheet">' +
    '<button type="button" data-share="contact">Contact / message</button>' +
    '<button type="button" data-share="copy">Copy link text</button>' +
    '<button type="button" data-share="system">Device share</button>' +
    "</div>" +
    '<button type="button" class="btn secondary block" id="btnCloseShare" style="margin-top:0.75rem">Close</button>' +
    "</div>";
  document.body.appendChild(el);
  document.getElementById("btnCloseShare").onclick = function () {
    el.classList.remove("open");
  };
  return el;
};

SNM.openListingDetail = function (item) {
  var x = SNM.normalizeListing(item);
  var body = document.getElementById("listingDetailBody");
  var sheet = document.getElementById("listingDetail");
  if (!body || !sheet) return;

  var imgBlock = x.image_url
    ? '<div class="shop-card-media" style="margin-bottom:0.5rem">' +
      '<img class="card-thumb shop-thumb" src="' +
      SNM.esc(x.image_url) +
      '" alt="" />' +
      "</div>"
    : "";

  body.innerHTML =
    imgBlock +
    "<h3>" +
    SNM.esc(x.title) +
    "</h3>" +
    "<p class='meta'>" +
    SNM.esc(x.sellerName) +
    (x.phone ? " · " + SNM.esc(x.phone) : "") +
    "</p>" +
    (x.price != null && x.price !== ""
      ? "<p class='price'>" +
        SNM.esc(x.currency) +
        " " +
        SNM.esc(String(x.price)) +
        "</p>"
      : "") +
    "<p class='meta'>" +
    SNM.esc(
      [x.primary, x.community, x.city].filter(Boolean).join(" · ") || "—"
    ) +
    "</p>" +
    "<p class='meta'>" +
    SNM.esc(SNM.formatDistance(x.km) || "") +
    "</p>" +
    '<p style="margin-top:0.75rem">' +
    '<button type="button" class="btn block" id="btnDetailMessage">Message seller</button>' +
    "</p>";

  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");

  var msgBtn = document.getElementById("btnDetailMessage");
  if (msgBtn) {
    msgBtn.onclick = function () {
      SNM.messageSeller(x.phone, x.sellerName);
    };
  }

  var mapEl = document.getElementById("listingDetailMap");
  if (mapEl && typeof L !== "undefined") {
    mapEl.innerHTML = "";
    var user =
      (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    var uLat =
      user.lat != null
        ? Number(user.lat)
        : SNM._lastLat != null
          ? Number(SNM._lastLat)
          : null;
    var uLng =
      user.lng != null
        ? Number(user.lng)
        : SNM._lastLng != null
          ? Number(SNM._lastLng)
          : null;
    var points = [];
    if (uLat != null && uLng != null && !isNaN(uLat))
      points.push([uLat, uLng]);
    if (x.lat != null && x.lng != null && !isNaN(Number(x.lat)))
      points.push([Number(x.lat), Number(x.lng)]);
    if (!points.length) {
      mapEl.innerHTML =
        "<p class='muted' style='padding:1rem'>No coordinates for route.</p>";
      return;
    }
    if (SNM._detailMap) {
      try {
        SNM._detailMap.remove();
      } catch (e) {}
      SNM._detailMap = null;
    }
    SNM._detailMap = L.map(mapEl).setView(points[0], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM"
    }).addTo(SNM._detailMap);
    points.forEach(function (p, i) {
      L.marker(p)
        .addTo(SNM._detailMap)
        .bindPopup(i === 0 && points.length > 1 ? "You" : "Listing");
    });
    if (points.length === 2) {
      L.polyline(points, { color: "#14532d" }).addTo(SNM._detailMap);
      SNM._detailMap.fitBounds(points, { padding: [24, 24] });
    }
    setTimeout(function () {
      try {
        SNM._detailMap.invalidateSize();
      } catch (e2) {}
    }, 200);
  }
};

/** phone string, or (phone, name) */
SNM.messageSeller = async function (phoneOrMeta, nameHint) {
  var phone = "";
  var name = nameHint || "";
  if (phoneOrMeta && typeof phoneOrMeta === "object") {
    phone =
      phoneOrMeta.phone ||
      phoneOrMeta.owner_phone ||
      phoneOrMeta.author_phone ||
      "";
    name =
      phoneOrMeta.name ||
      phoneOrMeta.seller_name ||
      phoneOrMeta.owner_name ||
      name;
  } else {
    phone = phoneOrMeta || "";
  }
  phone = String(phone || "").trim();
  if (!phone) {
    alert("No seller phone on this listing.");
    return;
  }
  if (typeof SNM.openChatWithSeller === "function") {
    await SNM.openChatWithSeller({ phone: phone, name: name });
    return;
  }
  if (typeof SNM.startDmByPhone === "function") {
    await SNM.startDmByPhone(phone, name);
    return;
  }
  var input = document.getElementById("dm-phone");
  if (input) input.value = phone;
  if (typeof SNM.showScreen === "function") SNM.showScreen("messages");
};

SNM.bindCardActions = function (root) {
  root = root || document;
  if (root._snmCardClickWired) return;
  root._snmCardClickWired = true;

  root.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var card = btn.closest(".listing-card");
    if (!card) return;
    var act = btn.getAttribute("data-act");
    var listing = SNM._listingFromCard(card);

    if (act === "comment") {
      var box = card.querySelector("[data-comment-box]");
      if (box) box.classList.toggle("hidden");
      return;
    }
    if (act === "comment-send") {
      var input = card.querySelector("[data-comment-input]");
      var list = card.querySelector("[data-comment-list]");
      var t = ((input && input.value) || "").trim();
      if (!t || !list) return;
      var p = document.createElement("p");
      p.className = "muted small";
      p.textContent = t;
      list.appendChild(p);
      input.value = "";
      return;
    }
    if (act === "share") {
      var sheet = SNM.ensureShareSheet();
      sheet.dataset.phone = listing.phone || "";
      sheet.dataset.title = listing.name || "";
      sheet.classList.add("open");
      sheet.onclick = function (ev) {
        var s = ev.target.getAttribute("data-share");
        if (!s) return;
        var text =
          (sheet.dataset.title || "Listing") +
          " · " +
          (sheet.dataset.phone || "");
        if (s === "copy" && navigator.clipboard)
          navigator.clipboard.writeText(text);
        else if (s === "system" && navigator.share)
          navigator.share({ text: text });
        else if (s === "contact") {
          SNM.messageSeller(sheet.dataset.phone);
        }
        sheet.classList.remove("open");
      };
      return;
    }
    if (act === "message") {
      SNM.messageSeller(listing.phone, listing.seller_name);
      return;
    }
    if (act === "detail") {
      SNM.openListingDetail(listing);
    }
  });
};

SNM.bindCards = function () {
  SNM.bindCardActions(document);
};