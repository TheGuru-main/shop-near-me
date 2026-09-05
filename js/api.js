window.SNM = window.SNM || {};

SNM.api = async function (path, options) {
  options = options || {};
  var url = SNM.API_BASE + path;
  var headers = Object.assign(
    { Accept: "application/json", "Content-Type": "application/json" },
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
    var err = new Error(
      (data && (data.detail || data.message)) || res.statusText || "Request failed"
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

SNM.qs = function (obj) {
  var parts = [];
  Object.keys(obj || {}).forEach(function (k) {
    var v = obj[k];
    if (v === undefined || v === null || v === "") return;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
  });
  return parts.length ? "?" + parts.join("&") : "";
};
