import secrets
import time
import uuid
from typing import Any

from app.services.phone import digit_sum, phone_digits

# pending_id -> record (in-memory v1; move to Redis/DB later)
_PENDING: dict[str, dict[str, Any]] = {}
RESEND_COOLDOWN_SEC = 5 * 60  # 5 minutes
OTP_TTL_SEC = 10 * 60


def gsp_sandbox_otp(name: str, phone: str) -> str:
    """Deterministic GSP-sandbox style 6-digit OTP from name + phone."""
    norm = "".join(str(name or "").split()).lower()
    L = len(norm) or 1
    digits = phone_digits(phone)
    S = digit_sum(digits[-10:] or "0")
    raw = ((L * 17 + S * 13 + len(digits) * 7) % 900000) + 100000
    return str(raw)[:6]


def create_pending(payload: dict[str, Any], phone: str, name: str) -> dict[str, Any]:
    otp = gsp_sandbox_otp(name, phone)
    pending_id = str(uuid.uuid4())
    now = time.time()
    _PENDING[pending_id] = {
        "otp": otp,
        "phone": phone,
        "payload": payload,
        "created_at": now,
        "last_sent_at": now,
        "expires_at": now + OTP_TTL_SEC,
    }
    return {
        "pending_id": pending_id,
        "phone": phone,
        "expires_in_sec": OTP_TTL_SEC,
        "otp_dev": otp,  # remove in production; sandbox only
    }


def get_pending(pending_id: str) -> dict[str, Any] | None:
    rec = _PENDING.get(pending_id)
    if not rec:
        return None
    if time.time() > rec["expires_at"]:
        _PENDING.pop(pending_id, None)
        return None
    return rec


def verify_otp(pending_id: str, otp: str) -> dict[str, Any] | None:
    rec = get_pending(pending_id)
    if not rec:
        return None
    if str(otp).strip() != str(rec["otp"]):
        return None
    _PENDING.pop(pending_id, None)
    return rec


def can_resend(pending_id: str) -> tuple[bool, int]:
    rec = get_pending(pending_id)
    if not rec:
        return False, 0
    elapsed = time.time() - rec["last_sent_at"]
    left = int(RESEND_COOLDOWN_SEC - elapsed)
    if left > 0:
        return False, left
    return True, 0


def mark_resent(pending_id: str) -> str | None:
    ok, left = can_resend(pending_id)
    if not ok:
        return None
    rec = get_pending(pending_id)
    if not rec:
        return None
    # Optionally rotate OTP on resend:
    otp = gsp_sandbox_otp(rec["payload"].get("name", ""), rec["phone"])
    rec["otp"] = otp
    rec["last_sent_at"] = time.time()
    rec["expires_at"] = time.time() + OTP_TTL_SEC
    return otp
