from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Shop Near Me API"
    app_version: str = "1.0.0.1p"
    api_prefix: str = "/api/v1"

    # Neon: postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require
    database_url: str = "postgresql+psycopg://user:pass@localhost:5432/shopnearme"

    cors_origins: str = "*"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    # Africa's Talking
    at_username: str = ""
    at_api_key: str = ""

    # Dev only: include OTP in API response when True
    otp_expose_dev: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
