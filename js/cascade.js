window.SNM = window.SNM || {};

SNM.composePhone = function () {
  var dialEl = document.getElementById("reg-dial");
  var localEl = document.getElementById("reg-phone-local");
  var hidden = document.getElementById("reg-phone");
  var dial = String((dialEl && dialEl.textContent) || "+").replace(/\s+/g, "");
  if (dial.charAt(0) !== "+") dial = "+" + dial.replace(/\D/g, "");
  var local = String((localEl && localEl.value) || "").replace(/\D/g, "");
  while (local.length && local.charAt(0) === "0") local = local.slice(1);
  var full = dial + local;
  if (hidden) hidden.value = full;
  return full;
};

SNM.applyDial = function (dial) {
  var el = document.getElementById("reg-dial");
  if (el) el.textContent = dial || "+";
  SNM.composePhone();
};

SNM._fillSelect = function (sel, items, placeholder, disabled) {
  if (!sel) return;
  sel.innerHTML = "";
  var o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = placeholder || "Select";
  sel.appendChild(o0);
  (items || []).forEach(function (it) {
    var o = document.createElement("option");
    if (typeof it === "string") {
      o.value = it;
      o.textContent = it;
    } else {
      o.value = it.name || "";
      o.textContent = it.name || "";
      if (it.dial) o.setAttribute("data-dial", it.dial);
      if (it.iso) o.setAttribute("data-iso", it.iso);
    }
    sel.appendChild(o);
  });
  sel.disabled = !!disabled;
};

SNM._resetBelowCountry = function () {
  SNM._fillSelect(document.getElementById("reg-region"), [], "Select country first", true);
  SNM._fillSelect(document.getElementById("reg-city"), [], "Select state first", true);
  SNM._fillSelect(document.getElementById("reg-community"), [], "Select city first", true);
};

SNM._loadRegionsForCountry = function (countryName) {
  var tree = (SNM.PLACES_BY_COUNTRY || {})[countryName] || {};
  var regions = Object.keys(tree);
  if (!regions.length) regions = ["Other"];
  SNM._fillSelect(
    document.getElementById("reg-region"),
    regions,
    "Select state / region",
    false
  );
  SNM._fillSelect(document.getElementById("reg-city"), [], "Select state first", true);
  SNM._fillSelect(document.getElementById("reg-community"), [], "Select city first", true);
};

SNM._loadCitiesForRegion = function (countryName, regionName) {
  var tree = (SNM.PLACES_BY_COUNTRY || {})[countryName] || {};
  var citiesObj = tree[regionName] || {};
  var cities = Object.keys(citiesObj);
  if (!cities.length) cities = ["Other"];
  SNM._fillSelect(document.getElementById("reg-city"), cities, "Select city / town", false);
  SNM._fillSelect(document.getElementById("reg-community"), [], "Select city first", true);
};

SNM._loadCommunitiesForCity = function (countryName, regionName, cityName) {
  var tree = (SNM.PLACES_BY_COUNTRY || {})[countryName] || {};
  var citiesObj = tree[regionName] || {};
  var comms = citiesObj[cityName] || [];
  if (!comms.length) comms = ["Other"];
  SNM._fillSelect(
    document.getElementById("reg-community"),
    comms,
    "Select community / LGA",
    false
  );
};

SNM.bindCascade = function () {
  var cont = document.getElementById("reg-continent");
  var country = document.getElementById("reg-country");
  var region = document.getElementById("reg-region");
  var city = document.getElementById("reg-city");
  var community = document.getElementById("reg-community");
  var localPhone = document.getElementById("reg-phone-local");

  if (!cont || !country) return;

  /* Continents from countries.js */
  cont.innerHTML = '<option value="">Select continent</option>';
  (SNM.CONTINENTS || []).forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name + (c.code ? " (" + c.code + ")" : "");
    cont.appendChild(o);
  });

  SNM._fillSelect(country, [], "Select continent first", true);
  SNM._resetBelowCountry();
  SNM.applyDial("+");

  cont.onchange = function () {
    var id = cont.value;
    var list = (SNM.COUNTRIES_BY_CONTINENT || {})[id] || [];
    SNM._fillSelect(
      country,
      list,
      list.length ? "Select country" : "No countries in list",
      !list.length
    );
    SNM._resetBelowCountry();
    SNM.applyDial("+");
  };

  country.onchange = function () {
    var opt = country.options[country.selectedIndex];
    var dial = (opt && opt.getAttribute("data-dial")) || "+";
    SNM.applyDial(dial);
    var cname = country.value;
    if (!cname) {
      SNM._resetBelowCountry();
      return;
    }
    SNM._loadRegionsForCountry(cname);
  };

  if (region) {
    region.onchange = function () {
      var cname = country.value;
      var rname = region.value;
      if (!cname || !rname) {
        SNM._fillSelect(city, [], "Select state first", true);
        SNM._fillSelect(community, [], "Select city first", true);
        return;
      }
      SNM._loadCitiesForRegion(cname, rname);
    };
  }

  if (city) {
    city.onchange = function () {
      var cname = country.value;
      var rname = region.value;
      var cityName = city.value;
      if (!cname || !rname || !cityName) {
        SNM._fillSelect(community, [], "Select city first", true);
        return;
      }
      SNM._loadCommunitiesForCity(cname, rname, cityName);
    };
  }

  if (localPhone) {
    localPhone.addEventListener("input", function () {
      var v = String(localPhone.value || "").replace(/\D/g, "");
      while (v.length && v.charAt(0) === "0") v = v.slice(1);
      localPhone.value = v;
      SNM.composePhone();
    });
  }
};
