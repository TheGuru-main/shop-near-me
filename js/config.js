window.SNM = window.SNM || {};

SNM.API_BASE = "https://shop-near-me-apiv1-0-0-1p.onrender.com/api/v1";
SNM.APP_VERSION = "1.0.0.1p";

SNM.CONTINENTS = [
  { id: "001", name: "Africa", code: "AF" },
  { id: "002", name: "North America", code: "NA" },
  { id: "003", name: "South America", code: "SA" },
  { id: "004", name: "Asia", code: "AS" },
  { id: "005", name: "Europe", code: "EU" },
  { id: "006", name: "Antarctica", code: "AN" },
  { id: "007", name: "Oceania", code: "OC" }
];

SNM.ROLES = [
  { id: "buyer", label: "Buyer", icon: "🛒" },
  { id: "", label: "Merchant", icon: "🏪" },
  { id: "service_provider", label: "Service", icon: "🔧" },
  { id: "driver", label: "Driver", icon: "🛵" },
  { id: "emergency", label: "Emergency", icon: "🚨" }
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
  "business",
  "agriculture",
  "fashion",
  "engineering",
  "fintech",
  "logistics",
  "retail",
  "food",
  "health",
  "local"
];

SNM.DEFAULT_MAX_KM = 2000;
