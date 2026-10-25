"""Call signaling: UID→UID WebRTC payloads. Redis + in-process memory."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
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
_PENDING_MEM: dict[str, list[dict[str, Any]]] = {}
TTL = 300


class CallStart(BaseModel):
    to_uid: str | None = None
    to_phone: str | None = None
    mode: str = "voice"

    def peer(self) -> str:
        return (self.to_uid or self.to_phone or "").strip()


class SignalIn(BaseModel):
    call_id: str
    kind: str  # offer | answer | ice | hangup
    sdp: str | None = None
    ice: dict | None = None


def _key(call_id: str) -> str:
    return f"call:{call_id}"


def _pending_key(phone: str) -> str:
    return f"call:pending:{phone}"


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


def _digits(p: str) -> str:
    return "".join(c for c in str(p or "") if c.isdigit())


def _same_uid(a: str, b: str) -> bool:
    da, db = _digits(a), _digits(b)
    if not da or not db:
        return False
    return da == db or da.endswith(db[-10:]) or db.endswith(da[-10:])


def _save(rec: dict) -> None:
    cid = rec["call_id"]
    ok = redis_set_json(_key(cid), rec, ttl=TTL)
    _CALLS_MEM[cid] = rec  # always keep memory copy (same worker)
    if not ok:
        pass


def _load(call_id: str) -> dict | None:
    return redis_get_json(_key(call_id)) or _CALLS_MEM.get(call_id)


def _push_pending(to_uid: str, ring: dict) -> None:
    redis_lpush(_pending_key(to_uid), ring, maxlen=20)
    lst = _PENDING_MEM.setdefault(to_uid, [])
    lst.insert(0, ring)
    _PENDING_MEM[to_uid] = lst[:20]
    # also key by last-10 digits
    d = _digits(to_uid)
    if len(d) >= 10:
        lst2 = _PENDING_MEM.setdefault(d[-10:], [])
        lst2.insert(0, ring)
        _PENDING_MEM[d[-10:]] = lst2[:20]


def _list_pending(uid: str) -> list[dict]:
    items: list[dict] = []
    items.extend(redis_lrange(_pending_key(uid), 0, 9) or [])
    items.extend(_PENDING_MEM.get(uid) or [])
    d = _digits(uid)
    if len(d) >= 10:
        items.extend(_PENDING_MEM.get(d[-10:]) or [])
    # live ringing from memory
    for rec in list(_CALLS_MEM.values()):
        if rec.get("status") != "ringing":
            continue
        to_u = (rec.get("to") or {}).get("uid") or ""
        if _same_uid(to_u, uid):
            items.append(
                {
                    "call_id": rec["call_id"],
                    "mode": rec.get("mode"),
                    "from": rec.get("from"),
                    "to": rec.get("to"),
                    "status": "ringing",
                }
            )
    # de-dupe by call_id
    seen = set()
    out = []
    for it in items:
        cid = (it or {}).get("call_id")
        if not cid or cid in seen:
            continue
        seen.add(cid)
        out.append(it)
    return out[:10]


def _party_ok(rec: dict, uid: str) -> bool:
    parties = [
        (rec.get("from") or {}).get("uid"),
        (rec.get("to") or {}).get("uid"),
    ]
    return any(_same_uid(str(p or ""), uid) for p in parties)


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
        raise HTTPException(status_code=400, detail="to_uid (phone UID) required")
    try:
        to_uid = _norm(peer_raw)
        from_uid = _norm(user.phone)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if _same_uid(to_uid, from_uid):
        raise HTTPException(status_code=400, detail="Cannot call yourself")

    callee = (
        db.query(User)
        .filter(User.phone == to_uid, User.deleted_at.is_(None))
        .first()
    )
    if not callee:
        dig = _digits(to_uid)
        callee = (
            db.query(User)
            .filter(User.deleted_at.is_(None), User.phone.endswith(dig[-10:]))
            .first()
        )
    if not callee:
        raise HTTPException(status_code=404, detail="Callee not found")

    mode = (payload.mode or "voice").lower()
    if mode == "audio":
        mode = "voice"
    if mode not in ("voice", "video"):
        mode = "voice"

    from_id = public_identity(user.name, from_uid)
    to_id = public_identity(callee.name, callee.phone or to_uid)
    # force uid fields to E.164
    from_id["uid"] = from_uid
    to_id["uid"] = _norm(callee.phone or to_uid)

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
    _push_pending(to_id["uid"], ring)
    try:
        redis_publish(f"call:signal:{call_id}", {"kind": "ring", **ring})
    except Exception:
        pass

    return {
        "call_id": call_id,
        "mode": mode,
        "status": "ringing",
        "from": from_id,
        "to": to_id,
        "signals": [],
        "signal_total": 0,
    }


@router.post("/signal")
@limiter.limit("120/minute")
async def signal(
    request: Request,
    payload: SignalIn = Body(...),
    user: User = Depends(get_current_user),
):
    rec = _load(payload.call_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Call not found or expired")
    try:
        uid = _norm(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    if not _party_ok(rec, uid):
        raise HTTPException(status_code=403, detail="Not a call party")

    kind = (payload.kind or "").lower().strip()
    if kind not in ("offer", "answer", "ice", "hangup"):
        raise HTTPException(status_code=400, detail="kind must be offer|answer|ice|hangup")

    if kind in ("offer", "answer") and not (payload.sdp and str(payload.sdp).strip()):
        raise HTTPException(status_code=400, detail="sdp required for offer/answer")
    if kind == "ice" and not payload.ice:
        raise HTTPException(status_code=400, detail="ice required for ice")

    entry = {
        "from_uid": uid,
        "kind": kind,
        "sdp": payload.sdp,
        "ice": payload.ice,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    signals = list(rec.get("signals") or [])
    signals.append(entry)
    rec["signals"] = signals[-120:]
    if kind == "hangup":
        rec["status"] = "ended"
    elif kind == "answer":
        rec["status"] = "active"
    elif kind == "offer" and rec.get("status") == "ringing":
        rec["status"] = "ringing"
    _save(rec)
    try:
        redis_publish(f"call:signal:{payload.call_id}", entry)
    except Exception:
        pass
    if kind == "hangup":
        try:
            redis_delete(_key(payload.call_id))
        except Exception:
            pass
        # keep memory briefly so peer can read hangup
    return {
        "ok": True,
        "call_id": payload.call_id,
        "status": rec["status"],
        "signal_total": len(rec["signals"]),
        "entry": entry,
    }


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
    items = _list_pending(uid)
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
        raise HTTPException(status_code=404, detail="Call not found or expired")
    try:
        uid = _norm(user.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    if not _party_ok(rec, uid):
        raise HTTPException(status_code=403, detail="Not a call party")

    all_signals = list(rec.get("signals") or [])
    # after = index cursor (exclusive start)
    if after < 0:
        after = 0
    slice_ = all_signals[after:]
    return {
        "call_id": rec["call_id"],
        "mode": rec.get("mode"),
        "status": rec.get("status"),
        "from": rec.get("from"),
        "to": rec.get("to"),
        "signals": slice_,
        "signal_total": len(all_signals),
        "created_at": rec.get("created_at"),
    }
