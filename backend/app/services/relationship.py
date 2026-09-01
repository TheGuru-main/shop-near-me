"""
220+ relationship grid (Shop Near Me).
start_row = ((L + S - 1) % 64) + 1

Place layers (country → language): width 26
Name + object layers: width 46 (local-letter mapping)

  country     0–25
  region     26–51
  city       52–77
  community  78–103
  primary   104–129
  category  130–155
  cluster   156–181   (26, optional)
  language  182–207   (26)
  name      156–201   (46) — username / full name
  object    202–247   (46) — product / listing spine
"""

from typing import Any

REL_ROWS = 64
REL_COLS = 248
BAND = 26
NAME_OBJECT_BAND = 46

LAYER_BASE = {
    "country": 0,
    "region": 26,
    "city": 52,
    "community": 78,
    "primary": 104,
    "category": 130,
    "cluster": 156,
    "language": 182,
    "name": 156,
    "object": 202,
}

LAYER_WIDTH = {
    "country": 26,
    "region": 26,
    "city": 26,
    "community": 26,
    "primary": 26,
    "category": 26,
    "cluster": 26,
    "language": 26,
    "name": 46,
    "object": 46,
}

_INDEX: dict[str, list[dict[str, Any]]] = {}


def digit_sum(n: int | str) -> int:
    return sum(int(ch) for ch in str(n) if ch.isdigit())


def norm_name(s: str) -> str:
    return "".join((s or "").split()).lower()


def name_len(s: str) -> int:
    return len(norm_name(s)) or 1


def first_letter_index(s: str) -> int:
    n = norm_name(s)
    if not n:
        return 0
    if "a" <= n[0] <= "z":
        return ord(n[0]) - ord("a")
    return ord(n[0]) % NAME_OBJECT_BAND


def start_row(L: int, S: int, R: int = REL_ROWS) -> int:
    return ((L + S - 1) % R) + 1


def band_col(layer: str, label: str) -> int:
    """Map label into its layer band: base + (0 .. width-1)."""
    base = LAYER_BASE.get(layer, 0)
    width = LAYER_WIDTH.get(layer, BAND)
    n = norm_name(label)
    if n and "a" <= n[0] <= "z":
        idx = (ord(n[0]) - ord("a")) % width
    elif n:
        idx = ord(n[0]) % width
    else:
        idx = 0
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
    object_name: str | None = None,
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

    # Username / full name — 46
    if name:
        layers.append(("name", name))

    # Object spine — 46 (explicit object_name, or product/object entity name)
    title = object_name or (
        name if entity_type in {"product", "object"} else ""
    )
    if title:
        layers.append(("object", title))

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
