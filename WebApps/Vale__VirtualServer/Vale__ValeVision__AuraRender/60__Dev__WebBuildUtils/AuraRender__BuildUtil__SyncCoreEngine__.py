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
- WHAT IS COPIED: PainterlyNPR's whole 02__Src__AppModules folder, every file
  byte for byte, into
      04__Lib__CoreEngine__VersionLocked/01__CoreLib__PainterlyNPR__v<version>/02__Src__AppModules/
  The folder name keeps its own name inside, so every relative import between
  the engine's modules resolves exactly as in PainterlyNPR. Nothing outside it
  is needed: no engine module imports from another top-level folder.
- THE LOCK FILE (PainterlyNPR__CoreLib__VersionLock__.json beside it) records
  the version, the commit, whether the working tree was clean, the date, and a
  SHA-256 for every file, so --check proves the copy is untouched.
- AURA'S ENGINE HOST (02__Src__AppModules/10__System__EngineHost) boots the
  engine the way PainterlyNPR's own AppCore Init does, minus PainterlyNPR's
  panel. The lock records Init's hash: when a sync brings a different Init, the
  script says so, and the host is read against it before AURA switches over.
- A NEW VERSION GOES INTO A NEW FOLDER. The old one stays until AURA's import
  map (index.html, and its record 04__Lib__CoreEngine__VersionLocked/
  Vale__CoreEngine__ImportMap__Index__.json) points at the new one and Adam has
  checked it. This script never deletes a version folder.

USAGE:
  python AuraRender__BuildUtil__SyncCoreEngine__.py            copy the engine at its current commit
  python AuraRender__BuildUtil__SyncCoreEngine__.py --check    compare the copies with their locks and the repo (writes nothing)
  python AuraRender__BuildUtil__SyncCoreEngine__.py --allow-dirty
                                                               copy even with uncommitted engine changes (a test only:
                                                               the lock marks it, and a dirty copy is never pushed)

REQUIRES:
- Python 3.9 or later, standard library only; git on the PATH for the commit.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
30-Oct-2026 - Version 1.0.0
- Initial build: PainterlyNPR v0.5.0 (29bbcf1) is AURA's first core engine.

=============================================================================
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__SYNC__AURA_ROOT               = Path(__file__).resolve().parents[1]                     # <-- Vale__ValeVision__AuraRender
NA__SYNC__LIB_DIR                 = NA__SYNC__AURA_ROOT / "04__Lib__CoreEngine__VersionLocked"
NA__SYNC__FOLDER_PREFIX           = "01__CoreLib__PainterlyNPR__v"                           # <-- + the engine's AppVersion
NA__SYNC__MODULES                 = "02__Src__AppModules"                                   # <-- The one folder copied, under its own name
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

# FUNCTION | The Engine's Version, From Its Own Main Config (App.AppVersion)
# ------------------------------------------------------------
def Na__Sync__EngineVersion(repo: Path) -> str:
    doc = json.loads((repo / NA__SYNC__MAIN_CONFIG).read_text(encoding="utf-8"))
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
        out = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, timeout=30)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""
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

# FUNCTION | Every File of a Modules Folder: {relative path: sha256}, sorted
# ------------------------------------------------------------
def Na__Sync__Manifest(modules_dir: Path) -> dict:
    files = {}
    for dirpath, dirnames, filenames in os.walk(modules_dir):
        dirnames[:] = sorted(d for d in dirnames if d not in NA__SYNC__SKIP_NAMES)
        for name in sorted(filenames):
            if name in NA__SYNC__SKIP_NAMES:
                continue
            full = Path(dirpath) / name
            rel = full.relative_to(modules_dir.parent).as_posix()                    # <-- "02__Src__AppModules/..."
            files[rel] = Na__Sync__Sha(full)
    return dict(sorted(files.items()))
# ---------------------------------------------------------------

# FUNCTION | The Lock Document (the Vale JSON form: one root key, sections named after it)
# ------------------------------------------------------------
def Na__Sync__LockDocument(repo: Path, version: str, commit: str, dirty: bool, files: dict, total_bytes: int) -> dict:
    root = "AuraRender__CoreEngine__VersionLock"
    return {
        root: {
            f"{root}__Meta": {
                "LockLabel"      : "ValeVision AURA - the PainterlyNPR core engine, pinned",
                "LockNote"       : "Written by 60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py - do not edit by hand. "
                                   "The files beside this lock are PainterlyNPR's 02__Src__AppModules at the commit below, byte for byte.",
                "WrittenUtc"     : datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            f"{root}__Source": {
                "Engine"         : "PainterlyNPR - Pen and Wash Renderer",
                "EngineVersion"  : version,
                "Commit"         : commit or "unknown",
                "WorkingTreeClean": not dirty,
                "WorkingTreeCleanNote": "False means the copy holds uncommitted engine changes: a test only, never pushed to the server.",
                "RepositoryPath" : str(repo),
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

# FUNCTION | Copy the Engine at Its Current Commit Into Its Version Folder
# ------------------------------------------------------------
def Na__Sync__Run(allow_dirty: bool) -> int:
    repo = Na__Sync__FindRepo()
    version = Na__Sync__EngineVersion(repo)
    commit = Na__Sync__Git(repo, "rev-parse", "--short", "HEAD")
    dirty = bool(Na__Sync__Git(repo, "status", "--porcelain", "--", NA__SYNC__MODULES))
    if dirty and not allow_dirty:
        print(f"[AURA SyncCoreEngine] PainterlyNPR has uncommitted changes in {NA__SYNC__MODULES}.")
        print("  Commit them in PainterlyNPR first (its own rules: only on Adam's word), or run with --allow-dirty for a local test.")
        return 1

    source = repo / NA__SYNC__MODULES
    target_folder = NA__SYNC__LIB_DIR / f"{NA__SYNC__FOLDER_PREFIX}{version}"
    target = target_folder / NA__SYNC__MODULES
    previous = Na__Sync__ReadLock(target_folder)

    if target.exists():
        shutil.rmtree(target)                                                      # <-- Only this version's own copy, rewritten whole
    shutil.copytree(source, target, ignore=shutil.ignore_patterns(*NA__SYNC__SKIP_NAMES))

    files = Na__Sync__Manifest(target)
    total = sum((target_folder / rel).stat().st_size for rel in files)
    lock = Na__Sync__LockDocument(repo, version, commit, dirty, files, total)
    (target_folder / NA__SYNC__LOCK_NAME).write_text(json.dumps(lock, indent=4, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

    print(f"[AURA SyncCoreEngine] PainterlyNPR v{version} at {commit or 'unknown commit'}{' (DIRTY)' if dirty else ''}")
    print(f"  {len(files)} files, {total / 1024:.0f} KB -> {target_folder.relative_to(NA__SYNC__AURA_ROOT)}")
    init_sha = files.get(NA__SYNC__INIT_MODULE, "")
    if previous and previous.get("AuraRender__CoreEngine__VersionLock__Host", {}).get("InitSha256") not in ("", init_sha):
        print("  NOTE: PainterlyNPR's AppCore Init changed since the last sync of this version.")
    others = sorted(p.name for p in NA__SYNC__LIB_DIR.glob(f"{NA__SYNC__FOLDER_PREFIX}*") if p.is_dir() and p != target_folder)
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
    folders = sorted(p for p in NA__SYNC__LIB_DIR.glob(f"{NA__SYNC__FOLDER_PREFIX}*") if p.is_dir())
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
        actual = Na__Sync__Manifest(folder / NA__SYNC__MODULES) if (folder / NA__SYNC__MODULES).is_dir() else {}
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
        version = Na__Sync__EngineVersion(repo)
        commit = Na__Sync__Git(repo, "rev-parse", "--short", "HEAD")
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
    parser.add_argument("--allow-dirty", action="store_true", help="copy uncommitted engine changes (a local test only)")
    args = parser.parse_args()
    NA__SYNC__LIB_DIR.mkdir(parents=True, exist_ok=True)
    return Na__Sync__Check() if args.check else Na__Sync__Run(args.allow_dirty)


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
