from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StatusCreate(BaseModel):
    body: str = Field(default="", max_length=500)
    expiry: str = "24h"  # 3h | 7h | 24h | 3d | 7d
    media_url: str | None = None  # HTTPS B2 URL only — not data:
    media_type: str | None = None


class StatusPublic(BaseModel):
    id: UUID
    phone: str
    name: str | None = None
    body: str
    media_url: str | None = None
    media_type: str | None = None
    expires_at: datetime
    created_at: datetime | None = None
