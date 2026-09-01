"""
Crawler: lex + elastic cloud + backward perturb + relationship walk + HB.

Upgrade (same architecture):
  - Entry uses tokenizers in 3 phases: letters · words · full-text GSP place
  - Name / object walks use C=46 (local letters)
  - Place layers (country/region/city/community/…) stay C=26
  - Multi-word queries: each token feeds all three phases
"""

from __future__ import annotations

from typing import Any

from app.services.gsp_math import (
    PERTURB_D,
    PERTURB_K,
    REL_WALK_D,
    REL_WALK_K,
    backward_perturb,
    digit_sum,
    elastic_cloud,
    first_letter_index,
    name_len,
    standard_gsp,
    start_row,
)
from app.services.heartbeat import heartbeat_score
from app.services.phone import phone_digits
from app.services.relationship import band_col, lookup_cell, lookup_row
from app.services.search import haversine_km, lex_score

try:
    from app.services import token_grids as tg
except ImportError:
    tg = None

# Place hierarchy / classic letter surface
PLACE_C = 26
# Username full-name + object-title surface (local letters)
NAME_OBJECT_C = 46

WEIGHTS = {
    "country": 25,
    "region": 20,
    "city": 40,
    "community": 30,
    "primary": 15,
    "category": 50,
    "language": 10,
    "freshness": 5,
    "heartbeat": 100,
}


def identity_LSc(name: str, uid_for_s: str) -> tuple[int, int, int]:
    L = name_len(name)
    S = digit_sum(uid_for_s)
    c = first_letter_index(name)
    return L, S, c


def relationship_walk_cells(
    L: int,
    S: int,
    c: int,
    D: int = REL_WALK_D,
    K: int = 32,
    C: int = PLACE_C,
) -> list[dict]:
    """Forward relationship walk; C=26 place, C=46 name/object."""
    sr = start_row(L, S, 64)
    cells = []
    width = max(int(C), 1)
    for k in range(min(K, REL_WALK_K, 64)):
        row = ((sr - 1 + k * D) % 64) + 1
        col = (c + k) % width
        cells.append({"k": k, "col": col, "row": row, "C": width})
    return cells


# ---------------------------------------------------------------------------
# 3-phase tokenizer entry (extends crawler; does not replace gather/score)
# ---------------------------------------------------------------------------

def _phase_cells_for_token(token: dict[str, Any], lang: str) -> dict[str, list[dict]]:
    """One token → letter cells, word cell, full-text GSP cells (46-col object spine)."""
    letters_phase: list[dict] = []
    words_phase: list[dict] = []
    fulltext_phase: list[dict] = []

    original = token.get("original") or ""
    stem = token.get("stem") or original

    # Phase 1 — tokenized letters (A×1 indices, mapped into 46 for object entry)
    for li in token.get("letter") or []:
        letters_phase.append({
            "phase": "letter",
            "token": original,
            "col": int(li) % NAME_OBJECT_C,
            "row": 0,
        })

    # Phase 2 — tokenized word cell
    w = token.get("word") or {}
    wc = int(w.get("col", 0)) % NAME_OBJECT_C
    wr = int(w.get("row", 0)) % 64
    words_phase.append({
        "phase": "word",
        "token": original,
        "stem": stem,
        "col": wc,
        "row": wr if wr else 1,
    })

    # Phase 3 — full-text placement via standard GSP place (object/name width 46)
    L = max(len(stem), 1)
    S = L  # word-grid rule: word_S = L (object token path)
    c = first_letter_index(stem)
    for cell in standard_gsp(L, S, c, K=PERTURB_K, D=REL_WALK_D, C=NAME_OBJECT_C, R=64):
        fulltext_phase.append({
            "phase": "full_text_gsp",
            "token": original,
            "col": cell["col"] % NAME_OBJECT_C,
            "row": cell["row"],
            "k": cell.get("k"),
            "L": L,
            "S": S,
            "c": c,
        })

    return {
        "letters": letters_phase,
        "words": words_phase,
        "full_text_gsp": fulltext_phase,
    }


def crawl_entry(query: str, lang: str = "en") -> dict[str, Any]:
    """
    Crawler entry surface for a (possibly multi-word) query.
    Phases: tokenized letters · tokenized words · full-text GSP place.
    """
    lang = tg.normalize_lang(lang) if tg else "en"
    tokens = tg.tokenize(query, lang) if tg else []

    letters: list[dict] = []
    words: list[dict] = []
    full_text: list[dict] = []

    for tok in tokens:
        phases = _phase_cells_for_token(tok, lang)
        letters.extend(phases["letters"])
        words.extend(phases["words"])
        full_text.extend(phases["full_text_gsp"])

    # Whole-query full-text spine when more than one word (state + object, etc.)
    q = (query or "").strip()
    if q and (not tokens or len(tokens) > 1):
        L = name_len(q)
        S = L
        c = first_letter_index(q)
        for cell in standard_gsp(L, S, c, K=PERTURB_K, D=REL_WALK_D, C=NAME_OBJECT_C, R=64):
            full_text.append({
                "phase": "full_text_gsp_query",
                "token": q,
                "col": cell["col"] % NAME_OBJECT_C,
                "row": cell["row"],
                "k": cell.get("k"),
                "L": L,
                "S": S,
                "c": c,
            })

    return {
        "query": query,
        "lang": lang,
        "place_C": PLACE_C,
        "name_object_C": NAME_OBJECT_C,
        "token_count": len(tokens),
        "phases": {
            "letters": letters,
            "words": words,
            "full_text_gsp": full_text,
        },
        "tokens": tokens,
    }


def gather_related_ids(
    name: str,
    uid_for_s: str,
    category: str = "",
    city: str = "",
    query: str = "",
    lang: str = "en",
) -> set[str]:
    L, S, c = identity_LSc(name, uid_for_s)
    ids: set[str] = set()

    def absorb(entries: list[dict]) -> None:
        for e in entries:
            eid = e.get("entity_id")
            if eid:
                ids.add(str(eid))

    row = start_row(L, S, 64)
    absorb(lookup_row(row))

    # Place layers — 26
    if category:
        absorb(lookup_cell(band_col("category", category), row))
    if city:
        absorb(lookup_cell(band_col("city", city), row))

    # Name / object affinity — 46 when bands exist
    try:
        absorb(lookup_cell(band_col("name", name), row))
        absorb(lookup_cell(band_col("object", name), row))
    except Exception:
        pass

    # Backward perturb + elastic on place width (26) — unchanged brotherhood
    for cell in backward_perturb(L, S, c, K=PERTURB_K, D=PERTURB_D, C=PLACE_C, R=64):
        absorb(lookup_row(cell["row"]))

    for cell in elastic_cloud(L, S, c, radius=1, first_letter_radius=1, C=PLACE_C, R=64):
        absorb(lookup_row(cell["row"]))

    # Relationship walk — place C=26
    for cell in relationship_walk_cells(L, S, c, D=REL_WALK_D, K=32, C=PLACE_C):
        absorb(lookup_row(cell["row"]))

    # Relationship walk — name/object C=46
    for cell in relationship_walk_cells(L, S, c, D=REL_WALK_D, K=32, C=NAME_OBJECT_C):
        absorb(lookup_row(cell["row"]))

    # 3-phase tokenizer entry cells → row lookups (multi-word safe)
    if query and tg is not None:
        entry = crawl_entry(query, lang)
        for phase_name in ("letters", "words", "full_text_gsp"):
            for cell in entry.get("phases", {}).get(phase_name) or []:
                r = int(cell.get("row") or 0)
                if r > 0:
                    absorb(lookup_row(r))
                col = cell.get("col")
                if col is not None and r > 0:
                    absorb(lookup_cell(int(col), r))

    return ids


def crawl_score_product(
    query: str,
    product: Any,
    owner: Any,
    seeker_lat: float | None = None,
    seeker_lng: float | None = None,
    lang: str = "en",
) -> dict[str, Any]:
    lex = lex_score(query, product.name)
    if product.category:
        lex = max(lex, lex_score(query, product.category or "") * 0.85)

    # Tokenizer letter/word grids (multi-word + dialect)
    grid_lex = 0.0
    entry = None
    if tg is not None and query:
        lang = tg.normalize_lang(lang)
        tokens = tg.tokenize(query, lang)
        doc = f"{product.name} {product.category or ''} {getattr(owner, 'name', '')}"
        grid_lex = tg.letter_score(tokens, doc, lang) + tg.word_score(tokens, doc, lang)
        entry = crawl_entry(query, lang)

    km = None
    geo = 0.0
    if (
        seeker_lat is not None
        and seeker_lng is not None
        and getattr(owner, "lat", None) is not None
        and getattr(owner, "lng", None) is not None
    ):
        km = haversine_km(
            seeker_lat, seeker_lng, float(owner.lat), float(owner.lng)
        )
        geo = max(0.0, 50.0 - min(km, 50.0))

    hb = 0.0
    if getattr(owner, "role", None) != "buyer":
        hb = heartbeat_score(owner.hb_at) * (WEIGHTS["heartbeat"] / 100.0)

    uid = phone_digits(owner.phone)
    related = gather_related_ids(
        product.name,
        uid,
        category=product.category or "",
        city=owner.city or "",
        query=query or "",
        lang=lang,
    )
    rel = 20.0 if str(product.id) in related else 0.0
    if product.start_row:
        rel += 10.0

    place = 0.0
    ql = (query or "").lower()
    if owner.city and owner.city.lower() in ql:
        place += WEIGHTS["city"] * 0.3
    if owner.community and (owner.community or "").lower() in ql:
        place += WEIGHTS["community"] * 0.3

    total = lex + grid_lex + geo + hb + rel + place + WEIGHTS["freshness"]

    L, S, c = identity_LSc(product.name, uid)
    return {
        "score": round(total, 2),
        "lex": round(lex, 2),
        "grid_lex": round(grid_lex, 2),
        "geo": round(geo, 2),
        "hb": round(hb, 2),
        "rel": round(rel, 2),
        "km": None if km is None else round(km, 2),
        "start_row": start_row(L, S, 64),
        "elastic_cells": elastic_cloud(L, S, c, C=PLACE_C, R=64),
        "perturb_cells": backward_perturb(
            L, S, c, K=PERTURB_K, D=PERTURB_D, C=PLACE_C, R=64
        ),
        "name_object_walk": relationship_walk_cells(
            L, S, c, D=REL_WALK_D, K=16, C=NAME_OBJECT_C
        ),
        "crawl_entry": entry,
    }
