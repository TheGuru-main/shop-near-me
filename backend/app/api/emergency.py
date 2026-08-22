from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db import get_db
from app.models.user import User
from app.services.search import haversine_km

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.get("/nearby")
@limiter.limit("60/minute")
async def nearby(
    request: Request,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    units = (
        db.query(User)
        .filter(
            User.role == "emergency",
            User.deleted_at.is_(None),
            User.is_active.is_(True),
        )
        .limit(200)
        .all()
    )
    out = []
    for u in units:
        km = None
        if (
            lat is not None
            and lng is not None
            and u.lat is not None
            and u.lng is not None
        ):
            km = round(haversine_km(lat, lng, float(u.lat), float(u.lng)), 2)
        out.append(
            {
                "card_type": "emergency",
                "id": str(u.id),
                "name": u.name,
                "phone": u.phone,
                "primary_location": u.primary_location,
                "city": u.city,
                "community": u.community,
                "live": u.live,
                "km": km,
            }
        )
    out.sort(key=lambda x: x["km"] if x["km"] is not None else 9999)
    return {"count": len(out[:limit]), "results": out[:limit]}
