"""Premium plans, subscribe (post-payment), entitlements, calculators."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
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
    payment_ref: str | None = None
    # set true only with PREMIUM_ACTIVATE_STUB for beta without bank webhook
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
    mode: str = "checkout"  # checkout | premium


def _active_codes(user: User) -> list[str]:
    raw = getattr(user, "premium_codes", None) or getattr(user, "prefs", None) or []
    if isinstance(raw, dict):
        return list(raw.get("premium_codes") or [])
    if isinstance(raw, list):
        # prefs may be category list; prefer dedicated attr if you add column later
        return [x for x in raw if isinstance(x, str) and get_plan(x)]
    return []


def _set_active_codes(user: User, codes: list[str]) -> None:
    # Store on prefs JSON until dedicated column exists
    prefs = user.prefs if isinstance(user.prefs, dict) else {}
    if not isinstance(user.prefs, dict):
        prefs = {"_legacy_prefs": user.prefs}
    prefs["premium_codes"] = codes
    user.prefs = prefs


@router.get("/plans")
@limiter.limit("60/minute")
async def plans(request: Request):
    return {"currency": "NGN", "plans": list_plans()}


@router.get("/me")
@limiter.limit("60/minute")
async def me(request: Request, user: User = Depends(get_current_user)):
    codes = _active_codes(user)
    return {
        "uid": getattr(user, "phone", None),
        "active_codes": codes,
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
    plan = get_plan(body.plan_code)
    if not plan:
        raise HTTPException(status_code=404, detail="Unknown plan")
    if plan.get("status") == "coming_soon":
        raise HTTPException(status_code=400, detail="Plan coming soon")

    settings = get_settings()
    stub = bool(getattr(settings, "premium_activate_stub", False)) or body.force_stub
    if not stub and not (body.payment_ref and body.payment_ref.strip()):
        raise HTTPException(
            status_code=400,
            detail="payment_ref required after bank/Zenith confirmation",
        )
    if not stub:
        # Production: verify payment_ref via webhook/ledger — not implemented
        raise HTTPException(
            status_code=501,
            detail="Payment verification pending; use PREMIUM_ACTIVATE_STUB=true for beta",
        )

    codes = _active_codes(user)
    if body.plan_code not in codes:
        codes.append(body.plan_code)
    _set_active_codes(user, codes)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "ok": True,
        "plan": plan,
        "active_codes": codes,
        "aftereffect": aftereffect_for_codes(codes),
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "stub" if stub else "verified",
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
            raise HTTPException(
                status_code=403,
                detail="Premium calculator not active",
            )
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
