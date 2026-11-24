"""Environment configuration for the Shadow Hunt backend."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SQLITE_PATH = BASE_DIR / "data" / "shadowhunt.db"

# Local development defaults to SQLite. Set DATABASE_URL to a Postgres URL
# (e.g. postgresql+psycopg://...) when moving to Supabase.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_PATH}")

# Comma-separated list of allowed browser origins.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

MAX_PLAYERS_PER_ROOM = 30
MAX_NAME_LENGTH = 24
