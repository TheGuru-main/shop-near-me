window.SNM = window.SNM || {};

SNM.doProductSearch = async function () {
  var q = (document.getElementById("searchQ").value || "").trim();
  var community = (document.getElementById("searchCommunity").value || "").trim();
  var merchant = (document.getElementById("searchMerchant").value || "").trim();
  var maxKm = document.getElementById("searchMaxKm").value || "100";
  var box = document.getElementById("searchResults");
  if (!box) return;

  box.innerHTML = "<p class=\"muted\">Searching…</p>";
  try {
    var path =
      "/search/products" +
      SNM.qs({
        q: q,
        community: community,
        merchant: merchant,
        max_km: maxKm
      });
    var data = await SNM.api(path);
    var rows = data.results || data.items || [];
    if (!rows.length) {
      box.innerHTML =
        "<p class=\"muted\">No results (count " +
        SNM.escapeHtml(String(data.count != null ? data.count : 0)) +
        ")</p>";
      return;
    }
    box.innerHTML = rows.map(SNM.cardHtml).join("");
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Search failed") + "</p>";
  }
};

SNM.doMerchantSearch = async function () {
  var q = (document.getElementById("searchQ").value || "").trim();
  var community = (document.getElementById("searchCommunity").value || "").trim();
  var maxKm = document.getElementById("searchMaxKm").value || "100";
  var box = document.getElementById("searchResults");
  if (!box) return;

  box.innerHTML = "<p class=\"muted\">Searching merchants…</p>";
  try {
    var path =
      "/search/merchants" +
      SNM.qs({
        q: q,
        community: community,
        max_km: maxKm
      });
    var data = await SNM.api(path);
    var rows = data.results || data.items || [];
    if (!rows.length) {
      box.innerHTML = "<p class=\"muted\">No merchants found</p>";
      return;
    }
    box.innerHTML = rows
      .map(function (m) {
        return SNM.cardHtml({
          name: m.business_name || m.name || "Merchant",
          merchant_name: m.name || "",
          primary_location: m.primary_location,
          community: m.community,
          city: m.city,
          km: m.km
        });
      })
      .join("");
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Search failed") + "</p>";
  }
};

SNM.bindSearch = function () {
  var btn = document.getElementById("btnDoSearch");
  if (btn) btn.onclick = function () { SNM.doProductSearch(); };

  var btnM = document.getElementById("btnSearchMerchants");
  if (btnM) btnM.onclick = function () { SNM.doMerchantSearch(); };

  var q = document.getElementById("searchQ");
  if (q) {
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter") SNM.doProductSearch();
    });
  }
};
