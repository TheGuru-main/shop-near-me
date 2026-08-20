from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = ""
    business_type: str = "merchant"
    price: float | None = None
    currency: str | None = None
    quantity: float | None = None
    available: bool = True
    perishable: bool = False
    description: str | None = None
    image_url: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    business_type: str | None = None
    price: float | None = None
    currency: str | None = None
    quantity: float | None = None
    available: bool | None = None
    perishable: bool | None = None
    description: str | None = None
    image_url: str | None = None


class ProductPublic(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    category: str
    business_type: str
    price: float | None
    currency: str | None
    quantity: float | None
    available: bool
    perishable: bool
    description: str | None
    image_url: str | None
    start_row: int | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductCard(BaseModel):
    """Discovery card: product + seller place/presence fields."""
    product: ProductPublic
    seller_name: str
    seller_role: str
    primary_location: str | None
    city: str | None
    community: str | None
    live: bool
    km: float | None = None
    card_type: str = "shop_catalogue"
