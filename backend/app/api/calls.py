"""
Call signaling. Media = WebRTC on client.
Store room in Redis (fallback: memory). Poll for signals.
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
from app.services.identity import public_identity
from app.services.phone import normalize_e164
from app.services.redis_client import (
    redis_delete,
    redis_get_json,
    redis_lpush,
    redis_lrange,
    redis_publish,
    redis_set_json,
)

router = APIRouter(prefix="/calls", tags=["calls"])

_CALLS_MEM: dict[str, dict[str, Any]] = {}
TTL = 180  # seconds


class CallStart(BaseModel):
    to_uid: str = Field(..., description="Callee phone E.164")
    mode: str = "voice"  # voice | video


class SignalBody(BaseModel):
    call_id: str
    kind: str  # offer | answer | ice | hangup
    sdp: str | None = None
    ice: dict | None = None


def _room_id(uid_a: str, uid_b: str) -> str:
    a, b = sorted([uid_a, uid_b])
    return f"{a}:{b}"


def _key(call_id: str) -> str:
    return f"call:{call_id}"


def _pending_key(phone: str) -> str:
    return f"call:pending:{phone}"


def _save(rec: dict) -> None:
    cid = rec["call_id"]
    if not redis_set_json(_key(cid), rec, ttl=TTL):
        _CALLS_MEM[cid] = rec


def _load(call_id: str) -> dict | None:
    rec = redis_get_json(_key(call_id))
    if rec:
        return rec
    return _CALLS_MEM.get(call_id)


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
    except Exception as e:
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

    mode = (body.mode or "voice").lower()
    if mode in ("audio",):
        mode = "voice"
    if mode not in ("voice", "video"):
        mode = "voice"

    from_id = public_identity(user.name, from_uid)
    to_id = public_identity(callee.name, to_uid)
    call_id = str(uuid.uuid4())
    rec = {
        "call_id": call_id,
        "room_id": _room_id(from_uid, to_uid),
        "mode": mode,
        "status": "ringing",
        "from": from_id,
        "to": to_id,
        "signals": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(rec)

    # Notify callee inbox (poll)
    ring = {
        "call_id": call_id,
        "mode": mode,
        "from": from_id,
        "to": to_id,
        "status": "ringing",
        "at": rec["created_at"],
    }
    redis_lpush(_pending_key(to_uid), ring, maxlen=20)
    redis_publish(f"call:signal:{call_id}", {"kind": "ring", **ring})

    return rec


@router.post("/signal")
@limiter.limit("120/minute")
async def signal(
    request: Request,
    body: SignalBody,
    user: User = Depends(get_current_user),
):
    rec = _load(body.call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found")

    try:
        uid = normalize_e164(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")

    parties = {rec["from"]["uid"], rec["to"]["uid"]}
    if uid not in parties:
        raise HTTPException(status_code=403, detail="Not a call party")

    kind = (body.kind or "").lower().strip()
    if kind not in ("offer", "answer", "ice", "hangup"):
        raise HTTPException(status_code=400, detail="Invalid kind")

    ident = public_identity(user.name, uid)
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "from_uid": uid,
        "identity_tag": ident.get("identity_tag"),
        "start_row": ident.get("start_row"),
        "kind": kind,
        "sdp": body.sdp,
        "ice": body.ice,
    }
    signals = list(rec.get("signals") or [])
    signals.append(entry)
    # keep last 80
    rec["signals"] = signals[-80:]
    if kind == "hangup":
        rec["status"] = "ended"
    elif kind == "answer":
        rec["status"] = "active"
    elif kind == "offer" and rec.get("status") == "ringing":
        rec["status"] = "ringing"

    _save(rec)
    redis_publish(f"call:signal:{body.call_id}", entry)

    if kind == "hangup":
        redis_delete(_key(body.call_id))

    return {
        "ok": True,
        "call_id": body.call_id,
        "status": rec["status"],
        "entry": entry,
    }


@router.get("/pending")
@limiter.limit("60/minute")
async def pending_calls(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Callee polls for incoming rings."""
    try:
        uid = normalize_e164(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    items = redis_lrange(_pending_key(uid), 0, 9)
    # Also scan memory fallback for rings to this uid
    for rec in list(_CALLS_MEM.values()):
        if (
            rec.get("status") == "ringing"
            and rec.get("to", {}).get("uid") == uid
        ):
            items.append(
                {
                    "call_id": rec["call_id"],
                    "mode": rec.get("mode"),
                    "from": rec.get("from"),
                    "to": rec.get("to"),
                    "status": "ringing",
                }
            )
    return {"count": len(items), "items": items}


@router.get("/{call_id}")
@limiter.limit("120/minute")
async def get_call(
    request: Request,
    call_id: str,
    after: int = 0,
    user: User = Depends(get_current_user),
):
    rec = _load(call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found")
    try:
        uid = normalize_e164(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    if uid not in {rec["from"]["uid"], rec["to"]["uid"]}:
        raise HTTPException(status_code=403, detail="Not a call party")

    signals = rec.get("signals") or []
    if after > 0:
        signals = signals[after:]
    return {
        "call_id": rec["call_id"],
        "mode": rec.get("mode"),
        "status": rec.get("status"),
        "from": rec.get("from"),
        "to": rec.get("to"),
        "signals": signals,
        "signal_total": len(rec.get("signals") or []),
        "created_at": rec.get("created_at"),
    }
