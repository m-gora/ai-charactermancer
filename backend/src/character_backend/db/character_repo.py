"""Repository layer for the `characters` collection.

All queries are scoped to `owner_id` so users can only access their own characters.
"""

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

COLLECTION = "characters"

# Fields returned for the list endpoint — avoids sending full drafts in bulk.
_SUMMARY_PROJECTION = {"name": 1, "race": 1, "class": 1, "level": 1, "status": 1}


def _parse_object_id(id_: str) -> ObjectId:
    """Convert a string to ObjectId; raise 404 on invalid format."""
    try:
        return ObjectId(id_)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")


def _serialise(doc: dict) -> dict:
    """Replace MongoDB _id with a plain string id field."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


class CharacterRepo:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[COLLECTION]

    async def list_by_owner(self, owner_id: str) -> list[dict]:
        cursor = self._col.find({"ownerId": owner_id}, _SUMMARY_PROJECTION)
        return [_serialise(doc) async for doc in cursor]

    async def get(self, id_: str, owner_id: str) -> dict:
        doc = await self._col.find_one({"_id": _parse_object_id(id_), "ownerId": owner_id})
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
        return _serialise(doc)

    async def create(self, data: dict, owner_id: str) -> dict:
        payload = {k: v for k, v in data.items() if k not in ("id", "_id", "ownerId")}
        payload["ownerId"] = owner_id
        result = await self._col.insert_one(payload)
        doc = await self._col.find_one({"_id": result.inserted_id})
        return _serialise(doc)  # type: ignore[arg-type]

    async def upsert(self, data: dict, owner_id: str) -> dict:
        """Create or update based on whether data contains an existing id."""
        id_ = data.get("id")
        if id_:
            return await self.update(id_, data, owner_id)
        return await self.create(data, owner_id)

    async def update(self, id_: str, data: dict, owner_id: str) -> dict:
        update_data = {k: v for k, v in data.items() if k not in ("id", "_id", "ownerId")}
        doc = await self._col.find_one_and_update(
            {"_id": _parse_object_id(id_), "ownerId": owner_id},
            {"$set": update_data},
            return_document=True,
        )
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
        return _serialise(doc)

    async def delete(self, id_: str, owner_id: str) -> None:
        result = await self._col.delete_one({"_id": _parse_object_id(id_), "ownerId": owner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    async def delete_by_owner(self, owner_id: str) -> int:
        result = await self._col.delete_many({"ownerId": owner_id})
        return result.deleted_count
