"""
WebSocket push channel.
- Auth: ?token=<access_jwt>  (sub = user id string)
- Persist messages still via POST /messages/*
- This socket: delivery, typing, call signaling envelopes
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.sockets.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# Client -> server event types we handle
# typing | read | call_offer | call_answer | ice_candidate | call_end | ping


@router.websocket("/ws/messages")
async def websocket_messages(
    websocket: WebSocket,
    token: str = Query(...),
):
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=4001)
        return

    uid = str(payload["sub"])
    await manager.connect(uid, websocket)

    try:
        await websocket.send_json(
            {
                "type": "connected",
                "uid": uid,
                "channel": "messages",
            }
        )
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                continue
            await _handle_client_event(uid, data)
    except WebSocketDisconnect:
        await manager.disconnect(uid, websocket)
    except Exception as exc:
        logger.warning("ws error uid=%s: %s", uid, exc)
        await manager.disconnect(uid, websocket)


async def _handle_client_event(uid: str, data: dict[str, Any]) -> None:
    event_type = (data.get("type") or "").strip()

    if event_type == "ping":
        # client may use for keepalive; optional ack
        return

    if event_type == "typing":
        target = data.get("to")
        if target:
            await manager.send_to_user(
                str(target),
                {"type": "typing", "from": uid, "thread_id": data.get("thread_id")},
            )
        return

    if event_type == "read":
        target = data.get("to")
        if target:
            await manager.send_to_user(
                str(target),
                {
                    "type": "read",
                    "from": uid,
                    "thread_id": data.get("thread_id"),
                    "message_id": data.get("message_id"),
                },
            )
        return

    # Call / live signaling (envelope only — media is WebRTC client-side)
    if event_type in (
        "call_offer",
        "call_answer",
        "ice_candidate",
        "call_end",
        "call_ring",
    ):
        target = data.get("to")
        if not target:
            return
        out = {
            "type": event_type,
            "from": uid,
            "call_id": data.get("call_id"),
            "sdp": data.get("sdp"),
            "candidate": data.get("candidate"),
            "media": data.get("media") or "audio",  # audio | video
        }
        await manager.send_to_user(str(target), out)
        return
