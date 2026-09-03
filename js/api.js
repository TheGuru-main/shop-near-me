window.SNM = window.SNM || {};

SNM.toast = function (msg) {
  try {
    alert(msg);
  } catch (e) {}
};

SNM.renderAssistant = function (el, data) {
  if (!el) return;
  if (!data || !data.message) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML =
    "<strong>Assistant</strong><p>" +
    String(data.message).replace(/</g, "&lt;") +
    "</p><p class='muted'>source: " +
    (data.source || "—") +
    "</p>";
};

SNM.api = async function (path, options) {
  options = options || {};
  var method = (options.method || "GET").toUpperCase();
  var headers = Object.assign(
    { Accept: "application/json" },
    options.headers || {}
  );
  var token = SNM.getToken && SNM.getToken();
  if (token) headers.Authorization = "Bearer " + token;

  var body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  var url = SNM.API_BASE + path;
  var res = await fetch(url, {
    method: method,
    headers: headers,
    body: method === "GET" || method === "HEAD" ? undefined : body
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
      (data && (data.detail || data.message || data.error)) ||
      res.statusText ||
      "Request failed";
    var err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
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
