window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";
SNM.APP_VERSION = "1.0.0.1p";
SNM.DEFAULT_MAX_KM = 2000;

SNM.ROLES = [
  { id: "buyer", label: "Buyer", icon: "🛒" },
  { id: "merchant", label: "Merchant", icon: "🏪" },
  { id: "service_provider", label: "Service provider", icon: "🔧" },
  { id: "driver", label: "Driver", icon: "🛵" },
  { id: "emergency", label: "Emergency unit", icon: "🚨" }
];

SNM.CONTINENTS = [
  { id: "001", name: "North America", code: "Na" },
  { id: "002", name: "South America", code: "Sa" },
  { id: "003", name: "Africa", code: "A" },
  { id: "004", name: "Asia", code: "As" },
  { id: "005", name: "Europe", code: "Eu" },
  { id: "006", name: "Antarctica", code: "An" },
  { id: "007", name: "Oceania", code: "Au" }
];

SNM.BUYER_TABS = [
  { id: "home", label: "Home", icon: "fa-home" },
  { id: "search", label: "Search", icon: "fa-search" },
  { id: "messages", label: "Msg", icon: "fa-comments" },
  { id: "news", label: "News", icon: "fa-newspaper" },
  { id: "profile", label: "Profile", icon: "fa-user" }
];

SNM.SELLER_TABS = [
  { id: "home", label: "Home", icon: "fa-home" },
  { id: "search", label: "Search", icon: "fa-search" },
  { id: "shop", label: "Shop", icon: "fa-store" },
  { id: "messages", label: "Msg", icon: "fa-comments" },
  { id: "news", label: "News", icon: "fa-newspaper" },
  { id: "profile", label: "Profile", icon: "fa-user" }
];

SNM.NEWS_CATEGORIES = [
  "business", "fintech", "logistics", "agriculture",
  "retail", "technology", "local", "trade", "Fashion", "consumer", "wholesale", "retail"
];

SNM.BUYER_PREF_CATS = [
  "Food", "Groceries", "Electronics", "Fashion", "Pharmacy",
  "Services", "Drivers", "Hotels", "Agriculture", "Other"
];

SNM.BUYER_PREF_ITEMS = [
  "Rice", "Bread", "Water", "Phone", "Shoes", "Fuel", "Fix_and_repair", "Clothes", "Transportation",
  "Medicine", "Vegetables", "Chicken", "Soap", "ride", "dispatch", "Electronics", "Home_appliance", "services"
];
