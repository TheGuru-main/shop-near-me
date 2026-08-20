"""
220 x 64 relationship grid.
start_row = ((L + S - 1) % 64) + 1

Columns: stacked a-z bands of 26 (not one shared col for all entities).
  0-25    country
  26-51   region
  52-77   city
  78-103  community
  104-129 primary
  130-155 category
  156-181 cluster
  182-207 language
"""

from typing import Any

REL_ROWS = 64
REL_COLS = 220
BAND = 26

LAYER_BASE = {
    "country": 0,
    "region": 26,
    "city": 52,
    "community": 78,
    "primary": 104,
    "category": 130,
    "cluster": 156,
    "language": 168,  # within 182-207 preferred; 168 locked earlier — clamp to band
}

# Normalize language into band starting 182 if you prefer strict 8th band:
# "language": 182,

_INDEX: dict[str, list[dict[str, Any]]] = {}


def digit_sum(n: int | str) -> int:
    return sum(int(ch) for ch in str(n) if ch.isdigit())


def norm_name(s: str) -> str:
    return "".join((s or "").split()).lower()


def name_len(s: str) -> int:
    return len(norm_name(s)) or 1


def first_letter_index(s: str) -> int:
    n = norm_name(s)
    if not n or not ("a" <= n[0] <= "z"):
        return 0
    return ord(n[0]) - ord("a")


def start_row(L: int, S: int, R: int = REL_ROWS) -> int:
    return ((L + S - 1) % R) + 1


def band_col(layer: str, label: str) -> int:
    """Map label into its layer band: base + (0..25)."""
    base = LAYER_BASE.get(layer, 0)
    # language base 168 sits inside 156-181 in old lock; keep letter in 0-25 of its base
    idx = first_letter_index(label)
    col = base + idx
    if col >= REL_COLS:
        col = REL_COLS - 1
    return col


def register_entity(
    entity_type: str,
    entity_id: str,
    name: str,
    uid_for_s: str,
    country: str = "",
    region: str = "",
    city: str = "",
    community: str = "",
    primary_location: str = "",
    category: str = "",
    cluster: str = "",
    language: str = "",
    extra: dict | None = None,
) -> dict:
    L = name_len(name)
    S = digit_sum(uid_for_s)
    row = start_row(L, S)

    layers: list[tuple[str, str]] = []
    if country:
        layers.append(("country", country))
    if region:
        layers.append(("region", region))
    if city:
        layers.append(("city", city))
    if community:
        layers.append(("community", community))
    if primary_location:
        layers.append(("primary", primary_location))
    if category:
        layers.append(("category", category))
    if cluster:
        layers.append(("cluster", cluster))
    if language:
        layers.append(("language", language))
    # name also lands in category-adjacent letter via name's own letter on country band optional:
    layers.append(("country", name))  # name letter on 0-25 band for name affinity

    cells = []
    seen: set[str] = set()
    for layer, label in layers:
        col = band_col(layer, label)
        ck = f"{col}:{row}"
        if ck in seen:
            continue
        seen.add(ck)
        ref = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "name": name,
            "col": col,
            "row": row,
            "layer": layer,
            "label": label,
            **(extra or {}),
        }
        _INDEX.setdefault(ck, []).append(ref)
        cells.append({"col": col, "row": row, "layer": layer})

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "L": L,
        "S": S,
        "start_row": row,
        "cells": cells,
    }


def lookup_cell(col: int, row: int) -> list[dict[str, Any]]:
    return list(_INDEX.get(f"{col}:{row}", []))


def lookup_row(row: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for c in range(REL_COLS):
        out.extend(_INDEX.get(f"{c}:{row}", []))
    return out


def lookup_layer_letter(layer: str, label: str, row: int) -> list[dict[str, Any]]:
    col = band_col(layer, label)
    return lookup_cell(col, row)


def lookup_by_name(name: str, uid_for_s: str) -> list[dict[str, Any]]:
    L = name_len(name)
    S = digit_sum(uid_for_s)
    row = start_row(L, S)
    return lookup_row(row)
