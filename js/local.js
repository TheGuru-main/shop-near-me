window.SNM = window.SNM || {};

SNM.getToken = function () {
  try {
    return localStorage.getItem("snm_token") || "";
  } catch (e) {
    return "";
  }
};

SNM.setToken = function (t) {
  try {
    if (t) localStorage.setItem("snm_token", t);
    else localStorage.removeItem("snm_token");
  } catch (e) {}
};

SNM.getUser = function () {
  try {
    var raw = localStorage.getItem("snm_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setUser = function (u) {
  try {
    if (u) localStorage.setItem("snm_user", JSON.stringify(u));
    else localStorage.removeItem("snm_user");
  } catch (e) {}
};

SNM.getPending = function () {
  try {
    var raw = localStorage.getItem("snm_pending");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

SNM.setPending = function (p) {
  try {
    if (p) localStorage.setItem("snm_pending", JSON.stringify(p));
    else localStorage.removeItem("snm_pending");
  } catch (e) {}
};

SNM.setupDone = function () {
  try {
    return localStorage.getItem("snm_setup_done") === "1";
  } catch (e) {
    return false;
  }
};

SNM.setSetupDone = function (v) {
  try {
    if (v) localStorage.setItem("snm_setup_done", "1");
    else localStorage.removeItem("snm_setup_done");
  } catch (e) {}
};

SNM.clearSession = function () {
  try {
    localStorage.removeItem("snm_token");
    localStorage.removeItem("snm_user");
    localStorage.removeItem("snm_pending");
    localStorage.removeItem("snm_setup_done");
  } catch (e) {}
};

SNM.getRole = function () {
  var u = SNM.getUser();
  var r =
    (u && u.role) ||
    sessionStorage.getItem("snm_role") ||
    sessionStorage.getItem("snm_reg_role") ||
    "buyer";
  r = String(r || "buyer").toLowerCase().trim();
  if (r === "logistics") r = "driver";
  return r;
};

SNM.setRolePick = function (role) {
  try {
    sessionStorage.setItem("snm_role", role || "buyer");
  } catch (e) {}
};
