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
    prefix = getattr(settings, "api_prefix", "/api/v1")

    database_url: str = "postgresql+psycopg://user:pass@localhost:5432/shopnearme"
    cors_origins: str = "*"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    at_username: str = ""
    at_api_key: str = ""
    otp_expose_dev: bool = True

    # News
    gnews_api_key: str = ""

    # Dictionary / Datamuse
    dictionary_api_base: str = "https://api.dictionaryapi.dev/api/v2/entries/en"
    datamuse_base: str = "https://api.datamuse.com"
    # If you use Apify proxy/actor for Datamuse:
    apify_token: str = ""
    apify_datamuse_url: str = ""  # optional full actor/run URL; leave empty to use datamuse_base

    # OSM Nominatim
    nominatim_base: str = "https://nominatim.openstreetmap.org"
    osm_user_agent: str = "ShopNearMe/1.0 (contact@example.com)"


@lru_cache
def get_settings() -> Settings:
    return Settings()
