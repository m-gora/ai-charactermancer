"""RAG helpers: retrieve relevant PF1e content from MongoDB using vector search."""

import asyncio
from functools import lru_cache

import pymongo
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch

from .config import settings

# Map wizard step IDs to the most relevant MongoDB collections.
# Empty list → no retrieval needed; answer from LLM knowledge only.
_STEP_COLLECTIONS: dict[str, list[str]] = {
    "basic-info": [],
    "race": ["races", "racial_traits"],
    "class": ["classes", "class_abilities"],
    "attributes": [],
    "feats": ["feats"],
    "traits": ["traits"],
    "equipment": ["items"],
}

_FALLBACK_COLLECTIONS = ["feats", "classes", "races", "traits"]


@lru_cache(maxsize=1)
def _embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=f"models/{settings.embedding_model}",
        google_api_key=settings.google_api_key,
        task_type="RETRIEVAL_QUERY",
    )


@lru_cache(maxsize=1)
def _mongo_client() -> pymongo.MongoClient:
    return pymongo.MongoClient(settings.mongodb_uri)


@lru_cache(maxsize=16)
def _vector_store(collection_name: str) -> MongoDBAtlasVectorSearch:
    db = _mongo_client()[settings.mongodb_db]
    return MongoDBAtlasVectorSearch(
        collection=db[collection_name],
        embedding=_embeddings(),
        index_name=f"{collection_name}_vector",
        embedding_key="embedding",
        text_key="embed_text",
        relevance_score_fn="cosine",
    )


def _embed_query(query: str) -> list[float]:
    """Embed the query once, synchronously — called from a thread pool executor."""
    return _embeddings().embed_query(query)


import re

_UUID_RE = re.compile(r'@UUID\[[^\]]+\]\{([^}]+)\}')
_PREREQ_RE = re.compile(r'Prerequisites?\s*:\s*([^.]+\.)', re.IGNORECASE)
_BENEFIT_RE = re.compile(r'Benefits?\s*:\s*', re.IGNORECASE)


def _clean(text: str) -> str:
    """Strip Foundry @UUID[...]{name} references, keeping just the name."""
    return _UUID_RE.sub(r'\1', text).strip()


def _extract_prereqs(description: str) -> str:
    """Pull the Prerequisites sentence from plain-text description."""
    m = _PREREQ_RE.search(description)
    return m.group(1).strip() if m else ""


def _format_doc(doc) -> str:
    m = doc.metadata
    name = m.get('name', '')
    summary = _clean(m.get('summary', ''))
    # prerequisite_names is only populated when the source YAML uses @UUID links.
    # prerequisite_text is set by the parser (plain-text extraction).
    # Fall back to parsing the description on the fly for legacy docs.
    prereq_names = m.get('prerequisite_names') or []
    description = _clean(m.get('description', ''))
    prereq_text = (
        ', '.join(prereq_names)
        or m.get('prerequisite_text', '')
        or _extract_prereqs(description)
    )

    # Show everything before "Benefit" as the benefit summary (up to 300 chars)
    benefit_match = _BENEFIT_RE.search(description)
    benefit_text = description[benefit_match.end():][:300] if benefit_match else description[:300]

    parts = [f"**{name}**"]
    if summary:
        parts.append(summary)
    if prereq_text:
        parts.append(f"Prerequisites: {prereq_text}")
    if benefit_text:
        parts.append(f"Benefit: {benefit_text}")
    return '\n'.join(parts)


def _search_collection(
    collection_name: str, vector: list[float], k: int
) -> list[str]:
    """Search one collection by pre-computed vector — no extra embedding call."""
    try:
        docs = _vector_store(collection_name).similarity_search_by_vector(
            vector, k=k
        )
        return [_format_doc(doc) for doc in docs]
    except Exception:
        return []


async def retrieve_context(query: str, step: str, k: int = 4) -> str:
    """
    Embed the query once, then search all relevant collections in parallel.
    Returns a formatted context string, or empty string when not needed.
    """
    collections = _STEP_COLLECTIONS.get(step, _FALLBACK_COLLECTIONS)
    if not collections:
        return ""

    loop = asyncio.get_event_loop()

    # Single embedding call shared across all collections
    vector = await loop.run_in_executor(None, _embed_query, query)

    results = await asyncio.gather(
        *[
            loop.run_in_executor(None, _search_collection, col, vector, k)
            for col in collections
        ],
        return_exceptions=True,
    )

    chunks: list[str] = []
    for result in results:
        if isinstance(result, list):
            chunks.extend(result)

    return "\n\n---\n\n".join(chunks)
