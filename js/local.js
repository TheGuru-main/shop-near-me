window.SNM = window.SNM || {};

SNM.STORAGE = {
  token: "snm_token",
  user: "snm_user",
  pending: "snm_pending",
  role: "snm_role"
};

SNM.getToken = function () {
  try {
    return localStorage.getItem(SNM.STORAGE.token) || "";
  } catch (e) {
    return "";
  }
};

SNM.setToken = function (token) {
  try {
    if (token) localStorage.setItem(SNM.STORAGE.token, token);
    else localStorage.removeItem(SNM.STORAGE.token);
  } catch (e) {}
};

SNM.getUser = function () {
  try {
    var raw = localStorage.getItem(SNM.STORAGE.user);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setUser = function (user) {
  try {
    if (user) localStorage.setItem(SNM.STORAGE.user, JSON.stringify(user));
    else localStorage.removeItem(SNM.STORAGE.user);
  } catch (e) {}
};

SNM.clearSession = function () {
  try {
    localStorage.removeItem(SNM.STORAGE.token);
    localStorage.removeItem(SNM.STORAGE.user);
    localStorage.removeItem(SNM.STORAGE.pending);
  } catch (e) {}
};

SNM.setPending = function (obj) {
  try {
    localStorage.setItem(SNM.STORAGE.pending, JSON.stringify(obj || {}));
  } catch (e) {}
};

SNM.getPending = function () {
  try {
    var raw = localStorage.getItem(SNM.STORAGE.pending);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setRole = function (role) {
  try {
    localStorage.setItem(SNM.STORAGE.role, role || "buyer");
  } catch (e) {}
};

SNM.getRole = function () {
  try {
    return localStorage.getItem(SNM.STORAGE.role) || "buyer";
  } catch (e) {
    return "buyer";
  }
};

SNM.isBuyer = function (user) {
  var u = user || SNM.getUser();
  return !u || u.role === "buyer";
};

SNM.tabsFor = function (user) {
  var u = user || SNM.getUser();
  if (u && u.role && u.role !== "buyer") return SNM.SELLER_TABS;
  return SNM.BUYER_TABS;
};

SNM.showError = function (id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!msg) {
    el.textContent = "";
    el.hidden = true;
    return;
  }
  el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
  el.hidden = false;
};

SNM.val = function (id) {
  var el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
};

SNM.requirePhonePlus = function (phone) {
  if (!phone) return "Phone is required.";
  if (phone.charAt(0) !== "+") return "Phone must start with + (international format).";
  if (phone.length < 10) return "Phone number looks too short.";
  return "";
};
