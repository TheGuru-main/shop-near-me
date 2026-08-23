from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.services.admin_box import ADMIN_START_ROW, ADMIN_UID, admin_public
from app.services.identity import public_identity

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_INBOX: list[dict] = []


class AdminMessageBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)
    context: str | None = None


@router.get("/box")
@limiter.limit("30/minute")
async def admin_box(request: Request):
    return admin_public()


@router.post("/message")
@limiter.limit("5/minute")
async def message_admin(
    request: Request,
    body: AdminMessageBody,
    user: User = Depends(get_current_user),
):
    sender = public_identity(user.name, user.phone)
    entry = {
        "from": sender,
        "to_uid": ADMIN_UID,
        "to_start_row": ADMIN_START_ROW,
        "body": body.body,
        "context": body.context,
    }
    _ADMIN_INBOX.append(entry)
    return {
        "ok": True,
        "delivered_to": admin_public(),
        "from_start_row": sender["start_row"],
        "to_start_row": ADMIN_START_ROW,
    }
