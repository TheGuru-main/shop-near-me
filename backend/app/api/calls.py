"""
Call / video signaling. Media = WebRTC client + TURN/SFU later.
Uid = phone. start_row on every signal.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.services.identity import public_identity, start_row
from app.services.phone import normalize_e164

router = APIRouter(prefix="/calls", tags=["calls"])

# In-memory signaling store (swap for Redis on scale)
_CALLS: dict[str, dict[str, Any]] = {}


class CallStart(BaseModel):
    to_uid: str = Field(..., description="Callee phone Uid E.164")
    mode: str = "video"  # audio | video


class SignalBody(BaseModel):
    call_id: str
    kind: str  # offer | answer | ice | hangup
    sdp: str | None = None
    ice: dict | None = None


def _room_id(uid_a: str, uid_b: str) -> str:
    a, b = sorted([uid_a, uid_b])
    return f"{a}:{b}"


@router.post("/start")
@limiter.limit("30/minute")
async def start_call(
    request: Request,
    body: CallStart,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        to_uid = normalize_e164(body.to_uid)
        from_uid = normalize_e164(user.phone)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if to_uid == from_uid:
        raise HTTPException(status_code=400, detail="Cannot call yourself")

    callee = (
        db.query(User)
        .filter(User.phone == to_uid, User.deleted_at.is_(None))
        .first()
    )
    if not callee:
        raise HTTPException(status_code=404, detail="Callee not found")

    from_id = public_identity(user.name, from_uid)
    to_id = public_identity(callee.name, to_uid)
    call_id = str(uuid.uuid4())
    room = _room_id(from_uid, to_uid)

    rec = {
        "call_id": call_id,
        "room_id": room,
        "mode": body.mode,
        "status": "ringing",
        "from": from_id,
        "to": to_id,
        "signals": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _CALLS[call_id] = rec
    return rec


@router.post("/signal")
@limiter.limit("120/minute")
async def signal(
    request: Request,
    body: SignalBody,
    user: User = Depends(get_current_user),
):
    rec = _CALLS.get(body.call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found")

    uid = normalize_e164(user.phone)
    parties = {rec["from"]["uid"], rec["to"]["uid"]}
    if uid not in parties:
        raise HTTPException(status_code=403, detail="Not a call party")

    ident = public_identity(user.name, uid)
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "from_uid": uid,
        "identity_tag": ident["identity_tag"],
        "start_row": ident["start_row"],
        "kind": body.kind,
        "sdp": body.sdp,
        "ice": body.ice,
    }
    rec["signals"].append(entry)
    if body.kind == "hangup":
        rec["status"] = "ended"
    elif body.kind == "answer":
        rec["status"] = "active"
    return {"ok": True, "call_id": body.call_id, "status": rec["status"], "entry": entry}


@router.get("/{call_id}")
@limiter.limit("60/minute")
async def get_call(
    request: Request,
    call_id: str,
    user: User = Depends(get_current_user),
):
    rec = _CALLS.get(call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found")
    uid = normalize_e164(user.phone)
    if uid not in {rec["from"]["uid"], rec["to"]["uid"]}:
        raise HTTPException(status_code=403, detail="Not a call party")
    return rec
