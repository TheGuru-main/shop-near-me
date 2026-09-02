window.SNM = window.SNM || {};

SNM.refreshHome = function () {
  var user = SNM.getUser() || {};
  var nameEl = document.getElementById("homeName");
  var roleEl = document.getElementById("homeRole");
  var placeEl = document.getElementById("homePlace");
  if (nameEl) nameEl.textContent = user.name || "—";
  if (roleEl) roleEl.textContent = user.role || "—";
  if (placeEl) {
    placeEl.textContent =
      user.primary_location ||
      [user.community, user.city, user.region, user.country]
        .filter(Boolean)
        .join(", ") ||
      "—";
  }
  SNM.loadHomeFeed();
};

SNM.loadHomeFeed = async function () {
  var box = document.getElementById("homeFeed");
  if (!box) return;
  box.innerHTML = '<p class="soft">Loading near you…</p>';

  var user = SNM.getUser() || {};
  try {
    var data = await SNM.api(
      "/search/products" +
        SNM.qs({
          q: "",
          community: user.community || "",
          city: user.city || "",
          region: user.region || "",
          country: user.country || "",
          max_km: 2000,
          limit: 20
        })
    );
    var rows = data.results || [];
    if (!rows.length) {
      box.innerHTML =
        '<p class="soft">No nearby listings yet. Try Search, or list an item in Shop.</p>';
      return;
    }
    box.innerHTML = rows
      .map(function (r) {
        var p = r.product || {};
        var s = r.seller || {};
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
          (s.primary_location || s.community || s.city || "") +
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
  } catch (e) {
    box.innerHTML =
      '<p class="soft">Feed unavailable: ' +
      (e.message || "error") +
      "</p>";
  }
};

SNM.renderProfile = function () {
  var u = SNM.getUser() || {};
  var box = document.getElementById("profileBody");
  if (!box) return;
  box.innerHTML =
    "<p><strong>" +
    (u.name || "—") +
    "</strong></p>" +
    '<p class="soft">' +
    (u.role || "") +
    "</p>" +
    '<p class="soft">' +
    (u.phone || "") +
    "</p>" +
    '<p class="soft">' +
    (u.primary_location || "") +
    "</p>" +
    '<p class="soft">' +
    [u.community, u.city, u.region, u.country].filter(Boolean).join(", ") +
    "</p>";
};

SNM.loadNews = async function (category) {
  var box = document.getElementById("newsFeed");
  if (!box) return;
  box.innerHTML = '<p class="soft">Loading news…</p>';
  category = category || SNM._newsCat || "local";
  SNM._newsCat = category;

  try {
    var user = SNM.getUser() || {};
    var data = await SNM.api(
      "/news" +
        SNM.qs({
          category: category,
          q: "",
          community: user.community || "",
          city: user.city || "",
          region: user.region || "",
          limit: 20
        })
    );

    SNM.renderAssistant(
      "news",
      data.assistant,
      (data.count != null ? data.count + " articles" : "") +
        (data.provider ? " · " + data.provider : "")
    );

    var articles = data.articles || [];
    if (!articles.length) {
      box.innerHTML =
        '<p class="soft">No articles right now' +
        (data.note ? " — " + data.note : "") +
        ".</p>";
      return;
    }
    box.innerHTML = articles
      .map(function (a) {
        return (
          '<article class="feed-card">' +
          '<div class="title">' +
          (a.title || "Update") +
          "</div>" +
          '<div class="meta">' +
          (a.source || "") +
          (a.published_at ? " · " + a.published_at : "") +
          "</div>" +
          "<p>" +
          (a.summary || "") +
          "</p>" +
          (a.url
            ? '<p class="meta"><a href="' +
              a.url +
              '" target="_blank" rel="noopener">Open</a></p>'
            : "") +
          "</article>"
        );
      })
      .join("");
  } catch (e) {
    SNM.renderAssistant("news", null);
    box.innerHTML =
      '<p class="soft">News unavailable: ' + (e.message || "error") + "</p>";
  }
};

SNM.bindHome = function () {
  var btn = document.getElementById("btnRefreshFeed");
  if (btn) btn.onclick = function () {
    SNM.loadHomeFeed();
  };

  document.querySelectorAll("[data-news-cat]").forEach(function (chip) {
    chip.addEventListener("click", function (e) {
      e.preventDefault();
      var cat = chip.getAttribute("data-news-cat") || "local";
      SNM.loadNews(cat);
    });
  });

  var perish = document.getElementById("linkPerishables");
  if (perish) {
    perish.addEventListener("click", function () {
      var q = document.getElementById("searchQ");
      if (q) q.value = "perishable";
    });
  }
};
