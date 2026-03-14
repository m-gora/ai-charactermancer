"""Parser for the 'feats' pack."""

from pathlib import Path

from .common import build_embed_text, extract_uuid_refs, iter_yaml_files, load_yaml, strip_html


def parse_feat(path: Path) -> dict | None:
    """Parse a single feat YAML file into a node dict."""
    raw = load_yaml(path)
    # skip folder index files (keys start with !folders!)
    if raw.get("_key", "").startswith("!folders!"):
        return None

    system = raw.get("system", {})
    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    summary = desc.get("summary", "")
    name = raw.get("name", "")

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": strip_html(desc_html),
        "tags": system.get("tags", []),
        "sub_type": system.get("subType", "feat"),
        "embed_text": build_embed_text(name, summary, strip_html(desc_html)),
        # UUID refs → prerequisite edges resolved later
        "_uuid_refs": extract_uuid_refs(desc_html),
    }


def scan_feats(feats_path: Path) -> list[dict]:
    items = []
    for path in iter_yaml_files(feats_path):
        node = parse_feat(path)
        if node:
            items.append(node)
    return items
