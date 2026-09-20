window.SNM = window.SNM || {};

SNM.getToken =
  SNM.getToken ||
  function () {
    try {
      return localStorage.getItem("snm_token") || "";
    } catch (e) {
      return "";
    }
  };

SNM.setToken =
  SNM.setToken ||
  function (t) {
    try {
      if (t) localStorage.setItem("snm_token", t);
      else localStorage.removeItem("snm_token");
    } catch (e) {}
  };

SNM.getUser =
  SNM.getUser ||
  function () {
    try {
      return JSON.parse(localStorage.getItem("snm_user") || "null");
    } catch (e) {
      return null;
    }
  };

SNM.setUser =
  SNM.setUser ||
  function (u) {
    try {
      localStorage.setItem("snm_user", JSON.stringify(u || null));
    } catch (e) {}
  };

SNM.clearSession =
  SNM.clearSession ||
  function () {
    SNM.setToken("");
    SNM.setUser(null);
  };

SNM.qs = function (obj) {
  var parts = [];
  Object.keys(obj || {}).forEach(function (k) {
    var v = obj[k];
    if (v === undefined || v === null || v === "") return;
    parts.push(
      encodeURIComponent(k) + "=" + encodeURIComponent(String(v))
    );
  });
  return parts.length ? "?" + parts.join("&") : "";
};

SNM.api = async function (path, options) {
  options = options || {};
  var url =
    path.indexOf("http") === 0 ? path : (SNM.API_BASE || "") + path;
  var headers = Object.assign(
    {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    options.headers || {}
  );
  var token = SNM.getToken && SNM.getToken();
  if (token) headers.Authorization = "Bearer " + token;

  var res = await fetch(url, {
    method: options.method || "GET",
    headers: headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined
  });

  var text = await res.text();
  var data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  if (!res.ok) {
    var detail =
      (data && (data.detail || data.message)) ||
      res.statusText ||
      "Request failed";
    if (typeof detail === "object") {
      try {
        detail = JSON.stringify(detail);
      } catch (e2) {
        detail = "Request failed";
      }
    }
    var err = new Error(String(detail));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};