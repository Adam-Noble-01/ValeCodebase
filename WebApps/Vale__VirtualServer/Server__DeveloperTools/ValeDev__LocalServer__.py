#!/usr/bin/env python3
"""
=============================================================================
 VALE DEV - LOCAL SERVER (THE VPS ON THIS PC)
=============================================================================

FILE       : ValeDev__LocalServer__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Run the whole Vale__VirtualServer mirror on http://127.0.0.1:8030
             the way nginx + the Flask APIs run it on app.valegardenhouses.com,
             so every app is tested on this PC with the same URLs.
CREATED    : 06-Oct-2026

DESCRIPTION:
- Static files come from the mirror root, with the same "never served" rules
  as nginx: every /Server__ path, dot-files, .md .py .sh .env .log .example
  ..., and every UserData / UserConfig / ServerData / Revisions folder.
- App routes and short links come from the Server Manager's routes file
  (Vale__VirtualServerManager/01__AppData/VirtualServerManager__UrlRoutes__.json),
  exactly as tab 03 applies them: /<route>/ serves <App folder>/<entry>,
  /<route> redirects to /<route>/ keeping the query, short links redirect.
- Each app's API, Server__Api/Api__<App without "Vale__">/wsgi.py (a Flask
  `app`), is mounted in this process under /<route>/api/, so the page's
  relative fetch("api/...") works the same here and on the server. A route
  doesn't need its API proxy switched on in tab 03 to be mounted here.
- X-Accel-Redirect: /_internal/<path> from an API is served from the root,
  like nginx's internal location.
- THE LIBRARY GATE, as nginx's auth_request: a library file in an app route's
  LibraryProtected list (routes file) is sent only after that app's API answers
  GET /api/library-access with a 2xx, asked in this process with the browser's
  own headers and cookies and the file's path in X-Vale-Library-Path; a 401 or
  403 goes back as it is, any other answer is a 500. LibraryHidden folders, and
  the protected folders of a route switched off, are never served. The path is
  normalised first (slashes merged, dot segments resolved) as nginx's $uri is.
- Files stream with byte ranges (206 Partial Content), as nginx serves them:
  a video seeks, and a 1 GB file is never read into memory.
- A sandbox VALE_ROOT (for testing sign-ins and uploads) also holds library
  content: /Vale__Projects__MasterLibrary/... is served from the sandbox when
  the file is there and not empty, else from the mirror. So an upload made in a
  test plays back, and zero-byte placeholders still show the mirror's images.
- Development settings: VALE_ROOT = the mirror, VALE_DEV=1 (fixed session
  key) unless VALE_SECRET_KEY is set. Real data: it reads and writes the
  mirror itself, so a save here is a real change to push later.

USAGE:
  python ValeDev__LocalServer__.py [--port 8030] [--routes PATH]
  then open http://127.0.0.1:8030/project-gallery/

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
28-Oct-2026 - Version 1.2.0
- The library gate (see above): model files, project records and Theia videos
  open only for a Vale sign-in or a live client link to that project, as on
  the server. Library paths are normalised before any rule is read, and a
  backslash in a path is a 404 (on Windows it would have been a separator).
- The never-served rules are also read against the normalised path, so a
  /Vale__Projects__MasterLibrary/../Server__... path is refused as on nginx.

07-Oct-2026 - Version 1.1.0
- Byte ranges (werkzeug send_file, conditional): videos seek and stream, as on
  nginx. Needed by ValeVision Theia; models and images stream too.
- Sandbox-first library content when VALE_ROOT is not the mirror (see above).
- .mp4 / .m4v / .webp types named explicitly (Windows' own table may not know them).

06-Oct-2026 - Version 1.0.0
- Initial build (ValeVision Gallery and ValeVision 3D ports).

=============================================================================
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import json
import mimetypes
import os
import posixpath
import re
import sys
from pathlib import Path
from urllib.parse import quote, unquote

from werkzeug.serving import run_simple
from werkzeug.utils import send_file
from werkzeug.wrappers import Request, Response


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__DEV__ROOT                     = Path(__file__).resolve().parents[1]                     # <-- The mirror IS the server root
NA__DEV__ROUTES                   = NA__DEV__ROOT.parent / "Vale__VirtualServerManager" / "01__AppData" / "VirtualServerManager__UrlRoutes__.json"
NA__DEV__DENY                     = [re.compile(p, re.I) for p in (
                                     r"^/Server__",                                          # <-- every Server__ folder
                                     r"/\.",                                                 # <-- dot-files
                                     r"\.(md|py|pyc|sh|bat|ps1|env|log|bak|lock|tmp|example|code-workspace)$",
                                     r"/(?:[^/]*__)?(?:UserData|UserConfig|ServerData|Revisions)(?:__[^/]*)?/",
                                     r"^/_internal/")]
NA__DEV__VARIABLE                 = re.compile(r"^\{([a-z][a-z0-9_]*)\}$")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".jsx")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("video/mp4", ".m4v")
mimetypes.add_type("image/webp", ".webp")
NA__DEV__LIBRARY                  = "/Vale__Projects__MasterLibrary/"
NA__DEV__LIBRARY_PATTERN          = re.compile(r"^[A-Za-z0-9_.*-]+(?:/[A-Za-z0-9_.*-]+)*/?$")   # <-- A LibraryProtected / LibraryHidden entry
NA__DEV__GATE_ROUTE               = "/api/library-access"                    # <-- The app API's answer to nginx's auth_request
NA__DEV__GATE_HEADER              = "HTTP_X_VALE_LIBRARY_PATH"               # <-- X-Vale-Library-Path, as nginx sets it

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Loading Routes and APIs
# -----------------------------------------------------------------------------

# HELPER FUNCTION | One Regex for a List of Library Paths, Inside Every Project (the generator's own rule), or None
# ------------------------------------------------------------
# "ValeVision3D/Content__3dModel__GlbFiles/" is a folder and all it holds;
# "ProjectData__*.json" a file name, * standing for any characters but "/".
# ------------------------------------------------------------
def Na__Dev__LibraryRegex(patterns: list):
    alts = []
    for p in patterns or []:
        p = str(p).strip()
        if not NA__DEV__LIBRARY_PATTERN.match(p) or any(s in (".", "..") for s in p.rstrip("/").split("/")):
            raise SystemExit(f"routes file: {p!r} is not a library path (letters, digits, _ . - * and /)")
        body = "".join("[^/]*" if c == "*" else "\\." if c == "." else c for c in p)
        alts.append(body if p.endswith("/") else body + "$")
    return (re.compile("^/Vale__Projects__MasterLibrary/[^/]+/[^/]+/(?:" + "|".join(alts) + ")", re.I)   # <-- re.I: Windows names
            if alts else None)                                                 #     ignore case, so a lower-cased path is gated too
# ---------------------------------------------------------------

# FUNCTION | Load App Routes, Short Links, Each Route's Flask App and the Library Rules
# ------------------------------------------------------------
def Na__Dev__Load(routes_path: Path) -> tuple:
    data = json.loads(routes_path.read_text(encoding="utf-8"))
    apps, links, hidden = [], [], []
    for r in data.get("Routes", []):
        hidden += r.get("LibraryHidden") or []                                 # <-- Never served, whatever the route's state
        if not r.get("Enabled", True):
            hidden += r.get("LibraryProtected") or []                          # <-- A route switched off opens none of its files
            continue
        path = "/" + str(r.get("Path", "")).strip("/")
        if r.get("Type") == "app":
            target = NA__DEV__ROOT / r["Target"]
            api_file = NA__DEV__ROOT / "Server__Api" / f"Api__{r['Target'].replace('Vale__', '', 1)}" / "wsgi.py"
            api = None
            if api_file.is_file():
                spec = importlib.util.spec_from_file_location(f"vale_api_{api_file.parent.name}", api_file)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                api = module.app
            apps.append({"path": path, "target": target, "entry": r.get("Entry") or "index.html", "api": api,
                         "api_name": api_file.parent.name if api else "",
                         "gate": Na__Dev__LibraryRegex(r.get("LibraryProtected"))})
        elif r.get("Type") == "link":
            segs = [s for s in str(r["Path"]).strip("/").split("/") if s]
            names = [NA__DEV__VARIABLE.match(s).group(1) for s in segs if NA__DEV__VARIABLE.match(s)]
            regex = re.compile("^/" + "/".join("([A-Za-z0-9_-]+)" if NA__DEV__VARIABLE.match(s) else re.escape(s) for s in segs) + "/?$")
            links.append({"regex": regex, "names": names, "target": r["Target"], "code": int(r.get("Code", 302))})
    apps.sort(key=lambda a: -len(a["path"]))
    return apps, links, Na__Dev__LibraryRegex(hidden)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Serving
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Serve One File (or the entry page of a folder)
# ------------------------------------------------------------
def Na__Dev__File(path: Path, entry: str = "index.html", environ: dict | None = None) -> Response:
    if path.is_dir():
        path = path / entry
    if not path.is_file():
        return Response("Not Found", 404, mimetype="text/plain")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if environ is not None:                                                     # <-- Streamed, Range-aware (206), like nginx
        resp = send_file(str(path), environ, mimetype=mime, conditional=True, max_age=0)
    else:
        resp = Response(path.read_bytes(), 200, mimetype=mime)
    resp.headers["Cache-Control"] = "no-cache"
    return resp
# ---------------------------------------------------------------

# HELPER FUNCTION | A Path Under a Base, Never Outside It
# ------------------------------------------------------------
def Na__Dev__Under(base: Path, rel: str) -> Path | None:
    target = (base / unquote(rel).lstrip("/")).resolve()
    return target if target == base.resolve() or target.is_relative_to(base.resolve()) else None
# ---------------------------------------------------------------

# HELPER FUNCTION | A Data Path: the Sandbox's Copy When It Has One (not empty), Else the Mirror's
# ------------------------------------------------------------
def Na__Dev__DataFile(rel: str) -> Path | None:
    sandbox = Path(os.environ.get("VALE_ROOT") or NA__DEV__ROOT).resolve()
    if sandbox != NA__DEV__ROOT.resolve():
        alt = Na__Dev__Under(sandbox, rel)
        if alt and alt.is_file() and alt.stat().st_size > 0:
            return alt
    return Na__Dev__Under(NA__DEV__ROOT, rel)
# ---------------------------------------------------------------

# CLASS | The WSGI App: nginx rules + mounted Flask APIs
# ------------------------------------------------------------
class Na__Dev__Server:
    def __init__(self, routes_path: Path):
        self.apps, self.links, self.hidden = Na__Dev__Load(routes_path)

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO") or "/"
        query = environ.get("QUERY_STRING", "")
        for a in self.apps:
            if a["api"] is not None and path.startswith(a["path"] + "/api/"):
                environ = dict(environ, SCRIPT_NAME=a["path"], PATH_INFO=path[len(a["path"]):])
                return self.Na__Dev__CallApi(a["api"], environ, start_response)
        return self.Na__Dev__Static(Request(environ), path, query)(environ, start_response)

    def Na__Dev__CallApi(self, api, environ, start_response):
        captured = {}
        def capture(status, headers, exc_info=None):
            captured["status"], captured["headers"] = status, headers
            return lambda data: None
        body = b"".join(api(environ, capture))
        accel = next((v for k, v in captured["headers"] if k.lower() == "x-accel-redirect"), None)
        if accel and accel.startswith("/_internal/"):                           # <-- Same as nginx's internal location
            target = Na__Dev__DataFile(accel[len("/_internal/"):])                  # <-- APIs write user data under VALE_ROOT
            return (Na__Dev__File(target, environ=environ) if target else Response("Not Found", 404))(environ, start_response)
        start_response(captured["status"], captured["headers"])
        return [body]

    def Na__Dev__Static(self, req: Request, path: str, query: str) -> Response:
        for link in self.links:
            m = link["regex"].match(path)
            if m:
                target = link["target"]
                for name, value in zip(link["names"], m.groups()):
                    target = target.replace("{" + name + "}", value)
                return Response("", link["code"], headers={"Location": target})
        if "\\" in path:
            return Response("Not Found", 404)                                  # <-- On nginx a backslash is part of a name, never a separator
        clean = posixpath.normpath(re.sub(r"/{2,}", "/", path)) + ("/" if path.endswith("/") and path != "/" else "")   # <-- nginx's $uri
        if any(p.search(path) or p.search(clean) for p in NA__DEV__DENY):      # <-- nginx's regex denies win over every route
            return Response("Not Found", 404)
        if clean.startswith(NA__DEV__LIBRARY):
            if self.hidden and self.hidden.match(clean):
                return Response("Not Found", 404)                              # <-- LibraryHidden (and a switched-off route's protected files)
            for a in self.apps:
                if a["gate"] and a["gate"].match(clean):
                    return self.Na__Dev__Gated(a, req, clean)
        for a in self.apps:
            if path == a["path"]:
                return Response("", 301, headers={"Location": a["path"] + "/" + ("?" + query if query else "")})
            if path.startswith(a["path"] + "/"):
                target = Na__Dev__Under(a["target"], path[len(a["path"]) + 1:])
                return Na__Dev__File(target, a["entry"], req.environ) if target else Response("Not Found", 404)
        target = Na__Dev__DataFile(path) if path.startswith(NA__DEV__LIBRARY) else Na__Dev__Under(NA__DEV__ROOT, path)
        if target and target.is_dir() and not (target / "index.html").is_file():
            return Response("Forbidden", 403)                                  # <-- autoindex is off on the server too
        return Na__Dev__File(target, environ=req.environ) if target else Response("Not Found", 404)

    def Na__Dev__Gated(self, a: dict, req: Request, clean: str) -> Response:
        """A protected library file: the app's API decides first, as nginx's auth_request; never kept by a shared cache."""
        status = self.Na__Dev__Ask(a, req.environ, clean) if a["api"] is not None else 500
        if status in (401, 403):
            resp = Response(f"{status} refused by {a['api_name']}", status, mimetype="text/plain")
        elif not 200 <= status < 300:
            resp = Response(f"500: the library check answered {status}", 500, mimetype="text/plain")   # <-- nginx: any other code is an error
        else:
            target = Na__Dev__DataFile(clean)
            if target and target.is_dir():
                resp = Response("Forbidden", 403)                              # <-- autoindex is off on the server too
            else:
                resp = Na__Dev__File(target, environ=req.environ) if target else Response("Not Found", 404)
        resp.headers["Cache-Control"] = "private, no-cache"
        return resp

    def Na__Dev__Ask(self, a: dict, environ: dict, clean: str) -> int:
        """GET /api/library-access on the app's API, in this process: the browser's headers and cookies, the file's path."""
        sub = {k: v for k, v in environ.items() if k not in ("werkzeug.request", "CONTENT_TYPE")}
        sub.update({"REQUEST_METHOD": "GET", "SCRIPT_NAME": a["path"], "PATH_INFO": NA__DEV__GATE_ROUTE, "QUERY_STRING": "",
                    "CONTENT_LENGTH": "0", "wsgi.input": io.BytesIO(b""), NA__DEV__GATE_HEADER: clean})
        captured = {}
        def capture(status, headers, exc_info=None):
            captured["status"] = status
            return lambda data: None
        b"".join(a["api"](sub, capture))
        return int(str(captured.get("status") or "500").split()[0])
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

def Na__Dev__Main() -> int:
    ap = argparse.ArgumentParser(description="Vale dev server: the VPS on this PC")
    ap.add_argument("--port", type=int, default=8030)
    ap.add_argument("--routes", default=str(NA__DEV__ROUTES))
    a = ap.parse_args()
    os.environ.setdefault("VALE_ROOT", str(NA__DEV__ROOT))
    if not os.environ.get("VALE_SECRET_KEY"):
        os.environ["VALE_DEV"] = "1"
    server = Na__Dev__Server(Path(a.routes))
    print("=" * 77)
    print(f" VALE DEV SERVER   http://127.0.0.1:{a.port}/    root {NA__DEV__ROOT}")
    for app_ in server.apps:
        print(f"   {app_['path'] + '/':<22} {app_['target'].name:<26} API: {app_['api_name'] or '-'}"
              + ("   (library gate)" if app_["gate"] else ""))
    print("=" * 77, flush=True)
    run_simple("127.0.0.1", a.port, server, threaded=True, use_reloader=False)
    return 0


if __name__ == "__main__":
    sys.exit(Na__Dev__Main())

# endregion ----------------------------------------------------
