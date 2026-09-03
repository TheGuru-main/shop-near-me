"""Permanent Shop Near Me admin box. Uid = 550198550199; S = digit sum of Uid."""

ADMIN_NAME = "shop-near-me-admin"
ADMIN_UID = "550198550199"


def _digit_sum(uid: str) -> int:
    return sum(int(ch) for ch in str(uid) if ch.isdigit())


ADMIN_S = _digit_sum(ADMIN_UID)  # 57
ADMIN_L = len(ADMIN_NAME)  # 18
ADMIN_C = ord("s") - ord("a")  # 18
ADMIN_START_ROW = ((ADMIN_L + ADMIN_S - 1) % 64) + 1  # 11


def admin_public() -> dict:
    return {
        "uid": ADMIN_UID,
        "name": ADMIN_NAME,
        "L": ADMIN_L,
        "S": ADMIN_S,
        "c": ADMIN_C,
        "start_row": ADMIN_START_ROW,
        "identity_tag": f"[ {ADMIN_S}\[ {ADMIN_UID} ]",
        "role": "admin",
        "permanent": True,
    }
