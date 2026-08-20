"""
Crawler: lex + elastic cloud + backward perturb + relationship walk + HB.
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
    start_row,
)
from app.services.heartbeat import heartbeat_score
from app.services.phone import phone_digits
from app.services.relationship import band_col, lookup_cell, lookup_row
from app.services.search import haversine_km, lex_score

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
    L: int, S: int, c: int, D: int = REL_WALK_D, K: int = 32
) -> list[dict]:
    sr = start_row(L, S, 64)
    cells = []
    for k in range(min(K, REL_WALK_K, 64)):
        row = ((sr - 1 + k * D) % 64) + 1
        col = (c + k) % 26
        cells.append({"k": k, "col": col, "row": row})
    return cells


def gather_related_ids(
    name: str,
    uid_for_s: str,
    category: str = "",
    city: str = "",
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

    if category:
        absorb(lookup_cell(band_col("category", category), row))
    if city:
        absorb(lookup_cell(band_col("city", city), row))

    for cell in backward_perturb(L, S, c, K=PERTURB_K, D=PERTURB_D, C=26, R=64):
        absorb(lookup_row(cell["row"]))

    for cell in elastic_cloud(L, S, c, radius=1, first_letter_radius=1, C=26, R=64):
        absorb(lookup_row(cell["row"]))

    for cell in relationship_walk_cells(L, S, c, D=REL_WALK_D, K=32):
        absorb(lookup_row(cell["row"]))

    return ids


def crawl_score_product(
    query: str,
    product: Any,
    owner: Any,
    seeker_lat: float | None = None,
    seeker_lng: float | None = None,
) -> dict[str, Any]:
    lex = lex_score(query, product.name)
    if product.category:
        lex = max(lex, lex_score(query, product.category or "") * 0.85)

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

    total = lex + geo + hb + rel + place + WEIGHTS["freshness"]

    L, S, c = identity_LSc(product.name, uid)
    return {
        "score": round(total, 2),
        "lex": round(lex, 2),
        "geo": round(geo, 2),
        "hb": round(hb, 2),
        "rel": round(rel, 2),
        "km": None if km is None else round(km, 2),
        "start_row": start_row(L, S, 64),
        "elastic_cells": elastic_cloud(L, S, c),
        "perturb_cells": backward_perturb(L, S, c, K=PERTURB_K, D=PERTURB_D),
    }

