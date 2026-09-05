window.SNM = window.SNM || {};

SNM._fillSelect = function (el, items, placeholder, disabled) {
  if (!el) return;
  el.innerHTML = "";
  var ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder || "Select";
  ph.disabled = true;
  ph.selected = true;
  el.appendChild(ph);
  (items || []).forEach(function (it) {
    var o = document.createElement("option");
    o.value = typeof it === "string" ? it : it.name || it;
    o.textContent = typeof it === "string" ? it : it.name || it;
    el.appendChild(o);
  });
  el.disabled = !!disabled;
};

SNM.composePhone = function () {
  var dialEl = document.getElementById("reg-dial");
  var localEl = document.getElementById("reg-local");
  var hidden = document.getElementById("reg-phone");
  if (!localEl || !hidden) return "";
  var dial = (dialEl && dialEl.textContent) || "";
  dial = String(dial).trim();
  if (dial && dial.charAt(0) !== "+") dial = "+" + dial.replace(/\D/g, "");
  var local = String(localEl.value || "").replace(/\D/g, "");
  while (local.charAt(0) === "0") local = local.slice(1);
  localEl.value = local;
  var full = dial + local;
  hidden.value = full;
  return full;
};

SNM.applyDialForCountry = function (countryName) {
  var c = SNM.countryByName(countryName);
  var dialEl = document.getElementById("reg-dial");
  if (dialEl) dialEl.textContent = (c && c.dial) || "+";
  SNM.composePhone();
};

SNM.initRegisterCascade = function () {
  var cont = document.getElementById("reg-continent");
  var country = document.getElementById("reg-country");
  var region = document.getElementById("reg-region");
  var city = document.getElementById("reg-city");
  var community = document.getElementById("reg-community");
  var localPhone = document.getElementById("reg-local");

  if (!cont) return;

  /* Continents from locked config */
  cont.innerHTML = "";
  var ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "Select continent";
  ph.disabled = true;
  ph.selected = true;
  cont.appendChild(ph);
  (SNM.CONTINENTS || []).forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    cont.appendChild(o);
  });

  SNM._fillSelect(country, [], "Select continent first", true);
  SNM._fillSelect(region, [], "Select country first", true);
  SNM._fillSelect(city, [], "Select state first", true);
  SNM._fillSelect(community, [], "Select city/LGA first", true);

  cont.onchange = function () {
    var id = cont.value;
    var list = (SNM.CASCADE_COUNTRIES && SNM.CASCADE_COUNTRIES[id]) || [];
    SNM._fillSelect(country, list, list.length ? "Select country" : "No countries listed", !list.length);
    SNM._fillSelect(region, [], "Select country first", true);
    SNM._fillSelect(city, [], "Select state first", true);
    SNM._fillSelect(community, [], "Select city/LGA first", true);
    var dialEl = document.getElementById("reg-dial");
    if (dialEl) dialEl.textContent = "+";
  };

  country.onchange = function () {
    var name = country.value;
    SNM.applyDialForCountry(name);
    var places = (SNM.CASCADE_PLACES && SNM.CASCADE_PLACES[name]) || { Other: { Other: ["Other"] } };
    var states = Object.keys(places);
    if (!states.length) states = ["Other"];
    SNM._fillSelect(region, states, "Select state / region", false);
    SNM._fillSelect(city, [], "Select state first", true);
    SNM._fillSelect(community, [], "Select city/LGA first", true);
  };

  region.onchange = function () {
    var name = country.value;
    var places = (SNM.CASCADE_PLACES && SNM.CASCADE_PLACES[name]) || {};
    var citiesMap = places[region.value] || { Other: ["Other"] };
    var cityNames = Object.keys(citiesMap);
    if (!cityNames.length) cityNames = ["Other"];
    SNM._fillSelect(city, cityNames, "Select city / town / LGA", false);
    SNM._fillSelect(community, [], "Select city/LGA first", true);
  };

  city.onchange = function () {
    var name = country.value;
    var places = (SNM.CASCADE_PLACES && SNM.CASCADE_PLACES[name]) || {};
    var citiesMap = places[region.value] || {};
    var comms = citiesMap[city.value] || ["Other"];
    if (!comms.length) comms = ["Other"];
    SNM._fillSelect(community, comms, "Select community", false);
  };

  if (localPhone) {
    localPhone.addEventListener("input", function () {
      SNM.composePhone();
    });
  }
};

SNM.bindCascade = function () {
  /* Cascade binds when register opens; init also safe at boot */
  if (document.getElementById("reg-continent")) {
    SNM.initRegisterCascade();
  }
};
