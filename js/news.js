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
        return (
          '<article class="card news-card">' +
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
  /* chips are wired inside loadNews */
};

SNM.onNewsEnter = function () {
  SNM.loadNews(SNM._newsCat || "business");
};