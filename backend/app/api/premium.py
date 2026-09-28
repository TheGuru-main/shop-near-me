
"""Premium plans, pending subscribe (activation code), entitlements."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.premium import PremiumSubscription
from app.models.user import User
from app.services.calculators import checkout_calc, premium_calc
from app.services.premium_catalog import (
    aftereffect_for_codes,
    get_plan,
    list_plans,
)

router = APIRouter(prefix="/premium", tags=["premium"])


class SubscribeIn(BaseModel):
    plan_code: str
    payment_ref: str | None = None  # activation code from client
    code: str | None = None  # alias
    status: str | None = None
    force_stub: bool = False


class CancelIn(BaseModel):
    plan_code: str


class CalcIn(BaseModel):
    items: list[dict] = Field(default_factory=list)
    discount_amount: float = 0
    discount_percent: float = 0
    vat_percent: float = 0
    fx_rate: float = 1.0
    currency: str = "NGN"
    target_currency: str | None = None
    mode: str = "checkout"


def _active_codes(user: User) -> list[str]:
    prefs = getattr(user, "prefs", None)
    if isinstance(prefs, dict):
        codes = prefs.get("premium_codes") or []
        return [str(x) for x in codes if x]
    return []


def _set_active_codes(user: User, codes: list[str]) -> None:
    prefs = user.prefs if isinstance(user.prefs, dict) else {}
    if not isinstance(user.prefs, dict):
        prefs = {"_legacy_prefs": user.prefs}
    prefs["premium_codes"] = list(dict.fromkeys(codes))
    user.prefs = prefs


def _duration_days(plan: dict) -> int | None:
    t = (plan.get("type") or "one_time").lower()
    if t == "monthly":
        return 30
    if t == "yearly":
        return 365
    if t == "one_time":
        return None  # no expiry
    return 30


@router.get("/plans")
@limiter.limit("60/minute")
async def plans(request: Request):
    return {"currency": "NGN", "plans": list_plans()}


@router.get("/me")
@limiter.limit("60/minute")
async def me(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    codes = _active_codes(user)
    rows = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.status == "active",
        )
        .all()
    )
    active = []
    for r in rows:
        active.append(
            {
                "code": r.code,
                "status": r.status,
                "payment_ref": getattr(r, "payment_ref", None),
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "payment_at": r.payment_at.isoformat() if r.payment_at else None,
            }
        )
    return {
        "uid": getattr(user, "phone", None),
        "active_codes": codes,
        "subscriptions": active,
        "aftereffect": aftereffect_for_codes(codes),
    }


@router.post("/subscribe")
@limiter.limit("20/minute")
async def subscribe(
    request: Request,
    body: SubscribeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """User: I have paid → pending row + activation code. Does NOT unlock premium."""
    plan_code = (body.plan_code or body.code or "").strip()
    plan = get_plan(plan_code)
    if not plan:
        raise HTTPException(status_code=404, detail="Unknown plan")
    if plan.get("status") == "coming_soon":
        raise HTTPException(status_code=400, detail="Plan coming soon")

    activation = (body.payment_ref or "").strip()
    if not activation:
        raise HTTPException(
            status_code=400,
            detail="activation code (payment_ref) required",
        )

    row = PremiumSubscription(
        id=uuid.uuid4(),
        user_id=user.id,
        code=plan_code,
        status="pending_verification",
        payment_ref=activation,
        payment_at=None,
        expires_at=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "status": "pending_verification",
        "plan_code": plan_code,
        "activation_code": activation,
        "subscription_id": str(row.id),
        "message": "Pending admin activation after payment confirmation",
    }


@router.post("/cancel")
@limiter.limit("20/minute")
async def cancel(
    request: Request,
    body: CancelIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    codes = [c for c in _active_codes(user) if c != body.plan_code]
    _set_active_codes(user, codes)
    for r in (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.code == body.plan_code,
            PremiumSubscription.status == "active",
        )
        .all()
    ):
        r.status = "cancelled"
        db.add(r)
    db.add(user)
    db.commit()
    return {
        "ok": True,
        "active_codes": codes,
        "aftereffect": aftereffect_for_codes(codes),
    }


@router.post("/calculator")
@limiter.limit("60/minute")
async def calculator(
    request: Request,
    body: CalcIn,
    user: User = Depends(get_current_user),
):
    codes = _active_codes(user)
    if body.mode == "premium":
        if "premium_calculator" not in codes:
            raise HTTPException(status_code=403, detail="Premium calculator not active")
        return premium_calc(
            body.items,
            discount_amount=body.discount_amount,
            discount_percent=body.discount_percent,
            vat_percent=body.vat_percent,
            fx_rate=body.fx_rate,
            currency=body.currency,
            target_currency=body.target_currency,
        )
    return checkout_calc(
        body.items,
        discount_amount=body.discount_amount,
        currency=body.currency,
    )
