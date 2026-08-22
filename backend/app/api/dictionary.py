from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services.dictionaries import (
    categories_for,
    commerce_lookup,
    define_word,
    expand_synonyms,
    languages,
)

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


@router.get("/synonyms")
@limiter.limit("60/minute")
async def synonyms(request: Request, q: str = Query("")):
    data = await expand_synonyms(q)
    return {"query": q, "dictionary": "synonym", **data}


@router.get("/define")
@limiter.limit("30/minute")
async def define(request: Request, q: str = Query("")):
    data = await define_word(q)
    return {"query": q, "dictionary": "language", **data}


@router.get("/commerce")
@limiter.limit("30/minute")
async def commerce(request: Request, q: str = Query("")):
    return {"query": q, **commerce_lookup(q)}


@router.get("/categories")
@limiter.limit("30/minute")
async def categories(request: Request, business_type: str | None = None):
    return {"dictionary": "category", **categories_for(business_type)}


@router.get("/languages")
@limiter.limit("30/minute")
async def langs(request: Request):
    return {"dictionary": "language", **languages()}


@router.get("/all")
@limiter.limit("20/minute")
async def all_meta(request: Request):
    return {
        "dictionaries": ["synonym", "commerce", "category", "language"],
        "providers": ["datamuse", "dictionaryapi.dev", "local_taxonomy"],
    }
