import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.report import UserReport
from app.models.user import User
from app.services.admin_box import ADMIN_UID
from app.services.phone import normalize_e164

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_REASONS = {
    "scam",
    "harassment",
    "fake_listing",
    "no_show",
    "unsafe",
    "spam",
    "other",
}


def _admin_phones() -> set[str]:
    raw = os.getenv("ADMIN_PHONES", "")
    phones = {p.strip() for p in raw.split(",") if p.strip()}
    phones.add(ADMIN_UID)
    return phones


def _is_admin(user: User) -> bool:
    try:
        phone = normalize_e164(user.phone)
    except Exception:
        phone = str(user.phone or "")
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits == ADMIN_UID or phone.endswith(ADMIN_UID):
        return True
    if phone in _admin_phones() or digits in _admin_phones():
        return True
    return (user.role or "").lower() == "admin"


class ReportCreate(BaseModel):
    subject_uid: str
    reason: str
    detail: str | None = None
    context: str | None = None
    ref_id: str | None = None


class ReportReview(BaseModel):
    status: str = Field(..., description="open|reviewing|resolved|rejected")
    admin_note: str | None = None


def _serialize(r: UserReport) -> dict:
    return {
        "id": str(r.id),
        "reporter_uid": r.reporter_uid,
        "subject_uid": r.subject_uid,
        "reason": r.reason,
        "detail": r.detail,
        "context": r.context,
        "ref_id": r.ref_id,
        "status": r.status,
        "admin_note": r.admin_note,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _uid(phone: str) -> str:
    """Prefer E.164; fall back to digits-only for system admin Uid."""
    try:
        return normalize_e164(phone)
    except Exception:
        digits = "".join(ch for ch in str(phone) if ch.isdigit())
        if digits == ADMIN_UID:
            return ADMIN_UID
        raise


@router.post("")
@limiter.limit("10/minute")
async def create_report(
    request: Request,
    body: ReportCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = (body.reason or "").strip().lower()
    if reason not in ALLOWED_REASONS:
        raise HTTPException(400, detail=f"reason must be one of {sorted(ALLOWED_REASONS)}")
    reporter_uid = _uid(user.phone)
    subject_raw = body.subject_uid.strip()
    try:
        subject_uid = _uid(subject_raw)
    except Exception:
        subject_uid = "".join(ch for ch in subject_raw if ch.isdigit()) or subject_raw
    if subject_uid == reporter_uid:
        raise HTTPException(400, detail="Cannot report yourself")

    row = UserReport(
        id=uuid.uuid4(),
        reporter_uid=reporter_uid,
        subject_uid=subject_uid,
        reason=reason,
        detail=body.detail,
        context=body.context,
        ref_id=body.ref_id,
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.get("/me")
@limiter.limit("30/minute")
async def my_reports(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = _uid(user.phone)
    rows = (
        db.query(UserReport)
        .filter(UserReport.reporter_uid == uid)
        .order_by(UserReport.created_at.desc())
        .limit(50)
        .all()
    )
    return {"count": len(rows), "reports": [_serialize(r) for r in rows]}


@router.get("/admin/list")
@limiter.limit("30/minute")
async def admin_list(
    request: Request,
    status_filter: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(user):
        raise HTTPException(403, detail="Admin only")
    q = db.query(UserReport)
    if status_filter:
        q = q.filter(UserReport.status == status_filter)
    rows = q.order_by(UserReport.created_at.desc()).limit(100).all()
    return {"count": len(rows), "reports": [_serialize(r) for r in rows]}


@router.patch("/{report_id}/review")
@limiter.limit("30/minute")
async def admin_review(
    request: Request,
    report_id: uuid.UUID,
    body: ReportReview,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(user):
        raise HTTPException(403, detail="Admin only")
    row = db.get(UserReport, report_id)
    if not row:
        raise HTTPException(404, detail="Report not found")
    st = body.status.strip().lower()
    if st not in {"open", "reviewing", "resolved", "rejected"}:
        raise HTTPException(400, detail="Invalid status")
    row.status = st
    row.admin_note = body.admin_note
    row.reviewed_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.get("/{report_id}")
@limiter.limit("30/minute")
async def get_report(
    request: Request,
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(UserReport, report_id)
    if not row:
        raise HTTPException(404, detail="Report not found")
    uid = _uid(user.phone)
    if not _is_admin(user) and row.reporter_uid != uid and row.subject_uid != uid:
        raise HTTPException(403, detail="Not allowed")
    return _serialize(row)
