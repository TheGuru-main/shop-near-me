"""
Admin contact box: complaints + premium notices land on ADMIN_UID.
In-memory inbox for v1 (survives until process restart).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.services.admin_box import ADMIN_START_ROW, ADMIN_UID, admin_public
from app.services.identity import public_identity

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_INBOX: list[dict] = []


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _require_admin(user: User) -> None:
    """Operator must match ADMIN_UID digits or role=admin."""
    uid = _digits(ADMIN_UID)
    phone = _digits(getattr(user, "phone", None))
    if uid and (phone == uid or phone.endswith(uid)):
        return
    if (getattr(user, "role", "") or "").lower() == "admin":
        return
    if getattr(user, "is_admin", False):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


class AdminMessageBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)
    context: str | None = None


@router.get("/box")
@limiter.limit("30/minute")
async def admin_box(request: Request):
    """Public admin contact meta (UID + name + start_row)."""
    return admin_public()


@router.post("/message")
@limiter.limit("5/minute")
async def message_admin(
    request: Request,
    body: AdminMessageBody,
    user: User = Depends(get_current_user),
):
    """Any logged-in user → drop into ADMIN_UID inbox."""
    sender = public_identity(user.name, user.phone)
    entry = {
        "id": len(_ADMIN_INBOX) + 1,
        "from": sender,
        "to_uid": ADMIN_UID,
        "to_start_row": ADMIN_START_ROW,
        "body": body.body,
        "context": body.context,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_premium_payment": str(body.body or "").startswith("[PREMIUM_PAYMENT]"),
    }
    _ADMIN_INBOX.append(entry)
    return {
        "ok": True,
        "delivered_to": admin_public(),
        "from_start_row": sender.get("start_row"),
        "to_start_row": ADMIN_START_ROW,
    }


@router.get("/messages")
@limiter.limit("30/minute")
async def admin_messages(
    request: Request,
    user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    """Admin dashboard reads the contact inbox (newest first)."""
    _require_admin(user)
    items = list(reversed(_ADMIN_INBOX[-limit:]))
    return {
        "count": len(items),
        "items": items,
        "admin": admin_public(),
    }


@router.delete("/messages")
@limiter.limit("10/minute")
async def clear_admin_messages(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Optional: clear in-memory inbox after handling."""
    _require_admin(user)
    n = len(_ADMIN_INBOX)
    _ADMIN_INBOX.clear()
    return {"ok": True, "cleared": n}