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

SNM.uploadMedia = async function (file, kind) {
  kind = kind || "product";
  var base = SNM.API_BASE || "";
  var token = typeof SNM.getToken === "function" ? SNM.getToken() : "";
  var fd = new FormData();
  var toSend = file;
  if (file && String(file.type || "").indexOf("image/") === 0 && typeof SNM.compressImageFile === "function") {
    var dataUrl = await SNM.compressImageFile(file, 1280, 0.72);
    if (dataUrl.length > 900000) dataUrl = await SNM.compressImageFile(file, 960, 0.6);
    if (dataUrl.length > 900000) dataUrl = await SNM.compressImageFile(file, 720, 0.5);
    var blob = await (await fetch(dataUrl)).blob();
    toSend = new File([blob], "photo.jpg", { type: "image/jpeg" });
  }
  fd.append("file", toSend);
  var url =
    base + "/media/upload?kind=" + encodeURIComponent(kind);
  var res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : {},
    body: fd
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
      (data && (data.detail || data.message)) || res.statusText || "Upload failed";
    if (typeof detail === "object") {
      try {
        detail = JSON.stringify(detail);
      } catch (e2) {
        detail = "Upload failed";
      }
    }
    throw new Error(String(detail));
  }
  return data;
};


/** Upload many files; returns { urls: [], media_type } */
SNM.uploadMediaFiles = async function (fileList, kind) {
  var files = [];
  if (!fileList) return { urls: [], media_type: null };
  for (var i = 0; i < fileList.length; i++) {
    if (fileList[i]) files.push(fileList[i]);
  }
  var urls = [];
  var mediaType = null;
  for (var j = 0; j < files.length; j++) {
    var up = await SNM.uploadMedia(files[j], kind || "product");
    if (up && up.url) {
      urls.push(up.url);
      if (!mediaType && up.media_type) mediaType = up.media_type;
    }
  }
  return { urls: urls, media_type: mediaType };
};

SNM._filesFromInputs = function () {
  var out = [];
  for (var i = 0; i < arguments.length; i++) {
    var el = document.getElementById(arguments[i]);
    if (el && el.files && el.files.length) {
      for (var j = 0; j < el.files.length; j++) out.push(el.files[j]);
    }
  }
  return out;
};
