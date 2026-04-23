#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - TEMPLATE INDEX HELPERS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__TemplateIndex__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - TemplateIndex
 PURPOSE    : Build template tree data and handle template metadata visibility
              rules for the local WhitecardVision server.
=============================================================================
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


# -----------------------------------------------------------------------------
# REGION | Template Metadata Helpers
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Peek the first 2KB of a template and parse front-matter
# ------------------------------------------------------------
def Wv__Server__PeekTemplateFrontMatter(markdown_path: Path) -> dict[str, str]:                                                 #<-- '--- key = value ---' block.
    try:
        with markdown_path.open("rb") as source_handle:
            head_bytes = source_handle.read(2048)
        head_text   = head_bytes.decode("utf-8", errors="replace").lstrip("\ufeff").replace("\r\n", "\n")
    except Exception:
        return {}

    pattern_match = re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n?', head_text)
    if not pattern_match:
        return {}

    front_matter_dict: dict[str, str] = {}
    for raw_line in pattern_match.group(1).split("\n"):
        trimmed_line = raw_line.strip()
        if not trimmed_line or trimmed_line.startswith("#"):
            continue
        delimiter_index = trimmed_line.find("=")
        if delimiter_index < 0:
            continue
        key_text   = trimmed_line[:delimiter_index].strip()
        value_text = trimmed_line[delimiter_index + 1:].strip()
        if key_text:
            front_matter_dict[key_text] = value_text
    return front_matter_dict
# ------------------------------------------------------------


def Wv__Server__NormaliseTemplateRelativePath(path_text: str) -> str:
    return str(path_text or "").replace("\\", "/").strip().strip("/")


def Wv__Server__ReadHiddenTemplatePathsFromAppConfig(app_config_path: Path) -> set[str]:
    if not app_config_path.is_file():
        return set()
    try:
        app_config_json = json.loads(app_config_path.read_text(encoding="utf-8") or "{}")
    except Exception:
        return set()

    prompt_constructor_block = app_config_json.get("Wv__AppConfig__PromptConstructor", {}) or {}
    hidden_path_list_raw = prompt_constructor_block.get("Wv__AppConfig__PromptConstructor__HiddenTemplatePaths", []) or []
    hidden_path_set: set[str] = set()
    for hidden_path_raw in hidden_path_list_raw:
        hidden_path_normalised = Wv__Server__NormaliseTemplateRelativePath(str(hidden_path_raw)).lower()
        if hidden_path_normalised:
            hidden_path_set.add(hidden_path_normalised)
    return hidden_path_set


def Wv__Server__ShouldHideTemplatePath(entry_relative_path: str, hidden_path_set: set[str]) -> bool:
    entry_relative_path_normalised = Wv__Server__NormaliseTemplateRelativePath(entry_relative_path).lower()
    for hidden_path in hidden_path_set:
        if entry_relative_path_normalised == hidden_path:
            return True
        if entry_relative_path_normalised.startswith(hidden_path + "/"):
            return True
    return False


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Template Tree Builder
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Recursive tree builder (also peeks front-matter per file)
# ------------------------------------------------------------
def Wv__Server__BuildTemplateTreeNode(folder_path: Path, rel_prefix: str, hidden_path_set: set[str]) -> dict[str, Any]:
    children_entries: list[dict[str, Any]] = []
    for entry_path in sorted(folder_path.iterdir(), key=lambda p: p.name.lower()):
        if entry_path.name.startswith("."):
            continue
        entry_relative = f"{rel_prefix}/{entry_path.name}".lstrip("/")
        if Wv__Server__ShouldHideTemplatePath(entry_relative, hidden_path_set):
            continue
        if entry_path.is_dir():
            children_entries.append(Wv__Server__BuildTemplateTreeNode(entry_path, entry_relative, hidden_path_set))
        elif entry_path.suffix.lower() == ".md":
            children_entries.append({
                "type"        : "file",
                "name"        : entry_path.name,
                "relPath"     : entry_relative,
                "frontMatter" : Wv__Server__PeekTemplateFrontMatter(entry_path),
            })
    return {
        "type"     : "folder",
        "name"     : folder_path.name if rel_prefix else "",
        "relPath"  : rel_prefix,
        "children" : children_entries,
    }
# ------------------------------------------------------------


# endregion ----------------------------------------------------
