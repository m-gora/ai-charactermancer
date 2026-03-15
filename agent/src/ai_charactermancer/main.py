"""AI Sidekick — FastAPI app that streams Gemini responses via LangGraph."""

import json
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
import httpx

from .config import settings
from .graph import AgentState, get_graph
from .models import SidekickRequest, HistoryMessage

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
# Streaming response — drives the LangGraph pipeline
# ---------------------------------------------------------------------------


async def _stream_response(
    message: str,
    draft: dict,
    step: str,
    history: list[HistoryMessage],
) -> AsyncGenerator[str, None]:
    """
    Run the 3-node LangGraph pipeline and stream results as Server-Sent Events.

    SSE protocol:
      data: "<text chunk>"          — narrative token (streamed in real-time)
      event: actions
      data: [{"type":…, …}, …]      — click-to-apply action items (emitted once)
      data: [DONE]                  — stream closed
    """
    initial_state = AgentState(
        query=message,
        draft=draft,
        step=step,
        history=[{"role": h.role, "content": h.content} for h in history],
        retrieved_docs=[],
        validated_docs=[],
        response_text="",
        a2ui_messages=[],
    )

    graph = get_graph()

    # run_id of the first chat-model call inside the ui node (the streaming
    # narrative).  We track it so we don't accidentally forward tokens from
    # the second, non-streaming structured-output call.
    narrative_run_id: str | None = None
    actions_emitted = False

    async for event in graph.astream_events(initial_state, version="v2"):
        kind: str = event["event"]
        node: str = event.get("metadata", {}).get("langgraph_node", "")

        # Capture the run_id of the first LLM call inside the ui node.
        if kind == "on_chat_model_start" and node == "ui" and narrative_run_id is None:
            narrative_run_id = event["run_id"]

        # Forward streaming narrative tokens.
        elif kind == "on_chat_model_stream" and event["run_id"] == narrative_run_id:
            chunk = event["data"]["chunk"]
            text = chunk.content if isinstance(chunk.content, str) else ""
            if text:
                yield f"data: {json.dumps(text)}\n\n"

        # When the ui node finishes, emit A2UI messages as a typed SSE event.
        elif kind == "on_chain_end" and event.get("name") == "ui" and not actions_emitted:
            actions_emitted = True
            output: dict = event["data"].get("output", {})
            a2ui_messages = output.get("a2ui_messages", [])
            if a2ui_messages:
                yield f"event: a2ui\ndata: {json.dumps(a2ui_messages)}\n\n"

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
