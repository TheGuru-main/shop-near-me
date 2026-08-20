import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, OTPRequest, OTPVerify, TokenResponse
from app.services import otp as otp_service
from app.services.phone import normalize_e164
from app.services.sms import send_otp_sms

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_public(user: User) -> dict:
    return {
        "id": str(user.id),
        "role": user.role,
        "name": user.name,
        "phone": user.phone,
        "continent_id": user.continent_id,
        "continent_name": user.continent_name,
        "country": user.country,
        "region": user.region,
        "city": user.city,
        "community": user.community,
        "primary_location": user.primary_location,
        "lat": user.lat,
        "lng": user.lng,
        "prefs": user.prefs or [],
        "ladder": user.ladder,
        "gsg": user.gsg,
        "live": user.live,
        "version": user.version,
    }


@router.post("/otp/request")
@limiter.limit("5/minute")
async def otp_request(
    request: Request,
    body: OTPRequest,
    db: Session = Depends(get_db),
):
    try:
        phone = normalize_e164(body.phone)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    existing = (
        db.query(User)
        .filter(User.phone == phone, User.deleted_at.is_(None))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone already registered",
        )

    payload = body.model_dump()
    payload["phone"] = phone
    result = otp_service.create_pending(payload, phone, body.name)
    await send_otp_sms(phone, result["otp_dev"])

    resp = {
        "pending_id": result["pending_id"],
        "phone": result["phone"],
        "expires_in_sec": result["expires_in_sec"],
    }
    from app.config import get_settings

    if get_settings().otp_expose_dev:
        resp["otp_dev"] = result["otp_dev"]
    return resp


@router.post("/otp/resend")
@limiter.limit("5/minute")
async def otp_resend(request: Request, pending_id: str):
    ok, left = otp_service.can_resend(pending_id)
    if not ok:
        if left <= 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending OTP not found or expired",
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Resend allowed in {left} seconds",
        )

    otp = otp_service.mark_resent(pending_id)
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending OTP not found or expired",
        )

    rec = otp_service.get_pending(pending_id)
    if rec:
        await send_otp_sms(rec["phone"], otp)

    return {
        "pending_id": pending_id,
        "resend": True,
        "cooldown_sec": 300,
    }


@router.post("/otp/verify", response_model=TokenResponse)
@limiter.limit("10/minute")
async def otp_verify(
    request: Request,
    body: OTPVerify,
    db: Session = Depends(get_db),
):
    rec = otp_service.verify_otp(body.pending_id, body.otp)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    data = rec["payload"]
    phone = rec["phone"]

    if (
        db.query(User)
        .filter(User.phone == phone, User.deleted_at.is_(None))
        .first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone already registered",
        )

from app.services.gsg import gsg_at
    from app.services.placement import build_location_ladder, messaging_start_row

    ladder = build_location_ladder(
        continent_name=data.get("continent_name") or "",
        continent_id=data.get("continent_id") or "",
        country=data.get("country") or "",
        region=data.get("region") or "",
        city=data.get("city") or "",
        community=data.get("community") or "",
        primary_location=data.get("primary_location") or "",
    )

    gsg = None
    if data.get("lat") is not None and data.get("lng") is not None:
        gsg = gsg_at(float(data["lat"]), float(data["lng"]))
    m_row = messaging_start_row(data.get("name") or "", phone)

    user = User(
        id=uuid.uuid4(),
        role=data["role"],
        name=data["name"],
        phone=phone,
        password_hash=hash_password(data["password"]),
        continent_id=data.get("continent_id"),
        continent_name=data.get("continent_name"),
        country=data.get("country"),
        region=data.get("region"),
        city=data.get("city"),
        community=data.get("community"),
        primary_location=data.get("primary_location"),
        lat=data.get("lat"),
        lng=data.get("lng"),
        prefs=data.get("prefs") or [],
        ladder=ladder,
        gsg=gsg,
        start_row=m_row,
        live=False,
        hb_at=None
        if data.get("role") == "buyer"
        else datetime.now(timezone.utc),
        version="1.0.0.1p",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), extra={"role": user.role})
    return TokenResponse(access_token=token, user=_user_public(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        phone = normalize_e164(body.phone)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = (
        db.query(User)
        .filter(User.phone == phone, User.deleted_at.is_(None))
        .first()
    )
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password",
        )

    token = create_access_token(str(user.id), extra={"role": user.role})
    return TokenResponse(access_token=token, user=_user_public(user))


@router.get("/me")
@limiter.limit("60/minute")
async def me(request: Request, user: User = Depends(get_current_user)):
    return _user_public(user)


@router.get("/oauth/{provider}/start")
@limiter.limit("10/minute")
async def oauth_start(request: Request, provider: str):
    supported = {"google", "apple"}
    if provider not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported provider",
        )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"OAuth2 {provider} not configured yet; set provider keys on Render",
    )


@router.get("/oauth/{provider}/callback")
@limiter.limit("10/minute")
async def oauth_callback(
    request: Request,
    provider: str,
    code: str | None = None,
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="OAuth2 callback not configured yet",
    )
