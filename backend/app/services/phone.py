import re

# Minimal v1 rules; expand with full country table as needed.
COUNTRY_PHONE = {
    "Nigeria": {"dial": "+234", "len": 10, "first": "789"},
    "Ghana": {"dial": "+233", "len": 9, "first": "245"},
    "Kenya": {"dial": "+254", "len": 9, "first": "17"},
    "South Africa": {"dial": "+27", "len": 9, "first": "678"},
    "United Kingdom": {"dial": "+44", "len": 10, "first": "1237"},
    "United States": {"dial": "+1", "len": 10, "first": "23456789"},
}


def digit_sum(s: str) -> int:
    return sum(int(ch) for ch in str(s) if ch.isdigit())


def sanitize_local(raw: str) -> str:
    v = re.sub(r"\D", "", raw or "")
    while v.startswith("0"):
        v = v[1:]
    return v


def validate_local_for_country(country: str, local: str) -> bool:
    meta = COUNTRY_PHONE.get(country)
    if not meta:
        return False
    local = sanitize_local(local)
    if len(local) != meta["len"]:
        return False
    if local[0] not in meta["first"]:
        return False
    return True


def compose_e164(dial: str, local: str) -> str:
    return f"{dial}{sanitize_local(local)}"


def normalize_e164(phone: str) -> str:
    phone = (phone or "").strip()
    if not phone.startswith("+"):
        raise ValueError("Phone must be E.164 and start with +")
    digits = re.sub(r"[^\d+]", "", phone)
    if not re.match(r"^\+\d{8,15}$", digits):
        raise ValueError("Invalid E.164 phone")
    return digits


def phone_digits(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")
