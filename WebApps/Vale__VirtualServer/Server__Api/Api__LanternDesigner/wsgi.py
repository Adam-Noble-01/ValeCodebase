"""
=============================================================================
 LANTERN DESIGNER - API (FLASK)
=============================================================================

FILE       : wsgi.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Lantern Designer's only server side: lantern designs in the Vale
             Projects Master Library, per-user settings, and the component and
             profile library indexes.
CREATED    : 15-Oct-2026

DESCRIPTION:
- Public path /lantern-designer/api/... (nginx proxies it to this service on
  127.0.0.1:<ApiPort from the URL routes file, 8003>). Locally the Vale dev server
  mounts it in-process (Server__DeveloperTools/ValeDev__LocalServer__.py).
- THE MASTER LIBRARY IS THE ONLY HOME OF A DESIGN (Adam, 15-Oct-2026): one design
  per library project, beside whatever ValeVision 3D, the Gallery and Theia keep
  in the same folder:
      ValeProjects__<yyyy>/<project id>/LanternDesigner/UserData__LanternDesign/VghLantern__ProjectFile__<project id>__.json
  A project may have a model and no lanterns, lanterns and no model, or both.
- A design names the client and their address, so it sits in a UserData__ bucket:
  nginx never serves it (only this API does, to signed-in people), and the Server
  Manager collects it to the PC and never pushes it, as with ValeVision 3D's drawings.
- THE PROJECT ID IS THE LIBRARY FOLDER NAME ("57079__Mordaunt"). The design's
  Metadata ProjectCode stays the job number printed on drawings and letters;
  Metadata LibraryId is the key, and this API always sets it from the folder, so a
  design can never be moved by editing a field.
- New designs go into a library project that has none, or into a NEW library
  project (job number + name) made with every folder of the schema project and
  ProjectType "LanternDesign" (ValeShared__Library__ 1.2.0), which the Gallery's
  tabs and its 3D Production KPI report leave out until the project has 3D work.
- Saves are the whole design. Each carries the "_rev" it was loaded at; a newer
  file answers 409 with the design as it is now. Atomic, locked across processes,
  revision copies in ProjectData__Revisions (a design autosaves every few seconds,
  so at most one copy per 10 minutes, the last 20).
- Who: everyone signed in reads (Affiliate up); Employee and up create and save;
  a delete is the design's creator, or Management and up. A delete removes the
  design file only (its revision copies stay), never a library folder or record.
- VghLantern__ProjectFile__ServerStamp is written here and never by the app: who
  created the design, who saved it last, each person's editing sessions (saves by
  one person less than 30 minutes apart are one session) and every change of its
  status, project, document or client name (who, when, from what to what). The
  project list shows who created and who last modified each design; History
  shows the rest. A design saved before 1.1.0 starts its sessions from the older
  CreatedBy / SavedBy fields.
- Per-user settings (the old per-user menu file): Server__UserAccountData/
  UserData__UserAppConfigs/LanternDesigner/UserConfig__<USR code>__LanternDesigner__.json.
  The app asks for "me"; nobody can read or write anyone else's.
- The component index, profile index and asset registry are read-only JSON from
  the app folder (open, as the same static files are).
- Activity ledger: designs created and deleted, manual saves, and editing (at most
  one line per person per design per 15 minutes; autosaves are not each logged).

ROUTES (under /lantern-designer/api/):
  GET    health                        no sign-in
  GET    projects                      designs in the library (light records, newest first)
  POST   projects                      create {project, library: {id} | {newProject: {code, name}}}   (Employee)
  GET    projects/<id>                 one design {data, rev}
  GET    projects/<id>/history         who created it, who saved it last, editing sessions and changes, newest first
  POST   projects/<id>                 save the whole design, "_rev" checked              (Employee)
  DELETE projects/<id>                 remove the design (creator, or Management)
  GET    library[?code=57079][&q=text] library projects to put a design in (hasDesign, hasModel ...)
  GET    component-index | profile-index | asset-registry      no sign-in
  GET    user-menu-config/me           this person's settings (404 until first saved)
  POST   user-menu-config/me           save them
  /api/accounts/...                    shared sign-in (ValeShared__Accounts__.py)
  POST   /api/activity                 what the browser saw (ValeShared__Activity__.py)

RUN (server): gunicorn --bind 127.0.0.1:${VALE_PORT} wsgi:app   (systemd vale@LanternDesigner)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
15-Oct-2026 - Version 1.1.0
- Ownership and edits per project (Adam): the list carries who last modified each
  design (modifiedByCode/Name, modifiedUtc) beside who created it, plus createdUtc
  and migrated; the server stamp keeps EditSessions and Events (status, project,
  document and client name changes); GET projects/<id>/history serves them.

15-Oct-2026 - Version 1.0.1
- Designs move into LanternDesigner/UserData__LanternDesign/: the first live check found
  nginx serving LanternDesigner/ directly (a design names the client and their address).
  UserData__ folders are denied by nginx and collected, never pushed.

15-Oct-2026 - Version 1.0.0
- Initial build: replaces the localhost-only VghLantern__FlaskServer__Localhost__.py
  (port 8006), which wrote 07__LocalProjectData and 08__LocalUserData with no
  sign-in, and copied one user's menu into the app's own config.

=============================================================================
"""

from __future__ import annotations

import calendar
import json
import os
import re
import sys
import threading
import time
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "Api__Shared"))
from ValeShared__Accounts__ import Na__Accounts__Blueprint                  # noqa: E402
from ValeShared__Activity__ import Na__Activity__Blueprint, Na__Activity__Record  # noqa: E402
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Ranks, Na__Auth__Require  # noqa: E402
from ValeShared__Library__ import (NA__LIBRARY__ROOT, Na__Library__Conflict, Na__Library__CreateProject,  # noqa: E402
                                   Na__Library__Find, Na__Library__ListProjects, Na__Library__Locked,
                                   Na__Library__NewProjectId, Na__Library__NewRecord, Na__Library__ReadJson,
                                   Na__Library__WriteJson, Na__Library__Year)


# -----------------------------------------------------------------------------
# REGION | App and Constants
# -----------------------------------------------------------------------------

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
app.json.sort_keys = False
app.config["VALE_ACTIVITY_APP"] = "Lantern Designer"                       # <-- Its name in the activity ledger
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024                        # <-- A design is a few MB; nginx and Cloudflare cap at 100 MB
app.register_blueprint(Na__Accounts__Blueprint, url_prefix="/api/accounts")
app.register_blueprint(Na__Activity__Blueprint, url_prefix="/api/activity")

NA__LANTERN__APP                  = "LanternDesigner"
NA__LANTERN__ACTIVITY             = "Lantern Designer"
NA__LANTERN__APP_DIR              = NA__LIBRARY__ROOT / "Vale__LanternDesigner"
NA__LANTERN__BUCKET               = "LanternDesigner"                       # <-- The app's folder in every library project
NA__LANTERN__DESIGN_DIR           = "LanternDesigner/UserData__LanternDesign" # <-- Where its design lives: user data, never web-served
NA__LANTERN__PROJECT_TYPE         = "LanternDesign"                         # <-- A library project made here, with no 3D work yet
NA__LANTERN__META                 = "VghLantern__ProjectFile__Metadata"
NA__LANTERN__M                    = "VghLantern__ProjectFile__Metadata__"
NA__LANTERN__LANTERNS             = "VghLantern__ProjectFile__Lanterns"
NA__LANTERN__STAMP                = "VghLantern__ProjectFile__ServerStamp"
NA__LANTERN__S                    = "VghLantern__ProjectFile__ServerStamp__"
NA__LANTERN__REVISION_EVERY_S     = 600                                     # <-- One revision copy per 10 minutes of editing
NA__LANTERN__KEEP_REVISIONS       = 20
NA__LANTERN__EDIT_LOG_EVERY_S     = 900                                     # <-- One "edited" ledger line per person per design per 15 minutes
NA__LANTERN__SESSION_GAP_S        = 1800                                    # <-- Saves by one person less than 30 minutes apart are one editing session
NA__LANTERN__KEEP_SESSIONS        = 500                                     # <-- Editing sessions a design's history keeps (the oldest go first)
NA__LANTERN__KEEP_EVENTS          = 300                                     # <-- Status and name changes it keeps
NA__LANTERN__TRACKED_FIELDS       = ("DocumentStatus", "ProjectName", "DocumentName", "ClientName")  # <-- Metadata changes History lists, field by field
NA__LANTERN__STAMP_NOTE           = ("Written by the Lantern Designer API, never by the app: who made this design, who saved "
                                     "it last, each person's editing sessions and every status or name change.")
NA__LANTERN__INDEXES              = {
    "component-index": "05__Data__LanternComponentLibrary/VghLantern__ComponentDataIndex__.json",
    "profile-index"  : "06__Data__LanternProfileLibrary/VghLantern__ProfileDataIndex__.json",
    "asset-registry" : "VghLantern__AssetRegistry__.json",
}
NA__LANTERN__USERCFG_DIR          = NA__LIBRARY__ROOT / "Server__UserAccountData" / "UserData__UserAppConfigs" / "LanternDesigner"
NA__LANTERN__NOT_A_PROJECT        = ("ExampleProject",)                     # <-- The schema project is a template, never a job
NA__LANTERN__CACHE                = {"designs": {}, "records": {}, "history": {}}  # <-- path -> (mtime_ns, size, summary): files are only re-read when they change
NA__LANTERN__EDIT_LOG             = {}                                      # <-- (USR code, project id) -> time the last "edited" line was written
NA__LANTERN__EDIT_LOG_LOCK        = threading.Lock()

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | JSON Error Reply
# ------------------------------------------------------------
def Na__Lantern__Error(status: int, message: str, **extra):
    return jsonify({"ok": False, "error": message, **extra}), status
# ---------------------------------------------------------------

# HELPER FUNCTION | A Project's Design File (whether or not it exists yet)
# ------------------------------------------------------------
def Na__Lantern__DesignPath(folder: Path) -> Path:
    return folder / NA__LANTERN__DESIGN_DIR / f"VghLantern__ProjectFile__{folder.name}__.json"
# ---------------------------------------------------------------

# HELPER FUNCTION | Now (one clock for the stamp's times and its session arithmetic)
# ------------------------------------------------------------
def Na__Lantern__Now() -> float:
    return time.time()
# ---------------------------------------------------------------

# HELPER FUNCTION | A Time as the Server Stamp Writes It ("2026-10-15T14:32:07Z"; now when none is given)
# ------------------------------------------------------------
def Na__Lantern__Utc(when: float | None = None) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(Na__Lantern__Now() if when is None else when))
# ---------------------------------------------------------------

# HELPER FUNCTION | A Server Stamp Time as Seconds (None when it is not one)
# ------------------------------------------------------------
def Na__Lantern__UtcSeconds(text) -> float | None:
    try:
        return float(calendar.timegm(time.strptime(str(text), "%Y-%m-%dT%H:%M:%SZ")))
    except (TypeError, ValueError):
        return None
# ---------------------------------------------------------------

# HELPER FUNCTION | Who, as the Server Stamp Writes It
# ------------------------------------------------------------
def Na__Lantern__Who(user: dict) -> dict:
    return {"Code": user.get("code") or "", "Name": user.get("name") or ""}
# ---------------------------------------------------------------

# HELPER FUNCTION | A Design's Metadata and Server Stamp (empty when missing or malformed)
# ------------------------------------------------------------
def Na__Lantern__Parts(design: dict) -> tuple:
    meta = design.get(NA__LANTERN__META) if isinstance(design.get(NA__LANTERN__META), dict) else {}
    stamp = design.get(NA__LANTERN__STAMP) if isinstance(design.get(NA__LANTERN__STAMP), dict) else {}
    return meta, stamp
# ---------------------------------------------------------------

# HELPER FUNCTION | A Person the Stamp Names ({} when it names nobody)
# ------------------------------------------------------------
def Na__Lantern__StampWho(stamp: dict, key: str) -> dict:
    who = stamp.get(NA__LANTERN__S + key)
    return who if isinstance(who, dict) else {}
# ---------------------------------------------------------------

# HELPER FUNCTION | A Design With Its Key Set From the Folder
# ------------------------------------------------------------
def Na__Lantern__Keyed(design: dict, project_id: str) -> dict:
    meta = design.get(NA__LANTERN__META)
    if not isinstance(meta, dict):
        meta = design[NA__LANTERN__META] = {}
    meta[NA__LANTERN__M + "LibraryId"] = project_id
    return design
# ---------------------------------------------------------------

# HELPER FUNCTION | Read a File Through the Change-Keyed Cache
# ------------------------------------------------------------
def Na__Lantern__Cached(kind: str, path: Path, build):
    try:
        st = path.stat()
    except OSError:
        return None
    hit = NA__LANTERN__CACHE[kind].get(path)
    if hit and hit[0] == st.st_mtime_ns and hit[1] == st.st_size:
        return hit[2]
    try:
        value = build(json.loads(path.read_text(encoding="utf-8")), st)
    except (OSError, ValueError) as e:
        print(f" [LANTERN] cannot read {path.name}: {e}", file=sys.stderr, flush=True)
        return None
    NA__LANTERN__CACHE[kind][path] = (st.st_mtime_ns, st.st_size, value)
    return value
# ---------------------------------------------------------------

# FUNCTION | A Design as the Project List Needs It
# ------------------------------------------------------------
def Na__Lantern__Summary(project_id: str, folder: Path, design: dict, st) -> dict:
    meta, stamp = Na__Lantern__Parts(design)
    created, saved = Na__Lantern__StampWho(stamp, "CreatedBy"), Na__Lantern__StampWho(stamp, "SavedBy")
    lanterns = design.get(NA__LANTERN__LANTERNS)
    return {
        "libraryId"     : project_id,
        "year"          : Na__Library__Year(folder),
        "projectCode"   : meta.get(NA__LANTERN__M + "ProjectCode", ""),
        "projectName"   : meta.get(NA__LANTERN__M + "ProjectName", ""),
        "documentName"  : meta.get(NA__LANTERN__M + "DocumentName", ""),
        "clientName"    : meta.get(NA__LANTERN__M + "ClientName", ""),
        "status"        : meta.get(NA__LANTERN__M + "DocumentStatus", "Draft"),
        "dateCreated"   : meta.get(NA__LANTERN__M + "DateCreated", ""),
        "dateModified"  : meta.get(NA__LANTERN__M + "DateModified", ""),
        "lanternCount"  : len(lanterns) if isinstance(lanterns, list) else 0,
        "createdByCode" : created.get("Code", ""),
        "createdByName" : created.get("Name", ""),
        "createdUtc"    : stamp.get(NA__LANTERN__S + "CreatedUtc", ""),
        "modifiedByCode": saved.get("Code", ""),                              # <-- Who saved it last (the API's stamp, not the app's)
        "modifiedByName": saved.get("Name", ""),
        "modifiedUtc"   : stamp.get(NA__LANTERN__S + "SavedUtc", ""),
        "migrated"      : bool(stamp.get(NA__LANTERN__S + "MigratedFrom")),   # <-- Started in the prototype, before sign-in: no creator
        "rev"           : int(design.get("_rev", 0) or 0),
        "_mtime"        : st.st_mtime,
    }
# ---------------------------------------------------------------

# FUNCTION | A Library Project as the Picker Needs It
# ------------------------------------------------------------
def Na__Lantern__RecordSummary(record: dict, st) -> dict:
    return {
        "projectName": record.get("projectNameAlias") or record.get("projectName") or "",
        "projectCode": str(record.get("projectCode") or ""),
        "projectType": record.get("ProjectType") or "",
        "hasModel"   : bool(record.get("valeVision_ModelUrls") or record.get("valeVision_ModelUrl")),
        "hasImages"  : bool(record.get("images")),
    }
# ---------------------------------------------------------------

# HELPER FUNCTION | Load a Project's Design or Answer 404
# ------------------------------------------------------------
def Na__Lantern__Load(project_id: str):
    folder = Na__Library__Find(project_id)
    if folder is None:
        return None, None, None, Na__Lantern__Error(404, f"No project {project_id!r} in the library.")
    path = Na__Lantern__DesignPath(folder)
    design = Na__Library__ReadJson(path)
    if not isinstance(design, dict):
        return folder, path, None, Na__Lantern__Error(404, f"{folder.name} has no Lantern design yet.")
    return folder, path, design, None
# ---------------------------------------------------------------

# HELPER FUNCTION | May This Person Delete This Design?
# ------------------------------------------------------------
def Na__Lantern__CanDelete(user: dict, design: dict) -> bool:
    if user.get("levelRank", 99) <= Na__Auth__Ranks().get("Management", 2):
        return True
    _, stamp = Na__Lantern__Parts(design)
    return bool(user.get("code")) and Na__Lantern__StampWho(stamp, "CreatedBy").get("Code") == user.get("code")
# ---------------------------------------------------------------

# HELPER FUNCTION | Should This Save Reach the Activity Ledger?
# ------------------------------------------------------------
def Na__Lantern__ShouldLogEdit(user_code: str, project_id: str, source: str) -> bool:
    if source.startswith("manual:"):
        return True                                                            # <-- A deliberate save is always worth a line
    now = time.time()
    with NA__LANTERN__EDIT_LOG_LOCK:
        last = NA__LANTERN__EDIT_LOG.get((user_code, project_id), 0)
        if now - last < NA__LANTERN__EDIT_LOG_EVERY_S:
            return False
        NA__LANTERN__EDIT_LOG[(user_code, project_id)] = now
        return True
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Ownership and Edit History (the server stamp)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | A Design's Editing Sessions, Oldest First
# ------------------------------------------------------------
# Stored since 1.1.0. A design saved before then kept only who made it and who
# saved it last: those become its first sessions (their save counts unknown: 0).
def Na__Lantern__Sessions(stamp: dict) -> list:
    stored = stamp.get(NA__LANTERN__S + "EditSessions")
    if isinstance(stored, list):
        return [dict(s) for s in stored if isinstance(s, dict)]
    begun = []
    for who_key, utc_key in (("CreatedBy", "CreatedUtc"), ("SavedBy", "SavedUtc")):
        who, utc = Na__Lantern__StampWho(stamp, who_key), str(stamp.get(NA__LANTERN__S + utc_key) or "")
        at = Na__Lantern__UtcSeconds(utc)
        if not who.get("Code") or at is None:
            continue
        last = begun[-1] if begun else None
        if last and last["Code"] == who["Code"] and at - Na__Lantern__UtcSeconds(last["ToUtc"]) <= NA__LANTERN__SESSION_GAP_S:
            last["ToUtc"] = max(last["ToUtc"], utc)                            # <-- Made and saved in one sitting: one session
            continue
        begun.append({"Code": who["Code"], "Name": who.get("Name", ""), "FromUtc": utc, "ToUtc": utc, "Saves": 0})
    return begun
# ---------------------------------------------------------------

# HELPER FUNCTION | A Design's Recorded Changes (status and names), Oldest First
# ------------------------------------------------------------
def Na__Lantern__Events(stamp: dict) -> list:
    stored = stamp.get(NA__LANTERN__S + "Events")
    return [dict(e) for e in stored if isinstance(e, dict)] if isinstance(stored, list) else []
# ---------------------------------------------------------------

# FUNCTION | The Stamp of a New Design: Its Creator, and Their First Session
# ------------------------------------------------------------
def Na__Lantern__NewStamp(user: dict, now: float) -> dict:
    who, utc = Na__Lantern__Who(user), Na__Lantern__Utc(now)
    return {
        NA__LANTERN__S + "Description" : NA__LANTERN__STAMP_NOTE,
        NA__LANTERN__S + "CreatedBy"   : who,
        NA__LANTERN__S + "CreatedUtc"  : utc,
        NA__LANTERN__S + "SavedBy"     : who,
        NA__LANTERN__S + "SavedUtc"    : utc,
        NA__LANTERN__S + "EditSessions": [{"Code": who["Code"], "Name": who["Name"], "FromUtc": utc, "ToUtc": utc, "Saves": 1}],
        NA__LANTERN__S + "Events"      : [],
    }
# ---------------------------------------------------------------

# FUNCTION | Record One Save: Who Saved Last, Their Editing Session, Any Status or Name Change
# ------------------------------------------------------------
# Runs inside the design's lock, on the stamp of the file as it is on disk (the
# app's copy of the stamp is never trusted). One person's changes to one field
# within a session fold into one entry, so a name typed letter by letter (autosaved
# as it goes) is one change from the old name to the new one, and a change undone
# within the session disappears.
def Na__Lantern__RecordEdit(stamp: dict, user: dict, old_meta: dict, new_meta: dict, now: float) -> dict:
    who, utc = Na__Lantern__Who(user), Na__Lantern__Utc(now)
    sessions, events = Na__Lantern__Sessions(stamp), Na__Lantern__Events(stamp)   # <-- Read before SavedBy changes: a pre-1.1.0 design begins its sessions from it

    last = sessions[-1] if sessions else None
    last_to = Na__Lantern__UtcSeconds(last.get("ToUtc")) if last else None
    if last and last.get("Code") == who["Code"] and last_to is not None and now - last_to <= NA__LANTERN__SESSION_GAP_S:
        last["ToUtc"], last["Saves"] = utc, int(last.get("Saves") or 0) + 1
        last["Name"] = who["Name"] or last.get("Name", "")
    else:
        sessions.append({"Code": who["Code"], "Name": who["Name"], "FromUtc": utc, "ToUtc": utc, "Saves": 1})

    for field in NA__LANTERN__TRACKED_FIELDS:
        before = str(old_meta.get(NA__LANTERN__M + field) or "").strip()
        after = str(new_meta.get(NA__LANTERN__M + field) or "").strip()
        if field == "DocumentStatus":
            before, after = before or "Draft", after or "Draft"
        if before == after:
            continue
        prev = next((e for e in reversed(events) if e.get("Field") == field), None)
        prev_at = Na__Lantern__UtcSeconds(prev.get("Utc")) if prev else None
        if prev and prev.get("Code") == who["Code"] and prev_at is not None and now - prev_at <= NA__LANTERN__SESSION_GAP_S:
            prev["To"], prev["Utc"] = after, utc
            prev["Name"] = who["Name"] or prev.get("Name", "")
            if prev.get("From", "") == after:
                events.remove(prev)                                            # <-- Changed back: nothing changed after all
        else:
            events.append({"Utc": utc, "Code": who["Code"], "Name": who["Name"], "Field": field, "From": before, "To": after})

    stamp = dict(stamp)
    stamp[NA__LANTERN__S + "Description"] = NA__LANTERN__STAMP_NOTE
    stamp[NA__LANTERN__S + "SavedBy"] = who
    stamp[NA__LANTERN__S + "SavedUtc"] = utc
    stamp[NA__LANTERN__S + "EditSessions"] = sessions[-NA__LANTERN__KEEP_SESSIONS:]
    stamp[NA__LANTERN__S + "Events"] = events[-NA__LANTERN__KEEP_EVENTS:]
    return stamp
# ---------------------------------------------------------------

# FUNCTION | A Design's History as the History Panel Needs It (newest first)
# ------------------------------------------------------------
def Na__Lantern__HistoryOf(project_id: str, design: dict) -> dict:
    meta, stamp = Na__Lantern__Parts(design)
    created, saved = Na__Lantern__StampWho(stamp, "CreatedBy"), Na__Lantern__StampWho(stamp, "SavedBy")
    migrated = bool(stamp.get(NA__LANTERN__S + "MigratedFrom"))
    sessions = Na__Lantern__Sessions(stamp)

    editors = {}                                                               # <-- One row per person: sessions, saves, last seen
    for s in sessions:
        e = editors.setdefault(s.get("Code") or s.get("Name") or "?",
                               {"code": s.get("Code", ""), "name": s.get("Name", ""), "sessions": 0, "saves": 0, "lastUtc": ""})
        e["sessions"] += 1
        e["saves"] += int(s.get("Saves") or 0)
        e["lastUtc"] = max(e["lastUtc"], str(s.get("ToUtc") or ""))
        e["name"] = s.get("Name") or e["name"]

    return {
        "libraryId"           : project_id,
        "projectCode"         : meta.get(NA__LANTERN__M + "ProjectCode", ""),
        "projectName"         : meta.get(NA__LANTERN__M + "ProjectName", ""),
        "documentName"        : meta.get(NA__LANTERN__M + "DocumentName", ""),
        "createdBy"           : {"code": created.get("Code", ""), "name": created.get("Name", "")},
        "createdUtc"          : stamp.get(NA__LANTERN__S + "CreatedUtc", ""),
        "migrated"            : migrated,
        "migratedUtc"         : stamp.get(NA__LANTERN__S + "MigratedUtc", ""),
        "prototypeDateCreated": meta.get(NA__LANTERN__M + "DateCreated", "") if migrated else "",
        "modifiedBy"          : {"code": saved.get("Code", ""), "name": saved.get("Name", "")},
        "modifiedUtc"         : stamp.get(NA__LANTERN__S + "SavedUtc", ""),
        "sessions"            : [{"code": s.get("Code", ""), "name": s.get("Name", ""), "fromUtc": s.get("FromUtc", ""),
                                  "toUtc": s.get("ToUtc", ""), "saves": int(s.get("Saves") or 0)} for s in reversed(sessions)],
        "events"              : [{"utc": e.get("Utc", ""), "code": e.get("Code", ""), "name": e.get("Name", ""), "field": e.get("Field", ""),
                                  "from": e.get("From", ""), "to": e.get("To", "")} for e in reversed(Na__Lantern__Events(stamp))],
        "editors"             : sorted(editors.values(), key=lambda e: e["lastUtc"], reverse=True),
    }
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Per-User Settings Files
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Write a Per-User Settings File (atomic, 0664 like every file an API writes)
# ------------------------------------------------------------
def Na__Lantern__WriteUserConfig(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(tmp, 0o664)
    except OSError:
        pass
    os.replace(tmp, path)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Routes - Health and Library Indexes (no sign-in)
# -----------------------------------------------------------------------------

# FUNCTION | Health
# ------------------------------------------------------------
@app.get("/api/health")
def Na__Lantern__Health():
    return jsonify({"ok": True, "app": NA__LANTERN__APP})
# ---------------------------------------------------------------

# FUNCTION | The Component Index, Profile Index and Asset Registry (read-only app files)
# ------------------------------------------------------------
def Na__Lantern__Index(name: str):
    path = NA__LANTERN__APP_DIR / NA__LANTERN__INDEXES[name]
    if not path.is_file():
        return Na__Lantern__Error(404, f"{name} not found. Run the matching builder in 60__Dev__WebBuildUtils.")
    try:
        return jsonify({"ok": True, "data": json.loads(path.read_text(encoding="utf-8"))})
    except (OSError, ValueError) as e:
        return Na__Lantern__Error(500, f"{name} could not be read: {e}")

@app.get("/api/component-index")
def Na__Lantern__ComponentIndex():
    return Na__Lantern__Index("component-index")

@app.get("/api/profile-index")
def Na__Lantern__ProfileIndex():
    return Na__Lantern__Index("profile-index")

@app.get("/api/asset-registry")
def Na__Lantern__AssetRegistry():
    return Na__Lantern__Index("asset-registry")
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Routes - Designs
# -----------------------------------------------------------------------------

# FUNCTION | Every Design in the Library (light records, newest first)
# ------------------------------------------------------------
@app.get("/api/projects")
@Na__Auth__Require("Affiliate")
def Na__Lantern__List():
    out = []
    for project_id, folder in Na__Library__ListProjects():
        path = Na__Lantern__DesignPath(folder)
        if not path.is_file():
            continue
        summary = Na__Lantern__Cached("designs", path, lambda d, st, pid=project_id, f=folder: Na__Lantern__Summary(pid, f, d, st))
        if summary:
            out.append(summary)
    out.sort(key=lambda s: s["_mtime"], reverse=True)
    return jsonify({"ok": True, "data": [{k: v for k, v in s.items() if k != "_mtime"} for s in out]})
# ---------------------------------------------------------------

# FUNCTION | One Design
# ------------------------------------------------------------
@app.get("/api/projects/<project_id>")
@Na__Auth__Require("Affiliate")
def Na__Lantern__Get(project_id):
    folder, _, design, err = Na__Lantern__Load(project_id)
    if err:
        return err
    design = Na__Lantern__Keyed(design, folder.name)
    return jsonify({"ok": True, "data": design, "rev": int(design.get("_rev", 0) or 0)})
# ---------------------------------------------------------------

# FUNCTION | One Design's History: Who Created It, Who Saved It Last, Sessions and Changes
# ------------------------------------------------------------
@app.get("/api/projects/<project_id>/history")
@Na__Auth__Require("Affiliate")
def Na__Lantern__History(project_id):
    folder = Na__Library__Find(project_id)
    if folder is None:
        return Na__Lantern__Error(404, f"No project {project_id!r} in the library.")
    path = Na__Lantern__DesignPath(folder)
    if not path.is_file():
        return Na__Lantern__Error(404, f"{folder.name} has no Lantern design.")
    history = Na__Lantern__Cached("history", path, lambda d, st, pid=folder.name: Na__Lantern__HistoryOf(pid, d))
    if history is None:
        return Na__Lantern__Error(500, f"The design in {folder.name} could not be read.")
    return jsonify({"ok": True, "data": history})
# ---------------------------------------------------------------

# FUNCTION | Create a Design (in a library project, or a new one)
# ------------------------------------------------------------
@app.post("/api/projects")
@Na__Auth__Require("Employee")
def Na__Lantern__Create():
    body = request.get_json(silent=True) or {}
    design = body.get("project")
    target = body.get("library") if isinstance(body.get("library"), dict) else {}
    if not isinstance(design, dict) or not isinstance(design.get(NA__LANTERN__META), dict):
        return Na__Lantern__Error(400, "The design is missing its metadata.")
    user = Na__Auth__CurrentUser()
    made_project = False

    if target.get("id"):
        folder = Na__Library__Find(str(target["id"]))
        if folder is None or any(t in folder.name for t in NA__LANTERN__NOT_A_PROJECT):
            return Na__Lantern__Error(404, f"No project {target['id']!r} in the library.")
        record = Na__Library__ReadJson(folder / f"ProjectData__{folder.name}__.json") or {}
    else:
        spec = target.get("newProject") if isinstance(target.get("newProject"), dict) else {}
        code, name = str(spec.get("code") or "").strip(), str(spec.get("name") or "").strip()
        try:
            project_id = Na__Library__NewProjectId(code, name)
        except ValueError as e:
            return Na__Lantern__Error(400, str(e))
        if Na__Library__Find(project_id):
            return Na__Lantern__Error(409, f"{project_id} is already in the library: pick it from the list instead.", libraryId=project_id)
        record = Na__Library__NewRecord(code, name, NA__LANTERN__PROJECT_TYPE)
        try:
            folder = Na__Library__CreateProject(project_id, record, user["code"])
        except FileExistsError:
            return Na__Lantern__Error(409, f"{project_id} is already in the library: pick it from the list instead.", libraryId=project_id)
        except (OSError, ValueError) as e:
            return Na__Lantern__Error(500, f"The project could not be added to the library: {e}")
        made_project = True

    path = Na__Lantern__DesignPath(folder)
    with Na__Library__Locked(path):
        if path.is_file():
            return Na__Lantern__Error(409, f"{folder.name} already has a Lantern design: open it from the list.", libraryId=folder.name)
        design = Na__Lantern__Keyed(dict(design), folder.name)
        meta = design[NA__LANTERN__META]
        if not str(meta.get(NA__LANTERN__M + "ProjectCode") or "").strip():
            meta[NA__LANTERN__M + "ProjectCode"] = str(record.get("projectCode") or folder.name.split("__")[0])
        if not str(meta.get(NA__LANTERN__M + "ProjectName") or "").strip():
            meta[NA__LANTERN__M + "ProjectName"] = record.get("projectNameAlias") or record.get("projectName") or folder.name
        design.pop("_rev", None)
        design[NA__LANTERN__STAMP] = Na__Lantern__NewStamp(user, Na__Lantern__Now())   # <-- Whatever stamp the app sent is replaced
        res = Na__Library__WriteJson(path, design, user["code"], folder)
    design["_rev"] = res["rev"]
    Na__Activity__Record(NA__LANTERN__ACTIVITY, "project.create",
                         ("Added the project to the library and started its Lantern design" if made_project
                          else "Started a Lantern design"),
                         project=folder.name, target=meta.get(NA__LANTERN__M + "ProjectName", ""))
    return jsonify({"ok": True, "libraryId": folder.name, "year": Na__Library__Year(folder), "rev": res["rev"],
                    "createdProject": made_project, "data": design})
# ---------------------------------------------------------------

# FUNCTION | Save a Design (the whole design, "_rev" checked)
# ------------------------------------------------------------
@app.post("/api/projects/<project_id>")
@Na__Auth__Require("Employee")
def Na__Lantern__Save(project_id):
    folder = Na__Library__Find(project_id)
    if folder is None:
        return Na__Lantern__Error(404, f"No project {project_id!r} in the library.")
    path = Na__Lantern__DesignPath(folder)
    design = request.get_json(silent=True)
    if not isinstance(design, dict) or not isinstance(design.get(NA__LANTERN__META), dict):
        return Na__Lantern__Error(400, "The design is missing its metadata.")
    if "_rev" not in design:
        return Na__Lantern__Error(400, "A save must say which version it was made from (_rev). Reload the app.")
    try:
        expected = int(design.pop("_rev") or 0)
    except (TypeError, ValueError):
        return Na__Lantern__Error(400, "_rev must be a number.")
    user = Na__Auth__CurrentUser()
    source = str(request.headers.get("X-VghLantern-UpdateSource") or "unspecified")[:60]

    with Na__Library__Locked(path):                                            # <-- The check, the stamp and the write are one step
        current = Na__Library__ReadJson(path)
        if not isinstance(current, dict):
            return Na__Lantern__Error(404, f"{folder.name} has no Lantern design (it may have been deleted).")
        current_rev = int(current.get("_rev", 0) or 0)
        old_meta, stamp = Na__Lantern__Parts(current)
        if expected != current_rev:
            saved_by = Na__Lantern__StampWho(stamp, "SavedBy").get("Name", "")
            return Na__Lantern__Error(409, "This design was saved by " + (saved_by or "someone else") +
                                      " since you opened it.", rev=current_rev, savedBy=saved_by,
                                      data=Na__Lantern__Keyed(current, folder.name))
        design = Na__Lantern__Keyed(design, folder.name)
        design[NA__LANTERN__STAMP] = Na__Lantern__RecordEdit(stamp, user, old_meta, design[NA__LANTERN__META],
                                                             Na__Lantern__Now())  # <-- From the file on disk: the app's copy of the stamp is never trusted
        try:
            res = Na__Library__WriteJson(path, design, user["code"], folder, expected_rev=current_rev,
                                         keep_revisions=NA__LANTERN__KEEP_REVISIONS,
                                         revision_every_s=NA__LANTERN__REVISION_EVERY_S)
        except Na__Library__Conflict as c:
            return Na__Lantern__Error(409, "This design was saved by someone else since you opened it.",
                                      rev=int(c.current.get("_rev", 0) or 0), data=Na__Lantern__Keyed(c.current, folder.name))
    if Na__Lantern__ShouldLogEdit(user["code"], folder.name, source):
        meta = design[NA__LANTERN__META]
        Na__Activity__Record(NA__LANTERN__ACTIVITY, "project.save",
                             "Saved the Lantern design" if source.startswith("manual:") else "Edited the Lantern design",
                             project=folder.name, target=meta.get(NA__LANTERN__M + "ProjectName", ""),
                             detail={"source": source})
    return jsonify({"ok": True, "rev": res["rev"]})
# ---------------------------------------------------------------

# FUNCTION | Delete a Design (never the library project)
# ------------------------------------------------------------
@app.delete("/api/projects/<project_id>")
@Na__Auth__Require("Employee")
def Na__Lantern__Delete(project_id):
    folder = Na__Library__Find(project_id)
    if folder is None:
        return Na__Lantern__Error(404, f"No project {project_id!r} in the library.")
    path = Na__Lantern__DesignPath(folder)
    user = Na__Auth__CurrentUser()
    with Na__Library__Locked(path):
        design = Na__Library__ReadJson(path)
        if not isinstance(design, dict):
            return Na__Lantern__Error(404, f"{folder.name} has no Lantern design.")
        if not Na__Lantern__CanDelete(user, design):
            return Na__Lantern__Error(403, "Only the person who started this design, or Management, can delete it.")
        rev_dir = folder / "ProjectData__Revisions" / NA__LANTERN__DESIGN_DIR / path.stem  # <-- The last version is kept, like every save's
        rev_dir.mkdir(parents=True, exist_ok=True)
        who = re.sub(r"[^A-Za-z0-9]", "", user.get("code") or "") or "unknown"
        (rev_dir / f"{time.strftime('%Y%m%d-%H%M%S')}__rev{int(design.get('_rev', 0) or 0)}__{who}__Deleted.json").write_bytes(path.read_bytes())
        path.unlink()
    meta = design.get(NA__LANTERN__META) if isinstance(design.get(NA__LANTERN__META), dict) else {}
    Na__Activity__Record(NA__LANTERN__ACTIVITY, "project.delete", "Deleted the Lantern design (the library project is kept)",
                         project=folder.name, target=meta.get(NA__LANTERN__M + "ProjectName", ""))
    return jsonify({"ok": True})
# ---------------------------------------------------------------

# FUNCTION | Library Projects a Design Can Go In
# ------------------------------------------------------------
@app.get("/api/library")
@Na__Auth__Require("Affiliate")
def Na__Lantern__Library():
    code = (request.args.get("code") or "").strip().lower()
    words = [w for w in (request.args.get("q") or "").strip().lower().split() if w]
    out = []
    for project_id, folder in Na__Library__ListProjects():
        if any(t in project_id for t in NA__LANTERN__NOT_A_PROJECT):
            continue
        first = project_id.split("__")[0].lower()
        if code and code not in (first, first.split("-")[-1]):
            continue
        record_path = folder / f"ProjectData__{project_id}__.json"
        rec = Na__Lantern__Cached("records", record_path, Na__Lantern__RecordSummary) or {}
        text = (project_id + " " + rec.get("projectName", "")).lower()
        if words and not all(w in text for w in words):
            continue
        out.append({"id": project_id, "year": Na__Library__Year(folder), **rec,
                    "hasDesign": Na__Lantern__DesignPath(folder).is_file()})
    return jsonify({"ok": True, "data": out})
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Routes - Per-User Settings
# -----------------------------------------------------------------------------

# HELPER FUNCTION | This Person's Settings File, or a Refusal
# ------------------------------------------------------------
def Na__Lantern__UserConfigPath(slug: str):
    user = Na__Auth__CurrentUser()
    if slug not in ("me", user["code"]):
        return None, Na__Lantern__Error(403, "You can only read and save your own settings.")
    code = re.sub(r"[^A-Za-z0-9]", "", user["code"] or "")
    return NA__LANTERN__USERCFG_DIR / f"UserConfig__{code}__LanternDesigner__.json", None
# ---------------------------------------------------------------

# FUNCTION | Read My Settings (404 until first saved: the app uses its defaults)
# ------------------------------------------------------------
@app.get("/api/user-menu-config/<slug>")
@Na__Auth__Require("Affiliate")
def Na__Lantern__UserConfigGet(slug):
    path, err = Na__Lantern__UserConfigPath(slug)
    if err:
        return err
    data = Na__Library__ReadJson(path)
    if not isinstance(data, dict):
        return Na__Lantern__Error(404, "User menu config not found")
    return jsonify({"ok": True, "data": data})
# ---------------------------------------------------------------

# FUNCTION | Save My Settings
# ------------------------------------------------------------
@app.post("/api/user-menu-config/<slug>")
@Na__Auth__Require("Affiliate")
def Na__Lantern__UserConfigSave(slug):
    path, err = Na__Lantern__UserConfigPath(slug)
    if err:
        return err
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return Na__Lantern__Error(400, "The settings must be a JSON object.")
    with Na__Library__Locked(path):
        Na__Lantern__WriteUserConfig(path, data)
    return jsonify({"ok": True})
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
