import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MessageThread(Base):
    """
    Internal participants = users.id (UUID).
    Product identity for chat = phone UIDs on messages / lookup by phone.
    """

    __tablename__ = "message_threads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Internal SQL only
    participant_a: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    participant_b: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    # Phone UIDs (digits or E.164 — match normalize_phone everywhere)
    participant_a_phone: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True
    )
    participant_b_phone: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True
    )
    context_type: Mapped[str] = mapped_column(
        String(32), default="direct", nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    fairly_used_post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Message(Base):
    """
    from_user_id / to_user_id = internal UUID FKs.
    from_phone / to_phone = Shop Near Me UID (phone) for card → chat.
    from_start_row / to_start_row = ((L + S - 1) % 64) + 1
    """

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id"),
        nullable=False,
        index=True,
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    from_phone: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True
    )
    to_phone: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True
    )
    from_start_row: Mapped[int | None] = mapped_column(Integer, nullable=True)
    to_start_row: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    context_type: Mapped[str] = mapped_column(
        String(32), default="direct", nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    fairly_used_post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    msg_type: Mapped[str] = mapped_column(
        String(16), default="text", nullable=False
    )
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )