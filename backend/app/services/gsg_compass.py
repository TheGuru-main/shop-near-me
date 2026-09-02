"""
GSG compass + crow-fly proximity + ETA stub.
No OSRM / road graph — that waits for dedicated server.
"""
from __future__ import annotations

import math
from typing import Any

from app.services.gsg import gsg_at

# Rough urban movement assumption for stub ETA only (not traffic).
DEFAULT_SPEED_KMH = 25.0

OCTANTS = (
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
)


def haversine_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def bearing_deg(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Initial bearing seeker → target, degrees [0, 360)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    x = math.sin(dlam) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(
        phi2
    ) * math.cos(dlam)
    theta = math.degrees(math.atan2(x, y))
    return (theta + 360.0) % 360.0


def compass_octant(bearing: float) -> str:
    """8-wind compass from bearing degrees."""
    ix = int((bearing + 22.5) // 45) % 8
    return OCTANTS[ix]


def eta_stub_min(
    km: float | None, speed_kmh: float = DEFAULT_SPEED_KMH
) -> int | None:
    """
    Crow-fly time band only. Not road ETA, not traffic.
    null if distance unknown.
    """
    if km is None or km < 0 or speed_kmh <= 0:
        return None
    minutes = (float(km) / speed_kmh) * 60.0
    return max(1, int(round(minutes)))


def gsg_delta(
    seeker_lat: float,
    seeker_lng: float,
    target_lat: float,
    target_lng: float,
) -> dict[str, Any]:
    a = gsg_at(seeker_lat, seeker_lng)
    b = gsg_at(target_lat, target_lng)
    return {
        "seeker": a,
        "target": b,
        "d_gsg_x": int(b["gsg_x"] - a["gsg_x"]),
        "d_gsg_y": int(b["gsg_y"] - a["gsg_y"]),
        "same_cell": a["gsg_x"] == b["gsg_x"] and a["gsg_y"] == b["gsg_y"],
    }


def proximity(
    seeker_lat: float | None,
    seeker_lng: float | None,
    target_lat: float | None,
    target_lng: float | None,
    *,
    speed_kmh: float = DEFAULT_SPEED_KMH,
) -> dict[str, Any]:
    """
    Full proximity block for search cards / map line.
    """
    empty = {
        "km": None,
        "bearing_deg": None,
        "compass": None,
        "eta_min": None,
        "eta_mode": "none",
        "gsg": None,
    }
    if (
        seeker_lat is None
        or seeker_lng is None
        or target_lat is None
        or target_lng is None
    ):
        return empty

    try:
        slat, slng = float(seeker_lat), float(seeker_lng)
        tlat, tlng = float(target_lat), float(target_lng)
    except (TypeError, ValueError):
        return empty

    km = round(haversine_km(slat, slng, tlat, tlng), 2)
    brg = round(bearing_deg(slat, slng, tlat, tlng), 1)
    compass = compass_octant(brg)
    eta = eta_stub_min(km, speed_kmh)

    return {
        "km": km,
        "bearing_deg": brg,
        "compass": compass,
        "eta_min": eta,
        "eta_mode": "crow_fly_stub",  # never "osrm" / "traffic" here
        "gsg": gsg_delta(slat, slng, tlat, tlng),
    }
