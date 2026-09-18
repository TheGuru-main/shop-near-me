from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services.dictionaries import (
    categories_for,
    commerce_lookup,
    define_word,
    expand_synonyms,
    languages,
    seed_words,
    search_seeds,
)

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


@router.get("/synonyms")
@limiter.limit("60/minute")
async def synonyms(request: Request, q: str = Query("")):
    data = await expand_synonyms(q)
    local = search_seeds(q)
    # merge local seeds first so commerce terms always expand
    syns = list(dict.fromkeys((local.get("synonyms") or []) + (data.get("synonyms") or [])))
    return {
        "query": q,
        "dictionary": "synonym",
        "synonyms": syns[:40],
        "source": data.get("source") or "mixed",
        "local_hits": local.get("hits") or [],
    }


@router.get("/define")
@limiter.limit("30/minute")
async def define(request: Request, q: str = Query("")):
    data = await define_word(q)
    local = search_seeds(q)
    if not data.get("meanings") and local.get("gloss"):
        data = {
            **data,
            "meanings": [{"partOfSpeech": "noun", "definitions": [{"definition": local["gloss"]}]}],
            "source": "local_seed",
        }
    return {"query": q, "dictionary": "language", **data}


@router.get("/commerce")
@limiter.limit("30/minute")
async def commerce(request: Request, q: str = Query("")):
    base = commerce_lookup(q)
    local = search_seeds(q)
    cats = list(
        dict.fromkeys((local.get("categories") or []) + (base.get("categories") or []))
    )
    terms = list(
        dict.fromkeys((local.get("synonyms") or []) + (base.get("related") or []))
    )
    return {
        "query": q,
        "dictionary": "commerce",
        "categories": cats,
        "related": terms[:40],
        "gloss": local.get("gloss") or base.get("gloss"),
        **{k: v for k, v in base.items() if k not in ("categories", "related", "gloss")},
    }


@router.get("/categories")
@limiter.limit("30/minute")
async def categories(request: Request, business_type: str | None = None):
    return {"dictionary": "category", **categories_for(business_type)}


@router.get("/languages")
@limiter.limit("30/minute")
async def langs(request: Request):
    return {"dictionary": "language", **languages()}


@router.get("/seeds")
@limiter.limit("30/minute")
async def seeds(request: Request, q: str = Query("")):
    """Inspect / filter local seed lexicon."""
    if q.strip():
        return {"query": q, "dictionary": "seed", **search_seeds(q)}
    return {"dictionary": "seed", "count": len(seed_words()), "words": seed_words()}


@router.get("/all")
@limiter.limit("20/minute")
async def all_meta(request: Request):
    return {
        "dictionaries": ["synonym", "commerce", "category", "language", "seed"],
        "providers": ["datamuse", "dictionaryapi.dev", "local_taxonomy"],
        "seed_count": len(seed_words()),
    }