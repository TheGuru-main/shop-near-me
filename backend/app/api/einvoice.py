"""E-invoices (premium capacity) + receipts (free, monthly cap)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.premium import EInvoice, PremiumSubscription, Receipt
from app.models.user import User
from app.services.premium_catalog import (
    RECEIPT_MONTHLY_LIMIT,
    aftereffect_for_codes,
    get_plan,
    list_plans,
)

router = APIRouter(tags=["documents"])


class DocLine(BaseModel):
    name: str
    qty: float = 1
    unit_price: float = 0


class EInvoiceCreate(BaseModel):
    customer_name: str = ""
    customer_phone: str | None = None
    lines: list[DocLine] = Field(default_factory=list)
    currency: str = "NGN"
    # e_invoice | e_invoice_pp  (product kind, not plan code)
    kind: str = "e_invoice"
    palette: str | None = None
    surface: str | None = None
    layout: str | None = None
    notes: str | None = None


class ReceiptCreate(BaseModel):
    customer_name: str = ""
    lines: list[DocLine] = Field(default_factory=list)
    currency: str = "NGN"


def _month_start() -> datetime:
    n = datetime.now(timezone.utc)
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _active_codes(user: User, db: Session) -> list[str]:
    codes: list[str] = []
    prefs = user.prefs if isinstance(user.prefs, dict) else {}
    for c in prefs.get("premium_codes") or []:
        if isinstance(c, str) and c not in codes:
            codes.append(c)
    try:
        rows = (
            db.query(PremiumSubscription)
            .filter(
                PremiumSubscription.user_id == user.id,
                PremiumSubscription.status == "active",
            )
            .all()
        )
        for r in rows:
            code = getattr(r, "code", None) or getattr(r, "plan_code", None)
            if code and code not in codes:
                codes.append(code)
    except Exception:
        pass
    return codes


def _einvoice_entitlement(user: User, db: Session, want_pp: bool) -> dict:
    """
    Resolve active e-invoice plan.
    want_pp=True requires family einvoice_pp; else any einvoice or einvoice_pp.
    """
    codes = _active_codes(user, db)
    family_need = "einvoice_pp" if want_pp else None
    best = None
    for code in codes:
        plan = get_plan(code)
        if not plan or plan.get("status") != "active":
            continue
        fam = plan.get("family")
        if want_pp and fam != "einvoice_pp":
            continue
        if not want_pp and fam not in ("einvoice", "einvoice_pp"):
            continue
        if best is None or (plan.get("capacity") or 0) > (best.get("capacity") or 0):
            best = plan
    if not best:
        raise HTTPException(
            status_code=403,
            detail=(
                "E-Invoice++ plan required"
                if want_pp
                else "Active e-invoice plan required. Subscribe under /premium/plans"
            ),
        )
    return best


def _month_invoice_count(db: Session, user_id, kind_prefix: str | None = None) -> int:
    start = _month_start()
    q = db.query(EInvoice).filter(
        EInvoice.owner_id == user_id,
        EInvoice.created_at >= start,
        EInvoice.deleted_at.is_(None),
    )
    if kind_prefix:
        q = q.filter(EInvoice.kind == kind_prefix)
    return q.count()


@router.post("/e-invoices")
@limiter.limit("30/minute")
async def create_einvoice(
    request: Request,
    body: EInvoiceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    want_pp = body.kind in ("e_invoice_pp", "einvoice_pp", "invoice_pp")
    plan = _einvoice_entitlement(user, db, want_pp=want_pp)
    capacity = int(plan.get("capacity") or 0)
    used = _month_invoice_count(db, user.id)
    if capacity and used >= capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Monthly e-invoice capacity reached ({capacity})",
        )

    subtotal = sum(float(l.qty) * float(l.unit_price) for l in body.lines)
    kind = "e_invoice_pp" if want_pp else "e_invoice"
    meta = {
        "palette": body.palette,
        "surface": body.surface,
        "layout": body.layout,
        "notes": body.notes,
        "plan_code": plan.get("code"),
    }
    inv = EInvoice(
        id=uuid.uuid4(),
        owner_id=user.id,
        number=f"EI-{uuid.uuid4().hex[:10].upper()}",
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        lines_json=json.dumps([l.model_dump() for l in body.lines]),
        currency=body.currency,
        subtotal=subtotal,
        total=subtotal,
        kind=kind,
        status="issued",
    )
    # optional columns if present on model
    if hasattr(inv, "meta_json"):
        inv.meta_json = json.dumps(meta)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    codes = _active_codes(user, db)
    return {
        "id": str(inv.id),
        "number": inv.number,
        "kind": inv.kind,
        "total": inv.total,
        "currency": inv.currency,
        "shareable": True,
        "cloud": True,
        "plan_code": plan.get("code"),
        "capacity": capacity,
        "used_this_month": used + 1,
        "studio": aftereffect_for_codes(codes),
        "meta": meta,
    }


@router.get("/e-invoices")
@limiter.limit("60/minute")
async def list_einvoices(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(EInvoice)
        .filter(EInvoice.owner_id == user.id, EInvoice.deleted_at.is_(None))
        .order_by(EInvoice.created_at.desc())
        .limit(100)
        .all()
    )
    codes = _active_codes(user, db)
    return {
        "count": len(rows),
        "used_this_month": _month_invoice_count(db, user.id),
        "studio": aftereffect_for_codes(codes),
        "items": [
            {
                "id": str(r.id),
                "number": r.number,
                "kind": r.kind,
                "total": r.total,
                "currency": r.currency,
                "customer_name": r.customer_name,
                "status": getattr(r, "status", None),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/receipts")
@limiter.limit("60/minute")
async def create_receipt(
    request: Request,
    body: ReceiptCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start = _month_start()
    count = (
        db.query(Receipt)
        .filter(Receipt.owner_id == user.id, Receipt.created_at >= start)
        .count()
    )
    if count >= RECEIPT_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Monthly receipt limit {RECEIPT_MONTHLY_LIMIT} reached",
        )

    total = sum(float(l.qty) * float(l.unit_price) for l in body.lines)
    rec = Receipt(
        id=uuid.uuid4(),
        owner_id=user.id,
        number=f"RC-{uuid.uuid4().hex[:10].upper()}",
        customer_name=body.customer_name,
        lines_json=json.dumps([l.model_dump() for l in body.lines]),
        currency=body.currency,
        total=total,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {
        "id": str(rec.id),
        "number": rec.number,
        "total": rec.total,
        "currency": rec.currency,
        "shareable": False,
        "download_only": True,
        "cloud": False,
        "used_this_month": count + 1,
        "limit": RECEIPT_MONTHLY_LIMIT,
    }


@router.get("/receipts")
@limiter.limit("60/minute")
async def list_receipts(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Receipt)
        .filter(Receipt.owner_id == user.id)
        .order_by(Receipt.created_at.desc())
        .limit(100)
        .all()
    )
    start = _month_start()
    used = (
        db.query(Receipt)
        .filter(Receipt.owner_id == user.id, Receipt.created_at >= start)
        .count()
    )
    return {
        "count": len(rows),
        "used_this_month": used,
        "limit": RECEIPT_MONTHLY_LIMIT,
        "items": [
            {
                "id": str(r.id),
                "number": r.number,
                "total": r.total,
                "currency": r.currency,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/documents/studio")
@limiter.limit("60/minute")
async def studio_meta(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    codes = _active_codes(user, db)
    return {
        "active_codes": codes,
        "aftereffect": aftereffect_for_codes(codes),
        "plans_hint": [
            p
            for p in list_plans()
            if p.get("family") in ("einvoice", "einvoice_pp")
            or p.get("code") in ("premium_calculator", "priority_support")
        ],
    }
