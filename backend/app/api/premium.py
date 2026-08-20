import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.premium import PremiumSubscription
from app.models.user import User
from app.services.premium_catalog import PLANS, run_calculator
from app.services.priority import cancel_priority, subscribe_priority

router = APIRouter(prefix="/premium", tags=["premium"])


class SubscribeBody(BaseModel):
    code: str
    capacity_tier: str | None = None


class CancelBody(BaseModel):
    code: str


class CalcBody(BaseModel):
    lines: list[dict] = []
    vat_rate: float = 0.0
    fx_rate: float = 1.0
    discount: float = 0.0


@router.get("/plans")
@limiter.limit("30/minute")
async def plans(request: Request):
    return {"plans": PLANS}


@router.get("/me")
@limiter.limit("60/minute")
async def my_premium(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.status == "active",
        )
        .all()
    )
    return {
        "subscriptions": [
            {
                "code": r.code,
                "capacity_tier": r.capacity_tier,
                "status": r.status,
                "payment_at": r.payment_at.isoformat() if r.payment_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            }
            for r in rows
        ]
    }


@router.post("/subscribe")
@limiter.limit("20/minute")
async def subscribe(
    request: Request,
    body: SubscribeBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = next((p for p in PLANS if p["code"] == body.code), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Unknown plan")
    if plan.get("status") == "coming_soon":
        raise HTTPException(status_code=400, detail="Plan coming soon")

    now = datetime.now(timezone.utc)
    sub = PremiumSubscription(
        id=uuid.uuid4(),
        user_id=user.id,
        code=body.code,
        capacity_tier=body.capacity_tier,
        status="active",
        payment_at=now,
    )
    db.add(sub)
    db.commit()

    if body.code == "priority_support":
        subscribe_priority(
            user_id=str(user.id),
            city=user.city or "",
            community=user.community or "",
            payment_at=now,
        )

    return {"ok": True, "code": body.code, "capacity_tier": body.capacity_tier}


@router.post("/cancel")
@limiter.limit("20/minute")
async def cancel(
    request: Request,
    body: CancelBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.code == body.code,
            PremiumSubscription.status == "active",
        )
        .all()
    )
    for r in rows:
        r.status = "cancelled"
        db.add(r)
    db.commit()
    if body.code == "priority_support":
        cancel_priority(str(user.id), user.city or "", user.community or "")
    return {"ok": True, "code": body.code, "cancelled": len(rows)}


@router.post("/calculator")
@limiter.limit("30/minute")
async def calculator(
    request: Request,
    body: CalcBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.code == "premium_calculator",
            PremiumSubscription.status == "active",
        )
        .first()
    )
    if not active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium Calculator subscription required",
        )
    return run_calculator(body.lines, body.vat_rate, body.fx_rate, body.discount)
