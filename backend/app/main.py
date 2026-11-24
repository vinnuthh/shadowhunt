"""Shadow Hunt backend entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .db import init_db
from .routers.rooms import router as rooms_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Shadow Hunt API",
    version="0.1.0",
    description="Authoritative room, lobby and match-state API for Shadow Hunt.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "phase": 1}
