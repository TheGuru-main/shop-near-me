"""Merchant live sessions. SFU token placeholder; WebRTC in client."""


import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.services.identity import public_identity
from app.services.phone import normalize_e164

router = APIRouter(prefix="/live", tags=["live"])

_SESSIONS: dict[str, dict[str, Any]] = {}


class LiveStart(BaseModel):
    title: str | None = None


@router.post("/sessions")
@limiter.limit("20/minute")
async def start_live(
    request: Request,
    body: LiveStart,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "buyer":
        raise HTTPException(status_code=403, detail="Buyers cannot start live shop sessions")

    uid = normalize_e164(user.phone)
    ident = public_identity(user.name, uid)
    sid = str(uuid.uuid4())
    rec = {
        "session_id": sid,
        "host": ident,
        "title": body.title or f"{user.name} live",
        "status": "live",
        "sfu": {
            "provider": "pending",
            "join_token": None,
            "note": "Attach LiveKit/Daily keys later; WebRTC client uses signaling",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _SESSIONS[sid] = rec
    user.live = True
    db.add(user)
    db.commit()
    return rec


@router.post("/sessions/{session_id}/stop")
@limiter.limit("20/minute")
async def stop_live(
    request: Request,
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _SESSIONS.get(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found")
    uid = normalize_e164(user.phone)
    if rec["host"]["uid"] != uid:
        raise HTTPException(status_code=403, detail="Not host")
    rec["status"] = "ended"
    user.live = False
    db.add(user)
    db.commit()
    return {"ok": True, "session_id": session_id, "status": "ended"}


@router.get("/sessions/{session_id}")
@limiter.limit("60/minute")
async def get_session(request: Request, session_id: str):
    rec = _SESSIONS.get(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found")
    return rec


@router.get("/active")
@limiter.limit("60/minute")
async def list_active(request: Request):
    items = [s for s in _SESSIONS.values() if s.get("status") == "live"]
    return {"count": len(items), "sessions": items}

