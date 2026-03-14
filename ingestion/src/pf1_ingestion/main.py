"""
pf1-ingest CLI
--------------
Parses FoundryVTT PF1e YAML packs, generates Gemini embeddings, and
upserts documents + vector search indexes into MongoDB.

Usage:
    pf1-ingest [--packs PACK ...] [--skip-embeddings]
"""

from pathlib import Path

import click
from loguru import logger
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TimeElapsedColumn

from .config import settings
from .embedder import GeminiEmbedder
from .mongo_loader import MongoLoader
from .parsers.class_abilities import scan_class_abilities
from .parsers.classes import scan_classes
from .parsers.feats import scan_feats
from .parsers.races import scan_races
from .parsers.spells import scan_spells

console = Console()


def _parse_all(data_root: Path, packs: list[str]) -> dict[str, list[dict]]:
    """Run all parsers and return a dict of {pack_name: [items]}."""
    result: dict[str, list[dict]] = {}

    pack_parsers = {
        "feats": lambda: scan_feats(data_root / "feats"),
        "classes": lambda: scan_classes(data_root / "classes"),
        "races": lambda: scan_races(data_root / "races"),
        "spells": lambda: scan_spells(data_root / "spells"),
        "class-abilities": lambda: scan_class_abilities(data_root / "class-abilities"),
    }

    for pack in packs:
        if pack not in pack_parsers:
            logger.warning(f"Unknown pack '{pack}', skipping.")
            continue
        logger.info(f"Parsing pack: {pack} …")
        items = pack_parsers[pack]()
        result[pack] = items
        logger.info(f"  → {len(items)} items parsed from '{pack}'")

    return result


def _embed_all(parsed: dict[str, list[dict]], skip: bool) -> None:
    if skip:
        logger.info("Skipping embedding generation (--skip-embeddings).")
        for items in parsed.values():
            for item in items:
                item["embedding"] = []
        return

    embedder = GeminiEmbedder()
    for pack, items in parsed.items():
        logger.info(f"Embedding '{pack}' ({len(items)} items) …")
        embedder.embed_items(items)


def _load_all(parsed: dict[str, list[dict]], loader: MongoLoader) -> None:
    loaders = {
        "feats": loader.load_feats,
        "classes": loader.load_classes,
        "races": loader.load_races,
        "spells": loader.load_spells,
        "class-abilities": loader.load_class_abilities,
    }
    for pack, items in parsed.items():
        if pack in loaders:
            loaders[pack](items)


@click.command()
@click.option(
    "--packs",
    multiple=True,
    default=None,
    help="Which packs to ingest (default: all enabled packs in config).",
)
@click.option(
    "--skip-embeddings",
    is_flag=True,
    default=False,
    help="Store documents without embeddings (useful for testing the parse/load path).",
)
@click.option(
    "--data-path",
    default=None,
    help="Override the Foundry data path from config.",
)
def cli(packs: tuple[str, ...], skip_embeddings: bool, data_path: str | None) -> None:
    """Ingest FoundryVTT PF1e data into MongoDB with Gemini vector embeddings."""
    data_root = Path(data_path or settings.foundry_data_path)
    if not data_root.exists():
        console.print(f"[red]Data path not found: {data_root}[/red]")
        raise SystemExit(1)

    active_packs = list(packs) if packs else settings.enabled_packs
    console.print(f"[bold]Ingesting packs:[/bold] {', '.join(active_packs)}")
    console.print(f"[bold]Data path:[/bold] {data_root}")
    console.print(f"[bold]MongoDB:[/bold] {settings.mongodb_uri} / {settings.mongodb_db}")

    with Progress(SpinnerColumn(), *Progress.get_default_columns(), TimeElapsedColumn()) as progress:
        task = progress.add_task("Parsing …", total=None)

        parsed = _parse_all(data_root, active_packs)
        total_items = sum(len(v) for v in parsed.values())
        progress.update(task, description=f"Parsed {total_items} items. Embedding …")

        _embed_all(parsed, skip=skip_embeddings)

        progress.update(task, description="Loading into MongoDB …")
        loader = MongoLoader()
        try:
            loader.setup_schema()
            _load_all(parsed, loader)
        finally:
            loader.close()

        progress.update(task, description="Done.", completed=1, total=1)

    console.print(f"[green]✓ Ingestion complete.[/green] {total_items} items loaded.")
