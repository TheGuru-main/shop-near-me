import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.follow import Follow
from app.models.user import User
from app.services.phone import normalize_e164

router = APIRouter(prefix="/follow", tags=["follow"])


class FollowBody(BaseModel):
    to_phone: str = Field(..., min_length=10, max_length=32)


def _user_by_phone(db: Session, phone: str) -> User | None:
    try:
        p = normalize_e164(phone)
    except Exception:
        return None
    return (
        db.query(User)
        .filter(User.phone == p, User.deleted_at.is_(None))
        .first()
    )


@router.post("")
@limiter.limit("30/minute")
async def follow(
    request: Request,
    body: FollowBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    other = _user_by_phone(db, body.to_phone)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if other.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    exists = (
        db.query(Follow)
        .filter(Follow.follower_id == user.id, Follow.following_id == other.id)
        .first()
    )
    if exists:
        return {
            "ok": True,
            "following": True,
            "to_phone": other.phone,
            "name": other.name,
        }

    row = Follow(
        id=uuid.uuid4(),
        follower_id=user.id,
        following_id=other.id,
        following_phone=other.phone,
    )
    db.add(row)
    db.commit()
    return {
        "ok": True,
        "following": True,
        "to_phone": other.phone,
        "name": other.name,
    }


@router.delete("")
@limiter.limit("30/minute")
async def unfollow(
    request: Request,
    body: FollowBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    other = _user_by_phone(db, body.to_phone)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    row = (
        db.query(Follow)
        .filter(Follow.follower_id == user.id, Follow.following_id == other.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True, "following": False, "to_phone": other.phone}


@router.get("/status")
@limiter.limit("60/minute")
async def follow_status(
    request: Request,
    phone: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    other = _user_by_phone(db, phone)
    if not other:
        return {"following": False, "to_phone": phone}
    row = (
        db.query(Follow)
        .filter(Follow.follower_id == user.id, Follow.following_id == other.id)
        .first()
    )
    return {
        "following": bool(row),
        "to_phone": other.phone if other else phone,
        "name": other.name if other else None,
    }


@router.get("/following")
@limiter.limit("30/minute")
async def list_following(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    rows = (
        db.query(Follow, User)
        .join(User, User.id == Follow.following_id)
        .filter(Follow.follower_id == user.id, User.deleted_at.is_(None))
        .order_by(Follow.created_at.desc())
        .limit(min(limit, 200))
        .all()
    )
    items = [
        {
            "phone": u.phone,
            "name": u.name,
            "role": u.role,
            "primary_location": u.primary_location,
        }
        for _, u in rows
    ]
    return {"count": len(items), "items": items}
