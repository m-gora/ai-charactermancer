"""Pure-math prerequisite validation — Node 2 of the LangGraph pipeline.

Checks each retrieved doc against the current character draft using only
arithmetic and set membership. No network calls, no LLM.
"""

import math
import re
from typing import Any

# ---------------------------------------------------------------------------
# BAB progression rates
# ---------------------------------------------------------------------------

_BAB_FULL: float = 1.0
_BAB_THREE_QUARTERS: float = 0.75
_BAB_HALF: float = 0.5

# fmt: off
_BAB_TABLE: dict[str, float] = {
    # Full BAB
    "Barbarian": _BAB_FULL, "Bloodrager": _BAB_FULL, "Brawler": _BAB_FULL,
    "Cavalier": _BAB_FULL,  "Fighter": _BAB_FULL,    "Gunslinger": _BAB_FULL,
    "Paladin": _BAB_FULL,   "Ranger": _BAB_FULL,     "Slayer": _BAB_FULL,
    "Swashbuckler": _BAB_FULL,
    # 3/4 BAB
    "Alchemist": _BAB_THREE_QUARTERS,   "Antipaladin": _BAB_THREE_QUARTERS,
    "Bard": _BAB_THREE_QUARTERS,        "Cleric": _BAB_THREE_QUARTERS,
    "Druid": _BAB_THREE_QUARTERS,       "Hunter": _BAB_THREE_QUARTERS,
    "Inquisitor": _BAB_THREE_QUARTERS,  "Investigator": _BAB_THREE_QUARTERS,
    "Magus": _BAB_THREE_QUARTERS,       "Medium": _BAB_THREE_QUARTERS,
    "Mesmerist": _BAB_THREE_QUARTERS,   "Monk": _BAB_THREE_QUARTERS,
    "Occultist": _BAB_THREE_QUARTERS,   "Oracle": _BAB_THREE_QUARTERS,
    "Rogue": _BAB_THREE_QUARTERS,       "Shaman": _BAB_THREE_QUARTERS,
    "Skald": _BAB_THREE_QUARTERS,       "Spiritualist": _BAB_THREE_QUARTERS,
    "Summoner": _BAB_THREE_QUARTERS,    "Unchained Summoner": _BAB_THREE_QUARTERS,
    "Vigilante": _BAB_THREE_QUARTERS,   "Warpriest": _BAB_THREE_QUARTERS,
    # 1/2 BAB
    "Arcanist": _BAB_HALF,  "Psychic": _BAB_HALF,  "Sorcerer": _BAB_HALF,
    "Witch": _BAB_HALF,     "Wizard": _BAB_HALF,
}
# fmt: on

# ---------------------------------------------------------------------------
# Regex patterns for prerequisite text parsing
# ---------------------------------------------------------------------------

_BAB_RE = re.compile(
    r"(?:base\s+attack\s+bonus|bab)\s*\+?(\d+)",
    re.IGNORECASE,
)
_ABILITY_RE = re.compile(
    r"\b(strength|dexterity|constitution|intelligence|wisdom|charisma"
    r"|str|dex|con|int|wis|cha)\s+(\d+)",
    re.IGNORECASE,
)
_SKILL_RANKS_RE = re.compile(
    r"(\d+)\s+ranks?\s+in\s+([\w\s]+?)(?:,|;|\.|$)",
    re.IGNORECASE,
)

_ATTR_NORMALISE: dict[str, str] = {
    "strength": "str",      "str": "str",
    "dexterity": "dex",     "dex": "dex",
    "constitution": "con",  "con": "con",
    "intelligence": "int",  "int": "int",
    "wisdom": "wis",        "wis": "wis",
    "charisma": "cha",      "cha": "cha",
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def compute_bab(class_name: str | None, level: int) -> int:
    """Return the character's total Base Attack Bonus given class and level."""
    rate = _BAB_TABLE.get(class_name or "", _BAB_THREE_QUARTERS)
    return math.floor(rate * level)


def _check_doc(doc: dict[str, Any], draft: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Check a single doc against the draft.

    Returns ``(eligible, fail_reasons)`` where *fail_reasons* is empty when
    eligible.  Items without structured prerequisites pass by default.
    """
    fails: list[str] = []

    prereq_names: list[str] = doc.get("prerequisite_names") or []
    prereq_text: str = doc.get("prerequisite_text") or ""

    # Resolve draft fields ---------------------------------------------------
    draft_feats: set[str] = set(draft.get("feats") or [])
    draft_traits: set[str] = set(draft.get("traits") or [])
    draft_racial: set[str] = set(draft.get("racialTraitOverrides") or [])
    draft_known = draft_feats | draft_traits | draft_racial

    draft_race: str = (draft.get("race") or "").strip()
    draft_class: str = (draft.get("class") or "").strip()
    draft_level: int = int(draft.get("level") or 1)
    attrs: dict[str, int] = draft.get("attributes") or {}
    skills: dict[str, int] = draft.get("skills") or {}

    # 1. Structural prerequisite names (feats, special abilities) -------------
    for req in prereq_names:
        if req not in draft_known and req != draft_race and req != draft_class:
            fails.append(f"requires {req!r}")

    # 2. BAB requirement ------------------------------------------------------
    bab = compute_bab(draft_class, draft_level)
    for m in _BAB_RE.finditer(prereq_text):
        required_bab = int(m.group(1))
        if bab < required_bab:
            fails.append(f"needs BAB +{required_bab} (current +{bab})")

    # 3. Ability score minimums -----------------------------------------------
    for m in _ABILITY_RE.finditer(prereq_text):
        key = _ATTR_NORMALISE.get(m.group(1).lower(), "")
        threshold = int(m.group(2))
        if key:
            current = attrs.get(key, 10)
            if current < threshold:
                fails.append(
                    f"needs {m.group(1).capitalize()} {threshold}"
                    f" (current {current})"
                )

    # 4. Skill rank requirements ----------------------------------------------
    for m in _SKILL_RANKS_RE.finditer(prereq_text):
        needed_ranks = int(m.group(1))
        skill_name = m.group(2).strip().lower()
        current_ranks = next(
            (v for k, v in skills.items() if skill_name in k.lower()),
            0,
        )
        if current_ranks < needed_ranks:
            fails.append(
                f"needs {needed_ranks} ranks in {m.group(2).strip()}"
            )

    return len(fails) == 0, fails


def validate_docs(
    docs: list[dict[str, Any]], draft: dict[str, Any]
) -> list[dict[str, Any]]:
    """
    Annotate every doc dict with ``eligible`` (bool) and
    ``fail_reasons`` (list[str]).

    All docs are returned — ineligible ones are kept so the LLM can
    explain why they were excluded.
    """
    out: list[dict[str, Any]] = []
    for doc in docs:
        eligible, fail_reasons = _check_doc(doc, draft)
        out.append({**doc, "eligible": eligible, "fail_reasons": fail_reasons})
    return out
