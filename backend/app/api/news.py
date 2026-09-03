"""
News API — sector chips + country bias + commerce tags + AI brief.
"""

from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services.ai_prompter import build_news_context, promote_news
from app.services.news_provider import fetch_gnews

router = APIRouter(prefix="/news", tags=["news"])

NEWS_CATEGORIES = [
    "agriculture",
    "fashion",
    "engineering",
    "local",
    "retail",
    "fuel",
    "health",
    "hospitality",
    "logistics",
    "business",
]


@router.get("/categories")
@limiter.limit("30/minute")
async def news_categories(request: Request):
    return {"categories": NEWS_CATEGORIES}


@router.get("")
@limiter.limit("30/minute")
async def news_list(
    request: Request,
    category: str | None = None,
    q: str = Query(""),
    country: str | None = None,
    community: str | None = None,
    city: str | None = None,
    region: str | None = None,
    limit: int = Query(20, ge=1, le=50),
):
    data = await fetch_gnews(
        category=category,
        q=q,
        limit=limit,
        country=country,
    )
    articles = data.get("articles") or []

    place_hint = ", ".join(p for p in [community, city, region, country] if p)
    ctx = build_news_context(
        category or "business",
        articles,
        place_hint=place_hint,
        related_query=q or "",
    )
    try:
        assistant = await promote_news(ctx)
    except Exception:
        assistant = {
            "message": f"{(category or 'business').title()}: {len(articles)} update(s).",
            "source": "template",
        }

    return {
        "category": category,
        "query": q,
        "country": data.get("country"),
        "count": len(articles),
        "articles": articles,
        "provider": data.get("provider"),
        "note": data.get("note"),
        "query_used": data.get("query_used"),
        "assistant": assistant,
    }
