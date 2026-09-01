"""
Place resolve: typed primary location + hierarchy → OSM Nominatim.
Wikipedia is NOT used. Root = Nominatim + optional local GEO hints.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# in-process cache for beta; swap for Redis/Neon table later
_CACHE: dict[str, dict[str, Any]] = {}


def _norm(s: str | None) -> str:
    return " ".join((s or "").strip().split())


def _cache_key(parts: list[str]) -> str:
    raw = "|".join(p.lower() for p in parts if p)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:40]


def build_query(
    *,
    primary_location: str = "",
    community: str = "",
    city: str = "",
    region: str = "",
    country: str = "",
) -> str:
    bits = [
        _norm(primary_location),
        _norm(community),
        _norm(city),
        _norm(region),
        _norm(country),
    ]
    # de-dupe adjacent repeats
    out: list[str] = []
    for b in bits:
        if b and (not out or out[-1].lower() != b.lower()):
            out.append(b)
    return ", ".join(out)


def _map_address(addr: dict[str, Any], fallback: dict[str, str]) -> dict[str, str]:
    """Map Nominatim address keys → SNM hierarchy fields."""
    region = (
        addr.get("state")
        or addr.get("region")
        or addr.get("state_district")
        or fallback.get("region")
        or ""
    )
    city = (
        addr.get("city")
        or addr.get("town")
        or addr.get("municipality")
        or addr.get("county")
        or fallback.get("city")
        or ""
    )
    community = (
        addr.get("suburb")
        or addr.get("neighbourhood")
        or addr.get("quarter")
        or addr.get("village")
        or addr.get("hamlet")
        or addr.get("city_district")
        or fallback.get("community")
        or ""
    )
    country = addr.get("country") or fallback.get("country") or ""
    return {
        "country": _norm(country),
        "region": _norm(region),
        "city": _norm(city),
        "community": _norm(community),
    }


def _confidence(item: dict[str, Any], q: str) -> float:
    # Nominatim importance is \~0..1; boost if query tokens appear in display_name
    base = float(item.get("importance") or 0.3)
    display = (item.get("display_name") or "").lower()
    tokens = [t for t in q.lower().replace(",", " ").split() if len(t) > 2]
    if not tokens:
        return min(0.95, max(0.05, base))
    hits = sum(1 for t in tokens if t in display)
    boost = 0.15 * (hits / max(len(tokens), 1))
    return min(0.98, max(0.05, base + boost))


async def nominatim_search(q: str, *, limit: int = 5, country_code: str | None = None) -> list[dict]:
    settings = get_settings()
    base = (getattr(settings, "nominatim_base", None) or "https://nominatim.openstreetmap.org").rstrip("/")
    ua = getattr(settings, "osm_user_agent", None) or "ShopNearMe/1.0 (geo-resolve)"
    params: dict[str, Any] = {
        "q": q,
        "format": "json",
        "addressdetails": 1,
        "limit": max(1, min(limit, 10)),
    }
    if country_code:
        params["countrycodes"] = country_code.lower()

    try:
        async with httpx.AsyncClient(timeout=12.0, headers={"User-Agent": ua}) as client:
            r = await client.get(f"{base}/search", params=params)
            if r.status_code != 200:
                logger.warning("nominatim status %s", r.status_code)
                return []
            data = r.json()
            return data if isinstance(data, list) else []
    except Exception as exc:
        logger.warning("nominatim error: %s", exc)
        return []


async def resolve_place(
    *,
    primary_location: str = "",
    community: str = "",
    city: str = "",
    region: str = "",
    country: str = "",
    country_code: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    primary_location = _norm(primary_location)
    community = _norm(community)
    city = _norm(city)
    region = _norm(region)
    country = _norm(country)

    q = build_query(
        primary_location=primary_location,
        community=community,
        city=city,
        region=region,
        country=country,
    )
    if not q:
        return {
            "ok": False,
            "query": "",
            "best": None,
            "candidates": [],
            "error": "empty_query",
        }

    key = _cache_key([q, country_code or ""])
    if key in _CACHE:
        cached = dict(_CACHE[key])
        cached["cached"] = True
        return cached

    fallback = {
        "country": country,
        "region": region,
        "city": city,
        "community": community,
    }

    rows = await nominatim_search(q, limit=limit, country_code=country_code)
    # retry without countrycodes if empty
    if not rows and country_code:
        rows = await nominatim_search(q, limit=limit, country_code=None)

    candidates: list[dict[str, Any]] = []
    for item in rows:
        try:
            lat = float(item.get("lat"))
            lng = float(item.get("lon"))
        except (TypeError, ValueError):
            continue
        addr = item.get("address") or {}
        mapped = _map_address(addr if isinstance(addr, dict) else {}, fallback)
        candidates.append(
            {
                "display_name": item.get("display_name") or q,
                "lat": lat,
                "lng": lng,
                "country": mapped["country"],
                "region": mapped["region"],
                "city": mapped["city"],
                "community": mapped["community"],
                "source": "nominatim",
                "osm_id": str(item.get("osm_id") or ""),
                "osm_type": str(item.get("osm_type") or ""),
                "confidence": _confidence(item, q),
            }
        )

    candidates.sort(key=lambda x: x.get("confidence") or 0, reverse=True)
    best = candidates[0] if candidates else None

    result = {
        "ok": bool(best),
        "query": q,
        "best": best,
        "candidates": candidates,
        "cached": False,
        "error": None if best else "not_found",
    }
    if best:
        _CACHE[key] = result
    return result
