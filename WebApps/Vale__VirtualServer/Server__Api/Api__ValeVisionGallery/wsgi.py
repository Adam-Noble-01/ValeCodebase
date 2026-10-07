"""
=============================================================================
 VALEVISION GALLERY - API (FLASK)
=============================================================================

FILE       : wsgi.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : The Gallery's only server side: lists and reads projects from the
             Projects Master Library and saves the Gallery's own fields.
CREATED    : 06-Oct-2026

DESCRIPTION:
- Public path /project-gallery/api/... (nginx proxies it to this service on
  127.0.0.1:<ApiPort from the URL routes file>). Locally the Vale dev server
  mounts it in-process (Server__DeveloperTools/ValeDev__LocalServer__.py).
- Every route needs a signed-in user (shared Vale sign-in, mounted at
  /api/accounts). Reading: Employee and up. Editing projects and gallery
  visibility: Management and up.
- Images are not served here: nginx serves the library's Content__ folders
  directly. The API only tells the page where they are.
- The Gallery owns these ProjectData fields and saves only them, so it can
  never overwrite ValeVision 3D's data in the same file: projectName,
  projectCode, projectNameAlias, productionData, scheduleData, description,
  enabled. Saves carry the "_rev" the page loaded; a newer file answers 409.
- Projects are never renamed, moved or deleted from the Gallery: a library
  folder is shared by every app.
- ValeVision Theia videos: every record carries videoCount (the card's video
  icon), and a full record carries theiaVideos (the viewer's Videos panel):
  the videos staff can watch, in Theia's order (ValeShared__TheiaVideo__).

ROUTES:
  GET  /api/health
  GET  /api/projects[?all=1]          gallery list (light records); all=1 adds hidden ones (Management)
  GET  /api/projects/<id>             one full record
  POST /api/projects/<id>             {project: {...}, _rev}        (Management)
  POST /api/projects/<id>/visibility  {enabled, _rev}               (Management)
  /api/accounts/...                   shared sign-in (ValeShared__Accounts__.py)

RUN (server): gunicorn --bind 127.0.0.1:${VALE_PORT} wsgi:app   (systemd vale@ValeVisionGallery)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
07-Oct-2026 - Version 1.1.0
- videoCount on every record and theiaVideos on a full record, for the
  Gallery's ValeVision Theia icon and Videos panel.

06-Oct-2026 - Version 1.0.0
- Initial build: replaces the old gallery dev server's project routes and the
  Cloudflare editor Worker (R2 writes). No GitHub Pages, no R2.

=============================================================================
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "Api__Shared"))
from ValeShared__Accounts__ import Na__Accounts__Blueprint                  # noqa: E402
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Require     # noqa: E402
from ValeShared__Library__ import (Na__Library__Conflict, Na__Library__Find, Na__Library__ListProjects,  # noqa: E402
                                   Na__Library__ProjectDataPath, Na__Library__ReadJson, Na__Library__Url,
                                   Na__Library__WriteJson, Na__Library__Year)
from ValeShared__TheiaVideo__ import Na__Theia__HasVideos, Na__Theia__Summary       # noqa: E402


# -----------------------------------------------------------------------------
# REGION | App and Constants
# -----------------------------------------------------------------------------

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
app.json.sort_keys = False
app.register_blueprint(Na__Accounts__Blueprint, url_prefix="/api/accounts")

NA__GALLERY__APP                  = "ValeVisionGallery"
NA__GALLERY__FULL                 = "ValeVisionGallery/Content__GalleryImages__FullQuality__VariantImages"
NA__GALLERY__THUMBS               = "ValeVisionGallery/Content__GalleryImages__Thumbnail__VariantImages"
NA__GALLERY__JPG524               = "ValeVisionGallery/Content__GalleryImages__524p__VariantImages"
NA__GALLERY__GLB                  = "ValeVision3D/Content__3dModel__GlbFiles"
NA__GALLERY__EDITABLE             = ("projectName", "projectCode", "projectNameAlias", "productionData",
                                     "scheduleData", "description")
NA__GALLERY__LIST_KEYS            = ("projectName", "projectCode", "projectNameAlias", "ProjectType", "description",
                                     "productionData", "scheduleData", "images", "thumbnailImage", "enabled",
                                     "valeVision_ModelUrls", "valeVision_ModelUrl", "projectDate", "_rev")
NA__GALLERY__IMAGE                = re.compile(r"\.(png|jpe?g|webp)$", re.I)

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Records for the Page
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Files Present in One of a Project's Buckets
# ------------------------------------------------------------
def Na__Gallery__Files(folder: Path, bucket: str) -> set:
    d = folder / bucket
    return {f.name for f in d.iterdir() if f.is_file()} if d.is_dir() else set()
# ---------------------------------------------------------------

# FUNCTION | A Project as the Page Needs It (computed fields are never saved)
# ------------------------------------------------------------
def Na__Gallery__Record(pid: str, folder: Path, data: dict, light: bool) -> dict:
    out = {k: data[k] for k in NA__GALLERY__LIST_KEYS if k in data} if light else dict(data)
    full = Na__Gallery__Files(folder, NA__GALLERY__FULL)
    images = [n for n in (data.get("images") or []) if n in full]             # <-- Only images that really exist
    out["images"] = images
    out["missingImages"] = [n for n in (data.get("images") or []) if n not in full]
    out["folderId"] = pid                                                      # <-- The library id: the folder name
    out["year"] = Na__Library__Year(folder)
    out["displayName"] = (data.get("projectNameAlias") or "").strip() or data.get("projectName") or pid
    out["basePath"] = Na__Library__Url(folder / NA__GALLERY__FULL).rstrip("/")
    out["thumbBasePath"] = Na__Library__Url(folder / NA__GALLERY__THUMBS).rstrip("/")
    out["jpg524BasePath"] = Na__Library__Url(folder / NA__GALLERY__JPG524).rstrip("/")
    has_glb = bool(Na__Gallery__Files(folder, NA__GALLERY__GLB)) or bool(data.get("valeVision_ModelUrls") or data.get("valeVision_ModelUrl"))
    out["hasGlb"] = out["hasGlb_R2"] = has_glb                                 # <-- hasGlb_R2 kept for the old carousel gate
    out["enabled"] = data.get("enabled", True) is not False
    out["_rev"] = int(data.get("_rev", 0) or 0)
    theia = Na__Theia__Summary(folder, data) if Na__Theia__HasVideos(folder) else {"count": 0, "videos": []}
    out["videoCount"] = theia["count"]                                         # <-- ValeVision Theia videos staff can watch
    if not light:
        out["theiaVideos"] = theia["videos"]
    return out
# ---------------------------------------------------------------

# HELPER FUNCTION | Load One Project or Answer 404
# ------------------------------------------------------------
def Na__Gallery__Load(pid: str):
    folder = Na__Library__Find(pid)
    path = Na__Library__ProjectDataPath(pid) if folder else None
    data = Na__Library__ReadJson(path) if path else None
    if data is None:
        return None, None, None, (jsonify({"ok": False, "error": f"no project {pid!r}"}), 404)
    return folder, path, data, None
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

# FUNCTION | Health (no sign-in needed; says nothing about data)
# ------------------------------------------------------------
@app.get("/api/health")
def Na__Gallery__Health():
    return jsonify({"ok": True, "app": NA__GALLERY__APP})
# ---------------------------------------------------------------

# FUNCTION | Gallery List
# ------------------------------------------------------------
@app.get("/api/projects")
@Na__Auth__Require("Employee")
def Na__Gallery__List():
    want_all = request.args.get("all") == "1"
    if want_all and Na__Auth__CurrentUser()["levelRank"] > 2:
        return jsonify({"ok": False, "error": "needs Management permission"}), 403
    out = []
    for pid, folder in Na__Library__ListProjects():
        data = Na__Library__ReadJson(folder / f"ProjectData__{pid}__.json")
        if not isinstance(data, dict):
            continue
        rec = Na__Gallery__Record(pid, folder, data, light=True)
        if rec["enabled"] or want_all:
            out.append(rec)
    return jsonify({"ok": True, "projects": out})
# ---------------------------------------------------------------

# FUNCTION | One Full Project
# ------------------------------------------------------------
@app.get("/api/projects/<pid>")
@Na__Auth__Require("Employee")
def Na__Gallery__Get(pid):
    folder, _, data, err = Na__Gallery__Load(pid)
    if err:
        return err
    return jsonify({"ok": True, "project": Na__Gallery__Record(folder.name, folder, data, light=False)})
# ---------------------------------------------------------------

# FUNCTION | Save the Gallery's Own Fields
# ------------------------------------------------------------
@app.post("/api/projects/<pid>")
@Na__Auth__Require("Management")
def Na__Gallery__Save(pid):
    folder, path, data, err = Na__Gallery__Load(pid)
    if err:
        return err
    body = request.get_json(silent=True) or {}
    posted = body.get("project") if isinstance(body.get("project"), dict) else {}
    if not str(posted.get("projectName", data.get("projectName", ""))).strip():
        return jsonify({"ok": False, "error": "Project name is required"}), 400
    for k in NA__GALLERY__EDITABLE:
        if k in posted:
            data[k] = posted[k]
    if not (data.get("projectNameAlias") or "").strip():
        data.pop("projectNameAlias", None)
    try:
        res = Na__Library__WriteJson(path, data, Na__Auth__CurrentUser()["code"], folder, expected_rev=body.get("_rev"))
    except Na__Library__Conflict as c:
        return jsonify({"ok": False, "error": "Someone else saved this project since you opened it. Reload it and try again.",
                        "project": Na__Gallery__Record(folder.name, folder, c.current, light=False)}), 409
    data["_rev"] = res["rev"]
    return jsonify({"ok": True, "project": Na__Gallery__Record(folder.name, folder, data, light=False)})
# ---------------------------------------------------------------

# FUNCTION | Show or Hide a Project in the Gallery
# ------------------------------------------------------------
@app.post("/api/projects/<pid>/visibility")
@Na__Auth__Require("Management")
def Na__Gallery__Visibility(pid):
    folder, path, data, err = Na__Gallery__Load(pid)
    if err:
        return err
    body = request.get_json(silent=True) or {}
    data["enabled"] = bool(body.get("enabled"))
    try:
        res = Na__Library__WriteJson(path, data, Na__Auth__CurrentUser()["code"], folder, expected_rev=body.get("_rev"))
    except Na__Library__Conflict as c:
        return jsonify({"ok": False, "error": "Someone else saved this project since you opened it. Reload it and try again.",
                        "project": Na__Gallery__Record(folder.name, folder, c.current, light=False)}), 409
    return jsonify({"ok": True, "enabled": data["enabled"], "_rev": res["rev"]})
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
