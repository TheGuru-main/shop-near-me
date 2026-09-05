window.SNM = window.SNM || {};

SNM.doSearch = async function () {
  var input = document.getElementById("searchQ");
  var out = document.getElementById("searchResults");
  var ai = document.getElementById("searchAssistant");
  if (!out) return;
  var q = ((input && input.value) || "").trim();
  out.innerHTML = "<p class='muted'>Searching…</p>";
  if (ai) ai.textContent = "";
  var u = SNM.getUser() || {};
  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: q,
          lat: u.lat,
          lng: u.lng,
          community: u.community || "",
          max_km: SNM.MAX_KM || 2000,
          limit: 40
        })
    );
    if (ai && data.assistant) {
      var msg =
        typeof data.assistant === "string"
          ? data.assistant
          : data.assistant.message || "";
      ai.textContent = msg;
    }
    var rows = data.results || data.items || [];
    if (!Array.isArray(rows)) rows = [];
    rows.sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    if (!rows.length) {
      out.innerHTML = "<p class='muted'>No matches.</p>";
      return;
    }
    out.innerHTML = rows.map(SNM.cardHtml).join("");
  } catch (err) {
    out.innerHTML =
      "<p class='muted'>Search failed. " + SNM.esc((err && err.message) || "") + "</p>";
  }
};

SNM.onSearchEnter = function () {};

SNM.bindSearch = function () {
  var btn = document.getElementById("btnDoSearch");
  if (btn) btn.onclick = function () {
    SNM.doSearch();
  };
  var input = document.getElementById("searchQ");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") SNM.doSearch();
    });
  }
};
