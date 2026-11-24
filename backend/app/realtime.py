"""WebSocket connection registry and role-filtered state broadcasting."""

import asyncio
from collections import defaultdict

from fastapi import WebSocket

from .db import SessionLocal
from .services import get_player_by_token, get_room, room_state

# Serialises match mutations with the broadcast that follows them.
mutation_lock = asyncio.Lock()
_registry_lock = asyncio.Lock()
_connections: dict[str, dict[str, WebSocket]] = defaultdict(dict)


async def register(code: str, token: str, socket: WebSocket) -> None:
    async with _registry_lock:
        _connections[code][token] = socket


async def unregister(code: str, token: str, socket: WebSocket) -> None:
    async with _registry_lock:
        sockets = _connections.get(code)
        if sockets is not None and sockets.get(token) is socket:
            del sockets[token]
        if sockets is not None and not sockets:
            _connections.pop(code, None)


async def broadcast_state(code: str) -> None:
    """Send each connected player a state payload filtered for their role."""
    async with _registry_lock:
        recipients = list(_connections.get(code, {}).items())

    if not recipients:
        return

    messages = []
    with SessionLocal() as db:
        room = get_room(db, code)
        if room is None:
            return
        for token, socket in recipients:
            player = get_player_by_token(db, token)
            if player is None or player.room_id != room.id:
                continue
            messages.append(
                (socket, {"type": "state", "payload": room_state(db, room, player)})
            )

    for socket, message in messages:
        try:
            await socket.send_json(message)
        except Exception:
            # A dead socket is cleaned up by its own disconnect handler.
            pass
