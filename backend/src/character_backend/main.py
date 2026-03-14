"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.client import lifespan
from .routers.characters import router as character_router
from .routers.content import router as content_router

app = FastAPI(
    title="AI Charactermancer — Character API",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(character_router)
app.include_router(content_router)


@app.get("/health", include_in_schema=False)
async def health() -> dict:
    return {"status": "ok"}
