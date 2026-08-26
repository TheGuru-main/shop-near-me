"""Word relevance first, then location proxy, then highest rank."""

from __future__ import annotations

from typing import Any

from app.services.directives import detect_directive, location_intent
from app.services.location_brotherhood import brotherhood_score, place_profile, within_max_km
from app.services.token_grids import letter_score, tokenize, word_score


def analyze_request(query: str, lang: str = "en") -> dict[str, Any]:
    directive = detect_directive(query)
    tokens = tokenize(query, lang)
    return {
        "query": query,
        "directive": directive,
        "location_focus": location_intent(directive),
        "tokens": tokens,
    }


def score_candidate(
    analysis: dict[str, Any],
    *,
    title: str,
    body: str = "",
    community: str | None = None,
    city: str | None = None,
    region: str | None = None,
    country: str | None = None,
    seeker_place: dict | None = None,
    km: float | None = None,
    max_km: float | None = 100.0,
    lex: float = 0.0,
    hb: float = 0.0,
    rel: float = 0.0,
) -> dict[str, Any] | None:
    if not within_max_km(km, max_km):
        return None

    tokens = analysis.get("tokens") or []
    lang = "en"
    doc = f"{title} {body}"
    w = word_score(tokens, doc, lang)
    letter = letter_score(tokens, doc, lang)
    word_relevance = w + letter * 0.5 + float(lex)

    seeker = seeker_place or place_profile()
    target = place_profile(community, city, region, country)
    bro, tags = brotherhood_score(seeker, target)

    # Most relevant words first (weight), location second
    total = word_relevance * 1.5 + bro * 1.2 + (max(0.0, 50.0 - km) if km is not None else 0.0) + hb + rel
    if analysis.get("location_focus"):
        total += bro * 0.5

    if word_relevance < 8 and bro < 8:
        return None

    return {
        "word_relevance": word_relevance,
        "word_score": w,
        "letter_score": letter,
        "brotherhood": bro,
        "brotherhood_tags": tags,
        "km": km,
        "total": total,
        "directive": analysis.get("directive"),
    }


def sort_key(item: dict[str, Any]) -> tuple:
    wr = item.get("word_relevance") or item.get("score_breakdown", {}).get("word_relevance") or 0
    bro = item.get("brotherhood") or item.get("brotherhood_score") or 0
    km = item.get("km")
    km = km if km is not None else 9999.0
    total = item.get("total") or item.get("score") or 0
    return (-wr, -bro, km, -total)
