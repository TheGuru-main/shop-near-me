window.SNM = window.SNM || {};

SNM.NEWS_CATS = [
  "business",
  "fintech",
  "logistics",
  "agriculture",
  "retail",
  "local"
];

SNM.loadNews = async function (category) {
  category = category || SNM._newsCat || "business";
  SNM._newsCat = category;
  var list = document.getElementById("newsList");
  var ai = document.getElementById("newsAssistant");
  var cats = document.getElementById("newsCats");
  if (cats && !cats.dataset.ready) {
    cats.innerHTML = SNM.NEWS_CATS.map(function (c) {
      return (
        '<button type="button" class="chip-btn' +
        (c === category ? " active" : "") +
        '" data-news-cat="' +
        c +
        '">' +
        c +
        "</button>"
      );
    }).join("");
    cats.dataset.ready = "1";
    cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-news-cat]");
      if (!b) return;
      cats.querySelectorAll(".chip-btn").forEach(function (x) {
        x.classList.remove("active");
      });
      b.classList.add("active");
      SNM.loadNews(b.getAttribute("data-news-cat"));
    });
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
      list.innerHTML = "<p class='muted'>No articles for this category.</p>";
      return;
    }
    list.innerHTML = items
      .map(function (a) {
        var title = a.title || a.name || "Article";
        var url = a.url || a.link || "#";
        var desc = a.description || a.summary || "";
        return (
          '<article class="card news-card">' +
          '<a href="' +
          SNM.esc(url) +
          '" target="_blank" rel="noopener">' +
          SNM.esc(title) +
          "</a>" +
          (desc ? "<div class='news-body'>" + SNM.esc(desc) + "</div>" : "") +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<p class='muted'>News unavailable. " +
      SNM.esc((err && err.message) || "") +
      "</p>";
  }
};

SNM.bindNews = function () {};
