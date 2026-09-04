window.SNM = window.SNM || {};

SNM.toast = function (msg) {
  try { alert(String(msg || "")); } catch (e) {}
};

SNM.api = async function (path, opts) {
  opts = opts || {};
  var url = SNM.API_BASE + path;
  var headers = opts.headers || {};
  headers["Accept"] = "application/json";
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  var token = SNM.getToken && SNM.getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  var res = await fetch(url, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body || undefined
  });

  var text = await res.text();
  var data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }

  if (!res.ok) {
    var detail = (data && (data.detail || data.message)) || text || res.statusText;
    if (Array.isArray(detail)) {
      detail = detail.map(function (d) {
        return (d.loc ? d.loc.join(".") + ": " : "") + (d.msg || JSON.stringify(d));
      }).join("; ");
    }
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
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") return;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
  });
  return parts.length ? "?" + parts.join("&") : "";
};

SNM.renderAssistant = function (el, assistant) {
  if (!el) return;
  if (!assistant || !assistant.message) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML =
    "<strong>Assistant · " + (assistant.source || "ai") + "</strong>" +
    "<div>" + String(assistant.message).replace(/</g, "&lt;") + "</div>";
};
