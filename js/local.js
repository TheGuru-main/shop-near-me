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

SNM.clearSession = function () {
  SNM.setToken("");
  SNM.setUser(null);
  try {
    localStorage.removeItem("snm_pending");
    localStorage.removeItem("snm_role");
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

SNM.getRole = function () {
  try {
    return localStorage.getItem("snm_role") || (SNM.getUser() || {}).role || "";
  } catch (e) {
    return "";
  }
};

SNM.setRole = function (r) {
  try {
    if (r) localStorage.setItem("snm_role", r);
    else localStorage.removeItem("snm_role");
  } catch (e) {}
};
