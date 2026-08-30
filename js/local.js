wixndow.SNM = window.SNM || {};

SNM.escapeHtml = function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

SNM.toast = function (msg) {
  var el = document.getElementById("toast");
  if (!el) {
    alert(msg);
    return;
  }
  el.textContent = String(msg == null ? "" : msg);
  el.hidden = false;
  el.classList.add("show");
  clearTimeout(SNM._toastTimer);
  SNM._toastTimer = setTimeout(function () {
    el.classList.remove("show");
    el.hidden = true;
  }, 3200);
};

SNM.showScreen = function (id) {
  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });
  var target = document.getElementById(id);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
};

SNM.getToken = function () {
  try {
    return localStorage.getItem("snm_token") || "";
  } catch (e) {
    return "";
  }
};

SNM.getUser = function () {
  try {
    var raw = localStorage.getItem("snm_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setSession = function (token, user) {
  try {
    if (token) localStorage.setItem("snm_token", token);
    if (user) localStorage.setItem("snm_user", JSON.stringify(user));
  } catch (e) {}
};

SNM.clearSession = function () {
  try {
    localStorage.removeItem("snm_token");
    localStorage.removeItem("snm_user");
    localStorage.removeItem("snm_pending");
  } catch (e) {}
};

SNM.getPending = function () {
  try {
    return localStorage.getItem("snm_pending") || "";
  } catch (e) {
    return "";
  }
};

SNM.setPending = function (id) {
  try {
    localStorage.setItem("snm_pending", id || "");
  } catch (e) {}
};

SNM.requireAuth = function () {
  if (!SNM.getToken()) {
    SNM.toast("Please log in");
    SNM.showScreen("role-select");
    return false;
  }
  return true;
};

SNM.isBuyer = function (user) {
  var u = user || SNM.getUser();
  return !u || u.role === "buyer";
};

SNM.navItemsForRole = function (role) {
  if (role === "buyer") {
    return [
      { id: "home", label: "Home", icon: "fa-home" },
      { id: "search", label: "Search", icon: "fa-search" },
      { id: "saved", label: "Saved", icon: "fa-bookmark" },
      { id: "messages", label: "Msg", icon: "fa-comments" },
      { id: "news", label: "News", icon: "fa-newspaper" },
      { id: "profile", label: "Me", icon: "fa-user" }
    ];
  }
  return [
    { id: "home", label: "Home", icon: "fa-home" },
    { id: "search", label: "Search", icon: "fa-search" },
    { id: "shop", label: "Shop", icon: "fa-store" },
    { id: "messages", label: "Msg", icon: "fa-comments" },
    { id: "news", label: "News", icon: "fa-newspaper" },
    { id: "profile", label: "Me", icon: "fa-user" }
  ];
};

SNM.renderBottomNav = function (activeId) {
  var user = SNM.getUser() || {};
  var items = SNM.navItemsForRole(user.role || "buyer");
  var html = items
    .map(function (it) {
      var cls = it.id === activeId ? "active" : "";
      return (
        '<button type="button" class="' +
        cls +
        '" data-nav="' +
        it.id +
        '"><i class="fas ' +
        it.icon +
        '"></i>' +
        it.label +
        "</button>"
      );
    })
    .join("");
  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.innerHTML = html;
  });
};
