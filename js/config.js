window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";
SNM.APP_VERSION = "1.0.0.1p";

SNM.ROLES = [
  { id: "buyer", label: "Buyer", icon: "🛒" },
  { id: "merchant", label: "Merchant", icon: "🏪" },
  { id: "service_provider", label: "Service provider", icon: "🔧" },
  { id: "driver", label: "Driver / logistics", icon: "🛵" },
  { id: "emergency", label: "Emergency unit", icon: "🚨" }
];

SNM.CONTINENTS = [
  { id: "001", name: "North America" },
  { id: "002", name: "South America" },
  { id: "003", name: "Africa" },
  { id: "004", name: "Asia" },
  { id: "005", name: "Europe" },
  { id: "006", name: "Antarctica" },
  { id: "007", name: "Australia / Oceania" }
];

SNM.tokenKey = "snm_token";
SNM.userKey = "snm_user";
SNM.pendingKey = "snm_pending";

SNM.getToken = function () {
  try {
    return localStorage.getItem(SNM.tokenKey) || "";
  } catch (e) {
    return "";
  }
};

SNM.setSession = function (token, user) {
  try {
    if (token) localStorage.setItem(SNM.tokenKey, token);
    if (user) localStorage.setItem(SNM.userKey, JSON.stringify(user));
  } catch (e) {}
};

SNM.clearSession = function () {
  try {
    localStorage.removeItem(SNM.tokenKey);
    localStorage.removeItem(SNM.userKey);
    localStorage.removeItem(SNM.pendingKey);
  } catch (e) {}
};

SNM.getUser = function () {
  try {
    var raw = localStorage.getItem(SNM.userKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setPending = function (id) {
  try {
    localStorage.setItem(SNM.pendingKey, id || "");
  } catch (e) {}
};

SNM.getPending = function () {
  try {
    return localStorage.getItem(SNM.pendingKey) || "";
  } catch (e) {
    return "";
  }
};

SNM.escapeHtml = function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

SNM.toast = function (msg) {
  var el = document.getElementById("toast");
  if (!el) {
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function () {
    el.classList.remove("show");
  }, 2800);
};

SNM.showScreen = function (id) {
  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.toggle("active", s.id === id);
  });
  var authed = ["home", "search", "shop", "messages", "news", "profile"];
  document.querySelectorAll(".bottom-nav").forEach(function (nav) {
    nav.style.display = authed.indexOf(id) !== -1 ? "flex" : "none";
    nav.querySelectorAll("button[data-nav]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === id);
    });
  });
  window.scrollTo(0, 0);
};

SNM.requireAuth = function () {
  if (!SNM.getToken()) {
    SNM.showScreen("role-select");
    return false;
  }
  return true;
};
