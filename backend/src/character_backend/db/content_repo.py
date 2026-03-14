"""Read-only repository for ingested PF1e game content collections."""

from motor.motor_asyncio import AsyncIOMotorDatabase

# Exclude large internal fields from API responses
_CONTENT_EXCLUDE = {"embedding": 0, "embed_text": 0, "_uuid_refs": 0}

_RACE_PROJECTION = {**_CONTENT_EXCLUDE, "_id": 0}
_CLASS_PROJECTION = {**_CONTENT_EXCLUDE, "_id": 0}
_FEAT_PROJECTION = {**_CONTENT_EXCLUDE, "_id": 0}
_CLASS_ABILITY_PROJECTION = {**_CONTENT_EXCLUDE, "_id": 0}
_TRAIT_PROJECTION      = {**_CONTENT_EXCLUDE, "_id": 0}
_RACIAL_TRAIT_PROJECTION = {**_CONTENT_EXCLUDE, "_id": 0}
_ITEM_PROJECTION       = {**_CONTENT_EXCLUDE, "_id": 0}


class ContentRepo:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db

    async def list_races(self, category: str | None = None) -> list[dict]:
        query: dict = {}
        if category:
            query["source_category"] = category
        cursor = self._db["races"].find(query, _RACE_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_classes(self, category: str | None = None) -> list[dict]:
        query: dict = {}
        if category:
            query["source_category"] = category
        cursor = self._db["classes"].find(query, _CLASS_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_feats(self, sub_type: str | None = None) -> list[dict]:
        query: dict = {}
        if sub_type:
            query["sub_type"] = sub_type
        cursor = self._db["feats"].find(query, _FEAT_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_class_abilities(self, class_name: str | None = None) -> list[dict]:
        query: dict = {}
        if class_name:
            query["associated_classes"] = class_name
        cursor = self._db["class_abilities"].find(query, _CLASS_ABILITY_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_traits(self, trait_type: str | None = None) -> list[dict]:
        query: dict = {}
        if trait_type:
            query["trait_type"] = trait_type
        cursor = self._db["traits"].find(query, _TRAIT_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_racial_traits(
        self,
        race: str | None = None,
        alt_only: bool = False,
    ) -> list[dict]:
        query: dict = {}
        if race:
            query["races"] = race
        if alt_only:
            query["replaces"] = {"$exists": True, "$ne": []}
        cursor = self._db["racial_traits"].find(query, _RACIAL_TRAIT_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]

    async def list_items(
        self,
        item_type: str | None = None,
        sub_type: str | None = None,
    ) -> list[dict]:
        query: dict = {}
        if item_type:
            query["item_type"] = item_type
        if sub_type:
            query["sub_type"] = sub_type
        cursor = self._db["items"].find(query, _ITEM_PROJECTION).sort("name", 1)
        return [doc async for doc in cursor]
