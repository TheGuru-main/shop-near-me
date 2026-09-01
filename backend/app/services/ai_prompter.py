"""
Grid + tokenizer → short promo messages for search/news.
Does not re-rank. Falls back to templates if Gemini/HF fail.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _template_search(ctx: dict[str, Any]) -> str:
    q = ctx.get("query") or "your search"
    n = int(ctx.get("result_count") or 0)
    km = ctx.get("max_km") or 100
    place = ctx.get("place_hint") or ""
    if n <= 0:
        return (
            f"No strong object match for “{q}” within {km} km"
            + (f" near {place}" if place else "")
            + ". Try a broader term or nearby community."
        )
    top = ctx.get("top_name") or "local listings"
    return (
        f"Top matches for “{q}”"
        + (f" near {place}" if place else "")
        + f" — showing {n} result(s), led by {top}, "
        f"ordered by item match, place brotherhood, distance, then live shops."
    )


def _template_news(ctx: dict[str, Any]) -> str:
    cat = ctx.get("category") or "business"
    n = int(ctx.get("result_count") or 0)
    return f"{cat.title()} brief: {n} update(s) tied to your sector focus."


def build_search_context(
    query: str,
    results: list[dict],
    crawl_entry: dict | None,
    seeker_place: dict | None,
    max_km: float | None,
    directive: str = "general",
) -> dict[str, Any]:
    raw = (seeker_place or {}).get("raw") or {}
    place_hint = ", ".join(
        p for p in [raw.get("community"), raw.get("city"), raw.get("region")] if p
    )
    top = results[0] if results else {}
    product = (top.get("product") or {}) if top else {}
    phases = (crawl_entry or {}).get("phases") or {}
    return {
        "query": query,
        "directive": directive,
        "result_count": len(results),
        "max_km": max_km,
        "place_hint": place_hint,
        "top_name": product.get("name") or top.get("name"),
        "token_count": (crawl_entry or {}).get("token_count"),
        "phase_letter_n": len(phases.get("letters") or []),
        "phase_word_n": len(phases.get("words") or []),
        "phase_gsp_n": len(phases.get("full_text_gsp") or []),
        "score_breakdown": (top.get("score_breakdown") or {}) if top else {},
    }


async def _gemini(prompt: str) -> str | None:
    settings = get_settings()
    key = getattr(settings, "gemini_api_key", "") or ""
    if not key:
        return None
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash:generateContent"
    )
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.post(
                url,
                params={"key": key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.4,
                        "maxOutputTokens": 120,
                    },
                },
            )
            if r.status_code != 200:
                logger.warning("gemini %s %s", r.status_code, r.text[:200])
                return None
            data = r.json()
            parts = (
                data.get("candidates")
                or [{}]
            )[0].get("content", {}).get("parts") or []
            text = (parts[0].get("text") if parts else "") or ""
            return text.strip() or None
    except Exception as exc:
        logger.warning("gemini error: %s", exc)
        return None


async def _huggingface(prompt: str) -> str | None:
    settings = get_settings()
    token = getattr(settings, "huggingface_api_token", "") or ""
    model = getattr(
        settings,
        "huggingface_model",
        "mistralai/Mistral-7B-Instruct-v0.2",
    )
    if not token:
        return None
    url = f"https://api-inference.huggingface.co/models/{model}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "inputs": prompt,
                    "parameters": {
                        "max_new_tokens": 100,
                        "temperature": 0.4,
                        "return_full_text": False,
                    },
                },
            )
            if r.status_code != 200:
                logger.warning("hf %s %s", r.status_code, r.text[:200])
                return None
            data = r.json()
            if isinstance(data, list) and data:
                return (data[0].get("generated_text") or "").strip() or None
            if isinstance(data, dict):
                return (data.get("generated_text") or "").strip() or None
            return None
    except Exception as exc:
        logger.warning("hf error: %s", exc)
        return None


def _prompt_search(ctx: dict[str, Any]) -> str:
    return (
        "You are Shop Near Me assistant. One or two short sentences. "
        "Do not invent shops or prices. Use only this context.\n"
        f"Context: {ctx}\n"
        "Explain ranking focus: item match, place brotherhood, distance, live shops."
    )


def _prompt_news(ctx: dict[str, Any]) -> str:
    return (
        "You are Shop Near Me sector desk. One short briefing sentence. "
        "No invented facts beyond context.\n"
        f"Context: {ctx}"
    )


async def promote_search(ctx: dict[str, Any]) -> dict[str, Any]:
    prompt = _prompt_search(ctx)
    text = await _gemini(prompt)
    source = "gemini"
    if not text:
        text = await _huggingface(prompt)
        source = "huggingface"
    if not text:
        text = _template_search(ctx)
        source = "template"
    return {"message": text, "source": source, "context_used": {
        "query": ctx.get("query"),
        "result_count": ctx.get("result_count"),
        "place_hint": ctx.get("place_hint"),
        "token_count": ctx.get("token_count"),
        "phases": {
            "letter": ctx.get("phase_letter_n"),
            "word": ctx.get("phase_word_n"),
            "full_text_gsp": ctx.get("phase_gsp_n"),
        },
    }}


async def promote_news(ctx: dict[str, Any]) -> dict[str, Any]:
    prompt = _prompt_news(ctx)
    text = await _gemini(prompt)
    source = "gemini"
    if not text:
        text = await _huggingface(prompt)
        source = "huggingface"
    if not text:
        text = _template_news(ctx)
        source = "template"
    return {"message": text, "source": source, "mode": "analyze_suggest_followup",
        "context_used": {
            "category": ctx.get("category"),
            "result_count": ctx.get("result_count"),
            "headlines": ctx.get("headlines"),
            "place_hint": ctx.get("place_hint"),
            "related_query": ctx.get("related_query"),
        },
    }
