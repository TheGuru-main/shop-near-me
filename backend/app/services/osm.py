import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def nominatim_search(
    q: str,
    limit: int = 5,
    *,
    country_code: str | None = None,
    addressdetails: bool = False,
) -> list[dict[str, Any]]:
    settings = get_settings()
    if not (q or "").strip():
        return []
    url = f"{settings.nominatim_base.rstrip('/')}/search"
    headers = {
        "User-Agent": settings.osm_user_agent,
        "Accept": "application/json",
    }
    params: dict[str, Any] = {
        "q": q.strip(),
        "format": "json",
        "limit": max(1, min(int(limit), 10)),
    }
    if addressdetails:
        params["addressdetails"] = 1
    if country_code:
        params["countrycodes"] = country_code.lower().strip()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code >= 400:
                logger.warning("Nominatim search %s", r.status_code)
                return []
            out: list[dict[str, Any]] = []
            for item in r.json() or []:
                try:
                    lat = float(item["lat"]) if item.get("lat") is not None else None
                    lng = float(item["lon"]) if item.get("lon") is not None else None
                except (TypeError, ValueError):
                    lat, lng = None, None
                out.append(
                    {
                        "display_name": item.get("display_name"),
                        "lat": lat,
                        "lng": lng,
                        "type": item.get("type"),
                        "address": item.get("address") or {},
                        "importance": item.get("importance"),
                        "osm_id": item.get("osm_id"),
                        "osm_type": item.get("osm_type"),
                    }
                )
            return out
    except Exception as exc:
        logger.warning("Nominatim search error: %s", exc)
        return []


async def nominatim_reverse(lat: float, lng: float) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.nominatim_base.rstrip('/')}/reverse"
    headers = {
        "User-Agent": settings.osm_user_agent,
        "Accept": "application/json",
    }
    params = {"lat": lat, "lon": lng, "format": "json", "addressdetails": 1}
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
