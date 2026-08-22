import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def nominatim_search(q: str, limit: int = 5) -> list[dict[str, Any]]:
    settings = get_settings()
    if not (q or "").strip():
        return []
    url = f"{settings.nominatim_base.rstrip('/')}/search"
    headers = {"User-Agent": settings.osm_user_agent, "Accept": "application/json"}
    params = {"q": q, "format": "json", "limit": limit}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code >= 400:
                logger.warning("Nominatim search %s", r.status_code)
                return []
            out = []
            for item in r.json() or []:
                out.append(
                    {
                        "display_name": item.get("display_name"),
                        "lat": float(item["lat"]) if item.get("lat") else None,
                        "lng": float(item["lon"]) if item.get("lon") else None,
                        "type": item.get("type"),
                    }
                )
            return out
    except Exception as exc:
        logger.warning("Nominatim search error: %s", exc)
        return []


async def nominatim_reverse(lat: float, lng: float) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.nominatim_base.rstrip('/')}/reverse"
    headers = {"User-Agent": settings.osm_user_agent, "Accept": "application/json"}
    params = {"lat": lat, "lon": lng, "format": "json"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code >= 400:
                return {}
            data = r.json()
            return {
                "display_name": data.get("display_name"),
                "lat": lat,
                "lng": lng,
                "address": data.get("address") or {},
            }
    except Exception as exc:
        logger.warning("Nominatim reverse error: %s", exc)
        return {}
