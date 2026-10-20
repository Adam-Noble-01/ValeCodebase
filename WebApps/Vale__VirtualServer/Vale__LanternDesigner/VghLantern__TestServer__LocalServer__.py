#!/usr/bin/env python3
"""
=============================================================================
 LANTERN DESIGNER - TESTING SERVER (CHECK A CHANGE HERE BEFORE IT SHIPS)
=============================================================================

FILE       : VghLantern__TestServer__LocalServer__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Run the Lantern Designer on this PC the way app.valegardenhouses.com
             runs it, on its own port and under a "Testing Server" overlay, so a
             change is checked for bugs before it is pushed to the server.
CREATED    : 20-Oct-2026

DESCRIPTION:
- Started by Start__VghLantern__TestServer__8031__.bat (beside this file), which
  opens http://localhost:8031/lantern-designer/ in the default browser. Settings
  live in 80__Testing__LocalTestServer/Na__TestServer__Config.json.
- IT IS THE 8030 DEV SERVER, WRAPPED, NOT A COPY OF IT. Server__DeveloperTools/
  ValeDev__LocalServer__.py is loaded and wrapped, so nginx's rules, the URL
  routes and every mounted Flask API are exactly the ones the 8030 server uses.
  A fix to how the live server is imitated belongs in that file, once, for every
  app. This file adds only what a test run needs:
  - THE OVERLAY. Injected into the app page as it is served (a stylesheet and a
    script from 80__Testing__LocalTestServer/, under /_testserver/). It is never
    written into index.html and that folder never syncs, so none of it can ship.
    A coloured frame round the window (amber: sandbox data; red: real data) and a
    badge that counts the problems and opens a panel listing them.
  - THE DEPLOY CHECK. A file the Server Manager would not push (its sync map:
    NeverSync, KindExcludes and the mapping's Exclude, judged by the engine's own
    Na__Walk__Classify) answers 404 here, as it would on the server, and is
    listed. "Works on the PC, 404 on the server" is found before the push.
  - THE PROBLEM LISTS. Static files that 404, and API answers of 500 and over
    (their tracebacks print in this console). The overlay adds what the browser
    saw: script errors, failed loads, rejected promises and console.error.
  - SANDBOX DATA BY DEFAULT (Adam, 20-Oct-2026: "Sandbox, real on a switch").
    VALE_ROOT points at a throwaway sandbox (outside the repo) holding generated
    test accounts, one per permission level, and copies of the 20 demo jobs.
    Sign-ins, saves and New design never touch the real mirror. --real runs on
    the real mirror instead, like 8030: your own account and the real designs,
    and a save there IS a change to the PC mirror.
  - RELOAD ON .PY CHANGE. Saving the Lantern API, Api__Shared, the shared dev
    server or this file restarts the server by itself (Werkzeug's reloader). A
    file that fails to load shows its traceback in the browser until it is fixed.
- Opens on localhost, not 127.0.0.1: cookies ignore the port, so on 127.0.0.1 a
  test sign-in here would replace the 8030 server's vale_session cookie.

USAGE:
  Start__VghLantern__TestServer__8031__.bat [--real] [--reset-sandbox]
  python VghLantern__TestServer__LocalServer__.py [--real] [--reset-sandbox]
         [--port 8031] [--no-browser] [--no-reload] [--sandbox-root PATH]
  Agents: the skill's scripts/lantern_test_server.py runs a copy on its own port
  and sandbox (note 19 of the vgh-lantern-designer-development-expert skill).
  Already running: it only opens the browser. Stop: Ctrl+C, or close its window.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
20-Oct-2026 - Version 1.0.2
- --sandbox-root PATH: another sandbox folder, so agents (the skill's
  scripts/lantern_test_server.py, a future MCP) run their own copy on their own
  port and never touch Adam's sandbox. Same guards: outside the repo and the
  mirror, and only a marked sandbox is ever deleted.

20-Oct-2026 - Version 1.0.1
- Sandbox sign-in made unmistakable: Adam typed his real (correct) password into
  the sandbox and was refused, because only the test accounts exist there. The
  banner says so, and the overlay shows a box beside the sign-in card that signs
  in as any test account in one click.

20-Oct-2026 - Version 1.0.0
- Initial build: the shared dev server wrapped with the overlay, the deploy
  check, the problem lists, the sandbox (default) and --real, reload on .py
  change, and the launcher .bat.

=============================================================================
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import traceback
import urllib.request
import webbrowser
from pathlib import Path

from werkzeug.serving import WSGIRequestHandler, is_running_from_reloader, run_simple
from werkzeug.wrappers import Request, Response

sys.dont_write_bytecode = True                                                  # <-- 25 .pyc files under Server__Api are tracked in git: never rewrite them


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__TESTSERVER__VERSION           = "1.0.2"
NA__TESTSERVER__APP_ROOT          = Path(__file__).resolve().parent             # <-- Vale__LanternDesigner
NA__TESTSERVER__ROOT              = NA__TESTSERVER__APP_ROOT.parent             # <-- Vale__VirtualServer: the mirror IS the server root
NA__TESTSERVER__MANAGER           = NA__TESTSERVER__ROOT.parent / "Vale__VirtualServerManager"
NA__TESTSERVER__DIR               = NA__TESTSERVER__APP_ROOT / "80__Testing__LocalTestServer"
NA__TESTSERVER__CONFIG            = NA__TESTSERVER__DIR / "Na__TestServer__Config.json"
NA__TESTSERVER__DEV_SERVER        = NA__TESTSERVER__ROOT / "Server__DeveloperTools" / "ValeDev__LocalServer__.py"
NA__TESTSERVER__ENGINE            = NA__TESTSERVER__MANAGER / "VirtualServerManager__SyncEngine__.py"
NA__TESTSERVER__ROUTES            = NA__TESTSERVER__MANAGER / "01__AppData" / "VirtualServerManager__UrlRoutes__.json"
NA__TESTSERVER__SYNC_MAP          = NA__TESTSERVER__MANAGER / "01__AppData" / "VirtualServerManager__SyncMap__.json"
NA__TESTSERVER__APP_CONFIG        = NA__TESTSERVER__APP_ROOT / "02__Src__AppModules" / "02__AppData" / "VghLantern__AppConfig__Main__.json"
NA__TESTSERVER__SW                = NA__TESTSERVER__APP_ROOT / "VghLantern__Pwa__ServiceWorker__.js"
NA__TESTSERVER__PREFIX            = "/_testserver/"                             # <-- Not an app route on the server, never served there
NA__TESTSERVER__ASSET_NAME        = re.compile(r"^VghLantern__TestServer__[A-Za-z0-9_]+__\.(js|css)$")
NA__TESTSERVER__OVERLAY_JS        = "VghLantern__TestServer__Overlay__.js"
NA__TESTSERVER__OVERLAY_CSS       = "VghLantern__TestServer__Styles__Overlay__.css"
NA__TESTSERVER__MARKER            = "TestServer__Sandbox__.json"                # <-- Only a folder holding this is ever deleted by --reset-sandbox
NA__TESTSERVER__REGISTER          = Path("Server__UserAccountData") / "UserAccountData__ValeUsers__Register__.json"
NA__TESTSERVER__LIBRARY           = "Vale__Projects__MasterLibrary"
NA__TESTSERVER__DESIGN_DIR        = Path("LanternDesigner") / "UserData__LanternDesign"
NA__TESTSERVER__HASH_METHOD       = "pbkdf2:sha256:600000"                      # <-- As the Server Manager and the API hash passwords
NA__TESTSERVER__MONTHS            = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
NA__TESTSERVER__GIT_EVERY_S       = 30
NA__TESTSERVER__GIT_PATHS         = (".", "../Server__Api/Api__LanternDesigner", "../Server__Api/Api__Shared",
                                     "../AppAssets__CommonApplicationAssets", "../Server__DeveloperTools")
NA__TESTSERVER__STRIP_ON_PAGE     = ("HTTP_IF_NONE_MATCH", "HTTP_IF_MODIFIED_SINCE", "HTTP_RANGE", "HTTP_IF_RANGE")

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Configuration and Small Helpers
# -----------------------------------------------------------------------------

# FUNCTION | Load the Config (JSON trumps code: a missing key stops the server, never a guessed default)
# ------------------------------------------------------------
def Na__TestServer__LoadConfig() -> dict:
    doc = json.loads(NA__TESTSERVER__CONFIG.read_text(encoding="utf-8"))
    return doc["VghLantern__TestServer__Config"]

def Na__TestServer__Require(cfg: dict, section: str, key: str):
    block = cfg.get("VghLantern__TestServer__Config__" + section)
    if not isinstance(block, dict) or key not in block:
        raise KeyError(f"{NA__TESTSERVER__CONFIG.name}: VghLantern__TestServer__Config__{section}.{key} is missing")
    return block[key]
# ---------------------------------------------------------------

# HELPER FUNCTION | Dates as the Register Writes Them (20-Oct-2026) and Times for the Lists
# ------------------------------------------------------------
def Na__TestServer__Today() -> str:
    t = time.localtime()
    return f"{t.tm_mday:02d}-{NA__TESTSERVER__MONTHS[t.tm_mon - 1]}-{t.tm_year}"

def Na__TestServer__Stamp() -> str:
    return Na__TestServer__Today() + time.strftime(" %H:%M:%S")
# ---------------------------------------------------------------

# HELPER FUNCTION | Load a Python File as a Module (the shared dev server, the sync engine)
# ------------------------------------------------------------
def Na__TestServer__LoadModule(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
# ---------------------------------------------------------------

# HELPER FUNCTION | Is a Path Inside Another (or the same folder)
# ------------------------------------------------------------
def Na__TestServer__Inside(path: Path, base: Path) -> bool:
    path, base = path.resolve(), base.resolve()
    return path == base or path.is_relative_to(base)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Sandbox (the default data: test accounts and the demo jobs)
# -----------------------------------------------------------------------------

# FUNCTION | Where the Sandbox Lives (never inside the repo or the served mirror)
# ------------------------------------------------------------
def Na__Sandbox__Root(cfg: dict, override: str | None = None) -> Path:
    raw = os.path.expandvars(override or str(Na__TestServer__Require(cfg, "Sandbox", "RootPath")))  # <-- --sandbox-root: agents' own copies
    if "%" in raw or "$" in raw:
        raise ValueError(f"Sandbox RootPath has an unknown environment variable: {raw}")
    root = Path(raw).resolve()
    repo = next((p for p in NA__TESTSERVER__APP_ROOT.parents if (p / ".git").exists()), NA__TESTSERVER__ROOT)
    if Na__TestServer__Inside(root, repo) or Na__TestServer__Inside(root, NA__TESTSERVER__ROOT):
        raise ValueError(f"Sandbox RootPath {root} is inside the repo or the mirror: it holds test passwords and "
                         "copies of designs, so it must sit outside both")                # <-- The repo is public
    return root
# ---------------------------------------------------------------

# SUB FUNCTION | Write the Generated Register (one account per level, one shared test password)
# ------------------------------------------------------------
def Na__Sandbox__WriteRegister(cfg: dict, root: Path) -> dict:
    from werkzeug.security import generate_password_hash
    domain = str(Na__TestServer__Require(cfg, "Sandbox", "AccountEmailDomain"))
    password = "Sandbox-" + secrets.token_hex(3)                                 # <-- Generated per sandbox, never in the repo
    today = Na__TestServer__Today()
    records, accounts = [], []
    for acc in Na__TestServer__Require(cfg, "Sandbox", "Accounts"):
        email = f"{acc['Email']}@{domain}"
        records.append({
            "ValeUser__UniqueCode"           : acc["Code"],
            "ValeUser__Name__First"          : acc["First"],
            "ValeUser__Name__Last"           : acc["Last"],
            "ValeUser__Email__Address"       : email,
            "ValeUser__Employee__Department" : "Testing",
            "ValeUser__Employee__Role"       : "Sandbox test account",
            "ValeUser__Permission__Level"    : acc["Level"],
            "ValeUser__Employee__IsActive"   : True,
            "ValeUser__Account__CreatedDate" : today,
            "ValeUser__Password__Hash"       : generate_password_hash(password, method=NA__TESTSERVER__HASH_METHOD),
            "ValeUser__Password__IsTemporary": False,                            # <-- No forced change: a test sign-in is one step
            "ValeUser__Password__SetDate"    : today,
            "ValeUser__Session__SignedOutDate": "",
            "ValeUser__Account__Note"        : "Lantern testing server sandbox only. Never in the real register.",
        })
        accounts.append({"Email": email, "Level": acc["Level"], "Code": acc["Code"],
                         "Name": f"{acc['First']} {acc['Last']}"})
    register = root / NA__TESTSERVER__REGISTER
    register.parent.mkdir(parents=True, exist_ok=True)
    register.write_text(json.dumps({
        "UserAccountData__ValeUsers__Note"       : "GENERATED by the Lantern testing server for its sandbox. Test accounts only.",
        "UserAccountData__ValeUsers__UpdatedDate": today,
        "UserAccountData__ValeUsers__Records"    : records,
    }, indent=4) + "\n", encoding="utf-8")
    return {"Password": password, "Accounts": accounts}
# ---------------------------------------------------------------

# SUB FUNCTION | Copy the Demo Jobs That Are Not There Yet (the sandbox keeps its own edits until a reset)
# ------------------------------------------------------------
def Na__Sandbox__CopyDemoJobs(cfg: dict, root: Path) -> list:
    library, missing = NA__TESTSERVER__ROOT / NA__TESTSERVER__LIBRARY, []
    years = sorted(p for p in library.glob("ValeProjects__*") if p.is_dir())
    for job in Na__TestServer__Require(cfg, "Sandbox", "DemoJobs"):
        src = next((y / job for y in years if (y / job).is_dir()), None)
        if src is None:
            missing.append(job)
            continue
        dst = root / NA__TESTSERVER__LIBRARY / src.parent.name / job
        if dst.exists():
            continue
        dst.mkdir(parents=True)
        for f in src.glob("ProjectData__*.json"):                                # <-- The record only: images and models come from the mirror
            shutil.copy2(f, dst / f.name)
        design = src / NA__TESTSERVER__DESIGN_DIR / f"VghLantern__ProjectFile__{job}__.json"
        if design.is_file():
            (dst / NA__TESTSERVER__DESIGN_DIR).mkdir(parents=True, exist_ok=True)
            shutil.copy2(design, dst / NA__TESTSERVER__DESIGN_DIR / design.name)
    return missing
# ---------------------------------------------------------------

# FUNCTION | Build or Reuse the Sandbox, and Point the APIs at It
# ------------------------------------------------------------
def Na__Sandbox__Prepare(cfg: dict, reset: bool, override: str | None = None) -> dict:
    root = Na__Sandbox__Root(cfg, override)
    marker = root / NA__TESTSERVER__MARKER
    if reset and root.exists():
        if not marker.is_file():
            raise RuntimeError(f"{root} has no {NA__TESTSERVER__MARKER}: it is not a sandbox, so it is not deleted")
        shutil.rmtree(root)
        print(f"[TestServer] Sandbox reset: {root}")
    if not marker.is_file():
        if root.exists() and any(root.iterdir()):
            raise RuntimeError(f"{root} is not empty and has no {NA__TESTSERVER__MARKER}: choose another RootPath")
        root.mkdir(parents=True, exist_ok=True)
        state = Na__Sandbox__WriteRegister(cfg, root)
        state.update({"Created": Na__TestServer__Stamp(), "Note": "The Lantern testing server's sandbox. Safe to delete; "
                      "--reset-sandbox rebuilds it. The password is for these test accounts only."})
        marker.write_text(json.dumps(state, indent=4) + "\n", encoding="utf-8")
        print(f"[TestServer] Sandbox built: {root}")
    state = json.loads(marker.read_text(encoding="utf-8"))
    missing = Na__Sandbox__CopyDemoJobs(cfg, root)
    if missing:
        print(f"[TestServer] WARNING demo jobs not in the mirror's library: {', '.join(missing)}")
    (root / "ActivityLedger").mkdir(exist_ok=True)
    os.environ["VALE_ROOT"] = str(root)                                          # <-- Read by Api__Shared at import: set before any API loads
    os.environ["VALE_ACTIVITY_DIR"] = str(root / "ActivityLedger")
    state["Root"] = str(root)
    return state
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Deploy Check (the Server Manager's own rules)
# -----------------------------------------------------------------------------

# CLASS | Would a Push Send This File?
# ------------------------------------------------------------
class Na__TestServer__DeployCheck:
    """Judges a file by the sync map exactly as the engine does (its Na__Walk__Classify):
    excluded, or in a user-data lane (server to PC only), means a push never sends it."""

    def __init__(self):
        self.engine = Na__TestServer__LoadModule("vghlantern_testserver_syncengine", NA__TESTSERVER__ENGINE)
        cfg = self.engine.Na__Config__Load()
        self.rules = []                                                          # <-- [(folder rel to the root, rules)], longest first
        for m in cfg["Mappings"]:
            if m.get("Kind") != "web" or not m.get("Enabled", True) or Path(m["Local"]).is_absolute():
                continue                                                         # <-- Server-kind folders are never web-served at all
            folder = str(m["Local"]).replace("\\", "/").strip("/")
            self.rules.append(("" if folder == "." else folder, self.engine.Na__Config__Rules(cfg, m)))
        self.rules.sort(key=lambda fr: -len(fr[0]))

    def Na__DeployCheck__Verdict(self, local: Path) -> str | None:
        try:
            rel_root = local.resolve().relative_to(NA__TESTSERVER__ROOT.resolve()).as_posix()
        except ValueError:
            return None
        hit = next(((f, r) for f, r in self.rules if f == "" or rel_root.startswith(f + "/")), None)
        if hit is None:
            return "its folder is in no sync mapping"
        folder, r = hit
        rel = rel_root[len(folder) + 1:] if folder else rel_root
        if folder == "" and "/" in rel:
            return "its folder is in no sync mapping"                            # <-- root-files sends top-level files only
        lane, excluded = self.engine.Na__Walk__Classify(rel, r)
        if lane == "userdata":
            return "it is in a user-data folder: those travel from the server to the PC, never the other way"
        return self.Na__DeployCheck__RuleName(rel, r, lane) if excluded else None

    def Na__DeployCheck__RuleName(self, rel: str, r: dict, lane: str) -> str:
        parts = rel.split("/")
        patterns = r["ex_code"] if lane == "code" else r["ex_data"]
        for i in range(1, len(parts) + 1):
            sub, name, is_dir = "/".join(parts[:i]), parts[i - 1], i < len(parts)
            for p in patterns:
                if self.engine.Na__Walk__Match(sub, name, is_dir, [p]):
                    return f"sync rule {p}"
        return "the sync map"
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The WSGI App: the Shared Dev Server, Wrapped
# -----------------------------------------------------------------------------

# CLASS | The Testing Server
# ------------------------------------------------------------
class Na__TestServer__App:

    def __init__(self, cfg: dict, mode: str, port: int, sandbox: dict | None):
        self.cfg, self.mode, self.port, self.sandbox = cfg, mode, port, sandbox
        self.route        = "/" + str(Na__TestServer__Require(cfg, "Server", "AppRoute")).strip("/") + "/"
        self.url          = f"http://{Na__TestServer__Require(cfg, 'Server', 'BrowserHost')}:{port}{self.route}"
        self.keep         = int(Na__TestServer__Require(cfg, "Checks", "KeepEntries"))
        self.poll_ms      = int(Na__TestServer__Require(cfg, "Checks", "StatusPollMs"))
        self.expected     = set(Na__TestServer__Require(cfg, "Checks", "ExpectedMissing"))
        self.started      = Na__TestServer__Stamp()
        self.lock         = threading.Lock()
        self.lists        = {"NotDeployed": {}, "Missing": {}, "ServerErrors": {}}
        self.git          = None
        self.dev          = Na__TestServer__LoadModule("vale_dev_localserver", NA__TESTSERVER__DEV_SERVER)
        self.inner        = self.dev.Na__Dev__Server(NA__TESTSERVER__ROUTES)    # <-- Every route and API, as on 8030
        self.deploy, self.deploy_note = None, "off in the config"
        if Na__TestServer__Require(cfg, "Checks", "DeployCheck") is True:
            try:
                self.deploy, self.deploy_note = Na__TestServer__DeployCheck(), "on: the Server Manager's sync map"
            except Exception as exc:                                             # <-- A test run without the check beats no test run
                self.deploy_note = f"off: the sync engine did not load ({exc})"
                print(f"[TestServer] WARNING deploy check {self.deploy_note}")
        if sandbox is not None:
            self.Na__TestServer__PointApiAtAppFolder()
        threading.Thread(target=self.Na__TestServer__GitLoop, daemon=True).start()

    # SUB FUNCTION | Sandbox: the Library Indexes Still Come From This Folder
    # ------------------------------------------------------------
    def Na__TestServer__PointApiAtAppFolder(self):
        """VALE_ROOT moves the whole root to the sandbox, app folder included, but the API's
        component-index, profile-index and asset-registry are app code, not data: on the server
        they are the pushed copies of exactly these files. So the API's NA__LANTERN__APP_DIR is
        pointed back at this folder (its only use is reading those three files)."""
        app = next((a for a in self.inner.apps if a["path"] + "/" == self.route), None)
        api = app["api"] if app else None
        found = False
        for view in (api.view_functions.values() if api else []):
            g = getattr(view, "__globals__", {})
            if "NA__LANTERN__APP_DIR" in g:
                g["NA__LANTERN__APP_DIR"] = NA__TESTSERVER__APP_ROOT
                found = True
                break
        if not found:
            print("[TestServer] WARNING the Lantern API's NA__LANTERN__APP_DIR was not found: "
                  "component-index, profile-index and asset-registry will 404 in the sandbox")
    # ---------------------------------------------------------------

    # SUB FUNCTION | Git Branch, Head and Uncommitted Files (in the background, every half minute)
    # ------------------------------------------------------------
    def Na__TestServer__GitLoop(self):
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        def git(*args) -> str:
            return subprocess.run(["git", *args], cwd=NA__TESTSERVER__APP_ROOT, capture_output=True, text=True,
                                  timeout=20, creationflags=flags).stdout.strip()
        while True:
            try:
                changed = [ln for ln in git("status", "--porcelain", "--", *NA__TESTSERVER__GIT_PATHS).splitlines() if ln.strip()]
                self.git = {"Branch": git("rev-parse", "--abbrev-ref", "HEAD"), "Head": git("rev-parse", "--short", "HEAD"),
                            "Uncommitted": len(changed), "Files": [ln[3:] for ln in changed[:40]]}
            except Exception:
                self.git = None
            time.sleep(NA__TESTSERVER__GIT_EVERY_S)
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Add One Entry to a Problem List (counted, newest kept)
    # ------------------------------------------------------------
    def Na__TestServer__Note(self, kind: str, path: str, detail: str) -> bool:
        key = path + "|" + detail
        with self.lock:
            entries = self.lists[kind]
            first = key not in entries
            entry = entries.pop(key, None) or {"Path": path, "Detail": detail, "Count": 0}
            entry["Count"] += 1
            entry["Last"] = time.strftime("%H:%M:%S")
            entries[key] = entry                                                 # <-- Re-inserted: the dict's order is newest last
            while len(entries) > self.keep:
                entries.pop(next(iter(entries)))
        return first
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Is This Path One of the APIs the Dev Server Mounts
    # ------------------------------------------------------------
    def Na__TestServer__IsApi(self, path: str) -> bool:
        return any(a["api"] is not None and path.startswith(a["path"] + "/api/") for a in self.inner.apps)
    # ---------------------------------------------------------------

    # HELPER FUNCTION | The PC File a Static Path Would Serve (None: no such file, or library data)
    # ------------------------------------------------------------
    def Na__TestServer__LocalFile(self, path: str) -> Path | None:
        for a in self.inner.apps:
            if path.startswith(a["path"] + "/"):
                target = self.dev.Na__Dev__Under(a["target"], path[len(a["path"]) + 1:])
                if target is not None and target.is_dir():
                    target = target / a["entry"]
                return target if target is not None and target.is_file() else None
        if path.startswith("/" + NA__TESTSERVER__LIBRARY + "/"):
            return None                                                          # <-- Library content: data, judged by its own lanes on a collect
        target = self.dev.Na__Dev__Under(NA__TESTSERVER__ROOT, path)
        return target if target is not None and target.is_file() else None
    # ---------------------------------------------------------------

    # FUNCTION | Every Request
    # ------------------------------------------------------------
    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO") or "/"
        method = environ.get("REQUEST_METHOD", "GET")
        if path.startswith(NA__TESTSERVER__PREFIX):
            return self.Na__TestServer__Own(Request(environ), path)(environ, start_response)
        is_api = self.Na__TestServer__IsApi(path)
        if not is_api and method in ("GET", "HEAD") and self.deploy is not None:
            local = self.Na__TestServer__LocalFile(path)                         # <-- PATH_INFO as the dev server takes it
            why = self.deploy.Na__DeployCheck__Verdict(local) if local is not None else None
            if why:
                if self.Na__TestServer__Note("NotDeployed", path, why):
                    print(f"[TestServer] NOT DEPLOYED  {path}  ({why}): 404 here, as on the server", flush=True)
                return Response(f"Not Found on the server: a push would not send this file ({why}).\n",
                                404, mimetype="text/plain")(environ, start_response)
        if method == "GET" and path in (self.route, self.route + "index.html"):
            return self.Na__TestServer__Page(environ)(environ, start_response)

        def capture(status, headers, exc_info=None):
            code = int(status.split(" ", 1)[0])
            if is_api and code >= 500:
                if self.Na__TestServer__Note("ServerErrors", path, f"{method} answered {status}"):
                    print(f"[TestServer] API ERROR  {method} {path}  {status} (traceback above)", flush=True)
            elif not is_api and code == 404 and path not in self.expected:
                if any(p.search(path) for p in self.dev.NA__DEV__DENY):          # <-- .md, .py, Server__, UserData ...: nginx's deny rules
                    self.Na__TestServer__Note("NotDeployed", path, "nginx never serves this kind of path (its deny rules)")
                else:
                    self.Na__TestServer__Note("Missing", path, "404 Not Found")
            return start_response(status, headers, exc_info)
        return self.inner(environ, capture)
    # ---------------------------------------------------------------

    # SUB FUNCTION | The App Page, With the Overlay Injected (index.html itself is never changed)
    # ------------------------------------------------------------
    def Na__TestServer__Page(self, environ) -> Response:
        env = {k: v for k, v in environ.items() if k not in NA__TESTSERVER__STRIP_ON_PAGE}  # <-- Always a whole 200 to inject into
        resp = Response.from_app(self.inner, env, buffered=True)
        if resp.status_code != 200 or resp.mimetype != "text/html":
            return resp
        tags = ("\n    <!-- TESTING SERVER: injected by VghLantern__TestServer__LocalServer__.py as it serves the page. "
                "Not in index.html, never on the server. -->\n"
                f'    <link rel="stylesheet" href="{NA__TESTSERVER__PREFIX}{NA__TESTSERVER__OVERLAY_CSS}">\n'
                f'    <script src="{NA__TESTSERVER__PREFIX}{NA__TESTSERVER__OVERLAY_JS}" data-mode="{self.mode}"'
                f' data-status-url="{NA__TESTSERVER__PREFIX}api/status" data-clear-url="{NA__TESTSERVER__PREFIX}api/clear"'
                f' data-poll-ms="{self.poll_ms}" data-keep="{self.keep}"></script>\n')
        html = resp.get_data(as_text=True)
        head = re.search(r"<head[^>]*>", html, re.I)                             # <-- First in <head>: it sees the app's first error
        html = html[:head.end()] + tags + html[head.end():] if head else tags + html
        resp.set_data(html)
        for h in ("ETag", "Last-Modified", "Accept-Ranges", "Content-Range"):
            resp.headers.pop(h, None)
        resp.headers["Cache-Control"] = "no-store"
        return resp
    # ---------------------------------------------------------------

    # SUB FUNCTION | /_testserver/: the Overlay's Files and the Status API
    # ------------------------------------------------------------
    def Na__TestServer__Own(self, req: Request, path: str) -> Response:
        name = path[len(NA__TESTSERVER__PREFIX):]
        if name == "api/status" and req.method == "GET":
            resp = Response(json.dumps(self.Na__TestServer__Status()), 200, mimetype="application/json")
            resp.headers["Cache-Control"] = "no-store"
            return resp
        if name == "api/clear" and req.method == "POST":
            with self.lock:
                for entries in self.lists.values():
                    entries.clear()
            return Response('{"ok": true}', 200, mimetype="application/json")
        if NA__TESTSERVER__ASSET_NAME.match(name) and (NA__TESTSERVER__DIR / name).is_file():
            resp = Response((NA__TESTSERVER__DIR / name).read_bytes(), 200,
                            mimetype="text/javascript" if name.endswith(".js") else "text/css")
            resp.headers["Cache-Control"] = "no-cache"
            return resp
        return Response("Not Found", 404, mimetype="text/plain")
    # ---------------------------------------------------------------

    # SUB FUNCTION | What the Overlay Shows
    # ------------------------------------------------------------
    def Na__TestServer__Status(self) -> dict:
        try:
            app_cfg = json.loads(NA__TESTSERVER__APP_CONFIG.read_text(encoding="utf-8"))
            version = app_cfg["VghLantern__Application__Config"]["VghLantern__Application__Config__AppVersion"]
        except Exception as exc:
            version = f"unreadable ({exc.__class__.__name__})"
        try:
            sw = re.search(r"VGHLANTERN_SW_VERSION\s*=\s*'([^']*)'", NA__TESTSERVER__SW.read_text(encoding="utf-8")).group(1)
        except Exception:
            sw = "unreadable"
        with self.lock:
            lists = {k: list(reversed(list(v.values()))) for k, v in self.lists.items()}   # <-- Newest first
        sandbox = None
        if self.sandbox is not None:
            sandbox = {"Root": self.sandbox["Root"], "Password": self.sandbox["Password"],
                       "Accounts": self.sandbox["Accounts"], "Created": self.sandbox.get("Created", "")}
        return {"Server": {"Mode": self.mode, "Port": self.port, "Url": self.url, "Started": self.started,
                           "Version": NA__TESTSERVER__VERSION, "DeployCheck": self.deploy_note,
                           "DataRoot": os.environ.get("VALE_ROOT", "")},
                "App": {"Version": version, "ServiceWorker": sw},
                "Git": self.git, "Sandbox": sandbox, **lists}
    # ---------------------------------------------------------------

# ---------------------------------------------------------------

# CLASS | What Serves When the App Cannot Load (a broken .py): the traceback, until the fix reloads it
# ------------------------------------------------------------
class Na__TestServer__BrokenApp:
    def __init__(self, tb: str):
        self.tb = tb

    def __call__(self, environ, start_response):
        text = ("<!DOCTYPE html><meta charset='utf-8'><title>Testing server: load error</title>"
                "<body style='font-family:Consolas,monospace;margin:24px;color:#172b3a'>"
                "<h2>The Lantern testing server could not load</h2>"
                "<p>Fix the file named below and save it: the server restarts by itself. Then reload this page.</p><pre>"
                + self.tb.replace("&", "&amp;").replace("<", "&lt;") + "</pre></body>")
        return Response(text, 500, mimetype="text/html")(environ, start_response)
# ---------------------------------------------------------------

# CLASS | Quiet Request Log: the Overlay's Status Polls Are Not Printed
# ------------------------------------------------------------
class Na__TestServer__RequestHandler(WSGIRequestHandler):
    def log_request(self, code="-", size="-"):
        if self.path.startswith(NA__TESTSERVER__PREFIX + "api/"):
            return
        super().log_request(code, size)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Is a Testing Server Already on This Port? (its status, "other" for another program, None if free)
# ------------------------------------------------------------
def Na__TestServer__Probe(port: int):
    try:
        socket.create_connection(("127.0.0.1", port), timeout=1).close()
    except OSError:
        return None
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{NA__TESTSERVER__PREFIX}api/status", timeout=4) as r:
            data = json.loads(r.read().decode("utf-8"))
        return data if isinstance(data.get("Server"), dict) else "other"
    except Exception:
        return "other"
# ---------------------------------------------------------------

# HELPER FUNCTION | Open the Browser Once the Port Listens
# ------------------------------------------------------------
def Na__TestServer__OpenBrowserWhenUp(url: str, port: int) -> None:
    def run():
        for _ in range(150):
            try:
                socket.create_connection(("127.0.0.1", port), timeout=0.5).close()
                break
            except OSError:
                time.sleep(0.2)
        webbrowser.open(url)
    threading.Thread(target=run, daemon=True).start()
# ---------------------------------------------------------------

# HELPER FUNCTION | Files Whose Change Restarts the Server (besides every imported module)
# ------------------------------------------------------------
def Na__TestServer__WatchFiles() -> list:
    files = [p for p in (NA__TESTSERVER__ROOT / "Server__Api").rglob("*.py") if "__pycache__" not in p.parts]
    return [str(p) for p in files + [NA__TESTSERVER__DEV_SERVER, NA__TESTSERVER__ENGINE, NA__TESTSERVER__CONFIG,
                                     NA__TESTSERVER__ROUTES, NA__TESTSERVER__SYNC_MAP] if p.is_file()]
# ---------------------------------------------------------------

# HELPER FUNCTION | The Start Banner
# ------------------------------------------------------------
def Na__TestServer__Banner(url: str, mode: str, sandbox: dict | None, reload: bool) -> None:
    print("=" * 77)
    print(" LANTERN DESIGNER - TESTING SERVER")
    print("=" * 77)
    print(f"  Open    : {url}")
    if sandbox is not None:
        print(f"  Data    : SANDBOX  {sandbox['Root']}")
        print("            The real mirror is never written. Real data: start with --real")
        print("  Sign in : with a TEST account. Your own Vale account is NOT in the sandbox: its password is")
        print("            refused here however correct (use --real for it). The overlay signs in for you.")
        print(f"            password {sandbox['Password']}")
        for acc in sandbox["Accounts"]:
            print(f"            {acc['Email']:<28} {acc['Level']}")
    else:
        print(f"  Data    : REAL MIRROR  {NA__TESTSERVER__ROOT}")
        print("            Your own account and the real designs. A save, or New design, changes the PC mirror.")
    print(f"  Reload  : {'on: saving a .py file restarts the server' if reload else 'off (--no-reload)'}")
    print("  Stop    : Ctrl+C, or close this window")
    print("=" * 77, flush=True)
# ---------------------------------------------------------------

def Na__TestServer__Main() -> int:
    ap = argparse.ArgumentParser(description="Lantern Designer testing server: the live server, on this PC")
    ap.add_argument("--real", action="store_true", help="the real mirror's data (your own account) instead of the sandbox")
    ap.add_argument("--reset-sandbox", action="store_true", help="delete and rebuild the sandbox first")
    ap.add_argument("--port", type=int, default=None, help="default: Port in the config")
    ap.add_argument("--no-browser", action="store_true", help="do not open the browser")
    ap.add_argument("--no-reload", action="store_true", help="do not restart when a .py file changes")
    ap.add_argument("--sandbox-root", default=None, help="another sandbox folder (agents: never Adam's); default: RootPath in the config")
    a = ap.parse_args()

    child = is_running_from_reloader()                                          # <-- The reloader's worker: the parent did the checks
    try:
        cfg = Na__TestServer__LoadConfig()
        port = a.port or int(Na__TestServer__Require(cfg, "Server", "Port"))
        bind = str(Na__TestServer__Require(cfg, "Server", "BindHost"))
        route = "/" + str(Na__TestServer__Require(cfg, "Server", "AppRoute")).strip("/") + "/"
        url = f"http://{Na__TestServer__Require(cfg, 'Server', 'BrowserHost')}:{port}{route}"
        reload = (Na__TestServer__Require(cfg, "Server", "ReloadOnPythonChange") is True) and not a.no_reload
        mode = "real" if a.real else "sandbox"

        if not child:
            running = Na__TestServer__Probe(port)
            if isinstance(running, dict):
                was = running["Server"].get("Mode")
                print(f"The Lantern testing server is already running ({was} data) at {url}")
                if not a.no_browser:
                    webbrowser.open(url)                                         # <-- Never a second copy: the running one is shown
                if was != mode:
                    print(f"You asked for {mode} data: close the running server's window (or Ctrl+C there) and start again.")
                    return 2
                return 0
            if running == "other":
                print(f"Port {port} is already in use by another program (or a server still starting). "
                      f"Close it, or start with --port <another port>.")
                return 1

        sandbox = None if a.real else Na__Sandbox__Prepare(cfg, reset=a.reset_sandbox and not child, override=a.sandbox_root)
        os.environ.setdefault("VALE_ROOT", str(NA__TESTSERVER__ROOT))
        if not os.environ.get("VALE_SECRET_KEY"):
            os.environ["VALE_DEV"] = "1"                                         # <-- As the 8030 server: the fixed development key
    except Exception as exc:
        print(f"[TestServer] Could not start: {exc}")
        return 1

    if not child:
        Na__TestServer__Banner(url, mode, sandbox, reload)
        if not a.no_browser:
            Na__TestServer__OpenBrowserWhenUp(url, port)

    if reload and not child:
        app = Na__TestServer__BrokenApp("(the reloader's parent process never serves)")  # <-- Only the worker builds the real app
    else:
        try:
            app = Na__TestServer__App(cfg, mode, port, sandbox)
            print(f"[TestServer] Ready: {url}  ({mode} data, deploy check {app.deploy_note})", flush=True)
        except Exception:
            tb = traceback.format_exc()
            print(tb, flush=True)
            if not reload:
                return 1
            app = Na__TestServer__BrokenApp(tb)                                  # <-- Keeps serving the error; the fix reloads it

    try:
        run_simple(bind, port, app, threaded=True, use_reloader=reload, reloader_type="stat",
                   extra_files=Na__TestServer__WatchFiles() if reload else None,
                   request_handler=Na__TestServer__RequestHandler)
    except OSError as exc:
        print(f"[TestServer] Could not listen on {bind}:{port}: {exc}")
        return 1
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(Na__TestServer__Main())

# endregion ----------------------------------------------------
