"""Read-only router for PF1e game content (races, classes, feats, class abilities).

These endpoints serve the ingested reference data and require no authentication —
the data is public game content with no user-specific information.
"""

from typing import Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db.client import get_db
from ..db.content_repo import ContentRepo

router = APIRouter(prefix="/api")


@router.get("/races", summary="List all playable races")
async def list_races(
    category: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_races(category=category)


@router.get("/classes", summary="List all base classes")
async def list_classes(
    category: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_classes(category=category)


@router.get("/feats", summary="List feats, optionally filtered by sub_type")
async def list_feats(
    sub_type: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_feats(sub_type=sub_type)


@router.get("/class-abilities", summary="List class abilities, optionally filtered by class name")
async def list_class_abilities(
    class_name: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_class_abilities(class_name=class_name)


@router.get("/traits", summary="List traits, optionally filtered by trait_type")
async def list_traits(
    trait_type: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_traits(trait_type=trait_type)


@router.get("/racial-traits", summary="List racial traits for a given race")
async def list_racial_traits(
    race: Optional[str] = None,
    alt_only: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_racial_traits(race=race, alt_only=alt_only)


@router.get("/items", summary="List equipment items, optionally filtered by item_type and sub_type")
async def list_items(
    item_type: Optional[str] = None,
    sub_type: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    return await ContentRepo(db).list_items(item_type=item_type, sub_type=sub_type)
