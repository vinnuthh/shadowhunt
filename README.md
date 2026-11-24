# Shadow Hunt

A mobile-first, campus-based multiplayer game of hide and seek. This repository is
being built against `Shadow_Hunt_Master_Project_Blueprint.pdf`.

**Current status: Phase 2 In-Progress — BMSIT Bangalore Campus Map & Geofence Live.**

Implemented:
- Host creates a room and gets a 6-character code plus a shareable invite link
- Players join with a display name; lobby updates live over WebSockets
- Active Game Arena set to **BMS Institute of Technology and Management (BMSIT), Bangalore** (Doddaballapur Rd, Avalahalli, Yelahanka)
- Interactive campus map with CartoDB Dark Matter / OSM layers
- High-precision 20-vertex OpenStreetMap geofence polygon for the BMSIT campus boundary
- Real-time geofence verification (ray-casting point-in-polygon checks for "Inside BMSIT" vs "Outside Boundary")
- Key BMSIT campus landmarks mapped with icons & tactical intel (BSN Block/Library, Academic Block 1, Mechanical/Lab Block, Amphitheatre, Canteen/Food Court, Sports Ground, Basketball Courts, Boys Hostel, Main Gate)
- Live device GPS tracking toggle with continuous tracking
- 1-click BMSIT landmark quick-jump and simulated campus walk patrol mode for easy testing from anywhere
- 25-second location radar sweep loop (from Master Blueprint) with HUD animations
- Host selects Hunter count and starts match; server assigns roles; roles revealed upon match conclusion
- Player session tokens, server-side validation, reconnecting socket

## Run locally

You need Python 3.11+ and Node 18+.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, use `source .venv/bin/activate` instead.

The API runs at `http://localhost:8000`; interactive docs are at `/docs`.
SQLite is stored at `backend/data/shadowhunt.db` and is created on first start.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` on your phone or laptop. To test on a phone on the
same network, open `http://<your-computer-ip>:5173` and set `VITE_API_URL` to
`http://<your-computer-ip>:8000` in `frontend/.env.local`. CORS must allow that
origin too (see `CORS_ORIGINS` below).

### Tests

```powershell
cd backend
python -m pytest -q
```

## Configuration

Backend environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | local SQLite file | Set a `postgresql+psycopg://...` URL to use Postgres/Supabase |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed browser origins |

Frontend environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | REST API base URL |
| `VITE_WS_URL` | derived from `VITE_API_URL` | WebSocket base URL (`ws://`/`wss://`) |

## Architecture

```text
Phone (React/Vite) ──HTTPS REST──> FastAPI ──> SQLite (dev) / Postgres (later)
                   └──WebSocket──> FastAPI ──> role-filtered lobby broadcasts
```

The backend is authoritative: room state, host permissions, match transitions and
random role assignment happen server-side. Player identity is currently a random
token kept in browser local storage; this will be replaced by proper auth before
production. Every state broadcast is personalised so no player receives another
player's role while the match is active.

### Layout

```text
backend/
  app/
    main.py          FastAPI app, CORS, health check
    config.py        environment configuration
    db.py            engine, sessions, table registration
    models.py        Room, Player, Match tables
    schemas.py       request/response contracts
    services.py      authoritative game logic and validation
    realtime.py      WebSocket registry and filtered broadcasts
    routers/rooms.py HTTP + WebSocket endpoints
  tests/
    test_phase1.py   role privacy, host controls, state transitions
frontend/
  src/
    App.jsx          session + screen routing
    screens/         Home, Lobby, Match
    components/      PlayerList
    hooks/           reconnecting WebSocket hook
    lib/             API client, local session storage
```

## Next milestone

Phase 2: campus map with Leaflet/OpenStreetMap, play-area boundary, location
permission flow, 25-second active-page updates, stale markers and role-filtered
live positions. Then capture validation and spectator mode.
