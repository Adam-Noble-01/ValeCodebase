"""
=============================================================================
 VALE SHARED API - ACTIVITY LEDGER (WHO DID WHAT, IN WHICH APP, FROM WHERE)
=============================================================================

FILE       : ValeShared__Activity__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : One append-only ledger of the important things people do in the
             Vale apps: signing in, opening apps and projects, saving, publishing,
             making links, and who opens those links. Written by every app's API;
             read by the Vale Virtual Server Manager (tab 05, User activity).
CREATED    : 08-Oct-2026

DESCRIPTION:
- THE LEDGER: $VALE_ROOT/Server__UserAccountData/UserData__ActivityLedger/
  ValeActivity__Ledger__<yyyy-mm-dd>__.jsonl, one file per UTC day, one JSON
  object per line. Server__ folders are never web-served; UserData__ puts it in
  the user-data lane, so Collect (and tab 05's Fetch) brings it to the PC.
  Files are 0660 (owner and group vale), like the users register.
- ONE LINE PER EVENT, written whole with one append under an exclusive lock:
  every API runs two gunicorn workers and several services write the same day.
- NEVER IN THE WAY: a ledger that cannot be written is reported on stderr
  (journald) and the request carries on. Logging never fails a save.
- WHO: the signed-in user from the shared session cookie, recorded as they were
  at that moment (code, name, level, role, department). No session: a guest,
  shown as "External" in the Server Manager.
- WHERE FROM: the visitor's IP from Cloudflare (CF-Connecting-IP, then nginx's
  X-Real-IP, then the socket), Cloudflare's country (CF-IPCountry), a short
  device description from the User-Agent, and the browser's device id: the
  "vale_device" cookie set by ValeShared__ActivityLog__.js. The id is random,
  says nothing about the person, and tells two visitors on one IP apart.
- WHAT ONLY THE BROWSER SEES (an app opened, a project opened, a video played, a
  link copied) arrives at POST /api/activity: Na__Activity__Blueprint, mounted
  by every app API. Only the actions in NA__ACTIVITY__CLIENT_ACTIONS are taken,
  for the apps in NA__ACTIVITY__APPS; fields are trimmed; each address may send
  NA__ACTIVITY__CLIENT_LIMIT events in NA__ACTIVITY__CLIENT_WINDOW_S.
- A YEAR LIVE, THEN ARCHIVED: when a new day's file is started, every month
  whose days are all more than NA__ACTIVITY__KEEP_DAYS (365) days old is added to
  00__Archive/ServerLogs__<yyyy>__Archived__.zip, as a folder named for the month
  (2025-09/ValeActivity__Ledger__2025-09-14__.jsonl ...). The zip is written as a
  copy, read back byte for byte, then put in place; only then are that month's
  day files removed. One process at a time (a lock file); a failure leaves the
  day files and is tried again the next day. The Server Manager brings the zips
  down and unzips a month into its audit cache when Adam audits it.
- ON THIS PC (VALE_DEV=1) the ledger goes to a temp folder, never into the
  mirror: local test events must never look like newer user data to Collect.
  VALE_ACTIVITY_DIR overrides the folder anywhere (tests).

LINE (keys always in this order; absent keys are left out):
  Utc       "2026-10-08T11:00:05Z"
  App       "ValeVision Theia"                 the app's display name
  Action    "link.create"                      area.verb (see the Server Manager's tab 05)
  Text      "Generated a client link"          what happened, in words
  Ok        false                              only on refusals (a failed sign-in, a dead link)
  Project   "64135__Holt"                      the library folder id
  Target    "Mr and Mrs Holt"                  what it acted on (a link label, video, scene)
  Link      "<share token>"                    a generated link's token (create, open, revoke)
  Detail    {...}                              a few small facts (counts, expiry, what changed)
  User      {"Code", "Name", "Level", "Role", "Dept"}       signed in only
  Ip, Country, Device, DeviceId, Mode           Mode: "Installed app" / "Browser" (client events)

USAGE (in an app's API):
  from ValeShared__Activity__ import Na__Activity__Blueprint, Na__Activity__Record
  app.register_blueprint(Na__Activity__Blueprint, url_prefix="/api/activity")
  Na__Activity__Record("ValeVision Theia", "link.create", "Generated a client link",
                       project=folder.name, target=label, link=token, detail={"expiresIso": ...})

ENVIRONMENT:
  VALE_ROOT          the mirror / server root (default: two folders above this file)
  VALE_DEV=1         local development: the ledger goes to <temp>/Vale__DevActivityLedger
  VALE_ACTIVITY_DIR  the ledger folder (overrides both)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
08-Oct-2026 - Version 1.1.0
- A year live, then archived: Na__Activity__Archive (above), started by the first
  line of each new day. More browser actions for ValeVision 3D and ValeVision
  Gallery (NA__ACTIVITY__CLIENT_ACTIONS).

08-Oct-2026 - Version 1.0.0
- Initial build: the ledger, server-side events from every API, and the client
  route for what only the browser sees.

=============================================================================
"""

from __future__ import annotations

import calendar
import json
import os
import re
import shutil
import sys
import tempfile
import threading
import time
import zipfile
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from ValeShared__Auth__ import Na__Auth__CurrentRecord

try:
    import fcntl                                                               # <-- The server (Linux)
except ImportError:                                                            # <-- This PC: one process, O_APPEND is enough
    fcntl = None

Na__Activity__Blueprint = Blueprint("vale_activity", __name__)


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__ACTIVITY__ROOT                = Path(os.environ.get("VALE_ROOT") or Path(__file__).resolve().parents[2])
NA__ACTIVITY__REL                 = Path("Server__UserAccountData") / "UserData__ActivityLedger"
NA__ACTIVITY__FILE                = "ValeActivity__Ledger__{day}__.jsonl"      # <-- One per UTC day (yyyy-mm-dd)
NA__ACTIVITY__DAY                 = re.compile(r"^ValeActivity__Ledger__(\d{4}-\d{2}-\d{2})__\.jsonl$")
NA__ACTIVITY__KEEP_DAYS           = 365                                        # <-- Day files kept this long, then archived by month
NA__ACTIVITY__ARCHIVE_DIR         = "00__Archive"
NA__ACTIVITY__ARCHIVE             = "ServerLogs__{year}__Archived__.zip"       # <-- One per year; a folder per month inside
NA__ACTIVITY__DEVICE_COOKIE       = "vale_device"                              # <-- Set by ValeShared__ActivityLog__.js
NA__ACTIVITY__DEVICE              = re.compile(r"^([A-Za-z0-9]{12,32})(?:\.([a-z]{2,12}))?$")
NA__ACTIVITY__TOKEN               = re.compile(r"^[A-Za-z0-9_-]{16,64}$")       # <-- A share link's token (Theia's: 24 characters)
NA__ACTIVITY__TEXT_MAX            = 200
NA__ACTIVITY__FIELD_MAX           = 160
NA__ACTIVITY__CLIENT_LIMIT        = 120                                        # <-- Client events per address ...
NA__ACTIVITY__CLIENT_WINDOW_S     = 600                                        # <-- ... in 10 minutes
NA__ACTIVITY__CLIENT_SEEN         = {}                                         # <-- address -> [times]
NA__ACTIVITY__THROTTLE_LOCK       = threading.Lock()
NA__ACTIVITY__WARNED              = {"at": 0.0}

# The apps a browser may report for (key sent by the page -> name in the ledger)
NA__ACTIVITY__APPS                = {"gallery": "ValeVision Gallery", "valevision3d": "ValeVision 3D",
                                     "theia": "ValeVision Theia", "help": "ValeVision Help",
                                     "valespec": "ValeSpec", "lantern": "Lantern Designer"}

# What a browser may report, and how it reads in the ledger ({app}, {target} filled in)
NA__ACTIVITY__CLIENT_ACTIONS      = {
    "app.open"     : "Opened {app}",
    "app.resume"   : "Came back to {app}",
    "project.open" : "Opened a project",
    "view.open"    : "Opened {target}",
    "view.mode"    : "Switched to {target}",
    "scene.view"   : "Viewed a presentation scene",
    "drawing.view" : "Opened a drawing",
    "project.edit" : "Opened a project in the editor",
    "app.switch"   : "Opened the project in {target}",
    "tool.use"     : "Used {target}",
    "search.use"   : "Searched",
    "report.create": "Made a report",
    "video.play"   : "Played a video",
    "video.preview": "Previewed a video path",
    "model.open"   : "Opened the 3D model",
    "link.copy"    : "Copied a link",
    "link.email"   : "Made a project link email",
    "link.qr"      : "Showed a QR code",
    "file.download": "Downloaded a file",
    "file.print"   : "Printed {target}",
}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Who and Where
# -----------------------------------------------------------------------------

# HELPER FUNCTION | The Ledger Folder (dev and tests never write into the mirror)
# ------------------------------------------------------------
def Na__Activity__Dir() -> Path:
    if os.environ.get("VALE_ACTIVITY_DIR"):
        return Path(os.environ["VALE_ACTIVITY_DIR"])
    if os.environ.get("VALE_DEV") == "1":
        return Path(tempfile.gettempdir()) / "Vale__DevActivityLedger"
    return NA__ACTIVITY__ROOT / NA__ACTIVITY__REL
# ---------------------------------------------------------------

# HELPER FUNCTION | This API's App Name (each wsgi.py sets VALE_ACTIVITY_APP: "ValeVision Theia")
# ------------------------------------------------------------
def Na__Activity__AppName() -> str:
    return current_app.config.get("VALE_ACTIVITY_APP") or current_app.name
# ---------------------------------------------------------------

# HELPER FUNCTION | Caller Address (Cloudflare, then nginx, then the socket)
# ------------------------------------------------------------
def Na__Activity__Address() -> str:
    return (request.headers.get("CF-Connecting-IP") or request.headers.get("X-Real-IP")
            or request.remote_addr or "")[:64]
# ---------------------------------------------------------------

# HELPER FUNCTION | Short Device Description From the User-Agent ("iPad · Safari")
# ------------------------------------------------------------
def Na__Activity__Device(kind: str = "") -> str:
    ua = request.headers.get("User-Agent") or ""
    if not ua:
        return ""
    if kind == "ipad" or "iPad" in ua:
        os_name = "iPad"                                                       # <-- iPadOS Safari says "Macintosh": the page tells us
    elif "iPhone" in ua:
        os_name = "iPhone"
    elif "Android" in ua:
        os_name = "Android"
    elif "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "Mac"
    elif "CrOS" in ua:
        os_name = "ChromeOS"
    elif "Linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Other"
    for token, name in (("Edg/", "Edge"), ("EdgiOS", "Edge"), ("SamsungBrowser", "Samsung Internet"), ("OPR/", "Opera"),
                        ("Firefox/", "Firefox"), ("FxiOS", "Firefox"), ("CriOS", "Chrome"), ("Chrome/", "Chrome"),
                        ("Safari/", "Safari")):
        if token in ua:
            return f"{os_name} · {name}"
    if re.search(r"bot|crawl|spider|preview|curl|python|wget", ua, re.I):
        return f"{os_name} · robot"
    return os_name
# ---------------------------------------------------------------

# HELPER FUNCTION | The Browser's Device Id and Kind (from the vale_device cookie)
# ------------------------------------------------------------
def Na__Activity__DeviceCookie() -> tuple:
    m = NA__ACTIVITY__DEVICE.match(request.cookies.get(NA__ACTIVITY__DEVICE_COOKIE) or "")
    return (m.group(1), m.group(2) or "") if m else ("", "")
# ---------------------------------------------------------------

# HELPER FUNCTION | A Register Record as the Ledger Keeps It (never the hash)
# ------------------------------------------------------------
def Na__Activity__UserOf(rec: dict | None) -> dict | None:
    if not rec:
        return None
    name = f"{rec.get('ValeUser__Name__First') or ''} {rec.get('ValeUser__Name__Last') or ''}".strip()
    return {"Code": rec.get("ValeUser__UniqueCode") or "", "Name": name,
            "Level": rec.get("ValeUser__Permission__Level") or "", "Role": rec.get("ValeUser__Employee__Role") or "",
            "Dept": rec.get("ValeUser__Employee__Department") or ""}
# ---------------------------------------------------------------

# HELPER FUNCTION | Trim a Value for the Ledger (short text, small dicts)
# ------------------------------------------------------------
def Na__Activity__Clip(value, limit: int = NA__ACTIVITY__FIELD_MAX):
    if value is None or isinstance(value, bool) or isinstance(value, (int, float)):
        return value
    if isinstance(value, dict):
        return {str(k)[:40]: Na__Activity__Clip(v, limit) for k, v in list(value.items())[:12]}
    if isinstance(value, (list, tuple)):
        return [Na__Activity__Clip(v, limit) for v in list(value)[:12]]
    text = re.sub(r"[\x00-\x1f\x7f]+", " ", str(value)).strip()
    return text[:limit]
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Writing the Ledger
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Append One Line to Today's File (exclusive lock; one write)
# ------------------------------------------------------------
def Na__Activity__Append(day: str, line: str) -> None:
    folder = Na__Activity__Dir()
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / NA__ACTIVITY__FILE.format(day=day)
    new_day = not path.exists()
    fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o660)
    try:
        if fcntl:
            fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, line.encode("utf-8"))
    finally:
        if fcntl:
            fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    if new_day:
        Na__Activity__Archive(day)                                             # <-- Once a day: months past the year go to the zip
# ---------------------------------------------------------------

# FUNCTION | Record One Event (never raises: a ledger problem never fails the request)
# ------------------------------------------------------------
def Na__Activity__Record(app: str, action: str, text: str, *, project: str = "", target: str = "", link: str = "",
                         detail: dict | None = None, ok: bool = True, user_rec: dict | None = None,
                         as_guest: bool = False, mode: str = "") -> None:
    """user_rec: the register record when the session cookie does not name the person yet
    (sign-in) or no longer does (sign-out). as_guest: record without a user even if signed in."""
    try:
        now = time.gmtime()
        rec = None if as_guest else (user_rec or Na__Auth__CurrentRecord())
        device_id, kind = Na__Activity__DeviceCookie()
        event = {"Utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", now), "App": Na__Activity__Clip(app, 40),
                 "Action": action, "Text": Na__Activity__Clip(text, NA__ACTIVITY__TEXT_MAX)}
        if not ok:
            event["Ok"] = False
        for key, value in (("Project", project), ("Target", target), ("Link", link)):
            if value:
                event[key] = Na__Activity__Clip(value)
        if detail:
            event["Detail"] = Na__Activity__Clip(detail)
        user = Na__Activity__UserOf(rec)
        if user:
            event["User"] = user
        for key, value in (("Ip", Na__Activity__Address()), ("Country", (request.headers.get("CF-IPCountry") or "")[:4]),
                           ("Device", Na__Activity__Device(kind)), ("DeviceId", device_id), ("Mode", mode)):
            if value:
                event[key] = value
        Na__Activity__Append(time.strftime("%Y-%m-%d", now),
                             json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
    except Exception as e:                                                     # <-- Never in the way of the request
        if time.time() - NA__ACTIVITY__WARNED["at"] > 60:
            NA__ACTIVITY__WARNED["at"] = time.time()
            print(f" [ACTIVITY] ledger not written ({type(e).__name__}: {e})", file=sys.stderr, flush=True)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Archive (a year of day files, then a zip per year, a folder per month)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | The Months Whose Every Day Is More Than a Year Old ({"2025-09": [day files]})
# ------------------------------------------------------------
def Na__Activity__DueMonths(folder: Path, today: str = "") -> dict:
    today = today or time.strftime("%Y-%m-%d", time.gmtime())
    t = time.strptime(today, "%Y-%m-%d")
    cutoff = time.strftime("%Y-%m-%d", time.gmtime(calendar.timegm(t) - NA__ACTIVITY__KEEP_DAYS * 86400))
    due = {}
    for f in sorted(folder.glob("ValeActivity__Ledger__*__.jsonl")):
        m = NA__ACTIVITY__DAY.match(f.name)
        if not m or not f.is_file():
            continue
        year, month = int(m.group(1)[:4]), int(m.group(1)[5:7])
        last_day = f"{m.group(1)[:7]}-{calendar.monthrange(year, month)[1]:02d}"
        if last_day < cutoff:                                                  # <-- The whole month is past the year
            due.setdefault(m.group(1)[:7], []).append(f)
    return due
# ---------------------------------------------------------------

# HELPER FUNCTION | Add One Month's Day Files to Its Year's Zip (a checked copy replaces the zip)
# ------------------------------------------------------------
def Na__Activity__ZipMonth(folder: Path, month: str, files: list) -> list:
    """Returns the day files now safely in the zip. Never removes anything itself."""
    archive_dir = folder / NA__ACTIVITY__ARCHIVE_DIR
    archive_dir.mkdir(exist_ok=True)
    target = archive_dir / NA__ACTIVITY__ARCHIVE.format(year=month[:4])
    tmp = target.with_name(target.name + ".w.tmp")                             # <-- *.tmp never syncs
    if target.exists() and not zipfile.is_zipfile(target):
        raise RuntimeError(f"{target.name} is damaged: left as it is, and nothing archived")
    if target.exists():
        shutil.copy2(target, tmp)
    elif tmp.exists():
        tmp.unlink()
    added = {}
    with zipfile.ZipFile(tmp, "a", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        names = set(z.namelist())
        for f in files:
            data = f.read_bytes()
            arc = f"{month}/{f.name}"
            if arc in names and z.read(arc) == data:
                added[arc] = (f, data)                                         # <-- Already there (a run cut short): just tidy
                continue
            n = 2
            while arc in names:                                                # <-- Never overwrite a member: keep both
                arc = f"{month}/{f.name[:-len('__.jsonl')]}__part{n}__.jsonl"
                n += 1
            info = zipfile.ZipInfo(arc, date_time=time.localtime(f.stat().st_mtime)[:6])
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data, compresslevel=9)
            names.add(arc)
            added[arc] = (f, data)
    with zipfile.ZipFile(tmp) as z:                                            # <-- Prove every byte is in before anything goes
        if z.testzip() is not None or any(z.read(arc) != data for arc, (_f, data) in added.items()):
            raise RuntimeError(f"{tmp.name}: the zip did not read back")
    os.chmod(tmp, 0o660)
    os.replace(tmp, target)
    return [f for f, _data in added.values()]
# ---------------------------------------------------------------

# FUNCTION | Archive Every Month That Is Due (one process at a time; never raises)
# ------------------------------------------------------------
def Na__Activity__Archive(today: str = "") -> list:
    """Day files of months more than a year old go into 00__Archive/ServerLogs__<yyyy>__Archived__.zip
    (a folder per month), and only then are removed. Runs when a new day's file is started."""
    done = []
    folder = Na__Activity__Dir()
    lock = None
    try:
        if not folder.is_dir():
            return done
        due = Na__Activity__DueMonths(folder, today)
        if not due:
            return done
        lock = open(folder / ".ValeActivity__Archive.lock", "a")                # <-- *.lock never syncs
        if fcntl:
            try:
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                return done                                                    # <-- Another worker is archiving now
        for month, files in sorted(Na__Activity__DueMonths(folder, today).items()):
            for f in Na__Activity__ZipMonth(folder, month, files):
                f.unlink()
            done.append(month)
            print(f" [ACTIVITY] archived {month} ({len(files)} day file(s)) into "
                  f"{NA__ACTIVITY__ARCHIVE_DIR}/{NA__ACTIVITY__ARCHIVE.format(year=month[:4])}", file=sys.stderr, flush=True)
    except Exception as e:                                                     # <-- The day files stay; tried again tomorrow
        print(f" [ACTIVITY] archive not made ({type(e).__name__}: {e})", file=sys.stderr, flush=True)
    finally:
        if lock:
            if fcntl:
                try:
                    fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
                except OSError:
                    pass
            lock.close()
    return done
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | What Changed in a Saved Record (for "Saved video paths: created 'Garden walk'")
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Items With an Id Anywhere Inside a Value ({id: (name, json)})
# ------------------------------------------------------------
def Na__Activity__Items(value, out: dict | None = None, depth: int = 0) -> dict:
    out = {} if out is None else out
    if depth > 6:
        return out
    if isinstance(value, dict):
        for k, v in value.items():
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        ident = next((item[x] for x in item if x.endswith("__Id") and isinstance(item[x], (str, int))), None)
                        if ident is not None:
                            name = next((item[x] for x in item if x.endswith(("__Name", "__Title", "__Label"))
                                         and isinstance(item[x], str) and item[x].strip()), "")
                            out[f"{k}:{ident}"] = (str(name or ident), json.dumps(item, sort_keys=True))
                        Na__Activity__Items(item, out, depth + 1)
            elif isinstance(v, dict):
                Na__Activity__Items(v, out, depth + 1)
    return out
# ---------------------------------------------------------------

# FUNCTION | Describe the Changed Top-Level Keys of a Record
# ------------------------------------------------------------
def Na__Activity__Changes(before: dict | None, after: dict | None, labels: dict, removed_keys=()) -> list:
    """labels: {top-level key: "video paths"}; unknown keys count as "other settings".
    Returns [{"What": "video paths", "Added": [...names], "Removed": [...], "Changed": n}] for
    every key whose value differs, so "Saved video paths: created 'Garden walk'"."""
    before, after = before or {}, after or {}
    out, other = [], 0
    for key in list(after.keys()) + [k for k in removed_keys if k in before]:
        if key.startswith("_") or before.get(key) == after.get(key):
            continue
        what = labels.get(key)
        if not what:
            other += 1
            continue
        old, new = Na__Activity__Items(before.get(key)), Na__Activity__Items(after.get(key))
        added = [new[i][0] for i in new if i not in old]
        removed = [old[i][0] for i in old if i not in new]
        changed = sum(1 for i in new if i in old and new[i][1] != old[i][1])
        out.append({"What": what, "Added": added[:8], "Removed": removed[:8], "Changed": changed})
    if other:
        out.append({"What": "other settings", "Added": [], "Removed": [], "Changed": other})
    return out

def Na__Activity__ChangesText(changes: list) -> str:
    """'video paths (created Garden walk), drawings' ..."""
    bits = []
    for c in changes:
        parts = []
        if c["Added"]:
            parts.append("created " + ", ".join(c["Added"][:3]) + ("…" if len(c["Added"]) > 3 else ""))
        if c["Removed"]:
            parts.append("removed " + ", ".join(c["Removed"][:3]) + ("…" if len(c["Removed"]) > 3 else ""))
        bits.append(c["What"] + (f" ({'; '.join(parts)})" if parts else ""))
    return ", ".join(bits)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Route: Events Only the Browser Sees
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Too Many Client Events From This Address?
# ------------------------------------------------------------
def Na__Activity__Throttled(addr: str) -> bool:
    now = time.time()
    with NA__ACTIVITY__THROTTLE_LOCK:
        if len(NA__ACTIVITY__CLIENT_SEEN) > 5000:                              # <-- Never grows without end
            NA__ACTIVITY__CLIENT_SEEN.clear()
        seen = [t for t in NA__ACTIVITY__CLIENT_SEEN.get(addr, []) if now - t < NA__ACTIVITY__CLIENT_WINDOW_S]
        if len(seen) >= NA__ACTIVITY__CLIENT_LIMIT:
            NA__ACTIVITY__CLIENT_SEEN[addr] = seen
            return True
        seen.append(now)
        NA__ACTIVITY__CLIENT_SEEN[addr] = seen
    return False
# ---------------------------------------------------------------

# FUNCTION | POST /api/activity  {app, action, project, target, mode, path}
# ------------------------------------------------------------
@Na__Activity__Blueprint.post("")
@Na__Activity__Blueprint.post("/")
def Na__Activity__ClientEvent():
    body = request.get_json(silent=True) or {}
    app_name = NA__ACTIVITY__APPS.get(str(body.get("app") or ""))
    action = str(body.get("action") or "")
    template = NA__ACTIVITY__CLIENT_ACTIONS.get(action)
    if not app_name or not template:
        return jsonify({"ok": False, "error": "unknown app or action"}), 400
    if Na__Activity__Throttled(Na__Activity__Address()):
        return jsonify({"ok": False, "error": "too many events"}), 429
    target = Na__Activity__Clip(body.get("target") or "", 120)
    project = str(body.get("project") or "")
    project = project if re.match(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$", project) else ""
    mode = {"standalone": "Installed app", "browser": "Browser"}.get(str(body.get("mode") or ""), "")
    detail = {}
    path = str(body.get("path") or "")
    if path.startswith("/") and not path.startswith("//"):
        detail["Path"] = path[:200]                                            # <-- A same-site path only (no other sites)
    if isinstance(body.get("detail"), dict):
        detail.update({str(k)[:30]: v for k, v in list(body["detail"].items())[:6]
                       if isinstance(v, (str, int, float, bool))})
    text = template.format(app=app_name, target=target or "a view")
    if action == "app.open" and mode == "Installed app":
        text += " (installed app)"
    link = str(body.get("link") or "")
    Na__Activity__Record(app_name, action, text, project=project, target=target if "{target}" not in template else "",
                         link=link if NA__ACTIVITY__TOKEN.match(link) else "", detail=detail or None, mode=mode)
    return jsonify({"ok": True})
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
