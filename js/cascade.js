window.SNM = window.SNM || {};

/** Continent id -> countries [{ name, iso, dial }] */
SNM.CASCADE_COUNTRIES = {
  "001": [
    { name: "Nigeria", iso: "NG", dial: "+234" },
    { name: "Ghana", iso: "GH", dial: "+233" },
    { name: "Kenya", iso: "KE", dial: "+254" },
    { name: "South Africa", iso: "ZA", dial: "+27" },
    { name: "Egypt", iso: "EG", dial: "+20" },
    { name: "Morocco", iso: "MA", dial: "+212" },
    { name: "Ethiopia", iso: "ET", dial: "+251" },
    { name: "Uganda", iso: "UG", dial: "+256" },
    { name: "Tanzania", iso: "TZ", dial: "+255" },
    { name: "Rwanda", iso: "RW", dial: "+250" },
    { name: "Senegal", iso: "SN", dial: "+221" },
    { name: "Côte d'Ivoire", iso: "CI", dial: "+225" },
    { name: "Cameroon", iso: "CM", dial: "+237" },
    { name: "Algeria", iso: "DZ", dial: "+213" },
    { name: "Tunisia", iso: "TN", dial: "+216" },
    { name: "Angola", iso: "AO", dial: "+244" },
    { name: "Mozambique", iso: "MZ", dial: "+258" },
    { name: "Zambia", iso: "ZM", dial: "+260" },
    { name: "Zimbabwe", iso: "ZW", dial: "+263" },
    { name: "Botswana", iso: "BW", dial: "+267" },
    { name: "Namibia", iso: "NA", dial: "+264" },
    { name: "Malawi", iso: "MW", dial: "+265" },
    { name: "Mali", iso: "ML", dial: "+223" },
    { name: "Burkina Faso", iso: "BF", dial: "+226" },
    { name: "Benin", iso: "BJ", dial: "+229" },
    { name: "Togo", iso: "TG", dial: "+228" },
    { name: "Niger", iso: "NE", dial: "+227" },
    { name: "Chad", iso: "TD", dial: "+235" },
    { name: "Sudan", iso: "SD", dial: "+249" },
    { name: "South Sudan", iso: "SS", dial: "+211" },
    { name: "DR Congo", iso: "CD", dial: "+243" },
    { name: "Congo", iso: "CG", dial: "+242" },
    { name: "Gabon", iso: "GA", dial: "+241" },
    { name: "Liberia", iso: "LR", dial: "+231" },
    { name: "Sierra Leone", iso: "SL", dial: "+232" },
    { name: "Guinea", iso: "GN", dial: "+224" },
    { name: "Gambia", iso: "GM", dial: "+220" },
    { name: "Madagascar", iso: "MG", dial: "+261" },
    { name: "Mauritius", iso: "MU", dial: "+230" },
    { name: "Somalia", iso: "SO", dial: "+252" }
  ],
  "002": [
    { name: "United States", iso: "US", dial: "+1" },
    { name: "Canada", iso: "CA", dial: "+1" },
    { name: "Mexico", iso: "MX", dial: "+52" },
    { name: "Jamaica", iso: "JM", dial: "+1876" },
    { name: "Trinidad and Tobago", iso: "TT", dial: "+1868" }
  ],
  "003": [
    { name: "Brazil", iso: "BR", dial: "+55" },
    { name: "Argentina", iso: "AR", dial: "+54" },
    { name: "Colombia", iso: "CO", dial: "+57" },
    { name: "Chile", iso: "CL", dial: "+56" },
    { name: "Peru", iso: "PE", dial: "+51" }
  ],
  "004": [
    { name: "India", iso: "IN", dial: "+91" },
    { name: "China", iso: "CN", dial: "+86" },
    { name: "Japan", iso: "JP", dial: "+81" },
    { name: "South Korea", iso: "KR", dial: "+82" },
    { name: "Indonesia", iso: "ID", dial: "+62" },
    { name: "Pakistan", iso: "PK", dial: "+92" },
    { name: "Bangladesh", iso: "BD", dial: "+880" },
    { name: "Philippines", iso: "PH", dial: "+63" },
    { name: "Vietnam", iso: "VN", dial: "+84" },
    { name: "Thailand", iso: "TH", dial: "+66" },
    { name: "Malaysia", iso: "MY", dial: "+60" },
    { name: "Singapore", iso: "SG", dial: "+65" },
    { name: "Saudi Arabia", iso: "SA", dial: "+966" },
    { name: "United Arab Emirates", iso: "AE", dial: "+971" },
    { name: "Turkey", iso: "TR", dial: "+90" }
  ],
  "005": [
    { name: "United Kingdom", iso: "GB", dial: "+44" },
    { name: "France", iso: "FR", dial: "+33" },
    { name: "Germany", iso: "DE", dial: "+49" },
    { name: "Spain", iso: "ES", dial: "+34" },
    { name: "Italy", iso: "IT", dial: "+39" },
    { name: "Netherlands", iso: "NL", dial: "+31" },
    { name: "Portugal", iso: "PT", dial: "+351" },
    { name: "Sweden", iso: "SE", dial: "+46" },
    { name: "Poland", iso: "PL", dial: "+48" },
    { name: "Ireland", iso: "IE", dial: "+353" }
  ],
  "006": [],
  "007": [
    { name: "Australia", iso: "AU", dial: "+61" },
    { name: "New Zealand", iso: "NZ", dial: "+64" },
    { name: "Fiji", iso: "FJ", dial: "+679" },
    { name: "Papua New Guinea", iso: "PG", dial: "+675" }
  ]
};

/**
 * ISO -> states -> cities -> communities
 * Nigeria-first depth; other countries seed major regions (extend via geo resolve later).
 */
SNM.CASCADE_PLACES = {
  NG: {
    "Abia": {
      "Aba": ["Aba North", "Aba South", "Osisioma"],
      "Umuahia": ["Umuahia North", "Umuahia South"]
    },
    "Adamawa": {
      "Yola": ["Yola North", "Yola South", "Girei"]
    },
    "Akwa Ibom": {
      "Uyo": ["Uyo", "Itu", "Ibesikpo Asutan"]
    },
    "Anambra": {
      "Awka": ["Awka North", "Awka South"],
      "Onitsha": ["Onitsha North", "Onitsha South"]
    },
    "Bauchi": { "Bauchi": ["Bauchi", "Toro"] },
    "Bayelsa": { "Yenagoa": ["Yenagoa", "Southern Ijaw"] },
    "Benue": { "Makurdi": ["Makurdi", "Guma"] },
    "Borno": { "Maiduguri": ["Maiduguri", "Jere"] },
    "Cross River": { "Calabar": ["Calabar Municipal", "Calabar South"] },
    "Delta": {
      "Asaba": ["Oshimili South", "Oshimili North"],
      "Warri": ["Warri South", "Warri North", "Uvwie"]
    },
    "Ebonyi": { "Abakaliki": ["Abakaliki", "Ebonyi"] },
    "Edo": { "Benin City": ["Oredo", "Egor", "Ikpoba-Okha"] },
    "Ekiti": { "Ado-Ekiti": ["Ado-Ekiti", "Ikere"] },
    "Enugu": { "Enugu": ["Enugu North", "Enugu South", "Enugu East"] },
    "FCT": {
      "Abuja": ["AMAC", "Bwari", "Gwagwalada", "Kuje", "Kwali"]
    },
    "Gombe": { "Gombe": ["Gombe", "Akko"] },
    "Imo": { "Owerri": ["Owerri Municipal", "Owerri North", "Owerri West"] },
    "Jigawa": { "Dutse": ["Dutse", "Birnin Kudu"] },
    "Kaduna": {
      "Kaduna": ["Kaduna North", "Kaduna South", "Chikun", "Igabi"]
    },
    "Kano": {
      "Kano": ["Kano Municipal", "Nassarawa", "Fagge", "Dala", "Gwale"]
    },
    "Katsina": { "Katsina": ["Katsina", "Batagarawa"] },
    "Kebbi": { "Birnin Kebbi": ["Birnin Kebbi", "Aleiro"] },
    "Kogi": { "Lokoja": ["Lokoja", "Kogi"] },
    "Kwara": { "Ilorin": ["Ilorin East", "Ilorin West", "Ilorin South"] },
    "Lagos": {
      "Lagos": [
        "Ikeja",
        "Eti-Osa",
        "Surulere",
        "Lagos Island",
        "Lagos Mainland",
        "Alimosho",
        "Kosofe",
        "Mushin",
        "Oshodi-Isolo",
        "Agege",
        "Ifako-Ijaiye",
        "Shomolu",
        "Ajeromi-Ifelodun",
        "Amuwo-Odofin",
        "Apapa",
        "Badagry",
        "Epe",
        "Ibeju-Lekki",
        "Ikorodu"
      ]
    },
    "Nasarawa": { "Lafia": ["Lafia", "Keffi"] },
    "Niger": { "Minna": ["Chanchaga", "Bosso"] },
    "Ogun": {
      "Abeokuta": ["Abeokuta North", "Abeokuta South"],
      "Ijebu-Ode": ["Ijebu-Ode", "Odogbolu"]
    },
    "Ondo": { "Akure": ["Akure North", "Akure South"] },
    "Osun": { "Osogbo": ["Osogbo", "Olorunda"] },
    "Oyo": {
      "Ibadan": [
        "Ibadan North",
        "Ibadan North-East",
        "Ibadan North-West",
        "Ibadan South-East",
        "Ibadan South-West"
      ]
    },
    "Plateau": { "Jos": ["Jos North", "Jos South", "Jos East"] },
    "Rivers": {
      "Port Harcourt": [
        "Port Harcourt",
        "Obio/Akpor",
        "Eleme",
        "Oyigbo",
        "Ikwerre",
        "Eneka",
        "Rumuokoro",
        "Rumuodara"
      ],
      "Bonny": ["Bonny"]
    },
    "Sokoto": { "Sokoto": ["Sokoto North", "Sokoto South"] },
    "Taraba": { "Jalingo": ["Jalingo"] },
    "Yobe": { "Damaturu": ["Damaturu"] },
    "Zamfara": { "Gusau": ["Gusau"] }
  },
  GH: {
    "Greater Accra": { "Accra": ["Accra Metropolitan", "Tema", "Ashaiman"] },
    "Ashanti": { "Kumasi": ["Kumasi Metropolitan"] }
  },
  KE: {
    "Nairobi": { "Nairobi": ["Westlands", "Kibra", "Langata"] },
    "Mombasa": { "Mombasa": ["Mvita", "Nyali"] }
  },
  ZA: {
    "Gauteng": { "Johannesburg": ["Johannesburg", "Sandton"], "Pretoria": ["Pretoria"] },
    "Western Cape": { "Cape Town": ["Cape Town"] }
  },
  US: {
    "California": { "Los Angeles": ["Downtown", "Hollywood"], "San Francisco": ["Mission"] },
    "New York": { "New York": ["Manhattan", "Brooklyn", "Queens"] },
    "Texas": { "Houston": ["Downtown"], "Austin": ["Central"] }
  },
  GB: {
    "England": { "London": ["Westminster", "Camden", "Greenwich"], "Manchester": ["City Centre"] }
  },
  IN: {
    "Maharashtra": { "Mumbai": ["Andheri", "Bandra"], "Pune": ["Hinjewadi"] },
    "Delhi": { "New Delhi": ["Connaught Place"] }
  }
};

SNM.cascadeFill = function (sel, items, placeholder) {
  if (!sel) return;
  var opts = '<option value="">' + (placeholder || "Select") + "</option>";
  (items || []).forEach(function (it) {
    if (typeof it === "string") {
      opts += '<option value="' + it + '">' + it + "</option>";
    } else {
      opts +=
        '<option value="' +
        (it.name || "") +
        '" data-iso="' +
        (it.iso || "") +
        '" data-dial="' +
        (it.dial || "") +
        '">' +
        (it.name || "") +
        "</option>";
    }
  });
  sel.innerHTML = opts;
  sel.disabled = !items || !items.length;
};

SNM.cascadeResetBelow = function (level) {
  var map = {
    continent: ["reg-country", "reg-region", "reg-city", "reg-community"],
    country: ["reg-region", "reg-city", "reg-community"],
    region: ["reg-city", "reg-community"],
    city: ["reg-community"]
  };
  (map[level] || []).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Select</option>';
    el.disabled = true;
  });
};

SNM.applyDial = function (dial) {
  var phone = document.getElementById("reg-phone");
  if (!phone || !dial) return;
  var cur = (phone.value || "").trim();
  // keep local digits if user already typed after a dial
  var local = cur.replace(/^\+\d{1,4}/, "").replace(/\D/g, "");
  phone.value = dial + local;
  phone.placeholder = dial + "…";
};

SNM.bindCascade = function () {
  var cont = document.getElementById("reg-continent");
  var country = document.getElementById("reg-country");
  var region = document.getElementById("reg-region");
  var city = document.getElementById("reg-city");
  var community = document.getElementById("reg-community");

  if (!cont || !country) return;

  // ensure selects (if still inputs in HTML, skip — HTML must use <select>)
  cont.addEventListener("change", function () {
    SNM.cascadeResetBelow("continent");
    var id = cont.value;
    var list = SNM.CASCADE_COUNTRIES[id] || [];
    SNM.cascadeFill(country, list, "Select country");
  });

  country.addEventListener("change", function () {
    SNM.cascadeResetBelow("country");
    var opt = country.options[country.selectedIndex];
    var iso = opt ? opt.getAttribute("data-iso") || "" : "";
    var dial = opt ? opt.getAttribute("data-dial") || "" : "";
    SNM._selectedIso = iso;
    SNM.applyDial(dial);

    var tree = SNM.CASCADE_PLACES[iso] || {};
    var states = Object.keys(tree);
    SNM.cascadeFill(region, states, "Select state / region");
  });

  region.addEventListener("change", function () {
    SNM.cascadeResetBelow("region");
    var tree = (SNM.CASCADE_PLACES[SNM._selectedIso] || {})[region.value] || {};
    var cities = Object.keys(tree);
    SNM.cascadeFill(city, cities, "Select city / town");
  });

  city.addEventListener("change", function () {
    SNM.cascadeResetBelow("city");
    var tree =
      ((SNM.CASCADE_PLACES[SNM._selectedIso] || {})[region.value] || {})[
        city.value
      ] || [];
    SNM.cascadeFill(community, tree, "Select community / LGA");
  });
};
