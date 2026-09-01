from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services import token_grids as tg

router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])


@router.get("/languages")
@limiter.limit("60/minute")
async def languages(request: Request):
    return {"languages": tg.supported_languages()}


@router.get("/tokenize")
@limiter.limit("60/minute")
async def tokenize(
    request: Request,
    q: str = Query(""),
    lang: str = Query("en"),
):
    tokens = tg.tokenize(q, lang)
    return {
        "query": q,
        "lang": tg.normalize_lang(lang),
        "count": len(tokens),
        "tokens": tokens,
        "config": tg.full_text_placement_config(),
    }


@router.get("/word-cell")
@limiter.limit("60/minute")
async def word_cell(
    request: Request,
    q: str = Query(""),
    lang: str = Query("en"),
):
    return tg.word_cell(q, lang)


@router.get("/gsp-inputs")
@limiter.limit("60/minute")
async def gsp_inputs(
    request: Request,
    q: str = Query(""),
    lang: str = Query("en"),
):
    return {
        "query": q,
        "lang": tg.normalize_lang(lang),
        "inputs": tg.gsp_inputs(q, lang),
        "start_row": tg.gsp_start_row(q, lang),
    }
