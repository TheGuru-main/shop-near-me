window.SNM = window.SNM || {};

SNM.bindSearch = function () {
  var btn = document.getElementById("btnDoSearch");
  var btnM = document.getElementById("btnSearchMerchants");

  async function runProducts() {
    var q = (document.getElementById("searchQ").value || "").trim();
    var community = (document.getElementById("searchCommunity").value || "").trim();
    var maxKm = parseFloat(document.getElementById("searchMaxKm").value) || 100;
    var box = document.getElementById("searchResults");
    if (box) box.innerHTML = "<p class='muted'>Searching…</p>";
    try {
      var data = await SNM.api(
        "/search/products" +
          SNM.qs({ q: q, community: community, max_km: maxKm, limit: 40 })
      );
      var rows = data.results || data.items || [];
      if (box) {
        box.innerHTML = rows.length
          ? rows.map(SNM.cardHtml).join("")
          : "<p class='muted'>No products found.</p>";
      }
    } catch (e) {
      if (box) box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
    }
  }

  async function runMerchants() {
    var q =
      (document.getElementById("searchMerchant").value || "").trim() ||
      (document.getElementById("searchQ").value || "").trim();
    var community = (document.getElementById("searchCommunity").value || "").trim();
    var maxKm = parseFloat(document.getElementById("searchMaxKm").value) || 100;
    var box = document.getElementById("searchResults");
    if (box) box.innerHTML = "<p class='muted'>Searching merchants…</p>";
    try {
      var data = await SNM.api(
        "/search/merchants" +
          SNM.qs({ q: q, community: community, max_km: maxKm, limit: 40 })
      );
      var rows = data.results || data.items || [];
      if (box) {
        box.innerHTML = rows.length
          ? rows
              .map(function (m) {
                return SNM.cardHtml({
                  name: m.business_name || m.name,
                  primary_location: m.primary_location,
                  community: m.community,
                  city: m.city,
                  km: m.km
                });
              })
              .join("")
          : "<p class='muted'>No merchants found.</p>";
      }
    } catch (e) {
      if (box) box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
    }
  }

  if (btn) btn.onclick = runProducts;
  if (btnM) btnM.onclick = runMerchants;
};
