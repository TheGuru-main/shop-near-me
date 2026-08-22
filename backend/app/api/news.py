from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
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
    limit: int = Query(20, ge=1, le=50),
):
    data = await fetch_gnews(category=category, q=q, limit=limit)
    articles = data.get("articles") or []
    return {
        "category": category,
        "query": q,
        "count": len(articles),
        "articles": articles,
        "provider": data.get("provider"),
        "note": data.get("note"),
    }
