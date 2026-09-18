"""Live dictionary layer: local seed + Datamuse (+ optional Apify) + dictionaryapi.dev."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Local commerce seed (always wins for matching keys; fills gaps when remote fails)
# ---------------------------------------------------------------------------
SEED_LEXICON: dict[str, dict[str, Any]] = {
    "rice": {
        "synonyms": [
            "ofada", "paddy", "grain", "fried rice", "jollof", "food", "bag of rice",
        ],
        "categories": ["Food", "Groceries"],
        "gloss": "Staple grain; sold in measures or bags.",
    },
    "beans": {
        "synonyms": ["ewa", "oily bean", "protein", "honey beans", "food"],
        "categories": ["Food", "Groceries"],
        "gloss": "Legume staple; common market food item.",
    },
    "oil": {
        "synonyms": [
            "vegetable oil", "palm oil", "groundnut oil", "cooking oil",
        ],
        "categories": ["Food", "Groceries"],
        "gloss": "Cooking oil sold by bottle or gallon.",
    },
    "bread": {
        "synonyms": ["agege bread", "loaf", "sliced bread", "bakery"],
        "categories": ["Food", "Groceries"],
        "gloss": "Bakery staple.",
    },
    "water": {
        "synonyms": ["pure water", "sachet", "bottle water", "table water"],
        "categories": ["Groceries", "Food"],
        "gloss": "Drinking water — sachet or bottled.",
    },
    "gas": {
        "synonyms": ["cooking gas", "lpg", "cylinder", "refill"],
        "categories": ["Groceries", "Utilities"],
        "gloss": "LPG cooking gas refill or cylinder.",
    },
    "phone": {
        "synonyms": [
            "mobile", "handset", "smartphone", "cell phone", "iphone", "android",
            "electronics",
        ],
        "categories": ["Electronics"],
        "gloss": "Mobile handset or phone accessory.",
    },
    "hotel": {
        "synonyms": [
            "lodge", "guest house", "short-let", "room", "hospitality", "bnb",
        ],
        "categories": ["Hospitality", "Services"],
        "gloss": "Lodging or short-stay room.",
    },
    "ride": {
        "synonyms": [
            "driver", "cab", "keke", "okada", "logistics", "delivery", "transport",
        ],
        "categories": ["Logistics", "Services"],
        "gloss": "Transport or delivery ride.",
    },
    "driver": {
        "synonyms": ["okada", "keke", "courier", "ride", "logistics", "van"],
        "categories": ["Logistics"],
        "gloss": "Driver or conveyance unit.",
    },
    "fashion": {
        "synonyms": [
            "clothes", "wear", "shirt", "trouser", "okirika", "boutique",
        ],
        "categories": ["Fashion"],
        "gloss": "Clothing and wear.",
    },
    "pharmacy": {
        "synonyms": [
            "chemist", "drug", "medicine", "drug store", "hospital", "clinic",
        ],
        "categories": ["Pharmacy", "Services"],
        "gloss": "Medicine and chemist goods.",
    },
    "perishable": {
        "synonyms": [
            "fruit", "vegetable", "tomato", "pepper", "fish", "meat", "food",
        ],
        "categories": ["Food"],
        "gloss": "Fresh food with short shelf life.",
    },
    "food": {
        "synonyms": [
            "eatery", "restaurant", "kitchen", "meal", "rice", "beans", "oil",
            "bread", "indomie", "yam", "egg", "fish", "meat", "snacks",
        ],
        "categories": ["Food", "Groceries"],
        "gloss": "Edible goods and meals.",
    },
    "groceries": {
        "synonyms": ["rice", "beans", "oil", "bread", "water", "gas", "provisions"],
        "categories": ["Groceries", "Food"],
        "gloss": "Household provisions.",
    },
    "fuel": {
        "synonyms": ["petrol", "diesel", "pms", "filling station"],
        "categories": ["Fuel"],
        "gloss": "Motor fuel.",
    },
    "cement": {
        "synonyms": ["building materials", "iron", "gravel", "block"],
        "categories": ["Building materials"],
        "gloss": "Construction material.",
    },
    "hair": {
        "synonyms": ["salon", "braid", "wig", "barbing", "beauty"],
        "categories": ["Services", "Fashion"],
        "gloss": "Hair or beauty service / product.",
    },
    "service": {
        "synonyms": [
            "plumber", "electrician", "carpenter", "mechanic", "cleaner", "repair",
        ],
        "categories": ["Services"],
        "gloss": "Local skilled service.",
    },
}

# Tiny extra fallback if seed + remote both empty
_FALLBACK_SYN = {
    "phone": ["mobile", "smartphone", "cell phone"],
    "pharmacy": ["chemist", "drug store"],
    "fuel": ["petrol", "diesel", "pms"],
    "driver": ["okada", "keke", "courier"],
}

CATEGORY_DICTIONARY = {
    "merchant": [
        "Retail", "Food", "Electronics", "Fashion", "Agriculture", "Pharmacy", "Fuel",
    ],
    "service": [
        "Hotel", "Salon", "Clinic", "Repair", "Education", "Hospitality",
    ],
    "driver": ["Okada", "Keke", "Van", "Courier", "Truck"],
    "emergency": [
        "Police", "Ambulance", "Fire", "Clinic", "Neighborhood Watch",
    ],
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
    "wholesale",
    "retail",
    "pay on delivery",
    "walk-in",
    "perishable",
    "catalogue",
    "invoice",
    "receipt",
    "stock",
    "delivery",
]


def seed_words() -> list[str]:
    return sorted(SEED_LEXICON.keys())


def search_seeds(q: str) -> dict[str, Any]:
    q = (q or "").strip().lower()
    if not q:
        return {"synonyms": [], "categories": [], "hits": [], "gloss": None}

    hits: list[str] = []
    syns: list[str] = []
    cats: list[str] = []
    gloss = None

    for key, meta in SEED_LEXICON.items():
        bag = [key] + [str(s).lower() for s in (meta.get("synonyms") or [])]
        matched = (
            q == key
            or q in bag
            or any(len(q) >= 3 and (q in s or s in q) for s in bag)
        )
        if matched:
            hits.append(key)
            syns.extend(meta.get("synonyms") or [])
            cats.extend(meta.get("categories") or [])
            if gloss is None:
                gloss = meta.get("gloss")

    syns = list(dict.fromkeys([*syns, *hits]))
    cats = list(dict.fromkeys(cats))
    return {
        "synonyms": syns,
        "categories": cats,
        "hits": hits,
        "gloss": gloss,
    }


async def _datamuse_synonyms(word: str) -> list[str]:
    settings = get_settings()
    word = (word or "").strip()
    if not word:
        return []

    headers = {"Accept": "application/json"}
    params: dict[str, Any] = {"rel_syn": word, "max": 12}

    if settings.apify_datamuse_url and settings.apify_token:
        url = settings.apify_datamuse_url
        headers["Authorization"] = f"Bearer {settings.apify_token}"
        params = {"rel_syn": word, "max": 12, "token": settings.apify_token}
    else:
        url = f"{settings.datamuse_base.rstrip('/')}/words"
        if settings.apify_token:
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

    local = search_seeds(key)
    local_syns = list(local.get("synonyms") or [])

    remote = await _datamuse_synonyms(key)
    merged = list(dict.fromkeys([*local_syns, *remote]))

    if merged:
        source = "local+datamuse" if local_syns and remote else (
            "local" if local_syns else "datamuse"
        )
        return {
            "canonical": (local.get("hits") or [key])[0],
            "synonyms": merged[:40],
            "categories": local.get("categories") or [],
            "source": source,
        }

    if key in _FALLBACK_SYN:
        return {
            "canonical": key,
            "synonyms": _FALLBACK_SYN[key],
            "source": "fallback",
        }

    for canon, words in _FALLBACK_SYN.items():
        if key in words:
            return {
                "canonical": canon,
                "synonyms": words,
                "source": "fallback",
            }

    return {"canonical": key, "synonyms": [], "source": "none"}


async def define_word(word: str) -> dict[str, Any]:
    entry = await _dictionary_api_entry(word)
    meanings: list[dict[str, Any]] = []
    if entry:
        for m in entry.get("meanings") or []:
            meanings.append(
                {
                    "partOfSpeech": m.get("partOfSpeech"),
                    "definitions": [
                        d.get("definition")
                        for d in (m.get("definitions") or [])[:3]
                    ],
                }
            )

    local = search_seeds(word)
    if not meanings and local.get("gloss"):
        meanings = [
            {
                "partOfSpeech": "noun",
                "definitions": [local["gloss"]],
            }
        ]
        return {
            "word": word,
            "phonetic": None,
            "meanings": meanings,
            "source": "local_seed",
        }

    return {
        "word": word,
        "phonetic": entry.get("phonetic") if entry else None,
        "meanings": meanings,
        "source": "dictionaryapi" if entry else "none",
    }


def commerce_lookup(q: str) -> dict[str, Any]:
    ql = (q or "").strip().lower()
    terms = [t for t in COMMERCE_TERMS if not ql or ql in t]
    local = search_seeds(ql) if ql else {
        "synonyms": [],
        "categories": [],
        "gloss": None,
    }
    related = list(
        dict.fromkeys([*(local.get("synonyms") or []), *terms])
    )[:40]
    return {
        "dictionary": "commerce",
        "terms": terms,
        "related": related,
        "categories": local.get("categories") or [],
        "gloss": local.get("gloss"),
    }


def categories_for(business_type: str | None) -> dict[str, Any]:
    if business_type and business_type in CATEGORY_DICTIONARY:
        return {
            "business_type": business_type,
            "categories": CATEGORY_DICTIONARY[business_type],
        }
    return {"business_type": business_type, "categories": CATEGORY_DICTIONARY}


def languages() -> dict[str, Any]:
    return {"languages": LANGUAGE_DICTIONARY}