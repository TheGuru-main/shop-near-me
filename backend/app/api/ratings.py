import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.rating import Rating
from app.models.user import User
from app.services.phone import normalize_e164

router = APIRouter(prefix="/ratings", tags=["ratings"])
CONTEXTS = {"merchant", "fairly_used", "driver", "user"}


class RatingCreate(BaseModel):
    subject_uid: str
    score: int = Field(..., ge=1, le=5)
    comment: str | None = None
    context: str
    ref_id: str | None = None


def _uid(phone: str) -> str:
    return normalize_e164(phone)


@router.post("")
@limiter.limit("20/minute")
async def create_rating(
    request: Request,
    body: RatingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ctx = (body.context or "").strip().lower()
    if ctx not in CONTEXTS:
        raise HTTPException(400, detail=f"context must be one of {sorted(CONTEXTS)}")
    rater_uid = _uid(user.phone)
    subject_uid = _uid(body.subject_uid)
    if subject_uid == rater_uid:
        raise HTTPException(400, detail="Cannot rate yourself")

    existing = (
        db.query(Rating)
        .filter(
            Rating.rater_uid == rater_uid,
            Rating.subject_uid == subject_uid,
            Rating.context == ctx,
            Rating.ref_id == body.ref_id,
        )
        .first()
    )
    if existing:
        existing.score = body.score
        existing.comment = body.comment
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return {"id": str(existing.id), "updated": True, "score": existing.score}

    row = Rating(
        id=uuid.uuid4(),
        rater_uid=rater_uid,
        subject_uid=subject_uid,
        score=body.score,
        comment=body.comment,
        context=ctx,
        ref_id=body.ref_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": str(row.id), "updated": False, "score": row.score}


@router.get("/summary/{subject_uid}")
@limiter.limit("60/minute")
async def rating_summary(
    request: Request,
    subject_uid: str,
    context: str | None = None,
    db: Session = Depends(get_db),
):
    uid = _uid(subject_uid)
    q = db.query(func.avg(Rating.score), func.count(Rating.id)).filter(
        Rating.subject_uid == uid
    )
    if context:
        q = q.filter(Rating.context == context.strip().lower())
    avg, count = q.first() or (None, 0)
    return {
        "subject_uid": uid,
        "context": context,
        "average": round(float(avg), 2) if avg is not None else None,
        "count": int(count or 0),
    }
