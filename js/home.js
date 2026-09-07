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

SNM.normalizeListing = function (raw) {
  raw = raw || {};

  /* Search API: { product, seller, km, ... } */
  if (raw.product && typeof raw.product === "object") {
    var p = raw.product;
    var s = raw.seller || {};
    raw = {
      id: p.id,
      name: p.name || p.title,
      title: p.name || p.title,
      price: p.price,
      currency: p.currency || "NGN",
      qty: p.qty != null ? p.qty : p.quantity,
      perishable: !!p.perishable,
      available: p.available !== false,
      phone: s.uid || s.phone || "",
      owner_name: s.name || "",
      primary_location: s.primary_location || "",
      community: s.community || "",
      city: s.city || "",
      region: s.region || "",
      country: s.country || "",
      lat: s.lat != null ? s.lat : p.lat,
      lng: s.lng != null ? s.lng : p.lng,
      km: raw.km != null ? raw.km : raw.distance_km,
      created_at: p.created_at || "",
      kind: raw.card_type || "product"
    };
  }

  /* Fairly-used API: { post, author } */
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
      lat: author.lat,
      lng: author.lng,
      created_at: post.created_at || "",
      kind: "fairly_used"
    };
  }

  var owner = raw.owner || raw.merchant || raw.seller || {};
  if (typeof owner !== "object" || owner == null) owner = {};

  var id =
    raw.id ||
    raw.product_id ||
    raw.post_id ||
    "L" + Math.random().toString(36).slice(2, 10);

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
    lat: raw.lat != null ? raw.lat : owner.lat,
    lng: raw.lng != null ? raw.lng : owner.lng,
    kind: raw.kind || raw.type || "product",
    created_at: raw.created_at || ""
  };
  SNM._listingsById[item.id] = item;
  return item;
};

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
    item.km != null && item.km !== ""
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

SNM.ensureDetailSheet = function () {
  var sheet = document.getElementById("listingDetail");
  if (sheet) return sheet;

  sheet = document.createElement("div");
  sheet.id = "listingDetail";
  sheet.className = "detail-sheet hidden";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML =
    '<div class="detail-sheet-inner" id="detailSheetInner">' +
    '<div class="detail-head">' +
    '<strong id="detailTitle">Listing</strong>' +
    '<button type="button" class="icon-pill" id="btnCloseDetail" aria-label="Close">✕</button>' +
    "</div>" +
    '<div id="detailMapWrap" class="detail-map-wrap">' +
    '<div id="detailMap" class="detail-map"></div>' +
    '<button type="button" class="map-expand-btn" id="btnExpandMap" title="Expand map">⛶ Expand map</button>' +
    "</div>" +
    '<div id="detailBody" class="detail-body"></div>' +
    '<div class="detail-actions">' +
    '<button type="button" class="btn primary" id="btnDetailMessage">Message seller</button>' +
    '<button type="button" class="btn secondary" id="btnCloseDetailBottom">Close</button>' +
    "</div></div>";

  document.body.appendChild(sheet);

  function doClose(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    SNM.closeListingDetail();
  }

  document.getElementById("btnCloseDetail").onclick = doClose;
  document.getElementById("btnCloseDetailBottom").onclick = doClose;

  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) SNM.closeListingDetail();
  });

  var expandBtn = document.getElementById("btnExpandMap");
  if (expandBtn) {
    expandBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      SNM.toggleMapExpand();
    };
  }

  return sheet;
};

SNM.toggleMapExpand = function (forceOpen) {
  var wrap = document.getElementById("detailMapWrap");
  var inner = document.getElementById("detailSheetInner");
  var btn = document.getElementById("btnExpandMap");
  if (!wrap) return;

  var open =
    forceOpen === true ? true : forceOpen === false ? false : !SNM._mapExpanded;
  SNM._mapExpanded = open;

  if (open) {
    wrap.classList.add("map-expanded");
    if (inner) inner.classList.add("map-mode");
    if (btn) btn.textContent = "✕ Close map";
  } else {
    wrap.classList.remove("map-expanded");
    if (inner) inner.classList.remove("map-mode");
    if (btn) btn.textContent = "⛶ Expand map";
  }

  setTimeout(function () {
    if (SNM._detailMap) {
      try {
        SNM._detailMap.invalidateSize();
      } catch (e) {}
    }
  }, 280);
};

SNM.closeListingDetail = function () {
  var sheet = document.getElementById("listingDetail");
  if (!sheet) return;

  SNM._mapExpanded = false;
  var wrap = document.getElementById("detailMapWrap");
  var inner = document.getElementById("detailSheetInner");
  var btn = document.getElementById("btnExpandMap");
  if (wrap) wrap.classList.remove("map-expanded");
  if (inner) inner.classList.remove("map-mode");
  if (btn) btn.textContent = "⛶ Expand map";

  sheet.classList.add("hidden");
  sheet.classList.remove("open");
  sheet.style.display = "none";
  sheet.setAttribute("aria-hidden", "true");
  SNM._detailItem = null;

  if (SNM._detailMap) {
    try {
      SNM._detailMap.remove();
    } catch (e) {}
    SNM._detailMap = null;
  }
  var mapEl = document.getElementById("detailMap");
  if (mapEl) mapEl.innerHTML = "";
};

SNM.renderDetailMap = function (item) {
  var mapEl = document.getElementById("detailMap");
  if (!mapEl) return;
  var meta = document.getElementById("detailRouteMeta");
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var aLat = u.lat != null ? Number(u.lat) : SNM._lastLat;
  var aLng = u.lng != null ? Number(u.lng) : SNM._lastLng;
  var bLat = item.lat != null ? Number(item.lat) : null;
  var bLng = item.lng != null ? Number(item.lng) : null;

  if (typeof L === "undefined") {
    mapEl.innerHTML =
      "<p class='soft' style='padding:1rem'>Place: " +
      SNM.escapeHtml(
        [item.primary_location, item.community, item.city]
          .filter(Boolean)
          .join(" · ")
      ) +
      "</p>";
    if (meta) meta.textContent = "Add Leaflet for map line.";
    return;
  }

  mapEl.innerHTML = "";
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
        : [4.85, 7.05];

  SNM._detailMap = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true
  }).setView(center, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OSM"
  }).addTo(SNM._detailMap);

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
  }
  if (bLat != null && bLng != null) {
    L.marker([bLat, bLng])
      .addTo(SNM._detailMap)
      .bindPopup(item.name || "Seller");
  }
  if (aLat != null && aLng != null && bLat != null && bLng != null) {
    var line = L.polyline(
      [
        [aLat, aLng],
        [bLat, bLng]
      ],
      { color: "#14532d", weight: 4, opacity: 0.9 }
    ).addTo(SNM._detailMap);
    SNM._detailMap.fitBounds(line.getBounds().pad(0.28));
    var km =
      item.km != null
        ? Number(item.km)
        : SNM.haversineKm(aLat, aLng, bLat, bLng);
    if (meta) meta.textContent = "Straight line · \~" + km.toFixed(1) + " km";
  } else if (meta) {
    meta.textContent = "Seller GPS missing — text location only.";
  }

  setTimeout(function () {
    try {
      SNM._detailMap.invalidateSize();
    } catch (e) {}
  }, 300);
};

SNM.openListingDetail = function (item) {
  item = SNM.normalizeListing(item);
  SNM._detailItem = item;
  var sheet = SNM.ensureDetailSheet();
  var title = document.getElementById("detailTitle");
  var body = document.getElementById("detailBody");
  var place = [
    item.primary_location,
    item.community,
    item.city,
    item.region,
    item.country
  ]
    .filter(Boolean)
    .join(" · ");

  if (title) title.textContent = item.name || "Listing";
  if (body) {
    body.innerHTML =
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
      (item.km != null
        ? "<p><strong>Distance:</strong> " +
          SNM.escapeHtml(Number(item.km).toFixed(1) + " km") +
          "</p>"
        : "") +
      (item.body ? "<p>" + SNM.escapeHtml(item.body) + "</p>" : "") +
      '<p class="soft" id="detailRouteMeta">Route: …</p>';
  }

  sheet.classList.remove("hidden");
  sheet.classList.add("open");
  sheet.style.display = "flex";
  sheet.setAttribute("aria-hidden", "false");

  var msgBtn = document.getElementById("btnDetailMessage");
  if (msgBtn) {
    msgBtn.onclick = function (e) {
      e.preventDefault();
      SNM.messageSeller(item.phone);
    };
  }

  SNM._mapExpanded = false;
  var wrap = document.getElementById("detailMapWrap");
  var inner = document.getElementById("detailSheetInner");
  var expBtn = document.getElementById("btnExpandMap");
  if (wrap) wrap.classList.remove("map-expanded");
  if (inner) inner.classList.remove("map-mode");
  if (expBtn) expBtn.textContent = "⛶ Expand map";

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
          if (typeof SNM.toast === "function") SNM.toast("Comment sent");
        })
        .catch(function (err) {
          SNM.appendComment(id, textc);
          if (input) input.value = "";
          if (typeof SNM.toast === "function")
            SNM.toast(err.message || "Comment saved locally");
        });
    }
  });
};

SNM.fillHomeHeader = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var n = document.getElementById("homeName");
  var r = document.getElementById("homeRole");
  var p = document.getElementById("homePlace");
  if (n) n.textContent = u.name || "—";
  if (r) r.textContent = u.role || "—";
  if (p) {
    p.textContent = [u.primary_location, u.community, u.city, u.country]
      .filter(Boolean)
      .join(" · ");
  }
};

SNM.loadFeed = async function () {
  var box = document.getElementById("homeFeed");
  if (!box) return;
  box.innerHTML = "<p class='soft'>Loading…</p>";
  try {
    var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    var q = (u.prefs && u.prefs[0]) || "";
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          community: u.community || "",
          city: u.city || "",
          max_km: 2000,
          limit: 40,
          lat: u.lat,
          lng: u.lng
        })
    );
    var rows = data.results || data.items || [];
    var assistant =
      data.assistant && (data.assistant.message || data.assistant);
    box.innerHTML =
      (assistant
        ? '<div class="card assistant"><div class="meta">' +
          SNM.escapeHtml(String(assistant)) +
          "</div></div>"
        : "") +
      (rows.length
        ? rows
            .map(function (r) {
              return SNM.cardHtml(r);
            })
            .join("")
        : "<p class='soft'>No listings near you yet. Try Search or Fairly used.</p>");
    SNM.bindCardActions(box);
  } catch (e) {
    box.innerHTML =
      "<p class='soft'>" +
      SNM.escapeHtml(e.message || "Feed unavailable") +
      "</p>";
  }
};

SNM.initHomeMap = function () {
  var mapEl = document.getElementById("gsgMap");
  if (!mapEl) return;
  if (typeof L === "undefined") {
    mapEl.innerHTML =
      "<p class='muted' style='padding:1rem'>Map library not loaded.</p>";
    return;
  }
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var lat =
    u.lat != null
      ? Number(u.lat)
      : SNM._lastLat != null
        ? Number(SNM._lastLat)
        : 4.8156;
  var lng =
    u.lng != null
      ? Number(u.lng)
      : SNM._lastLng != null
        ? Number(SNM._lastLng)
        : 7.0498;

  if (SNM._homeMap) {
    try {
      SNM._homeMap.remove();
    } catch (e) {}
    SNM._homeMap = null;
  }
  mapEl.innerHTML = "";
  mapEl.style.minHeight = mapEl.style.minHeight || "180px";

  try {
    SNM._homeMap = L.map(mapEl).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM"
    }).addTo(SNM._homeMap);
    L.circleMarker([lat, lng], {
      radius: 9,
      color: "#14532d",
      fillColor: "#86efac",
      fillOpacity: 0.95,
      weight: 2
    })
      .addTo(SNM._homeMap)
      .bindPopup("You");
    setTimeout(function () {
      try {
        SNM._homeMap.invalidateSize();
      } catch (e) {}
    }, 280);
  } catch (err) {
    mapEl.innerHTML =
      "<p class='muted' style='padding:1rem'>Map unavailable.</p>";
  }
};

SNM.enterHome = function (navigate) {
  if (navigate !== false) SNM.showScreen("home");
  SNM.fillHomeHeader();
  SNM.loadFeed();
  SNM.initHomeMap();
  if (typeof SNM.renderTabbar === "function") SNM.renderTabbar("home");
};

SNM.fillProfile = function () {
  var body = document.getElementById("profileBody");
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  if (!body) return;
  body.innerHTML =
    "<p><strong>" +
    SNM.escapeHtml(u.name || "") +
    "</strong></p>" +
    "<p class='soft'>" +
    SNM.escapeHtml(u.role || "") +
    "</p>" +
    "<p class='soft'>" +
    SNM.escapeHtml(u.phone || "") +
    "</p>" +
    "<p class='soft'>" +
    SNM.escapeHtml(u.primary_location || "") +
    "</p>";
};

SNM.bindHome = function () {
  SNM.ensureDetailSheet();
  SNM.bindCardActions(document.body);
  var refresh = document.getElementById("btnRefreshFeed");
  if (refresh && !refresh._snmWired) {
    refresh._snmWired = true;
    refresh.onclick = function () {
      SNM.loadFeed();
    };
  }
  var searchTop = document.getElementById("btnSearchTop");
  if (searchTop && !searchTop._snmWired) {
    searchTop._snmWired = true;
    searchTop.onclick = function () {
      SNM.showScreen("search");
    };
  }
  var perish = document.getElementById("btnPerishables");
  if (perish && !perish._snmWired) {
    perish._snmWired = true;
    perish.onclick = function () {
      var q = document.getElementById("searchQ");
      if (q) q.value = "perishable";
      SNM.showScreen("search");
      if (typeof SNM.runProducts === "function") SNM.runProducts();
    };
  }
};
