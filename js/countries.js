window.SNM = window.SNM || {};

/* Locked continental axis — do not renumber for UX */
SNM.CONTINENTS = [
  { id: "001", name: "North America", code: "Na" },
  { id: "002", name: "South America", code: "Sa" },
  { id: "003", name: "Africa", code: "A" },
  { id: "004", name: "Asia", code: "As" },
  { id: "005", name: "Europe", code: "Eu" },
  { id: "006", name: "Antarctica", code: "An" },
  { id: "007", name: "Oceania", code: "Au" }
];

/**
 * Continent id → countries { name, iso, dial }
 * Nigeria first inside Africa (003) only — IDs stay locked.
 */
SNM.COUNTRIES_BY_CONTINENT = {
  "001": [
    { name: "United States", iso: "US", dial: "+1" },
    { name: "Canada", iso: "CA", dial: "+1" },
    { name: "Mexico", iso: "MX", dial: "+52" },
    { name: "Guatemala", iso: "GT", dial: "+502" },
    { name: "Belize", iso: "BZ", dial: "+501" },
    { name: "Honduras", iso: "HN", dial: "+504" },
    { name: "El Salvador", iso: "SV", dial: "+503" },
    { name: "Nicaragua", iso: "NI", dial: "+505" },
    { name: "Costa Rica", iso: "CR", dial: "+506" },
    { name: "Panama", iso: "PA", dial: "+507" },
    { name: "Cuba", iso: "CU", dial: "+53" },
    { name: "Jamaica", iso: "JM", dial: "+1876" },
    { name: "Haiti", iso: "HT", dial: "+509" },
    { name: "Dominican Republic", iso: "DO", dial: "+1809" },
    { name: "Bahamas", iso: "BS", dial: "+1242" },
    { name: "Trinidad and Tobago", iso: "TT", dial: "+1868" },
    { name: "Barbados", iso: "BB", dial: "+1246" }
  ],
  "002": [
    { name: "Brazil", iso: "BR", dial: "+55" },
    { name: "Argentina", iso: "AR", dial: "+54" },
    { name: "Colombia", iso: "CO", dial: "+57" },
    { name: "Chile", iso: "CL", dial: "+56" },
    { name: "Peru", iso: "PE", dial: "+51" },
    { name: "Venezuela", iso: "VE", dial: "+58" },
    { name: "Ecuador", iso: "EC", dial: "+593" },
    { name: "Bolivia", iso: "BO", dial: "+591" },
    { name: "Paraguay", iso: "PY", dial: "+595" },
    { name: "Uruguay", iso: "UY", dial: "+598" },
    { name: "Guyana", iso: "GY", dial: "+592" },
    { name: "Suriname", iso: "SR", dial: "+597" }
  ],
  "003": [
    { name: "Nigeria", iso: "NG", dial: "+234" },
    { name: "Ghana", iso: "GH", dial: "+233" },
    { name: "Kenya", iso: "KE", dial: "+254" },
    { name: "South Africa", iso: "ZA", dial: "+27" },
    { name: "Egypt", iso: "EG", dial: "+20" },
    { name: "Morocco", iso: "MA", dial: "+212" },
    { name: "Algeria", iso: "DZ", dial: "+213" },
    { name: "Tunisia", iso: "TN", dial: "+216" },
    { name: "Libya", iso: "LY", dial: "+218" },
    { name: "Ethiopia", iso: "ET", dial: "+251" },
    { name: "Uganda", iso: "UG", dial: "+256" },
    { name: "Tanzania", iso: "TZ", dial: "+255" },
    { name: "Rwanda", iso: "RW", dial: "+250" },
    { name: "Burundi", iso: "BI", dial: "+257" },
    { name: "Senegal", iso: "SN", dial: "+221" },
    { name: "Gambia", iso: "GM", dial: "+220" },
    { name: "Guinea", iso: "GN", dial: "+224" },
    { name: "Sierra Leone", iso: "SL", dial: "+232" },
    { name: "Liberia", iso: "LR", dial: "+231" },
    { name: "Côte d'Ivoire", iso: "CI", dial: "+225" },
    { name: "Mali", iso: "ML", dial: "+223" },
    { name: "Burkina Faso", iso: "BF", dial: "+226" },
    { name: "Niger", iso: "NE", dial: "+227" },
    { name: "Chad", iso: "TD", dial: "+235" },
    { name: "Cameroon", iso: "CM", dial: "+237" },
    { name: "Central African Republic", iso: "CF", dial: "+236" },
    { name: "Gabon", iso: "GA", dial: "+241" },
    { name: "Congo", iso: "CG", dial: "+242" },
    { name: "DR Congo", iso: "CD", dial: "+243" },
    { name: "Angola", iso: "AO", dial: "+244" },
    { name: "Zambia", iso: "ZM", dial: "+260" },
    { name: "Zimbabwe", iso: "ZW", dial: "+263" },
    { name: "Botswana", iso: "BW", dial: "+267" },
    { name: "Namibia", iso: "NA", dial: "+264" },
    { name: "Mozambique", iso: "MZ", dial: "+258" },
    { name: "Malawi", iso: "MW", dial: "+265" },
    { name: "Madagascar", iso: "MG", dial: "+261" },
    { name: "Mauritius", iso: "MU", dial: "+230" },
    { name: "Seychelles", iso: "SC", dial: "+248" },
    { name: "Sudan", iso: "SD", dial: "+249" },
    { name: "South Sudan", iso: "SS", dial: "+211" },
    { name: "Somalia", iso: "SO", dial: "+252" },
    { name: "Djibouti", iso: "DJ", dial: "+253" },
    { name: "Eritrea", iso: "ER", dial: "+291" },
    { name: "Benin", iso: "BJ", dial: "+229" },
    { name: "Togo", iso: "TG", dial: "+228" },
    { name: "Cape Verde", iso: "CV", dial: "+238" },
    { name: "São Tomé and Príncipe", iso: "ST", dial: "+239" },
    { name: "Equatorial Guinea", iso: "GQ", dial: "+240" },
    { name: "Mauritania", iso: "MR", dial: "+222" },
    { name: "Lesotho", iso: "LS", dial: "+266" },
    { name: "Eswatini", iso: "SZ", dial: "+268" }
  ],
  "004": [
    { name: "India", iso: "IN", dial: "+91" },
    { name: "China", iso: "CN", dial: "+86" },
    { name: "Japan", iso: "JP", dial: "+81" },
    { name: "South Korea", iso: "KR", dial: "+82" },
    { name: "Indonesia", iso: "ID", dial: "+62" },
    { name: "Malaysia", iso: "MY", dial: "+60" },
    { name: "Singapore", iso: "SG", dial: "+65" },
    { name: "Thailand", iso: "TH", dial: "+66" },
    { name: "Vietnam", iso: "VN", dial: "+84" },
    { name: "Philippines", iso: "PH", dial: "+63" },
    { name: "Pakistan", iso: "PK", dial: "+92" },
    { name: "Bangladesh", iso: "BD", dial: "+880" },
    { name: "Sri Lanka", iso: "LK", dial: "+94" },
    { name: "Nepal", iso: "NP", dial: "+977" },
    { name: "Saudi Arabia", iso: "SA", dial: "+966" },
    { name: "United Arab Emirates", iso: "AE", dial: "+971" },
    { name: "Qatar", iso: "QA", dial: "+974" },
    { name: "Kuwait", iso: "KW", dial: "+965" },
    { name: "Bahrain", iso: "BH", dial: "+973" },
    { name: "Oman", iso: "OM", dial: "+968" },
    { name: "Israel", iso: "IL", dial: "+972" },
    { name: "Jordan", iso: "JO", dial: "+962" },
    { name: "Lebanon", iso: "LB", dial: "+961" },
    { name: "Iraq", iso: "IQ", dial: "+964" },
    { name: "Iran", iso: "IR", dial: "+98" },
    { name: "Turkey", iso: "TR", dial: "+90" },
    { name: "Kazakhstan", iso: "KZ", dial: "+7" },
    { name: "Uzbekistan", iso: "UZ", dial: "+998" }
  ],
  "005": [
    { name: "United Kingdom", iso: "GB", dial: "+44" },
    { name: "Ireland", iso: "IE", dial: "+353" },
    { name: "France", iso: "FR", dial: "+33" },
    { name: "Germany", iso: "DE", dial: "+49" },
    { name: "Netherlands", iso: "NL", dial: "+31" },
    { name: "Belgium", iso: "BE", dial: "+32" },
    { name: "Spain", iso: "ES", dial: "+34" },
    { name: "Portugal", iso: "PT", dial: "+351" },
    { name: "Italy", iso: "IT", dial: "+39" },
    { name: "Switzerland", iso: "CH", dial: "+41" },
    { name: "Austria", iso: "AT", dial: "+43" },
    { name: "Sweden", iso: "SE", dial: "+46" },
    { name: "Norway", iso: "NO", dial: "+47" },
    { name: "Denmark", iso: "DK", dial: "+45" },
    { name: "Finland", iso: "FI", dial: "+358" },
    { name: "Poland", iso: "PL", dial: "+48" },
    { name: "Czechia", iso: "CZ", dial: "+420" },
    { name: "Romania", iso: "RO", dial: "+40" },
    { name: "Greece", iso: "GR", dial: "+30" },
    { name: "Ukraine", iso: "UA", dial: "+380" },
    { name: "Russia", iso: "RU", dial: "+7" }
  ],
  "006": [],
  "007": [
    { name: "Australia", iso: "AU", dial: "+61" },
    { name: "New Zealand", iso: "NZ", dial: "+64" },
    { name: "Fiji", iso: "FJ", dial: "+679" },
    { name: "Papua New Guinea", iso: "PG", dial: "+675" },
    { name: "Samoa", iso: "WS", dial: "+685" },
    { name: "Tonga", iso: "TO", dial: "+676" }
  ]
};

/**
 * Optional deep place tree: Country → State/Region → City → [communities]
 * Missing country → cascade falls back to "Other" (user still sets primary location).
 */
SNM.PLACES_BY_COUNTRY = {
  Nigeria: {
    "Rivers State": {
      "Port Harcourt": ["Eneka", "Eliozu", "Rumuokoro", "Rumuola", "Rumuogba", "Trans Amadi", "Diobu", "Amadi Flat"],
      "Obio-Akpor": ["Rumuodomaya", "Choba", "Aluu", "Rumuokwuta", "Rumuigbo"],
      "Eleme": ["Alesa", "Ogale", "Ebubu"],
      "Ikwerre": ["Isiokpo", "Igwuruta"],
      "Oyigbo": ["Afam", "Obete"]
    },
    Lagos: {
      "Lagos Island": ["Marina", "CMS", "Ikoyi"],
      "Ikeja": ["Alausa", "Computer Village", "Opebi"],
      "Ikorodu": ["Igbogbo", "Imota", "Ibeshe"],
      "Surulere": ["Aguda", "Ijesha"],
      "Alimosho": ["Egbeda", "Ikotun", "Ipaja"],
      "Eti-Osa": ["Lekki", "Ajah", "Victoria Island"]
    },
    "FCT Abuja": {
      "Municipal": ["Garki", "Wuse", "Maitama", "Asokoro", "Central Business District"],
      "Gwagwalada": ["Gwagwalada Town", "Zuba"],
      "Kuje": ["Kuje Town"],
      "Bwari": ["Bwari Town", "Kubwa"]
    },
    Kano: {
      "Kano Municipal": ["Fagge", "Dala", "Nassarawa"],
      "Nassarawa": ["Hotoro", "Yankaba"]
    },
    Oyo: {
      Ibadan: ["Bodija", "Challenge", "Dugbe", "Iwo Road"]
    },
    "Rivers": {
      "Port Harcourt": ["Eneka", "Eliozu"]
    }
  },
  Ghana: {
    "Greater Accra": {
      Accra: ["Osu", "Labadi", "Airport Residential", "Madina"],
      Tema: ["Community 1", "Community 7"]
    },
    Ashanti: {
      Kumasi: ["Adum", "Kejetia", "Asokwa"]
    }
  },
  Kenya: {
    Nairobi: {
      "Nairobi Central": ["CBD", "Westlands", "Kilimani", "Eastleigh"]
    },
    Mombasa: {
      Mombasa: ["Nyali", "Likoni"]
    }
  },
  "South Africa": {
    Gauteng: {
      Johannesburg: ["Sandton", "Soweto", "Midrand"],
      Pretoria: ["Centurion", "Hatfield"]
    },
    "Western Cape": {
      "Cape Town": ["CBD", "Sea Point", "Bellville"]
    }
  },
  Egypt: {
    Cairo: {
      Cairo: ["Downtown", "Nasr City", "Heliopolis"]
    },
    Giza: {
      Giza: ["Dokki", "Mohandessin"]
    }
  },
  "United States": {
    California: {
      "Los Angeles": ["Downtown", "Hollywood"],
      "San Francisco": ["Mission", "SOMA"]
    },
    Texas: {
      Houston: ["Downtown", "Midtown"],
      Dallas: ["Uptown"]
    },
    "New York": {
      "New York City": ["Manhattan", "Brooklyn", "Queens"]
    }
  },
  "United Kingdom": {
    England: {
      London: ["Westminster", "Camden", "Greenwich"],
      Manchester: ["City Centre", "Salford"]
    }
  },
  India: {
    Maharashtra: {
      Mumbai: ["Andheri", "Bandra", "Colaba"]
    },
    Delhi: {
      "New Delhi": ["Connaught Place", "Karol Bagh"]
    }
  }
};
