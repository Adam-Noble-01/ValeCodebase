"""
=============================================================================
 VALE SHARED API - PROJECTS MASTER LIBRARY ACCESS
=============================================================================

FILE       : ValeShared__Library__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Find projects in Vale__Projects__MasterLibrary, read their
             ProjectData JSON, and write it safely. Shared by every app API.
CREATED    : 06-Oct-2026

DESCRIPTION:
- Layout: Vale__Projects__MasterLibrary/ValeProjects__<yyyy>/<folder>/ProjectData__<folder>__.json
  plus per-app buckets (ValeVision3D/, ValeVisionGallery/, LanternDesigner/).
- THE PROJECT ID IS THE LIBRARY FOLDER NAME ("64135__Washington"). It is unique
  across years; Na__Library__Find works out the year. Links between apps use it:
  /valevision/?project=64135__Washington, /project-gallery/?id=64135__Washington.
- Writes are atomic, carry a "_rev" counter (a save made from an older _rev is
  refused with Na__Library__Conflict, so two apps never overwrite each other),
  and keep the previous copy in
  <folder>/ProjectData__Revisions/<same relative path, no .json>/<stamp>__rev<n>__<USR code>.json
  (the last 50 per file). Revisions are user data: never web-served.
- Project JSON is written as before: 4-space indent, UTF-8 kept as text, no
  final newline. One lock per process; the file replace itself is atomic.
- Content__* files are served straight by nginx; Na__Library__Url gives their
  public URL.

ENVIRONMENT:
  VALE_ROOT   the mirror / server root (default: two folders above this file)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 1.0.0
- Initial build (shared by ValeVision Gallery and ValeVision 3D).

=============================================================================
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from pathlib import Path
from urllib.parse import quote


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__LIBRARY__ROOT                 = Path(os.environ.get("VALE_ROOT") or Path(__file__).resolve().parents[2])
NA__LIBRARY__DIR                  = NA__LIBRARY__ROOT / "Vale__Projects__MasterLibrary"
NA__LIBRARY__ID                   = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$")
NA__LIBRARY__YEAR_DIR             = re.compile(r"^ValeProjects__(\d{4})$")
NA__LIBRARY__INDEX_TTL_S          = 5                                          # <-- Re-scan the library at most this often
NA__LIBRARY__KEEP_REVISIONS       = 50
NA__LIBRARY__CACHE                = {"at": 0.0, "index": {}}
NA__LIBRARY__LOCK                 = threading.RLock()

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Finding Projects
# -----------------------------------------------------------------------------

# FUNCTION | Index: project id (folder name) -> folder Path
# ------------------------------------------------------------
def Na__Library__Index(force: bool = False) -> dict:
    with NA__LIBRARY__LOCK:
        if not force and time.time() - NA__LIBRARY__CACHE["at"] < NA__LIBRARY__INDEX_TTL_S:
            return NA__LIBRARY__CACHE["index"]
        index = {}
        if NA__LIBRARY__DIR.is_dir():
            for year_dir in sorted(NA__LIBRARY__DIR.iterdir()):
                if not (year_dir.is_dir() and NA__LIBRARY__YEAR_DIR.match(year_dir.name)):
                    continue
                for proj in sorted(year_dir.iterdir()):
                    if proj.is_dir() and (proj / f"ProjectData__{proj.name}__.json").is_file():
                        index.setdefault(proj.name, proj)                      # <-- First year wins if a name repeats
        NA__LIBRARY__CACHE.update(at=time.time(), index=index)
        return index
# ---------------------------------------------------------------

# FUNCTION | Find One Project Folder by Id
# ------------------------------------------------------------
def Na__Library__Find(project_id: str) -> Path | None:
    pid = str(project_id or "").strip().split("/")[-1]                        # <-- Also accepts the legacy "2026/<folder>"
    if not NA__LIBRARY__ID.match(pid):
        return None
    return Na__Library__Index().get(pid) or Na__Library__Index(force=True).get(pid)
# ---------------------------------------------------------------

# HELPER FUNCTION | A Project's ProjectData JSON Path, and Its Year
# ------------------------------------------------------------
def Na__Library__ProjectDataPath(project_id: str) -> Path | None:
    folder = Na__Library__Find(project_id)
    return folder / f"ProjectData__{folder.name}__.json" if folder else None

def Na__Library__Year(folder: Path) -> str:
    m = NA__LIBRARY__YEAR_DIR.match(folder.parent.name)
    return m.group(1) if m else ""
# ---------------------------------------------------------------

# FUNCTION | Every Project: [(id, folder Path)], newest year first
# ------------------------------------------------------------
def Na__Library__ListProjects() -> list:
    return sorted(Na__Library__Index().items(), key=lambda kv: (kv[1].parent.name, kv[0]), reverse=True)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Paths and URLs
# -----------------------------------------------------------------------------

# HELPER FUNCTION | A Child Path That Cannot Escape Its Base (rejects .., absolute, drive letters)
# ------------------------------------------------------------
def Na__Library__SafeChild(base: Path, rel: str) -> Path:
    rel = str(rel or "").replace("\\", "/").strip("/")
    if not rel or any(p in ("", ".", "..") for p in rel.split("/")) or ":" in rel:
        raise ValueError(f"unsafe path {rel!r}")
    target = (base / rel).resolve()
    if not target.is_relative_to(base.resolve()):
        raise ValueError(f"unsafe path {rel!r}")
    return target
# ---------------------------------------------------------------

# HELPER FUNCTION | Public URL of a File or Folder Under the Root ("/Vale__Projects__MasterLibrary/...")
# ------------------------------------------------------------
def Na__Library__Url(path: Path) -> str:
    rel = Path(path).resolve().relative_to(NA__LIBRARY__ROOT.resolve()).as_posix()
    return "/" + quote(rel) + ("/" if Path(path).is_dir() else "")
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reading and Writing
# -----------------------------------------------------------------------------

# FUNCTION | Read a JSON File (None if missing)
# ------------------------------------------------------------
def Na__Library__ReadJson(path: Path):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None
# ---------------------------------------------------------------

# CLASS | Someone Saved First: carries the document as it is now
# ------------------------------------------------------------
class Na__Library__Conflict(Exception):
    def __init__(self, current: dict):
        super().__init__(f"the document changed (now _rev {current.get('_rev', 0)})")
        self.current = current
# ---------------------------------------------------------------

# FUNCTION | Write JSON Atomically: version check, _rev bump, previous copy kept as a revision
# ------------------------------------------------------------
def Na__Library__WriteJson(path: Path, data: dict, user_code: str = "", project_folder: Path | None = None,
                           expected_rev: int | None = None) -> dict:
    """Every document carries "_rev" (missing = 0). With expected_rev (the _rev the client
    loaded), a newer document raises Na__Library__Conflict instead of being overwritten.
    Returns {"rev": new _rev, "revision": path of the kept copy relative to the project, or ""}."""
    path = Path(path)
    with NA__LIBRARY__LOCK:
        current = Na__Library__ReadJson(path) if path.is_file() else None
        current_rev = int((current or {}).get("_rev", 0) or 0)
        if expected_rev is not None and int(expected_rev) != current_rev:
            raise Na__Library__Conflict(current or {"_rev": 0})
        revision = ""
        if current is not None:
            folder = project_folder or next((p for p in path.parents if p.parent.parent == NA__LIBRARY__DIR), path.parent)
            rel = path.relative_to(folder).with_suffix("").as_posix()         # <-- Folder named after the file, minus ".json"
            rev_dir = folder / "ProjectData__Revisions" / rel
            rev_dir.mkdir(parents=True, exist_ok=True)
            who = re.sub(r"[^A-Za-z0-9]", "", user_code) or "unknown"
            rev = rev_dir / f"{time.strftime('%Y%m%d-%H%M%S')}__rev{current_rev}__{who}.json"
            rev.write_bytes(path.read_bytes())
            revision = rev.relative_to(folder).as_posix()
            for old in sorted(rev_dir.glob("*.json"))[:-NA__LIBRARY__KEEP_REVISIONS]:
                old.unlink()
        data = dict(data)
        data["_rev"] = current_rev + 1
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(path.name + ".tmp")
        tmp.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, path)
        return {"rev": data["_rev"], "revision": revision}
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
