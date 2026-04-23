#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - PROJECT PATH HELPERS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__ProjectPaths__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - ProjectPaths
 PURPOSE    : Shared path validation and project folder resolution helpers.
=============================================================================
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from re import Pattern


# -----------------------------------------------------------------------------
# REGION | Project Path Helpers
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Reject path traversal attempts
# ------------------------------------------------------------
def Wv__Server__AssertSafeRelativePath(relative_path_text: str) -> None:
    if not relative_path_text:
        raise ValueError("Relative path is empty.")
    if ".." in relative_path_text.split("/") or ".." in relative_path_text.split("\\"):
        raise ValueError("Relative path contains traversal tokens.")
    if relative_path_text.startswith("/") or re.match(r'^[A-Za-z]:', relative_path_text):
        raise ValueError("Absolute paths are not allowed here.")
# ------------------------------------------------------------


# HELPER FUNCTION | Resolve project folder by projectName inside a year folder
# ------------------------------------------------------------
def Wv__Server__ResolveProjectDir(
    year_folder_name: str,
    project_name: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
) -> Path:
    if not year_folder_pattern.match(year_folder_name):
        raise ValueError(f"Invalid year folder: {year_folder_name}")
    if not project_name_pattern.match(project_name):
        raise ValueError(f"Invalid project name: {project_name}")
    return (project_data_path / year_folder_name / f"{project_name}__WcVisData").resolve()
# ------------------------------------------------------------


# HELPER FUNCTION | Current local year as Projects__YYYY token
# ------------------------------------------------------------
def Wv__Server__CurrentYearFolderName() -> str:
    return f"Projects__{datetime.now().year}"
# ------------------------------------------------------------


# endregion ----------------------------------------------------
