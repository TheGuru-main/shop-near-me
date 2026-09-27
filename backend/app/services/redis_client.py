"""Shared Redis. If REDIS_URL unset, helpers no-op / return None."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)
_client = None
_failed = False


def get_redis():
    global _client, _failed
    if _failed:
        return None
    if _client is not None:
        return _client
    url = (get_settings().redis_url or "").strip()
    if not url:
        return None
    try:
        import redis

        _client = redis.Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        _client.ping()
        return _client
    except Exception as e:
        logger.warning("redis unavailable: %s", e)
        _failed = True
        _client = None
        return None


def redis_set_json(key: str, value: Any, ttl: int | None = None) -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        payload = json.dumps(value, default=str)
        if ttl:
            r.setex(key, int(ttl), payload)
        else:
            r.set(key, payload)
        return True
    except Exception as e:
        logger.warning("redis set %s: %s", key, e)
        return False


def redis_get_json(key: str) -> Any | None:
    r = get_redis()
    if not r:
        return None
    try:
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("redis get %s: %s", key, e)
        return None


def redis_lpush(key: str, value: Any, maxlen: int = 200) -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        r.lpush(key, json.dumps(value, default=str))
        r.ltrim(key, 0, maxlen - 1)
        return True
    except Exception as e:
        logger.warning("redis lpush %s: %s", key, e)
        return False


def redis_lrange(key: str, start: int = 0, end: int = 49) -> list:
    r = get_redis()
    if not r:
        return []
    try:
        rows = r.lrange(key, start, end)
        out = []
        for row in rows:
            try:
                out.append(json.loads(row))
            except Exception:
                out.append({"raw": row})
        return out
    except Exception as e:
        logger.warning("redis lrange %s: %s", key, e)
        return []


def redis_delete(key: str) -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        r.delete(key)
        return True
    except Exception:
        return False


def redis_publish(channel: str, value: Any) -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        r.publish(channel, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.warning("redis publish %s: %s", channel, e)
        return False
