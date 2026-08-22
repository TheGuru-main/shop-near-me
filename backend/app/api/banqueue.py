import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User

router = APIRouter(prefix="/banqueue", tags=["banqueue"])

_LOCATIONS: dict[str, dict] = {}
_CHECKINS: dict[str, list] = {}


class LocationCreate(BaseModel):
    name: str = Field(min_length=1)
    category: str = "general"
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    city: str | None = None
    community: str | None = None


class CheckinBody(BaseModel):
    note: str | None = None


@router.get("/locations")
@limiter.limit("60/minute")
async def list_locations(request: Request):
    items = []
    for lid, row in _LOCATIONS.items():
        item = dict(row)
        item["queue_count"] = len(_CHECKINS.get(lid, []))
        items.append(item)
    return {"count": len(items), "locations": items}


@router.post("/locations")
@limiter.limit("20/minute")
async def create_location(
    request: Request,
    body: LocationCreate,
    user: User = Depends(get_current_user),
):
    lid = str(uuid.uuid4())
    row = {
        "id": lid,
        "name": body.name,
        "category": body.category,
        "address": body.address,
        "lat": body.lat,
        "lng": body.lng,
        "city": body.city or user.city,
        "community": body.community or user.community,
        "owner_id": str(user.id),
        "queue_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _LOCATIONS[lid] = row
    _CHECKINS[lid] = []
    return row


@router.get("/{location_id}")
@limiter.limit("60/minute")
async def get_location(request: Request, location_id: str):
    row = _LOCATIONS.get(location_id)
    if not row:
        raise HTTPException(status_code=404, detail="Location not found")
    item = dict(row)
    item["queue_count"] = len(_CHECKINS.get(location_id, []))
    return item


@router.post("/{location_id}/checkin")
@limiter.limit("30/minute")
async def checkin(
    request: Request,
    location_id: str,
    body: CheckinBody,
    user: User = Depends(get_current_user),
):
    if location_id not in _LOCATIONS:
        raise HTTPException(status_code=404, detail="Location not found")
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": str(user.id),
        "user_name": user.name,
        "note": body.note,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    _CHECKINS.setdefault(location_id, []).append(entry)
    _LOCATIONS[location_id]["queue_count"] = len(_CHECKINS[location_id])
    return {
        "ok": True,
        "checkin": entry,
        "queue_count": _LOCATIONS[location_id]["queue_count"],
    }
