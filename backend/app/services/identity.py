"""Phone is the only Uid. Tag: \[ S$<phoneUid> \]"""

from __future__ import annotations

from app.services.phone import digit_sum, normalize_e164, phone_digits


def phone_uid(phone: str) -> str:
    """Canonical phone Uid (E.164)."""
    return normalize_e164(phone)


def placement_S(phone: str) -> int:
    return digit_sum(phone_digits(phone))


def placement_L(name: str) -> int:
    norm = "".join((name or "").split()).lower()
    return len(norm) or 1


def start_row(name: str, phone: str, R: int = 64) -> int:
    L = placement_L(name)
    S = placement_S(phone)
    return ((L + S - 1) % R) + 1


def identity_tag(phone: str) -> str:
    """\[ S$<phoneUid> \]"""
    uid = phone_uid(phone)
    S = placement_S(uid)
    return f"\[ {S}${uid} \]"


def public_identity(name: str, phone: str) -> dict:
    uid = phone_uid(phone)
    L = placement_L(name)
    S = placement_S(uid)
    return {
        "uid": uid,
        "L": L,
        "S": S,
        "start_row": ((L + S - 1) % 64) + 1,
        "identity_tag": f"\[ {S}${uid} \]",
    }
