"""
Persistent search cache (no TTL).

Stores full response payloads keyed by query fingerprint.
Also appends training rows for CoMpaNeoN-AI (JSONL).

Disk:
  backend/data/search_cache.json     — key → payload
  backend/data/companion_train.jsonl — one training example per miss write
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()

# backend/data relative to this file: services/ → app/ → backend/
_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_CACHE_PATH = _DATA_DIR / "search_cache.json"
_TRAIN_PATH = _DATA_DIR / "companion_train.jsonl"

_MEM: dict[str, Any] = {}
_LOADED = False


def _ensure_dir() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load() -> None:
    global _LOADED, _MEM
    if _LOADED:
        return
    _ensure_dir()
    if _CACHE_PATH.is_file():
        try:
            with open(_CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                _MEM = data
        except Exception:
            _MEM = {}
    _LOADED = True


def _save() -> None:
    _ensure_dir()
    tmp = _CACHE_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(_MEM, f, ensure_ascii=False, default=str)
    os.replace(tmp, _CACHE_PATH)


def make_key(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cache_get(payload: dict[str, Any]) -> Any | None:
    """Return cached response or None. No expiry."""
    with _LOCK:
        _load()
        row = _MEM.get(make_key(payload))
        if not row:
            return None
        # row = { "stored_at", "response" }
        if isinstance(row, dict) and "response" in row:
            return row["response"]
        return row


def cache_set(
    payload: dict[str, Any],
    response: Any,
    *,
    train: bool = True,
    train_extra: dict[str, Any] | None = None,
) -> None:
    """
    Persist response forever (until process deletes key / file cleared).
    train=True also appends a CoMpaNeoN training line.
    """
    key = make_key(payload)
    stored_at = time.time()
    with _LOCK:
        _load()
        _MEM[key] = {
            "stored_at": stored_at,
            "request": payload,
            "response": response,
        }
        _save()
        if train:
            _append_train(key, payload, response, train_extra, stored_at)


def _append_train(
    key: str,
    request: dict[str, Any],
    response: Any,
    extra: dict[str, Any] | None,
    stored_at: float,
) -> None:
    _ensure_dir()
    resp = response if isinstance(response, dict) else {"value": response}
    record = {
        "id": key,
        "stored_at": stored_at,
        "source": "shop-near-me-search",
        "request": request,
        "query": request.get("q") or request.get("query") or "",
        "lang": request.get("lang") or "en",
        "directive": resp.get("directive"),
        "token_count": resp.get("token_count"),
        "crawl_entry": resp.get("crawl_entry"),
        "seeker_place": resp.get("seeker_place"),
        "synonym_extra": resp.get("synonym_extra"),
        "commerce_hint": resp.get("commerce_hint"),
        "result_count": resp.get("count"),
        "top_results": (resp.get("results") or [])[:5],
        "assistant": resp.get("assistant"),
        "score_samples": [
            {
                "name": (r.get("product") or {}).get("name") or r.get("name"),
                "score": r.get("score"),
                "breakdown": r.get("score_breakdown"),
                "km": r.get("km"),
                "brotherhood": r.get("brotherhood_score"),
            }
            for r in (resp.get("results") or [])[:5]
        ],
        "extra": extra or {},
    }
    with open(_TRAIN_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


def cache_stats() -> dict[str, Any]:
    with _LOCK:
        _load()
        return {
            "entries": len(_MEM),
            "ttl": None,
            "persistent": True,
            "cache_path": str(_CACHE_PATH),
            "train_path": str(_TRAIN_PATH),
            "train_exists": _TRAIN_PATH.is_file(),
        }


def cache_clear() -> int:
    """Admin/maintenance only."""
    with _LOCK:
        _load()
        n = len(_MEM)
        _MEM.clear()
        _save()
        return n
