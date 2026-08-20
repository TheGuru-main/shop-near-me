from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.schemas.presence import HeartbeatResponse, LiveBody
from app.services.heartbeat import heartbeat_score, pulse_now
from app.services.gsg import gsg_at

router = APIRouter(prefix="/presence", tags=["presence"])


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
    return HeartbeatResponse(
        hb_at=user.hb_at.isoformat() if user.hb_at else None,
        score=heartbeat_score(user.hb_at),
        live=user.live,
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
        live=user.live,
    )


@router.get("/me", response_model=HeartbeatResponse)
@limiter.limit("60/minute")
async def presence_me(
    request: Request,
    user: User = Depends(get_current_user),
):
    return HeartbeatResponse(
        hb_at=user.hb_at.isoformat() if user.hb_at else None,
        score=heartbeat_score(user.hb_at) if user.role != "buyer" else 0.0,
        live=user.live,
    )
