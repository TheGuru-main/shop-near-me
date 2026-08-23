"""Checkout assist: any PoD / bulky item → book driver prompt + nearby drivers."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.services.category_rules import (
    MAIN_CATEGORIES,
    estimate_driver_fee_ngn,
    max_km_for_category,
    needs_carrier,
)
from app.services.identity import public_identity
from app.services.search import haversine_km

router = APIRouter(prefix="/checkout", tags=["checkout"])


class CheckoutAssistBody(BaseModel):
    item_title: str = ""
    item_body: str | None = None
    category: str | None = None
    fulfillment: str | None = None  # walk_in | pod | delivery
    require_pod: bool = False
    seller_phone: str | None = None
    seller_lat: float | None = None
    seller_lng: float | None = None
    buyer_lat: float | None = None
    buyer_lng: float | None = None
    context: str = "product"  # product | fairly_used | service


@router.get("/categories")
@limiter.limit("30/minute")
async def list_categories(request: Request):
    return {"categories": MAIN_CATEGORIES}


@router.post("/assist")
@limiter.limit("30/minute")
async def checkout_assist(
    request: Request,
    body: CheckoutAssistBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    carrier = needs_carrier(
        title=body.item_title,
        body=body.item_body,
        category=body.category,
        fulfillment=body.fulfillment,
        require_pod=body.require_pod,
    )
    suggested_max_km = max_km_for_category(body.category, body.item_title)

    km = None
    if (
        body.buyer_lat is not None
        and body.buyer_lng is not None
        and body.seller_lat is not None
        and body.seller_lng is not None
    ):
        km = round(
            haversine_km(
                body.buyer_lat,
                body.buyer_lng,
                body.seller_lat,
                body.seller_lng,
            ),
            2,
        )

    fee = estimate_driver_fee_ngn(km) if carrier else None
    prompt = None
    if carrier:
        prompt = (
            f"Need this delivered? Book a pickup driver on our app right now "
            f"for ₦{fee:,}."
        )

    drivers = []
    if carrier and body.buyer_lat is not None and body.buyer_lng is not None:
        rows = (
            db.query(User)
            .filter(
                User.role == "driver",
                User.deleted_at.is_(None),
                User.live.is_(True),
            )
            .limit(50)
            .all()
        )
        for d in rows:
            dkm = None
            if d.lat is not None and d.lng is not None:
                dkm = round(
                    haversine_km(
                        body.buyer_lat,
                        body.buyer_lng,
                        float(d.lat),
                        float(d.lng),
                    ),
                    2,
                )
            if dkm is not None and dkm > 20:
                continue
            ident = public_identity(d.name, d.phone)
            drivers.append(
                {
                    "uid": ident["uid"],
                    "identity_tag": ident["identity_tag"],
                    "name": d.name,
                    "km": dkm,
                    "start_row": ident["start_row"],
                    "live": d.live,
                }
            )
        drivers.sort(key=lambda x: x["km"] if x["km"] is not None else 9999)

    return {
        "needs_carrier": carrier,
        "category": body.category,
        "suggested_max_km": suggested_max_km,
        "km_buyer_seller": km,
        "driver_prompt": prompt,
        "estimated_fee_ngn": fee,
        "nearby_drivers": drivers[:10],
        "fulfillment": body.fulfillment,
        "traffic": {
            "provider": "pending",
            "eta_minutes": None,
            "note": "Traffic ETA provider later; fee uses km estimate",
        },
    }
