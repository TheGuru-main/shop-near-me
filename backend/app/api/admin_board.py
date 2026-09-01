"""
Admin board: downloads, subscribers, shop pins + heatmap, admin messages.
Map cells use same GSG helper as user-facing map.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.premium import PremiumSubscription
from app.models.user import User
from app.services.gsg import gsg_at
from app.services.search_cache import cache_stats

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User) -> None:
    settings = get_settings()
    admin_uid = "".join(
        ch for ch in str(getattr(settings, "admin_phone_uid", "550198550199")) if ch.isdigit()
    )
    phone = "".join(ch for ch in str(user.phone or "") if ch.isdigit())
    # Admin = locked phone UID or role flag
    if phone.endswith(admin_uid) or phone == admin_uid or getattr(user, "role", "") == "admin":
        return
    if getattr(user, "is_admin", False):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


@router.get("/board")
@limiter.limit("30/minute")
async def admin_board(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    total_users = db.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0
    # downloads proxy until store analytics exist
    total_downloads = total_users

    active_subs = (
        db.query(func.count(PremiumSubscription.id))
        .filter(
            PremiumSubscription.status == "active",
        )
        .scalar()
    )
    if active_subs is None:
        active_subs = 0

    shops = (
        db.query(User)
        .filter(
            User.deleted_at.is_(None),
            User.role != "buyer",
            User.is_active.is_(True),
        )
        .limit(2000)
        .all()
    )

    pins = []
    heat = {}  # gsg letter+row bucket → count
    for s in shops:
        lat, lng = getattr(s, "lat", None), getattr(s, "lng", None)
        gsg = None
        if lat is not None and lng is not None:
            gsg = gsg_at(float(lat), float(lng))
            bucket = f"{gsg['letter']}:{gsg['L'] // 10}"
            heat[bucket] = heat.get(bucket, 0) + 1
        pins.append({
            "id": str(s.id),
            "name": s.name,
            "role": s.role,
            "primary_location": s.primary_location,
            "community": s.community,
            "city": s.city,
            "country": s.country,
            "lat": lat,
            "lng": lng,
            "live": s.live,
            "gsg": gsg,
        })

    heatmap = [
        {"bucket": k, "weight": v}
        for k, v in sorted(heat.items(), key=lambda x: -x[1])[:200]
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "total_downloads": total_downloads,
            "total_users": total_users,
            "total_subscribed": int(active_subs),
            "active_shops": len(shops),
            "search_cache": cache_stats(),
        },
        "map": {
            "type": "gsg",
            "pins": pins,
            "heatmap": heatmap,
        },
    }


@router.get("/messages")
@limiter.limit("30/minute")
async def admin_messages(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """Admin inbox — threads that involve admin contact box when messages table exists."""
    _require_admin(user)
    try:
        from app.models.message import Message, MessageThread
    except Exception:
        return {"count": 0, "items": [], "note": "messages models not loaded"}

    # Latest threads (admin review queue)
    threads = (
        db.query(MessageThread)
        .order_by(MessageThread.updated_at.desc())
        .limit(limit)
        .all()
    )
    items = []
    for t in threads:
        items.append({
            "thread_id": str(t.id),
            "subject": getattr(t, "subject", None),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return {"count": len(items), "items": items}
