window.SNM = window.SNM || {};

SNM._newsCategory = "business";

SNM.loadNews = async function (category) {
  if (category) SNM._newsCategory = category;
  var list = document.getElementById("newsList");
  var ai = document.getElementById("newsAiCard");
  var cats = document.getElementById("newsCats");
  if (cats && !cats.children.length) {
    cats.innerHTML = (SNM.NEWS_CATEGORIES || [])
      .map(function (c) {
        return (
          '<button type="button" class="chip' +
          (c === SNM._newsCategory ? " active" : "") +
          '" data-news-cat="' +
          c +
          '">' +
          c +
          "</button>"
        );
      })
      .join("");
  } else if (cats) {
    cats.querySelectorAll("[data-news-cat]").forEach(function (el) {
      el.classList.toggle(
        "active",
        el.getAttribute("data-news-cat") === SNM._newsCategory
      );
    });
  }

  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading news…</p>";
  var user = SNM.getUser() || {};
  try {
    var data = await SNM.api(
      "/news" +
        SNM.qs({
          category: SNM._newsCategory,
          country: user.country || "ng",
          q: SNM._newsCategory
        })
    );
    if (typeof SNM.renderAssistant === "function") {
      SNM.renderAssistant(ai, data.assistant);
    }
    var items = data.articles || data.items || data.results || [];
    if (!items.length) {
      list.innerHTML = "<div class='card'><p>No headlines right now.</p></div>";
      return;
    }
    list.innerHTML = items
      .map(function (a) {
        var title = a.title || "Headline";
        var url = a.url || a.link || "#";
        var src = a.source || a.source_name || "";
        return (
          '<a class="product-card" href="' +
          url +
          '" target="_blank" rel="noopener">' +
          '<div class="title">' +
          title +
          "</div>" +
          '<div class="meta">' +
          src +
          "</div></a>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "News failed") +
      "</p></div>";
  }
};

SNM.bindNews = function () {
  document.getElementById("newsCats")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-news-cat]");
    if (!btn) return;
    SNM.loadNews(btn.getAttribute("data-news-cat"));
  });
};
