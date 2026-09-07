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
          city: u.city || "",
          region: u.region || "",
          country: u.country || "",
          max_km: SNM.MAX_KM || 2000,
          limit: 40
        })
    );

    var rows = data.results || data.items || [];
    if (!Array.isArray(rows)) rows = [];

    /* Strict client filter when user typed something */
    function haystack(r) {
      var p = r.product || r;
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
        s.city
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    }

    function tokensOf(str) {
      return String(str || "")
        .toLowerCase()
        .split(/[^a-z0-9+]+/)
        .filter(function (t) {
          return t.length >= 2;
        });
    }

    var tokens = tokensOf(q);
    var strict = rows;
    if (tokens.length) {
      strict = rows.filter(function (r) {
        var h = haystack(r);
        /* every token must appear somewhere in the card text */
        return tokens.every(function (t) {
          return h.indexOf(t) !== -1;
        });
      });
    }

    if (ai) {
      if (tokens.length && !strict.length) {
        ai.textContent =
          'No listings matched “' +
          q +
          '”. Nearby feed is hidden so unrelated goods (rice, beans, etc.) are not shown as hits.';
      } else if (data.assistant) {
        var msg =
          typeof data.assistant === "string"
            ? data.assistant
            : data.assistant.message || "";
        ai.textContent = msg;
      }
    }

    if (!strict.length) {
      out.innerHTML =
        "<p class='muted'>No matches for “" +
        SNM.esc(q || "your search") +
        "”.</p>";
      return;
    }

    out.innerHTML = strict
      .map(function (r) {
        return typeof SNM.cardHtml === "function" ? SNM.cardHtml(r) : "";
      })
      .join("");
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(out);
  } catch (err) {
    out.innerHTML =
      "<p class='muted'>Search failed. " +
      SNM.esc((err && err.message) || "") +
      "</p>";
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
