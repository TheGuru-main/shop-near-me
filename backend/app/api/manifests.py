import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.manifest import DeliveryManifest
from app.models.user import User
from app.services.phone import normalize_e164

router = APIRouter(prefix="/manifests", tags=["manifests"])
STATUSES = {"created", "accepted", "in_transit", "delivered", "disputed", "closed"}


class ManifestCreate(BaseModel):
    seller_uid: str
    driver_uid: str | None = None
    item_summary: str = ""
    category: str | None = None
    pickup_text: str | None = None
    dropoff_text: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    dropoff_lat: float | None = None
    dropoff_lng: float | None = None
    fee_estimate: float | None = None
    currency: str = "NGN"
    notes: str | None = None
    with_delivery_otp: bool = False


class ManifestStatusBody(BaseModel):
    status: str
    notes: str | None = None


class DeliveryOtpVerify(BaseModel):
    otp: str


def _ser(m: DeliveryManifest) -> dict:
    return {
        "id": str(m.id),
        "buyer_uid": m.buyer_uid,
        "seller_uid": m.seller_uid,
        "driver_uid": m.driver_uid,
        "item_summary": m.item_summary,
        "category": m.category,
        "pickup_text": m.pickup_text,
        "dropoff_text": m.dropoff_text,
        "fee_estimate": m.fee_estimate,
        "currency": m.currency,
        "status": m.status,
        "has_delivery_otp": bool(m.delivery_otp),
        "notes": m.notes,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


@router.post("")
@limiter.limit("20/minute")
async def create_manifest(
    request: Request,
    body: ManifestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buyer_uid = normalize_e164(user.phone)
    seller_uid = normalize_e164(body.seller_uid)
    driver_uid = normalize_e164(body.driver_uid) if body.driver_uid else None
    otp = f"{random.randint(0, 9999):04d}" if body.with_delivery_otp else None
    m = DeliveryManifest(
        id=uuid.uuid4(),
        buyer_uid=buyer_uid,
        seller_uid=seller_uid,
        driver_uid=driver_uid,
        item_summary=body.item_summary,
        category=body.category,
        pickup_text=body.pickup_text,
        dropoff_text=body.dropoff_text,
        pickup_lat=body.pickup_lat,
        pickup_lng=body.pickup_lng,
        dropoff_lat=body.dropoff_lat,
        dropoff_lng=body.dropoff_lng,
        fee_estimate=body.fee_estimate,
        currency=body.currency,
        status="created",
        delivery_otp=otp,
        notes=body.notes,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    out = _ser(m)
    if otp:
        out["delivery_otp"] = otp
    return out


@router.get("/me")
@limiter.limit("30/minute")
async def my_manifests(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = normalize_e164(user.phone)
    rows = (
        db.query(DeliveryManifest)
        .filter(
            (DeliveryManifest.buyer_uid == uid)
            | (DeliveryManifest.seller_uid == uid)
            | (DeliveryManifest.driver_uid == uid)
        )
        .order_by(DeliveryManifest.created_at.desc())
        .limit(50)
        .all()
    )
    return {"count": len(rows), "manifests": [_ser(m) for m in rows]}


@router.get("/{manifest_id}")
@limiter.limit("30/minute")
async def get_manifest(
    request: Request,
    manifest_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.get(DeliveryManifest, manifest_id)
    if not m:
        raise HTTPException(404, detail="Not found")
    uid = normalize_e164(user.phone)
    if uid not in {m.buyer_uid, m.seller_uid, m.driver_uid}:
        raise HTTPException(403, detail="Not a party")
    return _ser(m)


@router.patch("/{manifest_id}/status")
@limiter.limit("30/minute")
async def update_status(
    request: Request,
    manifest_id: uuid.UUID,
    body: ManifestStatusBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.get(DeliveryManifest, manifest_id)
    if not m:
        raise HTTPException(404, detail="Not found")
    uid = normalize_e164(user.phone)
    if uid not in {m.buyer_uid, m.seller_uid, m.driver_uid}:
        raise HTTPException(403, detail="Not a party")
    st = body.status.strip().lower()
    if st not in STATUSES:
        raise HTTPException(400, detail=f"status must be one of {sorted(STATUSES)}")
    m.status = st
    if body.notes:
        m.notes = body.notes
    m.updated_at = datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _ser(m)


@router.post("/{manifest_id}/verify-delivery-otp")
@limiter.limit("20/minute")
async def verify_delivery_otp(
    request: Request,
    manifest_id: uuid.UUID,
    body: DeliveryOtpVerify,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.get(DeliveryManifest, manifest_id)
    if not m:
        raise HTTPException(404, detail="Not found")
    if not m.delivery_otp:
        raise HTTPException(400, detail="No delivery OTP on this manifest")
    uid = normalize_e164(user.phone)
    if uid not in {m.seller_uid, m.driver_uid}:
        raise HTTPException(403, detail="Only seller or driver may submit OTP")
    if body.otp.strip() != m.delivery_otp:
        raise HTTPException(400, detail="Invalid OTP")
    m.status = "delivered"
    m.updated_at = datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    return {"ok": True, "status": "delivered", "manifest_id": str(m.id)}
