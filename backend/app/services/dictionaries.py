"""Live dictionary layer: Datamuse (+ optional Apify) + dictionaryapi.dev + local fallback."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Fallback only if providers fail
_FALLBACK_SYN = {
    "phone": ["mobile", "smartphone", "cell phone"],
    "pharmacy": ["chemist", "drug store"],
    "fuel": ["petrol", "diesel", "pms"],
    "driver": ["okada", "keke", "courier"],
}

CATEGORY_DICTIONARY = {
    "merchant": ["Retail", "Food", "Electronics", "Fashion", "Agriculture", "Pharmacy", "Fuel"],
    "service": ["Hotel", "Salon", "Clinic", "Repair", "Education", "Hospitality"],
    "driver": ["Okada", "Keke", "Van", "Courier", "Truck"],
    "emergency": ["Police", "Ambulance", "Fire", "Clinic", "Neighborhood Watch"],
    "agriculture": ["Farm", "Poultry", "Fishery", "Feed", "Produce"],
}

LANGUAGE_DICTIONARY = {
    "en": {"name": "English", "dir": "ltr"},
    "fr": {"name": "French", "dir": "ltr"},
    "de": {"name": "German", "dir": "ltr"},
    "es": {"name": "Spanish", "dir": "ltr"},
    "ar": {"name": "Arabic", "dir": "rtl"},
    "zh": {"name": "Chinese", "dir": "ltr"},
    "ha": {"name": "Hausa", "dir": "ltr"},
    "ig": {"name": "Igbo", "dir": "ltr"},
    "yo": {"name": "Yoruba", "dir": "ltr"},
    "pc": {"name": "Nigerian Pidgin", "dir": "ltr"},
}

COMMERCE_TERMS = [
    "wholesale", "retail", "pay on delivery", "walk-in", "perishable",
    "catalogue", "invoice", "receipt", "stock", "delivery",
]


async def _datamuse_synonyms(word: str) -> list[str]:
    settings = get_settings()
    word = (word or "").strip()
    if not word:
        return []

    headers = {"Accept": "application/json"}
    params: dict[str, Any] = {"rel_syn": word, "max": 12}

    # Prefer Apify endpoint if configured
    if settings.apify_datamuse_url and settings.apify_token:
        url = settings.apify_datamuse_url
        headers["Authorization"] = f"Bearer {settings.apify_token}"
        # Actor URLs vary; try query-style first
        params = {"rel_syn": word, "max": 12, "token": settings.apify_token}
    else:
        url = f"{settings.datamuse_base.rstrip('/')}/words"
        if settings.apify_token:
            # Some Apify proxies pass token as query
            params["token"] = settings.apify_token

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code >= 400:
                logger.warning("Datamuse status %s: %s", r.status_code, r.text[:200])
                return []
            data = r.json()
            if isinstance(data, list):
                return [str(item.get("word", "")) for item in data if item.get("word")]
            if isinstance(data, dict) and "words" in data:
                return [str(w) for w in data["words"]]
            return []
    except Exception as exc:
        logger.warning("Datamuse error: %s", exc)
        return []


async def _dictionary_api_entry(word: str) -> dict[str, Any]:
    settings = get_settings()
    word = (word or "").strip()
    if not word:
        return {}
    url = f"{settings.dictionary_api_base.rstrip('/')}/{word}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
            if r.status_code >= 400:
                return {}
            data = r.json()
            if isinstance(data, list) and data:
                return data[0] if isinstance(data[0], dict) else {}
            return data if isinstance(data, dict) else {}
    except Exception as exc:
        logger.warning("dictionaryapi error: %s", exc)
        return {}


async def expand_synonyms(token: str) -> dict[str, Any]:
    key = (token or "").strip().lower()
    if not key:
        return {"canonical": "", "synonyms": [], "source": "empty"}

    remote = await _datamuse_synonyms(key)
    if remote:
        return {"canonical": key, "synonyms": remote, "source": "datamuse"}

    if key in _FALLBACK_SYN:
        return {"canonical": key, "synonyms": _FALLBACK_SYN[key], "source": "fallback"}

    for canon, words in _FALLBACK_SYN.items():
        if key in words:
            return {"canonical": canon, "synonyms": words, "source": "fallback"}

    return {"canonical": key, "synonyms": [], "source": "none"}


async def define_word(word: str) -> dict[str, Any]:
    entry = await _dictionary_api_entry(word)
    meanings = []
    if entry:
        for m in entry.get("meanings") or []:
            meanings.append(
                {
                    "partOfSpeech": m.get("partOfSpeech"),
                    "definitions": [
                        d.get("definition") for d in (m.get("definitions") or [])[:3]
                    ],
                }
            )
    return {
        "word": word,
        "phonetic": entry.get("phonetic") if entry else None,
        "meanings": meanings,
        "source": "dictionaryapi" if entry else "none",
    }


def commerce_lookup(q: str) -> dict:
    ql = (q or "").lower()
    terms = [t for t in COMMERCE_TERMS if not ql or ql in t]
    return {"terms": terms, "dictionary": "commerce"}


def categories_for(business_type: str | None) -> dict:
    if business_type and business_type in CATEGORY_DICTIONARY:
        return {
            "business_type": business_type,
            "categories": CATEGORY_DICTIONARY[business_type],
        }
    return {"business_type": business_type, "categories": CATEGORY_DICTIONARY}


def languages() -> dict:
    return {"languages": LANGUAGE_DICTIONARY}
