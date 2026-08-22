from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services.gsg import gsg_at
from app.services.osm import nominatim_reverse, nominatim_search

router = APIRouter(prefix="/geo", tags=["geo"])


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

