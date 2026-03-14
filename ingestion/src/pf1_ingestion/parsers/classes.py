"""Parser for the 'classes' pack."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html

# Maps Foundry source books to a display category used by the frontend
_SOURCE_CATEGORY: dict[str, str] = {
    "CRB": "core",
    "APG": "base",
    "UC": "unchained",
    "ACG": "hybrid",
    "UM": "base",
    "UE": "base",
    "OA": "occult",
    "HotH": "base",
}


def _class_category(raw: dict) -> str:
    source = (raw.get("system", {}).get("source") or "").strip()
    for key, cat in _SOURCE_CATEGORY.items():
        if source.startswith(key):
            return cat
    # Unchained variants have "(Unchained)" in their name
    if "unchained" in raw.get("name", "").lower():
        return "unchained"
    return "core"


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
        "source_category": _class_category(raw),
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
