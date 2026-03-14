"""Parser for equipment items from FoundryVTT packs and pf1-content repo."""

from pathlib import Path

from .common import build_embed_text, iter_yaml_files, load_yaml, strip_html

_FOLDER_KEY_PREFIX = "!folders!"

# Map weapons-and-ammo sub-directory names to their proficiency sub_type
_WEAPON_DIRS: dict[str, str] = {
    "simple-weapons": "simple",
    "martial-weapons": "martial",
    "exotic-weapons": "exotic",
}

# Map armors-and-shields sub-directory names to their equipmentSubtype
_ARMOR_DIRS: dict[str, str] = {
    "armor-light": "lightArmor",
    "armor-medium": "mediumArmor",
    "armor-heavy": "heavyArmor",
}

# Gear sub-types to skip in character creation (not useful starting gear)
_SKIP_GEAR_SUBTYPES = {"poison", "drug", "herb", "alchemical"}


def _parse_weapon(path: Path, prof: str) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith(_FOLDER_KEY_PREFIX):
        return None
    if raw.get("type") != "weapon":
        return None

    system = raw.get("system", {})
    name = raw.get("name", "")
    if not name:
        return None

    desc = system.get("description", {})
    desc_html = desc.get("value", "") or desc.get("unidentified", "")
    plain = strip_html(desc_html)

    price = system.get("price")
    weight_obj = system.get("weight") or {}
    weight = weight_obj.get("value") if isinstance(weight_obj, dict) else None

    return {
        "id": raw["_id"],
        "name": name,
        "description": plain,
        "item_type": "weapon",
        "sub_type": prof,
        "weapon_subtype": system.get("weaponSubtype", ""),
        "price": float(price) if price is not None else None,
        "weight": float(weight) if weight is not None else None,
        "embed_text": build_embed_text(name, f"{prof} weapon", plain),
    }


def _parse_armor(path: Path, dir_name: str) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith(_FOLDER_KEY_PREFIX):
        return None
    if raw.get("type") != "equipment":
        return None

    system = raw.get("system", {})
    name = raw.get("name", "")
    if not name:
        return None

    # Distinguish armor from shield by subType field
    raw_sub = system.get("subType", "")
    if raw_sub == "shield":
        item_type = "shield"
        sub_type = "shield"
    else:
        item_type = "armor"
        # Use the directory-derived sub_type (lightArmor / mediumArmor / heavyArmor)
        sub_type = _ARMOR_DIRS.get(dir_name, raw_sub)

    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    plain = strip_html(desc_html)

    price = system.get("price")
    weight_obj = system.get("weight") or {}
    weight = weight_obj.get("value") if isinstance(weight_obj, dict) else None

    return {
        "id": raw["_id"],
        "name": name,
        "description": plain,
        "item_type": item_type,
        "sub_type": sub_type,
        "price": float(price) if price is not None else None,
        "weight": float(weight) if weight is not None else None,
        "embed_text": build_embed_text(name, sub_type, plain),
    }


def _parse_gear(path: Path) -> dict | None:
    raw = load_yaml(path)
    if raw.get("_key", "").startswith(_FOLDER_KEY_PREFIX):
        return None
    if raw.get("type") not in ("loot", "container"):
        return None

    system = raw.get("system", {})
    name = raw.get("name", "")
    if not name:
        return None

    sub_type = system.get("subType", "misc")
    if sub_type in _SKIP_GEAR_SUBTYPES:
        return None

    desc = system.get("description", {})
    desc_html = desc.get("value", "")
    plain = strip_html(desc_html)

    price = system.get("price")
    weight_obj = system.get("weight") or {}
    weight = weight_obj.get("value") if isinstance(weight_obj, dict) else None

    _SUBTYPE_TO_ITEM_TYPE = {
        "tool": "tool",
        "clothing": "clothing",
        "adventuring": "gear",
        "gear": "gear",
        "misc": "gear",
        "other": "gear",
        "wondrous": "gear",
    }
    item_type = _SUBTYPE_TO_ITEM_TYPE.get(sub_type, "gear")

    return {
        "id": raw["_id"],
        "name": name,
        "description": plain,
        "item_type": item_type,
        "sub_type": sub_type,
        "price": float(price) if price is not None else None,
        "weight": float(weight) if weight is not None else None,
        "embed_text": build_embed_text(name, sub_type, plain),
    }


def _scan_dir(directory: Path, parser, *args) -> list[dict]:
    """Scan a directory with a given parser, collecting non-None results."""
    results = []
    if directory.exists():
        for yaml_path in iter_yaml_files(directory):
            node = parser(yaml_path, *args)
            if node:
                results.append(node)
    return results


def scan_items(foundry_data_root: Path, pf1_content_root: Path) -> list[dict]:
    """Scan weapons (foundry repo), armor/shields (foundry repo), gear (pf1-content repo)."""
    items: list[dict] = []

    weapons_root = foundry_data_root / "weapons-and-ammo"
    for dir_name, prof in _WEAPON_DIRS.items():
        items.extend(_scan_dir(weapons_root / dir_name, _parse_weapon, prof))

    armor_root = foundry_data_root / "armors-and-shields"
    for dir_name in list(_ARMOR_DIRS) + ["shields"]:
        items.extend(_scan_dir(armor_root / dir_name, _parse_armor, dir_name))

    gear_path = pf1_content_root / "pf-items"
    if gear_path.exists():
        for yaml_path in iter_yaml_files(gear_path):
            node = _parse_gear(yaml_path)
            if node:
                items.append(node)

    return items
