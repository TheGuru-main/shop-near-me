import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DeliveryManifest(Base):
    __tablename__ = "delivery_manifests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    buyer_uid: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    seller_uid: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    driver_uid: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    item_summary: Mapped[str] = mapped_column(String(512), default="")
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pickup_text: Mapped[str | None] = mapped_column(String(512), nullable=True)
    dropoff_text: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pickup_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    dropoff_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    dropoff_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    fee_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="NGN")
    status: Mapped[str] = mapped_column(String(32), default="created", nullable=False)
    delivery_otp: Mapped[str | None] = mapped_column(String(8), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
