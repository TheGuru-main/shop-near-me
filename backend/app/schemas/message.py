from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def _normalize_phone(v: str) -> str:
    """Shop Near Me UID: digits; accept +234… and normalize to +E.164-style storage key."""
    s = (v or "").strip().replace(" ", "")
    if not s:
        raise ValueError("phone required")
    if s.startswith("00"):
        s = "+" + s[2:]
    digits = "".join(c for c in s if c.isdigit())
    if s.startswith("+"):
        return "+" + digits
    # bare 234… → +234…
    if digits.startswith("234") and len(digits) >= 13:
        return "+" + digits
    if len(digits) >= 10:
        return "+" + digits
    raise ValueError("invalid phone")


class ThreadCreate(BaseModel):
    """Open / continue chat by peer phone UID. body optional."""

    to_phone: str = Field(..., min_length=10, max_length=32)
    body: str | None = None  # optional — only insert Message if non-empty
    context_type: str = "direct"
    product_id: UUID | None = None
    fairly_used_post_id: UUID | None = None

    @field_validator("to_phone")
    @classmethod
    def phone_ok(cls, v: str) -> str:
        return _normalize_phone(v)


class MessageCreate(BaseModel):
    body: str = Field(min_length=1)
    msg_type: str = "text"  # text | image | voice
    media_url: str | None = None


class MessagePublic(BaseModel):
    id: UUID
    thread_id: UUID
    # internal SQL (optional for clients)
    from_user_id: UUID
    to_user_id: UUID
    # Shop Near Me UID + GSP
    from_phone: str | None = None
    to_phone: str | None = None
    from_start_row: int | None = None
    to_start_row: int | None = None
    body: str
    msg_type: str = "text"
    media_url: str | None = None
    context_type: str
    product_id: UUID | None = None
    fairly_used_post_id: UUID | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ThreadPublic(BaseModel):
    id: UUID
    participant_a: UUID
    participant_b: UUID
    participant_a_phone: str | None = None
    participant_b_phone: str | None = None
    context_type: str
    product_id: UUID | None = None
    fairly_used_post_id: UUID | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}