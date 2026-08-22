"""
Priority support grid: 1 column x 2 rows (earlier | latest).
FIFO by payment_at. Scope = city + community (local morning front-row, not global ads).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# key: "city|community" -> ordered FIFO list
_QUEUES: dict[str, list[dict[str, Any]]] = {}


def _bucket(city: str, community: str) -> str:
    return f"{(city or '').strip().lower()}|{(community or '').strip().lower()}"


def subscribe_priority(
    user_id: str,
    city: str,
    community: str,
    payment_at: datetime | None = None,
) -> dict[str, Any]:
    payment_at = payment_at or datetime.now(timezone.utc)
    if payment_at.tzinfo is None:
        payment_at = payment_at.replace(tzinfo=timezone.utc)

    key = _bucket(city, community)
    q = [x for x in _QUEUES.get(key, []) if str(x.get("user_id")) != str(user_id)]
    q.append(
        {
            "user_id": str(user_id),
            "payment_at": payment_at.isoformat(),
            "city": city or "",
            "community": community or "",
        }
    )
    q.sort(key=lambda x: x["payment_at"])  # FIFO: earlier payment first
    _QUEUES[key] = q

    position = next(i for i, x in enumerate(q) if x["user_id"] == str(user_id))
    return {
        "grid": "1x2",
        "rows": {"earlier": 1, "latest": 2},
        "position": position,
        "queue_size": len(q),
        "scope": {"city": city or "", "community": community or ""},
        "user_id": str(user_id),
    }


def front_row_ids(city: str, community: str) -> list[str]:
    """Ordered user ids for local front-row boost (FIFO)."""
    key = _bucket(city, community)
    return [str(x["user_id"]) for x in _QUEUES.get(key, [])]


def cancel_priority(user_id: str, city: str, community: str) -> bool:
    key = _bucket(city, community)
    q = _QUEUES.get(key, [])
    nq = [x for x in q if str(x.get("user_id")) != str(user_id)]
    _QUEUES[key] = nq
    return len(nq) != len(q)


def queue_snapshot(city: str, community: str) -> dict[str, Any]:
    key = _bucket(city, community)
    q = list(_QUEUES.get(key, []))
    return {
        "scope": {"city": city or "", "community": community or ""},
        "queue_size": len(q),
        "entries": q,
    }
