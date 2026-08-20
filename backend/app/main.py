from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import auth as auth_routes
from app.config import get_settings
from app.core.limiter import limiter

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix=settings.api_prefix)


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
