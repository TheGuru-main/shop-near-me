"""
Search API — full wire-up:
  directives → tokenize → dictionaries.expand_synonyms
  → letter/word grids → crawler → location brotherhood
  → max_km default 2000 → word relevance first → location proxy → rank
  → GSG compass + crow-fly ETA stub (no OSRM)
  → persistent cache + optional AI promo
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db import get_db
from app.models.product import Product
from app.models.user import User
from app.services.crawler import crawl_score_product
from app.services.dictionaries import commerce_lookup, expand_synonyms
from app.services.directives import detect_directive, location_intent
from app.services.gsg_compass import proximity
from app.services.identity import public_identity
from app.services.location_brotherhood import (
    DEFAULT_MAX_KM,
    brotherhood_score,
    place_profile,
    within_max_km,
)
from app.services.search import haversine_km, lex_score
from app.services.search_cache import cache_get, cache_set
from app.services.token_grids import letter_score, tokenize, word_score

try:
    from app.services.crawler import crawl_entry
except Exception:
    crawl_entry = None  # type: ignore

try:
    from app.services.ai_prompter import build_search_context, promote_search
except Exception:
    build_search_context = None  # type: ignore
    promote_search = None  # type: ignore

router = APIRouter(prefix="/search", tags=["search"])


async def _expand_query_tokens(
    query: str, lang: str = "en"
) -> tuple[list[dict], list[str]]:
    tokens = tokenize(query, lang)
    extra: list[str] = []
    seen = {t["stem"] for t in tokens}
    for t in tokens[:6]:
        pack = await expand_synonyms(t["original"] or t["stem"])
        for syn in pack.get("synonyms") or []:
            st = (syn or "").strip().lower()
            if st and st not in seen:
                seen.add(st)
                extra.append(st)
                tokens.extend(tokenize(st, lang))
        canon = (pack.get("canonical") or "").strip().lower()
        if canon and canon not in seen:
            seen.add(canon)
            tokens.extend(tokenize(canon, lang))
    return tokens, extra


def _sort_key(item: dict) -> tuple:
    """Word relevance first, then brotherhood, then km, then total."""
    bd = item.get("score_breakdown") or {}
    wr = float(bd.get("word_relevance") or 0)
    bro = float(item.get("brotherhood_score") or 0)
    km = item.get("km")
    km = float(km) if km is not None else 9999.0
    total = float(item.get("score") or 0)
    return (-wr, -bro, km, -total)


def _cache_payload(
    kind: str,
    q: str,
    lat,
    lng,
    max_km,
    community,
    city,
    region,
    country,
    lang,
    limit,
    perishable=None,
    category=None,
) -> dict:
    return {
        "kind": kind,
        "q": q or "",
        "lat": lat,
        "lng": lng,
        "max_km": max_km,
        "community": community,
        "city": city,
        "region": region,
        "country": country,
        "lang": lang,
        "limit": limit,
        "perishable": perishable,
        "category": category,
    }


def _owner_proximity(lat, lng, owner_lat, owner_lng) -> dict:
    return proximity(
        lat,
        lng,
        float(owner_lat) if owner_lat is not None else None,
        float(owner_lng) if owner_lng is not None else None,
    )


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
    if max_km is None:
        max_km = DEFAULT_MAX_KM

    query = (q or "").strip()
    cache_key = _cache_payload(
        "products",
        query,
        lat,
        lng,
        max_km,
        community,
        city,
        region,
        country,
        lang,
        limit,
        perishable,
        category,
    )
    cached = cache_get(cache_key)
    if cached is not None:
        out = dict(cached)
        out["cache"] = True
        return out

    directive = detect_directive(query) if query else "general"
    loc_focus = location_intent(directive)

    tokens, syn_extra = (
        await _expand_query_tokens(query, lang) if query else ([], [])
    )
    commerce = commerce_lookup(query) if query else {}
    seeker = place_profile(community, city, region, country)
    entry = crawl_entry(query, lang) if (query and crawl_entry) else None

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
    scored: list[dict] = []

    for product, owner in pairs:
        try:
            rank = crawl_score_product(
                query or product.name, product, owner, lat, lng, lang=lang
            )
        except TypeError:
            rank = crawl_score_product(
                query or product.name, product, owner, lat, lng
            )

        prox = _owner_proximity(lat, lng, owner.lat, owner.lng)
        km = prox.get("km")
        if km is None:
            km = rank.get("km")
        if (
            km is None
            and lat is not None
            and lng is not None
            and owner.lat is not None
            and owner.lng is not None
        ):
            km = round(
                haversine_km(lat, lng, float(owner.lat), float(owner.lng)), 2
            )

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

        object_lex = float(rank.get("lex") or 0)
        if query:
            object_lex = max(
                object_lex,
                float(lex_score(query, product.name or "")),
                float(lex_score(query, product.category or "")) * 0.85,
            )
            for syn in syn_extra[:8]:
                object_lex = max(
                    object_lex, float(lex_score(syn, product.name or "")) * 0.9
                )

        w_score = word_score(tokens, doc, lang) if tokens else 0.0
        l_score = letter_score(tokens, doc, lang) if tokens else 0.0
        grid_lex = float(rank.get("grid_lex") or 0)
        place_lex = float(lex_score(query, place_blob)) if query else 0.0
        place_w = word_score(tokens, place_blob, lang) if tokens else 0.0

        word_relevance = (
            object_lex * 1.2 + w_score + l_score * 0.5 + grid_lex * 0.35
        )
        if loc_focus:
            word_relevance += place_lex * 0.3 + place_w * 0.2

        target = place_profile(
            owner.community, owner.city, owner.region, owner.country
        )
        bro, bro_tags = brotherhood_score(seeker, target)

        geo = float(rank.get("geo") or 0)
        if km is not None:
            geo = max(geo, max(0.0, 50.0 - min(float(km), 50.0)))
        hb = float(rank.get("hb") or 0)
        rel = float(rank.get("rel") or 0)

        total = (
            word_relevance * 1.5
            + bro * (1.4 if loc_focus else 1.2)
            + place_lex * 0.6
            + place_w * 0.3
            + geo
            + hb
            + rel
        )

        if query and word_relevance < 12 and bro < 8 and place_lex < 16:
            continue

        ident = public_identity(owner.name, owner.phone)
        scored.append(
            {
                "card_type": "search_object",
                "business_type": getattr(product, "business_type", None),
                "category": product.category,
                "role": owner.role,
                "directive": directive,
                "product": {
                    "id": str(product.id),
                    "name": product.name,
                    "price": product.price,
                    "currency": getattr(product, "currency", "NGN"),
                    "perishable": getattr(product, "perishable", False),
                    "available": product.available,
                    "image_url": getattr(product, "image_url", None),
                    "start_row": getattr(product, "start_row", None),
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
                    "L": ident.get("L"),
                    "S": ident.get("S"),
                    "place_boxes": target,
                },
                "km": km,
                "bearing_deg": prox.get("bearing_deg"),
                "compass": prox.get("compass"),
                "eta_min": prox.get("eta_min"),
                "eta_mode": prox.get("eta_mode"),
                "gsg_route": prox.get("gsg"),
                "max_km": max_km,
                "brotherhood_score": bro,
                "brotherhood_tags": bro_tags,
                "score": total,
                "score_breakdown": {
                    "word_relevance": word_relevance,
                    "object_lex": object_lex,
                    "word_score": w_score,
                    "letter_score": l_score,
                    "grid_lex": grid_lex,
                    "place_lex": place_lex,
                    "place_word": place_w,
                    "brotherhood": bro,
                    "geo": geo,
                    "hb": hb,
                    "rel": rel,
                    "crawler_score": rank.get("score"),
                    "crawler_start_row": rank.get("start_row"),
                },
            }
        )

    scored.sort(key=_sort_key)
    body = {
        "query": query,
        "lang": lang,
        "directive": directive,
        "location_focus": loc_focus,
        "max_km": max_km,
        "commerce_hint": commerce,
        "synonym_extra": syn_extra[:12],
        "seeker_place": seeker,
        "token_count": len(tokens),
        "crawl_entry": entry,
        "count": len(scored[:limit]),
        "results": scored[:limit],
        "cache": False,
    }

    if promote_search and build_search_context:
        ctx = build_search_context(
            query,
            scored[:limit],
            entry,
            seeker,
            max_km,
            directive=directive,
        )
        body["assistant"] = await promote_search(ctx)

    cache_set(cache_key, body, train=True)
    return body


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
    if max_km is None:
        max_km = DEFAULT_MAX_KM

    query = (q or "").strip()
    cache_key = _cache_payload(
        "merchants",
        query,
        lat,
        lng,
        max_km,
        community,
        city,
        region,
        country,
        lang,
        limit,
    )
    cached = cache_get(cache_key)
    if cached is not None:
        out = dict(cached)
        out["cache"] = True
        return out

    directive = detect_directive(query) if query else "general"
    loc_focus = location_intent(directive)
    tokens, syn_extra = (
        await _expand_query_tokens(query, lang) if query else ([], [])
    )
    seeker = place_profile(community, city, region, country)
    entry = crawl_entry(query, lang) if (query and crawl_entry) else None

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
    out: list[dict] = []

    for u in users:
        prox = _owner_proximity(lat, lng, u.lat, u.lng)
        km = prox.get("km")
        if not within_max_km(km, max_km):
            continue

        place_blob = " ".join(
            filter(
                None,
                [
                    u.community,
                    u.city,
                    u.region,
                    u.country,
                    u.primary_location,
                ],
            )
        )
        doc = f"{u.name or ''} {u.role or ''} {place_blob}"
        object_lex = float(lex_score(query, u.name or "")) if query else 40.0
        for syn in syn_extra[:8]:
            object_lex = max(
                object_lex, float(lex_score(syn, u.name or "")) * 0.9
            )
        w_score = word_score(tokens, doc, lang) if tokens else 0.0
        l_score = letter_score(tokens, doc, lang) if tokens else 0.0
        place_lex = float(lex_score(query, place_blob)) if query else 0.0
        word_relevance = object_lex * 1.2 + w_score + l_score * 0.5

        target = place_profile(u.community, u.city, u.region, u.country)
        bro, tags = brotherhood_score(seeker, target)
        geo = max(0.0, 50.0 - min(km, 50.0)) if km is not None else 0.0
        total = (
            word_relevance * 1.5
            + bro * (1.4 if loc_focus else 1.2)
            + place_lex
            + geo
        )

        if query and word_relevance < 12 and bro < 8 and place_lex < 16:
            continue

        ident = public_identity(u.name, u.phone)
        out.append(
            {
                "card_type": "listing",
                "role": u.role,
                "directive": directive,
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
                "bearing_deg": prox.get("bearing_deg"),
                "compass": prox.get("compass"),
                "eta_min": prox.get("eta_min"),
                "eta_mode": prox.get("eta_mode"),
                "gsg_route": prox.get("gsg"),
                "max_km": max_km,
                "brotherhood_score": bro,
                "brotherhood_tags": tags,
                "score": total,
                "score_breakdown": {
                    "word_relevance": word_relevance,
                    "object_lex": object_lex,
                    "word_score": w_score,
                    "letter_score": l_score,
                    "place_lex": place_lex,
                    "brotherhood": bro,
                    "geo": geo,
                },
                "start_row": ident["start_row"],
                "place_boxes": target,
            }
        )

    out.sort(key=_sort_key)
    limited = out[:limit]
    body = {
        "query": query,
        "lang": lang,
        "directive": directive,
        "location_focus": loc_focus,
        "max_km": max_km,
        "synonym_extra": syn_extra[:12],
        "seeker_place": seeker,
        "token_count": len(tokens),
        "crawl_entry": entry,
        "count": len(limited),
        "results": limited,
        "cache": False,
    }

    if promote_search and build_search_context:
        ctx = build_search_context(
            query,
            limited,
            entry,
            seeker,
            max_km,
            directive=directive,
        )
        body["assistant"] = await promote_search(ctx)

    cache_set(cache_key, body, train=True)
    return body
