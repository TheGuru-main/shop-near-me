window.SNM = window.SNM || {};

SNM.esc =
  SNM.esc ||
  SNM.escapeHtml ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM._savedTab = SNM._savedTab || "catalogue";

SNM._localBookmarks = function () {
  try {
    return JSON.parse(localStorage.getItem("snm_bookmarks") || "[]");
  } catch (e) {
    return [];
  }
};

SNM._renderSavedEmpty = function (el, text) {
  if (el) {
    el.innerHTML =
      "<p class='muted'>" + SNM.esc(text || "Nothing saved yet.") + "</p>";
  }
};

SNM.loadSavedCatalogue = async function () {
  var el = document.getElementById("savedList");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading catalogue…</p>";
  var items = [];
  try {
    if (typeof SNM.api === "function" && SNM.getToken && SNM.getToken()) {
      var data = await SNM.api(
        "/bookmarks" + (SNM.qs ? SNM.qs({ kind: "product" }) : "?kind=product")
      );
      items = (data && (data.items || data.results)) || [];
    }
  } catch (e) {}
  if (!items.length) {
    items = SNM._localBookmarks().filter(function (x) {
      return x.kind === "product";
    });
  }
  if (!items.length) {
    SNM._renderSavedEmpty(
      el,
      "No bookmarked items yet. Bookmark from a listing card."
    );
    return;
  }
  el.innerHTML = items
    .map(function (it) {
      var title = it.title || it.name || "Item";
      var phone = it.phone || it.to_phone || "";
      var id = it.product_id || it.id || "";
      return (
        '<article class="card listing-card" data-id="' +
        SNM.esc(String(id)) +
        '" data-phone="' +
        SNM.esc(phone) +
        '">' +
        '<div class="title">' +
        SNM.esc(title) +
        "</div>" +
        (phone ? '<div class="meta">' + SNM.esc(phone) + "</div>" : "") +
        '<div class="card-actions">' +
        '<button type="button" class="btn small" data-act="message">Message</button>' +
        "</div></article>"
      );
    })
    .join("");
  if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
};

SNM.loadSavedMerchants = async function () {
  var el = document.getElementById("savedMerchants");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading merchants…</p>";
  var items = [];
  try {
    if (typeof SNM.api === "function" && SNM.getToken && SNM.getToken()) {
      var data = await SNM.api(
        "/bookmarks" + (SNM.qs ? SNM.qs({ kind: "user" }) : "?kind=user")
      );
      items = (data && (data.items || data.results)) || [];
    }
  } catch (e) {}
  if (!items.length) {
    items = SNM._localBookmarks().filter(function (x) {
      return x.kind === "user" || String(x.id || "").indexOf("u:") === 0;
    });
  }
  if (!items.length) {
    SNM._renderSavedEmpty(
      el,
      "No bookmarked merchants yet. Use Bookmark on a seller or driver card."
    );
    return;
  }
  el.innerHTML = items
    .map(function (it) {
      var name = it.name || it.title || "Seller";
      var phone = it.phone || it.to_phone || "";
      return (
        '<article class="card listing-card" data-phone="' +
        SNM.esc(phone) +
        '">' +
        '<div class="title">' +
        SNM.esc(name) +
        "</div>" +
        '<div class="meta">' +
        SNM.esc(phone) +
        "</div>" +
        '<div class="card-actions">' +
        '<button type="button" class="btn small" data-act="message">Message</button>' +
        '<button type="button" class="btn secondary small" data-act="bookmark" data-bookmarked="1">Bookmarked</button>' +
        "</div></article>"
      );
    })
    .join("");
  if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
};

SNM.setSavedTab = function (tab) {
  tab = tab === "merchants" ? "merchants" : "catalogue";
  SNM._savedTab = tab;
  var cat = document.getElementById("savedList");
  var mer = document.getElementById("savedMerchants");
  var hint = document.getElementById("savedHint");
  document.querySelectorAll("#savedTabs [data-saved-tab]").forEach(function (b) {
    b.classList.toggle(
      "active",
      b.getAttribute("data-saved-tab") === tab
    );
  });
  if (tab === "catalogue") {
    if (cat) cat.classList.remove("hidden");
    if (mer) mer.classList.add("hidden");
    if (hint) hint.textContent = "Bookmarked items for quick reorder.";
    SNM.loadSavedCatalogue();
  } else {
    if (cat) cat.classList.add("hidden");
    if (mer) mer.classList.remove("hidden");
    if (hint)
      hint.textContent = "Bookmarked merchants, services, and drivers.";
    SNM.loadSavedMerchants();
  }
};

SNM.bindSaved = function () {
  if (SNM._savedBound) return;
  SNM._savedBound = true;
  var tabs = document.getElementById("savedTabs");
  if (tabs) {
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-saved-tab]");
      if (!b) return;
      SNM.setSavedTab(b.getAttribute("data-saved-tab"));
    });
  }
};

/** Buyer bottom-nav Bookmark → this screen */
SNM.onSavedEnter = function () {
  SNM.bindSaved();
  SNM.setSavedTab(SNM._savedTab || "catalogue");
};
