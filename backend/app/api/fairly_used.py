import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.fairly_used import FairlyUsedComment, FairlyUsedPost
from app.models.user import User
from app.schemas.fairly_used import (
    CommentCreate,
    CommentPublic,
    FairlyUsedCreate,
    FairlyUsedPublic,
)
from app.services.phone import phone_digits
from app.services.placement import messaging_start_row
from app.services.relationship import register_entity

router = APIRouter(prefix="/fairly-used", tags=["fairly-used"])


def _author_start_row(user: User) -> int:
    if user.start_row is not None:
        return int(user.start_row)
    return int(messaging_start_row(user.name, user.phone))


def _media_from_body(body: FairlyUsedCreate) -> tuple[str | None, str | None]:
    url = body.media_url or getattr(body, "image_url", None)
    if url is not None:
        url = str(url).strip() or None
    mtype = body.media_type
    if url and not mtype:
        if str(url).startswith("data:image"):
            mtype = "image"
        elif str(url).startswith("data:audio"):
            mtype = "audio"
        else:
            mtype = "image"
    return url, mtype


@router.post("")
@limiter.limit("20/minute")
async def create_post(
    request: Request,
    body: FairlyUsedCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    media_url, media_type = _media_from_body(body)
    if not media_url and not (body.body or body.title):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide media and/or text",
        )

    post = FairlyUsedPost(
        id=uuid.uuid4(),
        author_id=user.id,
        author_phone=user.phone,
        author_name=user.name,
        author_start_row=_author_start_row(user),
        title=(body.title or "").strip() or "Fairly used",
        body=body.body,
        price=body.price,
        currency=body.currency or "NGN",
        media_url=media_url,
        media_type=media_type,
        lat=getattr(body, "lat", None),
        lng=getattr(body, "lng", None),
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    register_entity(
        entity_type="fairly_used",
        entity_id=str(post.id),
        name=post.title or post.body or "fairly-used",
        uid_for_s=phone_digits(user.phone),
        country=user.country or "",
        region=user.region or "",
        city=user.city or "",
        community=user.community or "",
        primary_location=user.primary_location or "",
        category="fairly_used",
        extra={
            "author_id": str(user.id),
            "author_phone": user.phone,
            "author_start_row": post.author_start_row,
        },
    )

    payload = FairlyUsedPublic.model_validate(post).model_dump(mode="json")
    payload["image_url"] = post.media_url
    payload["author_phone"] = post.author_phone
    payload["author_name"] = post.author_name
    return payload

@router.get("")
@limiter.limit("60/minute")
async def feed(
    request: Request,
    limit: int = 40,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(FairlyUsedPost, User)
        .join(User, User.id == FairlyUsedPost.author_id)
        .filter(
            FairlyUsedPost.deleted_at.is_(None),
            User.deleted_at.is_(None),
        )
        .order_by(FairlyUsedPost.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    results = []
    for post, author in rows:
        phone = post.author_phone or author.phone
        name = post.author_name or author.name
        results.append(
            {
                "post": {
                    "id": str(post.id),
                    "author_id": str(post.author_id),
                    "author_phone": phone,
                    "author_name": name,
                    "author_start_row": post.author_start_row,
                    "title": post.title or "",
                    "body": post.body,
                    "price": post.price,
                    "currency": post.currency,
                    "media_url": post.media_url,
                    "image_url": post.media_url,
                    "media_type": post.media_type,
                    "lat": post.lat,
                    "lng": post.lng,
                    "created_at": post.created_at.isoformat()
                    if post.created_at
                    else None,
                },
                "author": {
                    "id": str(author.id),
                    "name": name,
                    "phone": phone,
                    "role": author.role,
                    "city": author.city,
                    "community": author.community,
                    "primary_location": author.primary_location,
                    "lat": author.lat,
                    "lng": author.lng,
                },
                "actions": ["comment", "share", "message_seller"],
            }
        )
    return {"count": len(results), "results": results}


@router.post("/{post_id}/comments", response_model=CommentPublic)
@limiter.limit("30/minute")
async def add_comment(
    request: Request,
    post_id: uuid.UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.get(FairlyUsedPost, post_id)
    if not post or post.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Post not found")
    c = FairlyUsedComment(
        id=uuid.uuid4(),
        post_id=post_id,
        author_id=user.id,
        author_phone=user.phone,
        author_name=user.name,
        body=body.body,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/{post_id}/comments")
@limiter.limit("60/minute")
async def list_comments(
    request: Request,
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(FairlyUsedComment)
        .filter(
            FairlyUsedComment.post_id == post_id,
            FairlyUsedComment.deleted_at.is_(None),
        )
        .order_by(FairlyUsedComment.created_at.asc())
        .limit(200)
        .all()
    )
    return {
        "count": len(rows),
        "comments": [
            CommentPublic.model_validate(c).model_dump(mode="json") for c in rows
        ],
    }


@router.delete("/{post_id}")
@limiter.limit("20/minute")
async def delete_post(
    request: Request,
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.get(FairlyUsedPost, post_id)
    if not post or post.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Not found")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not author")
    post.deleted_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    return {"id": str(post_id), "deleted": True}