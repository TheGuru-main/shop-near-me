window.SNM = window.SNM || {};

SNM.qs = function (params) {
  var parts = [];
  Object.keys(params || {}).forEach(function (k) {
    var v = params[k];
    if (v === undefined || v === null || v === "") return;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
  });
  return parts.length ? "?" + parts.join("&") : "";
};

SNM.api = async function (path, options) {
  options = options || {};
  var method = (options.method || "GET").toUpperCase();
  var headers = Object.assign(
    { Accept: "application/json" },
    options.headers || {}
  );

  var token = SNM.getToken ? SNM.getToken() : null;
  if (token) headers.Authorization = "Bearer " + token;

  var init = { method: method, headers: headers };

  if (options.body !== undefined && options.body !== null) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  var url = SNM.API_BASE + path;
  var res = await fetch(url, init);
  var text = await res.text();
  var data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { detail: text || "Invalid JSON from server" };
  }

  if (!res.ok) {
    var err = new Error(
      (data && (data.detail || data.message)) ||
        "Request failed (" + res.status + ")"
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

SNM.renderAssistant = function (prefix, assistant, extraMeta) {
  var card = document.getElementById(prefix + "AiCard");
  var body = document.getElementById(prefix + "AiBody");
  var source = document.getElementById(prefix + "AiSource");
  var meta = document.getElementById(prefix + "AiMeta");
  if (!card || !body) return;

  if (!assistant || !assistant.message) {
    card.hidden = true;
    body.textContent = "";
    if (source) source.textContent = "—";
    if (meta) meta.textContent = "";
    return;
  }

  body.textContent = assistant.message;
  if (source) source.textContent = assistant.source || "assistant";
  if (meta) {
    var bits = [];
    if (assistant.mode) bits.push(assistant.mode);
    if (extraMeta) bits.push(extraMeta);
    meta.textContent = bits.join(" · ");
  }
  card.hidden = false;
};

SNM.toast = function (msg, ms) {
  var el = document.getElementById("toast");
  if (!el) {
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(SNM._toastTimer);
  SNM._toastTimer = setTimeout(function () {
    el.hidden = true;
  }, ms || 2800);
};
