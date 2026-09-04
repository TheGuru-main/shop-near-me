window.SNM = window.SNM || {};

SNM.doSearch = async function () {
  var qEl = document.getElementById("searchQ");
  var box = document.getElementById("searchResults");
  var ai = document.getElementById("searchAiCard");
  if (!box) return;
  var q = (qEl && qEl.value) || "";
  var u = SNM.getUser() || {};
  box.innerHTML = "<p class='muted'>Searching…</p>";
  try {
    var data = await SNM.api("/search/products" + SNM.qs({
      q: q,
      lat: u.lat,
      lng: u.lng,
      community: u.community,
      city: u.city,
      max_km: SNM.DEFAULT_MAX_KM,
      limit: 40
    }));
    SNM.renderAssistant(ai, data.assistant);
    var rows = data.results || [];
    if (!rows.length) {
      box.innerHTML = "<p class='muted'>No results</p>";
      return;
    }
    box.innerHTML = rows.map(function (r) {
      return (
        '<div class="product-card">' +
        '<div class="title">' + (r.item || r.name || "Item") +
        (r.price != null ? " · " + r.price : "") + "</div>" +
        '<div class="meta">' +
        [r.merchant || r.owner_name, r.km != null ? Number(r.km).toFixed(1) + " km" : "", r.compass || r.bearing_label || ""]
          .filter(Boolean).join(" · ") +
        "</div></div>"
      );
    }).join("");
  } catch (e) {
    box.innerHTML = "<p class='error'>" + (e.message || "Search failed") + "</p>";
  }
};

SNM.bindSearch = function () {
  var btn = document.getElementById("btnDoSearch");
  if (btn) btn.onclick = function () { SNM.doSearch(); };
};
