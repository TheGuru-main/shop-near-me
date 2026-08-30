window.SNM = window.SNM || {};

/* Hierarchy: continent → country → state → city → community
   Expandable; Nigeria / Rivers dense for Eneka launch. */
SNM.GEO = {
  "001": {
    "United States": {
      California: { "Los Angeles": ["Downtown", "Hollywood"], "San Francisco": ["Mission", "SOMA"] }
    },
    Canada: {
      Ontario: { Toronto: ["Downtown", "Scarborough"] }
    }
  },
  "002": {
    Brazil: {
      "São Paulo": { "São Paulo": ["Centro", "Pinheiros"] }
    }
  },
  "003": {
    Nigeria: {
      Rivers: {
        "Port Harcourt": ["Eneka", "Rumuokoro", "GRA", "Diobu", "Woji"],
        "Obio-Akpor": ["Rumuodara", "Choba"]
      },
      Lagos: {
        Ikeja: ["Allen", "Opebi"],
        "Lagos Island": ["Marina", "CMS"],
        "Eti-Osa": ["Lekki", "Ajah"]
      },
      Abuja: {
        "Municipal Area Council": ["Garki", "Wuse", "Maitama"]
      },
      Kano: {
        "Kano Municipal": ["Fagge", "Nassarawa"]
      }
    },
    Ghana: {
      "Greater Accra": { Accra: ["Osu", "Labone"] }
    },
    Kenya: {
      Nairobi: { Nairobi: ["Westlands", "CBD"] }
    },
    "South Africa": {
      Gauteng: { Johannesburg: ["Sandton", "Soweto"] }
    },
    Egypt: {
      Cairo: { Cairo: ["Zamalek", "Nasr City"] }
    }
  },
  "004": {
    India: {
      Maharashtra: { Mumbai: ["Andheri", "Bandra"] }
    },
    China: {
      Beijing: { Beijing: ["Chaoyang", "Haidian"] }
    },
    Japan: {
      Tokyo: { Tokyo: ["Shibuya", "Shinjuku"] }
    }
  },
  "005": {
    "United Kingdom": {
      England: { London: ["Westminster", "Camden"] }
    },
    France: {
      "Île-de-France": { Paris: ["Louvre", "Montmartre"] }
    },
    Germany: {
      Berlin: { Berlin: ["Mitte", "Kreuzberg"] }
    }
  },
  "006": {},
  "007": {
    Australia: {
      "New South Wales": { Sydney: ["CBD", "Bondi"] }
    },
    "New Zealand": {
      Auckland: { Auckland: ["CBD", "Ponsonby"] }
    }
  }
};

function fillSelect(sel, options, placeholder) {
  if (!sel) return;
  var html = '<option value="">' + (placeholder || "Select") + "</option>";
  (options || []).forEach(function (o) {
    html += '<option value="' + SNM.escapeHtml(o) + '">' + SNM.escapeHtml(o) + "</option>";
  });
  sel.innerHTML = html;
  sel.disabled = !options || !options.length;
}

SNM.bindCascade = function () {
  var cont = document.getElementById("reg-continent");
  var country = document.getElementById("reg-country");
  var region = document.getElementById("reg-region");
  var city = document.getElementById("reg-city");
  var community = document.getElementById("reg-community");
  if (!cont || !country) return;

  cont.innerHTML = (SNM.CONTINENTS || [])
    .map(function (c) {
      return '<option value="' + c.id + '">' + c.name + "</option>";
    })
    .join("");

  function resetFrom(level) {
    if (level <= 1) fillSelect(country, [], "Select continent first");
    if (level <= 2) fillSelect(region, [], "Select country first");
    if (level <= 3) fillSelect(city, [], "Select state first");
    if (level <= 4) fillSelect(community, [], "Select city first");
  }

  cont.onchange = function () {
    var block = SNM.GEO[cont.value] || {};
    fillSelect(country, Object.keys(block), "Select country");
    resetFrom(2);
  };

  country.onchange = function () {
    var block = (SNM.GEO[cont.value] || {})[country.value] || {};
    fillSelect(region, Object.keys(block), "Select state / region");
    resetFrom(3);
  };

  region.onchange = function () {
    var block =
      ((SNM.GEO[cont.value] || {})[country.value] || {})[region.value] || {};
    fillSelect(city, Object.keys(block), "Select city / town");
    resetFrom(4);
  };

  city.onchange = function () {
    var list =
      (((SNM.GEO[cont.value] || {})[country.value] || {})[region.value] || {})[
        city.value
      ] || [];
    fillSelect(community, list, "Select community");
  };

  cont.dispatchEvent(new Event("change"));
};
