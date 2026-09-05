window.SNM = window.SNM || {};

SNM.esc = function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

SNM.formatDistance = function (km) {
  if (km == null || isNaN(km)) return "";
  if (km < 1) return Math.round(km * 1000) + " m away";
  return (Math.round(km * 10) / 10) + " km away";
};

SNM.normalizeListing = function (raw) {
  raw = raw || {};
  var owner = raw.owner || raw.merchant || raw.seller || {};
  return {
    id: raw.id || raw.product_id || raw.post_id || "",
    title: raw.name || raw.title || raw.item || "Listing",
    price: raw.price != null ? raw.price : raw.amount,
    currency: raw.currency || "NGN",
    qty: raw.qty != null ? raw.qty : raw.quantity,
    perishable: !!raw.perishable,
    available: raw.available !== false,
    phone: raw.phone || owner.phone || raw.owner_phone || "",
    sellerName: owner.name || raw.business_name || raw.seller_name || raw.owner_name || "Seller",
    primary: owner.primary_location || raw.primary_location || "",
    community: owner.community || raw.community || "",
    city: owner.city || raw.city || "",
    lat: raw.lat != null ? raw.lat : owner.lat,
    lng: raw.lng != null ? raw.lng : owner.lng,
    km: raw.km != null ? raw.km : raw.distance_km,
    active: raw.active || raw.open || owner.live,
    created_at: raw.created_at || raw.addedAt || "",
    raw: raw
  };
};

SNM.cardHtml = function (item) {
  var x = SNM.normalizeListing(item);
  var dist = SNM.formatDistance(x.km);
  var priceLine =
    x.price != null && x.price !== ""
      ? "<div class='price'>" + SNM.esc(x.currency) + " " + SNM.esc(x.price) + "</div>"
      : "";
  var status = x.active ? " · Open/Active" : "";
  return (
    '<article class="listing-card" data-id="' +
    SNM.esc(x.id) +
    '" data-phone="' +
    SNM.esc(x.phone) +
    '">' +
    '<div class="title">' +
    SNM.esc(x.title) +
    "</div>" +
    priceLine +
    "<div class='meta'>" +
    SNM.esc(x.sellerName) +
    (x.phone ? " · " + SNM.esc(x.phone) : "") +
    "</div>" +
    "<div class='meta'>" +
    SNM.esc([x.primary, x.community, x.city].filter(Boolean).join(" · ")) +
    (dist ? " · " + SNM.esc(dist) : "") +
    SNM.esc(status) +
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
    '<button type="button" data-share="contact">Contact / phone</button>' +
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
  body.innerHTML =
    "<h3>" +
    SNM.esc(x.title) +
    "</h3>" +
    "<p class='meta'>" +
    SNM.esc(x.sellerName) +
    " · " +
    SNM.esc(x.phone) +
    "</p>" +
    "<p class='meta'>" +
    SNM.esc(x.primary) +
    "</p>" +
    "<p class='meta'>" +
    SNM.esc(SNM.formatDistance(x.km)) +
    "</p>";
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");

  var mapEl = document.getElementById("listingDetailMap");
  if (mapEl && typeof L !== "undefined") {
    mapEl.innerHTML = "";
    var user = SNM.getUser() || {};
    var points = [];
    if (user.lat != null && user.lng != null) points.push([user.lat, user.lng]);
    if (x.lat != null && x.lng != null) points.push([x.lat, x.lng]);
    if (!points.length) {
      mapEl.innerHTML = "<p class='muted' style='padding:1rem'>No coordinates for route.</p>";
      return;
    }
    if (SNM._detailMap) {
      try {
        SNM._detailMap.remove();
      } catch (e) {}
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
      SNM._detailMap.invalidateSize();
    }, 200);
  }
};

SNM.messageSeller = async function (phone) {
  phone = (phone || "").trim();
  if (!phone) {
    alert("No seller phone on this listing.");
    return;
  }
  if (typeof SNM.startDmByPhone === "function") {
    await SNM.startDmByPhone(phone);
  } else {
    var input = document.getElementById("dm-phone");
    if (input) input.value = phone;
    SNM.showScreen("messages");
  }
};

SNM.bindCardActions = function (root) {
  root = root || document;
  root.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var card = btn.closest(".listing-card");
    if (!card) return;
    var act = btn.getAttribute("data-act");
    var phone = card.getAttribute("data-phone") || "";

    if (act === "comment") {
      var box = card.querySelector("[data-comment-box]");
      if (box) box.classList.toggle("hidden");
      return;
    }
    if (act === "comment-send") {
      var input = card.querySelector("[data-comment-input]");
      var list = card.querySelector("[data-comment-list]");
      var t = (input && input.value) || "";
      t = t.trim();
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
      sheet.dataset.phone = phone;
      sheet.dataset.title = (card.querySelector(".title") || {}).textContent || "";
      sheet.classList.add("open");
      sheet.onclick = function (ev) {
        var s = ev.target.getAttribute("data-share");
        if (!s) return;
        var text = (sheet.dataset.title || "Listing") + " · " + (sheet.dataset.phone || "");
        if (s === "copy" && navigator.clipboard) navigator.clipboard.writeText(text);
        else if (s === "system" && navigator.share) navigator.share({ text: text });
        else if (s === "contact") {
          SNM.messageSeller(sheet.dataset.phone);
        }
        sheet.classList.remove("open");
      };
      return;
    }
    if (act === "message") {
      SNM.messageSeller(phone);
      return;
    }
    if (act === "detail") {
      SNM.openListingDetail({
        name: (card.querySelector(".title") || {}).textContent,
        phone: phone,
        primary_location: "",
        id: card.getAttribute("data-id")
      });
    }
  });
};

SNM.bindCards = function () {
  SNM.bindCardActions(document);
};
