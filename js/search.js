window.SNM = window.SNM || {};

SNM.PROVIDER_ROLES = [
  { id: "", label: "All roles" },
  { id: "merchant", label: "Merchant" },
  { id: "service_provider", label: "Service" },
  { id: "driver", label: "Driver" },
  { id: "emergency", label: "Emergency" }
];

SNM._providerRoleFilter = "";

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

SNM._renderSearchResults = function (rows, mode) {
  var box = document.getElementById("searchResults");
  if (!box) return;

  if (!rows || !rows.length) {
    box.innerHTML =
      '<p class="soft">No matches. Try another term, role filter, or wider km.</p>';
    return;
  }

  // People & services (merchant + service_provider + driver + emergency)
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
        return (
          '<article class="feed-card">' +
          '<div class="title">' +
          (r.name || "Provider") +
          "</div>" +
          '<div class="meta">' +
          SNM.roleLabel(role) +
          " · " +
          (r.primary_location || r.community || r.city || "") +
          (r.km != null ? " · " + r.km + " km" : "") +
          (r.live ? " · live" : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    return;
  }

  // Products / objects (any seller role behind the listing)
  box.innerHTML = rows
    .map(function (r) {
      var p = r.product || {};
      var s = r.seller || {};
      var sellerRole = s.role || r.role || "";
      var price =
        p.price != null
          ? (p.currency || "NGN") + " " + p.price
          : "Price on request";
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
        (r.km != null ? " · " + r.km + " km" : "") +
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
  SNM.renderAssistant("search", null);

  var user = SNM.getUser() || {};
  var q = SNM.val("searchQ");
  var community = SNM.val("searchCommunity") || user.community || "";
  var maxKm = SNM.val("searchMaxKm") || "100";

  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          community: community,
          city: user.city || "",
          region: user.region || "",
          country: user.country || "",
          max_km: maxKm,
          limit: 40
        })
    );
    SNM.renderAssistant(
      "search",
      data.assistant,
      (data.count != null ? data.count + " results" : "") +
        (data.directive ? " · " + data.directive : "")
    );
    SNM._renderSearchResults(data.results || [], "products");
  } catch (e) {
    SNM.renderAssistant("search", null);
    if (box) {
      box.innerHTML =
        '<p class="soft">Search failed: ' + (e.message || "error") + "</p>";
    }
  }
};

/** All non-buyer roles from API /search/merchants */
SNM.doProviderSearch = async function () {
  var box = document.getElementById("searchResults");
  if (box) box.innerHTML = '<p class="soft">Searching people & services…</p>';
  SNM.renderAssistant("search", null);

  var user = SNM.getUser() || {};
  var q = SNM.val("searchQ") || SNM.val("searchMerchant");
  var community = SNM.val("searchCommunity") || user.community || "";
  var maxKm = SNM.val("searchMaxKm") || "100";

  try {
    var data = await SNM.api(
      "/search/merchants" +
        SNM.qs({
          q: q,
          community: community,
          city: user.city || "",
          region: user.region || "",
          country: user.country || "",
          max_km: maxKm,
          limit: 40
        })
    );
    SNM.renderAssistant(
      "search",
      data.assistant,
      (data.count != null ? data.count + " results" : "") +
        (data.directive ? " · " + data.directive : "")
    );
    SNM._lastProviderRows = data.results || [];
    SNM._renderSearchResults(SNM._lastProviderRows, "providers");
  } catch (e) {
    SNM.renderAssistant("search", null);
    if (box) {
      box.innerHTML =
        '<p class="soft">Search failed: ' + (e.message || "error") + "</p>";
    }
  }
};

// backward-compatible name used in older HTML/comments
SNM.doMerchantSearch = function () {
  return SNM.doProviderSearch();
};

SNM.bindSearch = function () {
  var bp = document.getElementById("btnDoSearch");
  if (bp) {
    bp.innerHTML = '<i class="fas fa-box"></i> Products';
    bp.onclick = function () {
      SNM.doProductSearch();
    };
  }

  var bm = document.getElementById("btnSearchMerchants");
  if (bm) {
    bm.innerHTML = '<i class="fas fa-users"></i> People & services';
    bm.onclick = function () {
      SNM.doProviderSearch();
    };
  }

  // Optional role filter row under search buttons (created once)
  var form = bp && bp.closest ? bp.closest(".panel") : null;
  if (form && !document.getElementById("providerRoleFilters")) {
    var row = document.createElement("div");
    row.id = "providerRoleFilters";
    row.className = "link-row";
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
        SNM._providerRoleFilter = chip.getAttribute("data-provider-role") || "";
        if (SNM._lastProviderRows) {
          SNM._renderSearchResults(SNM._lastProviderRows, "providers");
        } else {
          SNM.doProviderSearch();
        }
      });
    });
  }
};
