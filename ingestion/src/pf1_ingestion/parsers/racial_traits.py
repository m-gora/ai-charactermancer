"""Parser for PF1e alternative racial traits (from pf1-content: src/pf-racial-traits/)."""

import re
from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html

# Matches "Replaced Trait(s)</strong>: Trait Name, Other Name" in description HTML
_REPLACES_PAT = re.compile(
    r"Replaced\s+Trait\(s\)\s*(?:</strong>)?\s*:\s*([^<\n]+)",
    re.IGNORECASE,
)


def _parse_replaces(html: str) -> list[str]:
    """Extract trait names that this alternative racial trait replaces."""
    m = _REPLACES_PAT.search(html)
    if not m:
        return []
    raw = m.group(1).strip()
    parts = re.split(r",\s*|\s+and\s+", raw)
    return [p.strip().rstrip(".") for p in parts if p.strip()]


def parse_racial_trait(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith("!folders!"):
        return None
    if raw.get("type") != "feat":
        return None

    system = raw.get("system", {})
    if system.get("subType") != "racial":
        return None

    name = raw.get("name", "")
    if not name:
        return None

    # races this trait belongs to (from tags)
    races: list[str] = system.get("tags", [])

    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    summary = desc.get("summary", "") or ""

    # The HTML structure is: <p>Race: Xxx<br/>Replaced Trait(s): Yyy</p><hr/><p>actual text…</p>
    # Everything before (and including) the <hr> is header boilerplate — take what's after it.
    hr_split = re.split(r"<hr\s*/?>", desc_html, maxsplit=1, flags=re.IGNORECASE)
    plain = strip_html(hr_split[1] if len(hr_split) > 1 else desc_html).strip()

    replaces = _parse_replaces(desc_html)
    trait_category = system.get("traitCategory", "") or ""

    return {
        "id": raw["_id"],
        "name": name,
        "summary": summary,
        "description": plain,
        "races": races,
        "trait_category": trait_category,
        "replaces": replaces,
        "race_points": system.get("racePoints", 0) or 0,
        "embed_text": build_embed_text(name, summary, plain),
    }


def scan_racial_traits(racial_traits_path: Path) -> list[dict]:
    if not racial_traits_path.exists():
        return []
    items = []
    for path in iter_yaml_files(racial_traits_path):
        node = parse_racial_trait(path)
        if node:
            items.append(node)
    return items
