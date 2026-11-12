import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.bookmark import Bookmark
from app.models.user import User
from app.schemas.bookmark import BookmarkCreate
from app.services.phone import normalize_e164

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])

_BLOCK_ROLES = {"buyer"}


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
@limiter.limit("60/minute")
async def add_bookmark(
    request: Request,
    body: BookmarkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kind = (body.kind or "user").strip().lower()
    if kind not in ("user", "product"):
        raise HTTPException(status_code=400, detail="kind must be user or product")

    if kind == "user":
        if not (body.to_phone or "").strip():
            raise HTTPException(status_code=400, detail="to_phone required")
        other = _user_by_phone(db, body.to_phone)
        if not other:
            raise HTTPException(status_code=404, detail="User not found")
        if (other.role or "").lower() in _BLOCK_ROLES:
            raise HTTPException(status_code=400, detail="Cannot bookmark buyers")
        if other.id == user.id:
            raise HTTPException(status_code=400, detail="Cannot bookmark yourself")

        existing = (
            db.query(Bookmark)
            .filter(
                Bookmark.user_id == user.id,
                Bookmark.kind == "user",
                Bookmark.target_phone == other.phone,
            )
            .first()
        )
        if existing:
            return {"ok": True, "id": str(existing.id), "already": True}

        row = Bookmark(
            id=uuid.uuid4(),
            user_id=user.id,
            kind="user",
            target_user_id=other.id,
            target_phone=other.phone,
            title=body.title or other.name,
        )
        db.add(row)
        db.commit()
        return {"ok": True, "id": str(row.id)}

    if not body.product_id:
        raise HTTPException(status_code=400, detail="product_id required")

    existing = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == user.id,
            Bookmark.kind == "product",
            Bookmark.product_id == body.product_id,
        )
        .first()
    )
    if existing:
        return {"ok": True, "id": str(existing.id), "already": True}

    row = Bookmark(
        id=uuid.uuid4(),
        user_id=user.id,
        kind="product",
        product_id=body.product_id,
        title=body.title,
        target_phone=(body.to_phone or None),
    )
    db.add(row)
    db.commit()
    return {"ok": True, "id": str(row.id)}


@router.delete("")
@limiter.limit("60/minute")
async def remove_bookmark(
    request: Request,
    body: BookmarkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kind = (body.kind or "user").strip().lower()
    q = db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.kind == kind)

    if kind == "user":
        if not (body.to_phone or "").strip():
            raise HTTPException(status_code=400, detail="to_phone required")
        try:
            phone = normalize_e164(body.to_phone)
        except Exception:
            phone = body.to_phone.strip()
        q = q.filter(Bookmark.target_phone == phone)
    else:
        if not body.product_id:
            raise HTTPException(status_code=400, detail="product_id required")
        q = q.filter(Bookmark.product_id == body.product_id)

    row = q.first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.get("")
@limiter.limit("60/minute")
async def list_bookmarks(
    request: Request,
    kind: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Bookmark).filter(Bookmark.user_id == user.id)
    if kind:
        q = q.filter(Bookmark.kind == kind.strip().lower())
    rows = q.order_by(Bookmark.created_at.desc()).limit(200).all()

    items = []
    for b in rows:
        name = b.title
        role = None
        if b.target_user_id:
            u = db.get(User, b.target_user_id)
            if u:
                name = u.name
                role = u.role
        items.append(
            {
                "id": str(b.id),
                "kind": b.kind,
                "phone": b.target_phone,
                "name": name,
                "role": role,
                "product_id": str(b.product_id) if b.product_id else None,
                "title": b.title or name,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
        )
    return {"count": len(items), "items": items}
