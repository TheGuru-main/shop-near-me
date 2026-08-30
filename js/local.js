window.SNM = window.SNM || {};

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

  var authed = ["home", "search", "shop", "messages", "news", "profile"];
  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.style.display = authed.indexOf(id) !== -1 ? "flex" : "none";
    nav.querySelectorAll("button[data-nav]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === id);
    });
  });
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
