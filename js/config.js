window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";

SNM.ROLES = [
  { id: "merchant", label: "Merchant", blurb: "Sell goods, catalogue, perishables" },
  { id: "service", label: "Service provider", blurb: "Hotels, repairs, clinics…" },
  { id: "driver", label: "Driver / logistics", blurb: "Okada, keke, courier, van" },
  { id: "emergency", label: "Emergency unit", blurb: "Police, ambulance, clinic, watch" },
  { id: "buyer", label: "Buyer", blurb: "Discover, order mind, fairly used" }
];

SNM.CONTINENTS = [
  { id: "001", name: "North America" },
  { id: "002", name: "South America" },
  { id: "003", name: "Africa" },
  { id: "004", name: "Asia" },
  { id: "005", name: "Europe" },
  { id: "006", name: "Antarctica" },
  { id: "007", name: "Australia / Oceania" }
];

SNM.tokenKey = "snm_token";
SNM.userKey = "snm_user";

SNM.getToken = function () {
  try { return localStorage.getItem(SNM.tokenKey); } catch (e) { return null; }
};

SNM.setSession = function (token, user) {
  try {
    localStorage.setItem(SNM.tokenKey, token || "");
    localStorage.setItem(SNM.userKey, JSON.stringify(user || {}));
  } catch (e) {}
};

SNM.clearSession = function () {
  try {
    localStorage.removeItem(SNM.tokenKey);
    localStorage.removeItem(SNM.userKey);
  } catch (e) {}
};

SNM.getUser = function () {
  try {
    var raw = localStorage.getItem(SNM.userKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

SNM.api = async function (path, options) {
  options = options || {};
  var headers = Object.assign(
    { "Content-Type": "application/json", Accept: "application/json" },
    options.headers || {}
  );
  var token = SNM.getToken();
  if (token) headers.Authorization = "Bearer " + token;
  var res = await fetch(SNM.API_BASE + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  var data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    var err = new Error((data && data.detail) || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};
