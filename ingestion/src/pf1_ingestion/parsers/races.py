"""Parser for the 'races' pack."""

from pathlib import Path

from .common import build_embed_text, extract_uuid_refs, iter_yaml_files, load_yaml, strip_html

# Paizo product code → short source book name shown in the UI
_SOURCE_NAMES: dict[str, str] = {
    "PZO1110": "Core Rulebook",
    "PZO1112": "Bestiary 1",
    "PZO1121": "Bestiary 2",
    "PZO1133": "Bestiary 5",
    "PZO1137": "Ultimate Wilderness",
    "PZO1140": "Advanced Race Guide",
    "PZO1141": "Planar Adventures",
    "PZO9244": "Pathfinder Adventure Path",
    "PZO9280": "Inner Sea Races",
    "PZO9284": "Blood of the Moon",
    "PZO9482": "Aquatic Adventures",
    "PZO90111": "Strange Aeons",
}


def _source_category(raw: dict) -> str:
    """Return the source book name for the first recognised source ID."""
    for src in raw.get("system", {}).get("sources", []):
        name = _SOURCE_NAMES.get(src.get("id", ""))
        if name:
            return name
    return "Other"


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
