"""Motor (async MongoDB) client lifecycle managed via FastAPI lifespan."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ..config import settings

_client: AsyncIOMotorClient | None = None


@asynccontextmanager
async def lifespan(_app=None) -> AsyncGenerator[None, None]:
    """Open the Motor connection at startup and close it at shutdown."""
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        yield
    finally:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency: returns the application database handle."""
    if _client is None:
        raise RuntimeError("Database client is not initialised")
    return _client[settings.mongodb_db]
