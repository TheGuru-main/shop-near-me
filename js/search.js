
/* HOUSING_SYNONYMS_V1 */
SNM.LOCAL_SYNONYMS = Object.assign(SNM.LOCAL_SYNONYMS || {}, {
  room: ["bedroom", "bed room", "suite", "lodge", "hotel", "short-let", "self-contained", "apartment"],
  bedroom: ["room", "bed", "furniture", "mattress", "suite"],
  bed: ["bedroom", "mattress", "furniture"],
  furniture: ["bed", "bedroom", "chair", "table", "sofa"]
});


/* QUICK_ACTION_SYNONYMS_V1 — keep in sync with home chips + backend seed */
SNM.LOCAL_SYNONYMS = Object.assign(SNM.LOCAL_SYNONYMS || {}, {
  food: ["eatery", "restaurant", "rice", "beans", "meal", "kitchen", "buka", "catering"],
  breakfast: ["bread", "egg", "tea", "akara", "pap", "coffee", "toast"],
  hotel: ["lodge", "guest house", "short-let", "room", "suite", "bnb", "inn"],
  bus: ["transport", "coach", "driver", "logistics", "terminal"],
  keke: ["tricycle", "keke napep", "ride", "driver"],
  car: ["taxi", "cab", "ride", "driver", "hire"],
  dispatch: ["courier", "delivery", "bike", "okada", "logistics", "parcel", "errand"],
  "self-contained": ["self contained", "mini flat", "room", "apartment", "lodge", "rent"],
  apartment: ["flat", "self-contained", "duplex", "rent", "housing", "lodge"],
  fashion: ["clothes", "wear", "shirt", "boutique", "okirika", "tailor", "shoes"],
  repair: ["fix", "mechanic", "electrician", "plumber", "technician", "maintenance"],
  emergency: ["ambulance", "hospital", "clinic", "police", "fire", "rescue"],
  ride: ["keke", "okada", "bike", "car", "bus", "dispatch", "driver"],
  driver: ["keke", "okada", "bike", "car", "bus", "dispatch", "logistics"]
});


SNM.MOBILITY_KEYS = ["bus", "keke", "car", "dispatch", "okada", "bike", "tricycle", "driver", "logistics", "courier", "van", "ride"];
SNM.HOUSING_KEYS = ["self-contained", "self contained", "apartment", "flat", "lodge", "short-let", "room"];

SNM.isMobilityQuery = function (q) {
  q = String(q || "").toLowerCase();
  return SNM.MOBILITY_KEYS.some(function (k) { return q.indexOf(k) >= 0; });
};
SNM.isHousingQuery = function (q) {
  q = String(q || "").toLowerCase();
  return SNM.HOUSING_KEYS.some(function (k) { return q.indexOf(k) >= 0; });
};

SNM.listingSearchBlob = function (r) {
  r = r || {};
  var p = r.product || {};
  var o = r.owner || r.seller || r.merchant || r.author || {};
  return [
    r.name, r.title, p.name, p.title, p.item,
    r.category, p.category, r.business_type, p.business_type,
    r.role, r.kind, r.description, p.description, r.body, p.body,
    o.role, o.name, o.business_name,
    r.vehicle_type, r.coverage, p.vehicle_type
  ].join(" ").toLowerCase();
};

/** Strict: mobility query must match mobility tokens; never salon/barber/food */
SNM.filterByQueryCategory = function (rows, q) {
  rows = rows || [];
  q = String(q || "").toLowerCase().trim();
  if (!q) return rows;

  var mobility = SNM.isMobilityQuery(q);
  var housing = SNM.isHousingQuery(q);

  var block = /barber|salon|hair|spa|nail|beauty|fashion|cloth|rice|food|pharmacy|clinic/;

  return rows.filter(function (r) {
    var blob = SNM.listingSearchBlob(r);
    if (mobility) {
      if (block.test(blob) && !SNM.MOBILITY_KEYS.some(function (k) { return blob.indexOf(k) >= 0; })) {
        return false;
      }
      return SNM.MOBILITY_KEYS.some(function (k) { return blob.indexOf(k) >= 0; }) ||
        /driver|logistic/.test(blob);
    }
    if (housing) {
      return SNM.HOUSING_KEYS.some(function (k) { return blob.indexOf(k) >= 0; }) ||
        /apartment|flat|room|lodge|rent/.test(blob);
    }
    // general: require at least one query token in blob
    var tokens = q.split(/\s+/).filter(function (t) { return t.length >= 2; });
    if (!tokens.length) return true;
    return tokens.some(function (t) { return blob.indexOf(t) >= 0; });
  });
};


SNM.LOCAL_SYNONYMS = SNM.LOCAL_SYNONYMS || {};
SNM.LOCAL_SYNONYMS.ride = ["driver", "keke", "okada", "bike", "bus", "tricycle", "logistics", "courier", "van"];
SNM.LOCAL_SYNONYMS.driver = ["ride", "keke", "okada", "bike", "bus", "logistics", "courier"];
SNM.LOCAL_SYNONYMS.keke = ["tricycle", "ride", "driver", "okada"];
SNM.LOCAL_SYNONYMS.bike = ["okada", "ride", "driver", "motorcycle"];
SNM.LOCAL_SYNONYMS.bus = ["ride", "driver", "transport", "logistics"];
SNM.LOCAL_SYNONYMS.okada = ["bike", "ride", "driver"];

window.SNM = window.SNM || {};

/* Local fallback when API dictionary is empty */
SNM.LOCAL_SYNONYMS = SNM.LOCAL_SYNONYMS || {
  rice: ["ofada", "grain", "paddy", "fried rice", "food"],
  beans: ["oily bean", "protein", "ewa", "food"],
  hotel: ["lodge", "guest house", "short-let", "hospitality", "room"],
  room: ["hotel", "suite", "lodge", "house", "bnb", "short-let"],
  food: [
    "eatery", "restaurant", "kitchen", "meal", "rice", "beans", "oil",
    "bread", "indomie", "yam", "egg", "fish", "meat", "snacks"
  ],
  groceries: ["rice", "beans", "oil", "bread", "water", "gas"],
  phone: ["mobile", "handset", "smartphone", "electronics"],
  ride: ["driver", "logistics", "bike", "delivery"],
  water: ["pure water", "sachet", "bottle"],
  gas: ["cooking gas", "lpg", "cylinder"],
  fashion: ["clothes", "shoe", "wear", "shirts", "polo", "trouser", "okirika"],
  pharmacy: ["drug", "medicine", "chemist", "hospital"],
  footwear: ["slipper", "shoe", "pams", "shoes"],
  appliances: ["bed", "pot", "stove", "knife", "cup"],
  building_materials: [
    "cement", "iron", "gravel", "shovel", "spade", "hammer", "nail"
  ],
  work: [
    "plumber", "carpenter", "barber", "mechanic", "electrician", "painter"
  ],
  perishable: ["fruit", "pawpaw", "vegetable", "orange", "food"]
};

SNM.tokensOf = function (str) {
  return String(str || "")
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter(function (t) {
      return t.length >= 2;
    });
};

SNM.expandSearchTerms = async function (q) {
  var base = SNM.tokensOf(q);
  var extra = [];
  var seen = {};
  base.forEach(function (t) {
    seen[t] = 1;
  });

  base.forEach(function (t) {
    (SNM.LOCAL_SYNONYMS[t] || []).forEach(function (s) {
      var st = String(s).toLowerCase();
      if (!seen[st]) {
        seen[st] = 1;
        extra.push(st);
      }
    });
  });

  try {
    if (q && q.trim()) {
      var pack = await SNM.api(
        "/dictionary/synonyms" + SNM.qs({ q: q.trim() })
      );
      (pack.synonyms || []).forEach(function (s) {
        var st = String(s || "")
          .toLowerCase()
          .trim();
        if (st && !seen[st]) {
          seen[st] = 1;
          extra.push(st);
        }
      });
      var canon = (pack.canonical || "").toLowerCase().trim();
      if (canon && !seen[canon]) {
        seen[canon] = 1;
        extra.push(canon);
      }
    }
  } catch (e) {}

  return { tokens: base, expanded: extra, all: base.concat(extra) };
};

SNM.haystackListing = function (r) {
  var _p = (arguments[0] && arguments[0].product) || {};
  var _extra = [_p.name, _p.title, _p.description, _p.category].join(" ");

  r = r || {};
  var p = r.product || r || {};
  var s = r.seller || r.owner || {};
  return [
    p.name,
    p.title,
    p.category,
    p.body,
    p.description,
    r.category,
    r.business_type,
    r.role,
    s.name,
    s.primary_location,
    s.community,
    s.city,
    s.region
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

/** Letter + word match: token in text OR text word starts with token */
SNM.termHits = function (hay, term) {
  if (!term) return false;
  if (hay.indexOf(term) !== -1) return true;
  var words = hay.split(/[^a-z0-9+]+/);
  for (var i = 0; i < words.length; i++) {
    if (words[i].indexOf(term) === 0) return true;
  }
  return false;
};

SNM.buildSearchAssist = function (q, rows) {
  q = (q || "").trim();
  rows = rows || [];
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var place =
    [u.community, u.city].filter(Boolean).join(", ") || "your area";

  if (!rows.length) {
    return q
      ? 'No listings matched “' + q + '” near ' + place + "."
      : "No listings near " + place + " yet.";
  }

  var top =
    typeof SNM.normalizeListing === "function"
      ? SNM.normalizeListing(rows[0])
      : rows[0];
  var name = top.name || top.title || "a listing";
  var where =
    [top.community, top.city].filter(Boolean).join(", ") || place;
  var dist =
    top.km != null && !isNaN(Number(top.km))
      ? " · \~" + Number(top.km).toFixed(1) + " km"
      : "";

  return (
    rows.length +
    " match" +
    (rows.length === 1 ? "" : "es") +
    (q ? " for “" + q + "”" : "") +
    " near " +
    place +
    ". Top: " +
    name +
    " (" +
    where +
    dist +
    "). Related items in the same category may also help."
  );
};


SNM.doSearch = async function () {
  var input = document.getElementById("searchQ");
  var out = document.getElementById("searchResults");
  var ai = document.getElementById("searchAssistant");
  if (!out) return;

  var q = ((input && input.value) || "").trim();
  out.innerHTML = "<p class='muted'>Searching…</p>";
  if (ai) ai.textContent = "";

  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var geo =
    typeof SNM.seekerGeo === "function"
      ? SNM.seekerGeo()
      : { lat: u.lat, lng: u.lng };

  try {
    var expanded = await SNM.expandSearchTerms(q);

    /* SEARCH_Q_PRIMARY_V1 — do not OR-expand into API (pollutes keke/room) */
    var apiQ = q;

    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: apiQ,
          lat: geo.lat != null ? geo.lat : u.lat,
          lng: geo.lng != null ? geo.lng : u.lng,
          community: u.community || "",
          city: u.city || "",
          region: u.region || "",
          country: u.country || "",
          max_km: (SNM.MAX_KM || 80),
          limit: 40
        })
    );

    var rows = data.results || data.items || [];
    if (!Array.isArray(rows)) rows = [];

    var terms = expanded.all || [];
    var strict = rows;

    if (expanded.tokens && expanded.tokens.length) {
      strict = rows.filter(function (r) {
        var h = SNM.haystackListing(r);
        var typedOk = expanded.tokens.every(function (t) {
          return SNM.termHits(h, t);
        });
        if (typedOk) return true;
        return (expanded.expanded || []).some(function (t) {
          return SNM.termHits(h, t);
        });
      });

      /* if too strict emptied list, relax: any expanded term */
      if (!strict.length && terms.length) {
        strict = rows.filter(function (r) {
          var h = SNM.haystackListing(r);
          return terms.some(function (t) {
            return SNM.termHits(h, t);
          });
        });
      }
    }

    strict.sort(function (a, b) {
      var sa = SNM.scoreListingForQuery(a, q);
      var sb = SNM.scoreListingForQuery(b, q);
      if (sb !== sa) return sb - sa;
      var na = typeof SNM.normalizeListing === "function" ? SNM.normalizeListing(a) : a;
      var nb = typeof SNM.normalizeListing === "function" ? SNM.normalizeListing(b) : b;
      var ka = na.km != null && !isNaN(Number(na.km)) ? Number(na.km) : 999999;
      var kb = nb.km != null && !isNaN(Number(nb.km)) ? Number(nb.km) : 999999;
      return ka - kb;
    });
    /* drop zero-score noise when user typed a real query */
    if (q && q.length >= 2) {
      var hit = strict.filter(function (r) { return SNM.scoreListingForQuery(r, q) > 0; });
      if (hit.length) strict = hit;
    }

    if (ai) ai.textContent = SNM.buildSearchAssist(q, strict);

    
    if (typeof SNM.isMobilityQuery === "function" && SNM.isMobilityQuery(q)) {
      try {
        var more = await SNM.searchLiveDrivers(q);
        more.forEach(function (r) {
          strict.push(r);
        });
      } catch (eMob) {}
    }
    strict = SNM.filterMobilityResults(strict, q);
    strict = SNM.filterByQueryCategory(strict, q);
    if (typeof SNM.mergeLiveDriversIntoSearch === "function") {
      strict = await SNM.mergeLiveDriversIntoSearch(q, strict);
    }
    if (!strict.length) {
      out.innerHTML =
        "<p class='muted'>No matches for “" +
        (typeof SNM.esc === "function" ? SNM.esc(q || "your search") : q || "your search") +
        "”.</p>";
      return;
    }

    out.innerHTML =
      '<div class="card-rail">' +
      strict
        .map(function (r) {
          return typeof SNM.cardHtml === "function" ? SNM.cardHtml(r) : "";
        })
        .join("") +
      "</div>";

    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(out);
  } catch (err) {
    out.innerHTML =
      "<p class='muted'>Search failed. " +
      (typeof SNM.esc === "function"
        ? SNM.esc((err && err.message) || "")
        : (err && err.message) || "") +
      "</p>";
  }
};

SNM.onSearchEnter = function () {
  SNM.doSearch();
};

SNM.bindSearch = function () {
  if (SNM._searchBound) return;
  SNM._searchBound = true;
  var btn =
    document.getElementById("btnDoSearch") ||
    document.getElementById("btnSearchGo");
  var input =
    document.getElementById("searchQ") ||
    document.getElementById("search-input");
  if (btn) {
    btn.onclick = function () {
      SNM.doSearch();
    };
  }
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        SNM.doSearch();
      }
    });
  }
};


SNM.isMobilityQuery = function (q) {
  q = String(q || "").toLowerCase();
  var keys = ["ride", "driver", "keke", "okada", "bike", "bus", "tricycle", "logistics", "courier"];
  return keys.some(function (k) { return q.indexOf(k) >= 0; });
};

SNM.searchLiveDrivers = async function (q) {
  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q + " driver logistics ride",
          max_km: (SNM.MAX_KM || 80),
          limit: 40,
          lat: SNM._lastLat,
          lng: SNM._lastLng
        })
    );
    return data.results || data.items || [];
  } catch (e) {
    return [];
  }
};


SNM.filterMobilityResults = function (rows, q) {
  rows = rows || [];
  q = String(q || "").toLowerCase();
  var mobility = /ride|driver|keke|okada|bike|bus|tricycle|logistic|courier|van/;
  if (!mobility.test(q)) return rows;
  return rows.filter(function (r) {
    var t = (
      (r.name || "") + " " +
      (r.title || "") + " " +
      (r.category || "") + " " +
      (r.business_type || "") + " " +
      (r.role || "") + " " +
      ((r.owner && r.owner.role) || "")
    ).toLowerCase();
    if (/salon|hair|spa|nail|fashion|cloth|hotel|room|rice|food|pharmacy/.test(t) && !mobility.test(t)) {
      return false;
    }
    return mobility.test(t) || /driver|logistic|keke|okada|bike|bus|ride/.test(t);
  });
};


/* LIVE_DRIVER_SEARCH_V1 */
SNM.mergeLiveDriversIntoSearch = async function (q, rows) {
  rows = rows || [];
  q = String(q || "").toLowerCase();
  var keys = ["bus", "keke", "car", "dispatch", "okada", "bike", "driver", "ride", "logistics", "courier", "van"];
  var isMob = keys.some(function (k) { return q.indexOf(k) >= 0; });
  if (!isMob) return rows;

  var live = [];
  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: "driver logistics " + q,
          max_km: (SNM.MAX_KM || 80),
          limit: 40,
          lat: SNM._lastLat,
          lng: SNM._lastLng,
          live: 1,
          role: "driver"
        })
    );
    live = data.results || data.items || [];
  } catch (e) {}

  // Prefer rows marked live / active / driver role
  function score(r) {
    r = r || {};
    var o = r.owner || r.seller || {};
    var s = 0;
    if (r.live || r.active || o.live || o.active) s += 100;
    var blob = [r.name, r.title, r.category, r.business_type, r.role, o.role, r.vehicle_type]
      .join(" ")
      .toLowerCase();
    if (/driver|logistic|keke|okada|bike|bus|dispatch|car|van/.test(blob)) s += 50;
    if (r.km != null) s -= Number(r.km);
    return s;
  }

  var merged = live.concat(rows);
  var seen = {};
  var out = [];
  merged.forEach(function (r) {
    var id = String((r && (r.id || r.product_id)) || Math.random());
    if (seen[id]) return;
    seen[id] = 1;
    out.push(r);
  });
  out.sort(function (a, b) {
    return score(b) - score(a);
  });
  return out;
};


/* SEARCH_RANK_TITLE_V1 */
SNM.scoreListingForQuery = function (r, q) {
  var p = (r && r.product) || r || {};
  var title = String(p.name || p.title || r.name || r.title || "").toLowerCase();
  var blob = typeof SNM.listingSearchBlob === "function" ? SNM.listingSearchBlob(r) : title;
  q = String(q || "").toLowerCase().trim();
  var tokens = q.split(/\s+/).filter(function (t) { return t.length >= 2; });
  var score = 0;
  tokens.forEach(function (t) {
    if (title.indexOf(t) >= 0) score += 10;
    else if (blob.indexOf(t) >= 0) score += 2;
  });
  // synonym hits weaker
  (SNM.LOCAL_SYNONYMS[q] || []).forEach(function (s) {
    s = String(s).toLowerCase();
    if (title.indexOf(s) >= 0) score += 6;
    else if (blob.indexOf(s) >= 0) score += 1;
  });
  return score;
};


/* SEARCH_CARD_UI_V1 — forces compact card on search results */
SNM.searchCardHtml = function (item) {
  var x = typeof SNM.normalizeListing === "function" ? SNM.normalizeListing(item) : (item || {});
  if (x && x.id) {
    SNM._listingsById = SNM._listingsById || {};
    SNM._listingsById[String(x.id)] = x;
  }
  var esc = typeof SNM.esc === "function" ? SNM.esc : function (s) {
    return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  };
  var role = String(x.role || x.kind || x.business_type || "").toLowerCase();
  var isDriver = /driver|logistic/.test(role);
  var isService = /service/.test(role);
  var isMerchant = !isDriver && !isService && role !== "emergency" && x.kind !== "fairly_used";
  var img = x.image_url || (x.images && x.images[0]) || "";
  if (img && typeof SNM.mediaDisplayUrl === "function") img = SNM.mediaDisplayUrl(img);
  var media = img
    ? '<div class="card-media-wrap"><img class="card-thumb" data-act="zoom" src="' + esc(img) + '" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px;cursor:zoom-in"/></div>'
    : "";
  var dist = typeof SNM.formatDistance === "function" ? SNM.formatDistance(x.km) : "";
  var place = [x.primary, x.community, x.city].filter(Boolean).join(" · ");
  var actions =
    '<div class="card-actions" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' +
    '<button type="button" class="btn secondary small" data-act="detail">View</button>' +
    '<button type="button" class="btn secondary small" data-act="message">Msg</button>' +
    '<button type="button" class="btn secondary small" data-act="speak">Speak</button>';
  if (isMerchant && x.available !== false) {
    actions += '<button type="button" class="btn small" data-act="cart">+ Cart</button>';
  }
  actions += "</div>";
  return (
    '<article class="card listing-card card-compact" data-id="' + esc(x.id) +
    '" data-phone="' + esc(x.phone || "") +
    '" style="padding:8px;margin-bottom:8px">' +
    media +
    "<strong>" + esc(x.title || x.name || "Listing") + "</strong>" +
    '<p class="muted small" style="margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
    esc(x.sellerName || "") + (place ? " · " + esc(place) : "") + (dist ? " · " + esc(dist) : "") +
    "</p>" + actions + "</article>"
  );
};

(function () {
  var prev = SNM.doSearch;
  if (typeof prev !== "function") return;
  SNM.doSearch = async function () {
    await prev.apply(this, arguments);
    var out = document.getElementById("searchResults");
    if (!out) return;
    /* If results exist but lack Speak button, rebuild from last payload if we stashed it */
  };
})();

/* Prefer searchCardHtml inside doSearch render — patch map callback via wrapper */
(function () {
  if (SNM._searchCardUiWrapped) return;
  SNM._searchCardUiWrapped = true;
  var _card = SNM.cardHtml;
  SNM.cardHtml = function (item) {
    if (typeof SNM.searchCardHtml === "function") {
      try { return SNM.searchCardHtml(item); } catch (e) {}
    }
    return typeof _card === "function" ? _card(item) : "";
  };
})();

