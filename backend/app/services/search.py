"""Search: lex tiers + relationship row + optional geo/HB ranking."""

from __future__ import annotations

import math
from typing import Any

from app.services.heartbeat import heartbeat_score
from app.services.relationship import (
    band_col,
    lookup_cell,
    lookup_row,
    name_len,
    start_row,
    digit_sum,
)


def norm(s: str) -> str:
    return " ".join((s or "").lower().split())


def lex_score(query: str, candidate: str) -> float:
    q = norm(query)
    c = norm(candidate)
    if not q or not c:
        return 0.0
    if q == c:
        return 100.0
    qn = q.replace(" ", "")
    cn = c.replace(" ", "")
    if qn == cn:
        return 95.0
    if cn.startswith(qn) or qn.startswith(cn):
        return 80.0
    # sequential char overlap
    i = j = hits = 0
    while i < len(qn) and j < len(cn):
        if qn[i] == cn[j]:
            hits += 1
            i += 1
        j += 1
    seq = (hits / max(len(qn), 1)) * 60.0
    if qn in cn or cn in qn:
        return max(seq, 55.0)
    # fuzzy: shared prefix length
    pref = 0
    for a, b in zip(qn, cn):
        if a != b:
            break
        pref += 1
    fuzzy = (pref / max(len(qn), 1)) * 40.0
    return max(seq, fuzzy)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def rank_product_row(
    query: str,
    product: Any,
    owner: Any,
    seeker_lat: float | None = None,
    seeker_lng: float | None = None,
) -> dict[str, Any]:
    """
    Original search-module rank path (lex + geo + HB + relationship row).
    API search prefers app.services.crawler.crawl_score_product; this remains
    for any caller that still imports rank_product_row.
    """
    lex = lex_score(query, product.name)
    if product.category:
        lex = max(lex, lex_score(query, product.category) * 0.85)

    km = None
    geo = 0.0
    if (
        seeker_lat is not None
        and seeker_lng is not None
        and owner.lat is not None
        and owner.lng is not None
    ):
        km = haversine_km(seeker_lat, seeker_lng, float(owner.lat), float(owner.lng))
        # nearer is better; exact lex gets strong geo weight
        geo = max(0.0, 50.0 - min(km, 50.0))

    hb = 0.0
    if owner.role != "buyer":
        hb = heartbeat_score(owner.hb_at) * 0.5  # scale into rank

    # relationship: same start_row neighborhood
    rel = 0.0
    if product.start_row:
        cell_hits = lookup_row(int(product.start_row))
        if any(h.get("entity_id") == str(product.id) for h in cell_hits):
            rel += 15.0
        if product.category:
            col = band_col("category", product.category)
            if lookup_cell(col, int(product.start_row)):
                rel += 10.0

    total = lex + geo + hb + rel
    # exact name: prefer nearer first (boost already in geo)
    return {
        "score": round(total, 2),
        "lex": round(lex, 2),
        "geo": round(geo, 2),
        "hb": round(hb, 2),
        "rel": round(rel, 2),
        "km": None if km is None else round(km, 2),
    }
