window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";
SNM.APP_VERSION = "1.0.0.1p";

SNM.CONTINENTS = [
  { id: "001", name: "North America" },
  { id: "002", name: "South America" },
  { id: "003", name: "Africa" },
  { id: "004", name: "Asia" },
  { id: "005", name: "Europe" },
  { id: "006", name: "Antarctica" },
  { id: "007", name: "Australia / Oceania" }
];

SNM.ROLES = [
  { id: "buyer", label: "Buyer", icon: "fa-shopping-cart", blurb: "Discover, save, message sellers" },
  { id: "merchant", label: "Merchant", icon: "fa-store", blurb: "List goods, receive nearby demand" },
  { id: "service_provider", label: "Service provider", icon: "fa-tools", blurb: "Hotels, artisans, clinics & more" },
  { id: "driver", label: "Driver / logistics", icon: "fa-motorcycle", blurb: "Deliveries, okada, vans, coverage" },
  { id: "emergency", label: "Emergency unit", icon: "fa-ambulance", blurb: "Police, ambulance, community response" }
];
