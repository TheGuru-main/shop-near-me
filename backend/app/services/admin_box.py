
"""Permanent Shop Near Me admin box + durable contact inbox (Postgres)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

ADMIN_NAME = "shop-near-me-admin"
ADMIN_UID = "550198550199"


def _digit_sum(uid: str) -> int:
    return sum(int(ch) for ch in str(uid) if ch.isdigit())


ADMIN_S = _digit_sum(ADMIN_UID)  # 57
ADMIN_L = len(ADMIN_NAME)  # 18
ADMIN_C = ord("s") - ord("a")  # 18
ADMIN_START_ROW = ((ADMIN_L + ADMIN_S - 1) % 64) + 1  # 11

# Process-local fallback only
ADMIN_INBOX: list = []


def admin_public() -> dict:
    return {
        "uid": ADMIN_UID,
        "name": ADMIN_NAME,
        "L": ADMIN_L,
        "S": ADMIN_S,
        "c": ADMIN_C,
        "start_row": ADMIN_START_ROW,
        "identity_tag": f"[ {ADMIN_S}[ {ADMIN_UID} ]",
        "role": "admin",
        "permanent": True,
    }


def _engine():
    from sqlalchemy import create_engine
    from app.config import get_settings

    url = get_settings().database_url
    return create_engine(url, pool_pre_ping=True)


def ensure_inbox_table() -> None:
    from sqlalchemy import text

    eng = _engine()
    with eng.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS admin_contact_inbox (
                  id BIGSERIAL PRIMARY KEY,
                  body TEXT NOT NULL,
                  context VARCHAR(64),
                  from_name VARCHAR(255),
                  from_phone VARCHAR(64),
                  from_start_row INTEGER,
                  to_uid VARCHAR(64),
                  to_start_row INTEGER,
                  is_premium_payment BOOLEAN DEFAULT FALSE,
                  created_at TIMESTAMPTZ DEFAULT NOW(),
                  payload JSONB
                )
                """
            )
        )


def inbox_append(entry: dict) -> dict:
    """Write contact message to Postgres (+ memory + Redis if available)."""
    entry = dict(entry or {})
    entry.setdefault(
        "created_at", datetime.now(timezone.utc).isoformat()
    )
    entry.setdefault("to_uid", ADMIN_UID)
    entry.setdefault("to_start_row", ADMIN_START_ROW)

    fr = entry.get("from") or {}
    if not isinstance(fr, dict):
        fr = {"name": str(fr)}

    body = str(entry.get("body") or "")
    entry["is_premium_payment"] = bool(
        entry.get("is_premium_payment")
        or body.startswith("[PREMIUM_PAYMENT]")
    )

    # memory
    entry_mem = dict(entry)
    entry_mem["id"] = len(ADMIN_INBOX) + 1
    ADMIN_INBOX.append(entry_mem)

    # redis (optional)
    try:
        from app.services.redis_client import redis_lpush

        redis_lpush("snm:admin:inbox", entry_mem, maxlen=200)
    except Exception as e:
        logger.warning("admin inbox redis: %s", e)

    # postgres (source of truth)
    try:
        from sqlalchemy import text

        ensure_inbox_table()
        eng = _engine()
        with eng.begin() as conn:
            row = conn.execute(
                text(
                    """
                    INSERT INTO admin_contact_inbox
                      (body, context, from_name, from_phone, from_start_row,
                       to_uid, to_start_row, is_premium_payment, payload)
                    VALUES
                      (:body, :context, :from_name, :from_phone, :from_start_row,
                       :to_uid, :to_start_row, :is_premium_payment, CAST(:payload AS jsonb))
                    RETURNING id, created_at
                    """
                ),
                {
                    "body": body,
                    "context": entry.get("context"),
                    "from_name": fr.get("name"),
                    "from_phone": fr.get("phone"),
                    "from_start_row": fr.get("start_row") or entry.get("from_start_row"),
                    "to_uid": entry.get("to_uid") or ADMIN_UID,
                    "to_start_row": entry.get("to_start_row") or ADMIN_START_ROW,
                    "is_premium_payment": entry["is_premium_payment"],
                    "payload": json.dumps(entry_mem, default=str),
                },
            ).mappings().first()
            if row:
                entry_mem["id"] = row["id"]
                if row.get("created_at"):
                    entry_mem["created_at"] = row["created_at"].isoformat()
    except Exception as e:
        logger.exception("admin inbox postgres append failed: %s", e)

    return entry_mem


def inbox_list(limit: int = 50) -> list:
    limit = max(1, min(int(limit or 50), 200))
    # Postgres first
    try:
        from sqlalchemy import text

        ensure_inbox_table()
        eng = _engine()
        with eng.connect() as conn:
            rows = (
                conn.execute(
                    text(
                        """
                        SELECT id, body, context, from_name, from_phone,
                               from_start_row, to_uid, to_start_row,
                               is_premium_payment, created_at, payload
                        FROM admin_contact_inbox
                        ORDER BY id DESC
                        LIMIT :lim
                        """
                    ),
                    {"lim": limit},
                )
                .mappings()
                .all()
            )
        out = []
        for r in rows:
            item: dict[str, Any] = {
                "id": r["id"],
                "body": r["body"],
                "context": r["context"],
                "from": {
                    "name": r["from_name"],
                    "phone": r["from_phone"],
                    "start_row": r["from_start_row"],
                },
                "to_uid": r["to_uid"],
                "to_start_row": r["to_start_row"],
                "is_premium_payment": bool(r["is_premium_payment"]),
                "created_at": r["created_at"].isoformat()
                if r["created_at"]
                else None,
            }
            out.append(item)
        if out:
            return out
    except Exception as e:
        logger.exception("admin inbox postgres list failed: %s", e)

    # Redis
    try:
        from app.services.redis_client import get_redis, redis_lrange

        if get_redis():
            rows = redis_lrange("snm:admin:inbox", 0, limit - 1)
            if rows:
                return rows
    except Exception as e:
        logger.warning("admin inbox redis list: %s", e)

    return list(reversed(ADMIN_INBOX[-limit:]))


def inbox_clear() -> int:
    n = 0
    try:
        from sqlalchemy import text

        ensure_inbox_table()
        eng = _engine()
        with eng.begin() as conn:
            r = conn.execute(text("SELECT COUNT(*) FROM admin_contact_inbox"))
            n = int(r.scalar() or 0)
            conn.execute(text("DELETE FROM admin_contact_inbox"))
    except Exception as e:
        logger.exception("admin inbox clear pg: %s", e)
        n = len(ADMIN_INBOX)
    ADMIN_INBOX.clear()
    try:
        from app.services.redis_client import redis_delete

        redis_delete("snm:admin:inbox")
    except Exception:
        pass
    return n
