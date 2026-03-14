"""Parser for PF1e traits (from pf1-content repo: src/pf-traits/)."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html


def parse_trait(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None
    if raw.get("type") != "feat":
        return None

    system = raw.get("system", {})
    if system.get("subType") != "trait":
        return None

    trait_type = system.get("traitType", "")
    if not trait_type:
        return None

    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    summary = desc.get("summary", "")
    name = raw.get("name", "")
    if not name:
        return None

    plain = strip_html(desc_html)

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": plain,
        "trait_type": trait_type,
        "tags": system.get("tags", []),
        "embed_text": build_embed_text(name, summary, plain),
    }


def scan_traits(traits_path: Path) -> list[dict]:
    if not traits_path.exists():
        return []
    items = []
    for path in iter_yaml_files(traits_path):
        node = parse_trait(path)
        if node:
            items.append(node)
    return items
