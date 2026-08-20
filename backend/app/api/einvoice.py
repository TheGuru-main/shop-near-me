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
from app.services.premium_catalog import RECEIPT_MONTHLY_LIMIT

router = APIRouter(tags=["documents"])


class DocLine(BaseModel):
    name: str
    qty: float = 1
    unit_price: float = 0


class EInvoiceCreate(BaseModel):
    customer_name: str = ""
    customer_phone: str | None = None
    lines: list[DocLine] = []
    currency: str = "NGN"
    kind: str = "e_invoice"  # e_invoice | e_invoice_pp


class ReceiptCreate(BaseModel):
    customer_name: str = ""
    lines: list[DocLine] = []
    currency: str = "NGN"


def _month_start():
    n = datetime.now(timezone.utc)
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@router.post("/e-invoices")
@limiter.limit("30/minute")
async def create_einvoice(
    request: Request,
    body: EInvoiceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = "e_invoice_pp" if body.kind == "e_invoice_pp" else "e_invoice"
    sub = (
        db.query(PremiumSubscription)
        .filter(
            PremiumSubscription.user_id == user.id,
            PremiumSubscription.code == code,
            PremiumSubscription.status == "active",
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=403, detail=f"{code} subscription required")

    subtotal = sum(l.qty * l.unit_price for l in body.lines)
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
        kind=code,
        status="issued",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {
        "id": str(inv.id),
        "number": inv.number,
        "kind": inv.kind,
        "total": inv.total,
        "currency": inv.currency,
        "shareable": True,
        "cloud": True,
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
    return {
        "count": len(rows),
        "items": [
            {
                "id": str(r.id),
                "number": r.number,
                "kind": r.kind,
                "total": r.total,
                "currency": r.currency,
                "customer_name": r.customer_name,
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
        raise HTTPException(status_code=400, detail="Monthly receipt limit 3000 reached")

    total = sum(l.qty * l.unit_price for l in body.lines)
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
    return {
        "count": len(rows),
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
