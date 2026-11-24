"""Authoritative game logic.

All room, role and match transitions live here so that HTTP handlers and
WebSockets cannot bypass validation.
"""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import MAX_NAME_LENGTH, MAX_PLAYERS_PER_ROOM
from .models import Match, Player, Room

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # avoids I, O, 0, 1
ROLE_HUNTER = "HUNTER"
ROLE_SHADOW = "SHADOW"


class GameError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return str(uuid.uuid4())


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def normalize_name(value: str) -> str:
    name = " ".join(value.split())
    if not name or len(name) > MAX_NAME_LENGTH:
        raise GameError(f"Name must be 1-{MAX_NAME_LENGTH} characters.")
    return name


def normalize_code(value: str) -> str:
    code = value.strip().upper()
    if len(code) != 6 or any(char not in CODE_ALPHABET for char in code):
        raise GameError("Enter a valid 6-character room code.", 404)
    return code


def suggested_hunter_count(player_count: int) -> int:
    """Round the 1:4 starting recommendation without leaving zero shadows."""
    if player_count < 2:
        return 1
    return max(1, min(player_count - 1, (player_count + 2) // 5))


def _generate_code(db: Session) -> str:
    for _ in range(100):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if db.scalar(select(Room.id).where(Room.code == code)) is None:
            return code
    raise GameError("Could not generate a unique room code. Please retry.", 503)


def get_room(db: Session, code: str) -> Room | None:
    return db.scalar(select(Room).where(Room.code == normalize_code(code)))


def get_player_by_token(db: Session, token: str) -> Player | None:
    return db.scalar(select(Player).where(Player.token == token))


def require_membership(db: Session, code: str, token: str) -> tuple[Room, Player]:
    player = get_player_by_token(db, token)
    if player is None:
        raise GameError("Invalid player session.", 401)
    room = db.get(Room, player.room_id)
    if room is None or room.code != normalize_code(code):
        raise GameError("You are not a member of this room.", 403)
    return room, player


def create_room(db: Session, display_name: str) -> tuple[Room, Player]:
    name = normalize_name(display_name)
    room_id = _new_id()
    player = Player(
        id=_new_id(),
        room_id=room_id,
        display_name=name,
        token=_new_token(),
        role=None,
        status="WAITING",
        joined_at=_now(),
    )
    room = Room(
        id=room_id,
        code=_generate_code(db),
        host_player_id=player.id,
        status="WAITING",
        hunter_count=0,
        created_at=_now(),
    )
    db.add(room)
    db.add(player)
    db.commit()
    return room, player


def join_room(db: Session, code: str, display_name: str) -> tuple[Room, Player]:
    name = normalize_name(display_name)
    room = get_room(db, code)
    if room is None:
        raise GameError("Room not found.", 404)
    if room.status != "WAITING":
        raise GameError("This match has already started.", 409)

    existing = db.scalars(select(Player).where(Player.room_id == room.id)).all()
    if len(existing) >= MAX_PLAYERS_PER_ROOM:
        raise GameError("This room is full.", 409)
    if any(p.display_name.casefold() == name.casefold() for p in existing):
        raise GameError("That display name is already taken in this room.", 409)

    player = Player(
        id=_new_id(),
        room_id=room.id,
        display_name=name,
        token=_new_token(),
        role=None,
        status="WAITING",
        joined_at=_now(),
    )
    db.add(player)
    db.commit()
    return room, player


def leave_room(db: Session, room: Room, player: Player) -> None:
    """Remove a player from the lobby, or mark them left during a live match."""
    if room.status == "ENDED":
        raise GameError("This room has already ended.", 409)

    others = db.scalars(
        select(Player)
        .where(Player.room_id == room.id, Player.id != player.id)
        .order_by(Player.joined_at)
    ).all()

    if room.status == "WAITING":
        if not others:
            db.delete(room)
        else:
            db.delete(player)
            if room.host_player_id == player.id:
                room.host_player_id = others[0].id
    else:
        player.status = "LEFT"
        if room.host_player_id == player.id:
            successor = next(
                (p for p in others if p.status == "ACTIVE"), None
            )
            if successor is not None:
                room.host_player_id = successor.id

    db.commit()


def _require_host(room: Room, player: Player) -> None:
    if room.host_player_id != player.id:
        raise GameError("Only the host can control this match.", 403)


def start_match(db: Session, room: Room, player: Player, hunter_count: int) -> Match:
    _require_host(room, player)
    if room.status != "WAITING":
        raise GameError("This match has already started.", 409)

    players = db.scalars(
        select(Player).where(Player.room_id == room.id, Player.status != "LEFT")
    ).all()
    if len(players) < 2:
        raise GameError("At least 2 players are needed to start a match.", 400)
    if hunter_count < 1 or hunter_count >= len(players):
        raise GameError(
            f"Hunter count must be between 1 and {len(players) - 1}.", 400
        )

    rng = secrets.SystemRandom()
    hunter_ids = set(rng.sample([p.id for p in players], hunter_count))
    match = Match(
        id=_new_id(),
        room_id=room.id,
        status="ACTIVE",
        hunter_count=hunter_count,
        started_at=_now(),
    )
    for member in players:
        member.role = ROLE_HUNTER if member.id in hunter_ids else ROLE_SHADOW
        member.status = "ACTIVE"
    room.status = "ACTIVE"
    room.hunter_count = hunter_count
    db.add(match)
    db.commit()
    return match


def end_match(db: Session, room: Room, player: Player) -> Match:
    _require_host(room, player)
    if room.status != "ACTIVE":
        raise GameError("There is no active match to end.", 409)

    match = db.scalar(
        select(Match)
        .where(Match.room_id == room.id, Match.status == "ACTIVE")
        .order_by(Match.started_at.desc())
    )
    if match is None:
        raise GameError("Active match record not found.", 409)

    match.status = "ENDED"
    match.ended_at = _now()
    room.status = "ENDED"
    for member in db.scalars(select(Player).where(Player.room_id == room.id)).all():
        if member.status != "LEFT":
            member.status = "ENDED"
    db.commit()
    return match


def _summary(player: Player, viewer: Player, reveal_roles: bool = False) -> dict:
    return {
        "id": player.id,
        "display_name": player.display_name,
        "is_host": player.id == player.room.host_player_id,
        "status": player.status,
        # Roles stay private during play and are revealed once the match ends.
        "role": player.role if (reveal_roles or player.id == viewer.id) else None,
    }


def room_state(db: Session, room: Room, viewer: Player) -> dict:
    players = db.scalars(
        select(Player)
        .where(Player.room_id == room.id, Player.status != "LEFT")
        .order_by(Player.joined_at)
    ).all()
    match_id = db.scalar(
        select(Match.id)
        .where(Match.room_id == room.id)
        .order_by(Match.started_at.desc())
    )
    reveal_roles = room.status == "ENDED"
    return {
        "code": room.code,
        "status": room.status,
        "hunter_count": room.hunter_count,
        "players": [_summary(p, viewer, reveal_roles) for p in players],
        "match_id": match_id,
        "me": _summary(viewer, viewer, reveal_roles),
    }


def active_match_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Match)) or 0
