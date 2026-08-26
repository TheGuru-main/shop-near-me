import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    try:
        from app.config import get_settings

        return get_settings().database_url
    except Exception as exc:
        raise RuntimeError(
            "DATABASE_URL not set and app.config unavailable"
        ) from exc


class Base(DeclarativeBase):
    pass


engine = create_engine(_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # import models so metadata is registered
    try:
        import app.models  # noqa: F401
    except Exception:
        pass
    Base.metadata.create_all(bind=engine)
