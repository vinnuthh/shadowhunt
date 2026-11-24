"""Room, lobby, match and WebSocket endpoints (Phase 1)."""

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session

from .. import services
from ..db import SessionLocal, get_db
from ..realtime import broadcast_state, mutation_lock, register, unregister
from ..schemas import (
    DisplayNameRequest,
    HunterCountRequest,
    RoomState,
    SessionResponse,
    StartResponse,
)

router = APIRouter()


def _http_error(error: services.GameError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.post("/api/rooms", response_model=SessionResponse, status_code=201)
def create_room(
    payload: DisplayNameRequest, db: Session = Depends(get_db)
) -> SessionResponse:
    try:
        room, player = services.create_room(db, payload.display_name)
    except services.GameError as error:
        raise _http_error(error) from error
    return SessionResponse(
        code=room.code,
        player_id=player.id,
        token=player.token,
        display_name=player.display_name,
    )


@router.post("/api/rooms/{code}/join", response_model=SessionResponse)
async def join_room(
    code: str,
    payload: DisplayNameRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    try:
        async with mutation_lock:
            room, player = services.join_room(db, code, payload.display_name)
            room_code = room.code
        await broadcast_state(room_code)
    except services.GameError as error:
        raise _http_error(error) from error
    return SessionResponse(
        code=room.code,
        player_id=player.id,
        token=player.token,
        display_name=player.display_name,
    )


@router.get("/api/rooms/{code}", response_model=RoomState)
def read_room(
    code: str,
    x_player_token: str = Header(default="", alias="X-Player-Token"),
    db: Session = Depends(get_db),
) -> RoomState:
    try:
        room, player = services.require_membership(db, code, x_player_token)
        return RoomState(**services.room_state(db, room, player))
    except services.GameError as error:
        raise _http_error(error) from error


@router.post("/api/rooms/{code}/start", response_model=StartResponse)
async def start_match(
    code: str,
    payload: HunterCountRequest,
    x_player_token: str = Header(default="", alias="X-Player-Token"),
    db: Session = Depends(get_db),
) -> StartResponse:
    try:
        async with mutation_lock:
            room, player = services.require_membership(db, code, x_player_token)
            match = services.start_match(db, room, player, payload.hunter_count)
            state = services.room_state(db, room, player)
        await broadcast_state(room.code)
        return StartResponse(match_id=match.id, room=RoomState(**state))
    except services.GameError as error:
        raise _http_error(error) from error


@router.post("/api/rooms/{code}/end", response_model=RoomState)
async def end_match(
    code: str,
    x_player_token: str = Header(default="", alias="X-Player-Token"),
    db: Session = Depends(get_db),
) -> RoomState:
    try:
        async with mutation_lock:
            room, player = services.require_membership(db, code, x_player_token)
            services.end_match(db, room, player)
            state = services.room_state(db, room, player)
        await broadcast_state(room.code)
        return RoomState(**state)
    except services.GameError as error:
        raise _http_error(error) from error


@router.post("/api/rooms/{code}/leave")
async def leave_room(
    code: str,
    x_player_token: str = Header(default="", alias="X-Player-Token"),
    db: Session = Depends(get_db),
) -> dict:
    try:
        async with mutation_lock:
            room, player = services.require_membership(db, code, x_player_token)
            services.leave_room(db, room, player)
            room_code = room.code
        await broadcast_state(room_code)
        return {"ok": True}
    except services.GameError as error:
        raise _http_error(error) from error


@router.websocket("/ws/rooms/{code}")
async def room_socket(
    websocket: WebSocket,
    code: str,
    token: str = "",
) -> None:
    await websocket.accept()

    with SessionLocal() as db:  # replaced by dependency-free lookup on purpose
        try:
            room, player = services.require_membership(db, code, token)
        except services.GameError as error:
            await websocket.send_json({"type": "error", "message": error.message})
            await websocket.close(code=1008)
            return
        room_code = room.code
        player_token = player.token

    await register(room_code, player_token, websocket)
    try:
        with SessionLocal() as db:
            room, player = services.require_membership(db, room_code, token)
            await websocket.send_json(
                {"type": "state", "payload": services.room_state(db, room, player)}
            )
        while True:
            # Client messages are ignored in Phase 1; the socket is push-only.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await unregister(room_code, player_token, websocket)
