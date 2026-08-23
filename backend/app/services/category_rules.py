"""Category taxonomy, geo defaults, bulky/PoD driver assist."""

# Main business / browse categories (app fields)
MAIN_CATEGORIES = [
    "Retail",
    "Food",
    "Restaurant",
    "Electronics",
    "Fashion",
    "Shoes",
    "Furniture",
    "Appliances",
    "Agriculture",
    "Pharmacy",
    "Hospital",
    "Clinic",
    "Fuel",
    "Hotel",
    "Salon",
    "Education",
    "Logistics",
    "Driver",
    "Emergency",
    "Building Materials",
    "Auto",
    "Other",
]

# Realistic default radius (km)
CATEGORY_MAX_KM = {
    "hospital": 25.0,
    "clinic": 20.0,
    "pharmacy": 15.0,
    "emergency": 30.0,
    "shoe": 12.0,
    "shoes": 12.0,
    "fashion": 12.0,
    "electronics": 20.0,
    "furniture": 25.0,
    "appliance": 25.0,
    "appliances": 25.0,
    "refrigerator": 30.0,
    "food": 8.0,
    "restaurant": 8.0,
    "perishable": 6.0,
    "fuel": 15.0,
    "driver": 15.0,
    "logistics": 20.0,
    "hotel": 20.0,
    "agriculture": 30.0,
    "building": 25.0,
    "auto": 20.0,
    "retail": 15.0,
    "default": 20.0,
}

BULKY_KEYWORDS = [
    "refrigerator", "fridge", "freezer", "sofa", "couch", "bed", "mattress",
    "generator", "washing machine", "cupboard", "wardrobe", "tv stand",
    "dining table", "cabinet", "large", "bulky", "gas cooker", "cylinder",
    "door", "window frame", "cement", "rod", "iron", "machine", "engine",
    "tyre", "battery", "water tank", "deep freezer",
]

# Pay-on-delivery / needs carrier
POD_HINTS = [
    "pod", "pay on delivery", "pay-on-delivery", "delivery", "pickup",
    "heavy", "fragile large",
]


def max_km_for_category(category: str | None, name: str | None = None) -> float:
    blob = f"{category or ''} {name or ''}".lower()
    for key, km in CATEGORY_MAX_KM.items():
        if key != "default" and key in blob:
            return km
    return CATEGORY_MAX_KM["default"]


def is_bulky(title: str | None, body: str | None = None, category: str | None = None) -> bool:
    blob = f"{title or ''} {body or ''} {category or ''}".lower()
    if any(k in blob for k in BULKY_KEYWORDS):
        return True
    for cat in ("furniture", "appliance", "building materials", "generator"):
        if cat in blob:
            return True
    return False


def needs_carrier(
    title: str | None = None,
    body: str | None = None,
    category: str | None = None,
    fulfillment: str | None = None,
    require_pod: bool = False,
) -> bool:
    """True for bulky goods OR any checkout marked PoD / needs delivery carrier."""
    if require_pod:
        return True
    ful = (fulfillment or "").lower()
    if ful in ("pod", "pay_on_delivery", "pay-on-delivery", "delivery"):
        return True
    blob = f"{title or ''} {body or ''} {category or ''} {ful}".lower()
    if any(h in blob for h in POD_HINTS):
        return True
    return is_bulky(title, body, category)


def estimate_driver_fee_ngn(km: float | None) -> int:
    base = 1500
    if km is None:
        return base + 2000
    return int(base + max(km, 1.0) * 400)
