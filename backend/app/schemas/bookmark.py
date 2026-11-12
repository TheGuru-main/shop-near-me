from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BookmarkCreate(BaseModel):
    kind: str = "user"  # user | product
    to_phone: str | None = None
    product_id: UUID | None = None
    title: str | None = Field(default=None, max_length=255)


class BookmarkPublic(BaseModel):
    id: UUID
    kind: str
    phone: str | None = None
    name: str | None = None
    role: str | None = None
    product_id: UUID | None = None
    title: str | None = None
    created_at: datetime | None = None
