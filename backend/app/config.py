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

    # Neon Postgres URL from dashboard (use psycopg2 form)
    # postgresql+psycopg2://USER:PASSWORD@HOST/DB?sslmode=require
    database_url: str = "postgresql+psycopg2://user:pass@localhost:5432/shopnearme"

    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
