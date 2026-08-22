import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def fetch_gnews(
    category: str | None = None,
    q: str = "",
    limit: int = 20,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.gnews_api_key:
        return {
            "articles": [],
            "provider": "stub",
            "note": "GNEWS_API_KEY not set",
        }

    # GNews: https://gnews.io/docs/v4
    query = q or category or "business"
    params = {
        "q": query,
        "lang": "en",
        "max": min(limit, 20),
        "apikey": settings.gnews_api_key,
    }
    url = "https://gnews.io/api/v4/search"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            if r.status_code >= 400:
                logger.warning("GNews %s: %s", r.status_code, r.text[:200])
                return {"articles": [], "provider": "gnews_error", "status": r.status_code}
            data = r.json()
            articles = []
            for a in data.get("articles") or []:
                articles.append(
                    {
                        "id": a.get("url") or a.get("title"),
                        "title": a.get("title"),
                        "summary": a.get("description"),
                        "url": a.get("url"),
                        "image": a.get("image"),
                        "source": (a.get("source") or {}).get("name"),
                        "published_at": a.get("publishedAt"),
                        "category": category or "general",
                    }
                )
            return {"articles": articles, "provider": "gnews"}
    except Exception as exc:
        logger.warning("GNews error: %s", exc)
        return {"articles": [], "provider": "gnews_error", "error": str(exc)}
