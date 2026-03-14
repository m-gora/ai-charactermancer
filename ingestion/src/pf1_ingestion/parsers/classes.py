"""Parser for the 'classes' pack."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html


def parse_class(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None

    system = raw.get("system", {})
    desc = system.get("description", {})
    name = raw.get("name", "")
    summary = desc.get("summary", "")

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": strip_html(desc.get("value", "")),
        "bab": system.get("bab", ""),
        "hd": system.get("hd"),
        "class_skills": system.get("classSkills", []),
        "embed_text": build_embed_text(name, summary, strip_html(desc.get("value", ""))),
    }


def scan_classes(classes_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(classes_path):
        node = parse_class(path)
        if node:
            items.append(node)
    return items
