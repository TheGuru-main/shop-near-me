"""Phone number is important"""

from app.services.phone import normalize_e164, phone_digits


def phone_uid(phone: str) -> str:
    """Canonical Uid = E.164 phone (digits fallback)."""
    try:
        return normalize_e164(phone)
    except Exception:
        return phone_digits(phone)


def placement_S(uid: str) -> int:
    return sum(int(ch) for ch in str(uid) if ch.isdigit())


def placement_L(name: str) -> int:
    return len("".join((name or "").split())) or 1


def start_row(L: int, S: int, R: int = 64) -> int:
    return ((L + S - 1) % R) + 1


def identity_tag(phone: str) -> str:
    uid = phone_uid(phone)
    S = placement_S(uid)
    return f"[ {S}\[ {uid} ]"


def public_identity(name: str, phone: str) -> dict:
    uid = phone_uid(phone)
    L = placement_L(name)
    S = placement_S(uid)
    row = start_row(L, S)
    return {
        "uid": uid,
        "name": name,
        "L": L,
        "S": S,
        "start_row": row,
        "identity_tag": f"[ {S} \]{uid} ]",
    }
