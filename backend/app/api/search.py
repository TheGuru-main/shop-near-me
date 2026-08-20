from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db import get_db
from app.models.product import Product
from app.models.user import User
from app.services.crawler import crawl_score_product
from app.services.search import haversine_km, lex_score

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/products")
@limiter.limit("60/minute")
async def search_products(
    request: Request,
    q: str = Query(""),
    lat: float | None = None,
    lng: float | None = None,
    perishable: bool | None = None,
    category: str | None = None,
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (q or "").strip()
    rows = (
        db.query(Product, User)
        .join(User, User.id == Product.owner_id)
        .filter(
            Product.deleted_at.is_(None),
            Product.available.is_(True),
            User.deleted_at.is_(None),
        )
    )
    if perishable is True:
        rows = rows.filter(Product.perishable.is_(True))
    if category:
        rows = rows.filter(Product.category.ilike(f"%{category}%"))

    pairs = rows.limit(500).all()
    scored = []
    for product, owner in pairs:
        if query:
            if (
                lex_score(query, product.name) < 20
                and lex_score(query, product.category or "") < 20
            ):
                continue
        rank = crawl_score_product(
            query or product.name,
            product,
            owner,
            lat,
            lng,
        )
        if query and rank["lex"] < 20:
            continue
        scored.append(
            {
                "card_type": "search_object",
                "business_type": product.business_type,
                "category": product.category,
                "role": owner.role,
                "product": {
                    "id": str(product.id),
                    "name": product.name,
                    "price": product.price,
                    "currency": product.currency,
                    "perishable": product.perishable,
                    "available": product.available,
                    "image_url": product.image_url,
                    "start_row": product.start_row,
                },
                "seller": {
                    "id": str(owner.id),
                    "name": owner.name,
                    "role": owner.role,
                    "primary_location": owner.primary_location,
                    "city": owner.city,
                    "community": owner.community,
                    "live": owner.live,
                },
                "km": rank["km"],
                "score": rank["score"],
                "score_breakdown": {
                    "lex": rank["lex"],
                    "geo": rank["geo"],
                    "hb": rank["hb"],
                    "rel": rank["rel"],
                },
                "start_row": rank.get("start_row"),
            }
        )

    def sort_key(item):
        lex = item["score_breakdown"]["lex"]
        km = item["km"] if item["km"] is not None else 9999.0
        exact = 0 if lex >= 95 else 1
        return (exact, km, -item["score"])

    scored.sort(key=sort_key)
    return {"query": query, "count": len(scored[:limit]), "results": scored[:limit]}


@router.get("/merchants")
@limiter.limit("60/minute")
async def search_merchants(
    request: Request,
    q: str = Query("", min_length=1),
    lat: float | None = None,
    lng: float | None = None,
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(
            User.deleted_at.is_(None),
            User.role != "buyer",
            User.is_active.is_(True),
        )
        .limit(500)
        .all()
    )
    out = []
    for u in users:
        lex = lex_score(q, u.name)
        if lex < 25:
            continue
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
                "card_type": "listing",
                "role": u.role,
                "business_type": u.role,
                "id": str(u.id),
                "name": u.name,
                "primary_location": u.primary_location,
                "city": u.city,
                "community": u.community,
                "live": u.live,
                "km": km,
                "score": lex,
                "start_row": u.start_row,
            }
        )

    out.sort(
        key=lambda x: (
            0 if x["score"] >= 95 else 1,
            x["km"] if x["km"] is not None else 9999,
            -x["score"],
        )
    )
    return {"query": q, "count": len(out[:limit]), "results": out[:limit]}
