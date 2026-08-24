from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db import get_db
from app.models.product import Product
from app.models.user import User
from app.services.crawler import crawl_score_product
from app.services.dictionaries import commerce_lookup, expand_synonyms
from app.services.identity import public_identity
from app.services.location_brotherhood import (
    DEFAULT_MAX_KM,
    brotherhood_score,
    place_profile,
    within_max_km,
)
from app.services.search import lex_score
from app.services.token_grids import letter_score, tokenize, word_score

router = APIRouter(prefix="/search", tags=["search"])


async def _expand_query_tokens(query: str, lang: str = "en") -> tuple[list[dict], list[str]]:
    """Tokenize + dictionaries.expand_synonyms (Datamuse/fallback)."""
    tokens = tokenize(query, lang)
    extra_stems: list[str] = []
    seen = {t["stem"] for t in tokens}
    for t in tokens[:6]:
        pack = await expand_synonyms(t["original"] or t["stem"])
        for syn in pack.get("synonyms") or []:
            st = (syn or "").strip().lower()
            if st and st not in seen:
                seen.add(st)
                extra_stems.append(st)
                tokens.extend(tokenize(st, lang))
        canon = (pack.get("canonical") or "").strip().lower()
        if canon and canon not in seen:
            seen.add(canon)
            tokens.extend(tokenize(canon, lang))
    return tokens, extra_stems


@router.get("/products")
@limiter.limit("60/minute")
async def search_products(
    request: Request,
    q: str = Query(""),
    lat: float | None = None,
    lng: float | None = None,
    max_km: float | None = Query(DEFAULT_MAX_KM, ge=0, le=20000),
    community: str | None = None,
    city: str | None = None,
    region: str | None = None,
    country: str | None = None,
    lang: str = Query("en"),
    perishable: bool | None = None,
    category: str | None = None,
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (q or "").strip()
    tokens, syn_extra = await _expand_query_tokens(query, lang) if query else ([], [])
    commerce = commerce_lookup(query) if query else {}
    seeker = place_profile(community, city, region, country)

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
        rank = crawl_score_product(
            query or product.name, product, owner, lat, lng
        )
        km = rank.get("km")
        if not within_max_km(km, max_km):
            continue

        place_blob = " ".join(
            filter(
                None,
                [
                    owner.community,
                    owner.city,
                    owner.region,
                    owner.country,
                    owner.primary_location,
                ],
            )
        )
        doc = f"{product.name} {product.category or ''} {owner.name or ''} {place_blob}"

        object_lex = rank.get("lex") or lex_score(query, product.name)
        if query:
            object_lex = max(
                float(object_lex),
                float(lex_score(query, product.name)),
                float(lex_score(query, product.category or "")) * 0.85,
            )
            for syn in syn_extra[:8]:
                object_lex = max(object_lex, lex_score(syn, product.name) * 0.9)

        w_score = word_score(tokens, doc, lang) if tokens else 0.0
        l_score = letter_score(tokens, doc, lang) if tokens else 0.0
        place_lex = lex_score(query, place_blob) if query else 0.0

        target = place_profile(
            owner.community, owner.city, owner.region, owner.country
        )
        bro, bro_tags = brotherhood_score(seeker, target)

        geo = float(rank.get("geo") or 0)
        hb = float(rank.get("hb") or 0)
        rel = float(rank.get("rel") or 0)

        total = (
            float(object_lex) * 1.3
            + w_score
            + l_score * 0.5
            + bro
            + place_lex * 0.7
            + geo
            + hb
            + rel
        )

        if query and object_lex < 18 and bro < 8 and w_score < 8 and place_lex < 18:
            continue

        ident = public_identity(owner.name, owner.phone)
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
                    "uid": ident["uid"],
                    "identity_tag": ident["identity_tag"],
                    "name": owner.name,
                    "role": owner.role,
                    "primary_location": owner.primary_location,
                    "community": owner.community,
                    "city": owner.city,
                    "region": owner.region,
                    "country": owner.country,
                    "live": owner.live,
                    "start_row": ident["start_row"],
                    "place_boxes": target,
                },
                "km": km,
                "max_km": max_km,
                "brotherhood_score": bro,
                "brotherhood_tags": bro_tags,
                "score": total,
                "score_breakdown": {
                    "object_lex": object_lex,
                    "word_score": w_score,
                    "letter_score": l_score,
                    "place_lex": place_lex,
                    "brotherhood": bro,
                    "geo": geo,
                    "hb": hb,
                    "rel": rel,
                    "crawler_score": rank.get("score"),
                },
            }
        )

    scored.sort(
        key=lambda item: (
            0 if float(item["score_breakdown"]["object_lex"]) >= 90 else 1,
            -item["brotherhood_score"],
            item["km"] if item["km"] is not None else 9999.0,
            -item["score"],
        )
    )
    return {
        "query": query,
        "lang": lang,
        "max_km": max_km,
        "commerce_hint": commerce,
        "synonym_extra": syn_extra[:12],
        "seeker_place": seeker,
        "count": len(scored[:limit]),
        "results": scored[:limit],
    }


@router.get("/merchants")
@limiter.limit("60/minute")
async def search_merchants(
    request: Request,
    q: str = Query(""),
    lat: float | None = None,
    lng: float | None = None,
    max_km: float | None = Query(DEFAULT_MAX_KM, ge=0, le=20000),
    community: str | None = None,
    city: str | None = None,
    region: str | None = None,
    country: str | None = None,
    lang: str = Query("en"),
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (q or "").strip()
    tokens, syn_extra = await _expand_query_tokens(query, lang) if query else ([], [])
    seeker = place_profile(community, city, region, country)

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
        km = None
        if lat is not None and lng is not None and u.lat is not None and u.lng is not None:
            from app.services.search import haversine_km

            km = round(haversine_km(lat, lng, float(u.lat), float(u.lng)), 2)
        if not within_max_km(km, max_km):
            continue

        place_blob = " ".join(
            filter(None, [u.community, u.city, u.region, u.country, u.primary_location])
        )
        doc = f"{u.name or ''} {u.role or ''} {place_blob}"
        object_lex = lex_score(query, u.name or "") if query else 40.0
        for syn in syn_extra[:8]:
            object_lex = max(object_lex, lex_score(syn, u.name or "") * 0.9)
        w_score = word_score(tokens, doc, lang) if tokens else 0.0
        l_score = letter_score(tokens, doc, lang) if tokens else 0.0
        place_lex = lex_score(query, place_blob) if query else 0.0
        target = place_profile(u.community, u.city, u.region, u.country)
        bro, tags = brotherhood_score(seeker, target)
        total = object_lex * 1.2 + w_score + l_score * 0.5 + bro + place_lex

        if query and object_lex < 15 and bro < 8 and w_score < 8 and place_lex < 18:
            continue

        ident = public_identity(u.name, u.phone)
        out.append(
            {
                "card_type": "listing",
                "role": u.role,
                "uid": ident["uid"],
                "identity_tag": ident["identity_tag"],
                "name": u.name,
                "primary_location": u.primary_location,
                "community": u.community,
                "city": u.city,
                "region": u.region,
                "country": u.country,
                "live": u.live,
                "km": km,
                "max_km": max_km,
                "brotherhood_score": bro,
                "brotherhood_tags": tags,
                "score": total,
                "start_row": ident["start_row"],
                "place_boxes": target,
            }
        )

    out.sort(
        key=lambda x: (
            -x["brotherhood_score"],
            x["km"] if x["km"] is not None else 9999.0,
            -x["score"],
        )
    )
    return {
        "query": query,
        "max_km": max_km,
        "synonym_extra": syn_extra[:12],
        "seeker_place": seeker,
        "count": len(out[:limit]),
        "results": out[:limit],
    }

