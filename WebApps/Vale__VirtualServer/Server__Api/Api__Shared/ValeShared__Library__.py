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
  final newline. The file replace itself is atomic.
- Na__Library__Locked(path) holds one document across PROCESSES: the Gallery and
  ValeVision 3D services each run several gunicorn workers and write the same
  ProjectData files. Every write takes it; a read-modify-write (a merge) holds it
  around the read too. Lock file: ".<document name>.lock" beside the document
  (*.lock never syncs).
- Content__* files are served straight by nginx; Na__Library__Url gives their
  public URL.

ENVIRONMENT:
  VALE_ROOT   the mirror / server root (default: two folders above this file)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 1.1.0
- Writes lock across processes (Na__Library__Locked: fcntl on the server, msvcrt on
  Windows). The old lock was per process, so with two workers and two apps two saves
  of one record could both pass the _rev check and one was lost.

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
NA__LIBRARY__LOCK                 = threading.RLock()                          # <-- The index cache (this process)
NA__LIBRARY__WRITE_LOCK           = threading.RLock()                          # <-- This process's threads queue here first
NA__LIBRARY__HELD                 = {}                                         # <-- lock file -> [handle, depth]; only under WRITE_LOCK

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Cross-Process Lock (one document at a time, every app service)
# -----------------------------------------------------------------------------

# CLASS | Hold One Document Across Processes (re-entrant in this process)
# ------------------------------------------------------------
class Na__Library__Locked:
    """with Na__Library__Locked(path): ... - read, change and write `path` with no other
    process or thread doing the same. Nesting in one thread is fine (a merge that calls
    Na__Library__WriteJson). flock / msvcrt locks end with the process if it dies."""

    def __init__(self, path):
        doc = Path(path)
        self.lock_path = doc.with_name(f".{doc.name}.lock")

    def __enter__(self):
        NA__LIBRARY__WRITE_LOCK.acquire()
        held = NA__LIBRARY__HELD.get(self.lock_path)
        if held:
            held[1] += 1
            return self
        try:
            self.lock_path.parent.mkdir(parents=True, exist_ok=True)
            fh = open(self.lock_path, "a+")
            if os.name == "nt":
                import msvcrt
                while True:
                    try:
                        fh.seek(0)
                        msvcrt.locking(fh.fileno(), msvcrt.LK_LOCK, 1)
                        break
                    except OSError:
                        time.sleep(0.05)
            else:
                import fcntl
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        except BaseException:
            NA__LIBRARY__WRITE_LOCK.release()
            raise
        NA__LIBRARY__HELD[self.lock_path] = [fh, 1]
        return self

    def __exit__(self, *exc):
        try:
            held = NA__LIBRARY__HELD[self.lock_path]
            held[1] -= 1
            if held[1] == 0:
                del NA__LIBRARY__HELD[self.lock_path]
                try:
                    if os.name == "nt":
                        import msvcrt
                        held[0].seek(0)
                        msvcrt.locking(held[0].fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(held[0].fileno(), fcntl.LOCK_UN)
                finally:
                    held[0].close()
        finally:
            NA__LIBRARY__WRITE_LOCK.release()
# ---------------------------------------------------------------

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
    with Na__Library__Locked(path):                                            # <-- The _rev check and the write are one step for every process
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
