"""
Admin board: downloads, subscribers, full user registry,
all-role pins (role colours), GSG heatmap, admin messages,
premium payment queue + activate.

Admin identity (deterministic):
  ADMIN_UID  = 550198550199
  ADMIN_NAME = shop_near_me_admin
  password   = set once on the users row
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.premium import PremiumSubscription
from app.models.user import User
from app.services.gsg import gsg_at
from app.services.search_cache import cache_stats

# Prefer shared admin_box constants when present
try:
    from app.services.admin_box import (
        ADMIN_UID as _BOX_UID,
        ADMIN_NAME as _BOX_NAME,
        ADMIN_START_ROW as _BOX_START_ROW,
        admin_public as _admin_public,
    )
except Exception:  # pragma: no cover
    _BOX_UID = "550198550199"
    _BOX_NAME = "shop_near_me_admin"
    _BOX_START_ROW = None
    _admin_public = None

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_UID = "".join(ch for ch in str(_BOX_UID) if ch.isdigit()) or "550198550199"
ADMIN_NAME = str(_BOX_NAME or "shop_near_me_admin")
ADMIN_START_ROW = _BOX_START_ROW

ROLE_COLORS = {
    "buyer": "#16a34a",
    "merchant": "#2563eb",
    "service": "#4f46e5",
    "driver": "#9333ea",
    "logistics": "#9333ea",
    "emergency": "#dc2626",
    "admin": "#ca8a04",
}


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _admin_uid_digits() -> str:
    settings = get_settings()
    from_settings = _digits(getattr(settings, "admin_phone_uid", "") or "")
    return from_settings or ADMIN_UID


def _is_admin_user(user: User) -> bool:
    if not user:
        return False
    if (getattr(user, "role", "") or "").lower() == "admin":
        return True
    if getattr(user, "is_admin", False):
        return True
    phone = _digits(user.phone)
    uid = _admin_uid_digits()
    return bool(uid) and (phone == uid or phone.endswith(uid))


def _require_admin(user: User) -> None:
    if _is_admin_user(user):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


def _normalize_phone(phone: str) -> str:
    """Normal E.164-ish; admin UID stays digit string."""
    s = (phone or "").strip().replace(" ", "")
    if not s:
        return ""
    d = _digits(s)
    if d == _admin_uid_digits():
        return d  # 550198550199
    if s.startswith("00"):
        s = "+" + s[2:]
        d = _digits(s)
    if s.startswith("+"):
        return "+" + d
    if d.startswith("234"):
        return "+" + d
    if len(d) >= 10:
        return "+" + d
    return s


def _role_color(role: str | None) -> str:
    r = (role or "buyer").lower().strip()
    return ROLE_COLORS.get(r, "#6b7280")


def _user_row(u: User) -> dict[str, Any]:
    lat, lng = getattr(u, "lat", None), getattr(u, "lng", None)
    gsg = None
    if lat is not None and lng is not None:
        try:
            gsg = gsg_at(float(lat), float(lng))
        except Exception:
            gsg = None
    role = (u.role or "buyer").lower().strip()
    return {
        "id": str(u.id),
        "phone": u.phone,
        "name": u.name,
        "role": role,
        "color": _role_color(role),
        "primary_location": u.primary_location,
        "community": u.community,
        "city": u.city,
        "region": getattr(u, "region", None),
        "country": u.country,
        "continent_id": getattr(u, "continent_id", None),
        "continent_name": getattr(u, "continent_name", None),
        "lat": lat,
        "lng": lng,
        "live": bool(getattr(u, "live", False)),
        "hb_at": u.hb_at.isoformat() if getattr(u, "hb_at", None) else None,
        "start_row": getattr(u, "start_row", None),
        "is_active": bool(getattr(u, "is_active", True)),
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "gsg": gsg,
    }


def _pin_from_user(u: User) -> dict[str, Any] | None:
    lat, lng = getattr(u, "lat", None), getattr(u, "lng", None)
    if lat is None or lng is None:
        return None
    try:
        gsg = gsg_at(float(lat), float(lng))
    except Exception:
        gsg = None
    role = (u.role or "buyer").lower().strip()
    return {
        "id": str(u.id),
        "phone": u.phone,
        "name": u.name,
        "role": role,
        "color": _role_color(role),
        "primary_location": u.primary_location,
        "community": u.community,
        "city": u.city,
        "country": u.country,
        "lat": float(lat),
        "lng": float(lng),
        "live": bool(getattr(u, "live", False)),
        "gsg": gsg,
    }


def _resolve_admin_user(db: Session) -> User | None:
    """Find admin by ADMIN_UID digits, then role=admin."""
    uid = _admin_uid_digits()
    rows = (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .limit(5000)
        .all()
    )
    for u in rows:
        ph = _digits(u.phone)
        if ph == uid or (uid and ph.endswith(uid)):
            return u
    for u in rows:
        if (u.role or "").lower() == "admin":
            return u
    return None


def _box_payload(db: Session) -> dict[str, Any]:
    if _admin_public:
        try:
            base = dict(_admin_public())
        except Exception:
            base = {}
    else:
        base = {}
    admin_user = _resolve_admin_user(db)
    return {
        "uid": base.get("uid") or ADMIN_UID,
        "admin_uid": base.get("uid") or ADMIN_UID,
        "name": base.get("name") or (admin_user.name if admin_user else ADMIN_NAME),
        "admin_name": base.get("name") or (admin_user.name if admin_user else ADMIN_NAME),
        "admin_phone": admin_user.phone if admin_user else ADMIN_UID,
        "start_row": base.get("start_row")
        if base.get("start_row") is not None
        else (
            getattr(admin_user, "start_row", None)
            if admin_user
            else ADMIN_START_ROW
        ),
        "role_colors": ROLE_COLORS,
        "registered": admin_user is not None,
    }


class AdminMessageBody(BaseModel):
    body: str = Field(min_length=1)
    context: str = "admin"


class PremiumActivateIn(BaseModel):
    user_phone: str = Field(min_length=10, max_length=32)
    plan_code: str = Field(min_length=1, max_length=64)
    active: bool = True
    payment_ref: str | None = None
    note: str | None = None


# ---------- box (public meta) ----------


@router.get("/box")
@limiter.limit("30/minute")
async def admin_box(request: Request, db: Session = Depends(get_db)):
    """Admin contact meta for clients — UID + name shop_near_me_admin."""
    return _box_payload(db)


# ---------- board ----------


@router.get("/board")
@limiter.limit("30/minute")
async def admin_board(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    total_users = (
        db.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0
    )
    total_downloads = total_users

    by_role_rows = (
        db.query(User.role, func.count(User.id))
        .filter(User.deleted_at.is_(None))
        .group_by(User.role)
        .all()
    )
    by_role = {str(r or "unknown"): int(c) for r, c in by_role_rows}

    active_subs = (
        db.query(func.count(PremiumSubscription.id))
        .filter(PremiumSubscription.status == "active")
        .scalar()
    ) or 0

    pending_subs = (
        db.query(func.count(PremiumSubscription.id))
        .filter(
            PremiumSubscription.status.in_(
                ("pending", "pending_payment", "pending_verification")
            )
        )
        .scalar()
    ) or 0

    everyone = (
        db.query(User)
        .filter(User.deleted_at.is_(None), User.is_active.is_(True))
        .limit(3000)
        .all()
    )
    shops = [u for u in everyone if (u.role or "").lower() != "buyer"]

    pins: list[dict[str, Any]] = []
    heat: dict[str, int] = {}
    for s in everyone:
        pin = _pin_from_user(s)
        if not pin:
            continue
        pins.append(pin)
        gsg = pin.get("gsg") or {}
        letter, L = gsg.get("letter"), gsg.get("L")
        if letter is not None and L is not None:
            try:
                bucket = f"{letter}:{int(L) // 10}"
                heat[bucket] = heat.get(bucket, 0) + 1
            except Exception:
                pass

    heatmap = [
        {"bucket": k, "weight": v}
        for k, v in sorted(heat.items(), key=lambda x: -x[1])[:200]
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "admin": _box_payload(db),
        "role_colors": ROLE_COLORS,
        "stats": {
            "total_downloads": total_downloads,
            "total_users": total_users,
            "total_subscribed": int(active_subs),
            "pending_subscribed": int(pending_subs),
            "active_shops": len(shops),
            "users_with_geo": len(pins),
            "by_role": by_role,
            "search_cache": cache_stats(),
        },
        "map": {"type": "gsg", "pins": pins, "heatmap": heatmap},
    }


# ---------- users ----------


@router.get("/users")
@limiter.limit("30/minute")
async def admin_users(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    role: str | None = None,
    q: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    _require_admin(user)
    query = db.query(User).filter(User.deleted_at.is_(None))
    if role:
        query = query.filter(User.role == role.lower().strip())
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(like),
                User.phone.ilike(like),
                User.primary_location.ilike(like),
                User.city.ilike(like),
                User.community.ilike(like),
            )
        )
    total = query.count()
    rows = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "count": total,
        "offset": offset,
        "limit": limit,
        "role_colors": ROLE_COLORS,
        "users": [_user_row(u) for u in rows],
    }


@router.get("/users/map")
@limiter.limit("30/minute")
async def admin_users_map(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    role: str | None = None,
):
    _require_admin(user)
    query = db.query(User).filter(
        User.deleted_at.is_(None),
        User.lat.isnot(None),
        User.lng.isnot(None),
    )
    if role:
        query = query.filter(User.role == role.lower().strip())
    pins = []
    for u in query.limit(3000).all():
        p = _pin_from_user(u)
        if p:
            pins.append(p)
    return {"count": len(pins), "role_colors": ROLE_COLORS, "pins": pins}


@router.get("/users/{user_id}")
@limiter.limit("30/minute")
async def admin_user_detail(
    request: Request,
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    u = db.get(User, user_id)
    if not u or u.deleted_at is not None:
        raise HTTPException(status_code=404, detail="User not found")
    row = _user_row(u)
    row["prefs"] = u.prefs
    row["ladder"] = getattr(u, "ladder", None)
    row["gsg_profile"] = getattr(u, "gsg", None)
    return row


# ---------- messages ----------


@router.get("/messages")
@limiter.limit("30/minute")
async def admin_messages(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    _require_admin(user)
    try:
        from app.models.message import Message, MessageThread
    except Exception:
        return {"count": 0, "items": [], "note": "messages models not loaded"}

    admin_user = _resolve_admin_user(db)
    q = db.query(MessageThread)
    if admin_user:
        q = q.filter(
            or_(
                MessageThread.participant_a == admin_user.id,
                MessageThread.participant_b == admin_user.id,
            )
        )
    threads = q.order_by(MessageThread.updated_at.desc()).limit(limit).all()

    items = []
    for t in threads:
        last = (
            db.query(Message)
            .filter(Message.thread_id == t.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        if last and getattr(last, "deleted_at", None) is not None:
            continue
        body = last.body if last else None
        items.append(
            {
                "thread_id": str(t.id),
                "subject": getattr(t, "subject", None),
                "context_type": getattr(t, "context_type", None),
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "last_body": body,
                "last_from_phone": getattr(last, "from_phone", None) if last else None,
                "is_premium_payment": bool(
                    body and str(body).startswith("[PREMIUM_PAYMENT]")
                ),
                "created_at": last.created_at.isoformat()
                if last and last.created_at
                else None,
            }
        )
    return {"count": len(items), "items": items}


@router.post("/message")
@limiter.limit("20/minute")
async def message_admin(
    request: Request,
    body: AdminMessageBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Any logged-in user → admin mailbox (ADMIN_UID)."""
    try:
        from app.models.message import Message, MessageThread
    except Exception:
        raise HTTPException(status_code=501, detail="messages models not loaded")

    admin_user = _resolve_admin_user(db)
    if not admin_user:
        raise HTTPException(
            status_code=404,
            detail=(
                "Admin user not registered. Seed users row: "
                f"phone={ADMIN_UID}, name={ADMIN_NAME}, role=admin"
            ),
        )
    if admin_user.id == user.id:
        raise HTTPException(status_code=400, detail="Invalid admin sink")

    a, b = (
        (user.id, admin_user.id)
        if str(user.id) < str(admin_user.id)
        else (admin_user.id, user.id)
    )
    thread = (
        db.query(MessageThread)
        .filter(
            MessageThread.participant_a == a,
            MessageThread.participant_b == b,
        )
        .first()
    )
    if not thread:
        thread = MessageThread(
            id=uuid.uuid4(),
            participant_a=a,
            participant_b=b,
            context_type=body.context or "admin",
        )
        db.add(thread)
        db.flush()

    msg = Message(
        id=uuid.uuid4(),
        thread_id=thread.id,
        from_user_id=user.id,
        to_user_id=admin_user.id,
        body=body.body,
        context_type=body.context or "admin",
    )
    for attr, val in (
        ("msg_type", "text"),
        ("from_phone", user.phone),
        ("to_phone", admin_user.phone),
        ("from_start_row", getattr(user, "start_row", None)),
        (
            "to_start_row",
            getattr(admin_user, "start_row", None) or ADMIN_START_ROW,
        ),
    ):
        if hasattr(msg, attr):
            try:
                setattr(msg, attr, val)
            except Exception:
                pass

    thread.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.add(thread)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "thread_id": str(thread.id),
        "message_id": str(msg.id),
        "to_admin_uid": ADMIN_UID,
        "to_admin_phone": admin_user.phone,
        "to_admin_name": admin_user.name or ADMIN_NAME,
    }


# ---------- premium ----------


@router.get("/premium/pending")
@limiter.limit("30/minute")
async def premium_pending(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    rows = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.status.in_(
                ("pending", "pending_payment", "pending_verification")
            )
        )
        .order_by(PremiumSubscription.created_at.desc())
        .limit(100)
        .all()
    )
    items = []
    for r in rows:
        items.append(
            {
                "id": str(r.id),
                "user_id": str(r.user_id) if getattr(r, "user_id", None) else None,
                "plan_code": getattr(r, "plan_code", None)
                or getattr(r, "code", None),
                "status": r.status,
                "payment_ref": getattr(r, "payment_ref", None),
                "created_at": r.created_at.isoformat()
                if getattr(r, "created_at", None)
                else None,
            }
        )
    inbox = await admin_messages(request, user=user, db=db, limit=80)
    pay_msgs = [m for m in inbox.get("items") or [] if m.get("is_premium_payment")]
    return {
        "subscriptions": items,
        "payment_messages": pay_msgs,
        "count": len(items) + len(pay_msgs),
    }


@router.post("/premium/activate")
@limiter.limit("20/minute")
async def premium_activate(
    request: Request,
    body: PremiumActivateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    phone = _normalize_phone(body.user_phone)
    target = (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .filter(
            or_(
                User.phone == phone,
                User.phone == body.user_phone.strip(),
            )
        )
        .first()
    )
    if not target:
        want = _digits(body.user_phone)
        for u in db.query(User).filter(User.deleted_at.is_(None)).limit(5000):
            if _digits(u.phone).endswith(want[-10:]):
                target = u
                break
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    plan_code = body.plan_code.strip()
    candidates = (
        db.query(PremiumSubscription)
        .filter(PremiumSubscription.user_id == target.id)
        .all()
    )
    found = None
    for r in candidates:
        code = getattr(r, "plan_code", None) or getattr(r, "code", None)
        if code == plan_code:
            found = r
            break
    if found is None and candidates:
        found = candidates[0]

    now = datetime.now(timezone.utc)
    if found is None:
        kwargs: dict[str, Any] = {
            "id": uuid.uuid4(),
            "user_id": target.id,
            "status": "active" if body.active else "cancelled",
        }
        if hasattr(PremiumSubscription, "plan_code"):
            kwargs["plan_code"] = plan_code
        elif hasattr(PremiumSubscription, "code"):
            kwargs["code"] = plan_code
        if hasattr(PremiumSubscription, "payment_ref") and body.payment_ref:
            kwargs["payment_ref"] = body.payment_ref
        found = PremiumSubscription(**kwargs)
        db.add(found)
    else:
        found.status = "active" if body.active else "cancelled"
        if hasattr(found, "payment_ref") and body.payment_ref:
            found.payment_ref = body.payment_ref
        if hasattr(found, "updated_at"):
            found.updated_at = now
        db.add(found)

    db.commit()
    return {
        "ok": True,
        "user_phone": target.phone,
        "user_name": target.name,
        "plan_code": plan_code,
        "status": "active" if body.active else "cancelled",
    }