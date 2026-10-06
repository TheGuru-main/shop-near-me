
SNM.listingRoleLabel = function (raw) {
  raw = raw || {};
  var p = raw.product || raw;
  var o = raw.seller || raw.owner || raw.merchant || {};
  var role = String(
    raw.role || raw.business_type || p.business_type || o.role || ""
  ).toLowerCase();
  var cat = String(raw.category || p.category || "").toLowerCase();
  if (role === "logistics") role = "driver";
  if (role === "driver" || cat === "logistics") return "Driver";
  if (role === "merchant" || role === "retail") return "Merchant";
  if (role === "service") {
    if (/hotel|lodge|hospitality|guest/.test(cat + " " + (p.name || "")))
      return "Hotel / hospitality";
    return "Service";
  }
  if (role === "emergency") return "Emergency";
  if (role === "buyer") return "Buyer";
  if (role) return role.charAt(0).toUpperCase() + role.slice(1);
  return "Provider";
};


/* MERCHANT_CART_BTN_V1 */
SNM.isMerchantListing = function (x) {
  x = x || {};
  var role = String(
    x.role ||
      x.business_type ||
      (x.owner && x.owner.role) ||
      (x.raw && x.raw.business_type) ||
      ""
  ).toLowerCase();
  var cat = String(x.category || "").toLowerCase();
  if (/driver|logistic|service|hotel|hospitality|dispatch|keke|okada|ride|bus/.test(role))
    return false;
  if (/driver|logistic|service|hotel|dispatch|ride/.test(cat)) return false;
  if (x.kind === "fairly_used") return false;
  // merchant / product / retail / empty role with a price → cart ok
  if (/merchant|retail|product|food|grocery|fashion|electronics/.test(role + " " + cat))
    return true;
  if (role === "" || role === "buyer") {
    // product rows from search often omit role — allow if has price and not mobility name
    var name = String(x.title || x.name || "").toLowerCase();
    if (/keke|okada|driver|ride|dispatch|bus\b/.test(name)) return false;
    return x.price != null || x.amount != null;
  }
  return role === "merchant";
};

SNM.cartButtonHtml = function (x) {
  if (!SNM.isMerchantListing(x)) return "";
  return (
    '<button type="button" class="btn small cart-add-btn" data-act="cart" aria-label="Add to cart">' +
    '<i class="fa-solid fa-plus"></i></button>'
  );
};

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

  var p = raw.product || {};
  var img =
    raw.image_url ||
    raw.media_url ||
    raw.photo_url ||
    p.image_url ||
    p.media_url ||
    owner.image_url ||
    "";
  var refs = [];
  var mr = raw.media_refs || raw.mediaRefs || p.media_refs || p.mediaRefs || "";
  if (typeof mr === "string" && mr.trim()) {
    refs = mr.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  } else if (Array.isArray(mr)) {
    refs = mr.filter(Boolean);
  }
  if (img && refs.indexOf(img) < 0) refs.unshift(img);

  var roleRaw = (
    raw.role ||
    owner.role ||
    raw.business_type ||
    raw.kind ||
    raw.category ||
    ""
  ).toString().toLowerCase();
  var roleLabel = "Seller";
  if (roleRaw.indexOf("service") >= 0) roleLabel = "Service provider";
  else if (roleRaw.indexOf("hotel") >= 0 || roleRaw.indexOf("hospital") >= 0 || roleRaw.indexOf("accom") >= 0 || roleRaw.indexOf("lodge") >= 0)
    roleLabel = "Accommodation";
  else if (roleRaw.indexOf("driver") >= 0 || roleRaw.indexOf("logistics") >= 0 || roleRaw.indexOf("ride") >= 0)
    roleLabel = "Driver";
  else if (roleRaw.indexOf("emergency") >= 0) roleLabel = "Emergency";
  else if (roleRaw.indexOf("merchant") >= 0 || roleRaw.indexOf("retail") >= 0 || roleRaw.indexOf("shop") >= 0)
    roleLabel = "Merchant";
  else if (roleRaw.indexOf("fairly") >= 0) roleLabel = "Fairly used";
  else if (roleRaw.indexOf("home") >= 0) roleLabel = "Home service";

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
    roleLabel: roleLabel,
    role: roleRaw,
    primary: owner.primary_location || raw.primary_location || "",
    community: owner.community || raw.community || "",
    city: owner.city || raw.city || "",
    lat: raw.lat != null ? raw.lat : owner.lat,
    lng: raw.lng != null ? raw.lng : owner.lng,
    km: raw.km != null ? raw.km : raw.distance_km,
    active: !!(raw.active || raw.open || owner.live || raw.live),
    image_url: refs[0] || img || "",
    images: refs,
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

SNM.isMerchantListing = function (x) {
  x = x || {};
  var role = String(x.role || x.business_type || x.kind || "").toLowerCase();
  if (role.indexOf("service") >= 0) return false;
  if (role.indexOf("emergency") >= 0) return false;
  if (role.indexOf("driver") >= 0 || role.indexOf("logistic") >= 0) return false;
  if (x.kind === "fairly_used" || x.kind === "service") return false;
  return true;
};

SNM.cardHtml = function (item) {
  var x = SNM.normalizeListing(item);
  if (x && x.id) SNM._listingsById[String(x.id)] = x;
  var dist = SNM.formatDistance(x.km);
  if (
    typeof SNM.crowFlyMeta === "function" &&
    typeof SNM.seekerGeo === "function" &&
    x.lat != null &&
    x.lng != null
  ) {
    var me = SNM.seekerGeo();
    if (me && me.lat != null) {
      var fly = SNM.crowFlyMeta(me.lat, me.lng, Number(x.lat), Number(x.lng));
      if (fly.label) dist = fly.label;
      if (fly.km != null) x.km = fly.km;
      x.bearing = fly.bearing;
    }
  }
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
  var imgs = (x.images && x.images.length)
    ? x.images
    : (x.image_url ? [x.image_url] : []);
  var thumb = "";
  if (imgs.length) {
    var slides = imgs
      .map(function (u, i) {
        var src =
          typeof SNM.mediaDisplayUrl === "function"
            ? SNM.mediaDisplayUrl(u)
            : u;
        return (
          '<div class="card-slide' +
          (i === 0 ? " active" : "") +
          '"><img class="card-thumb shop-thumb" src="' +
          SNM.esc(src) +
          '" alt="" loading="lazy" /></div>'
        );
      })
      .join("");
    var dots =
      imgs.length > 1
        ? '<div class="card-slide-dots">' +
          imgs
            .map(function (_, i) {
              return (
                '<button type="button" class="card-dot' +
                (i === 0 ? " active" : "") +
                '" data-slide="' +
                i +
                '" aria-label="Slide ' +
                (i + 1) +
                '"></button>'
              );
            })
            .join("") +
          "</div>"
        : "";
    var nav =
      imgs.length > 1
        ? '<button type="button" class="card-slide-prev" aria-label="Prev">‹</button>' +
          '<button type="button" class="card-slide-next" aria-label="Next">›</button>'
        : "";
    thumb =
      '<div class="shop-card-media card-carousel" data-slide-count="' +
      imgs.length +
      '">' +
      '<div class="card-slide-track">' +
      slides +
      "</div>" +
      nav +
      dots +
      "</div>";
  }

  var sellerLine =
    '<div class="card-seller-line"><span class="seller-role">' +
    SNM.esc(x.roleLabel || 'Seller') +
    '</span> · <strong>' +
    SNM.esc(x.sellerName || '') +
    '</strong></div>';

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
    thumb + sellerLine +
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
    '<button type="button" class="btn secondary small" data-act="speak" aria-label="Read aloud"><i class="fa-solid fa-volume-high"></i></button>' +
    (typeof SNM.cartButtonHtml === "function" ? SNM.cartButtonHtml(x) : "") + '' +
    (typeof SNM.isMerchantListing === "function" && SNM.isMerchantListing(x)
      ? '<button type="button" class="btn small" data-act="cart">Add to cart</button>'
      : "") +
    '<button type="button" data-act="profile">Profile</button>' +
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
  if (typeof SNM.bindCardDetailTap === "function") SNM.bindCardDetailTap(root || document);

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
      var kind = (card.getAttribute("data-kind") || "").toLowerCase();
      if (kind !== "fairly_used") return;
 {
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
    if (act === "cart") {
      var id = card.getAttribute("data-id") || "";
      var listing =
        (SNM._listingsById && SNM._listingsById[id]) ||
        (typeof SNM.normalizeListing === "function"
          ? SNM.normalizeListing({ id: id, phone: phone })
          : { id: id, phone: phone });
      if (typeof SNM.addToCart === "function") SNM.addToCart(listing);
      return;
    }
    if (act === "profile") {
      if (typeof SNM.openUserProfile === "function") SNM.openUserProfile(phone);
      return;
    }
    if (act === "message") {
      SNM.messageSeller(listing.phone, listing.seller_name);
      return;
    }
    if (act === "view" || act === "detail") {
        if (typeof SNM.openListingDetail === "function") {
          SNM.openListingDetail(listing);
        } else {
          alert("Detail unavailable");
        }
        return;
      }
      if (act === "message") {
      SNM.openListingDetail(listing);
    }
  });
};

SNM.bindCards = function () {
  SNM.bindCardActions(document);
};

SNM._wireCardCarousel = function (root) {
  root = root || document;
  root.querySelectorAll(".card-carousel").forEach(function (car) {
    if (car._snmCar) return;
    car._snmCar = true;
    var slides = car.querySelectorAll(".card-slide");
    var dots = car.querySelectorAll(".card-dot");
    var i = 0;
    function go(n) {
      if (!slides.length) return;
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, j) {
        s.classList.toggle("active", j === i);
      });
      dots.forEach(function (d, j) {
        d.classList.toggle("active", j === i);
      });
    }
    var prev = car.querySelector(".card-slide-prev");
    var next = car.querySelector(".card-slide-next");
    if (prev)
      prev.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(i - 1);
      };
    if (next)
      next.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(i + 1);
      };
    dots.forEach(function (d) {
      d.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(parseInt(d.getAttribute("data-slide"), 10) || 0);
      };
    });
  });
};

(function () {
  var _bca = SNM.bindCardActions;
  if (typeof _bca === "function") {
    SNM.bindCardActions = function (root) {
      _bca.apply(this, arguments);
      SNM._wireCardCarousel(root || document);
    };
  }
})();


SNM.bindCardDetailTap = function (root) {
  root = root || document;
  if (root._snmDetailTap) return;
  root._snmDetailTap = true;
  root.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("button, a, input, textarea, label, [data-act]")) return;
      var card = e.target.closest(".card[data-id], article.card[data-id]");
      if (!card) return;
      var id = card.getAttribute("data-id") || "";
      var phone = card.getAttribute("data-phone") || "";
      var item =
        (SNM._listingsById && SNM._listingsById[id]) ||
        (typeof SNM.normalizeListing === "function"
          ? SNM.normalizeListing({ id: id, phone: phone })
          : { id: id, phone: phone });
      if (typeof SNM.openListingDetail === "function") {
        e.preventDefault();
        SNM.openListingDetail(item);
      }
    },
    false
  );
};



/* CARD_TAP_PROFILE_V2 */
SNM._listingsById = SNM._listingsById || {};

SNM.bindCardActions = function (root) {
  root = root || document;
  if (!root.addEventListener) return;
  if (root._snmCardClickV2) return;
  root._snmCardClickV2 = true;
  root.addEventListener("click", function (e) {
    var actEl = e.target.closest("[data-act]");
    var card = e.target.closest(".card[data-id], article.card[data-id], .card");
    if (!card) return;

    var id = card.getAttribute("data-id") || "";
    var phone =
      card.getAttribute("data-phone") ||
      (actEl && actEl.getAttribute("data-phone")) ||
      "";
    var listing =
      (id && SNM._listingsById && SNM._listingsById[id]) ||
      (typeof SNM.normalizeListing === "function"
        ? SNM.normalizeListing({
            id: id,
            phone: phone,
            name: ((card.querySelector(".title") || {}).textContent || "")
          })
        : { id: id, phone: phone });

    if (actEl) {
      var act = actEl.getAttribute("data-act") || "";
      e.preventDefault();
      e.stopPropagation();
      if (act === "profile") {
        var ph = actEl.getAttribute("data-phone") || phone || listing.phone || "";
        if (typeof SNM.openUserProfile === "function") SNM.openUserProfile(ph);
        else alert("Profile unavailable");
        return;
      }
      if (act === "detail") {
        if (typeof SNM.openListingDetail === "function") SNM.openListingDetail(listing);
        return;
      }
      if (act === "message") {
        if (typeof SNM.messageSeller === "function") SNM.messageSeller(phone || listing.phone);
        return;
      }
      if (act === "cart") {
        if (typeof SNM.addToCart === "function") SNM.addToCart(listing);
        return;
      }
      return;
    }

    if (e.target.closest("input, textarea, select, label")) return;
    if (typeof SNM.openListingDetail === "function") {
      e.preventDefault();
      SNM.openListingDetail(listing);
    }
  }, false);
};

SNM.bindCards = function () {
  SNM.bindCardActions(document);
};



/* CARD_OPEN_DETAIL_V3 */
SNM._listingsById = SNM._listingsById || {};

SNM.bindCardActions = function (root) {
  root = root || document;
  if (!root.addEventListener) return;
  if (root._snmCardOpenV3) return;
  root._snmCardOpenV3 = true;

  root.addEventListener(
    "click",
    function (e) {
      var actEl = e.target.closest("[data-act]");
      var card = e.target.closest(
        ".card[data-id], article.card[data-id], article.card, .card"
      );
      if (!card) return;

      var id = card.getAttribute("data-id") || "";
      var phone =
        card.getAttribute("data-phone") ||
        (actEl && actEl.getAttribute("data-phone")) ||
        "";

      var listing =
        (id && SNM._listingsById[id]) ||
        (typeof SNM.normalizeListing === "function"
          ? SNM.normalizeListing({
              id: id,
              phone: phone,
              name: ((card.querySelector(".title") || {}).textContent || "")
            })
          : { id: id, phone: phone });

      function openDetail() {
        if (typeof SNM.openListingDetail === "function") {
          SNM.openListingDetail(listing);
        } else {
          alert("openListingDetail missing");
        }
      }

      if (actEl) {
        var act = (actEl.getAttribute("data-act") || "").toLowerCase();
        e.preventDefault();
        e.stopPropagation();
        if (act === "view" || act === "detail") {
          openDetail();
          return;
        }
        if (act === "profile") {
          var ph =
            actEl.getAttribute("data-phone") || phone || listing.phone || "";
          if (typeof SNM.openUserProfile === "function") SNM.openUserProfile(ph);
          return;
        }
        if (act === "message") {
          if (typeof SNM.messageSeller === "function")
            SNM.messageSeller(phone || listing.phone);
          return;
        }
        if (act === "cart") {
          if (typeof SNM.addToCart === "function") SNM.addToCart(listing);
          return;
        }
        if (act === "share") return;
        return;
      }

      if (e.target.closest("input, textarea, select, label, a")) return;
      openDetail();
    },
    false
  );
};

SNM.bindCards = function () {
  SNM.bindCardActions(document);
};

// Also catch plain "View" buttons without data-act
if (!window._snmViewBtnWire) {
  window._snmViewBtnWire = true;
  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var label = (btn.textContent || "").trim().toLowerCase();
      if (label !== "view" && !btn.getAttribute("data-act")) return;
      if (label === "view" && !btn.getAttribute("data-act")) {
        var card = btn.closest(".card, article.card");
        if (!card) return;
        e.preventDefault();
        e.stopPropagation();
        var id = card.getAttribute("data-id") || "";
        var listing =
          (id && SNM._listingsById && SNM._listingsById[id]) ||
          (typeof SNM.normalizeListing === "function"
            ? SNM.normalizeListing({
                id: id,
                phone: card.getAttribute("data-phone") || ""
              })
            : { id: id });
        if (typeof SNM.openListingDetail === "function") {
          SNM.openListingDetail(listing);
        }
      }
    },
    true
  );
}


/* ROLE_LABEL_ON_CARDS_V1 */
SNM.listingRoleLabel = SNM.listingRoleLabel || function (raw) {
  raw = raw || {};
  var p = raw.product || raw;
  var o = raw.seller || raw.owner || raw.merchant || {};
  var role = String(
    raw.role || raw.business_type || p.business_type || o.role || ""
  ).toLowerCase();
  var cat = String(raw.category || p.category || "").toLowerCase();
  if (role === "logistics") role = "driver";
  if (role === "driver" || cat === "logistics") return "Driver";
  if (role === "merchant" || role === "retail") return "Merchant";
  if (role === "service") {
    if (/hotel|lodge|hospitality|guest|short-let/.test(cat + " " + (p.name || p.title || "")))
      return "Hotel / hospitality";
    return "Service";
  }
  if (role === "emergency") return "Emergency";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Provider";
};

(function () {
  var prev = SNM.normalizeListing;
  SNM.normalizeListing = function (raw) {
    raw = raw || {};
    var p = raw.product || raw;
    var o = raw.seller || raw.owner || raw.merchant || {};
    var base =
      typeof prev === "function"
        ? prev(raw)
        : {
            id: p.id || raw.id || "",
            title: p.name || p.title || raw.name || "Listing",
            phone: o.phone || raw.phone || "",
            km: raw.km
          };
    base.title = base.title || p.name || p.title || "Listing";
    base.phone = base.phone || o.phone || "";
    base.sellerName =
      o.name || o.business_name || base.sellerName || "Provider";
    base.roleLabel = SNM.listingRoleLabel(raw);
    base.role = raw.role || raw.business_type || p.business_type || "";
    base.business_type = raw.business_type || p.business_type || "";
    base.community = o.community || base.community || "";
    base.city = o.city || base.city || "";
    if (raw.km != null) base.km = raw.km;
    base.raw = raw;
    return base;
  };
})();

(function () {
  var prevCard = SNM.cardHtml;
  if (typeof prevCard !== "function") return;
  SNM.cardHtml = function (item) {
    var html = prevCard(item);
    var x =
      typeof SNM.normalizeListing === "function"
        ? SNM.normalizeListing(item)
        : item || {};
    var label = x.roleLabel || SNM.listingRoleLabel(item);
    // Replace visible "Seller" chip/text once if present
    html = html.replace(/>\s*Seller\s*</g, ">" + label + "<");
    html = html.replace(
      /class="[^"]*seller[^"]*"[^>]*>\s*Seller/i,
      function (m) {
        return m.replace(/Seller/i, label);
      }
    );
    // If card has no role chip, inject after title-ish
    if (html.indexOf("role-chip") === -1 && label) {
      html = html.replace(
        /(<[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<\/[^>]+>)/,
        "$1<span class=\"chip role-chip\">" +
          (typeof SNM.esc === "function" ? SNM.esc(label) : label) +
          "</span>"
      );
    }
    return html;
  };
})();


/* CARD_ROLE_PRESENCE_CART_V1 */
SNM.listingRoleLabel = function (raw) {
  raw = raw || {};
  var p = raw.product || raw;
  var o = raw.seller || raw.owner || {};
  var role = String(raw.role || raw.business_type || p.business_type || o.role || "").toLowerCase();
  var cat = String(raw.category || p.category || "").toLowerCase();
  if (role === "logistics") role = "driver";
  if (role === "driver" || cat === "logistics") return "Driver";
  if (role === "merchant" || role === "retail") return "Merchant";
  if (role === "service") {
    if (/hotel|lodge|hospitality|guest|short-let/.test(cat + " " + (p.name || "")))
      return "Hotel / hospitality";
    return "Service";
  }
  if (role === "emergency") return "Emergency";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Provider";
};

SNM.presenceLabel = function (raw) {
  raw = raw || {};
  var p = raw.product || raw;
  var o = raw.seller || raw.owner || {};
  var live = !!(raw.live || p.live || o.live || raw.active);
  var hb = o.hb_at || raw.hb_at || p.hb_at;
  if (!live && p.available === false) return "Inactive";
  if (!live) return "Inactive";
  if (hb) {
    var age = Date.now() - new Date(hb).getTime();
    if (!isNaN(age) && age < 5 * 60 * 1000) return "Active now";
    if (!isNaN(age) && age < 60 * 60 * 1000) return "Active moments ago";
  }
  return "Active now";
};

SNM.stockLabel = function (raw) {
  var p = (raw && raw.product) || raw || {};
  if (p.available === false) return "Out of stock";
  return "In stock";
};

(function () {
  var prev = SNM.normalizeListing;
  SNM.normalizeListing = function (raw) {
    raw = raw || {};
    var p = raw.product || raw;
    var o = raw.seller || raw.owner || raw.merchant || {};
    var x = typeof prev === "function" ? prev(raw) : {};
    x.id = x.id || p.id || raw.id || "";
    x.title = p.name || p.title || x.title || "Listing";
    x.phone = o.phone || x.phone || "";
    x.sellerName = o.name || o.business_name || x.sellerName || "Provider";
    x.roleLabel = SNM.listingRoleLabel(raw);
    x.role = String(raw.role || raw.business_type || p.business_type || "").toLowerCase();
    if (x.role === "logistics") x.role = "driver";
    x.km = raw.km != null ? raw.km : x.km;
    x.available = p.available !== false;
    x.live = !!(raw.live || p.live || o.live);
    x.community = o.community || x.community || "";
    x.city = o.city || x.city || "";
    x.primary = o.primary_location || x.primary || "";
    x.raw = raw;
    return x;
  };
})();

(function () {
  var prevCard = SNM.cardHtml;
  SNM.cardHtml = function (item) {
    var x = typeof SNM.normalizeListing === "function" ? SNM.normalizeListing(item) : item || {};
    var role = (x.role || "").toLowerCase();
    var isDriver = role === "driver";
    var isService = role === "service";
    var isMerchant = role === "merchant" || role === "retail" || (!isDriver && !isService && role !== "emergency");
    var statusChip;
    if (isDriver || isService || role === "emergency") {
      statusChip = SNM.presenceLabel(item);
    } else {
      statusChip = SNM.stockLabel(item);
    }
    var esc = typeof SNM.esc === "function" ? SNM.esc : function (s) { return String(s || ""); };
    var dist = typeof SNM.formatDistance === "function" ? SNM.formatDistance(x.km) : (x.km != null ? x.km + " km" : "");
    var phone = x.phone || "";
    var place = [x.primary, x.community, x.city].filter(Boolean).join(" · ");

    var actions =
      '<div class="card-actions">' +
      '<button type="button" class="btn secondary small" data-act="detail">View</button>' +
      '<button type="button" class="btn secondary small" data-act="share">Share</button>' +
      '<button type="button" class="btn secondary small" data-act="message">Message</button>' +
      '<button type="button" class="btn secondary small" data-act="speak" aria-label="Read aloud"><i class="fa-solid fa-volume-high"></i></button>';
    if (isMerchant && x.available) {
      actions +=
        '<button type="button" class="btn small" data-act="cart" aria-label="Add to cart">+</button>';
    }
    actions += "</div>";

    return (
      '<article class="card listing-card" data-id="' +
      esc(x.id) +
      '" data-phone="' +
      esc(phone) +
      '" data-role="' +
      esc(role) +
      '">' +
      '<div class="card-top">' +
      '<span class="chip">' +
      esc(statusChip) +
      "</span> " +
      '<span class="chip role-chip">' +
      esc(x.roleLabel || "") +
      "</span>" +
      "</div>" +
      '<div class="title"><strong>' +
      esc(x.title) +
      "</strong></div>" +
      '<p class="muted small">' +
      esc(x.roleLabel || "Provider") +
      ": " +
      esc(x.sellerName) +
      "</p>" +
      (phone ? '<p class="muted small">Phone: ' + esc(phone) + "</p>" : "") +
      (place ? '<p class="muted small">Location: ' + esc(place) + "</p>" : "") +
      (dist ? '<p class="muted small">' + esc(dist) + "</p>" : "") +
      actions +
      "</article>"
    );
  };
})();


/* CARD_SPEAK_V1 */
SNM.speakText = function (text) {
  text = String(text || "").trim();
  if (!text || !window.speechSynthesis) {
    alert("Voice not available on this device");
    return;
  }
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  u.lang = "en-NG";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
};

SNM.cardSpeakLine = function (x) {
  x = x || {};
  var bits = [
    x.title || x.name,
    x.roleLabel,
    x.sellerName,
    x.price != null ? (x.currency || "NGN") + " " + x.price : "",
    x.available === false ? "Out of stock" : "",
    typeof SNM.formatDistance === "function" ? SNM.formatDistance(x.km) : ""
  ].filter(Boolean);
  return bits.join(". ");
};


/* CARD_SPEAK_WIRE_V1 — runs after all bindCardActions overrides */
(function () {
  if (window._snmSpeakWired) return;
  window._snmSpeakWired = true;
  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target.closest('[data-act="speak"]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var card = btn.closest(".listing-card, .card[data-id], article.card");
      var listing = {};
      if (card && typeof SNM._listingFromCard === "function") {
        listing = SNM._listingFromCard(card) || {};
      }
      var id = card && card.getAttribute("data-id");
      if (id && SNM._listingsById && SNM._listingsById[id]) {
        listing = SNM._listingsById[id];
      }
      var line =
        typeof SNM.cardSpeakLine === "function"
          ? SNM.cardSpeakLine(listing)
          : listing.title || listing.name || btn.getAttribute("aria-label") || "Listing";
      if (typeof SNM.speakText === "function") SNM.speakText(line);
    },
    true
  );
})();

