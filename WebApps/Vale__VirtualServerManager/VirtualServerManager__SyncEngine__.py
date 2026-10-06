#!/usr/bin/env python3
"""
=============================================================================
 VALE VIRTUAL SERVER MANAGER - SYNC ENGINE
=============================================================================

FILE       : VirtualServerManager__SyncEngine__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Two-way parity between WebApps/Vale__VirtualServer (this PC) and the
             Linux VPS (/srv/vale), lane by lane, over ONE ssh connection per job.
CREATED    : 06-Oct-2026

DESCRIPTION:
- The local MirrorRoot IS the server Root. Each mapping pairs a PC folder with a
  server path. Inside a mapping every folder belongs to one of three LANES:
    code      Source code           PC -> server  exact mirror (adds, replaces, deletes)
    content   Heavy content         PC -> server  additive, newer wins, never deletes
    userdata  User content/configs  server -> PC  additive, newer wins, never deletes
    shared    Project data          both ways     newer wins, never deletes (e.g. ProjectData__*.json)
  A folder's lane comes from its name (LanePatterns) or the mapping's Content /
  UserData lists, and is inherited by everything inside it.
- Compare : one session scans the server; the plan shows every lane both ways.
- Push    : one session uploads code + content (staged, backed up, conflict-checked).
- Collect : one session downloads user data (and optionally content) into the PC
            mirror; every PC file it replaces is kept in the backup folder first.
- Undo    : puts back the last push of a mapping. Seed: first upload of user data
            (adds missing only). Backup: dated snapshot of user data on this PC.
- Watch   : one long-lived session streams the server tree for the live explorer.
- The server-side work is a small Python agent sent over stdin, so nothing has to
  be installed on the server. Shares its lock, cooldown and session log with the
  vgh-app-server skill's vps.py (%LOCALAPPDATA%\\vgh-app-server).

USAGE (CLI, used by Claude):
  python VirtualServerManager__SyncEngine__.py check | mappings | status | prepare-root
  python VirtualServerManager__SyncEngine__.py compare [ID ...] [--deep]
  python VirtualServerManager__SyncEngine__.py push    [ID ...] [--yes] [--allow-deletes] [--force-content] [--force]
  python VirtualServerManager__SyncEngine__.py collect [ID ...] [--yes] [--with-content] [--force-userdata]
         compare / push / collect also take  --scope <folder in the one mapping>  --report-file <json>
         e.g. push projects --scope ValeProjects__2026/64135__Washington --yes   (the SketchUp sync's call)
  python VirtualServerManager__SyncEngine__.py undo ID | seed [ID ...] | backup [ID ...]
  python VirtualServerManager__SyncEngine__.py routes | nginx-status | nginx-test | nginx-apply
  python VirtualServerManager__SyncEngine__.py users
  python VirtualServerManager__SyncEngine__.py user-reset USR00000012 [--yes] | user-signout USR00000012 [--yes]

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 0.6.0
- One-project syncs: compare / push / collect take --scope (one folder inside one mapping,
  e.g. projects --scope ValeProjects__2026/64135__Washington). The plan holds only files
  under it; the server agent is unchanged, so undo, the journal and the ledger work as for
  any push of that mapping. Used by the SketchUp ValeVision Cloud Sync plugin.
- --report-file writes the plan and the result as JSON for other tools (gateway refusals too).

06-Oct-2026 - Version 0.5.0
- Reset a password / sign someone out everywhere, on the live server at once
  (agent mode "users", one session, under the sign-in API's register lock); the
  same change lands in the PC copy. ValeUser__Session__SignedOutDate ends every
  session issued before it. The staged "reset on save" is gone.
- A push of the users register keeps the server's password and sign-out fields
  for each person (users' own passwords, resets, sign-outs), except a temporary
  password the PC changed because the first name changed.

06-Oct-2026 - Version 0.4.2
- Users get ValeUser__Employee__Department (from the register's DepartmentOptions).

06-Oct-2026 - Version 0.4.0
- User accounts (Server__UserAccountData): register load / validate / save in
  aligned JSON, Werkzeug-compatible password hashes, the `users` command.
- nginx hides EVERY Server__ folder; a private Server__ folder is not pushed until
  the live nginx carries that rule.

06-Oct-2026 - Version 0.2.0
- Three lanes (code / content / userdata) replace "protected" folders; Collect
  brings server-made user data to the PC; newer-wins with conflict lists.
- Watch mode: live server tree for the explorer tab over one held connection.

06-Oct-2026 - Version 0.1.0
- Initial build: mappings, compare, sync with backup, undo, seed, backup, status.

=============================================================================
"""

from __future__ import annotations

import argparse
import base64
import fnmatch
import gzip
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import string
import subprocess
import sys
import tarfile
import threading
import time
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Engine Constants
# -----------------------------------------------------------------------------

NA__ENGINE__APP_ROOT_PATH         = Path(__file__).resolve().parent
NA__ENGINE__CONFIG_PATH           = Path(os.environ.get("VSM_CONFIG") or
                                         NA__ENGINE__APP_ROOT_PATH / "01__AppData" / "VirtualServerManager__SyncMap__.json")
NA__ENGINE__ROUTES_PATH           = Path(os.environ.get("VSM_ROUTES") or
                                         NA__ENGINE__APP_ROOT_PATH / "01__AppData" / "VirtualServerManager__UrlRoutes__.json")
NA__ENGINE__LEDGER_PATH           = Path(os.environ.get("VSM_LEDGER") or
                                         NA__ENGINE__APP_ROOT_PATH / "01__AppData" / "VirtualServerManager__SyncLedger__.json")
NA__ENGINE__NGINX_RECORD          = Path("Server__DeveloperTools") / "40__Config__Nginx" / "Vale__Nginx__SiteBody__GENERATED__.conf"
NA__ENGINE__SERVER_CATCHALL       = "location ^~ /Server__ "                   # <-- nginx line hiding every Server__ folder
NA__ENGINE__NAMED_SERVER_DIRS     = ("Server__Api", "Server__DeveloperTools")  # <-- Hidden by name since the first nginx apply
NA__ENGINE__ROUTE_SEGMENT         = re.compile(r"^[a-z0-9][a-z0-9-]*$")          # <-- Short, lowercase, QR friendly
NA__ENGINE__ROUTE_VARIABLE        = re.compile(r"^\{([a-z][a-z0-9_]*)\}$")
NA__ENGINE__ROUTE_TARGET_SAFE     = re.compile(r"^[A-Za-z0-9/_.\-?=&%{}:+~#]*$")
NA__ENGINE__RESULT_MARKER         = "__VALE_RESULT__"                          # <-- Prefix of the agent's JSON result line
NA__ENGINE__WATCH_MARKER          = "__VALE_WATCH__"                           # <-- Prefix of each live-tree message
NA__ENGINE__LANES                 = ("code", "content", "userdata", "shared")
NA__ENGINE__TREE_SKIP_DIRS        = [".venv", "venv", "__pycache__", ".git", "node_modules"]

NA__USERS__DIR                    = "Server__UserAccountData"                  # <-- Under the mirror / server root
NA__USERS__FILE                   = "UserAccountData__ValeUsers__Register__.json"
NA__USERS__APP_CONFIGS            = "UserData__UserAppConfigs"                 # <-- <App>/UserConfig__<USR code>__<App>__.json
NA__USERS__RECORDS                = "UserAccountData__ValeUsers__Records"
NA__USERS__CODE                   = re.compile(r"^USR\d{8}$")                  # <-- USR + 8 digits, never reused
NA__USERS__DATE                   = re.compile(r"^\d{2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$")
NA__USERS__NAME                   = re.compile(r"^[A-Za-z][A-Za-z' .-]*$")
NA__USERS__EMAIL                  = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NA__USERS__MONTHS                 = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
NA__USERS__HASH_ITERATIONS        = 600_000                                    # <-- Werkzeug 3 default for pbkdf2:sha256
NA__USERS__EDITABLE               = ("ValeUser__Name__First", "ValeUser__Name__Last", "ValeUser__Email__Address",
                                     "ValeUser__Employee__Department", "ValeUser__Employee__Role",
                                     "ValeUser__Permission__Level", "ValeUser__Employee__IsActive",
                                     "ValeUser__Account__Note")
NA__USERS__PASSWORD_KEYS          = ("ValeUser__Password__Hash", "ValeUser__Password__IsTemporary",
                                     "ValeUser__Password__SetDate")
NA__USERS__SIGNED_OUT             = "ValeUser__Session__SignedOutDate"         # <-- Sessions issued before it are ended
NA__USERS__FIELD_ORDER            = ("ValeUser__UniqueCode",) + NA__USERS__EDITABLE[:7] + (
                                     "ValeUser__Account__CreatedDate",) + NA__USERS__PASSWORD_KEYS + (
                                     NA__USERS__SIGNED_OUT, "ValeUser__Account__Note")
NA__USERS__ACTIONS                = ("reset", "signout")                       # <-- Done on the server at once (tab 04)
NA__USERS__HISTORY_KEEP           = 30                                         # <-- Previous registers kept on this PC

if os.name == "nt":
    NA__GATEWAY__SSH_DIR          = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "OpenSSH"
    NA__GATEWAY__SSH_EXE          = os.environ.get("VALE_SSH_EXE", str(NA__GATEWAY__SSH_DIR / "ssh.exe"))
    NA__GATEWAY__SSH_ADD_EXE      = str(Path(NA__GATEWAY__SSH_EXE).with_name("ssh-add.exe"))
    NA__GATEWAY__STATE_DIR        = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "vgh-app-server"
else:
    NA__GATEWAY__SSH_EXE          = os.environ.get("VALE_SSH_EXE", "ssh")
    NA__GATEWAY__SSH_ADD_EXE      = "ssh-add"
    NA__GATEWAY__STATE_DIR        = Path.home() / ".vgh-app-server"
if os.environ.get("VSM_STATE_DIR"):                                            # <-- Test runs only: isolated state
    NA__GATEWAY__STATE_DIR        = Path(os.environ["VSM_STATE_DIR"])

NA__GATEWAY__STATE_FILE           = NA__GATEWAY__STATE_DIR / "state.json"      # <-- Shared with the skill's vps.py
NA__GATEWAY__LOG_FILE             = NA__GATEWAY__STATE_DIR / "sessions.log"    # <-- Shared with the skill's vps.py
NA__GATEWAY__LOCK_FILE            = NA__GATEWAY__STATE_DIR / "session.lock"    # <-- Shared with the skill's vps.py
NA__GATEWAY__MIN_GAP_S            = 5                                          # <-- Seconds between session starts
NA__GATEWAY__WARN_WINDOW_S        = 600                                        # <-- Busy-warning look-back
NA__GATEWAY__COOLDOWN_S           = 11 * 60                                    # <-- fail2ban bantime 10 min plus margin
NA__GATEWAY__LOCK_WAIT_S          = 20 * 60                                    # <-- Queue behind another session this long
NA__GATEWAY__SSH_OPTS             = ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15",
                                     "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3",
                                     "-o", "LogLevel=ERROR"]

NA__ENGINE__REMOTE_BOOT           = ("python3 -c 'import base64,sys;"
                                     "exec(compile(base64.b64decode(sys.stdin.buffer.readline()),\"vale_agent\",\"exec\"))'")

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

# FUNCTION | Load the Sync Map
# ------------------------------------------------------------
def Na__Config__Load() -> dict:
    cfg = json.loads(NA__ENGINE__CONFIG_PATH.read_text(encoding="utf-8"))
    ids = [m["Id"] for m in cfg["Mappings"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate mapping Id in the sync map")
    return cfg
# ---------------------------------------------------------------

# FUNCTION | Save the Sync Map Atomically
# ------------------------------------------------------------
def Na__Config__Save(cfg: dict) -> None:
    tmp = NA__ENGINE__CONFIG_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(cfg, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, NA__ENGINE__CONFIG_PATH)
# ---------------------------------------------------------------

# HELPER FUNCTION | Resolve a Mapping's PC Folder
# ------------------------------------------------------------
def Na__Config__LocalPath(cfg: dict, m: dict) -> Path:
    p = Path(m["Local"])
    return p if p.is_absolute() else Path(cfg["Local"]["MirrorRoot"]) / p
# ---------------------------------------------------------------

# HELPER FUNCTION | A Mapping's Server Path Relative to the Root ("" = root)
# ------------------------------------------------------------
def Na__Config__RemoteRel(m: dict) -> str:
    rel = m["Remote"].replace("\\", "/").strip("/")
    return "" if rel in ("", ".") else rel
# ---------------------------------------------------------------

# HELPER FUNCTION | Resolve a Mapping's Server Path (always under the server root)
# ------------------------------------------------------------
def Na__Config__RemotePath(cfg: dict, m: dict) -> str:
    root = cfg["Server"]["Root"].rstrip("/")
    rel = Na__Config__RemoteRel(m)
    if ".." in rel.split("/") or any(c in rel for c in "'\"`$;&|<>*?\n"):
        raise ValueError(f"unsafe server path for {m['Id']}: {m['Remote']!r}")
    return f"{root}/{rel}" if rel else root
# ---------------------------------------------------------------

# HELPER FUNCTION | Does a Mapping Mirror the PC Layout Exactly
# ------------------------------------------------------------
def Na__Config__IsMirror(cfg: dict, m: dict) -> bool:
    try:
        local_rel = Na__Config__LocalPath(cfg, m).resolve().relative_to(
            Path(cfg["Local"]["MirrorRoot"]).resolve()).as_posix()
    except ValueError:
        return False
    return ("" if local_rel == "." else local_rel) == Na__Config__RemoteRel(m)
# ---------------------------------------------------------------

# HELPER FUNCTION | Pick Mappings by Id (default: every enabled mapping)
# ------------------------------------------------------------
def Na__Config__Pick(cfg: dict, ids: list | None) -> list:
    by_id = {m["Id"]: m for m in cfg["Mappings"]}
    if not ids:
        return [m for m in cfg["Mappings"] if m.get("Enabled", True)]
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise ValueError(f"unknown mapping id(s): {', '.join(missing)}. Known: {', '.join(by_id)}")
    return [by_id[i] for i in ids]
# ---------------------------------------------------------------

# FUNCTION | The Rules One Mapping Is Walked By (shared with the agent)
# ------------------------------------------------------------
def Na__Config__Rules(cfg: dict, m: dict) -> dict:
    never = cfg["NeverSync"] + m.get("Exclude", [])
    return {"id": m["Id"], "path": Na__Config__RemotePath(cfg, m), "files_only": bool(m.get("FilesOnly")),
            "ex_code": never + cfg["KindExcludes"].get(m.get("Kind", "web"), []),
            "ex_data": never,
            "content": m.get("Content", []), "userdata": m.get("UserData", []),
            "default_lane": m.get("DefaultLane", "code"),
            "content_patterns": cfg["LanePatterns"]["content"],
            "userdata_patterns": cfg["LanePatterns"]["userdata"]}
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Walk Rules (the agent carries an identical copy)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Does a Pattern List Match This Path
# ------------------------------------------------------------
def Na__Walk__Match(rel: str, name: str, is_dir: bool, patterns: list) -> bool:
    for p in patterns:
        dir_only = p.endswith("/")
        pat = p.rstrip("/")
        if dir_only and not is_dir:
            continue
        if fnmatch.fnmatchcase(rel if "/" in pat else name, pat):
            return True
    return False
# ---------------------------------------------------------------

# HELPER FUNCTION | The Lane of a Folder
# ------------------------------------------------------------
def Na__Walk__DirLane(rel: str, name: str, parent: str, r: dict) -> str:
    """content / userdata folders keep their lane all the way down. Inside code or
    shared, a folder named like a data lane (or listed in the mapping) switches to it."""
    if parent in ("content", "userdata"):
        return parent
    if rel in r["userdata"] or any(fnmatch.fnmatchcase(name, p) for p in r["userdata_patterns"]):
        return "userdata"
    if rel in r["content"] or any(fnmatch.fnmatchcase(name, p) for p in r["content_patterns"]):
        return "content"
    return parent
# ---------------------------------------------------------------

# HELPER FUNCTION | Lane and Exclusion of Any Path in a Mapping (no disk access)
# ------------------------------------------------------------
def Na__Walk__Classify(rel: str, r: dict, is_dir: bool = False) -> tuple:
    """Returns (lane, excluded) for a path relative to the mapping folder."""
    parts = rel.split("/")
    lane = r.get("default_lane", "code")
    if r["files_only"] and (len(parts) > 1 or is_dir):
        return lane, True
    for i in range(1, len(parts) + (1 if is_dir else 0)):
        drel = "/".join(parts[:i])
        lane = Na__Walk__DirLane(drel, parts[i - 1], lane, r)
        if Na__Walk__Match(drel, parts[i - 1], True, r["ex_code"] if lane == "code" else r["ex_data"]):
            return lane, True
    if not is_dir and Na__Walk__Match(rel, parts[-1], False, r["ex_code"] if lane == "code" else r["ex_data"]):
        return lane, True
    return lane, False
# ---------------------------------------------------------------

# FUNCTION | Scan a PC Folder Into {rel: [size, mtime, lane(, sha)]}
# ------------------------------------------------------------
def Na__Walk__ScanLocal(base: Path, r: dict, deep: bool = False) -> dict:
    out = {"exists": base.is_dir(), "files": {}}
    if not out["exists"]:
        return out
    lanes = {"": r.get("default_lane", "code")}
    for dirpath, dirnames, filenames in os.walk(base):
        here = Path(dirpath)
        rel_dir = here.relative_to(base).as_posix()
        rel_dir = "" if rel_dir == "." else rel_dir
        lane_here = lanes.get(rel_dir, r.get("default_lane", "code"))
        keep = []
        for d in sorted(dirnames):
            rel = f"{rel_dir}/{d}" if rel_dir else d
            if (here / d).is_symlink():
                continue
            lane = Na__Walk__DirLane(rel, d, lane_here, r)
            if Na__Walk__Match(rel, d, True, r["ex_code"] if lane == "code" else r["ex_data"]):
                continue
            lanes[rel] = lane
            keep.append(d)
        dirnames[:] = [] if r["files_only"] else keep
        ex = r["ex_code"] if lane_here == "code" else r["ex_data"]
        for f in sorted(filenames):
            rel = f"{rel_dir}/{f}" if rel_dir else f
            p = here / f
            if p.is_symlink() or Na__Walk__Match(rel, f, False, ex):
                continue
            st = p.stat()
            e = [st.st_size, int(st.st_mtime), lane_here]
            if deep and lane_here == "code":
                e.append(hashlib.sha256(p.read_bytes()).hexdigest())
            out["files"][rel] = e
    return out
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server Agent (sent over stdin with every job; runs with python3 on the VPS)
# -----------------------------------------------------------------------------

NA__AGENT__SOURCE = r'''
import fnmatch, hashlib, json, os, re, shutil, socket, subprocess, sys, tarfile, time
from pathlib import Path

ARGS = json.loads(sys.stdin.buffer.readline())
MODE = ARGS["mode"]
os.umask(0o002)                                                            # <-- New folders 775: the APIs (group vale) can save into them
ROOT = Path(ARGS["root"])
AREA = Path(ARGS["area"])
STAMP = ARGS.get("stamp") or time.strftime("%Y%m%d-%H%M%S", time.gmtime())
WHO = os.environ.get("SUDO_USER") or os.environ.get("USER") or "?"
REGISTER = ROOT / ARGS["register"] if ARGS.get("register") else None
RECORDS = "UserAccountData__ValeUsers__Records"
PASSWORD_KEYS = ("ValeUser__Password__Hash", "ValeUser__Password__IsTemporary", "ValeUser__Password__SetDate")
SIGNED_OUT = "ValeUser__Session__SignedOutDate"

def say(msg):
    print(msg, file=sys.stderr, flush=True)

def result(obj):
    print("__VALE_RESULT__" + json.dumps(obj), file=sys.stderr if MODE in ("backup", "collect") else sys.stdout,
          flush=True)

def match(rel, name, is_dir, patterns):
    for p in patterns:
        dir_only = p.endswith("/")
        pat = p.rstrip("/")
        if dir_only and not is_dir:
            continue
        if fnmatch.fnmatchcase(rel if "/" in pat else name, pat):
            return True
    return False

def dir_lane(rel, name, parent, r):
    if parent in ("content", "userdata"):
        return parent
    if rel in r["userdata"] or any(fnmatch.fnmatchcase(name, p) for p in r["userdata_patterns"]):
        return "userdata"
    if rel in r["content"] or any(fnmatch.fnmatchcase(name, p) for p in r["content_patterns"]):
        return "content"
    return parent

def lane_of(rel, r):
    parts, lane = rel.split("/"), r.get("default_lane", "code")
    for i in range(1, len(parts)):
        lane = dir_lane("/".join(parts[:i]), parts[i - 1], lane, r)
    return lane

def safe_rel(rel):
    return bool(rel) and not rel.startswith("/") and ".." not in rel.split("/") and "\\" not in rel

def state(p):
    try:
        st = p.lstat()
    except FileNotFoundError:
        return None
    return [st.st_size, int(st.st_mtime)]

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def scan(r, deep):
    base = Path(r["path"])
    out = {"exists": base.is_dir(), "files": {}}
    if not out["exists"]:
        return out
    lanes = {"": r.get("default_lane", "code")}
    for dirpath, dirnames, filenames in os.walk(base):
        here = Path(dirpath)
        rel_dir = here.relative_to(base).as_posix()
        rel_dir = "" if rel_dir == "." else rel_dir
        lane_here = lanes.get(rel_dir, r.get("default_lane", "code"))
        keep = []
        for d in sorted(dirnames):
            rel = f"{rel_dir}/{d}" if rel_dir else d
            if (here / d).is_symlink():
                continue
            lane = dir_lane(rel, d, lane_here, r)
            if match(rel, d, True, r["ex_code"] if lane == "code" else r["ex_data"]):
                continue
            lanes[rel] = lane
            keep.append(d)
        dirnames[:] = [] if r["files_only"] else keep
        ex = r["ex_code"] if lane_here == "code" else r["ex_data"]
        for f in sorted(filenames):
            rel = f"{rel_dir}/{f}" if rel_dir else f
            p = here / f
            if p.is_symlink() or match(rel, f, False, ex):
                continue
            st = p.stat()
            e = [st.st_size, int(st.st_mtime), lane_here]
            if deep and lane_here == "code":
                e.append(sha(p))
            out["files"][rel] = e
    return out

def under_root(path):
    r = str(ROOT.resolve())
    p = str(Path(path).resolve())
    return p == r or p.startswith(r.rstrip(os.sep) + os.sep)

def check_paths():
    if not ROOT.is_dir():
        result({"ok": False, "error": f"server root {ROOT} does not exist: run prepare-root first"})
        sys.exit(3)
    for r in ARGS.get("mappings", []):
        if not under_root(r["path"]):
            result({"ok": False, "error": f"{r['path']} is outside the server root {ROOT}"})
            sys.exit(3)

def log_line(text):
    try:
        AREA.mkdir(parents=True, exist_ok=True)
        log = AREA / "sync.log"
        with open(log, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S UTC ", time.gmtime()) + WHO + " " + text + "\n")
        if hasattr(os, "geteuid") and os.geteuid() == 0:                   # sudo jobs: keep the log the owner's
            st = AREA.stat()
            os.chown(log, st.st_uid, st.st_gid)
    except OSError as e:
        say(f"  (sync.log not written: {e})")

def extract_stream(stage):
    stage.mkdir(parents=True, exist_ok=True)
    names = []
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|gz") as tar:
        for ti in tar:
            if not (ti.isfile() or ti.isdir()) or not safe_rel(ti.name):
                raise SystemExit(f"refused tar member {ti.name!r}")
            try:
                tar.extract(ti, stage, filter="data")
            except TypeError:
                tar.extract(ti, stage)
            if ti.isfile():
                names.append(ti.name)
    return names

def prune_dirs(start, base):
    d = start
    while d != base and d.is_dir() and not any(d.iterdir()):
        d.rmdir()
        d = d.parent

def aligned(value, depth=0):                                                   # the register's JSON style (same as the engine and the API)
    pad, inner = "    " * depth, "    " * (depth + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        width = max(len(json.dumps(k, ensure_ascii=False)) for k in value)
        out, prev_box = "", False
        for i, (k, v) in enumerate(value.items()):
            box = isinstance(v, (dict, list))
            if i:
                out += ",\n" + ("\n" if depth == 0 and (box or prev_box) else "")
            out += f"{inner}{json.dumps(k, ensure_ascii=False).ljust(width)} : {aligned(v, depth + 1)}"
            prev_box = box
        return "{\n" + out + "\n" + pad + "}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(v, (dict, list)) for v in value):
            line = "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
            if len(inner) + len(line) <= 120:
                return line
        return "[\n" + ",\n".join(inner + aligned(v, depth + 1) for v in value) + "\n" + pad + "]"
    return json.dumps(value, ensure_ascii=False)

class register_lock:                                                           # the sign-in API's own lock file, so a password change never interleaves
    def __init__(self, reg):
        self.path = reg.with_name(".UserAccountData__Register.lock")
    def __enter__(self):
        fd = os.open(self.path, os.O_RDWR | os.O_CREAT, 0o660)
        if hasattr(os, "fchmod") and os.fstat(fd).st_uid == os.geteuid():
            os.fchmod(fd, 0o660)                                               # the API (group vale) must open it too
        self.fh = os.fdopen(fd, "r+")
        try:
            import fcntl
            fcntl.flock(self.fh.fileno(), fcntl.LOCK_EX)
        except ImportError:
            pass                                                               # Windows test runs (VSM_FAKE_SSH) only
        return self
    def __exit__(self, *exc):
        self.fh.close()                                                        # closing releases the lock

def note_last(rec):
    if "ValeUser__Account__Note" in rec:
        rec["ValeUser__Account__Note"] = rec.pop("ValeUser__Account__Note")

def keep_server_fields(incoming, current):
    # The server owns each person's password and forced sign-out (users change their own;
    # resets and sign-outs are made there). Keep them, except a temporary password the PC
    # re-made because the first name changed. Returns the codes kept.
    now = {r.get("ValeUser__UniqueCode"): r for r in current.get(RECORDS) or []}
    kept = []
    for rec in incoming.get(RECORDS) or []:
        cur = now.get(rec.get("ValeUser__UniqueCode"))
        if not cur:
            continue
        changed = False
        if cur.get(SIGNED_OUT) and cur.get(SIGNED_OUT) != rec.get(SIGNED_OUT):
            rec[SIGNED_OUT] = cur[SIGNED_OUT]
            changed = True
        renamed = rec.get(PASSWORD_KEYS[1]) and cur.get(PASSWORD_KEYS[1]) and \
            rec.get("ValeUser__Name__First") != cur.get("ValeUser__Name__First")
        if not renamed and any(rec.get(k) != cur.get(k) for k in PASSWORD_KEYS):
            rec.update({k: cur.get(k) for k in PASSWORD_KEYS})
            changed = True
        if changed:
            note_last(rec)
            kept.append(rec.get("ValeUser__UniqueCode"))
    return kept

def write_register(path, doc):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(aligned(doc) + "\n", encoding="utf-8", newline="\n")
    os.chmod(tmp, 0o660)                                                       # owner and group vale only
    os.replace(tmp, path)

def push_register(staged, dst):
    with register_lock(dst):
        kept = []
        if dst.is_file():
            incoming = json.loads(staged.read_text(encoding="utf-8"))
            kept = keep_server_fields(incoming, json.loads(dst.read_text(encoding="utf-8")))
            if kept:
                staged.write_text(aligned(incoming) + "\n", encoding="utf-8", newline="\n")
        os.replace(staged, dst)
    return kept

def mode_scan():
    check_paths()
    result({"ok": True, "scans": {r["id"]: scan(r, ARGS.get("deep")) for r in ARGS["mappings"]}})

def mode_apply():
    check_paths()
    plans = {p["id"]: p for p in ARGS["plans"]}
    rules = {r["id"]: r for r in ARGS["mappings"]}
    conflicts = []
    for pid, plan in plans.items():
        r = rules[pid]
        base = Path(r["path"])
        for rel in plan["upload"]:
            if not safe_rel(rel) or lane_of(rel, r) not in ("code", "content", "shared"):
                result({"ok": False, "error": f"refused upload into the user-data lane: {pid}:{rel}"}); sys.exit(3)
        for rel in plan["delete"]:
            if not safe_rel(rel) or lane_of(rel, r) != "code":
                result({"ok": False, "error": f"refused delete outside the code lane: {pid}:{rel}"}); sys.exit(3)
        for rel, expected in plan["expect"].items():
            cur = state(base / rel)
            if cur != (expected[:2] if expected else None):
                conflicts.append(f"{pid}:{rel} expected {expected[:2] if expected else None} found {cur}")
    if conflicts and not ARGS.get("force"):
        result({"ok": False, "conflicts": conflicts[:50], "conflict_count": len(conflicts),
                "error": "the server changed since Compare: compare again (nothing was changed)"})
        sys.exit(4)
    stage = AREA / "staging" / STAMP
    backup = AREA / "backups" / STAMP
    try:
        staged = set(extract_stream(stage))
        journal = {"stamp": STAMP, "user": WHO, "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "plans": []}
        for pid, plan in plans.items():
            base = Path(rules[pid]["path"])
            base.mkdir(parents=True, exist_ok=True)
            done = {"id": pid, "path": str(base), "added": [], "replaced": [], "deleted": [], "after": {}}
            for rel in plan["upload"]:
                if f"{pid}/{rel}" not in staged:
                    raise SystemExit(f"upload missing from stream: {pid}:{rel}")
                dst = base / rel
                if dst.exists():
                    (backup / pid / rel).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(dst, backup / pid / rel)
                    done["replaced"].append(rel)
                else:
                    done["added"].append(rel)
                dst.parent.mkdir(parents=True, exist_ok=True)
                if REGISTER and dst == REGISTER:
                    done["kept_server"] = push_register(stage / pid / rel, dst)   # users' own passwords, resets, sign-outs
                else:
                    os.replace(stage / pid / rel, dst)
                done["after"][rel] = state(dst)
            for rel in plan["delete"]:
                dst = base / rel
                if dst.is_file():
                    (backup / pid / rel).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(dst, backup / pid / rel)
                    dst.unlink()
                    done["deleted"].append(rel)
                    prune_dirs(dst.parent, base)
            journal["plans"].append(done)
            say(f"  {pid}: +{len(done['added'])} ~{len(done['replaced'])} -{len(done['deleted'])}")
            log_line(f"push {STAMP} {pid} +{len(done['added'])} ~{len(done['replaced'])} -{len(done['deleted'])}")
        (AREA / "journal").mkdir(parents=True, exist_ok=True)
        (AREA / "journal" / f"{STAMP}.json").write_text(json.dumps(journal), encoding="utf-8")
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    keep = int(ARGS.get("keep_backups", 30))
    stamps = sorted(p.stem for p in (AREA / "journal").glob("*.json"))
    for old in stamps[:-keep] if keep else []:
        shutil.rmtree(AREA / "backups" / old, ignore_errors=True)
        (AREA / "journal" / f"{old}.json").unlink(missing_ok=True)
    result({"ok": True, "stamp": STAMP, "plans": [{k: v for k, v in p.items() if k != "after"} for p in journal["plans"]]})

def mode_undo():
    check_paths()
    jdir = AREA / "journal"
    pid = ARGS["id"]
    cands = []
    for jf in sorted(jdir.glob("*.json"), reverse=True) if jdir.is_dir() else []:
        j = json.loads(jf.read_text(encoding="utf-8"))
        for p in j["plans"]:
            if p["id"] == pid and not p.get("undone"):
                cands.append((jf, j, p))
    if ARGS.get("stamp"):
        cands = [c for c in cands if c[1]["stamp"] == ARGS["stamp"]]
    if not cands:
        result({"ok": False, "error": f"no push of {pid} left to undo"}); sys.exit(3)
    jf, j, p = cands[0]
    base = Path(p["path"])
    drift = [rel for rel, after in p["after"].items() if state(base / rel) != after]
    if drift and not ARGS.get("force"):
        result({"ok": False, "error": "files changed since that push; undo would lose newer work", "drift": drift[:50]})
        sys.exit(4)
    bdir = AREA / "backups" / j["stamp"] / pid
    for rel in p["added"]:
        (base / rel).unlink(missing_ok=True)
        prune_dirs((base / rel).parent, base)
    for rel in p["replaced"] + p["deleted"]:
        src = bdir / rel
        if not src.exists():
            result({"ok": False, "error": f"backup missing for {rel}; partial undo"}); sys.exit(5)
        (base / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, base / rel)
    p["undone"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    jf.write_text(json.dumps(j), encoding="utf-8")
    log_line(f"undo {j['stamp']} {pid}")
    result({"ok": True, "undid": j["stamp"], "id": pid, "removed": len(p["added"]),
            "restored": len(p["replaced"]) + len(p["deleted"])})

def mode_seed():
    check_paths()
    rules = {r["id"]: r for r in ARGS["mappings"]}
    stage = AREA / "staging" / ("seed-" + STAMP)
    added = kept = 0
    try:
        for name in extract_stream(stage):
            pid, rel = name.split("/", 1)
            r = rules[pid]
            if lane_of(rel, r) != "userdata":
                raise SystemExit(f"seed refused: {name} is not in a user-data folder")
            dst = Path(r["path"]) / rel
            if dst.exists():
                kept += 1
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            os.replace(stage / name, dst)
            added += 1
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    log_line(f"seed {STAMP} {','.join(rules)} +{added} kept {kept}")
    result({"ok": True, "added": added, "kept": kept})

def mode_collect():
    check_paths()
    rules = {r["id"]: r for r in ARGS["mappings"]}
    sent, skipped = [], []
    with tarfile.open(fileobj=sys.stdout.buffer, mode="w|gz") as tar:
        for pid, files in ARGS["files"].items():
            r = rules[pid]
            base = Path(r["path"])
            for rel, expected in files.items():
                if not safe_rel(rel) or lane_of(rel, r) not in ("userdata", "content", "shared"):
                    skipped.append(f"{pid}:{rel} (not a data lane)")
                    continue
                if state(base / rel) != expected[:2]:
                    skipped.append(f"{pid}:{rel} (changed since compare)")
                    continue
                tar.add(str(base / rel), arcname=f"{pid}/{rel}")
                sent.append(f"{pid}/{rel}")
    log_line(f"collect {STAMP} {','.join(ARGS['files'])} sent {len(sent)} skipped {len(skipped)}")
    result({"ok": True, "sent": len(sent), "skipped": skipped[:50], "skipped_count": len(skipped)})

def mode_backup():
    check_paths()
    count = 0
    with tarfile.open(fileobj=sys.stdout.buffer, mode="w|gz") as tar:
        for r in ARGS["mappings"]:
            base = Path(r["path"])
            for rel, e in scan(r, False)["files"].items():
                if e[2] in ("userdata", "shared"):
                    tar.add(str(base / rel), arcname=f"{r['id']}/{rel}")
                    count += 1
    say(f"  backed up {count} user-data file(s)")
    result({"ok": True, "files": count})

def sh(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception as e:
        return f"? {e}"

def host_stats(full):
    out = {"load": [round(x, 2) for x in os.getloadavg()] if hasattr(os, "getloadavg") else []}
    try:
        mi = {l.split(":")[0]: int(l.split()[1]) for l in open("/proc/meminfo") if l.split()[0][:-1] in ("MemTotal", "MemAvailable")}
        out["mem_used_pct"] = round(100 * (1 - mi["MemAvailable"] / mi["MemTotal"]), 1)
    except Exception:
        pass
    try:
        out["uptime_h"] = round(float(open("/proc/uptime").read().split()[0]) / 3600, 1)
    except Exception:
        pass
    du = shutil.disk_usage("/")
    out["disk_free_gb"] = round(du.free / 1e9, 1)
    out["disk_used_gb"] = round(du.used / 1e9, 1)
    if full:
        out["nginx"] = sh(["systemctl", "is-active", "nginx"])
        out["vale_services"] = sh(["bash", "-c", "systemctl list-units --type=service --no-legend 'vale@*' | awk '{print $1\":\"$4}'"]).split()
        log = AREA / "sync.log"
        out["recent"] = log.read_text(encoding="utf-8").splitlines()[-5:] if log.exists() else []
    return out

def mode_status():
    du = shutil.disk_usage("/")
    info = {"host": socket.gethostname(), "time_utc": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime()),
            "uptime": sh(["uptime", "-p"]), "reboot_required": Path("/var/run/reboot-required").exists(),
            "services": {u: sh(["systemctl", "is-active", u]) for u in ["nginx", "fail2ban", "ufw", "ssh", "certbot.timer"]},
            "root_exists": ROOT.is_dir(), "area_exists": AREA.is_dir(),
            "nginx_root": sh(["bash", "-c", "grep -hE '^\\s*root ' /etc/nginx/sites-enabled/* | head -3"]),
            "mappings": {}, **host_stats(True)}
    if ROOT.is_dir():
        for r in ARGS["mappings"]:
            if not under_root(r["path"]):
                continue
            s = scan(r, False)
            lanes = {}
            for e in s["files"].values():
                c = lanes.setdefault(e[2], [0, 0])
                c[0] += 1
                c[1] += e[0]
            info["mappings"][r["id"]] = {"exists": s["exists"], "lanes": lanes}
    result({"ok": True, "status": info})

def tree(skip):
    if not ROOT.is_dir():
        return None
    out = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        here = Path(dirpath)
        rel_dir = here.relative_to(ROOT).as_posix()
        rel_dir = "" if rel_dir == "." else rel_dir
        dirnames[:] = [d for d in sorted(dirnames) if d not in skip and not (here / d).is_symlink()]
        for d in dirnames:
            try:
                out[f"{rel_dir}/{d}" if rel_dir else d] = ["d", 0, int((here / d).stat().st_mtime)]
            except OSError:
                pass
        for f in filenames:
            try:
                st = (here / f).lstat()
                out[f"{rel_dir}/{f}" if rel_dir else f] = ["f", st.st_size, int(st.st_mtime)]
            except OSError:
                pass
    return out

def mode_watch():
    interval = float(ARGS.get("interval", 5))
    t_end = time.time() + float(ARGS.get("max_life", 6 * 3600))
    skip = set(ARGS.get("skip", []))
    def emit(o):
        sys.stdout.write("__VALE_WATCH__" + json.dumps(o, separators=(",", ":")) + "\n")
        sys.stdout.flush()
    prev, tick = None, 0
    while time.time() < t_end:
        t0 = time.time()
        cur = tree(skip)
        took = time.time() - t0
        st = host_stats(tick % 6 == 0)
        st["walk_s"] = round(took, 3)
        now = int(time.time())
        if prev is None or (cur is None) != (prev is None):
            emit({"t": "snapshot", "root": str(ROOT), "missing": cur is None, "entries": cur or {}, "stats": st, "ts": now})
        else:
            changed = {k: v for k, v in cur.items() if prev.get(k) != v}
            removed = [k for k in prev if k not in cur]
            emit({"t": "diff", "set": changed, "removed": removed, "stats": st, "ts": now} if changed or removed
                 else {"t": "beat", "stats": st, "ts": now})
        prev, tick = cur, tick + 1
        time.sleep(max(interval, took * 5))
    emit({"t": "end", "reason": "max life reached"})

NGINX_SITE = Path("/etc/nginx/sites-available/app")
NGINX_SNIP = Path("/etc/nginx/snippets/vale-site.conf")
NGINX_INCLUDE = "include /etc/nginx/snippets/vale-site.conf;"
LEGACY_LOCATIONS = ["/valevision/", "/valespec/", "/lanterndesigner/"]

def server_blocks(text):
    blocks, i = [], 0
    while True:
        m = re.compile(r"(^|\n)[ \t]*server[ \t]*\{").search(text, i)
        if not m:
            return blocks
        start, depth, j = m.start(), 0, text.index("{", m.start())
        while j < len(text):
            depth += {"{": 1, "}": -1}.get(text[j], 0)
            j += 1
            if depth == 0:
                break
        blocks.append((start, j))
        i = j

def strip_location(block, prefix):
    m = re.search(r"\n[ \t]*(#[^\n]*\n[ \t]*)?location\s+" + re.escape(prefix) + r"\s*\{", block)
    if not m:
        return block
    depth, j = 0, block.index("{", m.start())
    while j < len(block):
        depth += {"{": 1, "}": -1}.get(block[j], 0)
        j += 1
        if depth == 0:
            break
    return block[:m.start()] + block[j:]

def wire_site(text):
    if NGINX_INCLUDE in text:
        return text, False
    for start, end in server_blocks(text):
        block = text[start:end]
        if "listen 443" not in block:
            continue
        for prefix in LEGACY_LOCATIONS:
            block = strip_location(block, prefix)
        block = re.sub(r"\n[ \t]*#[^\n]*upload limit[^\n]*", "", block, flags=re.I)
        block = re.sub(r"\n[ \t]*(root|index|client_max_body_size)[ \t][^\n;]*;[^\n]*", "", block)
        m = re.search(r"\n([ \t]*)server_name[^\n]*\n", block)
        if not m:
            raise SystemExit("no server_name line in the 443 server block")
        ind = m.group(1)
        block = (block[:m.end()] + f"{ind}# Vale apps: generated by the Vale Virtual Server Manager (URL Configurator)\n"
                 f"{ind}{NGINX_INCLUDE}\n" + block[m.end():])
        block = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", block)
        return text[:start] + block + text[end:], True
    raise SystemExit("no 'listen 443' server block found in the site file")

def nginx_test_candidate(site_text, snip_text):
    import tempfile
    tmp = Path(tempfile.mkdtemp(prefix="vale-nginx-"))
    base = tmp / "nginx"
    try:
        shutil.copytree("/etc/nginx", base, symlinks=True)
        enabled = base / "sites-enabled"
        for entry in list(enabled.iterdir()):
            if entry.is_symlink():
                target = Path(os.readlink(entry))
                target = target if target.is_absolute() else (Path("/etc/nginx/sites-enabled") / target)
                content = site_text if target.resolve() == NGINX_SITE.resolve() else target.read_text(errors="ignore")
                entry.unlink()
                entry.write_text(content)
        (base / "sites-available" / "app").write_text(site_text)
        (base / "snippets").mkdir(exist_ok=True)
        (base / "snippets" / NGINX_SNIP.name).write_text(snip_text)
        for f in base.rglob("*"):
            if f.is_file() and not f.is_symlink():
                txt = f.read_text(errors="ignore")
                if "/etc/nginx/" in txt:
                    f.write_text(txt.replace("/etc/nginx/", f"{base}/"))
        r = subprocess.run(["nginx", "-t", "-c", str(base / "nginx.conf")], capture_output=True, text=True)
        return r.returncode == 0, (r.stdout + r.stderr).strip()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def http_code(host, path):
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "10",
                        "--resolve", f"{host}:443:127.0.0.1", f"https://{host}{path}"], capture_output=True, text=True)
    return r.stdout.strip() or "000"

def nginx_restore(bdir, had_snip):
    shutil.copy2(bdir / "sites-available__app", NGINX_SITE)
    if had_snip:
        shutil.copy2(bdir / "vale-site.conf", NGINX_SNIP)
    elif NGINX_SNIP.exists():
        NGINX_SNIP.unlink()
    ok = subprocess.run(["nginx", "-t"], capture_output=True).returncode == 0
    if ok:
        subprocess.run(["systemctl", "reload", "nginx"])
    return ok

def mode_nginx():
    check_paths()
    action, conf, host = ARGS["action"], ARGS["conf"], ARGS["host"]
    site_now = NGINX_SITE.read_text()
    snip_now = NGINX_SNIP.read_text() if NGINX_SNIP.exists() else ""
    site_new, rewired = wire_site(site_now)
    state_file = AREA / "nginx-applied.json"
    applied = json.loads(state_file.read_text()) if state_file.exists() else {}
    info = {"wired": NGINX_INCLUDE in site_now, "will_wire": rewired, "live_matches": snip_now == conf,
            "applied": applied}
    if action == "status":
        result({"ok": True, **info}); return
    ok, out = nginx_test_candidate(site_new, conf)
    info["test_output"] = out[-1500:]
    if not ok:
        result({"ok": False, "error": "nginx -t rejected the new configuration (nothing was changed)", **info}); sys.exit(4)
    if action == "test":
        result({"ok": True, **info}); return
    bdir = AREA / "nginx-backups" / STAMP
    bdir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(NGINX_SITE, bdir / "sites-available__app")
    had_snip = NGINX_SNIP.exists()
    if had_snip:
        shutil.copy2(NGINX_SNIP, bdir / "vale-site.conf")
    NGINX_SNIP.write_text(conf)
    os.chmod(NGINX_SNIP, 0o644)
    if rewired:
        NGINX_SITE.write_text(site_new)
    r = subprocess.run(["nginx", "-t"], capture_output=True, text=True)
    if r.returncode != 0:
        nginx_restore(bdir, had_snip)
        result({"ok": False, "error": "nginx -t failed on the live files; restored", "detail": r.stderr[-800:], **info}); sys.exit(4)
    rl = subprocess.run(["systemctl", "reload", "nginx"], capture_output=True, text=True)
    if rl.returncode != 0:
        restored = nginx_restore(bdir, had_snip)
        result({"ok": False, "error": "nginx reload failed; " + ("restored" if restored else "RESTORE FAILED"),
                "detail": rl.stderr[-800:], **info}); sys.exit(4)
    time.sleep(1.5)
    codes = {path: http_code(host, path) for path in ARGS.get("verify", ["/"])}
    problems = []
    if codes.get("/") != "200":
        problems.append(f"/ returned {codes.get('/')}")
    for path in ARGS.get("must_404", []):
        c = http_code(host, path)
        codes[path] = c
        if c != "404":
            problems.append(f"{path} returned {c}, expected 404")
    if problems:
        restored = nginx_restore(bdir, had_snip)
        result({"ok": False, "error": "verification failed: " + "; ".join(problems) + ("; restored" if restored else "; RESTORE FAILED"),
                "codes": codes, "backup": str(bdir), **info}); sys.exit(4)
    applied = {"hash": ARGS.get("hash", ""), "stamp": STAMP, "by": WHO, "codes": codes}
    state_file.write_text(json.dumps(applied))
    st = AREA.stat()
    os.chown(state_file, st.st_uid, st.st_gid)
    log_line(f"nginx apply {STAMP} hash {applied['hash']} {'(site wired) ' if rewired else ''}codes {codes}")
    result({"ok": True, "codes": codes, "backup": str(bdir), "rewired": rewired, **info})

def mode_users():
    # Reset a password or sign someone out: only that person's password / sign-out fields
    # change, in the live register, under the API's lock. Returns the register as it now is.
    check_paths()
    code, fields, action = ARGS["code"], ARGS["fields"], ARGS["action"]
    if not REGISTER or not under_root(REGISTER) or not fields or set(fields) - set(PASSWORD_KEYS + (SIGNED_OUT,)):
        result({"ok": False, "error": "refused: not a users register change"}); sys.exit(3)
    with register_lock(REGISTER):
        if not REGISTER.is_file():
            result({"ok": False, "error": "there is no users register on the server yet: push useraccounts first"}); sys.exit(3)
        doc = json.loads(REGISTER.read_text(encoding="utf-8"))
        rec = next((r for r in doc.get(RECORDS) or [] if r.get("ValeUser__UniqueCode") == code), None)
        if rec is None:
            result({"ok": False, "error": f"{code} is not on the server yet: push useraccounts first"}); sys.exit(3)
        keep = AREA / "users"
        keep.mkdir(parents=True, exist_ok=True)
        copy = keep / f"{STAMP}__{code}__{action}.json"
        shutil.copy2(REGISTER, copy)
        os.chmod(copy, 0o600)
        for old in sorted(keep.glob("*.json"))[:-int(ARGS.get("keep_backups", 30))]:
            old.unlink()
        rec.update(fields)
        note_last(rec)
        doc["UserAccountData__ValeUsers__UpdatedDate"] = ARGS["today"]
        write_register(REGISTER, doc)
        text, mtime = REGISTER.read_text(encoding="utf-8"), int(REGISTER.stat().st_mtime)
    log_line(f"users {action} {code}")
    result({"ok": True, "text": text, "mtime": mtime, "backup": str(copy)})

{"scan": mode_scan, "apply": mode_apply, "undo": mode_undo, "seed": mode_seed, "collect": mode_collect,
 "backup": mode_backup, "status": mode_status, "watch": mode_watch, "nginx": mode_nginx, "users": mode_users}[MODE]()
'''

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | One-Connection Gateway (shared lock, pacing, cooldown with vps.py)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Read and Write the Shared Gateway State
# ------------------------------------------------------------
def Na__Gateway__LoadState() -> dict:
    try:
        return json.loads(NA__GATEWAY__STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"sessions": [], "cooldown_until": 0, "cooldown_reason": ""}


def Na__Gateway__SaveState(state: dict) -> None:
    NA__GATEWAY__STATE_DIR.mkdir(parents=True, exist_ok=True)
    state["sessions"] = state.get("sessions", [])[-200:]
    tmp = NA__GATEWAY__STATE_FILE.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(state, indent=1), encoding="utf-8")
    os.replace(tmp, NA__GATEWAY__STATE_FILE)
# ---------------------------------------------------------------

# HELPER FUNCTION | Is a Key Loaded in the Windows ssh-agent (local check only)
# ------------------------------------------------------------
def Na__Gateway__AgentStatus() -> tuple:
    try:
        r = subprocess.run([NA__GATEWAY__SSH_ADD_EXE, "-l"], capture_output=True, text=True, timeout=10,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except FileNotFoundError:
        return False, "Windows OpenSSH client (ssh-add) not found"
    except subprocess.TimeoutExpired:
        return False, "ssh-add timed out talking to the agent"
    text = (r.stdout + r.stderr).strip()
    if r.returncode == 0 and text:
        return True, text.splitlines()[0]
    if r.returncode == 1:
        return False, "no key in the ssh-agent: run  ssh-add %USERPROFILE%\\.ssh\\id_ed25519  in your own terminal"
    return False, "ssh-agent service not running: (admin) sc config ssh-agent start= auto && net start ssh-agent"
# ---------------------------------------------------------------

# FUNCTION | Gateway Summary for the UI and the CLI
# ------------------------------------------------------------
def Na__Gateway__Summary() -> dict:
    state = Na__Gateway__LoadState()
    ok, msg = Na__Gateway__AgentStatus()
    now = time.time()
    log = NA__GATEWAY__LOG_FILE.read_text(encoding="utf-8").splitlines()[-15:] if NA__GATEWAY__LOG_FILE.exists() else []
    return {"agent_ok": ok, "agent_msg": msg,
            "cooldown_s": max(0, int(state.get("cooldown_until", 0) - now)),
            "cooldown_reason": state.get("cooldown_reason", ""),
            "sessions_10min": sum(1 for s in state.get("sessions", []) if now - s["t"] < NA__GATEWAY__WARN_WINDOW_S),
            "log": log}
# ---------------------------------------------------------------

# HELPER FUNCTION | Machine-Wide Session Lock (released by the OS if the process dies)
# ------------------------------------------------------------
class Na__Gateway__Lock:
    def __enter__(self):
        NA__GATEWAY__STATE_DIR.mkdir(parents=True, exist_ok=True)
        self.f = open(NA__GATEWAY__LOCK_FILE, "a+")
        deadline = time.time() + NA__GATEWAY__LOCK_WAIT_S
        while True:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.f.seek(0)
                    msvcrt.locking(self.f.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(self.f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                return self
            except OSError:
                if time.time() > deadline:
                    raise RuntimeError("another server session held the lock for 20 min")
                time.sleep(1)

    def release(self):
        if getattr(self, "f", None) is None:
            return
        try:
            if os.name == "nt":
                import msvcrt
                self.f.seek(0)
                msvcrt.locking(self.f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.f.fileno(), fcntl.LOCK_UN)
        except OSError:
            pass
        self.f.close()
        self.f = None

    def __exit__(self, *exc):
        self.release()
# ---------------------------------------------------------------

# HELPER FUNCTION | Classify an ssh Failure
# ------------------------------------------------------------
def Na__Gateway__Classify(rc: int, err: str) -> str:
    if rc != 255:
        return "ok" if rc == 0 else "remote-error"
    e = err.lower()
    if "permission denied" in e or "too many authentication failures" in e:
        return "auth"
    if "connection refused" in e:
        return "refused"
    if "timed out" in e:
        return "timeout"
    if "host key verification failed" in e or "remote host identification has changed" in e:
        return "hostkey"
    return "ssh-error"
# ---------------------------------------------------------------

# SUB HELPER FUNCTION | Guards and Bookkeeping Before a Connection
# ------------------------------------------------------------
def Na__Gateway__Begin(why: str) -> tuple:
    state = Na__Gateway__LoadState()
    left = state.get("cooldown_until", 0) - time.time()
    if left > 0:
        raise RuntimeError(f"REFUSED: cooling down {int(left)} s more ({state.get('cooldown_reason')}). "
                           "Do not retry. Wait, or unban from the OVH KVM console.")
    ok, msg = Na__Gateway__AgentStatus()
    if not ok:
        raise RuntimeError(f"REFUSED before connecting (no failed login recorded): {msg}")
    starts = [s["t"] for s in state.get("sessions", [])]
    if starts and time.time() - starts[-1] < NA__GATEWAY__MIN_GAP_S:
        time.sleep(NA__GATEWAY__MIN_GAP_S - (time.time() - starts[-1]))
    n = sum(1 for t in starts if time.time() - t < NA__GATEWAY__WARN_WINDOW_S) + 1
    t0 = time.time()
    state.setdefault("sessions", []).append({"t": t0, "why": why})
    Na__Gateway__SaveState(state)
    return n, t0
# ---------------------------------------------------------------

# SUB HELPER FUNCTION | Bookkeeping After a Connection Ends
# ------------------------------------------------------------
def Na__Gateway__End(n: int, t0: float, rc: int, err: str, why: str) -> str:
    outcome = Na__Gateway__Classify(rc, err)
    secs = time.time() - t0
    state = Na__Gateway__LoadState()
    for s in reversed(state.get("sessions", [])):
        if s.get("t") == t0:
            s.update({"rc": rc, "secs": round(secs, 1), "outcome": outcome})
            break
    if outcome in ("auth", "refused", "timeout"):
        state["cooldown_until"] = time.time() + NA__GATEWAY__COOLDOWN_S
        state["cooldown_reason"] = f"{outcome} at {time.strftime('%H:%M:%S')} ({why})"
    Na__Gateway__SaveState(state)
    with NA__GATEWAY__LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + f"#{n:<2} {outcome:<12} rc={rc:<3} {secs:6.1f}s  [manager] {why}\n")
    return outcome
# ---------------------------------------------------------------

# HELPER FUNCTION | Build the ssh Command Line
# ------------------------------------------------------------
def Na__Gateway__Argv(remote_cmd: str) -> list:
    host = os.environ.get("VALE_SSH_HOST") or Na__Config__Load()["Server"]["HostAlias"]
    if os.environ.get("VSM_FAKE_SSH"):                                         # <-- Test runs only: local fake server
        return [sys.executable, os.environ["VSM_FAKE_SSH"], host, remote_cmd]
    return [NA__GATEWAY__SSH_EXE, *NA__GATEWAY__SSH_OPTS, host, remote_cmd]
# ---------------------------------------------------------------

# HELPER FUNCTION | Echo Remote stderr Safely (stderr is None under pythonw)
# ------------------------------------------------------------
def Na__Gateway__Echo(chunk: bytes) -> None:
    try:
        sys.stderr.buffer.write(chunk)
        sys.stderr.flush()
    except (AttributeError, OSError, ValueError):
        pass
# ---------------------------------------------------------------

# FUNCTION | Run ONE ssh Session
# ------------------------------------------------------------
def Na__Gateway__Session(remote_cmd: str, why: str, stdin_writer=None, stdout_sink=None) -> dict:
    """stdin_writer(pipe) feeds the remote stdin; stdout_sink(pipe) consumes stdout.
    Returns {"rc", "outcome", "stdout" (when no sink), "stderr"}. Raises RuntimeError when a guard refuses."""
    with Na__Gateway__Lock():
        n, t0 = Na__Gateway__Begin(why)
        proc = subprocess.Popen(Na__Gateway__Argv(remote_cmd), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        err_chunks, out_chunks = [], []

        def pump_err():
            for chunk in iter(lambda: proc.stderr.read1(4096), b""):
                err_chunks.append(chunk)
                Na__Gateway__Echo(chunk)

        def feed():
            try:
                if stdin_writer:
                    stdin_writer(proc.stdin)
            except (BrokenPipeError, OSError):
                pass
            finally:
                try:
                    proc.stdin.close()
                except OSError:
                    pass

        threads = [threading.Thread(target=pump_err, daemon=True), threading.Thread(target=feed, daemon=True)]
        for t in threads:
            t.start()
        if stdout_sink:
            stdout_sink(proc.stdout)
        else:
            out_chunks.append(proc.stdout.read())
        rc = proc.wait()
        for t in threads:
            t.join(timeout=10)
        err = b"".join(err_chunks).decode("utf-8", "replace")
        outcome = Na__Gateway__End(n, t0, rc, err, why)
        return {"rc": rc, "outcome": outcome, "stderr": err, "secs": round(time.time() - t0, 1), "session_n": n,
                "stdout": b"".join(out_chunks) if not stdout_sink else None}
# ---------------------------------------------------------------

# FUNCTION | Hold ONE Long-Lived Session Open (live explorer)
# ------------------------------------------------------------
def Na__Gateway__Stream(remote_cmd: str, why: str, head: bytes, on_line, stop: threading.Event) -> str:
    """The machine-wide lock is held only until the first line arrives (the login), so
    other jobs can still run while the stream stays open. Returns the session outcome."""
    lock = Na__Gateway__Lock().__enter__()
    try:
        n, t0 = Na__Gateway__Begin(why)
        proc = subprocess.Popen(Na__Gateway__Argv(remote_cmd), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except Exception:
        lock.release()
        raise
    err_chunks = []

    def pump_err():
        for chunk in iter(lambda: proc.stderr.read1(4096), b""):
            err_chunks.append(chunk)

    def watch_stop():
        stop.wait()
        try:
            proc.terminate()
        except OSError:
            pass

    threading.Thread(target=pump_err, daemon=True).start()
    threading.Thread(target=watch_stop, daemon=True).start()
    try:
        proc.stdin.write(head)
        proc.stdin.close()
    except OSError:
        pass
    first = True
    try:
        for raw in iter(proc.stdout.readline, b""):
            if first:
                lock.release()
                first = False
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if line.startswith(NA__ENGINE__WATCH_MARKER):
                on_line(json.loads(line[len(NA__ENGINE__WATCH_MARKER):]))
    finally:
        lock.release()
        rc = proc.wait()
    err = b"".join(err_chunks).decode("utf-8", "replace")
    if stop.is_set() and rc != 255:
        rc = 0                                                                 # <-- We ended it: not a failure
    return Na__Gateway__End(n, t0, rc, err, why)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Agent Calls
# -----------------------------------------------------------------------------

# HELPER FUNCTION | The Bytes Sent Ahead of Every Job: Agent Code, Then Its Arguments
# ------------------------------------------------------------
def Na__Agent__Head(cfg: dict, args: dict) -> bytes:
    args = {"root": cfg["Server"]["Root"], "area": cfg["Server"]["SyncArea"],
            "keep_backups": cfg["Server"].get("KeepBackups", 30),
            "register": f"{NA__USERS__DIR}/{NA__USERS__FILE}", **args}             # <-- Pushes merge it; mode "users" edits it
    return base64.b64encode(NA__AGENT__SOURCE.encode("utf-8")) + b"\n" + json.dumps(args).encode("utf-8") + b"\n"
# ---------------------------------------------------------------

# HELPER FUNCTION | Parse the Agent's Result Line
# ------------------------------------------------------------
def Na__Agent__ParseResult(text: str, res: dict) -> dict:
    for line in reversed(text.splitlines()):
        if line.startswith(NA__ENGINE__RESULT_MARKER):
            return json.loads(line[len(NA__ENGINE__RESULT_MARKER):])
    tail = res["stderr"].strip().splitlines()[-3:]
    return {"ok": False, "error": f"no result from the server ({res['outcome']}, exit {res['rc']}): {' | '.join(tail)}"}
# ---------------------------------------------------------------

# FUNCTION | Run the Agent in One Session
# ------------------------------------------------------------
def Na__Agent__Run(cfg: dict, args: dict, why: str, tar_writer=None, stdout_sink=None, sudo=False) -> dict:
    head = Na__Agent__Head(cfg, args)

    def writer(pipe):
        pipe.write(head)
        if tar_writer:
            tar_writer(pipe)

    cmd = ("sudo -n " if sudo else "") + NA__ENGINE__REMOTE_BOOT
    res = Na__Gateway__Session(cmd, why, stdin_writer=writer, stdout_sink=stdout_sink)
    text = res["stderr"] if stdout_sink else (res["stdout"] or b"").decode("utf-8", "replace")
    out = Na__Agent__ParseResult(text, res)
    out["_session"] = {k: res[k] for k in ("rc", "outcome", "secs", "session_n")}
    return out
# ---------------------------------------------------------------

# HELPER FUNCTION | Stream Chosen PC Files as tar.gz Members "<id>/<rel>"
# ------------------------------------------------------------
def Na__Agent__TarWriter(entries: list):
    """entries: [(arcname, local_path, mode)]"""
    def write(pipe):
        gz = gzip.GzipFile(fileobj=pipe, mode="wb", compresslevel=3)
        with tarfile.open(fileobj=gz, mode="w|") as tar:
            for arc, path, mode in entries:
                st = path.stat()
                ti = tarfile.TarInfo(arc)
                ti.size, ti.mtime, ti.mode = st.st_size, int(st.st_mtime), mode
                with open(path, "rb") as fh:
                    tar.addfile(ti, fh)
        gz.close()
    return write
# ---------------------------------------------------------------

# HELPER FUNCTION | File Mode on the Server
# ------------------------------------------------------------
def Na__Agent__FileMode(m: dict, rel: str) -> int:
    if Na__Config__RemoteRel(m).split("/")[0] == NA__USERS__DIR:
        return 0o660                                                           # <-- Accounts: never world-readable
    return 0o755 if m.get("Kind") == "server" and rel.endswith((".sh", ".py")) else 0o644
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Parity (one rule set, used by Compare and by the live explorer)
# -----------------------------------------------------------------------------

# FUNCTION | What Should Happen to One File, Given Both Sides
# ------------------------------------------------------------
def Na__Parity__Verdict(lane: str, local, remote, deep: bool = False) -> str:
    """local/remote: [size, mtime, ...] or None. Returns one of:
    same | push | delete | server-newer | server-only | collect | pc-newer | pc-only"""
    if local and remote:
        if lane == "code":
            if deep and len(local) > 3 and len(remote) > 3:
                return "same" if local[0] == remote[0] and local[3] == remote[3] else "push"
            return "same" if local[:2] == remote[:2] else "push"
        if local[:2] == remote[:2]:
            return "same"
        if lane == "content":
            return "push" if local[1] > remote[1] else "server-newer"
        if lane == "shared":
            return "push" if local[1] > remote[1] else "collect"           # <-- two-way: newer wins (ties: server)
        return "collect" if remote[1] > local[1] else "pc-newer"
    if local:
        return "push" if lane in ("code", "content", "shared") else "pc-only"
    if remote:
        return {"code": "delete", "content": "server-only", "userdata": "collect", "shared": "collect"}[lane]
    return "same"
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Engine Operations (used by the CLI and the local UI server)
# -----------------------------------------------------------------------------

# FUNCTION | Mirror Folders With No Mapping Yet (so the UI can offer them)
# ------------------------------------------------------------
def Na__Engine__UnmappedFolders(cfg: dict) -> list:
    root = Path(cfg["Local"]["MirrorRoot"])
    mapped = set()
    for m in cfg["Mappings"]:
        try:
            mapped.add(Na__Config__LocalPath(cfg, m).resolve())
        except OSError:
            pass
    return sorted(p.name for p in root.iterdir() if p.is_dir() and p.resolve() not in mapped
                  and not p.name.startswith(".")) if root.is_dir() else []
# ---------------------------------------------------------------

# FUNCTION | PC Overview of Every Mapping (no connection)
# ------------------------------------------------------------
def Na__Engine__LocalOverview(cfg: dict) -> list:
    rows = []
    for m in cfg["Mappings"]:
        local = Na__Config__LocalPath(cfg, m)
        scan = Na__Walk__ScanLocal(local, Na__Config__Rules(cfg, m))
        lanes = {k: [0, 0] for k in NA__ENGINE__LANES}
        for e in scan["files"].values():
            lanes[e[2]][0] += 1
            lanes[e[2]][1] += e[0]
        rows.append({**m, "LocalFull": str(local), "RemoteFull": Na__Config__RemotePath(cfg, m),
                     "IsMirror": Na__Config__IsMirror(cfg, m), "LocalExists": scan["exists"], "LocalLanes": lanes})
    return rows
# ---------------------------------------------------------------

# HELPER FUNCTION | Check a Scope: One Folder Inside One Mapping ("" = the whole mapping)
# ------------------------------------------------------------
def Na__Engine__ScopeError(maps: list, scope: str) -> str:
    if not scope:
        return ""
    if len(maps) != 1:
        return "a scope needs exactly one mapping id (e.g. projects --scope ValeProjects__2026/64135__Washington)"
    parts = scope.split("/")
    if scope.startswith("/") or "\\" in scope or any(p in ("", ".", "..") for p in parts) \
            or any(c in scope for c in "'\"`$;&|<>*?:\n"):
        return f"unsafe scope {scope!r}: give a folder path relative to the mapping, with / between folders"
    if maps[0].get("FilesOnly"):
        return f"{maps[0]['Id']} syncs top-level files only, so it cannot take a folder scope"
    return ""
# ---------------------------------------------------------------

# FUNCTION | Compare PC With the Server (ONE session for all chosen mappings)
# ------------------------------------------------------------
def Na__Engine__Compare(cfg: dict, ids: list | None, deep: bool = False, scope: str = "") -> dict:
    """scope: one folder inside the single chosen mapping (e.g. ValeProjects__2026/64135__Washington).
    The plan then holds only files under it, so push and collect move nothing else. Paths stay
    relative to the mapping, so undo, the journal and the ledger work as for any push."""
    maps = Na__Config__Pick(cfg, ids)
    scope = scope.replace("\\", "/").strip().strip("/")
    error = Na__Engine__ScopeError(maps, scope)
    if error:
        return {"ok": False, "error": error}
    res = Na__Agent__Run(cfg, {"mode": "scan", "deep": deep, "mappings": [Na__Config__Rules(cfg, m) for m in maps]},
                         why=f"compare {','.join(m['Id'] for m in maps)}{' ' + scope if scope else ''}")
    if not res.get("ok"):
        return res
    plans = {}
    for m in maps:
        local = Na__Walk__ScanLocal(Na__Config__LocalPath(cfg, m), Na__Config__Rules(cfg, m), deep)
        remote = res["scans"][m["Id"]]
        lf, rf = local["files"], remote["files"]
        if scope:
            inside = lambda rel: rel.startswith(scope + "/")
            lf, rf = {r: e for r, e in lf.items() if inside(r)}, {r: e for r, e in rf.items() if inside(r)}
        lists = {v: [] for v in ("push", "delete", "server-newer", "server-only", "collect", "pc-newer", "pc-only")}
        same = {k: 0 for k in NA__ENGINE__LANES}
        lane_of = {}
        for rel in sorted(set(lf) | set(rf)):
            lane = (lf.get(rel) or rf.get(rel))[2]
            lane_of[rel] = lane
            v = Na__Parity__Verdict(lane, lf.get(rel), rf.get(rel), deep)
            if v == "same":
                same[lane] += 1
            else:
                lists[v].append(rel)
        if not m.get("AllowDeletes", True):
            lists["delete"] = []
        state = lambda d, r: (d[r][:2] if r in d else None)
        plans[m["Id"]] = {
            "id": m["Id"], "name": m["Name"], "local": str(Na__Config__LocalPath(cfg, m)),
            "remote": Na__Config__RemotePath(cfg, m), "local_exists": local["exists"], "remote_exists": remote["exists"],
            "scope": scope,
            "compared_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "same": same,
            "code_new": [r for r in lists["push"] if lane_of[r] == "code" and r not in rf],
            "code_changed": [r for r in lists["push"] if lane_of[r] == "code" and r in rf],
            "code_delete": lists["delete"],
            "content_push": [r for r in lists["push"] if lane_of[r] == "content"],
            "shared_push": [r for r in lists["push"] if lane_of[r] == "shared"],
            "shared_collect": [r for r in lists["collect"] if lane_of[r] == "shared"],
            "content_server_newer": lists["server-newer"], "content_server_only": lists["server-only"],
            "user_collect": [r for r in lists["collect"] if lane_of[r] == "userdata"],
            "user_pc_newer": lists["pc-newer"], "user_pc_only": lists["pc-only"],
            "push_bytes": sum(lf[r][0] for r in lists["push"]),
            "collect_bytes": sum(rf[r][0] for r in lists["collect"]),
            "remote_state": {r: state(rf, r) for r in set(lists["push"]) | set(lists["delete"]) | set(lists["server-newer"])
                             | set(lists["server-only"]) | set(lists["collect"]) | set(lists["pc-newer"])},
            "local_state": {r: state(lf, r) for r in set(lists["collect"]) | set(lists["pc-newer"])
                            | set(lists["server-newer"]) | set(lists["server-only"])},
        }
    return {"ok": True, "plans": plans, "_session": res["_session"]}
# ---------------------------------------------------------------

# HELPER FUNCTION | Keep Private Server__ Folders Off the Server Until nginx Hides Them
# ------------------------------------------------------------
def Na__Engine__PrivateGuard(cfg: dict, ids: list) -> str:
    record = Path(cfg["Local"]["MirrorRoot"]) / NA__ENGINE__NGINX_RECORD      # <-- Written by every nginx-apply
    if record.is_file() and NA__ENGINE__SERVER_CATCHALL in record.read_text(encoding="utf-8"):
        return ""
    maps = {m["Id"]: m for m in cfg["Mappings"]}
    for i in ids:
        top = Na__Config__RemoteRel(maps[i]).split("/")[0] if i in maps else ""
        if top.startswith("Server__") and top not in NA__ENGINE__NAMED_SERVER_DIRS:
            return (f"{i}: {top} is private, but the live nginx does not hide every Server__ folder yet. "
                    f"Apply the URL routes first (tab 03: Test, then Apply), then push again.")
    return ""
# ---------------------------------------------------------------

# FUNCTION | Push Code + Content of Compared Plans (ONE session for all of them)
# ------------------------------------------------------------
def Na__Engine__Push(cfg: dict, plans: dict, force_content: bool = False, force: bool = False,
                     allow_deletes: bool = True) -> dict:
    maps = {m["Id"]: m for m in cfg["Mappings"]}
    work, entries = [], []
    for p in plans.values():
        upload = p["code_new"] + p["code_changed"] + p["content_push"] + p["shared_push"] \
            + (p["content_server_newer"] if force_content else [])
        delete = p["code_delete"] if allow_deletes else []
        if not upload and not delete:
            continue
        guard = Na__Engine__PrivateGuard(cfg, [p["id"]])
        if guard:
            return {"ok": False, "error": guard}
        m = maps[p["id"]]
        if Na__Config__RemotePath(cfg, m) != p["remote"]:
            return {"ok": False, "error": f"{p['id']}: the server path changed since Compare; compare again"}
        base = Na__Config__LocalPath(cfg, m)
        for rel in upload:
            if not (base / rel).is_file():
                return {"ok": False, "error": f"{p['id']}: {rel} no longer exists on this PC; compare again"}
            entries.append((f"{p['id']}/{rel}", base / rel, Na__Agent__FileMode(m, rel)))
        work.append({"id": p["id"], "upload": upload, "delete": delete,
                     "expect": {r: p["remote_state"].get(r) for r in upload + delete}})
    if not work:
        return {"ok": True, "nothing": True, "plans": []}
    mb = sum((Na__Config__LocalPath(cfg, maps[w["id"]]) / r).stat().st_size for w in work for r in w["upload"]) / 1e6
    res = Na__Agent__Run(cfg, {"mode": "apply", "force": force, "plans": work,
                               "mappings": [Na__Config__Rules(cfg, maps[w["id"]]) for w in work]},
                         why=f"push {','.join(w['id'] for w in work)} ({mb:.1f} MB)",
                         tar_writer=Na__Agent__TarWriter(entries))
    if res.get("ok"):
        Na__Ledger__Record(cfg, {p["id"]: p["added"] + p["replaced"] for p in res.get("plans", [])}, "push",
                           {p["id"]: p["deleted"] for p in res.get("plans", [])})
    return res
# ---------------------------------------------------------------

# FUNCTION | Collect User Data (and optionally Content) Into the PC Mirror (ONE session)
# ------------------------------------------------------------
def Na__Engine__Collect(cfg: dict, plans: dict, with_content: bool = False, force_userdata: bool = False) -> dict:
    maps = {m["Id"]: m for m in cfg["Mappings"]}
    files, skipped_local = {}, []
    for p in plans.values():
        want = p["user_collect"] + p["shared_collect"] + (p["user_pc_newer"] if force_userdata else []) \
            + ((p["content_server_only"] + p["content_server_newer"]) if with_content else [])
        base = Na__Config__LocalPath(cfg, maps[p["id"]])
        chosen = {}
        for rel in want:
            st = (base / rel).stat() if (base / rel).is_file() else None
            now = [st.st_size, int(st.st_mtime)] if st else None
            if now != p["local_state"].get(rel):
                skipped_local.append(f"{p['id']}:{rel} (changed on this PC since compare)")
                continue
            chosen[rel] = p["remote_state"][rel]
        if chosen:
            files[p["id"]] = chosen
    if not files:
        return {"ok": True, "nothing": True, "received": 0, "skipped": skipped_local}
    stamp = time.strftime("%Y-%m-%d_%H%M%S")
    backup_root = Path(cfg["Local"]["BackupRoot"])
    stage = backup_root / "_staging" / stamp
    keep = backup_root / f"collect__{stamp}"
    stage.mkdir(parents=True, exist_ok=True)
    received = []

    def sink(pipe):
        with tarfile.open(fileobj=pipe, mode="r|gz") as tar:
            for ti in tar:
                if not ti.isfile() or ti.name.startswith("/") or ".." in ti.name.split("/"):
                    continue
                try:
                    tar.extract(ti, stage, filter="data")
                except TypeError:
                    tar.extract(ti, stage)
                received.append(ti.name)

    res = Na__Agent__Run(cfg, {"mode": "collect", "files": files,
                               "mappings": [Na__Config__Rules(cfg, maps[i]) for i in files]},
                         why=f"collect {','.join(files)} ({len(sum([list(v) for v in files.values()], []))} files)",
                         stdout_sink=sink, sudo=True)
    placed, replaced = 0, 0
    for name in received:
        pid, rel = name.split("/", 1)
        dst = Na__Config__LocalPath(cfg, maps[pid]) / rel
        if dst.exists():
            (keep / pid / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dst, keep / pid / rel)
            replaced += 1
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(stage / name), str(dst))
        placed += 1
    shutil.rmtree(stage, ignore_errors=True)
    got = {}
    for name in received:
        pid, rel = name.split("/", 1)
        got.setdefault(pid, []).append(rel)
    Na__Ledger__Record(cfg, got, "collect")
    res.update({"received": placed, "replaced_on_pc": replaced, "pc_backup": str(keep) if replaced else "",
                "skipped_local": skipped_local})
    return res
# ---------------------------------------------------------------

# FUNCTION | Undo the Last Push of One Mapping (ONE session)
# ------------------------------------------------------------
def Na__Engine__Undo(cfg: dict, mid: str, stamp: str = "", force: bool = False) -> dict:
    m = Na__Config__Pick(cfg, [mid])[0]
    return Na__Agent__Run(cfg, {"mode": "undo", "id": mid, "stamp": stamp, "force": force,
                                "mappings": [Na__Config__Rules(cfg, m)]}, why=f"undo {mid}")
# ---------------------------------------------------------------

# FUNCTION | Seed User Data: Upload PC Files the Server Lacks (ONE session)
# ------------------------------------------------------------
def Na__Engine__Seed(cfg: dict, ids: list | None) -> dict:
    maps = Na__Config__Pick(cfg, ids)
    entries = []
    for m in maps:
        base = Na__Config__LocalPath(cfg, m)
        for rel, e in Na__Walk__ScanLocal(base, Na__Config__Rules(cfg, m))["files"].items():
            if e[2] == "userdata":
                entries.append((f"{m['Id']}/{rel}", base / rel, Na__Agent__FileMode(m, rel)))
    if not entries:
        return {"ok": True, "added": 0, "kept": 0, "note": "no user data on this PC to seed"}
    guard = Na__Engine__PrivateGuard(cfg, sorted({e[0].split("/")[0] for e in entries}))
    if guard:
        return {"ok": False, "error": guard}
    return Na__Agent__Run(cfg, {"mode": "seed", "mappings": [Na__Config__Rules(cfg, m) for m in maps]},
                          why=f"seed {','.join(m['Id'] for m in maps)}", tar_writer=Na__Agent__TarWriter(entries))
# ---------------------------------------------------------------

# FUNCTION | Dated Snapshot of Server User Data on This PC (ONE session)
# ------------------------------------------------------------
def Na__Engine__Backup(cfg: dict, ids: list | None) -> dict:
    maps = Na__Config__Pick(cfg, ids)
    dest = Path(cfg["Local"]["BackupRoot"]) / time.strftime("snapshot__%Y-%m-%d_%H%M%S")
    dest.mkdir(parents=True, exist_ok=True)

    def sink(pipe):
        with tarfile.open(fileobj=pipe, mode="r|gz") as tar:
            for ti in tar:
                try:
                    tar.extract(ti, dest, filter="data")
                except TypeError:
                    tar.extract(ti, dest)

    res = Na__Agent__Run(cfg, {"mode": "backup", "mappings": [Na__Config__Rules(cfg, m) for m in maps]},
                         why=f"backup {','.join(m['Id'] for m in maps)}", stdout_sink=sink, sudo=True)
    res["dest"] = str(dest)
    if not any(dest.iterdir()):
        dest.rmdir()
    return res
# ---------------------------------------------------------------

# FUNCTION | Server Status (ONE session)
# ------------------------------------------------------------
def Na__Engine__Status(cfg: dict) -> dict:
    return Na__Agent__Run(cfg, {"mode": "status", "mappings": [Na__Config__Rules(cfg, m) for m in cfg["Mappings"]]},
                          why="status")
# ---------------------------------------------------------------

# FUNCTION | Create the Server Root and Sync Area (ONE session, sudo, once)
# ------------------------------------------------------------
def Na__Engine__PrepareRoot(cfg: dict) -> dict:
    root, area = cfg["Server"]["Root"], cfg["Server"]["SyncArea"]
    for p in (root, area):
        if not p.startswith("/srv/") or any(c in p for c in " '\"`$;&|<>*?"):
            return {"ok": False, "error": f"refusing unusual path {p!r} (must be under /srv/)"}
    cmd = (f"set -e; u=$(id -un); sudo -n install -d -o \"$u\" -g \"$u\" -m 755 {root} {area} "
           f"{area}/staging {area}/backups {area}/journal; ls -ld {root} {area}")
    res = Na__Gateway__Session(cmd, why="prepare server root")
    return {"ok": res["rc"] == 0, "output": (res["stdout"] or b"").decode("utf-8", "replace"),
            "error": res["stderr"][-400:] if res["rc"] else "",
            "_session": {k: res[k] for k in ("rc", "outcome", "secs", "session_n")}}
# ---------------------------------------------------------------

# FUNCTION | Watch the Server Tree Live (ONE held session; blocks until stop is set)
# ------------------------------------------------------------
def Na__Engine__Watch(cfg: dict, on_message, stop: threading.Event, interval: float = 5.0) -> str:
    head = Na__Agent__Head(cfg, {"mode": "watch", "interval": interval, "skip": NA__ENGINE__TREE_SKIP_DIRS})
    return Na__Gateway__Stream(NA__ENGINE__REMOTE_BOOT, "live explorer", head, on_message, stop)
# ---------------------------------------------------------------

# HELPER FUNCTION | Creation Time of a PC File (Windows keeps it; st_ctime is creation on Windows)
# ------------------------------------------------------------
def Na__Stat__Born(st) -> int:
    return int(getattr(st, "st_birthtime", st.st_ctime))
# ---------------------------------------------------------------

# FUNCTION | Sync Ledger: When Each File Last Crossed (keyed by server-root path)
# ------------------------------------------------------------
def Na__Ledger__Load() -> dict:
    try:
        return json.loads(NA__ENGINE__LEDGER_PATH.read_text(encoding="utf-8")).get("Files", {})
    except (OSError, ValueError):
        return {}

def Na__Ledger__Record(cfg: dict, files: dict, how: str, gone: dict | None = None) -> None:
    """files / gone: mapping id -> [rel, ...]. Stores {root rel: [epoch, how]}; gone entries are dropped."""
    maps = {m["Id"]: m for m in cfg["Mappings"]}
    key = lambda mid, rel: "/".join(x for x in (Na__Config__RemoteRel(maps[mid]), rel) if x)
    ledger, now = Na__Ledger__Load(), int(time.time())
    for mid, rels in files.items():
        for rel in rels if mid in maps else []:
            ledger[key(mid, rel)] = [now, how]
    for mid, rels in (gone or {}).items():
        for rel in rels if mid in maps else []:
            ledger.pop(key(mid, rel), None)
    tmp = NA__ENGINE__LEDGER_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps({"Note": "Written by push / collect: when each file last crossed.", "Files": ledger},
                              separators=(",", ":")), encoding="utf-8")
    os.replace(tmp, NA__ENGINE__LEDGER_PATH)
# ---------------------------------------------------------------

# FUNCTION | PC Tree of the Whole Mirror (for the explorer overlay)
# ------------------------------------------------------------
def Na__Engine__LocalTree(cfg: dict) -> dict:
    root = Path(cfg["Local"]["MirrorRoot"])
    out = {}
    if not root.is_dir():
        return out
    skip = set(NA__ENGINE__TREE_SKIP_DIRS)
    for dirpath, dirnames, filenames in os.walk(root):
        here = Path(dirpath)
        rel_dir = here.relative_to(root).as_posix()
        rel_dir = "" if rel_dir == "." else rel_dir
        dirnames[:] = [d for d in sorted(dirnames) if d not in skip and not (here / d).is_symlink()]
        for d in dirnames:
            try:
                st = (here / d).stat()
                out[f"{rel_dir}/{d}" if rel_dir else d] = ["d", 0, int(st.st_mtime), Na__Stat__Born(st)]
            except OSError:
                pass
        for f in filenames:
            try:
                st = (here / f).stat()
                out[f"{rel_dir}/{f}" if rel_dir else f] = ["f", st.st_size, int(st.st_mtime), Na__Stat__Born(st)]
            except OSError:
                pass
    return out
# ---------------------------------------------------------------

# FUNCTION | Load / Save the URL Routes
# ------------------------------------------------------------
def Na__Routes__Load() -> dict:
    return json.loads(NA__ENGINE__ROUTES_PATH.read_text(encoding="utf-8"))


def Na__Routes__Save(routes: dict) -> None:
    tmp = NA__ENGINE__ROUTES_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(routes, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, NA__ENGINE__ROUTES_PATH)
# ---------------------------------------------------------------

# HELPER FUNCTION | Split a Route Path Into Segments and Placeholder Names
# ------------------------------------------------------------
def Na__Routes__Parse(path: str) -> tuple:
    segs = [s for s in path.strip().strip("/").split("/") if s]
    names = [NA__ENGINE__ROUTE_VARIABLE.match(s).group(1) for s in segs if NA__ENGINE__ROUTE_VARIABLE.match(s)]
    return segs, names
# ---------------------------------------------------------------

# FUNCTION | Validate the Routes (returns a list of problems; empty = fine)
# ------------------------------------------------------------
def Na__Routes__Validate(routes: dict, cfg: dict) -> list:
    errs, seen = [], {}
    mirror = Path(cfg["Local"]["MirrorRoot"])
    for r in routes.get("Routes", []):
        rid = r.get("Id") or "?"
        segs, names = Na__Routes__Parse(r.get("Path", ""))
        if not segs:
            errs.append(f"{rid}: the path is empty")
            continue
        for s in segs:
            if not (NA__ENGINE__ROUTE_SEGMENT.match(s) or (r.get("Type") == "link" and NA__ENGINE__ROUTE_VARIABLE.match(s))):
                errs.append(f"{rid}: '{s}' - use lowercase letters, digits and hyphens" +
                            (" ({name} placeholders only in short links)" if "{" in s else ""))
        key = "/".join(NA__ENGINE__ROUTE_VARIABLE.sub("{}", s) for s in segs)
        if r.get("Enabled", True):
            if key in seen:
                errs.append(f"{rid}: same path as {seen[key]}")
            seen[key] = rid
        if r.get("Type") == "app":
            target = r.get("Target", "")
            if not re.match(r"^[A-Za-z0-9_.\-]+$", target) or target.startswith(("Server__", ".")):
                errs.append(f"{rid}: target must be an app folder at the top of the mirror")
            elif not (mirror / target).is_dir():
                errs.append(f"{rid}: {target} is not a folder in the mirror")
            if not re.match(r"^[A-Za-z0-9_.\-]+\.html?$", r.get("Entry", "index.html")):
                errs.append(f"{rid}: entry must be an .html file name")
            if r.get("Api") and not (1024 <= int(r.get("ApiPort") or 0) <= 65535):
                errs.append(f"{rid}: API port must be 1024-65535")
        elif r.get("Type") == "link":
            target = r.get("Target", "")
            if not (target.startswith("/") or target.startswith("https://")) or not NA__ENGINE__ROUTE_TARGET_SAFE.match(target):
                errs.append(f"{rid}: target must start with / or https:// and contain no spaces or quotes")
            used = re.findall(r"\{([a-z][a-z0-9_]*)\}", target)
            for u in used:
                if u not in names:
                    errs.append(f"{rid}: target uses {{{u}}} which the path does not define")
            if int(r.get("Code", 302)) not in (301, 302, 307, 308):
                errs.append(f"{rid}: redirect code must be 301, 302, 307 or 308")
        else:
            errs.append(f"{rid}: type must be app or link")
    return errs
# ---------------------------------------------------------------

# FUNCTION | Render the nginx Site Body From the Routes
# ------------------------------------------------------------
def Na__Routes__Render(routes: dict, cfg: dict) -> str:
    root = cfg["Server"]["Root"].rstrip("/")
    out = ["# " + "=" * 77,
           "# VALE APPS - NGINX SITE BODY (GENERATED - DO NOT EDIT ON THE SERVER)",
           "# " + "=" * 77,
           "# Source : WebApps/Vale__VirtualServerManager/01__AppData/VirtualServerManager__UrlRoutes__.json",
           "# Edit   : Vale Virtual Server Manager, tab 03 URL Configurator, then Apply",
           "# Lives  : /etc/nginx/snippets/vale-site.conf, included by /etc/nginx/sites-available/app",
           "# " + "=" * 77, "",
           f"root {root};", "index index.html;", "client_max_body_size 100M;",
           'add_header Cache-Control "no-cache" always;', "",
           "# ---- File types missing from nginx 1.24's mime.types (.mjs must be JavaScript or browsers refuse the module).",
           "#      A types block here replaces the inherited table, so the full table is included first.",
           "include /etc/nginx/mime.types;",
           "types { application/javascript mjs; application/manifest+json webmanifest; model/gltf-binary glb; model/gltf+json gltf; }", "",
           "# ---- Never web-served (every Server__ folder: APIs, tools, user accounts)",
           NA__ENGINE__SERVER_CATCHALL + "               { return 404; }",
           "location ~ /\\.                        { return 404; }",
           "location ~* \\.(md|py|pyc|sh|bat|ps1|env|log|bak|lock|tmp|example|code-workspace)$ { return 404; }",
           "location ~ /(?:[^/]*__)?(?:UserData|UserConfig|ServerData|Revisions)(?:__[^/]*)?/ { return 404; }", "",
           "# ---- Private files streamed by the Flask APIs (X-Accel-Redirect: /_internal/<path under the root>)",
           f"location ~ ^/_internal/(.+)$ {{ internal; alias {root}/$1; }}", ""]
    apps = [r for r in routes.get("Routes", []) if r.get("Enabled", True) and r.get("Type") == "app"]
    links = [r for r in routes.get("Routes", []) if r.get("Enabled", True) and r.get("Type") == "link"]
    if apps:
        out.append("# ---- App routes (query strings pass straight through to the app)")
    for r in apps:
        p = "/" + "/".join(Na__Routes__Parse(r["Path"])[0])
        entry = r.get("Entry") or "index.html"
        out.append(f"# {p}/  ->  {r['Target']}/{entry}" + (f"   ({r['Note']})" if r.get("Note") else ""))
        out.append(f"location = {p} {{ return 301 {p}/$is_args$args; }}")
        if r.get("Api"):
            out.append(f"location ^~ {p}/api/ {{ proxy_pass http://127.0.0.1:{int(r['ApiPort'])}/api/; include snippets/proxy-common.conf; }}")
        out.append(f"location {p}/ {{ alias {root}/{r['Target']}/; index {entry}{'' if entry == 'index.html' else ' index.html'}; }}")
        out.append("")
    if links:
        out.append("# ---- Short links (redirects: keep printed QR codes tiny)")
    for r in links:
        segs, names = Na__Routes__Parse(r["Path"])
        regex = "^/" + "/".join("([A-Za-z0-9_-]+)" if NA__ENGINE__ROUTE_VARIABLE.match(s) else re.escape(s) for s in segs) + "/?$"
        target = r["Target"]
        for i, n in enumerate(names, 1):
            target = target.replace("{" + n + "}", f"${i}")
        out.append(f"# /{'/'.join(segs)}  ->  {r['Target']}" + (f"   ({r['Note']})" if r.get("Note") else ""))
        out.append(f"location ~ {regex} {{ return {int(r.get('Code', 302))} {target}; }}")
        out.append("")
    return "\n".join(out) + "\n"
# ---------------------------------------------------------------

# FUNCTION | Test / Apply / Check the nginx Routes on the Server (ONE session, sudo)
# ------------------------------------------------------------
def Na__Engine__Nginx(cfg: dict, action: str) -> dict:
    routes = Na__Routes__Load()
    errs = Na__Routes__Validate(routes, cfg)
    if errs:
        return {"ok": False, "error": "fix the routes first: " + "; ".join(errs)}
    conf = Na__Routes__Render(routes, cfg)
    digest = hashlib.sha256(conf.encode("utf-8")).hexdigest()[:12]
    verify = ["/"] + ["/" + "/".join(Na__Routes__Parse(r["Path"])[0]) + "/"
                      for r in routes["Routes"] if r.get("Enabled", True) and r.get("Type") == "app"]
    res = Na__Agent__Run(cfg, {"mode": "nginx", "action": action, "conf": conf, "hash": digest,
                               "host": routes.get("PublicHost", "app.valegardenhouses.com"), "verify": verify,
                               "must_404": ["/Server__Api/", "/Server__DeveloperTools/", "/Server__UserAccountData/"]},
                         why=f"nginx {action} ({digest})", sudo=True)
    res["hash"] = digest
    if action == "apply" and res.get("ok"):
        routes["Applied"] = {"Hash": digest, "Utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                             "Codes": res.get("codes", {})}
        Na__Routes__Save(routes)
        record = Path(cfg["Local"]["MirrorRoot"]) / NA__ENGINE__NGINX_RECORD
        record.parent.mkdir(parents=True, exist_ok=True)
        record.write_text(conf, encoding="utf-8")
    return res
# ---------------------------------------------------------------

# CLASS | Fast Lane / Exclusion Labels for Whole Trees (memoised per folder)
# ------------------------------------------------------------
class Na__Engine__Annotator:
    """label(rel, is_dir) -> (mapping_id or "", lane or "", excluded). rel is relative to the
    server root (== mirror root). Each folder is classified once, so 20k files stay fast."""

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.memo = {}
        self.rules = {m["Id"]: Na__Config__Rules(cfg, m) for m in cfg["Mappings"]}
        self.maps = sorted(((Na__Config__RemoteRel(m), m) for m in cfg["Mappings"]), key=lambda x: -len(x[0]))

    def mapping_for(self, rel: str, is_dir: bool):
        for mr, m in self.maps:
            if mr == "":
                if "/" not in rel and not is_dir and m.get("FilesOnly"):
                    return m, 0
            elif rel == mr or rel.startswith(mr + "/"):
                return m, len(mr)
        root = [m for mr, m in self.maps if mr == "" and not m.get("FilesOnly")]
        return (root[0], 0) if root else (None, -1)

    def label(self, rel: str, is_dir: bool) -> tuple:
        key = (rel, is_dir)
        if key in self.memo:
            return self.memo[key]
        m, n = self.mapping_for(rel, is_dir)
        if m is None:
            res = ("", "", True)
        else:
            r = self.rules[m["Id"]]
            sub = rel if n == 0 else rel[n + 1:]
            if sub == "":
                res = (m["Id"], r.get("default_lane", "code"), False)
            elif r["files_only"] and ("/" in sub or is_dir):
                res = (m["Id"], r.get("default_lane", "code"), True)
            else:
                parent_sub, _, name = sub.rpartition("/")
                if parent_sub:
                    parent_rel = rel[:len(rel) - len(name) - 1]
                    _, lane_parent, parent_excluded = self.label(parent_rel, True)
                else:
                    lane_parent, parent_excluded = r.get("default_lane", "code"), False
                if parent_excluded:
                    res = (m["Id"], lane_parent, True)
                else:
                    lane = Na__Walk__DirLane(sub, name, lane_parent, r) if is_dir else lane_parent
                    ex = r["ex_code"] if lane == "code" else r["ex_data"]
                    res = (m["Id"], lane, Na__Walk__Match(sub, name, is_dir, ex))
        self.memo[key] = res
        return res
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | User Accounts (Server__UserAccountData, tab 04)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Register Path in the Mirror
# ------------------------------------------------------------
def Na__Users__Path(cfg: dict) -> Path:
    return Path(cfg["Local"]["MirrorRoot"]) / NA__USERS__DIR / NA__USERS__FILE
# ---------------------------------------------------------------

# HELPER FUNCTION | Today as DD-Mon-YYYY (Adam's date style, any locale)
# ------------------------------------------------------------
def Na__Users__Today() -> str:
    t = time.localtime()
    return f"{t.tm_mday:02d}-{NA__USERS__MONTHS[t.tm_mon - 1]}-{t.tm_year}"

def Na__Users__Now() -> str:                                                   # <-- 06-Oct-2026 15:20:07 (a forced sign-out)
    return f"{Na__Users__Today()} {time.strftime('%H:%M:%S')}"
# ---------------------------------------------------------------

# HELPER FUNCTION | Password Hash in Werkzeug's Format (the Flask APIs check it with check_password_hash)
# ------------------------------------------------------------
def Na__Users__HashPassword(password: str) -> str:
    salt = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"),
                                 NA__USERS__HASH_ITERATIONS).hex()
    return f"pbkdf2:sha256:{NA__USERS__HASH_ITERATIONS}${salt}${digest}"

def Na__Users__CheckPassword(stored: str, password: str) -> bool:
    try:
        method, salt, digest = stored.split("$", 2)
        kind, algo, rounds = method.split(":")
    except (AttributeError, ValueError):
        return False
    if kind != "pbkdf2":
        return False
    calc = hashlib.pbkdf2_hmac(algo, password.encode("utf-8"), salt.encode("utf-8"), int(rounds)).hex()
    return hmac.compare_digest(calc, digest)
# ---------------------------------------------------------------

# HELPER FUNCTION | A User's Temporary Password From the Register's Rule ({{UserFirstName}} is filled in)
# ------------------------------------------------------------
def Na__Users__TempPassword(doc: dict, user: dict) -> str:
    first = re.sub(r"[^A-Za-z0-9]", "", user.get("ValeUser__Name__First") or "")
    return str(doc.get("UserAccountData__ValeUsers__TempPasswordRule") or "").replace("{{UserFirstName}}", first)
# ---------------------------------------------------------------

# HELPER FUNCTION | Aligned JSON in Adam's Style (padded keys, short lists inline, blank line between sections)
# ------------------------------------------------------------
def Na__Json__Aligned(value, depth: int = 0) -> str:
    pad, inner = "    " * depth, "    " * (depth + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        width = max(len(json.dumps(k, ensure_ascii=False)) for k in value)
        out, prev_box = "", False
        for i, (k, v) in enumerate(value.items()):
            box = isinstance(v, (dict, list))
            if i:
                out += ",\n" + ("\n" if depth == 0 and (box or prev_box) else "")   # <-- Blank line around sections
            out += f"{inner}{json.dumps(k, ensure_ascii=False).ljust(width)} : {Na__Json__Aligned(v, depth + 1)}"
            prev_box = box
        return "{\n" + out + "\n" + pad + "}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(v, (dict, list)) for v in value):
            line = "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
            if len(inner) + len(line) <= 120:
                return line
        return "[\n" + ",\n".join(inner + Na__Json__Aligned(v, depth + 1) for v in value) + "\n" + pad + "]"
    return json.dumps(value, ensure_ascii=False)
# ---------------------------------------------------------------

# FUNCTION | Load the Register (None until it exists)
# ------------------------------------------------------------
def Na__Users__Load(cfg: dict) -> dict | None:
    path = Na__Users__Path(cfg)
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None
# ---------------------------------------------------------------

# FUNCTION | Check a Whole Register (returns a list of problems; empty = valid)
# ------------------------------------------------------------
def Na__Users__Validate(doc: dict) -> list:
    errs = []
    roles = doc.get("UserAccountData__ValeUsers__RoleOptions") or []
    depts = doc.get("UserAccountData__ValeUsers__DepartmentOptions") or []
    levels = [lv.get("PermissionLevel__Code") for lv in doc.get("UserAccountData__ValeUsers__PermissionLevels") or []
              if lv.get("PermissionLevel__HasAccount")]
    if not roles or not levels:
        errs.append("the register is missing its role options or permission levels")
    if not doc.get("UserAccountData__ValeUsers__TempPasswordRule"):
        errs.append("the register is missing its temporary password rule")
    codes, emails, admins = set(), {}, 0
    for u in doc.get(NA__USERS__RECORDS) or []:
        code = u.get("ValeUser__UniqueCode") or "?"
        who = f"{code} {u.get('ValeUser__Name__First') or ''} {u.get('ValeUser__Name__Last') or ''}".strip()
        if not NA__USERS__CODE.match(code):
            errs.append(f"{who}: the code must be USR followed by 8 digits")
        elif code in codes:
            errs.append(f"{who}: code used twice")
        codes.add(code)
        if not NA__USERS__NAME.match(u.get("ValeUser__Name__First") or ""):
            errs.append(f"{who}: first name required (letters, spaces, - and ' only)")
        last = u.get("ValeUser__Name__Last") or ""
        if last and not NA__USERS__NAME.match(last):
            errs.append(f"{who}: surname may use letters, spaces, - and ' only")
        email = (u.get("ValeUser__Email__Address") or "").lower()
        if email and not NA__USERS__EMAIL.match(email):
            errs.append(f"{who}: email address is not valid")
        elif email and email in emails:
            errs.append(f"{who}: email address also used by {emails[email]}")
        elif email:
            emails[email] = code
        if (u.get("ValeUser__Employee__Department") or "") not in depts + [""]:
            errs.append(f"{who}: department must be one of {', '.join(depts)} (or blank)")
        if u.get("ValeUser__Employee__Role") not in roles:
            errs.append(f"{who}: role must be one of {', '.join(roles)}")
        if u.get("ValeUser__Permission__Level") not in levels:
            errs.append(f"{who}: permission level must be one of {', '.join(levels)}")
        if not isinstance(u.get("ValeUser__Employee__IsActive"), bool):
            errs.append(f"{who}: active must be true or false")
        if not NA__USERS__DATE.match(u.get("ValeUser__Account__CreatedDate") or ""):
            errs.append(f"{who}: created date must look like 06-Oct-2026")
        if not str(u.get("ValeUser__Password__Hash") or "").startswith("pbkdf2:"):
            errs.append(f"{who}: no password hash")
        if u.get("ValeUser__Permission__Level") == "AppAdmin" and u.get("ValeUser__Employee__IsActive"):
            admins += 1
    if not admins:
        errs.append("at least one active AppAdmin is required")
    return errs
# ---------------------------------------------------------------

# FUNCTION | Write the Register (aligned JSON, atomic; the previous copy is kept on this PC)
# ------------------------------------------------------------
def Na__Users__Save(cfg: dict, doc: dict, text: str | None = None) -> None:
    """text: the exact file to write (the server's copy after a server action)."""
    path = Na__Users__Path(cfg)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        history = Path(cfg["Local"]["BackupRoot"]) / "UserAccounts__History"
        history.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, history / f"{time.strftime('%Y%m%d-%H%M%S')}__{path.name}")
        for old in sorted(history.glob(f"*__{path.name}"))[:-NA__USERS__HISTORY_KEEP]:
            old.unlink()
    tmp = path.with_suffix(".tmp")
    tmp.write_text(Na__Json__Aligned(doc) + "\n" if text is None else text, encoding="utf-8", newline="\n")
    os.replace(tmp, path)
# ---------------------------------------------------------------

# FUNCTION | Apply Tab 04 Edits: new codes, password hashes, validation, save
# ------------------------------------------------------------
def Na__Users__Commit(cfg: dict, posted: list) -> dict:
    """posted: user records as edited in the UI (no password fields; a new user has
    no code). Password and sign-out fields, created dates and codes are owned here,
    never taken from the browser. Resets happen on the server (Na__Users__ServerAction)."""
    previous = Na__Users__Load(cfg)
    if previous is None:
        return {"ok": False, "errors": [f"{NA__USERS__DIR}/{NA__USERS__FILE} does not exist on this PC"]}
    before = {u["ValeUser__UniqueCode"]: u for u in previous.get(NA__USERS__RECORDS) or []}
    issued = [int(c[3:]) for c in list(before) + [previous.get("UserAccountData__ValeUsers__LastIssuedCode") or ""]
              if NA__USERS__CODE.match(c)]
    last_no, today = max(issued or [0]), Na__Users__Today()
    records, hash_now, seen = [], [], set()
    for row in posted:
        code = str(row.get("ValeUser__UniqueCode") or "")
        if code and code not in before:
            return {"ok": False, "errors": [f"{code}: unknown code (codes are issued on save, never typed)"]}
        if code in seen:
            return {"ok": False, "errors": [f"{code}: listed twice"]}
        old = before.get(code, {})
        if not code:
            last_no += 1
            code = f"USR{last_no:08d}"
        seen.add(code)
        rec = {"ValeUser__UniqueCode": code}
        for k in NA__USERS__EDITABLE:
            v = row.get(k, old.get(k))
            rec[k] = v.strip() if isinstance(v, str) else v
        rec["ValeUser__Email__Address"] = (rec.get("ValeUser__Email__Address") or "").lower()
        rec["ValeUser__Account__Note"] = rec.get("ValeUser__Account__Note") or ""
        rec["ValeUser__Employee__Department"] = rec.get("ValeUser__Employee__Department") or ""
        rec["ValeUser__Account__CreatedDate"] = old.get("ValeUser__Account__CreatedDate") or today
        rec["ValeUser__Password__Hash"] = old.get("ValeUser__Password__Hash") or ""
        rec["ValeUser__Password__IsTemporary"] = bool(old.get("ValeUser__Password__IsTemporary", True))
        rec["ValeUser__Password__SetDate"] = old.get("ValeUser__Password__SetDate") or ""
        rec[NA__USERS__SIGNED_OUT] = old.get(NA__USERS__SIGNED_OUT) or ""
        renamed = bool(old) and rec["ValeUser__Password__IsTemporary"] and \
            Na__Users__TempPassword(previous, old) != Na__Users__TempPassword(previous, rec)
        rec = {k: rec[k] for k in NA__USERS__FIELD_ORDER}
        if not old or renamed:                                                 # <-- New, or the temp password follows the name
            hash_now.append(rec)
        records.append(rec)
    gone = sorted(set(before) - seen)
    if gone:
        return {"ok": False, "errors": [f"{', '.join(gone)}: users are never deleted; untick Active instead"]}
    records.sort(key=lambda r: r["ValeUser__UniqueCode"])                      # <-- The file stays in code order
    doc = {k: v for k, v in previous.items() if k != NA__USERS__RECORDS}
    doc["UserAccountData__ValeUsers__UpdatedDate"] = today
    doc["UserAccountData__ValeUsers__LastIssuedCode"] = f"USR{last_no:08d}"
    doc[NA__USERS__RECORDS] = records
    for rec in hash_now:
        rec["ValeUser__Password__Hash"] = "pbkdf2:pending"                     # <-- Validate first, hash after
    errs = Na__Users__Validate(doc)
    if errs:
        return {"ok": False, "errors": errs}
    for rec in hash_now:
        rec["ValeUser__Password__Hash"] = Na__Users__HashPassword(Na__Users__TempPassword(doc, rec))
        rec["ValeUser__Password__IsTemporary"] = True
        rec["ValeUser__Password__SetDate"] = today
    Na__Users__Save(cfg, doc)
    return {"ok": True, "added": [r["ValeUser__UniqueCode"] for r in records if r["ValeUser__UniqueCode"] not in before],
            "reset": [r["ValeUser__UniqueCode"] for r in hash_now if r["ValeUser__UniqueCode"] in before]}
# ---------------------------------------------------------------

# HELPER FUNCTION | Keep the Server's Password and Sign-Out Fields (the agent's keep_server_fields, PC side)
# ------------------------------------------------------------
def Na__Users__KeepServerFields(incoming: dict, current: dict) -> list:
    """The server owns each person's password and forced sign-out: users change their own
    password there, and resets and sign-outs are made there. Copies them from `current`
    into `incoming`, except a temporary password the PC re-made because the first name
    changed (both temporary, first names differ). Returns the codes changed."""
    now = {r.get("ValeUser__UniqueCode"): r for r in current.get(NA__USERS__RECORDS) or []}
    kept = []
    for rec in incoming.get(NA__USERS__RECORDS) or []:
        cur = now.get(rec.get("ValeUser__UniqueCode"))
        if not cur:
            continue
        changed = False
        if cur.get(NA__USERS__SIGNED_OUT) and cur.get(NA__USERS__SIGNED_OUT) != rec.get(NA__USERS__SIGNED_OUT):
            rec[NA__USERS__SIGNED_OUT] = cur[NA__USERS__SIGNED_OUT]
            changed = True
        renamed = rec.get("ValeUser__Password__IsTemporary") and cur.get("ValeUser__Password__IsTemporary") and \
            rec.get("ValeUser__Name__First") != cur.get("ValeUser__Name__First")
        if not renamed and any(rec.get(k) != cur.get(k) for k in NA__USERS__PASSWORD_KEYS):
            rec.update({k: cur.get(k) for k in NA__USERS__PASSWORD_KEYS})
            changed = True
        if changed:
            if "ValeUser__Account__Note" in rec:
                rec["ValeUser__Account__Note"] = rec.pop("ValeUser__Account__Note")   # <-- The note stays last
            kept.append(rec.get("ValeUser__UniqueCode"))
    return kept
# ---------------------------------------------------------------

# HELPER FUNCTION | Bring the Server's Register Into the PC Copy After a Server Action
# ------------------------------------------------------------
def Na__Users__TakeServerCopy(cfg: dict, text: str, mtime: int, mapping_id: str, code: str) -> str:
    """In step apart from the server's fields: the PC takes the server's file exactly, with
    its time, so Compare shows nothing to move. Unpushed PC edits: they are kept and the
    server's fields merged in, so the next push is safe. Returns "in step" or "merged"."""
    server, local = json.loads(text), Na__Users__Load(cfg)
    Na__Users__KeepServerFields(local, server)
    done = next(r for r in server.get(NA__USERS__RECORDS) or [] if r.get("ValeUser__UniqueCode") == code)
    for rec in local.get(NA__USERS__RECORDS) or []:
        if rec.get("ValeUser__UniqueCode") == code:                            # <-- The action's own change, always
            rec.update({k: done.get(k) for k in NA__USERS__PASSWORD_KEYS + (NA__USERS__SIGNED_OUT,)})
            rec["ValeUser__Account__Note"] = rec.pop("ValeUser__Account__Note", "")
    body = lambda d: {k: v for k, v in d.items() if k != "UserAccountData__ValeUsers__UpdatedDate"}
    if body(local) != body(server):
        Na__Users__Save(cfg, local)
        return "merged"
    path = Na__Users__Path(cfg)
    Na__Users__Save(cfg, server, text)                                         # <-- Byte for byte the server's file
    os.utime(path, (mtime, mtime))
    Na__Ledger__Record(cfg, {mapping_id: [NA__USERS__FILE]}, "collect")
    return "in step"
# ---------------------------------------------------------------

# FUNCTION | Reset a Password or Sign Someone Out Everywhere, on the Server Now (ONE session)
# ------------------------------------------------------------
def Na__Users__ServerAction(cfg: dict, code: str, action: str) -> dict:
    """reset: back to the temporary password; signout: the password stays. Both end every
    session the person has, on every device. Only their password / sign-out fields change,
    in the live register (under the sign-in API's lock), then the PC copy takes the same
    change: no push is needed. The hash is made here and never shown anywhere."""
    if action not in NA__USERS__ACTIONS:
        return {"ok": False, "error": f"unknown users action {action!r} (reset or signout)"}
    doc = Na__Users__Load(cfg)
    rec = next((r for r in (doc or {}).get(NA__USERS__RECORDS) or [] if r.get("ValeUser__UniqueCode") == code), None)
    if rec is None:
        return {"ok": False, "error": f"{code or 'no code'}: not in the users register on this PC"}
    mapping = next((m for m in cfg["Mappings"] if Na__Config__RemoteRel(m) == NA__USERS__DIR), None)
    if not mapping:
        return {"ok": False, "error": f"no sync mapping covers {NA__USERS__DIR}"}
    guard = Na__Engine__PrivateGuard(cfg, [mapping["Id"]])
    if guard:
        return {"ok": False, "error": guard}
    name = f"{rec.get('ValeUser__Name__First') or ''} {rec.get('ValeUser__Name__Last') or ''}".strip()
    fields = {NA__USERS__SIGNED_OUT: Na__Users__Now()}
    if action == "reset":
        fields.update({"ValeUser__Password__Hash": Na__Users__HashPassword(Na__Users__TempPassword(doc, rec)),
                       "ValeUser__Password__IsTemporary": True, "ValeUser__Password__SetDate": Na__Users__Today()})
    res = Na__Agent__Run(cfg, {"mode": "users", "action": action, "code": code, "fields": fields,
                               "today": Na__Users__Today(), "mappings": []}, why=f"user {action} {code}")
    if not res.get("ok"):
        return res
    pc = Na__Users__TakeServerCopy(cfg, res.pop("text"), res.pop("mtime"), mapping["Id"], code)
    return {"ok": True, "action": action, "code": code, "name": name, "pc": pc, "mapping": mapping["Id"],
            "signed_out": fields[NA__USERS__SIGNED_OUT], "server_backup": res.get("backup", ""),
            "temp": Na__Users__TempPassword(doc, rec) if action == "reset" else "", "_session": res["_session"]}
# ---------------------------------------------------------------

# FUNCTION | Per-App User Config Files Found for Each User
# ------------------------------------------------------------
def Na__Users__AppConfigs(cfg: dict) -> tuple:
    base = Path(cfg["Local"]["MirrorRoot"]) / NA__USERS__DIR / NA__USERS__APP_CONFIGS
    apps = sorted(d.name for d in base.iterdir() if d.is_dir()) if base.is_dir() else []
    found = {}
    for app in apps:
        for f in sorted((base / app).glob("UserConfig__USR*__*__.json")):
            m = re.match(r"^UserConfig__(USR\d{8})__", f.name)
            if m:
                found.setdefault(m.group(1), []).append(app)
    return apps, found
# ---------------------------------------------------------------

# FUNCTION | Tab 04 Payload (password hashes never leave this module)
# ------------------------------------------------------------
def Na__Users__Payload(cfg: dict) -> dict:
    doc = Na__Users__Load(cfg)
    rel = f"{NA__USERS__DIR}/{NA__USERS__FILE}"
    if doc is None:
        return {"exists": False, "rel": rel}
    users = [{k: v for k, v in u.items() if k != "ValeUser__Password__Hash"} for u in doc.get(NA__USERS__RECORDS) or []]
    temp = {u["ValeUser__UniqueCode"]: Na__Users__TempPassword(doc, u)
            for u in doc.get(NA__USERS__RECORDS) or [] if u.get("ValeUser__Password__IsTemporary")}
    apps, configs = Na__Users__AppConfigs(cfg)
    mapping = next((m for m in cfg["Mappings"] if Na__Config__RemoteRel(m) == NA__USERS__DIR), None)
    return {"exists": True, "rel": rel, "path": str(Na__Users__Path(cfg)),
            "meta": {k: v for k, v in doc.items() if k != NA__USERS__RECORDS}, "users": users, "temp": temp,
            "errors": Na__Users__Validate(doc), "apps": apps, "app_configs": configs,
            "mapping": mapping["Id"] if mapping else "", "root": cfg["Server"]["Root"],
            "guard": Na__Engine__PrivateGuard(cfg, [mapping["Id"]]) if mapping else ""}
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Command Line (used by Claude through the vgh-app-server skill)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Print a Plan Readably
# ------------------------------------------------------------
def Na__Cli__PrintPlans(plans: dict, limit: int = 12) -> None:
    rows = [("CODE    PC -> server", "+", "code_new"), ("", "~", "code_changed"), ("", "-", "code_delete"),
            ("CONTENT PC -> server", ">", "content_push"), ("", "!", "content_server_newer"),
            ("SHARED  both ways", ">", "shared_push"), ("", "<", "shared_collect"),
            ("", "?", "content_server_only"),
            ("USER    server -> PC", "<", "user_collect"), ("", "!", "user_pc_newer"), ("", "?", "user_pc_only")]
    legend = {"code_new": "new", "code_changed": "changed", "code_delete": "delete on server",
              "content_push": "to push", "content_server_newer": "server newer (skipped unless forced)",
              "shared_push": "PC newer: push", "shared_collect": "server newer: collect",
              "content_server_only": "server only", "user_collect": "to collect",
              "user_pc_newer": "PC newer (skipped unless forced)", "user_pc_only": "PC only (seedable)"}
    for p in plans.values():
        print(f"\n== {p['id']}  {p['local']}  <->  valevps:{p['remote']}"
              f"{'' if p['remote_exists'] else '   (server folder will be created)'}")
        if p.get("scope"):
            print(f"   scope: {p['scope']}/ only (nothing outside it moves)")
        print(f"   unchanged: code {p['same']['code']}, content {p['same']['content']}, user data {p['same']['userdata']}, "
              f"shared {p['same']['shared']}"
              f"   push {p['push_bytes'] / 1e6:.2f} MB, collect {p['collect_bytes'] / 1e6:.2f} MB")
        for head, tag, key in rows:
            items = p[key]
            if not items:
                continue
            print(f"   {head or '':<21}{len(items):>5} {legend[key]}")
            for r in items[:limit]:
                print(f"   {'':<21}  {tag} {r}")
            if len(items) > limit:
                print(f"   {'':<21}  {tag} ... {len(items) - limit} more")
# ---------------------------------------------------------------

# HELPER FUNCTION | Write the Machine-Readable Report (--report-file; read by other tools)
# ------------------------------------------------------------
NA__CLI__PLAN_LISTS = ("code_new", "code_changed", "code_delete", "content_push", "content_server_newer",
                       "content_server_only", "shared_push", "shared_collect", "user_collect", "user_pc_newer",
                       "user_pc_only")

def Na__Cli__WriteReport(path: str, report: dict) -> None:
    """Callers such as the SketchUp ValeVision Cloud Sync plugin read this file instead of
    parsing the printed plan. Plans keep their lists (capped at 500 each) and counts."""
    if not path:
        return
    plans = {}
    for pid, p in (report.pop("plans", None) or {}).items():
        plans[pid] = {"scope": p.get("scope", ""), "local": p["local"], "remote": p["remote"],
                      "push_bytes": p["push_bytes"], "collect_bytes": p["collect_bytes"],
                      "counts": {k: len(p[k]) for k in NA__CLI__PLAN_LISTS},
                      "files": {k: p[k][:500] for k in NA__CLI__PLAN_LISTS if p[k]}}
    report["plans"] = plans
    report["written"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, target)
# ---------------------------------------------------------------

# FUNCTION | CLI Entry Point
# ------------------------------------------------------------
def Na__Cli__Main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except AttributeError:
            pass
    ap = argparse.ArgumentParser(description="Vale Virtual Server Manager - sync engine")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("check", "mappings", "status", "prepare-root", "routes", "nginx-status", "nginx-test", "nginx-apply",
                 "users"):
        sub.add_parser(name)
    planned = []
    sp = sub.add_parser("compare"); sp.add_argument("ids", nargs="*"); sp.add_argument("--deep", action="store_true")
    planned.append(sp)
    sp = sub.add_parser("push"); sp.add_argument("ids", nargs="*"); sp.add_argument("--deep", action="store_true")
    sp.add_argument("--yes", action="store_true", help="apply (after Adam has seen the plan)")
    sp.add_argument("--allow-deletes", action="store_true", help="let the plan delete server code files")
    sp.add_argument("--force-content", action="store_true", help="also push content the server has newer")
    sp.add_argument("--force", action="store_true", help="apply even if the server changed since compare")
    planned.append(sp)
    sp = sub.add_parser("collect"); sp.add_argument("ids", nargs="*")
    sp.add_argument("--yes", action="store_true", help="apply (after Adam has seen the plan)")
    sp.add_argument("--with-content", action="store_true", help="also bring server-only / server-newer content")
    sp.add_argument("--force-userdata", action="store_true", help="also overwrite user data that is newer on this PC")
    planned.append(sp)
    for sp in planned:
        sp.add_argument("--scope", default="", help="only this folder inside the one mapping given, "
                                                    "e.g. projects --scope ValeProjects__2026/64135__Washington")
        sp.add_argument("--report-file", default="", help="also write the plan and the result as JSON here")
    for name in ("user-reset", "user-signout"):
        sp = sub.add_parser(name); sp.add_argument("code")
        sp.add_argument("--yes", action="store_true", help="do it on the server now (after Adam asked for it)")
    sp = sub.add_parser("undo"); sp.add_argument("id"); sp.add_argument("--stamp", default="")
    sp.add_argument("--force", action="store_true")
    for name in ("seed", "backup"):
        sp = sub.add_parser(name); sp.add_argument("ids", nargs="*")
    a = ap.parse_args()
    cfg = Na__Config__Load()

    try:
        if a.cmd == "check":
            g = Na__Gateway__Summary()
            print(f"ssh-agent : {'ready - ' if g['agent_ok'] else 'NOT READY - '}{g['agent_msg']}")
            print(f"cooldown  : {str(g['cooldown_s']) + ' s - ' + g['cooldown_reason'] if g['cooldown_s'] else 'none'}")
            print(f"sessions  : {g['sessions_10min']} in the last 10 min")
            print(f"server    : {cfg['Server']['HostAlias']}:{cfg['Server']['Root']}  (sync area {cfg['Server']['SyncArea']})")
            print(f"mirror    : {cfg['Local']['MirrorRoot']}")
            return 0 if g["agent_ok"] and not g["cooldown_s"] else 75
        if a.cmd == "mappings":
            for r in Na__Engine__LocalOverview(cfg):
                lanes = ", ".join(f"{k} {v[0]}" for k, v in r["LocalLanes"].items() if v[0])
                print(f"{'on ' if r.get('Enabled', True) else 'off'} {r['Id']:<18} {r['Kind']:<6} "
                      f"{'mirror' if r['IsMirror'] else 'CUSTOM PATH':<11} {r['LocalFull']}  ->  {r['RemoteFull']}"
                      f"   PC files: {lanes or 'none'}")
            return 0
        if a.cmd in ("compare", "push", "collect"):
            report = {"ok": False, "cmd": a.cmd, "ids": a.ids, "scope": a.scope, "applied": False,
                      "error": "", "result": None}
            try:
                res = Na__Engine__Compare(cfg, a.ids, getattr(a, "deep", False), a.scope)
                if not res.get("ok"):
                    report["error"] = str(res.get("error"))
                    print(f"FAILED: {res.get('error')}"); return 1
                report["plans"] = res["plans"]
                Na__Cli__PrintPlans(res["plans"])
                if a.cmd == "compare":
                    report["ok"] = True
                    return 0
                if not a.yes:
                    report["ok"] = True
                    print(f"\nReview the plan, then run again with --yes to {a.cmd}."); return 0
                if a.cmd == "push":
                    deletes = sum(len(p["code_delete"]) for p in res["plans"].values())
                    if deletes and not a.allow_deletes:
                        report["error"] = f"the plan deletes {deletes} server file(s); not pushed"
                        print(f"\nSTOPPED: the plan deletes {deletes} server file(s). Confirm with Adam, then add --allow-deletes.")
                        return 2
                    out = Na__Engine__Push(cfg, res["plans"], a.force_content, a.force, a.allow_deletes)
                else:
                    out = Na__Engine__Collect(cfg, res["plans"], a.with_content, a.force_userdata)
                report.update({"ok": bool(out.get("ok")), "applied": True,
                               "result": {k: v for k, v in out.items() if k != "_session"},
                               "error": "" if out.get("ok") else str(out.get("error") or "failed")})
                print(json.dumps(report["result"], indent=1))
                return 0 if out.get("ok") else 1
            except Exception as e:
                report["error"] = str(e) if isinstance(e, RuntimeError) else f"{type(e).__name__}: {e}"
                raise                                                          # <-- Recorded in the report, then handled as before
            finally:
                Na__Cli__WriteReport(a.report_file, report)
        if a.cmd == "routes":
            routes = Na__Routes__Load()
            errs = Na__Routes__Validate(routes, cfg)
            print("\n".join("PROBLEM: " + e for e in errs) or "routes valid")
            print(Na__Routes__Render(routes, cfg))
            return 1 if errs else 0
        if a.cmd == "users":
            res = Na__Users__Payload(cfg)
            if not res["exists"]:
                print(f"no register yet: {res['rel']}"); return 1
            print(f"{res['path']}   (mapping {res['mapping'] or 'NONE'})")
            for u in res["users"]:
                name = f"{u['ValeUser__Name__First']} {u['ValeUser__Name__Last']}".strip()
                print(f"  {u['ValeUser__UniqueCode']}  {'active  ' if u['ValeUser__Employee__IsActive'] else 'INACTIVE'}  "
                      f"{name:<22} {u.get('ValeUser__Employee__Department') or '-':<17} "
                      f"{u['ValeUser__Employee__Role']:<18} {u['ValeUser__Permission__Level']:<10} "
                      f"{'temporary password' if u.get('ValeUser__Password__IsTemporary') else 'own password'}"
                      f"{'   apps: ' + ', '.join(res['app_configs'][u['ValeUser__UniqueCode']]) if u['ValeUser__UniqueCode'] in res['app_configs'] else ''}")
            print("\n".join("PROBLEM: " + e for e in res["errors"]) or "register valid")
            if res["guard"]:
                print("NOT PUSHABLE YET: " + res["guard"])
            return 1 if res["errors"] else 0
        if a.cmd in ("user-reset", "user-signout"):
            action = a.cmd.split("-", 1)[1]
            if not a.yes:
                what = "back to the temporary password, and signed out" if action == "reset" else "signed out (password kept)"
                print(f"{a.code} would be {what} on every device, on the server now. Run again with --yes."); return 0
            out = Na__Users__ServerAction(cfg, a.code, action)
            print(json.dumps({k: v for k, v in out.items() if k != "_session"}, indent=1))
            return 0 if out.get("ok") else 1
        if a.cmd.startswith("nginx-"):
            out = Na__Engine__Nginx(cfg, a.cmd.split("-", 1)[1])
            print(json.dumps({k: v for k, v in out.items() if k != "_session"}, indent=1))
            return 0 if out.get("ok") else 1
        if a.cmd == "undo":
            out = Na__Engine__Undo(cfg, a.id, a.stamp, a.force)
        elif a.cmd == "seed":
            out = Na__Engine__Seed(cfg, a.ids)
        elif a.cmd == "backup":
            out = Na__Engine__Backup(cfg, a.ids)
        elif a.cmd == "status":
            out = Na__Engine__Status(cfg)
        else:
            out = Na__Engine__PrepareRoot(cfg)
        print(json.dumps(out, indent=1))
        return 0 if out.get("ok") else 1
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 75
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


if __name__ == "__main__":
    sys.exit(Na__Cli__Main())
