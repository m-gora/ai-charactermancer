"""Parser for the 'races' pack."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html


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
        "creature_types": system.get("creatureTypes", []),
        "creature_subtypes": system.get("creatureSubtypes", []),
        "stat_modifiers": stat_mods,
        "embed_text": build_embed_text(name, summary, strip_html(desc.get("value", ""))),
    }


def scan_races(races_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(races_path):
        node = parse_race(path)
        if node:
            items.append(node)
    return items
