import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("phone", name="uq_users_phone"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    continent_id: Mapped[str | None] = mapped_column(String(8), nullable=True)
    continent_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    community: Mapped[str | None] = mapped_column(String(128), nullable=True)
    primary_location: Mapped[str | None] = mapped_column(String(512), nullable=True)

    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    prefs: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    ladder: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    gsg: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    live: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hb_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    start_row: Mapped[int | None] = mapped_column(nullable=True)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0.1p", nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
