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
- ONE DISPLAY NAME. Na__Library__DisplayName is how every app names a project:
  the Display Name Alias set in the Gallery's Project Editor (projectNameAlias),
  else projectName, else the folder name. The Gallery and Theia both use it.
- NEW PROJECTS (Na__Library__CreateProject) get every folder the schema project
  has (NA__LIBRARY__SCAFFOLD, from ValeProjects__2026/12345__ExampleProject__Schema),
  so ValeVision Cloud Sync, ValeVision 3D, the Gallery, Theia and Lantern Designer
  all find their buckets waiting, and a first record in the shape ValeVision Cloud
  Sync gives a new project (Na__Library__NewRecord).

ENVIRONMENT:
  VALE_ROOT   the mirror / server root (default: two folders above this file)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
22-Oct-2026 - Version 1.3.0
- Na__Library__DisplayName: one rule for a project's name on screen (the Gallery's
  Display Name Alias, else projectName, else the folder name), so the Gallery and
  Theia can never name a project differently.

15-Oct-2026 - Version 1.2.0
- New projects from an app (first used by Lantern Designer): NA__LIBRARY__SCAFFOLD,
  Na__Library__Scaffold, Na__Library__NewProjectId ("1236", "The Brussels House" ->
  "1236__TheBrusselsHouse"), Na__Library__NewRecord, Na__Library__CreateProject (one
  creator at a time across processes: .ProjectCreate.lock in the library root).
- Na__Library__WriteJson takes keep_revisions and revision_every_s, for documents
  saved every few seconds (a Lantern design autosaves): at most one revision copy
  per window, and fewer kept. Both default to the old behaviour, so the Gallery,
  ValeVision 3D and Theia are unchanged.

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
NA__LIBRARY__CODE                 = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,39}$") # <-- A job number: 57079, JN-2906, CC-62383
NA__LIBRARY__SCAFFOLD             = (                                          # <-- Every folder of the schema project (12345__ExampleProject__Schema)
    "LanternDesigner",
    "LanternDesigner/UserData__LanternDesign",
    "ValeVision3D/Content__3dModel__AppGenerated",
    "ValeVision3D/Content__3dModel__GlbFiles",
    "ValeVision3D/Content__AnimationScenes__Thumbnails",
    "ValeVision3D/UserData__UserAppConfigs",
    "ValeVision3D/UserData__UserGeneratedContent__Drawings",
    "ValeVision3D/UserData__UserGeneratedContent__Images",
    "ValeVision__TheiaVideo/AppData__VideoData",
    "ValeVision__TheiaVideo/Content__VideoFiles/Videos__Scheme-01",
    "ValeVision__TheiaVideo/Content__VideoFiles/Videos__Scheme-02",
    "ValeVision__TheiaVideo/Content__VideoFiles/Videos__Scheme-03",
    "ValeVision__TheiaVideo/Content__VideoThumbnails",
    "ValeVision__TheiaVideo/UserData__UserAppConfigs",
    "ValeVisionGallery/Content__GalleryImages__524p__VariantImages",
    "ValeVisionGallery/Content__GalleryImages__FullQuality__VariantImages",
    "ValeVisionGallery/Content__GalleryImages__Thumbnail__VariantImages",
)
NA__LIBRARY__NOT_YET_REVIEWED     = "NOT YET REVIEWED"                         # <-- As ValeVision Cloud Sync writes it
NA__LIBRARY__DEFAULT_NOTES        = "Write a description here. Credit artists or add critique if work is subpar and caused issues."
NA__LIBRARY__CAMERA_DEFAULTS      = {                                          # <-- ValeVision Cloud Sync's NA__PUB__CAMERA_DEFAULTS, verbatim
    "Camera__DefaultPosition__Description": "All camera position/target values are integer millimeters; convert to 3D units in code.",
    "Camera__DefaultPos"     : {"Camera__DefaultPos__PosX": -5000, "Camera__DefaultPos__PosY": 2800, "Camera__DefaultPos__PosZ": 3250},
    "Camera__DefaultTarget"  : {"Camera__DefaultTarget__TargetX": -1250, "Camera__DefaultTarget__TargetY": 2570,
                                "Camera__DefaultTarget__TargetZ": -350},
    "Camera__DefaultRotation": {"Camera__DefaultRotation__RotX": -0.073, "Camera__DefaultRotation__RotY": -0.8346,
                                "Camera__DefaultRotation__RotZ": -0.0541},
    "Camera__DefaultMisc"    : {"Camera__DefaultMisc__Fov": 29.8628}
}

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

# FUNCTION | A Project's Display Name: the Gallery's Display Name Alias, else its projectName, else its id
# ------------------------------------------------------------
def Na__Library__DisplayName(record: dict | None, project_id: str = "") -> str:
    record = record or {}
    return (str(record.get("projectNameAlias") or "").strip()                 # <-- Set in the Gallery's Project Editor
            or str(record.get("projectName") or "").strip() or str(project_id or ""))
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
                           expected_rev: int | None = None, keep_revisions: int | None = None,
                           revision_every_s: int = 0) -> dict:
    """Every document carries "_rev" (missing = 0). With expected_rev (the _rev the client
    loaded), a newer document raises Na__Library__Conflict instead of being overwritten.
    keep_revisions: how many revision copies to keep (default NA__LIBRARY__KEEP_REVISIONS).
    revision_every_s: keep a revision only if the newest one is older than this (0 = every write).
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
            kept = sorted(rev_dir.glob("*.json"))
            if not (revision_every_s and kept and time.time() - kept[-1].stat().st_mtime < revision_every_s):
                who = re.sub(r"[^A-Za-z0-9]", "", user_code) or "unknown"
                rev = rev_dir / f"{time.strftime('%Y%m%d-%H%M%S')}__rev{current_rev}__{who}.json"
                rev.write_bytes(path.read_bytes())
                revision = rev.relative_to(folder).as_posix()
            for old in sorted(rev_dir.glob("*.json"))[:-(keep_revisions or NA__LIBRARY__KEEP_REVISIONS)]:
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


# -----------------------------------------------------------------------------
# REGION | Creating Projects (an app adds a job the library does not have yet)
# -----------------------------------------------------------------------------

# FUNCTION | A New Project's Library Id From Its Job Number and Name ("1236", "The Brussels House" -> "1236__TheBrusselsHouse")
# ------------------------------------------------------------
def Na__Library__NewProjectId(code: str, name: str) -> str:
    """Words are joined in capitals, as the library names them (PlumblyClegg, VanDenBorn); hyphens
    inside a word stay (Hurst-Cox). Raises ValueError with a sentence a person can act on."""
    code = str(code or "").strip()
    if not NA__LIBRARY__CODE.match(code):
        raise ValueError("A job number is digits (letters and hyphens allowed), up to 40 characters: 57079 or JN-2906.")
    words = re.findall(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", str(name or ""))
    joined = "".join(w[:1].upper() + w[1:] for w in words)[:80].strip("-")
    if not joined:
        raise ValueError("The project name needs at least one letter or digit.")
    project_id = f"{code}__{joined}"
    if not NA__LIBRARY__ID.match(project_id):
        raise ValueError(f"{project_id!r} cannot be a library folder name.")
    return project_id
# ---------------------------------------------------------------

# FUNCTION | A New Project's First Record (the shape ValeVision Cloud Sync gives a new project)
# ------------------------------------------------------------
def Na__Library__NewRecord(code: str, name: str, project_type: str = "Whitecard") -> dict:
    """Nothing has been delivered yet, so every schedule field is NOT YET REVIEWED (Cloud Sync
    stamps dateFulfilled itself on its first publish). projectCode drops a letter prefix, as
    Cloud Sync does (JN-2906 -> 2906)."""
    return {
        "projectName"   : str(name or "").strip(),
        "projectCode"   : str(code or "").strip().split("-")[-1],
        "productionData": {"input": NA__LIBRARY__NOT_YET_REVIEWED, "conceptArtist": NA__LIBRARY__NOT_YET_REVIEWED,
                           "designer": NA__LIBRARY__NOT_YET_REVIEWED, "additionalNotes": NA__LIBRARY__DEFAULT_NOTES},
        "scheduleData"  : {"dateReceived": NA__LIBRARY__NOT_YET_REVIEWED, "dateFulfilled": NA__LIBRARY__NOT_YET_REVIEWED,
                           "timeTaken": NA__LIBRARY__NOT_YET_REVIEWED},
        "images"        : [],
        "ProjectType"   : project_type,
        "valeVision_ModelUrls": [],
        "valeVision_Camera__DefaultPosition": json.loads(json.dumps(NA__LIBRARY__CAMERA_DEFAULTS)),
    }
# ---------------------------------------------------------------

# FUNCTION | Give a Project Folder Every Schema Folder It Lacks (returns the ones made)
# ------------------------------------------------------------
def Na__Library__Scaffold(folder: Path) -> list:
    made = []
    for rel in NA__LIBRARY__SCAFFOLD:
        target = Path(folder) / rel
        if not target.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            made.append(rel)
    return made
# ---------------------------------------------------------------

# FUNCTION | Create a Project: Its Folder in ValeProjects__<year>, the Whole Scaffold, Its First Record
# ------------------------------------------------------------
def Na__Library__CreateProject(project_id: str, record: dict, user_code: str = "", year: str | None = None) -> Path:
    """Raises FileExistsError when the id is already in the library (in any year) and ValueError
    for a bad id. One creator at a time across every app process. Returns the new folder."""
    if not NA__LIBRARY__ID.match(str(project_id or "")):
        raise ValueError(f"{project_id!r} cannot be a library folder name.")
    year = str(year or time.strftime("%Y", time.gmtime()))
    if not re.match(r"^\d{4}$", year):
        raise ValueError(f"{year!r} is not a year.")
    with Na__Library__Locked(NA__LIBRARY__DIR / "ProjectCreate"):             # <-- .ProjectCreate.lock: two apps cannot both make the same folder
        if project_id in Na__Library__Index(force=True):
            raise FileExistsError(project_id)
        folder = NA__LIBRARY__DIR / f"ValeProjects__{year}" / project_id
        folder.mkdir(parents=True, exist_ok=False)
        Na__Library__Scaffold(folder)
        Na__Library__WriteJson(folder / f"ProjectData__{project_id}__.json", record, user_code, folder)
    Na__Library__Index(force=True)                                             # <-- Every reader in this process sees it at once
    return folder
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
