import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductPublic, ProductUpdate
from app.services.phone import phone_digits
from app.services.placement import name_len, start_row
from app.services.relationship import register_entity

router = APIRouter(prefix="/products", tags=["products"])


def _product_row(name: str, owner_phone: str) -> int:
    from app.services.phone import digit_sum

    L = name_len(name)
    S = digit_sum(phone_digits(owner_phone))
    return start_row(L, S, R=64)


def _register_product(product: Product, owner: User) -> None:
    register_entity(
        entity_type="product",
        entity_id=str(product.id),
        name=product.name,
        uid_for_s=phone_digits(owner.phone),
        country=owner.country or "",
        region=owner.region or "",
        city=owner.city or "",
        community=owner.community or "",
        primary_location=owner.primary_location or "",
        category=product.category or product.business_type or owner.role,
        extra={
            "owner_id": str(owner.id),
            "perishable": product.perishable,
            "business_type": product.business_type,
            "role": owner.role,
        },
    )


@router.post("", response_model=ProductPublic)
@limiter.limit("30/minute")
async def create_product(
    request: Request,
    body: ProductCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyers cannot create catalogue products",
        )
    if body.price is not None and not body.currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="currency required when price is set",
        )

    row = _product_row(body.name, user.phone)
    product = Product(
        id=uuid.uuid4(),
        owner_id=user.id,
        name=body.name,
        category=body.category or "",
        business_type=body.business_type or user.role,
        price=body.price,
        currency=body.currency,
        quantity=body.quantity,
        available=body.available,
        perishable=body.perishable,
        description=body.description,
        image_url=body.image_url,
        start_row=row,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    _register_product(product, user)
    return product


@router.get("/me", response_model=list[ProductPublic])
@limiter.limit("60/minute")
async def list_my_products(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Product)
        .filter(Product.owner_id == user.id, Product.deleted_at.is_(None))
        .order_by(Product.created_at.desc())
        .all()
    )
    return rows


@router.get("/perishables", response_model=list[ProductPublic])
@limiter.limit("60/minute")
async def list_perishables(
    request: Request,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Product)
        .filter(
            Product.perishable.is_(True),
            Product.available.is_(True),
            Product.deleted_at.is_(None),
        )
        .order_by(Product.created_at.desc())
        .limit(100)
        .all()
    )
    return rows


@router.get("/{product_id}", response_model=ProductPublic)
@limiter.limit("60/minute")
async def get_product(
    request: Request,
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return product


@router.patch("/{product_id}", response_model=ProductPublic)
@limiter.limit("30/minute")
async def update_product(
    request: Request,
    product_id: uuid.UUID,
    body: ProductUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if product.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")

    data = body.model_dump(exclude_unset=True)
    if "price" in data and data["price"] is not None and not data.get("currency") and not product.currency:
        if "currency" not in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="currency required when price is set",
            )
    for k, v in data.items():
        setattr(product, k, v)
    if "name" in data and data["name"]:
        product.start_row = _product_row(product.name, user.phone)
    db.add(product)
    db.commit()
    db.refresh(product)
    _register_product(product, user)
    return product


@router.delete("/{product_id}")
@limiter.limit("30/minute")
async def delete_product(
    request: Request,
    product_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if product.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")
    product.deleted_at = datetime.now(timezone.utc)
    product.available = False
    db.add(product)
    db.commit()
    return {"id": str(product_id), "deleted": True}
