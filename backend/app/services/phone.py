import re

from app.services.admin_box import ADMIN_UID

# Minimal v1 rules; expand with full country table as needed.
COUNTRY_PHONE = {
    "Nigeria": {"dial": "+234", "len": 10, "first": "789"},
    "Ghana": {"dial": "+233", "len": 9, "first": "245"},
    "Kenya": {"dial": "+254", "len": 9, "first": "17"},
    "South Africa": {"dial": "+27", "len": 9, "first": "678"},
    "United Kingdom": {"dial": "+44", "len": 10, "first": "1237"},
    "United States": {"dial": "+1", "len": 10, "first": "23456789"},
}

ADMIN_UID_DIGITS = re.sub(r"\D", "", ADMIN_UID)


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


def is_admin_uid(phone: str) -> bool:
    """True only for permanent admin UID — never treat as E.164 mobile."""
    if not phone:
        return False
    raw = str(phone).strip()
    if raw == ADMIN_UID:
        return True
    return re.sub(r"\D", "", raw) == ADMIN_UID_DIGITS


def normalize_e164(phone: str) -> str:
    """
    Users: E.164 must start with +.
    Admin: returns ADMIN_UID as-is (no + required, not mixed with mobiles).
    """
    phone = (phone or "").strip()
    if is_admin_uid(phone):
        return ADMIN_UID

    if not phone.startswith("+"):
        raise ValueError("Phone must be E.164 and start with +")
    digits = re.sub(r"[^\d+]", "", phone)
    if not re.match(r"^\+\d{8,15}$", digits):
        raise ValueError("Invalid E.164 phone")
    # Never collapse a normal phone into admin UID
    if re.sub(r"\D", "", digits) == ADMIN_UID_DIGITS:
        raise ValueError("Invalid phone")
    return digits


def phone_digits(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")