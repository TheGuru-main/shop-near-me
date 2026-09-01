from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from app.core.limiter import limiter
from app.services.gsg import gsg_at
from app.services.osm import nominatim_reverse, nominatim_search

router = APIRouter(prefix="/geo", tags=["geo"])


def _norm(s: str | None) -> str:
    return " ".join((s or "").strip().split())


def _build_query(
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
    out: list[str] = []
    for b in bits:
        if b and (not out or out[-1].lower() != b.lower()):
            out.append(b)
    return ", ".join(out)


def _map_address(addr: dict, fallback: dict[str, str]) -> dict[str, str]:
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


class GeoResolveIn(BaseModel):
    country: str = ""
    country_code: str | None = None
    region: str = ""
    city: str = ""
    community: str = ""
    primary_location: str = ""
    limit: int = Field(default=5, ge=1, le=10)


@router.get("/search")
@limiter.limit("30/minute")
async def geo_search(request: Request, q: str = Query(""), limit: int = 5):
    results = await nominatim_search(q, limit=limit)
    return {"query": q, "results": results, "provider": "nominatim"}


@router.get("/reverse")
@limiter.limit("30/minute")
async def geo_reverse(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
):
    place = await nominatim_reverse(lat, lng)
    gsg = gsg_at(lat, lng)
    return {"place": place, "gsg": gsg, "provider": "nominatim"}


@router.get("/autocomplete")
@limiter.limit("30/minute")
async def geo_autocomplete(
    request: Request,
    level: str = Query("city"),
    parent: str | None = None,
    q: str = Query(""),
):
    query = " ".join(x for x in [q, parent] if x)
    results = await nominatim_search(query, limit=8)
    return {
        "level": level,
        "parent": parent,
        "query": q,
        "results": results,
        "provider": "nominatim",
    }


@router.post("/resolve")
@limiter.limit("30/minute")
async def geo_resolve(request: Request, body: GeoResolveIn):
    """
    Typed hierarchy + primary location → OSM → GSG cell.
    Aligns with existing /geo/reverse GSG path.
    """
    q = _build_query(
        primary_location=body.primary_location,
        community=body.community,
        city=body.city,
        region=body.region,
        country=body.country,
    )
    if not q:
        return {
            "ok": False,
            "query": "",
            "best": None,
            "candidates": [],
            "error": "empty_query",
            "provider": "nominatim",
        }

    fallback = {
        "country": _norm(body.country),
        "region": _norm(body.region),
        "city": _norm(body.city),
        "community": _norm(body.community),
    }

    rows = await nominatim_search(
        q,
        limit=body.limit,
        country_code=body.country_code,
        addressdetails=True,
    )
    if not rows and body.country_code:
        rows = await nominatim_search(q, limit=body.limit, addressdetails=True)

    candidates = []
    for item in rows:
        lat, lng = item.get("lat"), item.get("lng")
        if lat is None or lng is None:
            continue
        mapped = _map_address(item.get("address") or {}, fallback)
        gsg = gsg_at(float(lat), float(lng))
        candidates.append(
            {
                "display_name": item.get("display_name") or q,
                "lat": float(lat),
                "lng": float(lng),
                "country": mapped["country"],
                "region": mapped["region"],
                "city": mapped["city"],
                "community": mapped["community"],
                "source": "nominatim",
                "osm_id": str(item.get("osm_id") or ""),
                "osm_type": str(item.get("osm_type") or ""),
                "gsg": gsg,
            }
        )

    best = candidates[0] if candidates else None
    return {
        "ok": bool(best),
        "query": q,
        "best": best,
        "candidates": candidates,
        "error": None if best else "not_found",
        "provider": "nominatim",
    }
