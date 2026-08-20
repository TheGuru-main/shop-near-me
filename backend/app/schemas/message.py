from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ThreadCreate(BaseModel):
    to_user_id: UUID
    body: str = Field(min_length=1)
    context_type: str = "direct"
    product_id: UUID | None = None
    fairly_used_post_id: UUID | None = None


class MessageCreate(BaseModel):
    body: str = Field(min_length=1)


class MessagePublic(BaseModel):
    id: UUID
    thread_id: UUID
    from_user_id: UUID
    to_user_id: UUID
    from_start_row: int | None
    to_start_row: int | None
    body: str
    context_type: str
    product_id: UUID | None
    fairly_used_post_id: UUID | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ThreadPublic(BaseModel):
    id: UUID
    participant_a: UUID
    participant_b: UUID
    context_type: str
    product_id: UUID | None
    fairly_used_post_id: UUID | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
