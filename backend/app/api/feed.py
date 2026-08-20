from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.product import Product
from app.models.user import User
from app.services.heartbeat import heartbeat_score
from app.services.priority import front_row_ids
from app.services.search import haversine_km, lex_score

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("")
@limiter.limit("60/minute")
async def home_feed(
    request: Request,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    # Optional auth: try user from bearer; if 401 dependency fails, use optional pattern
    prefs = []
    city = ""
    community = ""
    if user:
        prefs = user.prefs or []
        if isinstance(prefs, dict):
            prefs = prefs.get("items") or []
        city = user.city or ""
        community = user.community or ""

    priority_ids = set(front_row_ids(city, community)) if city else set()

    pairs = (
        db.query(Product, User)
        .join(User, User.id == Product.owner_id)
        .filter(
            Product.deleted_at.is_(None),
            Product.available.is_(True),
            User.deleted_at.is_(None),
            User.role != "buyer",
        )
        .limit(400)
        .all()
    )

    results = []
    for product, owner in pairs:
        pref_hit = 0.0
        for p in prefs:
            if lex_score(str(p), product.name) >= 50 or lex_score(str(p), product.category or "") >= 50:
                pref_hit = 40.0
                break
        hb = heartbeat_score(owner.hb_at) if owner.role != "buyer" else 0.0
        km = None
        geo = 0.0
        if lat is not None and lng is not None and owner.lat is not None and owner.lng is not None:
            km = round(haversine_km(lat, lng, float(owner.lat), float(owner.lng)), 2)
            geo = max(0.0, 30.0 - min(km, 30.0))
        front = 100.0 if str(owner.id) in priority_ids else 0.0
        score = pref_hit + hb * 0.4 + geo + front
        results.append(
            {
                "card_type": "search_object",
                "role": owner.role,
                "business_type": product.business_type,
                "category": product.category,
                "product": {
                    "id": str(product.id),
                    "name": product.name,
                    "price": product.price,
                    "currency": product.currency,
                    "perishable": product.perishable,
                    "image_url": product.image_url,
                },
                "seller": {
                    "id": str(owner.id),
                    "name": owner.name,
                    "primary_location": owner.primary_location,
                    "city": owner.city,
                    "live": owner.live,
                },
                "km": km,
                "score": round(score, 2),
                "priority_front_row": front > 0,
            }
        )

    results.sort(key=lambda x: (-x["score"], x["km"] if x["km"] is not None else 9999))
    return {"count": len(results[:limit]), "results": results[:limit]}
