from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try create tables; do not crash API if DB is unreachable during boot.
    try:
        from app.db import init_db

        init_db()
    except Exception as exc:
        print("init_db skipped:", type(exc).__name__, exc)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@app.get(f"{settings.api_prefix}/health")
def api_health():
    return {
        "status": "ok",
        "api": settings.api_prefix,
        "version": settings.app_version,
    }
