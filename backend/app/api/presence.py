from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.schemas.presence import HeartbeatResponse, LiveBody
from app.services.heartbeat import (
    heartbeat_score,
    pulse_now,
    effective_live,
    LIVE_TTL_SEC,
)
from datetime import datetime, timezone, timedelta
from app.services.gsg import gsg_at

router = APIRouter(prefix="/presence", tags=["presence"])


def _expire_if_stale(user: User, db: Session) -> None:
    """If marked live but hb_at too old, flip live off (same row, no new tables)."""
    if user.role == "buyer":
        return
    if not user.live:
        return
    if effective_live(True, user.hb_at):
        return
    user.live = False
    db.add(user)
    db.commit()
    db.refresh(user)


def expire_all_stale(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=LIVE_TTL_SEC)
    q = (
        db.query(User)
        .filter(
            User.live.is_(True),
            User.deleted_at.is_(None),
            User.role != "buyer",
        )
        .filter((User.hb_at.is_(None)) | (User.hb_at < cutoff))
    )
    n = 0
    for u in q.limit(500).all():
        u.live = False
        db.add(u)
        n += 1
    if n:
        db.commit()
    return n




@router.post("/heartbeat", response_model=HeartbeatResponse)
@limiter.limit("30/minute")
async def heartbeat(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyers do not use heartbeat",
        )
    user.hb_at = pulse_now()
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        from app.services.redis_client import redis_set_json, redis_publish

        payload = {
            "user_id": str(user.id),
            "phone": user.phone,
            "role": user.role,
            "lat": user.lat,
            "lng": user.lng,
            "live": user.live,
            "hb_at": user.hb_at.isoformat() if user.hb_at else None,
            "signal": "heartbeat",
        }
        redis_set_json(f"snm:presence:{user.phone}", payload, ttl=120)
        redis_publish("snm:presence", payload)
    except Exception:
        pass
    return HeartbeatResponse(
        hb_at=user.hb_at.isoformat() if user.hb_at else None,
        score=heartbeat_score(user.hb_at),
        live=effective_live(user.live, user.hb_at),
    )


@router.post("/live", response_model=HeartbeatResponse)
@limiter.limit("30/minute")
async def set_live(
    request: Request,
    body: LiveBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyers do not use live presence",
        )
    user.live = body.live
    if body.live:
        user.hb_at = pulse_now()
        if user.lat is not None and user.lng is not None:
            user.gsg = gsg_at(float(user.lat), float(user.lng))
    db.add(user)
    db.commit()
    db.refresh(user)
    return HeartbeatResponse(
        hb_at=user.hb_at.isoformat() if user.hb_at else None,
        score=heartbeat_score(user.hb_at),
        live=effective_live(user.live, user.hb_at),
    )


@router.get("/me", response_model=HeartbeatResponse)
@limiter.limit("60/minute")
async def presence_me(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _expire_if_stale(user, db)
    return HeartbeatResponse(
        hb_at=user.hb_at.isoformat() if user.hb_at else None,
        score=heartbeat_score(user.hb_at) if user.role != "buyer" else 0.0,
        live=effective_live(user.live, user.hb_at),
    )
