
"""Admin mailbox: UID 550198550199 → start_row (L+S formula). Payload keyed by to_uid."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

ADMIN_NAME = "shop-near-me-admin"
ADMIN_UID = "550198550199"  # explicit admin identity — not a phone E.164


def _digit_sum(uid: str) -> int:
    return sum(int(ch) for ch in str(uid) if ch.isdigit())


def _name_len(name: str) -> int:
    return len("".join((name or "").split()).lower()) or 1


def _start_row(L: int, S: int, R: int = 64) -> int:
    return ((L + S - 1) % R) + 1


ADMIN_S = _digit_sum(ADMIN_UID)          # 57
ADMIN_L = _name_len(ADMIN_NAME)          # 18
ADMIN_C = ord("s") - ord("a")            # 18
ADMIN_START_ROW = _start_row(ADMIN_L, ADMIN_S, 64)  # 11

ADMIN_INBOX: list = []


def admin_public() -> dict:
    return {
        "uid": ADMIN_UID,
        "name": ADMIN_NAME,
        "L": ADMIN_L,
        "S": ADMIN_S,
        "c": ADMIN_C,
        "start_row": ADMIN_START_ROW,
        "identity_tag": f"[{ADMIN_S}][{ADMIN_UID}]",
        "role": "admin",
        "permanent": True,
    }


def _engine():
    from sqlalchemy import create_engine
    from app.config import get_settings
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def ensure_inbox_table() -> None:
    from sqlalchemy import text
    eng = _engine()
    with eng.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS admin_contact_inbox (
              id BIGSERIAL PRIMARY KEY,
              body TEXT NOT NULL,
              context VARCHAR(64),
              from_name VARCHAR(255),
              from_phone VARCHAR(64),
              from_start_row INTEGER,
              to_uid VARCHAR(64) NOT NULL,
              to_start_row INTEGER NOT NULL,
              is_premium_payment BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_admin_inbox_uid
            ON admin_contact_inbox (to_uid, id DESC)
        """))


def inbox_append(entry: dict) -> dict:
    """Drop payload into admin start_row box (to_uid = ADMIN_UID)."""
    entry = dict(entry or {})
    fr = entry.get("from") if isinstance(entry.get("from"), dict) else {}
    body = str(entry.get("body") or "").strip()
    if not body:
        raise ValueError("body required")

    # Force admin identity — never a random number
    entry["to_uid"] = ADMIN_UID
    entry["to_start_row"] = ADMIN_START_ROW
    entry.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    entry["is_premium_payment"] = body.startswith("[PREMIUM_PAYMENT]")

    mem = {
        "id": len(ADMIN_INBOX) + 1,
        "body": body,
        "context": entry.get("context"),
        "from": {
            "name": fr.get("name"),
            "phone": fr.get("phone"),
            "start_row": fr.get("start_row"),
        },
        "to_uid": ADMIN_UID,
        "to_start_row": ADMIN_START_ROW,
        "is_premium_payment": entry["is_premium_payment"],
        "created_at": entry["created_at"],
    }
    ADMIN_INBOX.append(mem)

    try:
        from app.services.redis_client import redis_lpush
        redis_lpush("snm:admin:inbox", mem, maxlen=200)
    except Exception as e:
        logger.warning("admin redis: %s", e)

    try:
        from sqlalchemy import text
        ensure_inbox_table()
        eng = _engine()
        with eng.begin() as conn:
            row = conn.execute(
                text("""
                    INSERT INTO admin_contact_inbox
                      (body, context, from_name, from_phone, from_start_row,
                       to_uid, to_start_row, is_premium_payment)
                    VALUES
                      (:body, :context, :from_name, :from_phone, :from_start_row,
                       :to_uid, :to_start_row, :is_premium_payment)
                    RETURNING id, created_at
                """),
                {
                    "body": body,
                    "context": entry.get("context"),
                    "from_name": fr.get("name"),
                    "from_phone": fr.get("phone"),
                    "from_start_row": fr.get("start_row"),
                    "to_uid": ADMIN_UID,
                    "to_start_row": ADMIN_START_ROW,
                    "is_premium_payment": mem["is_premium_payment"],
                },
            ).mappings().first()
            if row:
                mem["id"] = row["id"]
                if row.get("created_at"):
                    mem["created_at"] = row["created_at"].isoformat()
        logger.info(
            "admin drop ok id=%s to_uid=%s start_row=%s",
            mem.get("id"), ADMIN_UID, ADMIN_START_ROW,
        )
    except Exception:
        logger.exception("admin postgres drop failed")

    return mem


def inbox_list(limit: int = 50) -> list:
    """List drops for ADMIN_UID only (start_row box)."""
    limit = max(1, min(int(limit or 50), 200))
    try:
        from sqlalchemy import text
        ensure_inbox_table()
        eng = _engine()
        with eng.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT id, body, context, from_name, from_phone,
                           from_start_row, to_uid, to_start_row,
                           is_premium_payment, created_at
                    FROM admin_contact_inbox
                    WHERE to_uid = :uid
                    ORDER BY id DESC
                    LIMIT :lim
                """),
                {"uid": ADMIN_UID, "lim": limit},
            ).mappings().all()
        out = []
        for r in rows:
            out.append({
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
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        if out:
            return out
    except Exception:
        logger.exception("admin list pg failed")

    try:
        from app.services.redis_client import get_redis, redis_lrange
        if get_redis():
            rows = redis_lrange("snm:admin:inbox", 0, limit - 1)
            if rows:
                return [r for r in rows if str(r.get("to_uid") or "") == ADMIN_UID][:limit]
    except Exception as e:
        logger.warning("admin redis list: %s", e)

    return [
        x for x in reversed(ADMIN_INBOX[-limit:])
        if str(x.get("to_uid") or "") == ADMIN_UID
    ]


def inbox_clear() -> int:
    n = 0
    try:
        from sqlalchemy import text
        ensure_inbox_table()
        eng = _engine()
        with eng.begin() as conn:
            r = conn.execute(
                text("SELECT COUNT(*) FROM admin_contact_inbox WHERE to_uid = :uid"),
                {"uid": ADMIN_UID},
            )
            n = int(r.scalar() or 0)
            conn.execute(
                text("DELETE FROM admin_contact_inbox WHERE to_uid = :uid"),
                {"uid": ADMIN_UID},
            )
    except Exception:
        logger.exception("admin clear pg")
        n = len(ADMIN_INBOX)
    ADMIN_INBOX.clear()
    try:
        from app.services.redis_client import redis_delete
        redis_delete("snm:admin:inbox")
    except Exception:
        pass
    return n
