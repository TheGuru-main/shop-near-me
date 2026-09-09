window.SNM = window.SNM || {};

/* Local fallback when API dictionary is empty */
SNM.LOCAL_SYNONYMS = SNM.LOCAL_SYNONYMS || {
  rice: ["ofada", "grain", "paddy", "fried rice"],
  beans: ["oily bean", "protein", "ewa"],
  hotel: ["lodge", "guest house", "short-let", "hospitality", "room"],
  room: ["hotel", "suite", "lodge"],
  food: ["eatery", "restaurant", "kitchen", "meal"],
  phone: ["mobile", "handset", "smartphone"],
  ride: ["driver", "logistics", "bike", "delivery"],
  water: ["pure water", "sachet", "bottle"],
  gas: ["cooking gas", "lpg", "cylinder"]
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
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          lat: geo.lat != null ? geo.lat : u.lat,
          lng: geo.lng != null ? geo.lng : u.lng,
          community: u.community || "",
          city: u.city || "",
          region: u.region || "",
          country: u.country || "",
          max_km: SNM.MAX_KM || 2000,
          limit: 40
        })
    );

    var rows = data.results || data.items || [];
    if (!Array.isArray(rows)) rows = [];

    var terms = expanded.all;
    var strict = rows;
    if (expanded.tokens.length) {
      strict = rows.filter(function (r) {
        var h = SNM.haystackListing(r);
        /* every user-typed token must hit; synonyms only boost ranking */
        return expanded.tokens.every(function (t) {
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
      var na =
        typeof SNM.normalizeListing === "function"
          ? SNM.normalizeListing(a)
          : a;
      var nb =
        typeof SNM.normalizeListing === "function"
          ? SNM.normalizeListing(b)
          : b;
      var ka = na.km != null && !isNaN(Number(na.km)) ? Number(na.km) : 999999;
      var kb = nb.km != null && !isNaN(Number(nb.km)) ? Number(nb.km) : 999999;
      return ka - kb;
    });

    if (ai) ai.textContent = SNM.buildSearchAssist(q, strict);

    if (!strict.length) {
      out.innerHTML =
        "<p class='muted'>No matches for “" +
        SNM.esc(q || "your search") +
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
      SNM.esc((err && err.message) || "") +
      "</p>";
  }
};

SNM.onSearchEnter = function () {
  SNM.doSearch();
};

SNM.bindSearch = function () {
  var btn = document.getElementById("btnDoSearch");
  if (btn) {
    btn.onclick = function () {
      SNM.doSearch();
    };
  }
  var input = document.getElementById("searchQ");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") SNM.doSearch();
    });
  }
};

