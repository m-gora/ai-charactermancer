"""AI Sidekick — FastAPI app that streams Gemini responses with RAG context."""

import asyncio
import json
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from jose import JWTError, jwt
import httpx

from .config import settings
from .models import SidekickRequest, HistoryMessage
from .rag import retrieve_context

load_dotenv()

app = FastAPI(title="AI Charactermancer — Sidekick Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth (re-uses the same Auth0 JWKS validation pattern as the backend)
# ---------------------------------------------------------------------------

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    url = f"https://{settings.auth0_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


async def verify_token(authorization: str | None = None) -> str:
    """Extract and validate Auth0 Bearer token; return the subject (user id)."""
    _401 = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise _401
    token = authorization.removeprefix("Bearer ").strip()
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = await _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            global _jwks_cache
            _jwks_cache = None
            jwks = await _get_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise _401
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=f"https://{settings.auth0_domain}/",
        )
        return payload["sub"]
    except (JWTError, KeyError):
        raise _401


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an AI sidekick in a Pathfinder 1e character creation wizard. \
You help the player make informed decisions at the current step: {step}.

The player's character so far:
{draft}

{context_block}
Answer concisely and helpfully using Markdown formatting (bold key terms, bullet lists for \
options, short paragraphs).

CRITICAL RULES — you MUST follow these without exception:
1. **Only reference content that appears verbatim in the "Relevant rules" block above.** \
Never invent feat names, trait names, spell names, prerequisites, or mechanical effects. \
If a feat or rule is not in the retrieved context, do not mention it.
2. **Before recommending any feat or ability, explicitly verify every listed prerequisite \
against the character draft.** If the character does not satisfy a prerequisite (e.g. \
required skill ranks, BAB, another feat, or ability score), do not recommend that option.
3. If the retrieved context does not contain enough feats the character qualifies for, \
say so honestly rather than inventing alternatives."""


async def _stream_response(
    message: str,
    draft: dict,
    step: str,
    history: list[HistoryMessage],
) -> AsyncGenerator[str, None]:
    feat_step_k = 10 if step == "feats" else 4
    context = await retrieve_context(message, step, k=feat_step_k)
    context_block = (
        f"Relevant rules and game content:\n{context}" if context else ""
    )
    system_prompt = _SYSTEM_PROMPT.format(
        step=step,
        draft=json.dumps(draft, indent=2),
        context_block=context_block,
    )

    # Build multi-turn contents: system instruction + prior turns + new message
    from google.genai import types
    contents = []
    for turn in history:
        role = "user" if turn.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.content)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    client = genai.Client(api_key=settings.google_api_key)
    loop = asyncio.get_event_loop()

    def _generate():
        return client.models.generate_content_stream(
            model=settings.chat_model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        )

    stream = await loop.run_in_executor(None, _generate)
    for chunk in stream:
        if chunk.text:
            yield f"data: {json.dumps(chunk.text)}\n\n"
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/api/sidekick/chat")
async def sidekick_chat(
    body: SidekickRequest,
    authorization: str | None = Header(default=None),
):
    await verify_token(authorization)
    return StreamingResponse(
        _stream_response(body.message, body.draft, body.step, body.history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health", include_in_schema=False)
async def health() -> dict:
    return {"status": "ok"}
