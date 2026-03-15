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
      │
      ▼
    ui           Node 3 — stream narrative + extract structured UI actions
      │
      ▼
    END

The FastAPI layer drives the graph via ``astream_events`` so that LLM token
chunks emitted inside the *ui* node are forwarded to the browser in real time.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel
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
    actions: list[dict[str, Any]]


# ---------------------------------------------------------------------------
# Structured-output schema (used by the UI node's action-extraction call)
# ---------------------------------------------------------------------------


class ActionItem(BaseModel):
    """One click-to-apply recommendation for the character sheet."""

    type: Literal[
        "add_feat",
        "add_trait",
        "add_equipment",
        "set_race",
        "set_class",
        "add_racial_trait",
    ]
    label: str          # display text shown on the chip / button
    field: str          # CharacterDraft key to update
    value: str          # value to set (scalar) or append (array fields)
    description: str = ""   # one-sentence benefit summary for the tooltip


class ActionsOutput(BaseModel):
    actions: list[ActionItem]


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

_ACTIONS_SYSTEM = """\
Extract click-to-apply action buttons from a character-creation recommendation.

Action type mapping:
  feats/feat abilities  → type="add_feat",        field="feats"
  traits                → type="add_trait",       field="traits"
  items / equipment     → type="add_equipment",   field="equipment"
  races                 → type="set_race",        field="race"
  classes               → type="set_class",       field="class"
  racial trait overrides→ type="add_racial_trait",field="racialTraitOverrides"

Rules:
• Only create actions for items **explicitly recommended** in the narrative.
• Only include items that appear in the eligible list provided.
• Skip anything the character already possesses.
• label = value = the exact item name as it appears in the rules.
• description: one sentence — what the item does for the character."""


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
# Node 3 — UI (narrative stream + structured action extraction)
# ---------------------------------------------------------------------------


async def ui_node(state: AgentState) -> dict[str, Any]:
    """
    Stream a narrative response (LangGraph surfaces on_chat_model_stream events
    to the FastAPI layer), then extract structured click-to-apply action items.
    """
    context_section = _build_context_section(state["validated_docs"])
    system_prompt = _NARRATIVE_SYSTEM.format(
        step=state["step"],
        draft=json.dumps(state["draft"], indent=2),
        context_section=context_section,
    )

    # Build LangChain message list from history --------------------------------
    lc_messages: list = [SystemMessage(content=system_prompt)]
    for turn in state["history"]:
        cls = HumanMessage if turn["role"] == "user" else AIMessage
        lc_messages.append(cls(content=turn["content"]))
    lc_messages.append(HumanMessage(content=state["query"]))

    # --- Call 1: streaming narrative (astream exposes token events) -----------
    narrative_llm = ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.google_api_key,
        streaming=True,
    )
    full_text = ""
    async for chunk in narrative_llm.astream(lc_messages):
        if chunk.content:
            full_text += chunk.content

    # --- Call 2: structured action extraction (non-streaming, fast) ----------
    eligible_summaries = [
        {
            "name": d["name"],
            "collection": d["collection"],
            "summary": d.get("summary", ""),
        }
        for d in state["validated_docs"]
        if d.get("eligible", True)
    ]

    actions: list[dict[str, Any]] = []
    if eligible_summaries:
        action_llm = ChatGoogleGenerativeAI(
            model=settings.chat_model,
            google_api_key=settings.google_api_key,
        )
        structured_llm = action_llm.with_structured_output(ActionsOutput)
        extraction_prompt = (
            f"Narrative:\n{full_text}\n\n"
            f"Character draft:\n{json.dumps(state['draft'], indent=2)}\n\n"
            f"Eligible items:\n{json.dumps(eligible_summaries, indent=2)}"
        )
        result = await structured_llm.ainvoke(
            [SystemMessage(content=_ACTIONS_SYSTEM), HumanMessage(content=extraction_prompt)]
        )
        if result and hasattr(result, "actions"):
            actions = [a.model_dump() for a in result.actions]

    return {"response_text": full_text, "actions": actions}


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------


def build_graph():
    """Build and compile the 3-node LangGraph pipeline."""
    g = StateGraph(AgentState)
    g.add_node("rag", rag_node)
    g.add_node("validation", validation_node)
    g.add_node("ui", ui_node)
    g.add_edge(START, "rag")
    g.add_edge("rag", "validation")
    g.add_edge("validation", "ui")
    g.add_edge("ui", END)
    return g.compile()


_compiled: Any = None


def get_graph():
    """Return the module-level compiled graph (lazy singleton)."""
    global _compiled
    if _compiled is None:
        _compiled = build_graph()
    return _compiled
