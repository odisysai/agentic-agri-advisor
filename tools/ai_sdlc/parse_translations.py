"""
Shared translation parsing utilities for Krishi Sampark validators and scaffolding tools.

Promoted from scratch/diagnose_missing.py and scratch/extract_keys.py.
Used by:
  - tools/scaffold/add_language.py  (language audit)
  - tools/ai_sdlc/validate_translations.py  (SDLC gate)
  - tools/ai_sdlc/cli.py  (--translations validation)
"""
from __future__ import annotations

import ast
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def parse_js_dict(js_code: str, dict_name: str) -> dict:
    """
    Extract a named JavaScript object from a JS IIFE and parse it as a Python dict.

    Uses ast.literal_eval which requires the JS object to be valid Python literal
    syntax. The translations.js file is structured to be compatible with this.

    Args:
        js_code: Full content of the JS file.
        dict_name: Variable name of the dict to extract (e.g. 'TRANSLATIONS').

    Returns:
        Parsed Python dict.

    Raises:
        ValueError: If the dict cannot be found or parsed.
    """
    # Match: DICT_NAME = { ... }; or DICT_NAME = { ... }
    match = re.search(dict_name + r"\s*=\s*(\{[\s\S]*?\n\s*\});", js_code)
    if not match:
        match = re.search(dict_name + r"\s*=\s*(\{[\s\S]*?\n\s*\})", js_code)
    if not match:
        raise ValueError(f"Could not find '{dict_name}' in JS code")

    dict_str = match.group(1)
    # Strip JS single-line comments
    dict_str = re.sub(r"//[^\n]*", "", dict_str)
    # Convert JS single-quoted keys/values to double-quotes for Python compatibility
    # (ast.literal_eval handles both)
    try:
        return ast.literal_eval(dict_str)
    except (ValueError, SyntaxError) as exc:
        raise ValueError(f"Could not parse '{dict_name}' as Python literal: {exc}") from exc


def get_translations(translations_path: str | Path | None = None) -> dict:
    """
    Load and parse TRANSLATIONS from ui/agui/translations.js.

    Returns:
        Dict keyed by language code, e.g. {'en': {...}, 'hi': {...}, ...}
    """
    if translations_path is None:
        translations_path = ROOT / "ui" / "agui" / "translations.js"
    js_code = Path(translations_path).read_text(encoding="utf-8")
    return parse_js_dict(js_code, "TRANSLATIONS")


def get_schema_translations(translations_path: str | Path | None = None) -> dict:
    """
    Load and parse SCHEMA_TRANSLATIONS from ui/agui/translations.js.

    Returns:
        Dict keyed by language code, e.g. {'en': {...}, 'hi': {...}, ...}
    """
    if translations_path is None:
        translations_path = ROOT / "ui" / "agui" / "translations.js"
    js_code = Path(translations_path).read_text(encoding="utf-8")
    return parse_js_dict(js_code, "SCHEMA_TRANSLATIONS")


def extract_schema_keys(schema_dir: str | Path | None = None) -> set[str]:
    """
    Find all translation key references in ui/schemas/*.json.

    A translation key reference is any object property whose name ends in 'Key'
    and whose value is a string, e.g.: "titleKey": "nav_home".

    Returns:
        Set of all referenced translation key strings.
    """
    if schema_dir is None:
        schema_dir = ROOT / "ui" / "schemas"
    schema_dir = Path(schema_dir)
    keys: set[str] = set()

    for fname in schema_dir.glob("*.json"):
        try:
            data = json.loads(fname.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        _collect_keys(data, keys)
    return keys


def _collect_keys(obj: object, acc: set[str]) -> None:
    """Recursively collect *Key string values from a JSON object."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.endswith("Key") and isinstance(v, str):
                acc.add(v)
            else:
                _collect_keys(v, acc)
    elif isinstance(obj, list):
        for item in obj:
            _collect_keys(item, acc)


def check_language_coverage(
    translations: dict,
    schema_translations: dict,
    schema_keys: set[str],
) -> dict[str, list[str]]:
    """
    For each language code, return a list of schema keys that are missing.

    A key is considered present if it appears in either the TRANSLATIONS or
    SCHEMA_TRANSLATIONS dict for that language.

    Args:
        translations: Parsed TRANSLATIONS dict (lang_code → key → value).
        schema_translations: Parsed SCHEMA_TRANSLATIONS dict.
        schema_keys: Set of all keys referenced in schemas.

    Returns:
        Dict of {lang_code: [missing_key, ...]} — empty list means full coverage.
    """
    result: dict[str, list[str]] = {}
    all_lang_codes = set(translations.keys()) | set(schema_translations.keys())
    for lang in sorted(all_lang_codes):
        t = translations.get(lang, {})
        st = schema_translations.get(lang, {})
        missing = [k for k in schema_keys if k not in t and k not in st]
        result[lang] = sorted(missing)
    return result


def get_all_language_codes(translations_path: str | Path | None = None) -> list[str]:
    """Return the list of language codes present in TRANSLATIONS."""
    t = get_translations(translations_path)
    return sorted(t.keys())
