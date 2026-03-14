"""Shared parsing utilities for FoundryVTT YAML data."""

import re
from pathlib import Path
from typing import Generator

import yaml
from bs4 import BeautifulSoup

# Matches @UUID[Compendium.pf1.<pack>.Item.<id>]{<name>}
_UUID_PATTERN = re.compile(
    r"@UUID\[Compendium\.pf1\.([^.]+)\.[^.]+\.([^\]]+)\]\{([^}]+)\}"
)


def strip_html(html: str) -> str:
    """Convert HTML to plain text, collapsing whitespace."""
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    return re.sub(r"\s+", " ", soup.get_text(separator=" ")).strip()


def extract_uuid_refs(html: str) -> list[dict]:
    """
    Return a list of dicts for every @UUID reference found in the HTML.

    Each dict has keys: pack (str), id (str), name (str).
    """
    if not html:
        return []
    return [
        {"pack": m.group(1), "id": m.group(2), "name": m.group(3)}
        for m in _UUID_PATTERN.finditer(html)
    ]


def iter_yaml_files(base: Path) -> Generator[Path, None, None]:
    """Yield every *.yaml file under *base*, recursively, skipping folder yamls."""
    for path in sorted(base.rglob("*.yaml")):
        yield path


def load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def build_embed_text(*parts: str) -> str:
    """Concatenate non-empty parts with '. ' separator for embedding."""
    return ". ".join(p for p in parts if p).strip()
