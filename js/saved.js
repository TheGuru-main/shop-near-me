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
  try {
    var data = await SNM.api(
      "/bookmarks" + (SNM.qs ? SNM.qs({ kind: "product" }) : "?kind=product")
    );
    var items = (data && (data.items || data.results)) || [];
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
        var phone = it.phone || "";
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
  } catch (e) {
    SNM._renderSavedEmpty(
      el,
      "Could not load bookmarks. " + ((e && e.message) || "")
    );
  }
};

SNM.loadSavedMerchants = async function () {
  var el = document.getElementById("savedMerchants");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading merchants…</p>";
  try {
    var data = await SNM.api(
      "/bookmarks" + (SNM.qs ? SNM.qs({ kind: "user" }) : "?kind=user")
    );
    var items = (data && (data.items || data.results)) || [];
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
        var phone = it.phone || "";
        return (
          '<article class="card listing-card" data-phone="' +
          SNM.esc(phone) +
          '">' +
          '<div class="title">' +
          SNM.esc(name) +
          "</div>" +
          '<div class="meta">' +
          SNM.esc(phone) +
          (it.role ? " · " + SNM.esc(it.role) : "") +
          "</div>" +
          '<div class="card-actions">' +
          '<button type="button" class="btn small" data-act="message">Message</button>' +
          "</div></article>"
        );
      })
      .join("");
    if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(el);
  } catch (e) {
    SNM._renderSavedEmpty(
      el,
      "Could not load bookmarks. " + ((e && e.message) || "")
    );
  }
};

SNM.loadSaved = async function () {
  if (SNM._savedTab === "merchants") {
    await SNM.loadSavedMerchants();
  } else {
    await SNM.loadSavedCatalogue();
  }
};

SNM.setSavedTab = function (tab) {
  tab = tab === "merchants" ? "merchants" : "catalogue";
  SNM._savedTab = tab;
  var cat = document.getElementById("savedList");
  var mer = document.getElementById("savedMerchants");
  document.querySelectorAll("[data-saved-tab]").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-saved-tab") === tab);
  });
  if (tab === "merchants") {
    if (cat) cat.classList.add("hidden");
    if (mer) mer.classList.remove("hidden");
    SNM.loadSavedMerchants();
  } else {
    if (mer) mer.classList.add("hidden");
    if (cat) cat.classList.remove("hidden");
    SNM.loadSavedCatalogue();
  }
};

SNM.bindSaved = function () {
  if (SNM._savedBound) return;
  SNM._savedBound = true;
  document.body.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-saved-tab]");
    if (!tab) return;
    e.preventDefault();
    SNM.setSavedTab(tab.getAttribute("data-saved-tab"));
  });
};

SNM.onSavedEnter = function () {
  SNM.bindSaved();
  SNM.setSavedTab(SNM._savedTab || "catalogue");
};
