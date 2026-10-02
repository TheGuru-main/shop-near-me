window.SNM = window.SNM || {};

SNM.NEWS_CATS = [
  "business",
  "fintech",
  "logistics",
  "agriculture",
  "retail",
  "fashion",
  "clothing",
  "production",
  "local"
];

SNM.loadNews = async function (category) {
  category = category || SNM._newsCat || "business";
  SNM._newsCat = category;

  var list = document.getElementById("newsList");
  var ai = document.getElementById("newsAssistant");
  var cats = document.getElementById("newsCats");
  var esc =
    typeof SNM.esc === "function"
      ? SNM.esc
      : typeof SNM.escapeHtml === "function"
        ? SNM.escapeHtml
        : function (s) {
            return String(s == null ? "" : s);
          };

  if (cats) {
    cats.innerHTML = SNM.NEWS_CATS.map(function (c) {
      return (
        '<button type="button" class="chip-btn' +
        (c === category ? " active" : "") +
        '" data-news-cat="' +
        esc(c) +
        '">' +
        esc(c) +
        "</button>"
      );
    }).join("");

    if (!cats._snmWired) {
      cats._snmWired = true;
      cats.addEventListener("click", function (e) {
        var b = e.target.closest("[data-news-cat]");
        if (!b) return;
        SNM.loadNews(b.getAttribute("data-news-cat"));
      });
    }
  }

  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading news…</p>";
  if (ai) ai.textContent = "";

  try {
    var data = await SNM.api(
      "/news" + SNM.qs({ category: category, q: category })
    );

    if (ai && data.assistant) {
      ai.textContent =
        typeof data.assistant === "string"
          ? data.assistant
          : data.assistant.message || "";
    }

    var items = data.articles || data.items || data.results || [];
    if (!Array.isArray(items)) items = [];

    if (!items.length) {
      list.innerHTML =
        "<p class='muted'>No articles for " + esc(category) + ".</p>";
      return;
    }

    list.innerHTML = items
      .map(function (a) {
        var title = a.title || a.name || a.headline || "Article";
        var url = a.url || a.link || "#";
        var desc = a.description || a.summary || "";
        var img =
          a.image ||
          a.image_url ||
          a.urlToImage ||
          a.thumbnail ||
          a.thumb ||
          (a.enclosure && a.enclosure.url) ||
          "";
        var imgHtml = img
          ? '<img class="news-thumb" src="' +
            esc(img) +
            '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />'
          : "";
        return (
          '<article class="card news-card">' +
          imgHtml +
          '<a href="' +
          esc(url) +
          '" target="_blank" rel="noopener">' +
          esc(title) +
          "</a>" +
          (desc ? "<div class='news-body'>" + esc(desc) + "</div>" : "") +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<p class='muted'>News unavailable. " +
      esc((err && err.message) || "") +
      "</p>";
  }
};

SNM.bindNews = function () {
  if (SNM._newsBound) return;
  SNM._newsBound = true;
};

SNM.onNewsEnter = function () {
  SNM.loadNews(SNM._newsCat || "business");
};


/* NEWS_REGION_30_V1 */
SNM.NEWS_CATS = SNM.NEWS_CATS || [
  "business",
  "fintech",
  "logistics",
  "agriculture",
  "retail",
  "fashion",
  "clothing",
  "production",
  "local"
];

SNM._newsCat = SNM._newsCat || "local";
SNM._newsPage = 1;
SNM._newsBusy = false;
SNM._newsDone = false;

SNM.newsPlaceParams = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  return {
    community: u.community || "",
    city: u.city || "",
    region: u.region || "",
    country: u.country || "Nigeria",
    q_place: [u.community, u.city, u.region].filter(Boolean).join(" ") || u.primary_location || ""
  };
};

SNM.loadNews = async function (category, opts) {
  opts = opts || {};
  category = category || SNM._newsCat || "local";
  SNM._newsCat = category;

  var append = !!opts.append;
  if (!append) {
    SNM._newsPage = 1;
    SNM._newsDone = false;
  }
  if (SNM._newsBusy || (append && SNM._newsDone)) return;
  SNM._newsBusy = true;

  var list = document.getElementById("newsList");
  var ai = document.getElementById("newsAssistant");
  var cats = document.getElementById("newsCats");
  var esc =
    typeof SNM.esc === "function"
      ? SNM.esc
      : typeof SNM.escapeHtml === "function"
        ? SNM.escapeHtml
        : function (s) {
            return String(s == null ? "" : s);
          };

  if (cats) {
    cats.innerHTML = (SNM.NEWS_CATS || [])
      .map(function (c) {
        return (
          '<button type="button" class="chip-btn' +
          (c === category ? " active" : "") +
          '" data-news-cat="' +
          esc(c) +
          '">' +
          esc(c) +
          "</button>"
        );
      })
      .join("");
    if (!cats._snmWired) {
      cats._snmWired = true;
      cats.addEventListener("click", function (e) {
        var b = e.target.closest("[data-news-cat]");
        if (!b) return;
        SNM.loadNews(b.getAttribute("data-news-cat"), { append: false });
      });
    }
  }

  if (!list) {
    SNM._newsBusy = false;
    return;
  }
  if (!append) {
    list.innerHTML = "<p class='muted'>Loading news…</p>";
    if (ai) ai.textContent = "";
  }

  var place = SNM.newsPlaceParams();
  var page = SNM._newsPage || 1;
  var limit = 30;

  try {
    var data = await SNM.api(
      "/news" +
        SNM.qs({
          category: category,
          q: category,
          // region-first from signup
          community: place.community,
          city: place.city,
          region: place.region,
          country: place.country,
          place: place.q_place,
          limit: limit,
          page: page,
          offset: (page - 1) * limit
        })
    );

    if (ai && data.assistant && !append) {
      ai.textContent =
        typeof data.assistant === "string"
          ? data.assistant
          : data.assistant.message || "";
    }

    var items = data.articles || data.items || data.results || [];
    if (!Array.isArray(items)) items = [];

    if (!items.length && !append) {
      list.innerHTML =
        "<p class='muted'>No articles for " +
        esc(category) +
        (place.city || place.region
          ? " near " + esc([place.community, place.city, place.region].filter(Boolean).join(", "))
          : "") +
        ".</p>";
      SNM._newsDone = true;
      SNM._newsBusy = false;
      return;
    }

    if (!items.length && append) {
      SNM._newsDone = true;
      SNM._newsBusy = false;
      return;
    }

    var html = items
      .map(function (a) {
        var title = a.title || a.name || a.headline || "Article";
        var url = a.url || a.link || "#";
        var desc = a.description || a.summary || "";
        var img = a.image || a.image_url || a.thumbnail || "";
        var placeHint = a.place || a.location || "";
        return (
          '<article class="card news-card">' +
          (img
            ? '<img class="news-thumb" src="' +
              esc(img) +
              '" alt="" loading="lazy" />'
            : "") +
          '<a href="' +
          esc(url) +
          '" target="_blank" rel="noopener">' +
          esc(title) +
          "</a>" +
          (placeHint
            ? "<div class='muted small'>" + esc(placeHint) + "</div>"
            : "") +
          (desc ? "<div class='news-body'>" + esc(desc) + "</div>" : "") +
          "</article>"
        );
      })
      .join("");

    if (append) list.insertAdjacentHTML("beforeend", html);
    else list.innerHTML = html;

    if (items.length < limit) SNM._newsDone = true;
    else SNM._newsPage = page + 1;
  } catch (err) {
    if (!append) {
      list.innerHTML =
        "<p class='muted'>News unavailable. " +
        esc((err && err.message) || "") +
        "</p>";
    }
  }
  SNM._newsBusy = false;
};

SNM.bindNewsScroll = function () {
  if (SNM._newsScrollBound) return;
  SNM._newsScrollBound = true;
  var list = document.getElementById("newsList");
  var scroller =
    (list && list.closest(".container")) || list || document;
  scroller.addEventListener(
    "scroll",
    function () {
      var el = scroller === document ? document.documentElement : scroller;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        SNM.loadNews(SNM._newsCat, { append: true });
      }
    },
    { passive: true }
  );
};

SNM.bindNews = function () {
  if (typeof SNM.bindNewsScroll === "function") SNM.bindNewsScroll();
};

SNM.onNewsEnter = function () {
  if (typeof SNM.bindNewsScroll === "function") SNM.bindNewsScroll();
  SNM.loadNews(SNM._newsCat || "local", { append: false });
};
