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
- Development settings: VALE_ROOT = the mirror, VALE_DEV=1 (fixed session
  key) unless VALE_SECRET_KEY is set. Real data: it reads and writes the
  mirror itself, so a save here is a real change to push later.

USAGE:
  python ValeDev__LocalServer__.py [--port 8030] [--routes PATH]
  then open http://127.0.0.1:8030/project-gallery/

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 1.0.0
- Initial build (ValeVision Gallery and ValeVision 3D ports).

=============================================================================
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import mimetypes
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote, unquote

from werkzeug.serving import run_simple
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

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Loading Routes and APIs
# -----------------------------------------------------------------------------

# FUNCTION | Load App Routes, Short Links and Each Route's Flask App
# ------------------------------------------------------------
def Na__Dev__Load(routes_path: Path) -> tuple:
    data = json.loads(routes_path.read_text(encoding="utf-8"))
    apps, links = [], []
    for r in data.get("Routes", []):
        if not r.get("Enabled", True):
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
                         "api_name": api_file.parent.name if api else ""})
        elif r.get("Type") == "link":
            segs = [s for s in str(r["Path"]).strip("/").split("/") if s]
            names = [NA__DEV__VARIABLE.match(s).group(1) for s in segs if NA__DEV__VARIABLE.match(s)]
            regex = re.compile("^/" + "/".join("([A-Za-z0-9_-]+)" if NA__DEV__VARIABLE.match(s) else re.escape(s) for s in segs) + "/?$")
            links.append({"regex": regex, "names": names, "target": r["Target"], "code": int(r.get("Code", 302))})
    apps.sort(key=lambda a: -len(a["path"]))
    return apps, links
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Serving
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Serve One File (or the entry page of a folder)
# ------------------------------------------------------------
def Na__Dev__File(path: Path, entry: str = "index.html") -> Response:
    if path.is_dir():
        path = path / entry
    if not path.is_file():
        return Response("Not Found", 404, mimetype="text/plain")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
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

# CLASS | The WSGI App: nginx rules + mounted Flask APIs
# ------------------------------------------------------------
class Na__Dev__Server:
    def __init__(self, routes_path: Path):
        self.apps, self.links = Na__Dev__Load(routes_path)

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
            target = Na__Dev__Under(NA__DEV__ROOT, accel[len("/_internal/"):])
            return (Na__Dev__File(target) if target else Response("Not Found", 404))(environ, start_response)
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
        if any(p.search(path) for p in NA__DEV__DENY):                         # <-- nginx's regex denies win over every route
            return Response("Not Found", 404)
        for a in self.apps:
            if path == a["path"]:
                return Response("", 301, headers={"Location": a["path"] + "/" + ("?" + query if query else "")})
            if path.startswith(a["path"] + "/"):
                target = Na__Dev__Under(a["target"], path[len(a["path"]) + 1:])
                return Na__Dev__File(target, a["entry"]) if target else Response("Not Found", 404)
        target = Na__Dev__Under(NA__DEV__ROOT, path)
        if target and target.is_dir() and not (target / "index.html").is_file():
            return Response("Forbidden", 403)                                  # <-- autoindex is off on the server too
        return Na__Dev__File(target) if target else Response("Not Found", 404)
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
        print(f"   {app_['path'] + '/':<22} {app_['target'].name:<26} API: {app_['api_name'] or '-'}")
    print("=" * 77, flush=True)
    run_simple("127.0.0.1", a.port, server, threaded=True, use_reloader=False)
    return 0


if __name__ == "__main__":
    sys.exit(Na__Dev__Main())

# endregion ----------------------------------------------------
