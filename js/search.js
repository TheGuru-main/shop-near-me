window.SNM = window.SNM || {};

SNM.cardHtml = function (r) {
  r = r || {};
  var item =
    r.item || r.name || r.title || r.product_name || "Listing";
  var price = r.price;
  var currency = r.currency || "";
  var priceLine =
    price != null && price !== ""
      ? (currency ? currency + " " : "") + price
      : "";

  var owner =
    r.merchant ||
    r.owner_name ||
    r.business_name ||
    r.provider_name ||
    r.unit_name ||
    (r.owner && r.owner.name) ||
    "";

  var role =
    r.role ||
    r.owner_role ||
    r.business_type ||
    (r.owner && r.owner.role) ||
    "";

  var phone =
    r.phone ||
    r.owner_phone ||
    r.merchant_phone ||
    (r.owner && r.owner.phone) ||
    "";

  var place =
    r.primary_location ||
    (r.owner && r.owner.primary_location) ||
    "";
  var community = r.community || (r.owner && r.owner.community) || "";
  var city = r.city || (r.owner && r.owner.city) || "";
  var country = r.country || (r.owner && r.owner.country) || "";
  var placeLine = [place, community, city, country].filter(Boolean).join(" · ");

  var km =
    r.km != null
      ? Number(r.km).toFixed(1) + " km"
      : r.distance_km != null
      ? Number(r.distance_km).toFixed(1) + " km"
      : "";
  var compass = r.compass || r.bearing_label || "";
  var qty = r.quantity != null ? r.quantity : r.qty;
  var available = r.available;

  return (
    '<div class="product-card">' +
    '<div class="title">' +
    item +
    (priceLine ? " · " + priceLine : "") +
    "</div>" +
    (owner
      ? '<div class="line"><strong>' +
        (role ? role + ": " : "Seller: ") +
        "</strong>" +
        owner +
        "</div>"
      : "") +
    (phone ? '<div class="line"><strong>Phone:</strong> ' + phone + "</div>" : "") +
    (placeLine
      ? '<div class="line"><strong>Location:</strong> ' + placeLine + "</div>"
      : "") +
    (qty != null && qty !== ""
      ? '<div class="line"><strong>Qty:</strong> ' + qty + "</div>"
      : "") +
    (available === false
      ? '<div class="line"><strong>Status:</strong> unavailable</div>'
      : "") +
    (km || compass
      ? '<div class="meta">' + [km, compass].filter(Boolean).join(" · ") + "</div>"
      : "") +
    "</div>"
  );
};

SNM.doSearch = async function () {
  var qEl = document.getElementById("searchQ");
  var box = document.getElementById("searchResults");
  var ai = document.getElementById("searchAiCard");
  if (!box) return;

  var q = (qEl && qEl.value) || "";
  var u = SNM.getUser() || {};
  box.innerHTML = "<p class='muted'>Searching…</p>";

  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          lat: u.lat,
          lng: u.lng,
          community: u.community,
          city: u.city,
          max_km: SNM.DEFAULT_MAX_KM,
          limit: 40
        })
    );
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant(ai, data && data.assistant);
    }
    var rows = (data && data.results) || [];
    if (!rows.length) {
      box.innerHTML = "<p class='muted'>No results</p>";
      return;
    }
    box.innerHTML = rows.map(SNM.cardHtml).join("");
  } catch (e) {
    box.innerHTML =
      "<p class='error'>" + (e.message || "Search failed") + "</p>";
  }
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
