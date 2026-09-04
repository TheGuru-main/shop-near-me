window.SNM = window.SNM || {};

SNM.getToken = function () {
  try { return localStorage.getItem("snm_token") || ""; } catch (e) { return ""; }
};
SNM.setToken = function (t) {
  try { if (t) localStorage.setItem("snm_token", t); else localStorage.removeItem("snm_token"); } catch (e) {}
};
SNM.getUser = function () {
  try {
    var r = localStorage.getItem("snm_user");
    return r ? JSON.parse(r) : null;
  } catch (e) { return null; }
};
SNM.setUser = function (u) {
  try {
    if (u) localStorage.setItem("snm_user", JSON.stringify(u));
    else localStorage.removeItem("snm_user");
  } catch (e) {}
};
SNM.clearSession = function () {
  try {
    localStorage.removeItem("snm_token");
    localStorage.removeItem("snm_user");
    localStorage.removeItem("snm_pending");
    localStorage.removeItem("snm_role");
  } catch (e) {}
};
SNM.getPending = function () {
  try {
    var r = localStorage.getItem("snm_pending");
    return r ? JSON.parse(r) : null;
  } catch (e) { return null; }
};
SNM.setPending = function (p) {
  try {
    if (p) localStorage.setItem("snm_pending", JSON.stringify(p));
    else localStorage.removeItem("snm_pending");
  } catch (e) {}
};
SNM.getRole = function () {
  try {
    return localStorage.getItem("snm_role") || (SNM.getUser() && SNM.getUser().role) || "buyer";
  } catch (e) { return "buyer"; }
};
SNM.setRole = function (r) {
  try { localStorage.setItem("snm_role", r || "buyer"); } catch (e) {}
};
SNM.setupKey = function () {
  var u = SNM.getUser();
  return "snm_setup_ok_" + ((u && (u.phone || u.id)) || "anon");
};
SNM.isSetupDone = function () {
  try { return localStorage.getItem(SNM.setupKey()) === "1"; } catch (e) { return false; }
};
SNM.markSetupDone = function () {
  try { localStorage.setItem(SNM.setupKey(), "1"); } catch (e) {}
};
SNM.getSetupData = function () {
  try {
    var r = localStorage.getItem(SNM.setupKey() + "_data");
    return r ? JSON.parse(r) : {};
  } catch (e) { return {}; }
};
SNM.saveSetupData = function (data) {
  try { localStorage.setItem(SNM.setupKey() + "_data", JSON.stringify(data || {})); } catch (e) {}
};
