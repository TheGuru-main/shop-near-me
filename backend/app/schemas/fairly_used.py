from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, computed_field, model_validator


class FairlyUsedCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str | None = None
    price: float | None = None
    currency: str | None = "NGN"
    media_url: str | None = None
    image_url: str | None = None  # accepted on write only
    media_type: str | None = None
    lat: float | None = None
    lng: float | None = None

    @model_validator(mode="after")
    def prefer_media(self):
        if not self.media_url and self.image_url:
            self.media_url = self.image_url
        return self


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class FairlyUsedAuthorPublic(BaseModel):
    phone: str | None = None
    name: str | None = None
    start_row: int | None = None
    primary_location: str | None = None
    community: str | None = None
    city: str | None = None
    id: UUID | None = None


class FairlyUsedPublic(BaseModel):
    """Built for JSON responses. Prefer building from dict, not only ORM."""

    id: UUID
    author_id: UUID
    author_phone: str | None = None
    author_name: str | None = None
    author_start_row: int | None = None
    title: str = ""
    body: str | None = None
    price: float | None = None
    currency: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    lat: float | None = None
    lng: float | None = None
    created_at: datetime | None = None
    author: FairlyUsedAuthorPublic | None = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def image_url(self) -> str | None:
        return self.media_url


class CommentPublic(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    author_phone: str | None = None
    author_name: str | None = None
    body: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}