window.SNM = window.SNM || {};

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function formatDistance(km) {
    var k = num(km);
    if (k == null) return "";
    if (k < 1) return Math.max(1, Math.round(k * 1000)) + " m away";
    return k.toFixed(k < 10 ? 1 : 0) + " km away";
  }

  function pick(obj, keys, fallback) {
    if (!obj) return fallback || "";
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v != null && String(v).trim() !== "") return v;
    }
    return fallback || "";
  }

  /** Normalize product / provider / fairly-used rows */
  SNM.normalizeListing = function (row) {
    row = row || {};
    var owner = row.owner || row.merchant || row.seller || row.user || {};
    return {
      id: pick(row, ["id", "product_id", "post_id"]),
      name: pick(row, ["name", "title", "item_name", "item"], "Listing"),
      price: row.price,
      currency: pick(row, ["currency"], "NGN"),
      qty: pick(row, ["qty", "quantity", "stock"], ""),
      description: pick(row, ["description", "body", "note", "text"], ""),
      category: pick(row, ["category", "role", "type"], ""),
      perishable: !!row.perishable,
      available: row.available !== false,
      km: row.km != null ? row.km : row.distance_km != null ? row.distance_km : row.distance,
      lat: num(row.lat != null ? row.lat : row.latitude),
      lng: num(row.lng != null ? row.lng : row.longitude),
      primary_location: pick(row, ["primary_location", "place", "address"], pick(owner, ["primary_location"], "")),
      city: pick(row, ["city"], pick(owner, ["city"], "")),
      community: pick(row, ["community"], pick(owner, ["community"], "")),
      merchant_name: pick(row, ["merchant_name", "owner_name", "seller_name", "business_name"], pick(owner, ["name", "business_name"], "")),
      merchant_phone: pick(row, ["merchant_phone", "owner_phone", "seller_phone", "phone"], pick(owner, ["phone"], "")),
      owner_id: pick(row, ["owner_id", "user_id", "seller_id"], pick(owner, ["id"], "")),
      role: pick(row, ["role", "owner_role"], pick(owner, ["role"], "")),
      created_at: row.created_at || row.addedAt || row.posted_at || ""
    };
  };

  SNM.cardHtml = function (row, opts) {
    opts = opts || {};
    var L = SNM.normalizeListing(row);
    var dist = formatDistance(L.km);
    var priceLine = "";
    if (L.price != null && L.price !== "") {
      priceLine =
        '<div class="meta"><strong>' +
        esc(L.currency) +
        " " +
        esc(L.price) +
        "</strong>" +
        (L.qty !== "" ? " · qty " + esc(L.qty) : "") +
        "</div>";
    }
    var place = [L.primary_location, L.community, L.city].filter(Boolean).join(" · ");
    var actions =
      opts.actions === false
        ? ""
        : '<div class="card-actions">' +
          '<button type="button" class="btn small action" data-act="comment">Comment</button>' +
          '<button type="button" class="btn small action" data-act="share">Share</button>' +
          '<button type="button" class="btn small action" data-act="message">Message seller</button>' +
          "</div>";

    return (
      '<article class="product-card feed-card" data-listing-id="' +
      esc(L.id) +
      '" data-phone="' +
      esc(L.merchant_phone) +
      '" data-lat="' +
      (L.lat != null ? L.lat : "") +
      '" data-lng="' +
      (L.lng != null ? L.lng : "") +
      '">' +
      '<div class="title">' +
      esc(L.name) +
      "</div>" +
      priceLine +
      '<div class="meta">' +
      esc(L.merchant_name || "Seller") +
      (L.role ? " · " + esc(L.role) : "") +
      (L.merchant_phone ? " · " + esc(L.merchant_phone) : "") +
      "</div>" +
      (place ? '<div class="place">' + esc(place) + "</div>" : "") +
      (L.description
        ? '<div class="meta" style="margin-top:0.25rem">' + esc(L.description).slice(0, 160) + "</div>"
        : "") +
      (dist ? '<span class="distance">' + esc(dist) + "</span>" : "") +
      actions +
      '<div class="comment-panel hidden" data-comments-for="' +
      esc(L.id) +
      '">' +
      '<div class="comment-list"></div>' +
      '<div class="comment-form">' +
      '<input type="text" placeholder="Write a comment..." data-comment-input />' +
      '<button type="button" class="btn small" data-act="comment-send">Send</button>' +
      "</div></div>" +
      "</article>"
    );
  };

  function ensureShareSheet() {
    var el = document.getElementById("shareSheet");
    if (el) return el;
    el = document.createElement("div");
    el.id = "shareSheet";
    el.className = "share-sheet hidden";
    el.innerHTML =
      "<h3>Share to</h3>" +
      '<button type="button" data-share="contact">Contact</button>' +
      '<button type="button" data-share="shop">Shop Near Me</button>' +
      '<button type="button" data-share="himate">Hi-Mate Messenger</button>' +
      '<button type="button" class="btn secondary block" id="btnShareClose">Close</button>';
    document.body.appendChild(el);
    el.querySelector("#btnShareClose").onclick = function () {
      el.classList.add("hidden");
    };
    el.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.onclick = function () {
        var t = btn.getAttribute("data-share");
        if (typeof SNM.toast === "function") {
          SNM.toast(
            t === "himate"
              ? "Hi-Mate share — connect when messenger is linked"
              : t === "contact"
              ? "Share to contact — device share coming next"
              : "Shared to Shop Near Me feed context"
          );
        }
        el.classList.add("hidden");
      };
    });
    return el;
  }

  function ensureDetailPanel() {
    var el = document.getElementById("listingDetail");
    if (el) return el;
    el = document.createElement("div");
    el.id = "listingDetail";
    el.className = "detail-panel hidden";
    el.innerHTML =
      '<div class="detail-head">' +
      "<h2 id=\"detailTitle\">Details</h2>" +
      '<button type="button" class="icon-btn" id="btnDetailClose" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="detail-body">' +
      '<div id="detailMeta" class="meta"></div>' +
      '<div class="detail-map"><div id="detailMap"></div></div>' +
      '<p class="map-readout" id="detailReadout"></p>' +
      '<div id="detailBodyText" class="meta"></div>' +
      '<div class="card-actions" id="detailActions">' +
      '<button type="button" class="btn small action" data-act="comment">Comment</button>' +
      '<button type="button" class="btn small action" data-act="share">Share</button>' +
      '<button type="button" class="btn small action" data-act="message">Message seller</button>' +
      "</div></div>";
    document.body.appendChild(el);
    el.querySelector("#btnDetailClose").onclick = function () {
      el.classList.add("hidden");
      if (SNM._detailMap) {
        try {
          SNM._detailMap.remove();
        } catch (e) {}
        SNM._detailMap = null;
      }
    };
    return el;
  }

  SNM.openShareSheet = function () {
    ensureShareSheet().classList.remove("hidden");
  };

  SNM.messageSeller = async function (phone) {
    phone = String(phone || "").trim();
    if (!phone) {
      if (typeof SNM.toast === "function") SNM.toast("Seller phone unavailable");
      return;
    }
    if (typeof SNM.showScreen === "function") SNM.showScreen("messages");
    if (typeof SNM.startDmByPhone === "function") {
      await SNM.startDmByPhone(phone);
      return;
    }
    var input = document.getElementById("dm-phone");
    if (input) {
      input.value = phone;
      var btn = document.getElementById("btnDmStart");
      if (btn) btn.click();
    }
  };

  SNM.openListingDetail = function (row) {
    var L = SNM.normalizeListing(row);
    var panel = ensureDetailPanel();
    panel.classList.remove("hidden");
    document.getElementById("detailTitle").textContent = L.name;
    document.getElementById("detailMeta").innerHTML =
      "<strong>" +
      esc(L.merchant_name || "Seller") +
      "</strong><br>" +
      esc(L.merchant_phone || "") +
      "<br>" +
      esc([L.primary_location, L.community, L.city].filter(Boolean).join(" · "));
    document.getElementById("detailBodyText").textContent = L.description || "";
    document.getElementById("detailReadout").textContent = formatDistance(L.km) || "";

    panel.dataset.phone = L.merchant_phone || "";
    panel.querySelectorAll("#detailActions [data-act]").forEach(function (btn) {
      btn.onclick = function () {
        var act = btn.getAttribute("data-act");
        if (act === "share") SNM.openShareSheet();
        if (act === "message") SNM.messageSeller(L.merchant_phone);
        if (act === "comment") {
          panel.classList.add("hidden");
          if (typeof SNM.toast === "function") SNM.toast("Open the card comment section on the list");
        }
      };
    });

    var user = typeof SNM.getUser === "function" ? SNM.getUser() || {} : {};
    var aLat = num(user.lat);
    var aLng = num(user.lng);
    var bLat = L.lat;
    var bLng = L.lng;

    setTimeout(function () {
      var box = document.getElementById("detailMap");
      if (!box || typeof L === "undefined" || !window.L) return;
      if (SNM._detailMap) {
        try {
          SNM._detailMap.remove();
        } catch (e) {}
      }
      var center = bLat != null && bLng != null ? [bLat, bLng] : aLat != null ? [aLat, aLng] : [4.9, 7.0];
      SNM._detailMap = window.L.map("detailMap").setView(center, 14);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OSM"
      }).addTo(SNM._detailMap);
      var pts = [];
      if (aLat != null && aLng != null) {
        window.L.marker([aLat, aLng]).addTo(SNM._detailMap).bindPopup("You");
        pts.push([aLat, aLng]);
      }
      if (bLat != null && bLng != null) {
        window.L.marker([bLat, bLng]).addTo(SNM._detailMap).bindPopup(L.name);
        pts.push([bLat, bLng]);
      }
      if (pts.length === 2) {
        window.L.polyline(pts, { color: "#14532d", weight: 4 }).addTo(SNM._detailMap);
        SNM._detailMap.fitBounds(pts, { padding: [24, 24] });
        document.getElementById("detailReadout").textContent =
          (formatDistance(L.km) || "Route") + " · pin to pin";
      }
      SNM._detailMap.invalidateSize();
    }, 80);
  };

  SNM.bindCardActions = function (root) {
    root = root || document;
    root.addEventListener("click", function (e) {
      var actBtn = e.target.closest("[data-act]");
      var card = e.target.closest(".product-card, .feed-card");
      if (!card) return;

      if (actBtn && card.contains(actBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var act = actBtn.getAttribute("data-act");
        var phone = card.getAttribute("data-phone") || "";
        if (act === "share") {
          SNM.openShareSheet();
          return;
        }
        if (act === "message") {
          SNM.messageSeller(phone);
          return;
        }
        if (act === "comment") {
          var panel = card.querySelector(".comment-panel");
          if (panel) panel.classList.toggle("hidden");
          return;
        }
        if (act === "comment-send") {
          var input = card.querySelector("[data-comment-input]");
          var list = card.querySelector(".comment-list");
          var text = input && input.value.trim();
          if (!text || !list) return;
          var div = document.createElement("div");
          div.className = "comment-item";
          var u = typeof SNM.getUser === "function" ? SNM.getUser() || {} : {};
          div.textContent = (u.name || "You") + ": " + text;
          list.appendChild(div);
          input.value = "";
          return;
        }
        return;
      }

      // card body → detail (ignore action row)
      if (e.target.closest(".card-actions, .comment-panel")) return;
      var row = {
        id: card.getAttribute("data-listing-id"),
        name: (card.querySelector(".title") || {}).textContent,
        merchant_phone: card.getAttribute("data-phone"),
        lat: card.getAttribute("data-lat"),
        lng: card.getAttribute("data-lng"),
        primary_location: (card.querySelector(".place") || {}).textContent,
        merchant_name: ((card.querySelector(".meta") || {}).textContent || "").split("·")[0]
      };
      SNM.openListingDetail(row);
    });
  };
})();
