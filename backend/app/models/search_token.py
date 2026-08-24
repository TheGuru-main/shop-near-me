"""Optional persistence of token→grid cells for objects (products, places)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ObjectTokenIndex(Base):
    """Word/letter grid index rows for a searchable object."""

    __tablename__ = "object_token_index"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    object_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    # product | user | fairly_used | place
    object_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    token_original: Mapped[str] = mapped_column(String(128), nullable=False)
    token_stem: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    lang: Mapped[str] = mapped_column(String(16), default="en")
    letter_cols: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON list of letter indices
    word_col: Mapped[int | None] = mapped_column(Integer, nullable=True)
    word_row: Mapped[int | None] = mapped_column(Integer, nullable=True)
    word_L: Mapped[int | None] = mapped_column(Integer, nullable=True)
    word_S: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
