window.SNM = window.SNM || {};

/* Compatible with cards.js SNM.esc */
SNM.escapeHtml =
  SNM.escapeHtml ||
  SNM.esc ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
SNM.esc = SNM.esc || SNM.escapeHtml;

SNM._listingsById = SNM._listingsById || {};
SNM._detailMap = null;
SNM._detailItem = null;
SNM._mapExpanded = false;
SNM._homeMap = null;
SNM._geoCache = SNM._geoCache || {};

/* ---------- geo helpers ---------- */

SNM.haversineKm = function (lat1, lon1, lat2, lon2) {
  var r = 6371;
  var p1 = (lat1 * Math.PI) / 180;
  var p2 = (lat2 * Math.PI) / 180;
  var dp = ((lat2 - lat1) * Math.PI) / 180;
  var dl = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
};

SNM.seekerGeo = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var lat =
    u.lat != null
      ? Number(u.lat)
      : SNM._lastLat != null
        ? Number(SNM._lastLat)
        : null;
  var lng =
    u.lng != null
      ? Number(u.lng)
      : SNM._lastLng != null
        ? Number(SNM._lastLng)
        : null;
  if (lat != null && !isNaN(lat)) SNM._lastLat = lat;
  if (lng != null && !isNaN(lng)) SNM._lastLng = lng;
  return {
    lat: lat != null && !isNaN(lat) ? lat : null,
    lng: lng != null && !isNaN(lng) ? lng : null,
    community: u.community || "",
    city: u.city || "",
    region: u.region || "",
    country: u.country || "",
    primary_location: u.primary_location || ""
  };
};

SNM.geocodeText = async function (text) {
  text = String(text || "").trim();
  if (!text) return null;
  if (SNM._geoCache[text]) return SNM._geoCache[text];
  try {
    var url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(text);
    var res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en"
      }
    });
    if (!res.ok) return null;
    var arr = await res.json();
    if (!arr || !arr[0]) return null;
    var pt = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    if (isNaN(pt.lat) || isNaN(pt.lng)) return null;
    SNM._geoCache[text] = pt;
    return pt;
  } catch (e) {
    return null;
  }
};

/* ---------- normalize ---------- */

SNM.normalizeListing = function (raw) {
  raw = raw || {};
  var src = raw;

  if (raw.product && typeof raw.product === "object") {
    var p = raw.product;
    var s = raw.seller || {};
    raw = {
      id: p.id,
      name: p.name || p.title,
      title: p.name || p.title,
      body: p.description || p.body || "",
      price: p.price,
      currency: p.currency || "NGN",
      qty: p.qty != null ? p.qty : p.quantity,
      perishable: !!p.perishable,
      available: p.available !== false,
      phone: s.uid || s.phone || "",
      owner_name: s.name || "",
      primary_location: s.primary_location || p.primary_location || "",
      community: s.community || p.community || "",
      city: s.city || p.city || "",
      region: s.region || p.region || "",
      country: s.country || p.country || "",
      lat:
        s.lat != null
          ? s.lat
          : p.lat != null
            ? p.lat
            : src.lat != null
              ? src.lat
              : null,
      lng:
        s.lng != null
          ? s.lng
          : p.lng != null
            ? p.lng
            : src.lng != null
              ? src.lng
              : null,
      km: src.km != null ? src.km : src.distance_km,
      kind: src.card_type || "product",
      created_at: p.created_at || ""
    };
  }

  if (raw.post && typeof raw.post === "object") {
    var post = raw.post;
    var author = raw.author || {};
    raw = {
      id: post.id,
      name: post.title || post.name,
      title: post.title || post.name,
      body: post.body || post.note || "",
      price: post.price,
      currency: post.currency || "NGN",
      phone: author.phone || "",
      owner_name: author.name || "",
      primary_location: author.primary_location || "",
      community: author.community || "",
      city: author.city || "",
      region: author.region || "",
      country: author.country || "",
      lat: author.lat != null ? author.lat : post.lat,
      lng: author.lng != null ? author.lng : post.lng,
      km: src.km != null ? src.km : src.distance_km,
      kind: "fairly_used",
      created_at: post.created_at || ""
    };
  }

  var owner = raw.owner || raw.merchant || raw.seller || {};
  if (typeof owner !== "object" || owner == null) owner = {};

  var id =
    raw.id ||
    raw.product_id ||
    raw.post_id ||
    "L" + Math.random().toString(36).slice(2, 10);

  var lat =
    raw.lat != null
      ? Number(raw.lat)
      : owner.lat != null
        ? Number(owner.lat)
        : null;
  var lng =
    raw.lng != null
      ? Number(raw.lng)
      : owner.lng != null
        ? Number(owner.lng)
        : null;
  if (lat != null && isNaN(lat)) lat = null;
  if (lng != null && isNaN(lng)) lng = null;

  var item = {
    id: String(id),
    name: raw.name || raw.title || raw.item_name || raw.business_name || "Item",
    title: raw.title || raw.name || "Item",
    body: raw.body || raw.note || raw.description || raw.category || "",
    price: raw.price != null ? raw.price : raw.amount,
    currency: raw.currency || "NGN",
    qty: raw.qty != null ? raw.qty : raw.quantity,
    perishable: !!raw.perishable,
    owner_name:
      raw.owner_name ||
      raw.merchant_name ||
      raw.seller_name ||
      owner.name ||
      raw.business_name ||
      raw.user_name ||
      "",
    phone:
      raw.phone ||
      raw.owner_phone ||
      raw.merchant_phone ||
      raw.seller_phone ||
      owner.phone ||
      owner.uid ||
      "",
    primary_location:
      raw.primary_location || owner.primary_location || raw.address || "",
    community: raw.community || owner.community || "",
    city: raw.city || owner.city || "",
    region: raw.region || owner.region || "",
    country: raw.country || owner.country || "",
    km: raw.km != null ? raw.km : raw.distance_km,
    lat: lat,
    lng: lng,
    kind: raw.kind || raw.type || "product",
    created_at: raw.created_at || ""
  };

  var me = SNM.seekerGeo();
  if (
    (item.km == null || item.km === "") &&
    me.lat != null &&
    me.lng != null &&
    item.lat != null &&
    item.lng != null
  ) {
    item.km = SNM.haversineKm(me.lat, me.lng, item.lat, item.lng);
  }

  SNM._listingsById[item.id] = item;
  return item;
};

/* ---------- cards ---------- */

SNM.cardHtml = function (item) {
  item = SNM.normalizeListing(item);
  var place = [item.primary_location, item.community, item.city]
    .filter(Boolean)
    .join(" · ");
  var price =
    item.price != null && item.price !== ""
      ? SNM.escapeHtml(String(item.currency || "NGN") + " " + item.price)
      : "";
  var dist =
    item.km != null && item.km !== "" && !isNaN(Number(item.km))
      ? SNM.escapeHtml(Number(item.km).toFixed(1) + " km away")
      : "";

  return (
    '<article class="card listing-card" data-listing-id="' +
    SNM.escapeHtml(item.id) +
    '">' +
    '<div class="title">' +
    SNM.escapeHtml(item.name) +
    (price ? " · " + price : "") +
    "</div>" +
    '<div class="meta">' +
    (item.owner_name
      ? "<div><strong>Seller:</strong> " +
        SNM.escapeHtml(item.owner_name) +
        "</div>"
      : "") +
    (item.phone
      ? "<div><strong>Phone:</strong> " + SNM.escapeHtml(item.phone) + "</div>"
      : "") +
    (place
      ? "<div><strong>Location:</strong> " + SNM.escapeHtml(place) + "</div>"
      : "") +
    (dist ? "<div class='dist'>" + dist + "</div>" : "") +
    (item.body
      ? "<div class='soft'>" +
        SNM.escapeHtml(String(item.body).slice(0, 180)) +
        "</div>"
      : "") +
    "</div>" +
    '<div class="card-actions">' +
    '<button type="button" class="btn small" data-act="detail" data-id="' +
    SNM.escapeHtml(item.id) +
    '">View</button>' +
    '<button type="button" class="btn small secondary" data-act="comment" data-id="' +
    SNM.escapeHtml(item.id) +
    '">Comment</button>' +
    '<button type="button" class="btn small secondary" data-act="share" data-id="' +
    SNM.escapeHtml(item.id) +
    '">Share</button>' +
    '<button type="button" class="btn small" data-act="message" data-phone="' +
    SNM.escapeHtml(item.phone) +
    '">Message seller</button>' +
    "</div>" +
    '<div class="comment-box hidden" data-comment-for="' +
    SNM.escapeHtml(item.id) +
    '">' +
    '<input type="text" class="comment-input" placeholder="Write a comment…" />' +
    '<button type="button" class="btn small" data-act="comment-send" data-id="' +
    SNM.escapeHtml(item.id) +
    '">Send</button></div>' +
    '<div class="comments-list" data-comments-for="' +
    SNM.escapeHtml(item.id) +
    '"></div></article>'
  );
};

SNM.appendComment = function (listingId, text) {
  var list = document.querySelector(
    '[data-comments-for="' + listingId + '"]'
  );
  if (!list) return;
  var row = document.createElement("div");
  row.className = "comment-row";
  var me = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var who = me.name || me.phone || "You";
  row.innerHTML =
    "<strong>" +
    SNM.escapeHtml(who) +
    "</strong> · " +
    SNM.escapeHtml(text);
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
};

/* ---------- detail sheet ---------- */

SNM.ensureDetailSheet = function () {
  var sheet = document.getElementById("listingDetail");
  if (!sheet) return null;
  if (!sheet._snmWired) {
    sheet._snmWired = true;
    var closeBtn = document.getElementById("btnCloseDetail");
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        SNM.closeListingDetail();
      };
    }
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) SNM.closeListingDetail();
    });
  }
  return sheet;
};

SNM.toggleMapExpand = function (forceOpen) {
  var mapEl =
    document.getElementById("listingDetailMap") ||
    document.getElementById("detailMap");
  if (!mapEl) return;
  var open =
    forceOpen === true ? true : forceOpen === false ? false : !SNM._mapExpanded;
  SNM._mapExpanded = open;
  if (open) {
    mapEl.classList.add("map-expanded");
    mapEl.style.height = "55vh";
    mapEl.style.minHeight = "55vh";
  } else {
    mapEl.classList.remove("map-expanded");
    mapEl.style.height = "";
    mapEl.style.minHeight = "180px";
  }
  setTimeout(function () {
    if (SNM._detailMap) {
      try {
        SNM._detailMap.invalidateSize(true);
      } catch (e) {}
    }
  }, 280);
};

SNM.closeListingDetail = function () {
  var sheet = document.getElementById("listingDetail");
  if (!sheet) return;
  SNM._mapExpanded = false;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.display = "none";
  SNM._detailItem = null;
  if (SNM._detailMap) {
    try {
      SNM._detailMap.remove();
    } catch (e) {}
    SNM._detailMap = null;
  }
  var mapEl =
    document.getElementById("listingDetailMap") ||
    document.getElementById("detailMap");
  if (mapEl) {
    mapEl.innerHTML = "";
    mapEl.classList.remove("map-expanded");
    mapEl.style.height = "";
  }
};

SNM.renderDetailMap = async function (item) {
  var mapEl =
    document.getElementById("listingDetailMap") ||
    document.getElementById("detailMap");
  if (!mapEl) return;

  var me = SNM.seekerGeo();
  var aLat = me.lat;
  var aLng = me.lng;
  var bLat = item.lat != null ? Number(item.lat) : null;
  var bLng = item.lng != null ? Number(item.lng) : null;
  if (bLat != null && isNaN(bLat)) bLat = null;
  if (bLng != null && isNaN(bLng)) bLng = null;

  var meta = document.getElementById("detailRouteMeta");

  if (bLat == null || bLng == null) {
    var placeQ = [
      item.primary_location,
      item.community,
      item.city,
      item.region,
      item.country || "Nigeria"
    ]
      .filter(Boolean)
      .join(", ");
    if (meta) meta.textContent = "Resolving seller place for route…";
    if (placeQ) {
      var pt = await SNM.geocodeText(placeQ);
      if (pt) {
        bLat = pt.lat;
        bLng = pt.lng;
        item.lat = pt.lat;
        item.lng = pt.lng;
        if (SNM._listingsById[item.id]) {
          SNM._listingsById[item.id].lat = pt.lat;
          SNM._listingsById[item.id].lng = pt.lng;
        }
      }
    }
  }

  mapEl.style.display = "block";
  mapEl.style.width = "100%";
  mapEl.style.minHeight = "180px";
  mapEl.style.height = mapEl.style.height || "200px";
  mapEl.innerHTML = "";

  if (typeof L === "undefined") {
    mapEl.innerHTML =
      "<p class='soft' style='padding:1rem'>Place: " +
      SNM.escapeHtml(
        [item.primary_location, item.community, item.city]
          .filter(Boolean)
          .join(" · ") || "—"
      ) +
      "</p>";
    return;
  }

  if (SNM._detailMap) {
    try {
      SNM._detailMap.remove();
    } catch (e) {}
    SNM._detailMap = null;
  }

  var center =
    bLat != null && bLng != null
      ? [bLat, bLng]
      : aLat != null && aLng != null
        ? [aLat, aLng]
        : [4.8156, 7.0498];

  SNM._detailMap = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true
  }).setView(center, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OSM"
  }).addTo(SNM._detailMap);

  var bounds = [];

  if (aLat != null && aLng != null) {
    L.circleMarker([aLat, aLng], {
      radius: 9,
      color: "#14532d",
      fillColor: "#86efac",
      fillOpacity: 0.95,
      weight: 2
    })
      .addTo(SNM._detailMap)
      .bindPopup("You");
    bounds.push([aLat, aLng]);
  }

  if (bLat != null && bLng != null) {
    L.marker([bLat, bLng])
      .addTo(SNM._detailMap)
      .bindPopup(item.name || item.title || "Seller");
    bounds.push([bLat, bLng]);
  }

  if (bounds.length === 2) {
    var line = L.polyline(bounds, {
      color: "#14532d",
      weight: 5,
      opacity: 0.95
    }).addTo(SNM._detailMap);
    try {
      SNM._detailMap.fitBounds(line.getBounds(), { padding: [36, 36] });
    } catch (e) {}
    var km = SNM.haversineKm(
      bounds[0][0],
      bounds[0][1],
      bounds[1][0],
      bounds[1][1]
    );
    if (meta) meta.textContent = "Route · \~" + km.toFixed(1) + " km (straight line)";
  } else if (meta) {
    meta.textContent =
      bounds.length === 1
        ? "Only one pin has coordinates — need both for the line."
        : "No GPS yet — text location only.";
  }

  function fixSize() {
    try {
      SNM._detailMap.invalidateSize(true);
      if (bounds.length === 2) {
        SNM._detailMap.fitBounds(bounds, { padding: [36, 36] });
      }
    } catch (e) {}
  }
  setTimeout(fixSize, 150);
  setTimeout(fixSize, 450);
};

SNM.openListingDetail = function (item) {
  item = SNM.normalizeListing(item);
  SNM._detailItem = item;

  var sheet = SNM.ensureDetailSheet();
  if (!sheet) return;

  var body =
    document.getElementById("listingDetailBody") ||
    document.getElementById("detailBody");
  var place = [
    item.primary_location,
    item.community,
    item.city,
    item.region,
    item.country
  ]
    .filter(Boolean)
    .join(" · ");

  if (body) {
    body.innerHTML =
      "<h3 style='margin:0 0 0.5rem'>" +
      SNM.escapeHtml(item.name || item.title || "Listing") +
      "</h3>" +
      (item.price != null
        ? "<p><strong>Price:</strong> " +
          SNM.escapeHtml(String(item.currency || "NGN") + " " + item.price) +
          "</p>"
        : "") +
      (item.owner_name
        ? "<p><strong>Seller:</strong> " +
          SNM.escapeHtml(item.owner_name) +
          "</p>"
        : "") +
      (item.phone
        ? "<p><strong>Phone:</strong> " + SNM.escapeHtml(item.phone) + "</p>"
        : "") +
      (place
        ? "<p><strong>Location:</strong> " + SNM.escapeHtml(place) + "</p>"
        : "") +
      (item.km != null && !isNaN(Number(item.km))
        ? "<p><strong>Distance:</strong> " +
          SNM.escapeHtml(Number(item.km).toFixed(1) + " km") +
          "</p>"
        : "") +
      (item.body ? "<p>" + SNM.escapeHtml(item.body) + "</p>" : "") +
      '<p class="soft" id="detailRouteMeta">Route: …</p>' +
      '<button type="button" class="btn block" id="btnDetailMessage" style="margin-top:0.5rem">Message seller</button>';
  }

  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  sheet.style.display = "block";

  var msgBtn = document.getElementById("btnDetailMessage");
  if (msgBtn) {
    msgBtn.onclick = function (e) {
      e.preventDefault();
      SNM.messageSeller(item.phone);
    };
  }

  var mapEl =
    document.getElementById("listingDetailMap") ||
    document.getElementById("detailMap");
  if (mapEl && !mapEl._snmTap) {
    mapEl._snmTap = true;
    mapEl.addEventListener("click", function () {
      SNM.toggleMapExpand(true);
    });
  }

  SNM.renderDetailMap(item);
};

SNM.messageSeller = function (phone) {
  phone = (phone || "").trim();
  if (!phone) {
    if (typeof SNM.toast === "function") SNM.toast("Seller phone missing");
    else alert("Seller phone missing");
    return;
  }
  if (phone.charAt(0) !== "+") phone = "+" + phone.replace(/\D/g, "");
  SNM.closeListingDetail();
  if (typeof SNM.startDmByPhone === "function") SNM.startDmByPhone(phone);
  else {
    SNM.showScreen("messages");
    var input = document.getElementById("dm-phone");
    if (input) input.value = phone;
  }
};

SNM.bindCardActions = function (root) {
  root = root || document.body;
  if (root._snmCardAct) return;
  root._snmCardAct = true;

  root.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) {
      var card = e.target.closest("[data-listing-id]");
      if (
        card &&
        !e.target.closest("button,a,input,.comment-box,.comments-list")
      ) {
        var it = SNM._listingsById[card.getAttribute("data-listing-id")];
        if (it) SNM.openListingDetail(it);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var act = btn.getAttribute("data-act");
    var id = btn.getAttribute("data-id");
    var phone = btn.getAttribute("data-phone");
    var item = id ? SNM._listingsById[id] : null;

    if (act === "detail" && item) SNM.openListingDetail(item);
    else if (act === "message")
      SNM.messageSeller(phone || (item && item.phone));
    else if (act === "share" && item) {
      var text =
        (item.name || "") +
        " — " +
        (item.owner_name || "") +
        " " +
        (item.phone || "") +
        " @ " +
        ([item.primary_location, item.community].filter(Boolean).join(", ") ||
          "Shop Near Me");
      if (navigator.share) {
        navigator.share({ title: item.name, text: text }).catch(function () {
          prompt("Copy:", text);
        });
      } else prompt("Copy:", text);
    } else if (act === "comment" && id) {
      var box = document.querySelector('[data-comment-for="' + id + '"]');
      if (box) box.classList.toggle("hidden");
    } else if (act === "comment-send" && id) {
      var wrap = document.querySelector('[data-comment-for="' + id + '"]');
      var input = wrap && wrap.querySelector(".comment-input");
      var textc = input ? (input.value || "").trim() : "";
      if (!textc) return;
      SNM.api("/fairly-used/comments", {
        method: "POST",
        body: { post_id: id, body: textc, text: textc }
      })
        .then(function () {
          SNM.appendComment(id, textc);
          if (input) input.value = "";
        })
        .catch(function () {
          SNM.appendComment(id, textc);
          if (input) input.val