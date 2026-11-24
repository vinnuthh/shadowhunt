"""Pydantic request/response schemas."""

from pydantic import BaseModel, Field


class DisplayNameRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=24)


class HunterCountRequest(BaseModel):
    hunter_count: int = Field(ge=1)


class LocationRequest(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lng: float = Field(ge=-180.0, le=180.0)


class PlayerSummary(BaseModel):
    id: str
    display_name: str
    is_host: bool
    status: str
    role: str | None = None
    lat: float | None = None
    lng: float | None = None
    location_updated_at: str | None = None
    is_in_bounds: bool | None = None


class RoomState(BaseModel):
    code: str
    status: str
    hunter_count: int
    players: list[PlayerSummary]
    match_id: str | None = None
    me: PlayerSummary
    campus: dict | None = None


class SessionResponse(BaseModel):
    code: str
    player_id: str
    token: str
    display_name: str


class StartResponse(BaseModel):
    match_id: str
    room: RoomState


class SocketMessage(BaseModel):
    type: str
    payload: RoomState
