"""Gemini embedding client with batching and retry logic."""

import time
from typing import Any

from google import genai
from google.genai import types
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import settings

# Maximum texts per embed_content request (Gemini API limit)
_MAX_BATCH = 100


class GeminiEmbedder:
    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.google_api_key)
        self._model = settings.embedding_model
        logger.info(f"Initialised Gemini embedder with model={self._model}")

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        reraise=True,
    )
    def _embed_batch_raw(self, texts: list[str]) -> list[list[float]]:
        """Call Gemini embed_content for up to _MAX_BATCH texts."""
        response = self._client.models.embed_content(
            model=self._model,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.embedding_dimensions,
            ),
        )
        return [e.values for e in response.embeddings]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of texts, splitting into sub-batches if needed.
        Returns a list of embedding vectors (same order as input).
        """
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), _MAX_BATCH):
            chunk = texts[i : i + _MAX_BATCH]
            logger.debug(f"Embedding chunk {i}–{i + len(chunk)} of {len(texts)}")
            batch_result = self._embed_batch_raw(chunk)
            all_embeddings.extend(batch_result)
            # Polite rate-limiting between chunks
            if i + _MAX_BATCH < len(texts):
                time.sleep(0.5)
        return all_embeddings

    def embed_items(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Add an 'embedding' key to each item dict in-place using item['embed_text'].
        Returns the same list (mutated).
        """
        texts = [item.get("embed_text", item.get("name", "")) for item in items]
        logger.info(f"Generating embeddings for {len(texts)} items …")
        embeddings = self.embed_batch(texts)
        for item, emb in zip(items, embeddings):
            item["embedding"] = emb
        logger.info("Embeddings generated.")
        return items
