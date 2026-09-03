"""
News provider — GNews primary + commerce tagging + optional country bias.
Does not invent a second FastAPI app.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Sector chip → search query enrichment (GNews uses free-text q)
SECTOR_QUERY: dict[str, str] = {
    "agriculture": "agriculture farming food produce",
    "fashion": "fashion retail clothing textile",
    "engineering": "engineering construction technology industry",
    "local": "local business community market",
    "retail": "retail shop consumer goods supermarket",
    "fuel": "fuel energy oil gas petrol",
    "health": "health hospital pharmacy medical",
    "hospitality": "hotel restaurant hospitality tourism",
    "logistics": "logistics shipping delivery transport freight",
    "business": "business commerce trade economy",
}

# ISO2 allowed for country bias (Africa-first hub + major markets)
COMMERCE_COUNTRY_ISO: set[str] = {
    # Africa (sample core + extended)
    "NG", "ZA", "KE", "EG", "GH", "MA", "DZ", "TN", "CI", "SN",
    "UG", "TZ", "ET", "AO", "CM", "ZM", "ZW", "RW", "MU", "BW",
    "NA", "SD", "LY", "CD", "CG", "GA", "GN", "ML", "BF", "NE",
    "TG", "BJ", "SL", "LR", "GM", "MW", "MZ", "BI", "SO", "SS",
    # Europe / Americas / Asia / Oceania hubs
    "GB", "DE", "FR", "IT", "ES", "NL", "US", "CA", "BR", "MX",
    "CN", "JP", "IN", "KR", "SG", "AE", "SA", "AU", "NZ",
}


def normalize_country(code: str | None) -> str | None:
    if not code:
        return None
    c = str(code).strip().upper()
    if len(c) != 2:
        return None
    if c in COMMERCE_COUNTRY_ISO:
        return c
    # still pass through valid-looking ISO2 for GNews
    if c.isalpha():
        return c
    return None


def categorize_commerce(title: str, description: str) -> list[str]:
    """Tag articles for commerce UI badges (secondary to sector chip)."""
    tags: list[str] = []
    text = f"{title} {description}".lower()

    if any(
        k in text
        for k in (
            "fintech",
            "payment",
            "cbn",
            "naira",
            "paystack",
            "flutterwave",
            "crypto",
            "mobile money",
        )
    ):
        tags.append("Fintech & Payments")
    if any(
        k in text
        for k in (
            "tariff",
            "customs",
            "import",
            "export",
            "regulation",
            "ban",
            "tax",
            "duty",
        )
    ):
        tags.append("Trade & Regulations")
    if any(
        k in text
        for k in (
            "shipping",
            "delivery",
            "port",
            "logistics",
            "fuel",
            "aviation",
            "freight",
            "warehouse",
        )
    ):
        tags.append("Logistics & Supply Chain")
    if any(
        k in text
        for k in (
            "fx",
            "forex",
            "dollar",
            "exchange rate",
            "market",
            "inflation",
            "stock",
        )
    ):
        tags.append("Market & FX")

    return tags if tags else ["General Commerce"]


def _build_query(category: str | None, q: str) -> str:
    q = (q or "").strip()
    if q:
        return q
    if category and category in SECTOR_QUERY:
        return SECTOR_QUERY[category]
    if category:
        return category
    return "business commerce"


async def fetch_gnews(
    category: str | None = None,
    q: str = "",
    limit: int = 20,
    country: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    if not getattr(settings, "gnews_api_key", None):
        return {
            "articles": [],
            "provider": "stub",
            "note": "GNEWS_API_KEY not set",
            "country": normalize_country(country),
        }

    query = _build_query(category, q)
    iso = normalize_country(country)

    params: dict[str, Any] = {
        "q": query,
        "lang": "en",
        "max": min(int(limit or 20), 20),
        "apikey": settings.gnews_api_key,
    }
    # GNews country filter (2-letter). Omit if unknown.
    if iso:
        params["country"] = iso.lower()

    url = "https://gnews.io/api/v4/search"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            if r.status_code >= 400:
                logger.warning("GNews %s: %s", r.status_code, r.text[:200])
                return {
                    "articles": [],
                    "provider": "gnews_error",
                    "status": r.status_code,
                    "country": iso,
                }
            data = r.json()
            articles: list[dict[str, Any]] = []
            for a in data.get("articles") or []:
                title = a.get("title") or ""
                desc = a.get("description") or ""
                commerce = categorize_commerce(title, desc)
                articles.append(
                    {
                        "id": a.get("url") or title,
                        "title": title,
                        "summary": desc,
                        "url": a.get("url"),
                        "image": a.get("image"),
                        "source": (a.get("source") or {}).get("name"),
                        "published_at": a.get("publishedAt"),
                        "category": category or "business",
                        "categories": commerce,
                        "country": iso,
                    }
                )
            return {
                "articles": articles,
                "provider": "gnews",
                "country": iso,
                "query_used": query,
            }
    except Exception as exc:
        logger.warning("GNews error: %s", exc)
        return {
            "articles": [],
            "provider": "gnews_error",
            "error": str(exc),
            "country": iso,
        }
