"""Parser for the 'feats' pack."""

import re
from pathlib import Path

from bs4 import BeautifulSoup

from .common import build_embed_text, extract_uuid_refs, iter_yaml_files, load_yaml, strip_html

_PREREQ_TAG_RE = re.compile(r'prerequisite', re.IGNORECASE)


def _extract_prerequisite_text(desc_html: str) -> str:
    """
    Pull the prerequisite sentence(s) from the feat description HTML.
    Looks for <strong>Prerequisites</strong>: ... pattern.
    """
    if not desc_html:
        return ""
    soup = BeautifulSoup(desc_html, "lxml")
    for tag in soup.find_all(string=_PREREQ_TAG_RE):
        parent = tag.parent
        # Walk up to find the containing <p> and grab the text after the label
        if parent:
            full = parent.get_text()
            match = re.search(r'Prerequisites?\s*:\s*([^.]+\.)', full, re.IGNORECASE)
            if match:
                return match.group(1).strip()
    return ""


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
    plain = strip_html(desc_html)
    prereq_text = _extract_prerequisite_text(desc_html)

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": plain,
        "prerequisite_text": prereq_text,
        "tags": system.get("tags", []),
        "sub_type": system.get("subType", "feat"),
        "embed_text": build_embed_text(name, summary, plain),
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
