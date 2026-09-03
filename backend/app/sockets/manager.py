"""
In-process WebSocket fan-out.
uid -> set of websockets (multi-tab safe).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, uid: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms.setdefault(uid, set()).add(websocket)
        logger.info("ws connect uid=%s sockets=%s", uid, len(self._rooms.get(uid, ())))

    async def disconnect(self, uid: str, websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.get(uid)
            if not room:
                return
            room.discard(websocket)
            if not room:
                self._rooms.pop(uid, None)
        logger.info("ws disconnect uid=%s", uid)

    async def send_to_user(self, uid: str, payload: dict[str, Any]) -> int:
        """Deliver JSON to all sockets for uid. Returns number of successful sends."""
        async with self._lock:
            sockets = list(self._rooms.get(uid, set()))
        dead: list[WebSocket] = []
        sent = 0
        for ws in sockets:
            try:
                await ws.send_json(payload)
                sent += 1
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(uid, ws)
        return sent

    def online(self, uid: str) -> bool:
        return bool(self._rooms.get(uid))

    def online_count(self) -> int:
        return sum(1 for s in self._rooms.values() if s)


manager = ConnectionManager()
