"""MongoDB loader: upserts PF1e nodes and creates Atlas Vector Search indexes."""

from typing import Any

import pymongo
from loguru import logger
from pymongo import MongoClient, UpdateOne
from pymongo.errors import OperationFailure
from pymongo.operations import SearchIndexModel

from .config import settings

# Collection names
COL_FEATS = "feats"
COL_CLASSES = "classes"
COL_RACES = "races"
COL_SPELLS = "spells"
COL_CLASS_ABILITIES = "class_abilities"
COL_TRAITS = "traits"
COL_RACIAL_TRAITS = "racial_traits"
COL_ITEMS = "items"


class MongoLoader:
    def __init__(self) -> None:
        self._client: MongoClient = MongoClient(settings.mongodb_uri)
        self._db = self._client[settings.mongodb_db]
        logger.info(f"Connected to MongoDB at {settings.mongodb_uri}, db={settings.mongodb_db}")

    def close(self) -> None:
        self._client.close()

    # ── Schema / index setup ─────────────────────────────────────────────────

    def setup_schema(self) -> None:
        """
        Create regular indexes on `name` for each collection, then create
        Atlas Vector Search indexes for semantic similarity queries.
        """
        logger.info("Setting up MongoDB schema and indexes …")

        collections = [COL_FEATS, COL_CLASSES, COL_RACES, COL_SPELLS, COL_CLASS_ABILITIES, COL_TRAITS, COL_RACIAL_TRAITS, COL_ITEMS]
        for col_name in collections:
            col = self._db[col_name]
            # Unique index on Foundry ID
            col.create_index([("id", pymongo.ASCENDING)], unique=True, background=True)
            # Text index for keyword fallback
            col.create_index([("name", pymongo.TEXT), ("summary", pymongo.TEXT)], background=True)
            # Atlas Vector Search index
            self._ensure_vector_index(col, index_name=f"{col_name}_vector")

        logger.info("Schema ready.")

    def _ensure_vector_index(self, collection, index_name: str) -> None:
        """Create (or recreate) a vectorSearch index with the configured dimensions."""
        existing = {idx["name"]: idx for idx in collection.list_search_indexes()}
        if index_name in existing:
            current_dims = (
                existing[index_name]
                .get("latestDefinition", {})
                .get("fields", [{}])[0]
                .get("numDimensions")
            )
            if current_dims == settings.embedding_dimensions:
                logger.debug(f"Vector index '{index_name}' already exists with correct dims, skipping.")
                return
            logger.info(f"Dropping stale vector index '{index_name}' (dims={current_dims} → {settings.embedding_dimensions}) …")
            collection.drop_search_index(index_name)
        try:
            model = SearchIndexModel(
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "numDimensions": settings.embedding_dimensions,
                            "similarity": "cosine",
                        }
                    ]
                },
                name=index_name,
                type="vectorSearch",
            )
            collection.create_search_index(model=model)
            logger.info(f"Created vector index '{index_name}' on {collection.name}.")
        except OperationFailure as exc:
            # Non-fatal: log and continue (e.g. community edition without mongot)
            logger.warning(f"Could not create vector index '{index_name}': {exc}")

    # ── Generic bulk upsert ──────────────────────────────────────────────────

    def _upsert_batch(
        self,
        col_name: str,
        items: list[dict[str, Any]],
        batch_size: int = 500,
    ) -> None:
        col = self._db[col_name]
        total = len(items)
        for i in range(0, total, batch_size):
            chunk = items[i : i + batch_size]
            ops = [
                UpdateOne(
                    {"id": doc["id"]},
                    {"$set": {k: v for k, v in doc.items() if not k.startswith("_")}},
                    upsert=True,
                )
                for doc in chunk
            ]
            col.bulk_write(ops, ordered=False)
            logger.debug(f"  Upserted {min(i + batch_size, total)}/{total} {col_name}")
        logger.info(f"Loaded {total} documents into '{col_name}'.")

    # ── Node loaders ─────────────────────────────────────────────────────────

    def load_feats(self, feats: list[dict]) -> None:
        # Denormalize prerequisite refs into the document itself
        for feat in feats:
            prereq_names = [
                ref["name"]
                for ref in feat.get("_uuid_refs", [])
                if ref.get("pack") == "feats"
            ]
            feat["prerequisite_names"] = prereq_names
        self._upsert_batch(COL_FEATS, feats)

    def load_classes(self, classes: list[dict]) -> None:
        self._upsert_batch(COL_CLASSES, classes)

    def load_races(self, races: list[dict]) -> None:
        self._upsert_batch(COL_RACES, races)

    def load_spells(self, spells: list[dict]) -> None:
        self._upsert_batch(COL_SPELLS, spells)

    def load_class_abilities(self, abilities: list[dict]) -> None:
        self._upsert_batch(COL_CLASS_ABILITIES, abilities)

    def load_traits(self, traits: list[dict]) -> None:
        self._upsert_batch(COL_TRAITS, traits)

    def load_racial_traits(self, racial_traits: list[dict]) -> None:
        self._upsert_batch(COL_RACIAL_TRAITS, racial_traits)

    def load_items(self, items: list[dict]) -> None:
        self._upsert_batch(COL_ITEMS, items)
