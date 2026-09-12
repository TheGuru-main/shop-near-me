window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";
SNM.VERSION = "1.0.0.1p";
SNM.MAX_KM = 80; 

/* Continent ids locked for ladder */
SNM.CONTINENTS = [
  { id: "001", name: "North America" },
  { id: "002", name: "South America" },
  { id: "003", name: "Africa" },
  { id: "004", name: "Asia" },
  { id: "005", name: "Europe" },
  { id: "006", name: "Antarctica" },
  { id: "007", name: "Oceania" }
];

SNM.ROLES = ["buyer", "merchant", "service", "driver", "emergency"];

SNM.BUYER_PREFS = [
  "Food", "Groceries", "Electronics", "Fashion", "Pharmacy",
  "Services", "Logistics", "Hotels", "Agriculture", "Other"
];
