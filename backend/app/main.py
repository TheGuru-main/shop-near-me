from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.openapi.utils import get_openapi

from app.api import admin_contact as admin_contact_routes
from app.api import auth as auth_routes
from app.api import banqueue as banqueue_routes
from app.api import calls as calls_routes
from app.api import checkout as checkout_routes
from app.api import dictionary as dictionary_routes
from app.api import einvoice as einvoice_routes
from app.api import emergency as emergency_routes
from app.api import fairly_used as fairly_used_routes
from app.api import feed as feed_routes
from app.api import geo as geo_routes
from app.api import keyboard as keyboard_routes
from app.api import live as live_routes
from app.api import manifests as manifests_routes
from app.api import messages as messages_routes
from app.api import news as news_routes
from app.api import premium as premium_routes
from app.api import presence as presence_routes
from app.api import products as products_routes
from app.api import ratings as ratings_routes
from app.api import reports as reports_routes
from app.api import search as search_routes
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
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
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

prefix = settings.api_prefix

# Core
app.include_router(auth_routes.router, prefix=prefix)
app.include_router(presence_routes.router, prefix=prefix)
app.include_router(products_routes.router, prefix=prefix)
app.include_router(search_routes.router, prefix=prefix)
app.include_router(dictionary_routes.router, prefix=prefix)
app.include_router(geo_routes.router, prefix=prefix)
app.include_router(news_routes.router, prefix=prefix)
app.include_router(keyboard_routes.router, prefix=prefix)

# Local utility
app.include_router(banqueue_routes.router, prefix=prefix)
app.include_router(emergency_routes.router, prefix=prefix)

# Commerce / realtime
app.include_router(calls_routes.router, prefix=prefix)
app.include_router(live_routes.router, prefix=prefix)
app.include_router(checkout_routes.router, prefix=prefix)

# Trust
app.include_router(reports_routes.router, prefix=prefix)
app.include_router(ratings_routes.router, prefix=prefix)
app.include_router(manifests_routes.router, prefix=prefix)
app.include_router(admin_contact_routes.router, prefix=prefix)

# Premium + documents
app.include_router(premium_routes.router, prefix=prefix)
app.include_router(einvoice_routes.router, prefix=prefix)

# Social / feed (were try/except — now always on)
app.include_router(messages_routes.router, prefix=prefix)
app.include_router(fairly_used_routes.router, prefix=prefix)
app.include_router(feed_routes.router, prefix=prefix)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/api/v1/health")
def api_health():
    return {
        "status": "ok",
        "api": settings.api_prefix,
        "version": settings.app_version,
    }


def custom_openapi():
    """Build schema; on failure return error text instead of HTTP 500."""
    if app.openapi_schema:
        return app.openapi_schema
    try:
        schema = get_openapi(
            title=app.title,
            version=app.version,
            routes=app.routes,
        )
        app.openapi_schema = schema
        return schema
    except Exception as exc:
        # Visible in browser / curl — tells us the broken route/model
        return {
            "openapi": "3.1.0",
            "info": {
                "title": app.title,
                "version": app.version,
                "description": f"OPENAPI_BUILD_ERROR: {type(exc).__name__}: {exc}",
            },
            "paths": {},
        }


app.openapi = custom_openapi
