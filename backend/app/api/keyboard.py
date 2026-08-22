from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.services.dictionaries import LANGUAGE_DICTIONARY, expand_synonyms

router = APIRouter(prefix="/keyboard", tags=["keyboard"])

# Row maps: production expands to 15 languages (QWERTY/AZERTY/QWERTZ/Arabic/Pinyin…)
KEYMAPS = {
    "en": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
    "fr": ["azertyuiop", "qsdfghjklm", "wxcvbn"],
    "de": ["qwertzuiop", "asdfghjkl", "yxcvbnm"],
    "ar": ["ضصثقفغعهخح", "شسيبلاتنمك", "ئءؤرلاىةوز"],
    "zh": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
    "ha": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
    "ig": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
    "yo": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
    "pc": ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
}


@router.get("/layouts")
@limiter.limit("30/minute")
async def layouts(request: Request):
    return {
        "languages": LANGUAGE_DICTIONARY,
        "keymaps": {k: {"rows": v} for k, v in KEYMAPS.items()},
        "features": [
            "offline_dictionary",
            "elastic_cloud_suggest",
            "number_row",
            "emoji_panel",
            "symbols_panel",
            "clipboard_panel",
            "case_toggle",
        ],
    }


@router.get("/suggest")
@limiter.limit("60/minute")
async def suggest(
    request: Request,
    q: str = Query(""),
    lang: str = Query("en"),
):
    """Suggestion bar: synonym expand now; elastic cloud client-side + this list."""
    data = expand_synonyms(q)
    suggestions = [data["canonical"]] + data.get("synonyms", [])
    suggestions = [s for s in suggestions if s]
    return {
        "query": q,
        "lang": lang,
        "suggestions": suggestions[:8],
        "dictionary": "synonym+language",
    }
