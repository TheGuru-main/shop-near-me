window.SNM = window.SNM || {};

/**
 * Continent ids (locked):
 * 001 North America · 002 South America · 003 Africa · 004 Asia
 * 005 Europe · 006 Antarctica · 007 Oceania
 *
 * Cascade: Continent → Country → State/Region → City/Town/LGA → Community
 * City/LGA = same level. Community = separate.
 */

SNM.CASCADE_COUNTRIES = {
  "001": [
    { name: "United States", iso: "US", dial: "+1", localLen: 10 },
    { name: "Canada", iso: "CA", dial: "+1", localLen: 10 },
    { name: "Mexico", iso: "MX", dial: "+52", localLen: 10 }
  ],
  "002": [
    { name: "Brazil", iso: "BR", dial: "+55", localLen: 11 },
    { name: "Argentina", iso: "AR", dial: "+54", localLen: 10 },
    { name: "Colombia", iso: "CO", dial: "+57", localLen: 10 }
  ],
  "003": [
    { name: "Nigeria", iso: "NG", dial: "+234", localLen: 10 },
    { name: "Ghana", iso: "GH", dial: "+233", localLen: 9 },
    { name: "Kenya", iso: "KE", dial: "+254", localLen: 9 },
    { name: "South Africa", iso: "ZA", dial: "+27", localLen: 9 },
    { name: "Egypt", iso: "EG", dial: "+20", localLen: 10 },
    { name: "Morocco", iso: "MA", dial: "+212", localLen: 9 },
    { name: "Ethiopia", iso: "ET", dial: "+251", localLen: 9 },
    { name: "Uganda", iso: "UG", dial: "+256", localLen: 9 },
    { name: "Tanzania", iso: "TZ", dial: "+255", localLen: 9 },
    { name: "Rwanda", iso: "RW", dial: "+250", localLen: 9 },
    { name: "Senegal", iso: "SN", dial: "+221", localLen: 9 },
    { name: "Cameroon", iso: "CM", dial: "+237", localLen: 9 },
    { name: "Côte d'Ivoire", iso: "CI", dial: "+225", localLen: 10 },
    { name: "Algeria", iso: "DZ", dial: "+213", localLen: 9 },
    { name: "Tunisia", iso: "TN", dial: "+216", localLen: 8 }
  ],
  "004": [
    { name: "India", iso: "IN", dial: "+91", localLen: 10 },
    { name: "China", iso: "CN", dial: "+86", localLen: 11 },
    { name: "Japan", iso: "JP", dial: "+81", localLen: 10 },
    { name: "United Arab Emirates", iso: "AE", dial: "+971", localLen: 9 },
    { name: "Saudi Arabia", iso: "SA", dial: "+966", localLen: 9 },
    { name: "Singapore", iso: "SG", dial: "+65", localLen: 8 }
  ],
  "005": [
    { name: "United Kingdom", iso: "GB", dial: "+44", localLen: 10 },
    { name: "France", iso: "FR", dial: "+33", localLen: 9 },
    { name: "Germany", iso: "DE", dial: "+49", localLen: 11 },
    { name: "Spain", iso: "ES", dial: "+34", localLen: 9 }
  ],
  "006": [],
  "007": [
    { name: "Australia", iso: "AU", dial: "+61", localLen: 9 },
    { name: "New Zealand", iso: "NZ", dial: "+64", localLen: 9 }
  ]
};

/**
 * Places: Country name → State/Region → City/Town/LGA → [Communities]
 * Nigeria seeded first (production density). Other: Other → Other → [Other]
 */
SNM.CASCADE_PLACES = {
  Nigeria: {
    "Abia": {
      "Aba": ["Aba North", "Aba South", "Other"],
      "Umuahia": ["Umuahia North", "Umuahia South", "Other"],
      "Other": ["Other"]
    },
    "Abuja FCT": {
      "Abuja Municipal": ["Garki", "Wuse", "Maitama", "Asokoro", "Other"],
      "Gwagwalada": ["Gwagwalada", "Other"],
      "Other": ["Other"]
    },
    "Lagos": {
      "Ikeja": ["Ikeja", "Alausa", "Other"],
      "Lagos Island": ["Lagos Island", "Other"],
      "Eti-Osa": ["Lekki", "Ajah", "Other"],
      "Alimosho": ["Ikotun", "Egbe", "Other"],
      "Other": ["Other"]
    },
    "Rivers": {
      "Port Harcourt": ["Port Harcourt", "Diobu", "Other"],
      "Obio/Akpor": ["Eneka", "Rumuokoro", "Rumuodara", "Other"],
      "Eleme": ["Eleme", "Other"],
      "Other": ["Other"]
    },
    "Kano": {
      "Kano Municipal": ["Kano", "Other"],
      "Nassarawa": ["Nassarawa", "Other"],
      "Other": ["Other"]
    },
    "Oyo": {
      "Ibadan North": ["Ibadan", "Other"],
      "Ibadan South-West": ["Ibadan", "Other"],
      "Other": ["Other"]
    },
    "Other": {
      "Other": ["Other"]
    }
  },
  Ghana: {
    "Greater Accra": {
      "Accra": ["Osu", "Labone", "Other"],
      "Tema": ["Tema", "Other"],
      "Other": ["Other"]
    },
    "Other": { "Other": ["Other"] }
  },
  Kenya: {
    "Nairobi": {
      "Nairobi": ["CBD", "Westlands", "Other"],
      "Other": ["Other"]
    },
    "Other": { "Other": ["Other"] }
  },
  "United States": {
    "Other": { "Other": ["Other"] }
  },
  "United Kingdom": {
    "Other": { "Other": ["Other"] }
  }
};

SNM.countryByName = function (name) {
  var keys = Object.keys(SNM.CASCADE_COUNTRIES || {});
  for (var i = 0; i < keys.length; i++) {
    var list = SNM.CASCADE_COUNTRIES[keys[i]] || [];
    for (var j = 0; j < list.length; j++) {
      if (list[j].name === name) return list[j];
    }
  }
  return null;
};
