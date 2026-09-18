from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FairlyUsedCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str | None = None
    price: float | None = None
    currency: str | None = "NGN"
    media_url: str | None = None
    image_url: str | None = None  # alias some clients send
    media_type: str | None = None
    lat: float | None = None
    lng: float | None = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class FairlyUsedAuthorPublic(BaseModel):
    """Shop Near Me identity on the card — message via phone UID."""

    phone: str | None = None
    name: str | None = None
    start_row: int | None = None
    primary_location: str | None = None
    community: str | None = None
    city: str | None = None
    # internal only if you still expose it
    id: UUID | None = None


class FairlyUsedPublic(BaseModel):
    id: UUID  # post row id (detail / delete) — NOT for chat
    author_id: UUID  # internal FK
    author_phone: str | None = None  # UID for Message seller
    author_name: str | None = None
    author_start_row: int | None = None
    title: str
    body: str | None = None
    price: float | None = None
    currency: str | None = None
    media_url: str | None = None
    image_url: str | None = None
    media_type: str | None = None
    lat: float | None = None
    lng: float | None = None
    created_at: datetime | None = None
    author: FairlyUsedAuthorPublic | None = None

    model_config = {"from_attributes": True}


class CommentPublic(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    author_phone: str | None = None
    author_name: str | None = None
    body: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}