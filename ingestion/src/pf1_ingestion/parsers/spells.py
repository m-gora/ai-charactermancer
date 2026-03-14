"""Parser for the 'spells' pack."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html


def parse_spell(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None

    system = raw.get("system", {})
    desc = system.get("description", {})
    name = raw.get("name", "")
    summary = desc.get("summary", "")
    school = system.get("school", "")
    level = system.get("level")

    # learnedAt.class is a dict of {class_name: spell_level}
    learned_at: dict[str, int] = system.get("learnedAt", {}).get("class", {})

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": strip_html(desc.get("value", "")),
        "school": school,
        "level": level,
        "learned_at": learned_at,  # {class_name: level} → AVAILABLE_TO edges
        "embed_text": build_embed_text(
            name,
            f"School: {school}" if school else "",
            f"Level {level}" if level is not None else "",
            summary,
            strip_html(desc.get("value", "")),
        ),
    }


def scan_spells(spells_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(spells_path):
        node = parse_spell(path)
        if node:
            items.append(node)
    return items
