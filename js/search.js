window.SNM = window.SNM || {};

(function () {
  function el(id) {
    return document.getElementById(id);
  }

  SNM.doSearch = async function () {
    var qEl = el("searchQ") || el("homeSearch") || el("q");
    var out = el("searchResults") || el("searchFeed");
    if (!out) return;

    var q = qEl ? qEl.value.trim() : "";
    out.innerHTML = '<p class="muted">Searching…</p>';

    var user = typeof SNM.getUser === "function" ? SNM.getUser() || {} : {};
    var params = {
      q: q,
      max_km: (SNM.DEFAULT_MAX_KM != null ? SNM.DEFAULT_MAX_KM : 2000)
    };
    if (user.lat != null) params.lat = user.lat;
    if (user.lng != null) params.lng = user.lng;
    if (user.community) params.community = user.community;
    if (user.city) params.city = user.city;

    try {
      var path =
        "/search/products" +
        (typeof SNM.qs === "function"
          ? SNM.qs(params)
          : "?" +
            Object.keys(params)
              .map(function (k) {
                return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
              })
              .join("&"));

      var data = await SNM.api(path);
      if (typeof SNM.renderAssistant === "function") {
        SNM.renderAssistant(data.assistant || data.promote, "searchAssistant");
      }

      var results = data.results || data.items || [];
      if (!results.length) {
        out.innerHTML = '<div class="empty-state">No matches. Try another term or wider area.</div>';
        return;
      }

      // latest-first when API sends created_at
      results = results.slice().sort(function (a, b) {
        var ta = Date.parse(a.created_at || a.addedAt || 0) || 0;
        var tb = Date.parse(b.created_at || b.addedAt || 0) || 0;
        return tb - ta;
      });

      out.innerHTML = results.map(function (r) {
        return SNM.cardHtml(r);
      }).join("");
    } catch (err) {
      out.innerHTML =
        '<div class="empty-state">' +
        esc(err.message || err.detail || "Search failed") +
        "</div>";
    }
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  SNM.bindSearch = function () {
    var btn = el("btnDoSearch");
    if (btn) {
      btn.onclick = function () {
        SNM.doSearch();
      };
    }
    var q = el("searchQ") || el("homeSearch");
    if (q) {
      q.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          SNM.doSearch();
        }
      });
    }
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(document);
  };
})();
