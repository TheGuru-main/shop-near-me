window.SNM = window.SNM || {};
SNM._newsCategory = "business";

SNM.loadNews = async function () {
  var list = document.getElementById("newsList");
  var cats = document.getElementById("newsCats");
  var ai = document.getElementById("newsAiCard");
  if (cats && !cats.dataset.ready) {
    cats.dataset.ready = "1";
    (SNM.NEWS_CATEGORIES || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (c === SNM._newsCategory ? " active" : "");
      b.textContent = c;
      b.onclick = function () {
        SNM._newsCategory = c;
        cats.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        SNM.loadNews();
      };
      cats.appendChild(b);
    });
  }
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading news…</p>";
  var u = SNM.getUser() || {};
  try {
    var data = await SNM.api("/news" + SNM.qs({
      category: SNM._newsCategory,
      country: u.country || "Nigeria",
      q: SNM._newsCategory
    }));
    SNM.renderAssistant(ai, data.assistant);
    var items = data.items || data.articles || data.results || [];
    if (!items.length) {
      list.innerHTML = "<p class='muted'>No headlines for this category.</p>";
      return;
    }
    list.innerHTML = items.map(function (a) {
      var title = a.title || "Headline";
      var url = a.url || a.link || "#";
      var src = a.source || a.source_name || "";
      return (
        '<a class="product-card" href="' + url + '" target="_blank" rel="noopener">' +
        '<div class="title">' + title + "</div>" +
        '<div class="meta">' + src + " · " + SNM._newsCategory + "</div></a>"
      );
    }).join("");
  } catch (e) {
    list.innerHTML = "<p class='error'>" + (e.message || "News error") + "</p>";
  }
};

SNM.bindNews = function () {};
