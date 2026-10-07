#!/usr/bin/env python3
"""
=============================================================================
 VALE VIRTUAL SERVER MANAGER - LOCAL SERVER
=============================================================================

FILE       : VirtualServerManager__LocalServer__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Serve the manager PWA on http://127.0.0.1:8020 and expose the sync
             engine and the live server explorer as a small JSON API. PC only.
CREATED    : 06-Oct-2026

DESCRIPTION:
- Binds 127.0.0.1 only. Rejects any Host header other than 127.0.0.1/localhost,
  and every POST must carry X-Vale-Manager: 1 with a JSON body, so a web page in
  another tab cannot trigger a push.
- One engine job at a time; the engine's gateway lock also queues behind Claude.
- Push / Collect apply exactly the plan the user last compared (held 30 minutes).
- Live explorer: while the Explorer tab is open, ONE long-lived ssh session
  streams the server tree; the PC mirror is rescanned every 10 s; every path is
  labelled with its mapping, lane and parity verdict. When nobody is watching for
  90 s the session is closed. Unexpected drops back off (15 s .. 5 min); failed
  logins stop it until the shared cooldown ends.
- --silent --log-file: for the Windows start-up launcher (pythonw, no console).
- --stop: stop the copy running on the port and exit.
- -r / --r / --restart: stop the copy already running on the port (asks it to shut
  down; an older copy without that endpoint is ended by PID), wait for the port,
  then start. Refuses while a push / collect / users save is running.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
07-Oct-2026 - Version 0.9.0
- Version only: the engine writes the deploy stamp after every source push (engine 0.9.0).

07-Oct-2026 - Version 0.8.0
- Plans carry content_collect (ServerMadeContent: content made on the server, such as
  ValeVision Theia's videos), counted and listed like the other lists. The live explorer
  labels those files collect.

07-Oct-2026 - Version 0.7.0
- Job delete (POST /api/op/delete {files: {mapping id: {root-relative path: [size, mtime]}},
  pc}): the explorer's Delete from server. Clears that mapping's compared plan.

06-Oct-2026 - Version 0.5.0
- Jobs user-reset / user-signout (POST /api/op/user-reset {code}): tab 04's Reset
  and Sign out act on the live server at once. POST /api/users no longer takes
  "resets".

06-Oct-2026 - Version 0.4.3
- Version bump only (content-sized layout, one sort system: page side).

06-Oct-2026 - Version 0.4.2
- Department field for users (engine and tab 04).

06-Oct-2026 - Version 0.4.1
- Tab 04 column sorting (page only); the register is always saved in code order.

06-Oct-2026 - Version 0.4.0
- User accounts API for tab 04 (GET/POST /api/users); password hashes never reach
  the browser.
- --restart (-r, --r) and POST /api/shutdown: pick up code changes without hunting
  for the old process.

06-Oct-2026 - Version 0.3.1
- URL routes API, nginx jobs, shared lane lists; version reported to the page.
- Exclusive port bind: a second copy can no longer start on 8020 and split requests.

06-Oct-2026 - Version 0.2.0
- Lanes (push / collect), live explorer, PWA files, silent start-up mode.

06-Oct-2026 - Version 0.1.0
- Initial build.

=============================================================================
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import socket
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

NA__SERVER__APP_ROOT_PATH         = Path(__file__).resolve().parent
NA__SERVER__VERSION               = "0.9.0"                                 # <-- Keep equal to Vsm.PageVersion in Ui__Core__.js
NA__SERVER__DEFAULT_PORT          = 8020
NA__SERVER__ENTRY_FILE            = "VirtualServerManager__App__.html"
NA__SERVER__ROOT_FILES            = (NA__SERVER__ENTRY_FILE,                   # <-- Served from the app root
                                     "VirtualServerManager__Pwa__Manifest__.webmanifest",
                                     "VirtualServerManager__Pwa__ServiceWorker__.js")
NA__SERVER__STATIC_DIRS           = ("01__AppAssets", "02__Src__AppModules", "03__Style__AppStylesheets")
NA__SERVER__MIME                  = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                                     ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
                                     ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"}
NA__SERVER__PLAN_TTL_S            = 30 * 60                                    # <-- A compared plan expires after 30 min
NA__SERVER__UI_LIST_LIMIT         = 400                                        # <-- Files listed per category in the UI
NA__SERVER__LIVE_IDLE_S           = 90                                         # <-- Close the live session after this
NA__SERVER__LOCAL_RESCAN_S        = 10                                         # <-- PC mirror rescan interval (explorer)
NA__SERVER__LIVE_BACKOFF_S        = [15, 30, 60, 120, 300]                     # <-- Waits after unexpected drops

_spec = importlib.util.spec_from_file_location("Na__SyncEngine", NA__SERVER__APP_ROOT_PATH / "VirtualServerManager__SyncEngine__.py")
Na__Engine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(Na__Engine)

NA__SERVER__OP_LOCK               = threading.Lock()
NA__SERVER__USERS_LOCK            = threading.Lock()                           # <-- One register save at a time
NA__SERVER__BUSY                  = {"label": "", "since": 0.0}
NA__SERVER__PLANS                 = {}                                         # <-- id -> (time, plan) from the last Compare
NA__SERVER__RESULTS               = []                                         # <-- Recent job results for the activity panel
NA__SERVER__LAST_ACTION           = {}                                         # <-- id -> last push / collect / undo summary
NA__SERVER__QUIET                 = False
NA__SERVER__HTTPD                 = None                                       # <-- Set in Main; /api/shutdown stops it

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Live Explorer (one held session + PC rescans + labels)
# -----------------------------------------------------------------------------

class Na__Live:
    lock           = threading.Lock()
    want_until     = 0.0                                                       # <-- Kept alive by the Explorer tab
    status         = "off"                                                     # <-- off | connecting | live | retrying | blocked
    detail         = ""
    since          = 0.0
    last_msg       = 0.0
    stats          = {}
    server         = {}                                                        # <-- rel -> [type, size, mtime]
    server_missing = False
    server_ver     = 0
    local          = {}
    local_ver      = 0
    local_at       = 0.0
    cache_key      = None
    cache_nodes    = []
    ledger         = {}
    ledger_mtime   = None
    annotator      = None
    annotator_cfg  = None
    stop           = None

    # FUNCTION | Keep the Live Session Wanted
    # ------------------------------------------------------------
    @classmethod
    def touch(cls) -> None:
        cls.want_until = time.time() + NA__SERVER__LIVE_IDLE_S

    # SUB FUNCTION | Apply One Streamed Message
    # ------------------------------------------------------------
    @classmethod
    def on_message(cls, msg: dict) -> None:
        if cls.stop is not None and cls.stop.is_set():
            return                                                             # <-- Hung up: ignore the tail of the stream
        with cls.lock:
            cls.last_msg = time.time()
            if cls.status != "live":
                cls.status, cls.since, cls.detail = "live", time.time(), ""
            cls.stats = {**cls.stats, **msg.get("stats", {})}
            if msg["t"] == "snapshot":
                cls.server = msg["entries"]
                cls.server_missing = msg.get("missing", False)
                cls.server_ver += 1
            elif msg["t"] == "diff":
                cls.server.update(msg["set"])
                for k in msg["removed"]:
                    cls.server.pop(k, None)
                cls.server_ver += 1
        if time.time() > cls.want_until and cls.stop:
            cls.stop.set()                                                     # <-- Nobody watching: hang up

    # FUNCTION | Background Loop That Opens / Holds / Closes the Session
    # ------------------------------------------------------------
    @classmethod
    def run_forever(cls) -> None:
        backoff = 0
        while True:
            if time.time() > cls.want_until:
                if cls.status != "off":
                    cls.status, cls.detail = "off", "paused: the explorer is not open"
                time.sleep(1)
                continue
            cls.status, cls.since, cls.detail = "connecting", time.time(), ""
            cls.stop = threading.Event()
            started = time.time()
            try:
                outcome = Na__Engine.Na__Engine__Watch(Na__Engine.Na__Config__Load(), cls.on_message, cls.stop)
            except RuntimeError as e:                                          # <-- Gateway guard: cooldown / no key
                cls.status, cls.detail = "blocked", str(e)
                time.sleep(30)
                continue
            except Exception as e:
                outcome = f"error: {type(e).__name__}: {e}"
            if cls.stop.is_set() or time.time() > cls.want_until:
                cls.status, cls.detail, backoff = "off", "closed", 0
                continue
            if outcome in ("auth", "refused", "timeout", "hostkey"):
                cls.status, cls.detail = "blocked", f"connection {outcome}: stopped (shared cooldown applies)"
                time.sleep(30)
                continue
            if time.time() - started > 120:
                backoff = 0
            wait = NA__SERVER__LIVE_BACKOFF_S[min(backoff, len(NA__SERVER__LIVE_BACKOFF_S) - 1)]
            backoff += 1
            cls.status, cls.detail = "retrying", f"session ended ({outcome}); retrying in {wait} s"
            for _ in range(wait):
                if time.time() > cls.want_until:
                    break
                time.sleep(1)

    # SUB FUNCTION | Rescan the PC Mirror When Stale
    # ------------------------------------------------------------
    @classmethod
    def refresh_local(cls, cfg: dict) -> None:
        if time.time() - cls.local_at < NA__SERVER__LOCAL_RESCAN_S:
            return
        tree = Na__Engine.Na__Engine__LocalTree(cfg)
        cls.local_at = time.time()
        if tree != cls.local:
            cls.local = tree
            cls.local_ver += 1

    # FUNCTION | Labelled Union of Both Trees for the UI
    # ------------------------------------------------------------
    @classmethod
    def nodes(cls, cfg: dict) -> tuple:
        cfg_key = json.dumps(cfg, sort_keys=True)
        if cls.annotator is None or cls.annotator_cfg != cfg_key:
            cls.annotator, cls.annotator_cfg, cls.cache_key = Na__Engine.Na__Engine__Annotator(cfg), cfg_key, None
        try:
            ledger_mtime = Na__Engine.NA__ENGINE__LEDGER_PATH.stat().st_mtime_ns
        except OSError:
            ledger_mtime = 0
        if ledger_mtime != cls.ledger_mtime:
            cls.ledger, cls.ledger_mtime = Na__Engine.Na__Ledger__Load(), ledger_mtime
        key = (cls.server_ver, cls.local_ver, cfg_key, ledger_mtime)
        version = f"{cls.server_ver}.{cls.local_ver}.{ledger_mtime % 100000}"
        if key == cls.cache_key:
            return version, cls.cache_nodes
        with cls.lock:
            server = dict(cls.server)
        local = cls.local
        out = []
        for rel in sorted(set(server) | set(local)):
            s, l = server.get(rel), local.get(rel)
            is_dir = (s or l)[0] == "d"
            mid, lane, excluded, made = cls.annotator.label(rel, is_dir)
            if is_dir:
                verdict = "dir"
            elif not mid:
                verdict = "unmapped"
            elif excluded:
                verdict = "not-synced"
            else:
                verdict = Na__Engine.Na__Parity__Verdict(lane, l[1:] if l else None, s[1:] if s else None,
                                                         made=made and lane == "content")
            out.append([rel, "d" if is_dir else "f", s[1] if s else None, s[2] if s else None,
                        l[1] if l else None, l[2] if l else None, mid, lane, verdict,
                        l[3] if l and len(l) > 3 else None, cls.ledger.get(rel)])   # <-- PC created, [last sync, how]
        cls.cache_key, cls.cache_nodes = key, out
        return version, out

    # FUNCTION | Status Block for the UI
    # ------------------------------------------------------------
    @classmethod
    def summary(cls) -> dict:
        return {"status": cls.status, "detail": cls.detail, "since": cls.since,
                "age_s": int(time.time() - cls.last_msg) if cls.last_msg else None, "stats": cls.stats,
                "missing": cls.server_missing, "server_entries": len(cls.server), "local_entries": len(cls.local)}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Jobs
# -----------------------------------------------------------------------------

NA__SERVER__PLAN_LISTS = ("code_new", "code_changed", "code_delete", "content_push", "content_server_newer",
                          "content_server_only", "content_collect", "user_collect", "user_pc_newer", "user_pc_only",
                          "shared_push", "shared_collect")

# HELPER FUNCTION | Remember a Job Result for the Activity Panel
# ------------------------------------------------------------
def Na__Server__Remember(label: str, res: dict) -> None:
    NA__SERVER__RESULTS.append({"t": time.strftime("%H:%M:%S"), "label": label, "ok": bool(res.get("ok")),
                                "error": res.get("error", ""), "session": res.get("_session")})
    del NA__SERVER__RESULTS[:-30]
# ---------------------------------------------------------------

# HELPER FUNCTION | Trim Long File Lists for the Browser
# ------------------------------------------------------------
def Na__Server__PlanForUi(plan: dict) -> dict:
    out = {k: v for k, v in plan.items() if k not in ("remote_state", "local_state")}
    for k in NA__SERVER__PLAN_LISTS:
        out[k + "_count"] = len(plan[k])
        out[k] = plan[k][:NA__SERVER__UI_LIST_LIMIT]
    return out
# ---------------------------------------------------------------

# HELPER FUNCTION | Validate a Config Posted by the UI
# ------------------------------------------------------------
def Na__Server__ValidateConfig(cfg: dict) -> str:
    for key in ("Server", "Local", "NeverSync", "KindExcludes", "LanePatterns", "Mappings"):
        if key not in cfg:
            return f"config is missing {key}"
    if not str(cfg["Server"]["Root"]).startswith("/srv/") and not os.environ.get("VSM_FAKE_SSH"):
        return "Server root must be under /srv/"
    ids = set()
    for m in cfg["Mappings"]:
        if not m.get("Id") or not all(c.isalnum() or c in "-_" for c in m["Id"]):
            return f"bad mapping Id {m.get('Id')!r} (letters, digits, - and _ only)"
        if m["Id"] in ids:
            return f"duplicate mapping Id {m['Id']}"
        ids.add(m["Id"])
        if m.get("Kind") not in ("web", "server"):
            return f"{m['Id']}: Kind must be web or server"
        try:
            Na__Engine.Na__Config__RemotePath(cfg, m)
        except ValueError as e:
            return str(e)
    return ""
# ---------------------------------------------------------------

# HELPER FUNCTION | Fresh Compared Plans for the Requested Ids
# ------------------------------------------------------------
def Na__Server__FreshPlans(ids: list) -> tuple:
    now, chosen = time.time(), {}
    for i in ids or []:
        if i not in NA__SERVER__PLANS or now - NA__SERVER__PLANS[i][0] > NA__SERVER__PLAN_TTL_S:
            return None, f"{i}: compare first (no fresh plan)"
        chosen[i] = NA__SERVER__PLANS[i][1]
    return chosen, ""
# ---------------------------------------------------------------

# FUNCTION | Full State for the Sync Matrix (no connection)
# ------------------------------------------------------------
def Na__Server__State() -> dict:
    cfg = Na__Engine.Na__Config__Load()
    now = time.time()
    plans = {k: Na__Server__PlanForUi(p) for k, (t, p) in NA__SERVER__PLANS.items() if now - t < NA__SERVER__PLAN_TTL_S}
    return {"version": NA__SERVER__VERSION, "config": cfg, "mappings": Na__Engine.Na__Engine__LocalOverview(cfg),
            "unmapped": Na__Engine.Na__Engine__UnmappedFolders(cfg), "gateway": Na__Engine.Na__Gateway__Summary(),
            "plans": plans, "last_action": NA__SERVER__LAST_ACTION, "live": Na__Live.summary(),
            "busy": {"label": NA__SERVER__BUSY["label"],
                     "secs": int(now - NA__SERVER__BUSY["since"]) if NA__SERVER__BUSY["label"] else 0},
            "results": NA__SERVER__RESULTS[-12:]}
# ---------------------------------------------------------------

# FUNCTION | URL Routes Payload for Tab 03 (no connection)
# ------------------------------------------------------------
def Na__Server__Routes() -> dict:
    cfg = Na__Engine.Na__Config__Load()
    routes = Na__Engine.Na__Routes__Load()
    errors = Na__Engine.Na__Routes__Validate(routes, cfg)
    conf = Na__Engine.Na__Routes__Render(routes, cfg) if not errors else ""
    digest = __import__("hashlib").sha256(conf.encode("utf-8")).hexdigest()[:12] if conf else ""
    mirror = Path(cfg["Local"]["MirrorRoot"])
    apps = []
    for d in sorted(mirror.iterdir()) if mirror.is_dir() else []:
        if d.is_dir() and not d.name.startswith((".", "Server__")):
            entries = sorted(f.name for f in d.glob("*.htm*") if f.is_file())
            apps.append({"folder": d.name, "entries": entries})
    return {"routes": routes, "errors": errors, "conf": conf, "hash": digest, "apps": apps,
            "root": cfg["Server"]["Root"], "applied": routes.get("Applied", {})}
# ---------------------------------------------------------------

# FUNCTION | Run One Engine Job (serialised)
# ------------------------------------------------------------
def Na__Server__Operate(action: str, body: dict) -> dict:
    if not NA__SERVER__OP_LOCK.acquire(blocking=False):
        return {"ok": False, "error": f"busy: {NA__SERVER__BUSY['label']}"}
    label = action
    try:
        cfg = Na__Engine.Na__Config__Load()
        ids = body.get("ids") or None
        target = body.get("id") or body.get("code")
        label = f"{action} {target}" if target else f"{action} {', '.join(ids) if ids else 'all enabled'}"
        NA__SERVER__BUSY.update(label=label, since=time.time())
        stamp = time.strftime("%H:%M")
        if action == "compare":
            res = Na__Engine.Na__Engine__Compare(cfg, ids, bool(body.get("deep")))
            if res.get("ok"):
                for k, p in res["plans"].items():
                    NA__SERVER__PLANS[k] = (time.time(), p)
                res["plans"] = {k: Na__Server__PlanForUi(p) for k, p in res["plans"].items()}
        elif action in ("push", "collect"):
            chosen, err = Na__Server__FreshPlans(ids)
            if err:
                return {"ok": False, "error": err}
            if action == "push":
                res = Na__Engine.Na__Engine__Push(cfg, chosen, bool(body.get("force_content")),
                                                  allow_deletes=bool(body.get("allow_deletes", True)))
                for p in res.get("plans", []) if res.get("ok") else []:
                    NA__SERVER__LAST_ACTION[p["id"]] = {"t": stamp, "text": f"pushed +{len(p['added'])} "
                                                        f"~{len(p['replaced'])} -{len(p['deleted'])}"}
            else:
                res = Na__Engine.Na__Engine__Collect(cfg, chosen, bool(body.get("with_content")),
                                                     bool(body.get("force_userdata")))
                if res.get("ok"):
                    for i in chosen:
                        NA__SERVER__LAST_ACTION[i] = {"t": stamp, "text": f"collected {res.get('received', 0)} file(s)"}
            if res.get("ok"):
                for i in chosen:
                    NA__SERVER__PLANS.pop(i, None)                             # <-- Stale now: compare again
        elif action == "undo":
            res = Na__Engine.Na__Engine__Undo(cfg, body["id"], body.get("stamp", ""), bool(body.get("force")))
            NA__SERVER__PLANS.pop(body["id"], None)
            if res.get("ok"):
                NA__SERVER__LAST_ACTION[body["id"]] = {"t": stamp, "text": f"undid push {res.get('undid')}"}
        elif action == "delete":                                               # <-- Explorer: named files, root-relative paths
            files = body.get("files")
            if not isinstance(files, dict) or not all(isinstance(v, dict) for v in files.values()):
                return {"ok": False, "error": "delete needs {files: {mapping id: {path: [size, mtime]}}}"}
            label = f"delete {sum(len(v) for v in files.values())} file(s) in {', '.join(files)}"
            NA__SERVER__BUSY.update(label=label)
            res = Na__Engine.Na__Engine__Delete(cfg, files, bool(body.get("pc")), root_relative=True)
            for p in res.get("plans", []):
                NA__SERVER__PLANS.pop(p["id"], None)                           # <-- The server changed: compare again
                NA__SERVER__LAST_ACTION[p["id"]] = {"t": stamp, "text": f"deleted {len(p['deleted'])} file(s)"}
        elif action == "seed":
            res = Na__Engine.Na__Engine__Seed(cfg, ids)
        elif action == "backup":
            res = Na__Engine.Na__Engine__Backup(cfg, ids)
        elif action == "status":
            res = Na__Engine.Na__Engine__Status(cfg)
        elif action == "prepare":
            res = Na__Engine.Na__Engine__PrepareRoot(cfg)
        elif action in ("nginx-test", "nginx-apply", "nginx-status"):
            res = Na__Engine.Na__Engine__Nginx(cfg, action.split("-", 1)[1])
        elif action in ("user-reset", "user-signout"):                         # <-- Tab 04: on the server now
            if not NA__SERVER__USERS_LOCK.acquire(blocking=False):
                return {"ok": False, "error": "a user accounts save is still running"}
            try:
                res = Na__Engine.Na__Users__ServerAction(cfg, str(body.get("code") or ""), action.split("-", 1)[1])
            finally:
                NA__SERVER__USERS_LOCK.release()
            if res.get("ok"):
                NA__SERVER__PLANS.pop(res["mapping"], None)                    # <-- The register changed: compare again
                NA__SERVER__LAST_ACTION[res["mapping"]] = {"t": stamp, "text": f"{action} {res['code']}"}
        else:
            return {"ok": False, "error": f"unknown action {action}"}
        Na__Server__Remember(label, res)
        return res
    except RuntimeError as e:                                                  # <-- Gateway guard refused
        res = {"ok": False, "error": str(e)}
        Na__Server__Remember(label, res)
        return res
    except Exception as e:
        traceback.print_exc()
        res = {"ok": False, "error": f"{type(e).__name__}: {e}"}
        Na__Server__Remember(label, res)
        return res
    finally:
        NA__SERVER__BUSY.update(label="", since=0.0)
        NA__SERVER__OP_LOCK.release()
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Request Handler
# -----------------------------------------------------------------------------

class Na__Server__Handler(BaseHTTPRequestHandler):
    server_version = f"ValeVirtualServerManager/{NA__SERVER__VERSION}"

    # HELPER FUNCTION | Quiet Request Logging (jobs log themselves)
    # ------------------------------------------------------------
    def log_message(self, fmt, *args):
        line = fmt % args
        if NA__SERVER__QUIET or "/api/state" in line or "/api/tree" in line:
            return
        try:
            sys.stderr.write("  [ui] " + line + "\n")
        except (AttributeError, OSError):
            pass
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Only Answer Requests Addressed to This Machine
    # ------------------------------------------------------------
    def Na__Handler__HostOk(self) -> bool:
        return (self.headers.get("Host") or "").split(":")[0] in ("127.0.0.1", "localhost")
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Send JSON
    # ------------------------------------------------------------
    def Na__Handler__Json(self, obj, code: int = 200) -> None:
        data = json.dumps(obj, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    # ---------------------------------------------------------------

    # FUNCTION | GET: the PWA files, the matrix state, the live tree
    # ------------------------------------------------------------
    def do_GET(self):
        if not self.Na__Handler__HostOk():
            return self.send_error(403)
        path, _, query = self.path.partition("?")
        try:
            if path == "/api/state":
                return self.Na__Handler__Json(Na__Server__State())
            if path == "/api/routes":
                return self.Na__Handler__Json(Na__Server__Routes())
            if path == "/api/users":
                return self.Na__Handler__Json(Na__Engine.Na__Users__Payload(Na__Engine.Na__Config__Load()))
            if path == "/api/tree":
                Na__Live.touch()
                cfg = Na__Engine.Na__Config__Load()
                Na__Live.refresh_local(cfg)
                version, nodes = Na__Live.nodes(cfg)
                known = dict(p.split("=", 1) for p in query.split("&") if "=" in p).get("v")
                payload = {"version": version, "live": Na__Live.summary(), "gateway": Na__Engine.Na__Gateway__Summary(),
                           "root": cfg["Server"]["Root"], "mirror": cfg["Local"]["MirrorRoot"]}
                if known != version:
                    payload["nodes"] = nodes
                return self.Na__Handler__Json(payload)
        except Exception as e:
            traceback.print_exc()
            return self.Na__Handler__Json({"error": f"{type(e).__name__}: {e}"}, 500)
        rel = NA__SERVER__ENTRY_FILE if path in ("/", "") else path.lstrip("/")
        target = (NA__SERVER__APP_ROOT_PATH / rel).resolve()
        allowed = rel in NA__SERVER__ROOT_FILES or any(
            target.is_relative_to(NA__SERVER__APP_ROOT_PATH / d) for d in NA__SERVER__STATIC_DIRS)
        if not allowed or not target.is_file() or target.suffix not in NA__SERVER__MIME:
            return self.send_error(404)
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", NA__SERVER__MIME[target.suffix])
        self.send_header("Cache-Control", "no-cache")
        if rel.endswith("ServiceWorker__.js"):
            self.send_header("Service-Worker-Allowed", "/")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    # ---------------------------------------------------------------

    # FUNCTION | POST: config changes, jobs, live control
    # ------------------------------------------------------------
    def do_POST(self):
        if not self.Na__Handler__HostOk() or self.headers.get("X-Vale-Manager") != "1" \
                or "application/json" not in (self.headers.get("Content-Type") or ""):
            return self.send_error(403)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        except ValueError:
            return self.Na__Handler__Json({"ok": False, "error": "bad JSON"}, 400)
        path = self.path.split("?")[0]
        if path == "/api/config":
            err = Na__Server__ValidateConfig(body)
            if err:
                return self.Na__Handler__Json({"ok": False, "error": err}, 400)
            Na__Engine.Na__Config__Save(body)
            NA__SERVER__PLANS.clear()                                          # <-- Paths may have changed: old plans are void
            return self.Na__Handler__Json({"ok": True})
        if path == "/api/routes":
            routes = body.get("routes") or {}
            if not isinstance(routes.get("Routes"), list):
                return self.Na__Handler__Json({"ok": False, "error": "routes missing"}, 400)
            current = Na__Engine.Na__Routes__Load()
            routes["Applied"] = current.get("Applied", {})                       # <-- Only Apply may change this
            errors = Na__Engine.Na__Routes__Validate(routes, Na__Engine.Na__Config__Load())
            if errors and not body.get("draft"):
                return self.Na__Handler__Json({"ok": False, "error": "; ".join(errors), "errors": errors}, 400)
            Na__Engine.Na__Routes__Save(routes)
            return self.Na__Handler__Json({"ok": True, **Na__Server__Routes()})
        if path == "/api/users":
            users = body.get("users")
            if not isinstance(users, list):
                return self.Na__Handler__Json({"ok": False, "error": "users missing"}, 400)
            if not NA__SERVER__USERS_LOCK.acquire(blocking=False):
                return self.Na__Handler__Json({"ok": False, "error": "another save, reset or sign-out is still running"}, 409)
            try:
                cfg = Na__Engine.Na__Config__Load()
                res = Na__Engine.Na__Users__Commit(cfg, users)
            except Exception as e:
                traceback.print_exc()
                res = {"ok": False, "errors": [f"{type(e).__name__}: {e}"]}
            finally:
                NA__SERVER__USERS_LOCK.release()
            if not res.get("ok"):
                return self.Na__Handler__Json({"ok": False, "error": "; ".join(res["errors"]), "errors": res["errors"]}, 400)
            return self.Na__Handler__Json({**res, **Na__Engine.Na__Users__Payload(cfg)})
        if path == "/api/shutdown":
            busy = NA__SERVER__BUSY["label"] or ("saving user accounts" if NA__SERVER__USERS_LOCK.locked() else "")
            if busy and not body.get("force"):
                return self.Na__Handler__Json({"ok": False, "error": f"busy: {busy}"}, 409)
            self.Na__Handler__Json({"ok": True, "version": NA__SERVER__VERSION, "pid": os.getpid()})
            threading.Thread(target=Na__Server__Shutdown, daemon=True, name="shutdown").start()
            return None
        if path == "/api/clear-cooldown":
            st = Na__Engine.Na__Gateway__LoadState()
            st["cooldown_until"], st["cooldown_reason"] = 0, ""
            Na__Engine.Na__Gateway__SaveState(st)
            return self.Na__Handler__Json({"ok": True})
        if path == "/api/live":
            if body.get("on"):
                Na__Live.touch()
            else:
                Na__Live.want_until = 0
                if Na__Live.stop:
                    Na__Live.stop.set()
            return self.Na__Handler__Json({"ok": True, "live": Na__Live.summary()})
        if path.startswith("/api/op/"):
            return self.Na__Handler__Json(Na__Server__Operate(path[len("/api/op/"):], body))
        return self.send_error(404)
    # ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

# CLASS | HTTP Server That Owns Its Port Exclusively
# ------------------------------------------------------------
class Na__Server__Http(ThreadingHTTPServer):
    """On Windows, SO_REUSEADDR lets a second copy bind the same port and steal half
    the requests. Refuse that: exclusive bind, so a second launch fails cleanly."""
    allow_reuse_address = os.name != "nt"
    daemon_threads = True

    def server_bind(self):
        if os.name == "nt" and hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()
# ---------------------------------------------------------------

# HELPER FUNCTION | Stop Serving (from /api/shutdown): hang up the live session first
# ------------------------------------------------------------
def Na__Server__Shutdown() -> None:
    print(f"Shutdown requested ({time.strftime('%H:%M:%S')}): closing the live session and stopping.", flush=True)
    Na__Live.want_until = 0
    if Na__Live.stop:
        Na__Live.stop.set()
    for _ in range(50):                                                        # <-- Up to 5 s for the ssh session to close
        if Na__Live.status not in ("connecting", "live"):
            break
        time.sleep(0.1)
    if NA__SERVER__HTTPD:
        NA__SERVER__HTTPD.shutdown()
# ---------------------------------------------------------------

# HELPER FUNCTION | Is Something Listening on the Port?
# ------------------------------------------------------------
def Na__Server__PortBusy(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0
# ---------------------------------------------------------------

# HELPER FUNCTION | PID Listening on the Port (Windows netstat; older copies have no /api/shutdown)
# ------------------------------------------------------------
def Na__Server__ListenerPid(port: int) -> int:
    out = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True, errors="replace").stdout
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[1] == f"127.0.0.1:{port}" and parts[3] == "LISTENING":
            return int(parts[4])
    return 0
# ---------------------------------------------------------------

# FUNCTION | Stop the Manager Already Running on the Port (for --restart)
# ------------------------------------------------------------
def Na__Server__StopRunning(port: int) -> tuple:
    """Returns (ok, message, was_running). Only ever stops a Vale manager, and never
    while it is running a push / collect / users save."""
    if not Na__Server__PortBusy(port):
        return True, f"nothing was running on port {port}", False
    base = f"http://127.0.0.1:{port}"
    try:
        with urllib.request.urlopen(base + "/api/state", timeout=10) as r:
            server_header, state = r.headers.get("Server", ""), json.loads(r.read() or b"{}")
    except (urllib.error.URLError, OSError, ValueError) as e:
        return False, f"port {port} is in use but did not answer as the Vale manager ({e}); not touching it", True
    if not server_header.startswith("ValeVirtualServerManager/"):
        return False, f"port {port} is used by another program ({server_header or 'unknown'}); not touching it", True
    old = server_header.split()[0].split("/", 1)[1]
    busy = (state.get("busy") or {}).get("label")
    if busy:
        return False, f"the running manager ({old}) is busy: {busy}. Wait for it to finish, then restart.", True
    req = urllib.request.Request(base + "/api/shutdown", data=b"{}", method="POST",
                                 headers={"Content-Type": "application/json", "X-Vale-Manager": "1"})
    how = "asked to shut down"
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            return False, f"the running manager ({old}) is busy: {json.loads(e.read() or b'{}').get('error', '')}", True
        if e.code != 404:
            return False, f"the running manager ({old}) refused to stop: HTTP {e.code}", True
        pid = Na__Server__ListenerPid(port) if os.name == "nt" else 0      # <-- Older copy: no /api/shutdown
        if not pid:
            return False, f"the running manager ({old}) has no shutdown endpoint and its PID was not found; close it by hand", True
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        how = f"ended (PID {pid}, it predates /api/shutdown)"
    except (urllib.error.URLError, OSError) as e:
        if Na__Server__PortBusy(port):
            return False, f"could not stop the running manager ({old}): {e}", True
    for _ in range(150):                                                       # <-- Up to 15 s for the port to free
        if not Na__Server__PortBusy(port):
            return True, f"stopped the running manager {old}: {how}", True
        time.sleep(0.1)
    return False, f"the running manager ({old}) was {how} but port {port} is still busy", True
# ---------------------------------------------------------------

# HELPER FUNCTION | Send Output to a Log File (pythonw has no console)
# ------------------------------------------------------------
def Na__Server__UseLogFile(path: str) -> None:
    log_path = Path(path)
    if not log_path.is_absolute():
        log_path = NA__SERVER__APP_ROOT_PATH / log_path
    if log_path.exists() and log_path.stat().st_size > 5_000_000:
        log_path.replace(log_path.with_suffix(".old.log"))
    handle = open(log_path, "a", encoding="utf-8", buffering=1)
    sys.stdout = sys.stderr = handle
# ---------------------------------------------------------------

# FUNCTION | Start the Server
# ------------------------------------------------------------
def Na__Server__Main() -> int:
    global NA__SERVER__QUIET, NA__SERVER__HTTPD
    ap = argparse.ArgumentParser(description="Vale Virtual Server Manager (local PWA server)")
    ap.add_argument("--port", type=int, default=NA__SERVER__DEFAULT_PORT)
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--silent", action="store_true", help="no browser, no request logging (start-up launcher)")
    ap.add_argument("--log-file", default="", help="write all output to this file")
    ap.add_argument("-r", "--r", "--restart", dest="restart", action="store_true",
                    help="stop the manager already running on the port, then start this one (picks up code changes)")
    ap.add_argument("--stop", action="store_true", help="stop the manager running on the port, then exit")
    a = ap.parse_args()
    if a.log_file:
        Na__Server__UseLogFile(a.log_file)
    NA__SERVER__QUIET = a.silent
    was_running = False
    if a.stop:
        ok, msg, _ = Na__Server__StopRunning(a.port)
        print(f"Stop: {msg}", flush=True)
        return 0 if ok else 1
    if a.restart:
        ok, msg, was_running = Na__Server__StopRunning(a.port)
        print(f"Restart: {msg}", flush=True)
        if not ok:
            return 1
    httpd = None
    for attempt in range(10 if a.restart else 1):                             # <-- After a restart the port can lag
        try:
            httpd = Na__Server__Http(("127.0.0.1", a.port), Na__Server__Handler)
            break
        except OSError as e:
            if attempt == (9 if a.restart else 0):
                print(f"Port {a.port} is busy ({e}). Is the manager already running? Open http://127.0.0.1:{a.port}/"
                      f"  (or restart it: python VirtualServerManager__LocalServer__.py --restart)", flush=True)
                return 1
            time.sleep(1)
    NA__SERVER__HTTPD = httpd
    threading.Thread(target=Na__Live.run_forever, daemon=True, name="live-explorer").start()
    url = f"http://127.0.0.1:{a.port}/"
    print("=" * 77)
    print(f" VALE VIRTUAL SERVER MANAGER {NA__SERVER__VERSION}   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 77)
    print(f" UI        : {url}")
    print(f" Sync map  : {Na__Engine.NA__ENGINE__CONFIG_PATH}")
    print(" Stop      : Ctrl+C          Restart after code changes: --restart (-r)")
    print("=" * 77, flush=True)
    if not (a.no_browser or a.silent or was_running):                          # <-- A restart reuses the open app window
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print(f"Stopped {time.strftime('%H:%M:%S')}.", flush=True)
    return 0
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


if __name__ == "__main__":
    sys.exit(Na__Server__Main())
