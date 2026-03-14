"""Parser for the 'class-abilities' pack."""

from pathlib import Path

from .common import build_embed_text, extract_uuid_refs, iter_yaml_files, load_yaml, strip_html


def parse_class_ability(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None

    system = raw.get("system", {})
    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    name = raw.get("name", "")
    summary = desc.get("summary", "")

    # associations.classes is a list of class names this ability belongs to
    associations = system.get("associations", {})
    associated_classes: list[str] = associations.get("classes", [])

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": strip_html(desc_html),
        "ability_type": system.get("abilityType", ""),
        "associated_classes": associated_classes,  # → BELONGS_TO edges
        "embed_text": build_embed_text(name, summary, strip_html(desc_html)),
        # UUID refs to spells / other items used in the ability description
        "_uuid_refs": extract_uuid_refs(desc_html),
    }


def scan_class_abilities(abilities_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(abilities_path):
        node = parse_class_ability(path)
        if node:
            items.append(node)
    return items
