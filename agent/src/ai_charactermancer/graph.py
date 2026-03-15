"""LangGraph multi-step agent for the AI Sidekick.

Graph layout
------------
    START
      │
      ▼
    rag          Node 1 — vector-search relevant PF1e content
      │
      ▼
    validation   Node 2 — pure-math prerequisite check (no LLM)
     / \\
    ▼   ▼
  narr  a2ui     Nodes 3a/3b — run in parallel after validation
     \\ /
      ▼
    END

The FastAPI layer drives the graph via ``astream_events`` so that LLM token
chunks emitted inside the *narrative_node* are forwarded to the browser in
real time.  The *a2ui_node* runs concurrently and its structured-JSON result
lands as soon as it finishes — typically while the narrative is still
streaming — eliminating the sequential bottleneck.
"""

from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from .config import settings
from .rag import retrieve_docs
from .validation import validate_docs

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


class AgentState(TypedDict):
    # ── inputs ──────────────────────────────────────────────────────────────
    query: str
    draft: dict[str, Any]
    step: str
    history: list[dict[str, str]]   # [{"role": "user"|"assistant", "content": "..."}]

    # ── set by rag node ──────────────────────────────────────────────────────
    retrieved_docs: list[dict[str, Any]]

    # ── set by validation node ───────────────────────────────────────────────
    validated_docs: list[dict[str, Any]]

    # ── set by ui node ───────────────────────────────────────────────────────
    response_text: str
    a2ui_messages: list[dict[str, Any]]   # A2UI v0.8 ServerToClientMessage[]


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_NARRATIVE_SYSTEM = """\
You are an AI sidekick in a Pathfinder 1e character creation wizard helping \
with step: {step}.

Current character draft:
{draft}

{context_section}
Reply concisely with Markdown (bold key terms, bullet lists). Follow these \
rules strictly:
1. Only reference content from the "Eligible content" block. \
   Never invent feat names, trait names, spell names, prerequisites, or \
   mechanical effects.
2. Only recommend **eligible** items. Do not mention ineligible ones.
3. If no eligible options exist in the context, say so honestly rather than \
   inventing alternatives."""

# Collection name → CharacterDraft field
_COLLECTION_FIELD: dict[str, str] = {
    "feats": "feats",
    "traits": "traits",
    "items": "equipment",
    "races": "race",
    "classes": "class",
    "racial_traits": "racialTraitOverrides",
    # class_abilities are informational — no button
}

_A2UI_SYSTEM = """\
Generate A2UI v0.8 JSON messages for a Pathfinder 1e sidekick recommendation panel.

Return ONLY a raw JSON array — no markdown fences, no explanation, no extra text.

SURFACE ID: "actions"  ROOT ID: "root"

Button action encoding: "{field}:{item_name}"
  feats            → feats
  traits           → traits
  items/equipment  → equipment
  races            → race
  classes          → class
  racial_traits    → racialTraitOverrides
  class_abilities  → SKIP (informational only, no button)

REQUIRED OUTPUT STRUCTURE:
[
  { "surfaceUpdate": { "surfaceId": "actions", "components": [
      { "id": "root",   "component": { "Column": { "children": { "explicitList": ["card-0", ...] } } } },
      { "id": "card-0", "component": { "Card": { "child": "col-0" } } },
      { "id": "col-0",  "component": { "Column": { "children": { "explicitList": ["title-0", "body-0", "btn-0"] } } } },
      { "id": "title-0","component": { "Text": { "text": { "literalString": "ITEM NAME" }, "usageHint": "h3" } } },
      { "id": "body-0", "component": { "Text": { "text": { "literalString": "One-sentence benefit." }, "usageHint": "body2" } } },
      { "id": "btn-0",  "component": { "Button": { "child": "btnlbl-0", "action": {"name": "feats:ITEM NAME"} } } },
      { "id": "btnlbl-0","component": { "Text": { "text": { "literalString": "Add to sheet" } } } }
  ] } },
  { "beginRendering": { "surfaceId": "actions", "root": "root" } }
]

Rules:
- One Card per eligible item (skip items already in the draft and class_abilities).
- Increment the numeric suffix for each item: card-0, card-1 …
- The "root" Column's explicitList must list every card-N id.
- Keep body text under 120 characters.
- Already-owned items: include Card but replace the Button with a Text that says "✓ Already on sheet".\
"""


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------


def _build_context_section(validated_docs: list[dict[str, Any]]) -> str:
    eligible = [d for d in validated_docs if d.get("eligible", True)]
    ineligible = [d for d in validated_docs if not d.get("eligible", True)]

    parts: list[str] = []
    if eligible:
        parts.append("**Eligible content (prerequisites met):**\n")
        parts.extend(d["formatted"] for d in eligible)
    if ineligible:
        parts.append("\n**Ineligible (prerequisites NOT met — do not recommend):**")
        for d in ineligible:
            reasons = "; ".join(d.get("fail_reasons") or [])
            parts.append(f"- {d['name']}: {reasons}")

    if not parts:
        return ""
    return "Relevant game content:\n" + "\n\n---\n\n".join(parts)


_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$", re.MULTILINE)


# ---------------------------------------------------------------------------
# Node 1 — RAG
# ---------------------------------------------------------------------------


async def rag_node(state: AgentState) -> dict[str, Any]:
    """Vector-search relevant PF1e content for the current wizard step."""
    k = 10 if state["step"] == "feats" else 4
    docs = await retrieve_docs(state["query"], state["step"], k=k)
    return {"retrieved_docs": docs}


# ---------------------------------------------------------------------------
# Node 2 — Validation (no LLM)
# ---------------------------------------------------------------------------


def validation_node(state: AgentState) -> dict[str, Any]:
    """Annotate each retrieved doc with eligibility — pure arithmetic, no LLM."""
    return {"validated_docs": validate_docs(state["retrieved_docs"], state["draft"])}


# ---------------------------------------------------------------------------
# Node 3a — Narrative (streaming)
# ---------------------------------------------------------------------------


async def narrative_node(state: AgentState) -> dict[str, Any]:
    """
    Stream the Markdown narrative reply.  Token events are surfaced via
    astream_events and forwarded to the browser in real time.
    """
    context_section = _build_context_section(state["validated_docs"])
    system_prompt = _NARRATIVE_SYSTEM.format(
        step=state["step"],
        draft=json.dumps(state["draft"], indent=2),
        context_section=context_section,
    )

    lc_messages: list = [SystemMessage(content=system_prompt)]
    for turn in state["history"]:
        cls = HumanMessage if turn["role"] == "user" else AIMessage
        lc_messages.append(cls(content=turn["content"]))
    lc_messages.append(HumanMessage(content=state["query"]))

    narrative_llm = ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.google_api_key,
        streaming=True,
    )
    full_text = ""
    async for chunk in narrative_llm.astream(lc_messages):
        if chunk.content:
            full_text += chunk.content

    return {"response_text": full_text}


# ---------------------------------------------------------------------------
# Node 3b — A2UI surface generation (JSON, non-streaming)
# ---------------------------------------------------------------------------


async def a2ui_node(state: AgentState) -> dict[str, Any]:
    """
    Generate A2UI v0.8 surface messages for the eligible items.  Runs in
    parallel with narrative_node — no dependency on the narrative text.
    """
    eligible_items = [
        {
            "name": d["name"],
            "collection": d["collection"],
            "field": _COLLECTION_FIELD.get(d["collection"], ""),
            "summary": (d.get("summary") or "")[:120],
            "already_owned": d["name"] in (
                state["draft"].get("feats", [])
                + state["draft"].get("traits", [])
                + state["draft"].get("equipment", [])
                + state["draft"].get("racialTraitOverrides", [])
            ),
        }
        for d in state["validated_docs"]
        if d.get("eligible", True) and _COLLECTION_FIELD.get(d["collection"])
    ]

    if not eligible_items:
        return {"a2ui_messages": []}

    a2ui_llm = ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.google_api_key,
        response_mime_type="application/json",
    )
    user_prompt = (
        f"Step: {state['step']}\n\n"
        f"User query: {state['query']}\n\n"
        f"Eligible items (JSON):\n{json.dumps(eligible_items, indent=2)}"
    )
    result = await a2ui_llm.ainvoke(
        [SystemMessage(content=_A2UI_SYSTEM), HumanMessage(content=user_prompt)]
    )
    raw = result.content.strip() if isinstance(result.content, str) else ""
    raw = _FENCE_RE.sub("", raw).strip()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return {"a2ui_messages": parsed}
    except json.JSONDecodeError:
        pass  # degrade gracefully — no surface shown

    return {"a2ui_messages": []}


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------


def build_graph():
    """Build and compile the LangGraph pipeline with parallel narrative/a2ui nodes."""
    g = StateGraph(AgentState)
    g.add_node("rag", rag_node)
    g.add_node("validation", validation_node)
    g.add_node("narrative", narrative_node)
    g.add_node("a2ui", a2ui_node)
    g.add_edge(START, "rag")
    g.add_edge("rag", "validation")
    # Fan-out: both nodes start as soon as validation finishes
    g.add_edge("validation", "narrative")
    g.add_edge("validation", "a2ui")
    # Fan-in: END is reached only after both nodes complete
    g.add_edge(["narrative", "a2ui"], END)
    return g.compile()


_compiled: Any = None


def get_graph():
    """Return the module-level compiled graph (lazy singleton)."""
    global _compiled
    if _compiled is None:
        _compiled = build_graph()
    return _compiled

