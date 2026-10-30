#!/usr/bin/env python3
"""
=============================================================================
 VALEVISION AURA - BUILD UTIL | SYNC THE CORE ENGINE (PAINTERLYNPR)
=============================================================================

FILE       : AuraRender__BuildUtil__SyncCoreEngine__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Bring a pinned copy of the PainterlyNPR render engine into AURA,
             byte for byte, with a lock file that says exactly which version
             and commit it is, and check that copy later
CREATED    : 30-Oct-2026

DESCRIPTION:
- PAINTERLYNPR IS AURA'S CORE LIBRARY. Its repository
  (D:\\11_RefLib__StudioRepository__RemoteSystem\\Na__PainterlyNPR on this PC,
  C:\\01_Code\\Na__PainterlyNPR on another; PAINTERLYNPR_DIR overrides) is the
  single source of truth for the engine. AURA (Vale) is one wrapper round it;
  Noble Architecture's TrueVision 3D wrapper will be the second. Neither edits
  the engine in its own copy: a change goes into PainterlyNPR, is committed
  there, and each wrapper syncs the new version with this script.
- NOTHING OF THE ENGINE IS EVER COPIED INTO AURA BY HAND (Adam, 30-Oct-2026:
  "dont duplicate code the npr repo remains definitive source"): its code,
  its data, its stylesheets and its interface reach AURA only through this
  pin. What AURA needs that the engine cannot give is added to PainterlyNPR as
  a seam (an option, a hook, an export), committed, and synced.
- WHAT IS COPIED, into
      04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v<version>/
  - 02__Src__AppModules, whole: every module, config and stylesheet part.
  - What the engine reads at run time from outside it (NA__SYNC__RUNTIME): the
    asset library (12__Data__AssetLibrary: its index, register and DATs, its
    RND and PXY pictures, and since 1.2.0 its MOD .glb models; never the .skp
    sources), the
    material library (07__Data__MaterialRecipes: its register and swatches),
    and the engine's own stylesheets (03__Style__AppStylesheets, for its
    design tokens).
  Each folder keeps its own name, so every path the engine resolves from its
  own files (its imports, and since v0.8.2 its data roots) lands as in
  PainterlyNPR.
- FROM THE COMMIT: the copy is taken from PainterlyNPR's HEAD with git
  archive, so it is exactly that commit whatever else is open in the working
  tree (several sessions often are). --allow-dirty copies the working tree
  instead, uncommitted changes and all: a local test, marked in the lock, and
  never pushed to the server.
- THE LOCK FILE (PainterlyNPR__CoreLib__VersionLock__.json beside it) records
  the version, the commit, where the copy came from, the date, and a SHA-256
  for every file, so --check proves the copy is untouched.
- AURA'S ENGINE HOST (02__Src__AppModules/10__System__EngineHost) boots the
  engine the way PainterlyNPR's own AppCore Init does, minus PainterlyNPR's
  panel. The lock records Init's hash: when a sync brings a different Init, the
  script says so, and the host is read against it before AURA switches over.
- A NEW VERSION GOES INTO A NEW FOLDER. The old one stays until AURA's import
  map (index.html, and its record 04__Lib__CoreEngine__VersionLocked/
  Vale__CoreEngine__ImportMap__Index__.json) points at the new one and Adam has
  checked it. This script never deletes a version folder.

USAGE:
  python AuraRender__BuildUtil__SyncCoreEngine__.py            copy the engine at PainterlyNPR's HEAD commit
  python AuraRender__BuildUtil__SyncCoreEngine__.py --check    compare the copies with their locks and the repo (writes nothing)
  python AuraRender__BuildUtil__SyncCoreEngine__.py --allow-dirty
                                                               copy the working tree, uncommitted changes and all (a test only:
                                                               the lock marks it, and a dirty copy is never pushed)

REQUIRES:
- Python 3.9 or later, standard library only; git on the PATH.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
30-Oct-2026 - Version 1.2.0
- The pin carries the asset library's MOD .glb models (26 files, 3.0 MB at
  v0.8.9): AURA's API copies a placed asset's MOD and DAT into the project's
  Content__AuraScene__AssetFiles from the pin (scene schema 1.0.0, "A stored
  asset"). The page never fetches them, so the service worker never caches
  them. Still never the .skp sources (SketchUp's slot).
- Version folders sort by version number, not as text: --check compared the
  repo with v0.8.9 as "the newest copy" once v0.8.10 was pinned, and said the
  repo was newer.

30-Oct-2026 - Version 1.1.0 (AURA 0.4.0)
- The pin carries what the engine reads at run time from outside its modules:
  the asset and material libraries (their .json and .webp) and its own
  stylesheets (the design tokens), so AURA mounts the engine's Assets drawer
  and links the engine's tokens instead of keeping copies.
- Copied from the commit (git archive HEAD), not the working tree: other
  sessions' open work no longer blocks a sync, and the copy is exactly the
  commit the lock names. --allow-dirty copies the working tree, as before.

30-Oct-2026 - Version 1.0.0
- Initial build: PainterlyNPR v0.5.0 (29bbcf1) is AURA's first core engine.

=============================================================================
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime, timezone
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__SYNC__AURA_ROOT               = Path(__file__).resolve().parents[1]                     # <-- Vale__ValeVision__AuraRender
NA__SYNC__LIB_DIR                 = NA__SYNC__AURA_ROOT / "04__Lib__CoreEngine__VersionLocked"
NA__SYNC__FOLDER_PREFIX           = "01__CoreLib__PainterlyNPR__v"                           # <-- + the engine's AppVersion
NA__SYNC__MODULES                 = "02__Src__AppModules"                                   # <-- Copied whole, under its own name
NA__SYNC__RUNTIME                 = (                                                       # <-- What the engine reads at run time from outside its modules (v1.1.0)
    ("12__Data__AssetLibrary",     (".json", ".webp", ".glb")),                             # <-- The index, register and DATs; the RND and PXY pictures; the MOD models, for AURA's API to store a placed asset (1.2.0). Never .skp
    ("07__Data__MaterialRecipes",  (".json", ".webp")),                                     # <-- The register and the swatches
    ("03__Style__AppStylesheets",  (".css",)),                                              # <-- The engine's design tokens, linked by AURA's host from the pin
)
NA__SYNC__LOCK_NAME               = "PainterlyNPR__CoreLib__VersionLock__.json"
NA__SYNC__MAIN_CONFIG             = "02__Src__AppModules/02__AppData/PainterlyNPR__AppConfig__Main__.json"
NA__SYNC__INIT_MODULE             = "02__Src__AppModules/01__AppCore/PainterlyNPR__AppCore__Init__.mjs"
NA__SYNC__HOST_MODULE             = NA__SYNC__AURA_ROOT / "02__Src__AppModules" / "10__System__EngineHost" / "Na__EngineHost__PainterlyNpr__.js"
NA__SYNC__REPO_CANDIDATES         = (
    r"D:\11_RefLib__StudioRepository__RemoteSystem\Na__PainterlyNPR",                      # <-- This PC
    r"C:\01_Code\Na__PainterlyNPR",                                                        # <-- Adam's other machine
)
NA__SYNC__SKIP_NAMES              = {"__pycache__", ".DS_Store", "Thumbs.db", "desktop.ini"}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Finding the Engine
# -----------------------------------------------------------------------------

# FUNCTION | The PainterlyNPR Repository: PAINTERLYNPR_DIR, else the known places
# ------------------------------------------------------------
def Na__Sync__FindRepo() -> Path:
    candidates = [os.environ.get("PAINTERLYNPR_DIR") or ""] + list(NA__SYNC__REPO_CANDIDATES)
    for c in candidates:
        if c and (Path(c) / NA__SYNC__MAIN_CONFIG).is_file():
            return Path(c)
    raise SystemExit("[AURA SyncCoreEngine] PainterlyNPR not found. Set PAINTERLYNPR_DIR to its repository folder.")
# ---------------------------------------------------------------

# FUNCTION | The Engine's Version, From Its Own Main Config (App.AppVersion): at a commit, or in the working tree
# ------------------------------------------------------------
def Na__Sync__EngineVersion(repo: Path, commit: str = "") -> str:
    text = Na__Sync__Git(repo, "show", f"{commit}:{NA__SYNC__MAIN_CONFIG}") if commit else (repo / NA__SYNC__MAIN_CONFIG).read_text(encoding="utf-8")
    if not text:
        raise SystemExit(f"[AURA SyncCoreEngine] {NA__SYNC__MAIN_CONFIG} could not be read at {commit}.")
    doc = json.loads(text)
    root = "PainterlyNPR__AppConfig__Main"                                         # <-- Sections are named after the root key
    version = str(doc[root][f"{root}__App"]["AppVersion"]).strip()
    if not version or any(c not in "0123456789." for c in version):
        raise SystemExit(f"[AURA SyncCoreEngine] Unexpected AppVersion {version!r} in {NA__SYNC__MAIN_CONFIG}.")
    return version
# ---------------------------------------------------------------

# HELPER FUNCTION | git, Read Only (never commits, never changes the engine's repository)
# ------------------------------------------------------------
def Na__Sync__Git(repo: Path, *args: str) -> str:
    try:
        out = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, encoding="utf-8", timeout=30)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""
# ---------------------------------------------------------------

# HELPER FUNCTION | The Version Folders, Oldest to Newest by Version Number (v0.8.10 after v0.8.9, never before it as text sorts)
# ------------------------------------------------------------
def Na__Sync__VersionFolders() -> list:
    def version(p: Path) -> tuple:
        try:
            return tuple(int(x) for x in p.name[len(NA__SYNC__FOLDER_PREFIX):].split("."))
        except ValueError:
            return ()                                                              # <-- A folder not named by a version sorts first
    return sorted((p for p in NA__SYNC__LIB_DIR.glob(f"{NA__SYNC__FOLDER_PREFIX}*") if p.is_dir()), key=lambda p: (version(p), p.name))
# ---------------------------------------------------------------

# HELPER FUNCTION | Is This Path (relative to the engine's root) One the Pin Carries?
# ------------------------------------------------------------
def Na__Sync__Carried(rel: str) -> bool:
    parts = rel.split("/")
    if any(p in NA__SYNC__SKIP_NAMES for p in parts):
        return False
    if parts[0] == NA__SYNC__MODULES:
        return True
    for folder, suffixes in NA__SYNC__RUNTIME:
        if parts[0] == folder:
            return rel.lower().endswith(suffixes)
    return False
# ---------------------------------------------------------------

# FUNCTION | The Carried Paths With Uncommitted Changes (modified, added or untracked)
# ------------------------------------------------------------
def Na__Sync__Uncommitted(repo: Path) -> list:
    folders = [NA__SYNC__MODULES] + [f for f, _ in NA__SYNC__RUNTIME]
    out = Na__Sync__Git(repo, "status", "--porcelain", "--untracked-files=all", "--", *folders)
    paths = [line[3:].strip().strip('"').split(" -> ")[-1] for line in out.splitlines() if len(line) > 3]
    return sorted(p for p in paths if Na__Sync__Carried(p))
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Copying
# -----------------------------------------------------------------------------

# FUNCTION | Copy the Carried Files at a Commit (git archive): the copy is exactly that commit
# ------------------------------------------------------------
def Na__Sync__CopyFromCommit(repo: Path, commit: str, target_folder: Path) -> None:
    folders = [NA__SYNC__MODULES] + [f for f, _ in NA__SYNC__RUNTIME]
    no_eol  = ["-c", "core.autocrlf=false", "-c", "core.eol=lf"]                  # <-- The repository's own bytes, not this machine's checkout line endings: the same pin on any PC
    out = subprocess.run(["git", "-C", str(repo), *no_eol, "archive", "--format=tar", commit, "--", *folders], capture_output=True, timeout=120)
    if out.returncode != 0:
        raise SystemExit(f"[AURA SyncCoreEngine] git archive failed: {out.stderr.decode('utf-8', 'replace').strip()}")
    with tarfile.open(fileobj=io.BytesIO(out.stdout), mode="r:") as tar:
        for member in tar.getmembers():
            if not member.isfile() or not Na__Sync__Carried(member.name):
                continue
            dest = target_folder / member.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(tar.extractfile(member).read())
# ---------------------------------------------------------------

# FUNCTION | Copy the Carried Files From the Working Tree (--allow-dirty: a local test)
# ------------------------------------------------------------
def Na__Sync__CopyFromTree(repo: Path, target_folder: Path) -> None:
    for folder in [NA__SYNC__MODULES] + [f for f, _ in NA__SYNC__RUNTIME]:
        for dirpath, dirnames, filenames in os.walk(repo / folder):
            dirnames[:] = sorted(d for d in dirnames if d not in NA__SYNC__SKIP_NAMES)
            for name in sorted(filenames):
                rel = (Path(dirpath) / name).relative_to(repo).as_posix()
                if not Na__Sync__Carried(rel):
                    continue
                dest = target_folder / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(repo / rel, dest)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Hashing and the Lock
# -----------------------------------------------------------------------------

# HELPER FUNCTION | SHA-256 of One File
# ------------------------------------------------------------
def Na__Sync__Sha(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()
# ---------------------------------------------------------------

# FUNCTION | Every File of a Version Folder: {relative path: sha256}, sorted (the lock itself left out)
# ------------------------------------------------------------
def Na__Sync__Manifest(version_folder: Path) -> dict:
    files = {}
    for dirpath, dirnames, filenames in os.walk(version_folder):
        dirnames[:] = sorted(d for d in dirnames if d not in NA__SYNC__SKIP_NAMES)
        for name in sorted(filenames):
            full = Path(dirpath) / name
            if name in NA__SYNC__SKIP_NAMES or full.parent == version_folder:
                continue                                                               # <-- The lock (and anything else at the top) is not the engine
            files[full.relative_to(version_folder).as_posix()] = Na__Sync__Sha(full)    # <-- "02__Src__AppModules/...", "12__Data__AssetLibrary/..."
    return dict(sorted(files.items()))
# ---------------------------------------------------------------

# FUNCTION | The Lock Document (the Vale JSON form: one root key, sections named after it)
# ------------------------------------------------------------
def Na__Sync__LockDocument(repo: Path, version: str, commit: str, from_tree: bool, dirty: bool, files: dict, total_bytes: int) -> dict:
    root = "AuraRender__CoreEngine__VersionLock"
    return {
        root: {
            f"{root}__Meta": {
                "LockLabel"      : "ValeVision AURA - the PainterlyNPR core engine, pinned",
                "LockNote"       : "Written by 60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py - do not edit by hand. "
                                   "The files beside this lock are PainterlyNPR's 02__Src__AppModules, and the runtime data and stylesheets it reads, "
                                   "at the commit below, byte for byte.",
                "WrittenUtc"     : datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            f"{root}__Source": {
                "Engine"         : "PainterlyNPR - Pen and Wash Renderer",
                "EngineVersion"  : version,
                "Commit"         : commit or "unknown",
                "CopiedFrom"     : "working tree" if from_tree else "commit",
                "WorkingTreeClean": not dirty,
                "WorkingTreeCleanNote": "False means the copy holds uncommitted engine changes (--allow-dirty): a test only, never pushed to the server. "
                                        "A copy from the commit is always clean: it is the commit, whatever the working tree held.",
                "RepositoryPath" : str(repo),
            },
            f"{root}__Runtime": {
                "Folders"        : {folder: list(suffixes) for folder, suffixes in NA__SYNC__RUNTIME},
                "FoldersNote"    : "Beside 02__Src__AppModules: what the engine reads at run time from outside its modules, only these file types. "
                                   "The engine resolves them from its own files, so they sit as in PainterlyNPR.",
            },
            f"{root}__Host": {
                "InitModule"     : NA__SYNC__INIT_MODULE,
                "InitSha256"     : files.get(NA__SYNC__INIT_MODULE, ""),
                "InitNote"       : "AURA's engine host (02__Src__AppModules/10__System__EngineHost) boots the engine as this Init does, without PainterlyNPR's panel. A new Init means reading the host against it.",
            },
            f"{root}__Files": {
                "Count"          : len(files),
                "TotalBytes"     : total_bytes,
                "Sha256"         : files,
            },
        }
    }
# ---------------------------------------------------------------

# FUNCTION | Read a Version Folder's Lock (None if missing)
# ------------------------------------------------------------
def Na__Sync__ReadLock(folder: Path) -> dict | None:
    path = folder / NA__SYNC__LOCK_NAME
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8")).get("AuraRender__CoreEngine__VersionLock")
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Sync and Check
# -----------------------------------------------------------------------------

# FUNCTION | Copy the Engine Into Its Version Folder: HEAD's commit, or the working tree (--allow-dirty)
# ------------------------------------------------------------
def Na__Sync__Run(allow_dirty: bool) -> int:
    repo = Na__Sync__FindRepo()
    commit = Na__Sync__Git(repo, "rev-parse", "--short", "HEAD")
    if not commit:
        raise SystemExit("[AURA SyncCoreEngine] PainterlyNPR's HEAD could not be read (is git on the PATH?).")
    open_changes = Na__Sync__Uncommitted(repo)
    from_tree = allow_dirty
    dirty = from_tree and bool(open_changes)
    version = Na__Sync__EngineVersion(repo, "" if from_tree else commit)

    target_folder = NA__SYNC__LIB_DIR / f"{NA__SYNC__FOLDER_PREFIX}{version}"
    previous = Na__Sync__ReadLock(target_folder)
    for folder in [NA__SYNC__MODULES] + [f for f, _ in NA__SYNC__RUNTIME]:
        if (target_folder / folder).exists():
            shutil.rmtree(target_folder / folder)                                  # <-- Only this version's own copy, rewritten whole
    target_folder.mkdir(parents=True, exist_ok=True)
    if from_tree:
        Na__Sync__CopyFromTree(repo, target_folder)
    else:
        Na__Sync__CopyFromCommit(repo, commit, target_folder)

    files = Na__Sync__Manifest(target_folder)
    total = sum((target_folder / rel).stat().st_size for rel in files)
    lock = Na__Sync__LockDocument(repo, version, commit, from_tree, dirty, files, total)
    (target_folder / NA__SYNC__LOCK_NAME).write_text(json.dumps(lock, indent=4, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

    print(f"[AURA SyncCoreEngine] PainterlyNPR v{version} at {commit}{' + its working tree (DIRTY: a local test, never pushed)' if dirty else ''}")
    print(f"  {len(files)} files, {total / 1024:.0f} KB -> {target_folder.relative_to(NA__SYNC__AURA_ROOT)}")
    for folder in [NA__SYNC__MODULES] + [f for f, _ in NA__SYNC__RUNTIME]:
        print(f"      {folder}: {sum(1 for rel in files if rel.split('/')[0] == folder)} files")
    if open_changes and not from_tree:
        print(f"  NOTE: {len(open_changes)} uncommitted engine file(s) are NOT in this copy (it is {commit}), e.g. {open_changes[0]}")
    init_sha = files.get(NA__SYNC__INIT_MODULE, "")
    if previous and previous.get("AuraRender__CoreEngine__VersionLock__Host", {}).get("InitSha256") not in ("", init_sha):
        print("  NOTE: PainterlyNPR's AppCore Init changed since the last sync of this version.")
    others = [p.name for p in Na__Sync__VersionFolders() if p != target_folder]
    if others:
        print(f"  Other version folders kept: {', '.join(others)}")
        print("  Point AURA's import map (index.html and Vale__CoreEngine__ImportMap__Index__.json) at the new folder,")
        print("  read the engine host against the new Init, then remove the old folder by hand once Adam has checked it.")
    return 0
# ---------------------------------------------------------------

# FUNCTION | Check Every Version Folder Against Its Lock, and the Repo's Version Against the Newest
# ------------------------------------------------------------
def Na__Sync__Check() -> int:
    problems = 0
    folders = Na__Sync__VersionFolders()
    if not folders:
        print("[AURA SyncCoreEngine] No engine copy yet. Run this script without --check.")
        return 1
    for folder in folders:
        lock = Na__Sync__ReadLock(folder)
        if not lock:
            print(f"  {folder.name}: NO LOCK FILE")
            problems += 1
            continue
        expected = lock["AuraRender__CoreEngine__VersionLock__Files"]["Sha256"]
        actual = Na__Sync__Manifest(folder)
        changed = sorted(k for k in expected if actual.get(k) != expected[k])
        added = sorted(k for k in actual if k not in expected)
        source = lock["AuraRender__CoreEngine__VersionLock__Source"]
        state = "untouched" if not (changed or added) else f"{len(changed)} changed or missing, {len(added)} added"
        print(f"  {folder.name}: v{source['EngineVersion']} at {source['Commit']}"
              f"{'' if source.get('WorkingTreeClean', True) else ' (DIRTY copy)'} - {len(expected)} files, {state}")
        for rel in (changed + added)[:12]:
            print(f"      {rel}")
        problems += 1 if (changed or added) else 0
    try:
        repo = Na__Sync__FindRepo()
        commit = Na__Sync__Git(repo, "rev-parse", "--short", "HEAD")
        version = Na__Sync__EngineVersion(repo, commit)
        newest = Na__Sync__ReadLock(folders[-1]) or {}
        pinned = newest.get("AuraRender__CoreEngine__VersionLock__Source", {})
        print(f"  PainterlyNPR repository: v{version} at {commit or 'unknown'}"
              f"{' - the same as the newest copy' if (version, commit) == (pinned.get('EngineVersion'), pinned.get('Commit')) else ' - NEWER than the newest copy: sync when Adam says'}")
    except SystemExit as missing:
        print(f"  {missing}")
    if NA__SYNC__HOST_MODULE.is_file():
        print(f"  Engine host: {NA__SYNC__HOST_MODULE.relative_to(NA__SYNC__AURA_ROOT)}")
    return 1 if problems else 0
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry
# -----------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Bring a pinned copy of the PainterlyNPR engine into ValeVision AURA.")
    parser.add_argument("--check", action="store_true", help="compare the copies with their locks and the repository; write nothing")
    parser.add_argument("--allow-dirty", action="store_true", help="copy the working tree, uncommitted changes and all (a local test only)")
    args = parser.parse_args()
    NA__SYNC__LIB_DIR.mkdir(parents=True, exist_ok=True)
    return Na__Sync__Check() if args.check else Na__Sync__Run(args.allow_dirty)


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
