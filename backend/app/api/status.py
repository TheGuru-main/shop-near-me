import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.follow import Follow
from app.models.status import Status
from app.models.user import User
from app.schemas.status import StatusCreate

router = APIRouter(prefix="/status", tags=["status"])

_EXPIRY = {
    "3h": timedelta(hours=3),
    "7h": timedelta(hours=7),
    "24h": timedelta(hours=24),
    "3d": timedelta(days=3),
    "7d": timedelta(days=7),
}


def _parse_expiry(code: str) -> datetime:
    delta = _EXPIRY.get((code or "24h").strip().lower(), _EXPIRY["24h"])
    return datetime.now(timezone.utc) + delta


@router.post("")
@limiter.limit("20/minute")
async def create_status(
    request: Request,
    body: StatusCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text = (body.body or "").strip()
    media = (body.media_url or "").strip() or None

    if media and media.startswith("data:"):
        raise HTTPException(
            status_code=400,
            detail="Upload via /media/upload; send HTTPS media_url only",
        )
    if not text and not media:
        raise HTTPException(status_code=400, detail="Provide body and/or media_url")

    row = Status(
        id=uuid.uuid4(),
        author_id=user.id,
        author_phone=user.phone,
        author_name=user.name,
        body=text or "Status",
        media_url=media,
        media_type=body.media_type or ("image" if media else None),
        expires_at=_parse_expiry(body.expiry),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": str(row.id),
        "phone": row.author_phone,
        "name": row.author_name,
        "body": row.body,
        "media_url": row.media_url,
        "media_type": row.media_type,
        "expires_at": row.expires_at.isoformat(),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/feed")
@limiter.limit("60/minute")
async def status_feed(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    following_ids = [
        r.following_id
        for r in db.query(Follow.following_id).filter(Follow.follower_id == user.id).all()
    ]
    follower_ids = [
        r.follower_id
        for r in db.query(Follow.follower_id).filter(Follow.following_id == user.id).all()
    ]
    allowed = set(following_ids) | set(follower_ids) | {user.id}

    q = db.query(Status).filter(
        Status.deleted_at.is_(None),
        Status.expires_at > now,
        Status.author_id.in_(list(allowed)),
    )
    rows = q.order_by(Status.created_at.desc()).limit(100).all()

    items = [
        {
            "id": str(s.id),
            "phone": s.author_phone,
            "name": s.author_name,
            "body": s.body,
            "media_url": s.media_url,
            "media_type": s.media_type,
            "expires_at": s.expires_at.isoformat(),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in rows
    ]
    return {"count": len(items), "items": items}
