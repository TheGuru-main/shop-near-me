from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class OTPRequest(BaseModel):
    role: str
    name: str
    continent_id: str | None = None
    continent_name: str | None = None
    country: str
    region: str | None = None
    city: str | None = None
    community: str | None = None
    primary_location: str
    lat: float
    lng: float
    phone: str
    password: str = Field(min_length=6)
    prefs: list[str] = []


class OTPVerify(BaseModel):
    pending_id: str
    otp: str


class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class UserPublic(BaseModel):
    id: UUID
    role: str
    name: str
    phone: str
    continent_id: str | None = None
    continent_name: str | None = None
    country: str | None = None
    region: str | None = None
    city: str | None = None
    community: str | None = None
    primary_location: str | None = None
    lat: float | None = None
    lng: float | None = None
    prefs: list[str] | None = None
    ladder: dict[str, Any] | None = None
    gsg: dict[str, Any] | None = None
    live: bool = False
    version: str = "1.0.0.1p"

    model_config = {"from_attributes": True}
