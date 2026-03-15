"""RAG helpers: retrieve relevant PF1e content from MongoDB using vector search."""

import asyncio
import re
from functools import lru_cache
from typing import Any

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
    prereq_names = m.get('prerequisite_names') or []
    description = _clean(m.get('description', ''))
    prereq_text = (
        ', '.join(prereq_names)
        or m.get('prerequisite_text', '')
        or _extract_prereqs(description)
    )

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


def _doc_to_dict(doc, collection_name: str) -> dict[str, Any]:
    """Convert a LangChain Document to a plain dict consumed by the graph nodes."""
    m = doc.metadata
    prereq_names: list[str] = m.get('prerequisite_names') or []
    description = _clean(m.get('description', ''))
    prereq_text = (
        m.get('prerequisite_text', '')
        or ', '.join(prereq_names)
        or _extract_prereqs(description)
    )
    return {
        "name": m.get('name', ''),
        "collection": collection_name,
        "summary": _clean(m.get('summary', '')),
        "prerequisite_names": prereq_names,
        "prerequisite_text": prereq_text,
        "description": description,
        "formatted": _format_doc(doc),
    }


def _search_collection_docs(
    collection_name: str, vector: list[float], k: int
) -> list[dict[str, Any]]:
    """Search one collection and return structured doc dicts."""
    try:
        docs = _vector_store(collection_name).similarity_search_by_vector(vector, k=k)
        return [_doc_to_dict(doc, collection_name) for doc in docs]
    except Exception:
        return []


async def retrieve_docs(query: str, step: str, k: int = 4) -> list[dict[str, Any]]:
    """
    Embed the query once, search all relevant collections in parallel, and
    return a list of structured doc dicts (used by the validation & UI nodes).
    """
    collections = _STEP_COLLECTIONS.get(step, _FALLBACK_COLLECTIONS)
    if not collections:
        return []

    loop = asyncio.get_event_loop()
    vector = await loop.run_in_executor(None, _embed_query, query)

    results = await asyncio.gather(
        *[
            loop.run_in_executor(None, _search_collection_docs, col, vector, k)
            for col in collections
        ],
        return_exceptions=True,
    )

    docs: list[dict[str, Any]] = []
    for result in results:
        if isinstance(result, list):
            docs.extend(result)
    return docs


async def retrieve_context(query: str, step: str, k: int = 4) -> str:
    """
    Convenience wrapper that returns a formatted context string.
    Kept for backward-compatibility; the graph nodes use retrieve_docs directly.
    """
    docs = await retrieve_docs(query, step, k)
    return "\n\n---\n\n".join(d["formatted"] for d in docs)
