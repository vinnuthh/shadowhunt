"""Phase 1 tests: rooms, lobby state, role assignment and host controls."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 - registers tables
from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth(token: str) -> dict:
    return {"X-Player-Token": token}


def create_room(client: TestClient, name: str) -> dict:
    response = client.post("/api/rooms", json={"display_name": name})
    assert response.status_code == 201, response.text
    return response.json()


def join(client: TestClient, code: str, name: str) -> dict:
    response = client.post(f"/api/rooms/{code}/join", json={"display_name": name})
    assert response.status_code == 200, response.text
    return response.json()


def state(client: TestClient, code: str, token: str) -> dict:
    response = client.get(f"/api/rooms/{code}", headers=auth(token))
    assert response.status_code == 200, response.text
    return response.json()


def test_room_and_lobby_show_players_without_roles(client):
    host = create_room(client, "Host")
    join(client, host["code"], "Runner 2")
    join(client, host["code"], "Runner 3")

    room = state(client, host["code"], host["token"])
    assert room["code"] == host["code"]
    assert room["status"] == "WAITING"
    assert len(room["players"]) == 3
    assert all(player["role"] is None for player in room["players"])
    assert sum(player["is_host"] for player in room["players"]) == 1


def test_only_host_can_start_and_end(client):
    host = create_room(client, "Host")
    guest = join(client, host["code"], "Guest")

    denied = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(guest["token"]),
    )
    assert denied.status_code == 403

    response = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(host["token"]),
    )
    assert response.status_code == 200, response.text
    assert response.json()["room"]["status"] == "ACTIVE"

    denied_end = client.post(
        f"/api/rooms/{host['code']}/end", headers=auth(guest["token"])
    )
    assert denied_end.status_code == 403

    ended = client.post(
        f"/api/rooms/{host['code']}/end", headers=auth(host["token"])
    )
    assert ended.status_code == 200
    assert ended.json()["status"] == "ENDED"


def test_role_assignment_is_random_count_and_private(client):
    host = create_room(client, "Host")
    members = [host]
    for index in range(4):
        members.append(join(client, host["code"], f"Player {index + 1}"))

    response = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(host["token"]),
    )
    assert response.status_code == 200, response.text

    roles = []
    for member in members:
        room = state(client, host["code"], member["token"])
        me = room["me"]
        assert me["role"] in {"HUNTER", "SHADOW"}
        assert all(
            other["role"] is None for other in room["players"] if other["id"] != me["id"]
        )
        roles.append(me["role"])

    assert roles.count("HUNTER") == 1
    assert roles.count("SHADOW") == 4


def test_start_validates_player_count_and_hunter_count(client):
    host = create_room(client, "Host")
    too_few = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(host["token"]),
    )
    assert too_few.status_code == 400

    join(client, host["code"], "Player 2")
    bad_count = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 2},
        headers=auth(host["token"]),
    )
    assert bad_count.status_code == 400

    negative = client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 0},
        headers=auth(host["token"]),
    )
    assert negative.status_code == 422


def test_cannot_join_after_start_or_with_duplicate_name(client):
    host = create_room(client, "Host")
    duplicate = client.post(
        f"/api/rooms/{host['code']}/join", json={"display_name": "host"}
    )
    assert duplicate.status_code == 409

    join(client, host["code"], "Player 2")
    client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(host["token"]),
    )
    late = client.post(f"/api/rooms/{host['code']}/join", json={"display_name": "Late"})
    assert late.status_code == 409


def test_leaving_a_waiting_room_transfers_host(client):
    host = create_room(client, "Host")
    guest = join(client, host["code"], "Guest")

    left = client.post(
        f"/api/rooms/{host['code']}/leave", headers=auth(host["token"])
    )
    assert left.status_code == 200, left.text

    room = state(client, host["code"], guest["token"])
    assert len(room["players"]) == 1
    assert room["me"]["is_host"] is True


def test_leave_during_match_removes_player_from_roster(client):
    host = create_room(client, "Host")
    guest = join(client, host["code"], "Guest")
    join(client, host["code"], "Third")
    client.post(
        f"/api/rooms/{host['code']}/start",
        json={"hunter_count": 1},
        headers=auth(host["token"]),
    )

    left = client.post(
        f"/api/rooms/{host['code']}/leave", headers=auth(guest["token"])
    )
    assert left.status_code == 200, left.text

    room = state(client, host["code"], host["token"])
    assert len(room["players"]) == 2
    assert all(player["display_name"] != "Guest" for player in room["players"])


def test_invalid_session_and_code_are_rejected(client):
    host = create_room(client, "Host")
    no_token = client.get(f"/api/rooms/{host['code']}")
    assert no_token.status_code == 401

    wrong_room = client.get("/api/rooms/AAAAAA", headers=auth(host["token"]))
    assert wrong_room.status_code in {403, 404}


def test_bmsit_campus_metadata_and_geofence(client):
    res = client.get("/api/campus")
    assert res.status_code == 200
    campus = res.json()
    assert campus["id"] == "bmsit-bangalore"
    assert "BMSIT" in campus["short_name"]
    assert len(campus["landmarks"]) >= 5
    assert len(campus["boundary"]) >= 10
    assert 13.13 <= campus["center"]["lat"] <= 13.14
    assert 77.56 <= campus["center"]["lng"] <= 77.58


def test_player_location_update_inside_and_outside_bmsit(client):
    host = create_room(client, "Host")
    join(client, host["code"], "Seeker")

    # Inside BMSIT (BSN Block coordinates)
    update_res = client.post(
        f"/api/rooms/{host['code']}/location",
        json={"lat": 13.1342, "lng": 77.5680},
        headers=auth(host["token"]),
    )
    assert update_res.status_code == 200
    body = update_res.json()
    assert body["me"]["lat"] == 13.1342
    assert body["me"]["lng"] == 77.5680
    assert body["me"]["is_in_bounds"] is True
    assert body["campus"]["id"] == "bmsit-bangalore"

    # Outside BMSIT (e.g. MG Road, Bangalore: 12.9716, 77.5946)
    out_res = client.post(
        f"/api/rooms/{host['code']}/location",
        json={"lat": 12.9716, "lng": 77.5946},
        headers=auth(host["token"]),
    )
    assert out_res.status_code == 200
    out_body = out_res.json()
    assert out_body["me"]["lat"] == 12.9716
    assert out_body["me"]["is_in_bounds"] is False

