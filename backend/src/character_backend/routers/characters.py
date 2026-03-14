"""Character CRUD router.

Endpoints
---------
GET    /characters            — list characters owned by the authenticated user
GET    /characters/{id}       — fetch a single character (owner-scoped)
PUT    /characters/{id}       — replace a character (owner-scoped)
DELETE /characters/{id}       — delete a character (owner-scoped)

POST   /character/save        — create-or-update (upsert) used by the wizard autosave;
                                returns {"id": "<mongo_id>"}

DELETE /users/me              — delete all characters for the current user
                                (called by the Auth0 post-user-deletion Action)
"""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth.jwt import get_current_user
from ..db.character_repo import CharacterRepo
from ..db.client import get_db
from ..models import CharacterDraft, SaveResponse

router = APIRouter(prefix="/api/characters")


# ---------------------------------------------------------------------------
# REST collection endpoints
# ---------------------------------------------------------------------------


@router.get("", summary="List owned characters")
async def list_characters(
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await CharacterRepo(db).list_by_owner(owner_id)


@router.get("/{character_id}", summary="Get a character by id")
async def get_character(
    character_id: str,
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    return await CharacterRepo(db).get(character_id, owner_id)


@router.put("/{character_id}", summary="Replace a character")
async def update_character(
    character_id: str,
    draft: CharacterDraft,
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    data = draft.model_dump(by_alias=True, exclude_none=True)
    return await CharacterRepo(db).update(character_id, data, owner_id)


@router.delete(
    "/{character_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a character",
)
async def delete_character(
    character_id: str,
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> None:
    await CharacterRepo(db).delete(character_id, owner_id)


# ---------------------------------------------------------------------------
# Wizard autosave endpoint (create-or-update)
# ---------------------------------------------------------------------------


@router.post("/validate-step", summary="Validate the data for a single wizard step")
async def validate_step(
    payload: dict,
    owner_id: str = Depends(get_current_user),
) -> dict:
    # Placeholder — client-side validation in StepRegistry covers most rules.
    # Add server-side checks here as needed (e.g. feat prerequisites).
    return {"ok": True}


@router.post("/save", summary="Upsert a character draft (wizard autosave)")
async def save_character(
    draft: CharacterDraft,
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> SaveResponse:
    data = draft.model_dump(by_alias=True, exclude_none=True)
    doc = await CharacterRepo(db).upsert(data, owner_id)
    return SaveResponse(id=doc["id"])


# ---------------------------------------------------------------------------
# Account deletion hook (called by Auth0 post-deletion Action)
# ---------------------------------------------------------------------------


@router.delete(
    "/users/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete all characters for the authenticated user",
)
async def delete_own_data(
    owner_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> None:
    await CharacterRepo(db).delete_by_owner(owner_id)
