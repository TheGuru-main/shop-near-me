window.SNM = window.SNM || {};

SNM.PROVIDER_ROLES = [
  { id: "", label: "All roles" },
  { id: "merchant", label: "Merchant" },
  { id: "service_provider", label: "Service" },
  { id: "driver", label: "Driver" },
  { id: "emergency", label: "Emergency" }
];

SNM._providerRoleFilter = "";
SNM._lastProviderRows = null;

SNM.roleLabel = function (role) {
  var map = {
    merchant: "Merchant",
    service_provider: "Service provider",
    driver: "Driver / logistics",
    emergency: "Emergency unit",
    buyer: "Buyer"
  };
  return map[role] || role || "Provider";
};

/** km · compass · rough ETA (crow-fly stub only) */
SNM.proximityLine = function (r) {
  var parts = [];
  if (r && r.km != null) parts.push(r.km + " km");
  if (r && r.compass) parts.push(r.compass);
  if (r && r.eta_min != null && r.eta_mode === "crow_fly_stub") {
    parts.push("\~" + r.eta_min + " min (est.)");
  }
  return parts.join(" · ");
};

SNM._seekerGeo = function () {
  var user = SNM.getUser() || {};
  return {
    lat: user.lat != null ? user.lat : undefined,
    lng: user.lng != null ? user.lng : undefined
  };
};

SNM._renderSearchResults = function (rows, mode) {
  var box = document.getElementById("searchResults");
  if (!box) return;

  if (!rows || !rows.length) {
    box.innerHTML =
      '<p class="soft">No matches. Try another term, role filter, or wider km.</p>';
    return;
  }

  if (mode === "providers") {
    var filter = SNM._providerRoleFilter || "";
    var list = filter
      ? rows.filter(function (r) {
          return (r.role || "") === filter;
        })
      : rows;

    if (!list.length) {
      box.innerHTML =
        '<p class="soft">No ' +
        SNM.roleLabel(filter) +
        " matches in this result set.</p>";
      return;
    }

    box.innerHTML = list
      .map(function (r) {
        var role = r.role || "";
        var prox = SNM.proximityLine(r);
        return (
          '<article class="feed-card">' +
          '<div class="title">' +
          (r.name || "Provider") +
          "</div>" +
          '<div class="meta">' +
          SNM.roleLabel(role) +
          " · " +
          (r.primary_location || r.community || r.city || "") +
          (prox ? " · " + prox : "") +
          (r.live ? " · live" : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    return;
  }

  box.innerHTML = rows
    .map(function (r) {
      var p = r.product || {};
      var s = r.seller || {};
      var sellerRole = s.role || r.role || "";
      var price =
        p.price != null
          ? (p.currency || "NGN") + " " + p.price
          : "Price on request";
      var prox = SNM.proximityLine(r);
      return (
        '<article class="feed-card">' +
        '<div class="title">' +
        (p.name || "Item") +
        "</div>" +
        '<div class="meta">' +
        (s.name || "Seller") +
        " · " +
        SNM.roleLabel(sellerRole) +
        " · " +
        (s.primary_location || s.community || "") +
        (prox ? " · " + prox : "") +
        (s.live ? " · live" : "") +
        "</div>" +
        '<div class="price">' +
        price +
        "</div>" +
        "</article>"
      );
    })
    .join("");
};

SNM.doProductSearch = async function () {
  var box = document.getElementById("searchResults");
  if (box) box.innerHTML = '<p class="soft">Searching products…</p>';
  if (typeof SNM.renderAssistant === "function") {
    SNM.renderAssistant("search", null);
  }

  var user = SNM.getUser() || {};
  var geo = SNM._seekerGeo();
  var q = typeof SNM.val === "function" ? SNM.val("searchQ") : (document.getElementById("searchQ") || {}).value || "";
  var community =
    (typeof SNM.val === "function" ? SNM.val("searchCommunity") : "") ||
    user.community ||
    "";
  var maxKm =
    (typeof SNM.val === "function" ? SNM.val("searchMaxKm") : "") || "2000";

  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          community: community,
          city: user.city || "",
          region: user.region || "",
          country: user.country || "",
          lat: geo.lat,
          lng: geo.lng,
          max_km: maxKm,
          limit: 40
        })
    );
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant(
        "search",
        data.assistant,
        (data.count != null ? data.count + " results" : "") +
          (data.directive ? " · " + data.directive : "") +
          (data.max_km != null ? " · ≤" + data.max_km + " km" : "")
      );
    }
    SNM._renderSearchResults(data.results || [], "products");
  } catch (e) {
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant("search", null);
    }
    if (box) {
      box.innerHTML =
        '<p class="soft">Search failed: ' + (e.message || "error") + "</p>";
    }
  }
};

SNM.doProviderSearch = async function () {
  var box = document.getElementById("searchResults");
  if (box) box.innerHTML = '<p class="soft">Searching people & services…</p>';
  if (typeof SNM.renderAssistant === "function") {
    SNM.renderAssistant("search", null);
  }

  var user = SNM.getUser() || {};
  var geo = SNM._seekerGeo();
  var q =
    (typeof SNM.val === "function"
      ? SNM.val("searchQ") || SNM.val("searchMerchant")
      : "") || "";
  var community =
    (typeof SNM.val === "function" ? SNM.val("searchCommunity") : "") ||
    user.community ||
    "";
  var maxKm =
    (typeof SNM.val === "function" ? SNM.val("searchMaxKm") : "") || "2000";

  try {
    var data = await SNM.api(
      "/search/merchants" +
        SNM.qs({
          q: q,
          community: community,
          city: user.city || "",
          region: user.region || "",
          country: user.country || "",
          lat: geo.lat,
          lng: geo.lng,
          max_km: maxKm,
          limit: 40
        })
    );
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant(
        "search",
        data.assistant,
        (data.count != null ? data.count + " results" : "") +
          (data.directive ? " · " + data.directive : "") +
          (data.max_km != null ? " · ≤" + data.max_km + " km" : "")
      );
    }
    SNM._lastProviderRows = data.results || [];
    SNM._renderSearchResults(SNM._lastProviderRows, "providers");
  } catch (e) {
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant("search", null);
    }
    if (box) {
      box.innerHTML =
        '<p class="soft">Search failed: ' + (e.message || "error") + "</p>";
    }
  }
};

SNM.doMerchantSearch = function () {
  return SNM.doProviderSearch();
};

SNM.bindSearch = function () {
  var maxInput = document.getElementById("searchMaxKm");
  if (maxInput && (!maxInput.value || maxInput.value === "100")) {
    maxInput.value = "2000";
    maxInput.max = "2000";
  }

  var bp = document.getElementById("btnDoSearch");
  if (bp) {
    bp.onclick = function () {
      SNM.doProductSearch();
    };
  }

  var bm = document.getElementById("btnSearchMerchants");
  if (bm) {
    bm.onclick = function () {
      SNM.doProviderSearch();
    };
  }

  var form = bp && bp.closest ? bp.closest(".panel, .content") : null;
  var existing = document.getElementById("providerRoleFilters");
  if (form && !existing) {
    var row = document.createElement("div");
    row.id = "providerRoleFilters";
    row.className = "chip-wrap";
    row.style.marginTop = "0.65rem";
    row.innerHTML = SNM.PROVIDER_ROLES.map(function (r) {
      return (
        '<button type="button" class="soft-chip" data-provider-role="' +
        r.id +
        '">' +
        r.label +
        "</button>"
      );
    }).join("");
    form.appendChild(row);
    row.querySelectorAll("[data-provider-role]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        SNM._providerRoleFilter =
          chip.getAttribute("data-provider-role") || "";
        if (SNM._lastProviderRows) {
          SNM._renderSearchResults(SNM._lastProviderRows, "providers");
        } else {
          SNM.doProviderSearch();
        }
      });
    });
  }
};
