#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - .ENV LOADER (STDLIB ONLY)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__EnvLoader__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - EnvLoader
 PURPOSE    : Parse a .env file into a dict with no external deps. Ignores
              comments and blank lines. Strips surrounding quotes.
=============================================================================
"""

from __future__ import annotations

from pathlib import Path


# FUNCTION | Parse a .env file into a dict; missing file returns {}
# ------------------------------------------------------------
def Wv__EnvLoader__ReadEnvFile(env_path: Path) -> dict[str, str]:
    if not env_path.is_file():
        return {}

    parsed_values: dict[str, str] = {}
    raw_text = env_path.read_text(encoding="utf-8", errors="replace")
    for raw_line in raw_text.splitlines():
        stripped_line = raw_line.strip()
        if not stripped_line or stripped_line.startswith("#"):
            continue
        if "=" not in stripped_line:
            continue

        key_part, value_part = stripped_line.split("=", 1)
        key_clean   = key_part.strip()
        value_clean = value_part.strip()

        if len(value_clean) >= 2 and value_clean[0] == value_clean[-1] and value_clean[0] in ('"', "'"):
            value_clean = value_clean[1:-1]

        if key_clean:
            parsed_values[key_clean] = value_clean
    return parsed_values
# ------------------------------------------------------------
