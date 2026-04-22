#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - LAUNCHER (PYTHON)
=============================================================================
 PURPOSE : Thin wrapper that boots WhitecardVision__FlaskServer__Main__.py
           on port 8004 without the user having to cd into the scripts dir.
=============================================================================
"""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

SCRIPT_ROOT = Path(__file__).resolve().parent
MAIN_SCRIPT = SCRIPT_ROOT / "05__FlaskServerScripts" / "WhitecardVision__FlaskServer__Main__.py"

def main() -> int:
    if not MAIN_SCRIPT.is_file():
        print(f"[ERROR] Missing main server script: {MAIN_SCRIPT}")
        return 1
    sys.argv = [str(MAIN_SCRIPT)] + sys.argv[1:]
    runpy.run_path(str(MAIN_SCRIPT), run_name="__main__")
    return 0

if __name__ == "__main__":
    sys.exit(main())
