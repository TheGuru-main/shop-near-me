window.SNM = window.SNM || {};

/**
 * GEO_TREE hierarchy:
 * continentId → countryName → state → town → [communities]
 *
 * Priority:
 * 1) Nigeria — states → towns → communities (deep)
 * 2) 25 other African countries — same flow
 * 3) Globe — Americas 20, Asia 20, Europe 15, Oceania 15
 */

SNM.GEO_TREE = {
  /* =========================================================
   * AFRICA 003 — Nigeria first (full), then 25 others
   * ========================================================= */
  "003": {
    /* ---------- NIGERIA ---------- */
    Nigeria: {
      Abia: {
        Umuahia: ["Umuahia North", "Umuahia South", "Ibeku"],
        Aba: ["Aba North", "Aba South", "Ogbor Hill"]
      },
      Adamawa: {
        Yola: ["Jimeta", "Yola North", "Yola South"],
        Mubi: ["Mubi North", "Mubi South"]
      },
      "Akwa Ibom": {
        Uyo: ["Uyo Central", "Ewet Housing", "Itam"],
        Eket: ["Eket Urban", "Afaha Eket"]
      },
      Anambra: {
        Awka: ["Amawbia", "Okpuno", "Nnamdi Azikiwe"],
        Onitsha: ["Onitsha North", "Onitsha South", "Fegge"],
        Nnewi: ["Nnewi North", "Nnewi South"]
      },
      Bauchi: {
        Bauchi: ["Wunti", "Yelwa", "Railway"],
        Azare: ["Azare Central"]
      },
      Bayelsa: {
        Yenagoa: ["Swali", "Ovom", "Okaka"],
        Brass: ["Twon-Brass"]
      },
      Benue: {
        Makurdi: ["High Level", "Wadata", "North Bank"],
        Gboko: ["Gboko Town"]
      },
      Borno: {
        Maiduguri: ["Bolori", "Gwange", "Customs"],
        Biu: ["Biu Central"]
      },
      "Cross River": {
        Calabar: ["Calabar Municipal", "Calabar South", "8 Miles"],
        Ikom: ["Ikom Urban"]
      },
      Delta: {
        Asaba: ["Cable Point", "Okpanam Road"],
        Warri: ["Effurun", "Udu", "Ekpan"],
        Sapele: ["Sapele Town"]
      },
      Ebonyi: {
        Abakaliki: ["Kpirikpiri", "Presco", "CAS"]
      },
      Edo: {
        Benin: ["GRA", "Ugbowo", "Sapele Road", "Ring Road"],
        Auchi: ["Auchi Central"]
      },
      Ekiti: {
        Ado: ["Ado-Ekiti Central", "Basiri", "Oke-Bola"]
      },
      Enugu: {
        Enugu: ["Independence Layout", "New Haven", "Trans-Ekulu", "Coal Camp"],
        Nsukka: ["Nsukka Urban"]
      },
      Gombe: {
        Gombe: ["Jekadafari", "Pantami", "Herwa"]
      },
      Imo: {
        Owerri: ["Owerri Municipal", "Ikenegbu", "New Owerri"],
        Orlu: ["Orlu Town"]
      },
      Jigawa: {
        Dutse: ["Dutse Central"],
        Hadejia: ["Hadejia Town"]
      },
      Kaduna: {
        Kaduna: ["Kawo", "Barnawa", "Malali", "Ungwan Rimi"],
        Zaria: ["Samaru", "Tudun Wada"]
      },
      Kano: {
        "Kano Municipal": ["Fagge", "Nassarawa", "Dala", "Gwale"],
        Nassarawa: ["Hotoro", "Kawaji"]
      },
      Katsina: {
        Katsina: ["Kofar Kaura", "Layout"],
        Daura: ["Daura Central"]
      },
      Kebbi: {
        Birnin: ["Kebbi Central"],
        Argungu: ["Argungu Town"]
      },
      Kogi: {
        Lokoja: ["Ganaja", "Adankolo"],
        Okene: ["Okene Town"]
      },
      Kwara: {
        Ilorin: ["Tanke", "G.R.A", "Oja-Oba", "Challenge"]
      },
      Lagos: {
        Ikeja: ["Allen", "Opebi", "Alausa", "Computer Village"],
        "Lagos Island": ["Marina", "CMS", "Tafawa Balewa"],
        "Eti-Osa": ["Lekki Phase 1", "Lekki Phase 2", "Ajah", "Ikoyi", "Victoria Island"],
        Surulere: ["Aguda", "Ijesha", "Adeniran Ogunsanya"],
        Alimosho: ["Egbeda", "Ikotun", "Ipaja"],
        Agege: ["Pen Cinema", "Oko Oba"],
        Mushin: ["Palm Avenue", "Ladipo"],
        "Ifako-Ijaiye": ["Ogba", "Iju"]
      },
      Nasarawa: {
        Lafia: ["Lafia Central"],
        Keffi: ["Keffi Town"]
      },
      Niger: {
        Minna: ["Tunga", "Bosso"],
        Suleja: ["Suleja Town"]
      },
      Ogun: {
        Abeokuta: ["Ibara", "Sapon", "Lafenwa"],
        "Ota": ["Sango Ota", "Ifo Road"]
      },
      Ondo: {
        Akure: ["Alagbaka", "Oda Road", "Ijapo"]
      },
      Osun: {
        Osogbo: ["Oke-Fia", "Ayetoro"],
        Ife: ["Ile-Ife Central"]
      },
      Oyo: {
        Ibadan: ["Bodija", "Challenge", "Dugbe", "UI", "Ring Road", "Akobo"]
      },
      Plateau: {
        Jos: ["Rayfield", "Terminus", "Bukuru"]
      },
      Rivers: {
        "Port Harcourt": ["Eneka", "Rumuokoro", "GRA", "Diobu", "Woji", "Rumuola", "Rumuokwuta", "Mile 1", "Mile 3"],
        "Obio-Akpor": ["Rumuodara", "Choba", "Rumuigbo", "Eliozu", "Rukpokwu"],
        Bonny: ["Finima", "Abalamabie"],
        Eleme: ["Alesa", "Onne"]
      },
      Sokoto: {
        Sokoto: ["Runjin Sambo", "K/Rafi"]
      },
      Taraba: {
        Jalingo: ["Jalingo Central"]
      },
      Yobe: {
        Damaturu: ["Damaturu Central"]
      },
      Zamfara: {
        Gusau: ["Gusau Central"]
      },
      FCT: {
        Abuja: ["Garki", "Wuse", "Maitama", "Asokoro", "Gwarinpa", "Lugbe", "Kubwa", "Nyanya", "Karu"]
      }
    },

    /* ---------- 25 other African countries ---------- */
    Ghana: {
      "Greater Accra": {
        Accra: ["Osu", "Labone", "Madina", "East Legon", "Tema"]
      },
      Ashanti: {
        Kumasi: ["Adum", "Asokwa", "Bantama"]
      },
      Northern: {
        Tamale: ["Tamale Central"]
      }
    },
    Kenya: {
      Nairobi: {
        Nairobi: ["Westlands", "CBD", "Eastleigh", "Karen", "Kilimani"]
      },
      Mombasa: {
        Mombasa: ["Nyali", "Bamburi", "Old Town"]
      },
      Kisumu: {
        Kisumu: ["Milimani", "Nyalenda"]
      }
    },
    "South Africa": {
      Gauteng: {
        Johannesburg: ["Sandton", "Soweto", "Rosebank"],
        Pretoria: ["Hatfield", "Centurion", "Brooklyn"]
      },
      "Western Cape": {
        "Cape Town": ["CBD", "Sea Point", "Stellenbosch"]
      },
      KwaZulu: {
        Durban: ["Umhlanga", "Berea"]
      }
    },
    Egypt: {
      Cairo: {
        Cairo: ["Zamalek", "Nasr City", "Maadi", "Heliopolis"]
      },
      Giza: {
        Giza: ["Dokki", "Mohandessin"]
      },
      Alexandria: {
        Alexandria: ["Stanley", "Smouha"]
      }
    },
    Ethiopia: {
      Addis: {
        "Addis Ababa": ["Bole", "Piazza", "Kazanchis"]
      },
      Oromia: {
        Adama: ["Adama Central"]
      }
    },
    Tanzania: {
      "Dar es Salaam": {
        "Dar es Salaam": ["Kinondoni", "Ilala", "Temeke"]
      },
      Arusha: {
        Arusha: ["Njiro", "Sakon"]
      }
    },
    Uganda: {
      Central: {
        Kampala: ["Kololo", "Nakawa", "Makindye"]
      },
      Western: {
        Mbarara: ["Mbarara Town"]
      }
    },
    Rwanda: {
      Kigali: {
        Kigali: ["Nyarutarama", "Kimihurura", "Remera"]
      }
    },
    Senegal: {
      Dakar: {
        Dakar: ["Plateau", "Almadies", "Médina"]
      },
      Thiès: {
        Thiès: ["Thiès Centre"]
      }
    },
    "Ivory Coast": {
      Lagunes: {
        Abidjan: ["Cocody", "Plateau", "Yopougon", "Marcory"]
      },
      "Vallée du Bandama": {
        Bouaké: ["Bouaké Centre"]
      }
    },
    Cameroon: {
      Centre: {
        Yaoundé: ["Bastos", "Mvog-Ada"]
      },
      Littoral: {
        Douala: ["Akwa", "Bonanjo", "Deido"]
      }
    },
    Morocco: {
      Casablanca: {
        Casablanca: ["Maarif", "Anfa", "Ain Diab"]
      },
      Rabat: {
        Rabat: ["Agdal", "Hassan"]
      },
      Marrakech: {
        Marrakech: ["Gueliz", "Médina"]
      }
    },
    Algeria: {
      Alger: {
        Algiers: ["Hydra", "Bab El Oued", "El Biar"]
      },
      Oran: {
        Oran: ["Centre Ville"]
      }
    },
    Tunisia: {
      Tunis: {
        Tunis: ["Lac", "Médina", "La Marsa"]
      },
      Sfax: {
        Sfax: ["Sfax Centre"]
      }
    },
    Mali: {
      Bamako: {
        Bamako: ["Hippodrome", "Badalabougou"]
      }
    },
    Niger: {
      Niamey: {
        Niamey: ["Plateau", "Kalley"]
      }
    },
    Chad: {
      "N'Djamena": {
        "N'Djamena": ["Centre Ville", "Moursal"]
      }
    },
    Sudan: {
      Khartoum: {
        Khartoum: ["Khartoum 2", "Riyadh"]
      }
    },
    "South Sudan": {
      "Central Equatoria": {
        Juba: ["Juba Town", "Munuki"]
      }
    },
    Zimbabwe: {
      Harare: {
        Harare: ["Avondale", "Borrowdale", "CBD"]
      },
      Bulawayo: {
        Bulawayo: ["Hillside"]
      }
    },
    Zambia: {
      Lusaka: {
        Lusaka: ["Rhodes Park", "Kabulonga"]
      }
    },
    Botswana: {
      "South East": {
        Gaborone: ["Extension 9", "Broadhurst"]
      }
    },
    Namibia: {
      Khomas: {
        Windhoek: ["Klein Windhoek", "Katutura"]
      }
    },
    Mozambique: {
      Maputo: {
        Maputo: ["Polana", "Sommerschield"]
      }
    },
    Angola: {
      Luanda: {
        Luanda: ["Miramar", "Talatona", "Baixa"]
      }
    },
    Benin: {
      Littoral: {
        Cotonou: ["Akpakpa", "Ganhi"]
      }
    },
    Togo: {
      Maritime: {
        Lome: ["Kodjoviakopé", "Tokoin"]
      }
    }
  },

  /* =========================================================
   * AMERICAS — 20 country entries (NA + SA)
   * ========================================================= */
  "001": {
    "United States": {
      California: {
        "Los Angeles": ["Downtown", "Hollywood", "Santa Monica"],
        "San Francisco": ["Mission", "SOMA", "Chinatown"]
      },
      Texas: {
        Houston: ["Downtown", "Midtown"],
        Austin: ["Downtown", "East Austin"]
      },
      "New York": {
        "New York City": ["Manhattan", "Brooklyn", "Queens"]
      },
      Florida: {
        Miami: ["Brickell", "Little Havana"]
      }
    },
    Canada: {
      Ontario: {
        Toronto: ["Downtown", "Scarborough", "North York"]
      },
      Quebec: {
        Montreal: ["Ville-Marie", "Plateau"]
      },
      "British Columbia": {
        Vancouver: ["Downtown", "Kitsilano"]
      }
    },
    Mexico: {
      "Mexico City": {
        "Mexico City": ["Polanco", "Coyoacán", "Roma"]
      },
      Jalisco: {
        Guadalajara: ["Centro", "Zapopan"]
      }
    },
    Jamaica: {
      Kingston: {
        Kingston: ["New Kingston", "Half Way Tree"]
      }
    },
    "Trinidad and Tobago": {
      "Port of Spain": {
        "Port of Spain": ["Woodbrook", "St Clair"]
      }
    },
    Panama: {
      Panama: {
        "Panama City": ["El Cangrejo", "Casco Viejo"]
      }
    },
    "Costa Rica": {
      "San José": {
        "San José": ["Escazú", "Centro"]
      }
    },
    Guatemala: {
      Guatemala: {
        "Guatemala City": ["Zona 10", "Zona 4"]
      }
    },
    Cuba: {
      "La Habana": {
        Havana: ["Vedado", "Old Havana"]
      }
    },
    "Dominican Republic": {
      Nacional: {
        "Santo Domingo": ["Piantini", "Zona Colonial"]
      }
    }
  },

  "002": {
    Brazil: {
      "São Paulo": {
        "São Paulo": ["Paulista", "Pinheiros", "Centro"]
      },
      "Rio de Janeiro": {
        "Rio de Janeiro": ["Copacabana", "Ipanema", "Centro"]
      }
    },
    Argentina: {
      "Buenos Aires": {
        "Buenos Aires": ["Palermo", "Recoleta", "Microcentro"]
      }
    },
    Colombia: {
      Bogota: {
        Bogota: ["Chapinero", "Usaquén"]
      },
      Antioquia: {
        Medellin: ["El Poblado", "Laureles"]
      }
    },
    Chile: {
      Santiago: {
        Santiago: ["Providencia", "Las Condes"]
      }
    },
    Peru: {
      Lima: {
        Lima: ["Miraflores", "San Isidro"]
      }
    },
    Ecuador: {
      Pichincha: {
        Quito: ["La Carolina", "Centro Histórico"]
      }
    },
    Venezuela: {
      "Distrito Capital": {
        Caracas: ["Chacao", "Altamira"]
      }
    },
    Uruguay: {
      Montevideo: {
        Montevideo: ["Pocitos", "Ciudad Vieja"]
      }
    },
    Paraguay: {
      Asuncion: {
        Asuncion: ["Centro", "Villa Morra"]
      }
    },
    Bolivia: {
      "La Paz": {
        "La Paz": ["Sopocachi", "Centro"]
      }
    }
  },

  /* =========================================================
   * ASIA 004 — 20
   * ========================================================= */
  "004": {
    India: {
      Maharashtra: {
        Mumbai: ["Andheri", "Bandra", "Colaba"]
      },
      Delhi: {
        Delhi: ["Connaught Place", "Saket"]
      },
      Karnataka: {
        Bangalore: ["Koramangala", "Indiranagar"]
      }
    },
    China: {
      Beijing: {
        Beijing: ["Chaoyang", "Haidian"]
      },
      Shanghai: {
        Shanghai: ["Pudong", "Huangpu"]
      }
    },
    Japan: {
      Tokyo: {
        Tokyo: ["Shibuya", "Shinjuku", "Ginza"]
      },
      Osaka: {
        Osaka: ["Umeda", "Namba"]
      }
    },
    "South Korea": {
      Seoul: {
        Seoul: ["Gangnam", "Hongdae", "Jongno"]
      }
    },
    Indonesia: {
      Jakarta: {
        Jakarta: ["Menteng", "SCBD"]
      },
      Bali: {
        Denpasar: ["Kuta", "Seminyak"]
      }
    },
    Malaysia: {
      "Kuala Lumpur": {
        "Kuala Lumpur": ["Bukit Bintang", "KLCC"]
      }
    },
    Singapore: {
      Singapore: {
        Singapore: ["Orchard", "Marina Bay", "Chinatown"]
      }
    },
    Thailand: {
      Bangkok: {
        Bangkok: ["Sukhumvit", "Silom"]
      }
    },
    Vietnam: {
      "Ho Chi Minh": {
        "Ho Chi Minh City": ["District 1", "District 3"]
      },
      Hanoi: {
        Hanoi: ["Hoan Kiem", "Ba Dinh"]
      }
    },
    Philippines: {
      Manila: {
        Manila: ["Makati", "BGC"]
      }
    },
    "Saudi Arabia": {
      Riyadh: {
        Riyadh: ["Olaya", "Al Malaz"]
      },
      Makkah: {
        Jeddah: ["Al Balad", "Corniche"]
      }
    },
    "United Arab Emirates": {
      Dubai: {
        Dubai: ["Downtown", "Marina", "JBR"]
      },
      "Abu Dhabi": {
        "Abu Dhabi": ["Corniche", "Al Reem"]
      }
    },
    Pakistan: {
      Punjab: {
        Lahore: ["Gulberg", "DHA"]
      },
      Sindh: {
        Karachi: ["Clifton", "PECHS"]
      }
    },
    Bangladesh: {
      Dhaka: {
        Dhaka: ["Gulshan", "Dhanmondi"]
      }
    },
    Turkey: {
      Istanbul: {
        Istanbul: ["Kadıköy", "Beşiktaş", "Sultanahmet"]
      },
      Ankara: {
        Ankara: ["Çankaya"]
      }
    },
    Israel: {
      "Tel Aviv": {
        "Tel Aviv": ["Center", "Jaffa"]
      }
    },
    Qatar: {
      Doha: {
        Doha: ["West Bay", "The Pearl"]
      }
    },
    Kuwait: {
      "Kuwait City": {
        "Kuwait City": ["Sharq", "Salmiya"]
      }
    },
    Jordan: {
      Amman: {
        Amman: ["Abdoun", "Jabal Amman"]
      }
    },
    "Sri Lanka": {
      Western: {
        Colombo: ["Colombo 3", "Colombo 7"]
      }
    }
  },

  /* =========================================================
   * EUROPE 005 — 15
   * ========================================================= */
  "005": {
    "United Kingdom": {
      England: {
        London: ["Westminster", "Camden", "Shoreditch", "Canary Wharf"]
      },
      Scotland: {
        Edinburgh: ["Old Town", "New Town"]
      }
    },
    France: {
      "Île-de-France": {
        Paris: ["Louvre", "Montmartre", "La Défense"]
      },
      "Auvergne-Rhône-Alpes": {
        Lyon: ["Presqu'île", "Part-Dieu"]
      }
    },
    Germany: {
      Berlin: {
        Berlin: ["Mitte", "Kreuzberg", "Charlottenburg"]
      },
      Bavaria: {
        Munich: ["Altstadt", "Schwabing"]
      }
    },
    Spain: {
      Madrid: {
        Madrid: ["Centro", "Salamanca"]
      },
      Catalonia: {
        Barcelona: ["Eixample", "Gothic Quarter"]
      }
    },
    Italy: {
      Lazio: {
        Rome: ["Centro Storico", "Trastevere"]
      },
      Lombardy: {
        Milan: ["Navigli", "Duomo"]
      }
    },
    Netherlands: {
      "North Holland": {
        Amsterdam: ["Centrum", "Jordaan"]
      }
    },
    Belgium: {
      Brussels: {
        Brussels: ["Centre", "Ixelles"]
      }
    },
    Portugal: {
      Lisbon: {
        Lisbon: ["Baixa", "Belém"]
      }
    },
    Switzerland: {
      Zurich: {
        Zurich: ["District 1", "Oerlikon"]
      }
    },
    Sweden: {
      Stockholm: {
        Stockholm: ["Norrmalm", "Södermalm"]
      }
    },
    Poland: {
      Mazovia: {
        Warsaw: ["Śródmieście", "Mokotów"]
      }
    },
    Ireland: {
      Leinster: {
        Dublin: ["Temple Bar", "Docklands"]
      }
    },
    Greece: {
      Attica: {
        Athens: ["Plaka", "Kolonaki"]
      }
    },
    "Czech Republic": {
      Prague: {
        Prague: ["Old Town", "Vinohrady"]
      }
    },
    Romania: {
      Bucharest: {
        Bucharest: ["Old Town", "Floreasca"]
      }
    }
  },

  /* =========================================================
   * OCEANIA 007 — 15 country slots (core + islands)
   * ========================================================= */
  "007": {
    Australia: {
      "New South Wales": {
        Sydney: ["CBD", "Bondi", "Parramatta"]
      },
      Victoria: {
        Melbourne: ["CBD", "Fitzroy", "St Kilda"]
      },
      Queensland: {
        Brisbane: ["CBD", "South Bank"]
      }
    },
    "New Zealand": {
      Auckland: {
        Auckland: ["CBD", "Ponsonby"]
      },
      Wellington: {
        Wellington: ["Te Aro", "Kelburn"]
      }
    },
    Fiji: {
      Central: {
        Suva: ["Suva Central"]
      }
    },
    "Papua New Guinea": {
      "National Capital": {
        "Port Moresby": ["Downtown", "Boroko"]
      }
    },
    Samoa: {
      Tuamasaga: {
        Apia: ["Apia Central"]
      }
    },
    Tonga: {
      Tongatapu: {
        Nukualofa: ["Nuku'alofa Central"]
      }
    },
    Vanuatu: {
      Shefa: {
        "Port Vila": ["Port Vila Central"]
      }
    },
    "Solomon Islands": {
      Guadalcanal: {
        Honiara: ["Honiara Central"]
      }
    },
    "French Polynesia": {
      "Îles du Vent": {
        Papeete: ["Papeete Centre"]
      }
    },
    "New Caledonia": {
      South: {
        Noumea: ["Nouméa Centre"]
      }
    },
    Guam: {
      Guam: {
        Hagatna: ["Hagåtña"]
      }
    },
    "American Samoa": {
      Eastern: {
        Pago: ["Pago Pago"]
      }
    },
    Kiribati: {
      "Gilbert Islands": {
        Tarawa: ["South Tarawa"]
      }
    },
    "Marshall Islands": {
      Majuro: {
        Majuro: ["Majuro Central"]
      }
    },
    Palau: {
      Koror: {
        Koror: ["Koror Town"]
      }
    }
  },

  /* Antarctica minimal */
  "006": {
    Antarctica: {
      "Research Zone": {
        McMurdo: ["Station Area"]
      }
    }
  }
};

/* ---------------- cascade engine (unchanged contract) ---------------- */

function _el(id) {
  return document.getElementById(id);
}

function _fillSelect(sel, options, placeholder, enable) {
  if (!sel) return;
  var list = options || [];
  var html = '<option value="">' + (placeholder || "Select") + "</option>";
  list.forEach(function (o) {
    if (o == null || o === "") return;
    html +=
      '<option value="' +
      SNM.escapeHtml(String(o)) +
      '">' +
      SNM.escapeHtml(String(o)) +
      "</option>";
  });
  sel.innerHTML = html;
  sel.disabled = enable === false || !list.length;
}

SNM.countryNamesForContinent = function (continentId) {
  if (typeof SNM.countriesForContinent === "function") {
    return SNM.countriesForContinent(continentId)
      .map(function (c) {
        return c.name;
      })
      .sort(function (a, b) {
        /* Nigeria first inside Africa */
        if (continentId === "003") {
          if (a === "Nigeria") return -1;
          if (b === "Nigeria") return 1;
        }
        return a.localeCompare(b);
      });
  }
  var tree = SNM.GEO_TREE[continentId] || {};
  return Object.keys(tree).sort();
};

SNM.statesFor = function (continentId, country) {
  var branch = (SNM.GEO_TREE[continentId] || {})[country];
  if (!branch || typeof branch !== "object") return [];
  return Object.keys(branch).filter(function (k) {
    return branch[k] && typeof branch[k] === "object";
  });
};

SNM.townsFor = function (continentId, country, state) {
  var branch = ((SNM.GEO_TREE[continentId] || {})[country] || {})[state];
  if (!branch || typeof branch !== "object") return [];
  return Object.keys(branch);
};

SNM.communitiesFor = function (continentId, country, state, town) {
  var list =
    (((SNM.GEO_TREE[continentId] || {})[country] || {})[state] || {})[town] ||
    [];
  return Array.isArray(list) ? list : [];
};

SNM.bindCascade = function () {
  var cont = _el("reg-continent");
  var country = _el("reg-country");
  var region = _el("reg-region");
  var city = _el("reg-city");
  var community = _el("reg-community");
  if (!cont || !country) return;

  cont.innerHTML = (SNM.CONTINENTS || [])
    .map(function (c) {
      return (
        '<option value="' +
        SNM.escapeHtml(c.id) +
        '">' +
        SNM.escapeHtml(c.name) +
        "</option>"
      );
    })
    .join("");

  function resetBelowCountry() {
    _fillSelect(region, [], "Select country first", false);
    _fillSelect(city, [], "Select state first", false);
    _fillSelect(community, [], "Select town first", false);
  }

  function onContinent() {
    _fillSelect(
      country,
      SNM.countryNamesForContinent(cont.value),
      "Select country",
      true
    );
    resetBelowCountry();
  }

  function onCountry() {
    var states = SNM.statesFor(cont.value, country.value);
    if (states.length) {
      _fillSelect(region, states, "Select state / region", true);
    } else {
      _fillSelect(
        region,
        [],
        "No listed states — detail in primary location",
        false
      );
    }
    _fillSelect(city, [], "Select state first", false);
    _fillSelect(community, [], "Select town first", false);

    var meta =
      typeof SNM.findCountry === "function"
        ? SNM.findCountry(country.value)
        : null;
    var phone = _el("reg-phone");
    if (meta && phone && !(phone.value || "").trim()) {
      phone.placeholder = meta.dial + "…";
      phone.dataset.dial = meta.dial;
    }
  }

  function onRegion() {
    var towns = SNM.townsFor(cont.value, country.value, region.value);
    if (towns.length) {
      _fillSelect(city, towns, "Select town / city", true);
    } else {
      _fillSelect(
        city,
        [],
        "No listed towns — detail in primary location",
        false
      );
    }
    _fillSelect(community, [], "Select town first", false);
  }

  function onCity() {
    var list = SNM.communitiesFor(
      cont.value,
      country.value,
      region.value,
      city.value
    );
    if (list.length) {
      _fillSelect(community, list, "Select community", true);
    } else {
      _fillSelect(
        community,
        [],
        "No listed community — detail in primary location",
        false
      );
    }
  }

  cont.onchange = onContinent;
  country.onchange = onCountry;
  region.onchange = onRegion;
  city.onchange = onCity;

  onContinent();
};
