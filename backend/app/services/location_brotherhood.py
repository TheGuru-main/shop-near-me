

from typing import Any

DEFAULT_MAX_KM = 100.0
PLACE_BANDS = ("community", "city", "region", "country")


def _norm(s: str | None) -> str:
    return "".join((s or "").split()).lower()


def first_letter_index(s: str | None) -> int:
    n = _norm(s)
    if not n or not ("a" <= n[0] <= "z"):
        return 0
    return ord(n[0]) - ord("a")


def permanent_place_box(band: str, name: str | None) -> dict[str, Any]:
    idx = first_letter_index(name)
    key = _norm(name)
    return {
        "band": band,
        "letter_index": idx,
        "key": key,
        "box_id": f"{band}:{idx}:{key}" if key else f"{band}:{idx}",
    }


def place_profile(
    community: str | None = None,
    city: str | None = None,
    region: str | None = None,
    country: str | None = None,
) -> dict[str, Any]:
    return {
        "community": permanent_place_box("community", community),
        "city": permanent_place_box("city", city),
        "region": permanent_place_box("region", region),
        "country": permanent_place_box("country", country),
        "raw": {
            "community": community or "",
            "city": city or "",
            "region": region or "",
            "country": country or "",
        },
    }


def brotherhood_score(seeker: dict, target: dict) -> tuple[float, list[str]]:
    score = 0.0
    tags: list[str] = []
    weights = {"community": 40.0, "city": 28.0, "region": 16.0, "country": 8.0}
    for band in PLACE_BANDS:
        a, b = seeker.get(band) or {}, target.get(band) or {}
        if a.get("key") and a.get("key") == b.get("key"):
            score += weights[band]
            tags.append(f"{band}:exact")
        elif a.get("key") and b.get("key") and a.get("letter_index") == b.get("letter_index"):
            score += weights[band] * 0.15
            tags.append(f"{band}:letter")
    return score, tags


def within_max_km(km: float | None, max_km: float | None) -> bool:
    if max_km is None or km is None:
        return True
    return km <= max_km
