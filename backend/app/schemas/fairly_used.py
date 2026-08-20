from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FairlyUsedCreate(BaseModel):
    title: str = ""
    body: str | None = None
    price: float | None = None
    currency: str | None = None
    media_url: str | None = None
    media_type: str | None = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class FairlyUsedPublic(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    body: str | None
    price: float | None
    currency: str | None
    media_url: str | None
    media_type: str | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class CommentPublic(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    body: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
