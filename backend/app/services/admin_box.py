"""Permanent Shop Near Me admin box.

Uid = 550198550199
S   = digit sum of Uid
start_row = ((L + S - 1) % 64) + 1
"""

ADMIN_NAME = "shop-near-me-admin"
ADMIN_UID = "550198550199"


def _digit_sum(uid: str) -> int:
    return sum(int(ch) for ch in str(uid) if ch.isdigit())


ADMIN_S = _digit_sum(ADMIN_UID)  # 57
ADMIN_L = len(ADMIN_NAME)  # 18
ADMIN_C = ord("s") - ord("a")  # 18  (first letter of name)
ADMIN_START_ROW = ((ADMIN_L + ADMIN_S - 1) % 64) + 1  # 11


def admin_public() -> dict:
    return {
        "uid": ADMIN_UID,
        "name": ADMIN_NAME,
        "L": ADMIN_L,
        "S": ADMIN_S,
        "c": ADMIN_C,
        "start_row": ADMIN_START_ROW,
        "identity_tag": f"[ {ADMIN_S}[ {ADMIN_UID} ]",
        "role": "admin",
        "permanent": True,
    }


# Process-local contact inbox (shared by admin_contact routes).
# Multi-worker Render: use Redis later — workers do not share memory.
ADMIN_INBOX: list = []


def inbox_append(entry: dict) -> dict:
    entry = dict(entry)
    entry["id"] = len(ADMIN_INBOX) + 1
    ADMIN_INBOX.append(entry)
    return entry


def inbox_list(limit: int = 50) -> list:
    limit = max(1, min(int(limit or 50), 200))
    return list(reversed(ADMIN_INBOX[-limit:]))


def inbox_clear() -> int:
    n = len(ADMIN_INBOX)
    ADMIN_INBOX.clear()
    return n
