"""Parser for the 'races' pack."""

from pathlib import Path

from .common import build_embed_text, extract_uuid_refs, iter_yaml_files, load_yaml, strip_html

# Foundry item sub-type → display category tag
_SUBTYPE_CATEGORY: dict[str, str] = {
    "core": "core",
    "featured": "featured",
    "uncommon": "uncommon",
    "advanced": "advanced",
    "monstrous": "monstrous",
}


def _source_category(raw: dict) -> str:
    """Derive a display category from the Foundry source/subtype fields."""
    system = raw.get("system", {})
    subtype = (system.get("subtype") or "").lower()
    if subtype in _SUBTYPE_CATEGORY:
        return _SUBTYPE_CATEGORY[subtype]
    # Fall back to the source book abbreviation if present
    source = (system.get("source") or "").upper()
    for book in ("ARG", "B1", "B2", "B3", "B4", "B5"):
        if book in source:
            return "monstrous" if book.startswith("B") else "advanced"
    return "core"


def _racial_abilities(raw: dict) -> list[dict]:
    """Extract racial traits / abilities from items embedded in the race entry."""
    abilities: list[dict] = []
    for item in raw.get("items", {}).values():
        if not isinstance(item, dict):
            continue
        item_type = item.get("type", "")
        if item_type not in ("racial-hd", "attack", "feat", "buff", "ability"):
            continue
        name = item.get("name", "")
        if not name:
            continue
        sys = item.get("system", {})
        desc = sys.get("description", {})
        summary = desc.get("summary", "") or strip_html(desc.get("value", ""))
        abilities.append({"name": name, "summary": summary, "type": item_type})
    return abilities


def parse_race(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None

    system = raw.get("system", {})
    desc = system.get("description", {})
    name = raw.get("name", "")
    summary = desc.get("summary", "")

    # Extract racial stat modifiers from the changes block
    stat_mods: dict[str, int] = {}
    for change in system.get("changes", {}).values():
        target = change.get("target", "")
        formula = change.get("formula", "")
        change_type = change.get("type", "")
        if change_type == "racial" and target in ("str", "dex", "con", "int", "wis", "cha"):
            try:
                stat_mods[target] = int(formula)
            except (ValueError, TypeError):
                pass

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": strip_html(desc.get("value", "")),
        "source_category": _source_category(raw),
        "creature_types": system.get("creatureTypes", []),
        "creature_subtypes": system.get("creatureSubtypes", []),
        "stat_modifiers": stat_mods,
        "racial_abilities": _racial_abilities(raw),
        "_uuid_refs": extract_uuid_refs(desc.get("value", "")),
        "embed_text": build_embed_text(name, summary, strip_html(desc.get("value", ""))),
    }


def scan_races(races_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(races_path):
        node = parse_race(path)
        if node:
            items.append(node)
    return items
