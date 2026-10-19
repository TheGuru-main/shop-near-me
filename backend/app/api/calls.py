"""Call signaling. Media = WebRTC on client. Redis + memory fallback."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request
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
TTL = 180


class CallStart(BaseModel):
    to_uid: str | None = None
    to_phone: str | None = None  # alias
    mode: str = "voice"

    def peer(self) -> str:
        return (self.to_uid or self.to_phone or "").strip()


class SignalIn(BaseModel):
    call_id: str
    kind: str
    sdp: str | None = None
    ice: dict | None = None


def _key(call_id: str) -> str:
    return f"call:{call_id}"


def _pending_key(phone: str) -> str:
    return f"call:pending:{phone}"


def _save(rec: dict) -> None:
    cid = rec["call_id"]
    if not redis_set_json(_key(cid), rec, ttl=TTL):
        _CALLS_MEM[cid] = rec


def _load(call_id: str) -> dict | None:
    return redis_get_json(_key(call_id)) or _CALLS_MEM.get(call_id)


def _norm(phone: str) -> str:
    try:
        return normalize_e164(phone)
    except Exception:
        s = "".join(c for c in str(phone or "") if c.isdigit() or c == "+")
        if s.startswith("+"):
            return "+" + "".join(c for c in s if c.isdigit())
        digits = "".join(c for c in s if c.isdigit())
        if digits.startswith("234"):
            return "+" + digits
        if len(digits) >= 10:
            return "+" + digits
        raise ValueError("Invalid phone")


@router.post("/start")
@limiter.limit("30/minute")
async def start_call(
    request: Request,
    payload: CallStart = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    peer_raw = payload.peer()
    if not peer_raw:
        raise HTTPException(status_code=400, detail="to_uid (phone) required")
    try:
        to_uid = _norm(peer_raw)
        from_uid = _norm(user.phone)
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
        # try without forcing +
        callee = (
            db.query(User)
            .filter(User.phone.endswith(to_uid[-10:]), User.deleted_at.is_(None))
            .first()
        )
    if not callee:
        raise HTTPException(status_code=404, detail="Callee not found")

    mode = (payload.mode or "voice").lower()
    if mode in ("audio",):
        mode = "voice"
    if mode not in ("voice", "video"):
        mode = "voice"

    from_id = public_identity(user.name, from_uid)
    to_id = public_identity(callee.name, callee.phone or to_uid)
    call_id = str(uuid.uuid4())
    rec = {
        "call_id": call_id,
        "mode": mode,
        "status": "ringing",
        "from": from_id,
        "to": to_id,
        "signals": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(rec)
    ring = {
        "call_id": call_id,
        "mode": mode,
        "from": from_id,
        "to": to_id,
        "status": "ringing",
        "at": rec["created_at"],
    }
    redis_lpush(_pending_key(to_id.get("uid") or to_uid), ring, maxlen=20)
    redis_publish(f"call:signal:{call_id}", {"kind": "ring", **ring})
    return rec


@router.post("/signal")
@limiter.limit("120/minute")
async def signal(
    request: Request,
    payload: SignalIn = Body(...),
    user: User = Depends(get_current_user),
):
    rec = _load(payload.call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found")
    try:
        uid = _norm(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    parties = {rec["from"].get("uid"), rec["to"].get("uid")}
    if uid not in parties and not any(
        str(p or "").endswith(uid[-10:]) for p in parties
    ):
        raise HTTPException(status_code=403, detail="Not a call party")

    kind = (payload.kind or "").lower().strip()
    if kind not in ("offer", "answer", "ice", "hangup"):
        raise HTTPException(status_code=400, detail="Invalid kind")

    ident = public_identity(user.name, uid)
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "from_uid": uid,
        "identity_tag": ident.get("identity_tag"),
        "start_row": ident.get("start_row"),
        "kind": kind,
        "sdp": payload.sdp,
        "ice": payload.ice,
    }
    signals = list(rec.get("signals") or [])
    signals.append(entry)
    rec["signals"] = signals[-80:]
    if kind == "hangup":
        rec["status"] = "ended"
    elif kind == "answer":
        rec["status"] = "active"
    _save(rec)
    redis_publish(f"call:signal:{payload.call_id}", entry)
    if kind == "hangup":
        redis_delete(_key(payload.call_id))
    return {"ok": True, "call_id": payload.call_id, "status": rec["status"], "entry": entry}


@router.get("/pending")
@limiter.limit("60/minute")
async def pending_calls(
    request: Request,
    user: User = Depends(get_current_user),
):
    try:
        uid = _norm(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    items = redis_lrange(_pending_key(uid), 0, 9)
    for rec in list(_CALLS_MEM.values()):
        if rec.get("status") == "ringing" and rec.get("to", {}).get("uid") == uid:
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
        uid = _norm(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    parties = {rec["from"].get("uid"), rec["to"].get("uid")}
    if uid not in parties and not any(
        str(p or "").endswith(str(uid)[-10:]) for p in parties
    ):
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
