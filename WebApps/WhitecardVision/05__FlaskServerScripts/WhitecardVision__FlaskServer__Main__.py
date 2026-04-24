#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - FLASK SERVER (MAIN)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__Main__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - Main
 PURPOSE    : Static + JSON API server for WhitecardVision on localhost:8004

 FEATURES:
 - Serves the SPA (WhitecardVision__App__.html) and all static assets.
 - Project CRUD with full folder tree creation on POST /api/projects.
 - Self-reconciling project save: POST /api/projects/{year}/{slug} detects when the
   display name implies a new slug, atomically renames the on-disk folder + JSON
   file, rewrites all internal paths, and records the change in PreviousNames.
 - Template tree + read endpoints for the prompt constructor.
 - Role-scoped image upload endpoints (whitecard / material / style / edit).
 - Gemini generation proxy that reads the API key from .env and never leaks
   it to the browser. Flash-image models are hard-blocked per spec.
 - Optional vendored Pillow integration for lightweight thumbnail generation.

 RUNS ON: http://127.0.0.1:8004/WhitecardVision__App__.html
=============================================================================
"""

from __future__ import annotations


# -----------------------------------------------------------------------------
# REGION | Standard Library Imports
# -----------------------------------------------------------------------------

import argparse
import base64
import json
import os
import re
import shutil
import socket
import sys
import threading
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty, SimpleQueue
from typing import Any
from urllib.parse import parse_qs, urlparse

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Path Bootstrap - App Root & Vendored Dependencies
# -----------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT   = SCRIPT_DIR.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))
sys.path.insert(0, str(APP_ROOT / "00__ThirdParty__VersionLockedDependencies" / "02__Python__ImageUtils__Dependecies"))

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Flask Server Module Imports
# -----------------------------------------------------------------------------

from WhitecardVision__FlaskServer__EnvLoader__ import Wv__EnvLoader__ReadEnvFile
from WhitecardVision__FlaskServer__AspectRatio__ import (
    Wv__AspectRatio__ResolveForFile,
    WV__ASPECT_RATIO__SUPPORTED_ENUM,
)
from WhitecardVision__FlaskServer__Thumbnails__ import (
    Wv__Thumbnails__GenerateForFile,
    Wv__Thumbnails__IsAvailable,
)
from WhitecardVision__FlaskServer__TemplateIndex__ import (
    Wv__Server__ReadHiddenTemplatePathsFromAppConfig,
    Wv__Server__BuildTemplateTreeNode,
)
from WhitecardVision__FlaskServer__ProjectPaths__ import (
    Wv__Server__AssertSafeRelativePath,
    Wv__Server__ResolveProjectDir,
    Wv__Server__CurrentYearFolderName,
)
from WhitecardVision__FlaskServer__GenerationValidation__ import (
    Wv__Server__ValidateFirstImageAspectRatio,
)
from WhitecardVision__FlaskServer__ProjectActions__ import (
    Wv__Server__ProjectActions__HandleProjectCreate,
    Wv__Server__ProjectActions__HandleProjectDelete,
    Wv__Server__ProjectActions__HandleProjectDuplicate,
    Wv__Server__ProjectActions__HandleProjectList,
    Wv__Server__ProjectActions__HandleProjectLoad,
    Wv__Server__ProjectActions__HandleProjectSave,
    Wv__Server__ProjectActions__HandleThumbBackfill,
)

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Google APIs Path & Gemini Client Imports
# -----------------------------------------------------------------------------

sys.path.insert(0, str(APP_ROOT / "06__ExernalApiAndWorkers" / "02__GoogleApis"))
from WhitecardVision__Google__GeminiClient__ import (
    Wv__GeminiClient__GenerateContent,
    Wv__GeminiClient__ExtractFirstImage,
    Wv__Gemini__BlockedModelError,
    Wv__Gemini__ApiKeyMissingError,
    Wv__Gemini__TransportError,
    Wv__Gemini__ResponseShapeError,
)

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

WV__SERVER__APP_ROOT_PATH        = APP_ROOT
WV__SERVER__PROJECT_DATA_PATH    = (APP_ROOT / "04__LocalProjectData").resolve()
WV__SERVER__TEMPLATE_ROOT_PATH   = (APP_ROOT / "10__Local__PromptTemplates").resolve()
WV__SERVER__APP_CONFIG_PATH      = (APP_ROOT / "02__Src__AppModules" / "02__AppData" / "WhitecardVision__AppData__Config__Main__.json").resolve()
WV__SERVER__SECRETS_ENV_PATH     = (APP_ROOT / "06__ExernalApiAndWorkers" / "01__Secrets" / ".env").resolve()
WV__SERVER__SHARED_ASSETS_ROOT   = (APP_ROOT.parent / "assets__CommonApplicationAssets").resolve()

WV__SERVER__PROJECT_NAME_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_\-]{0,63}$')   # <-- Allowlist; first char must be alnum.
WV__SERVER__YEAR_FOLDER_PATTERN  = re.compile(r'^Projects__(?P<year>\d{4})$')
WV__SERVER__SAFE_SLOT_PATTERN    = re.compile(r'^[A-Za-z0-9_\-]{1,32}$')

WV__SERVER__PROJECT_SUBFOLDERS   = (
    "00__ImageMasks",
    "01__ImageInput__WhitecardImage",
    "02__ImageInput__MaterialsReference",
    "03__ImageInput__StyleReference",
    "10__ImageInput__EditModeImages",
    "20__FinalExport__RenderMode",
    "30__FinalExport__EditMode",
    "40__FinalExport__PostProcessed",
)

WV__SERVER__SCHEMA_VERSION       = "0.1.0"

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Schema Seeder
# -----------------------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Request Handler
# -----------------------------------------------------------------------------


class Wv__Server__RequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".md"         : "text/markdown; charset=utf-8",
    }

    # SUB FUNCTION | Write JSON body
    # ------------------------------------------------------------
    def Wv__Server__WriteJsonResponse(self, status_code: int, payload: dict[str, Any]) -> None:
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body_bytes)
    # ------------------------------------------------------------


    # SUB FUNCTION | CORS preflight
    # ------------------------------------------------------------
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Wv-UpdateSource")
        self.end_headers()
    # ------------------------------------------------------------


    # SUB FUNCTION | GET dispatch
    # ------------------------------------------------------------
    def do_GET(self) -> None:
        try:
            parsed_url        = urlparse(self.path)
            url_path          = parsed_url.path.rstrip("/") or "/"
            query_parameters  = parse_qs(parsed_url.query)

            if self.Wv__Server__TryHandleSharedAssetRead():
                return

            if url_path == "/api/system/health":
                self.Wv__Server__HandleHealthCheck()
                return

            if url_path == "/api/projects":
                self.Wv__Server__HandleProjectList()
                return

            project_tokens = self.Wv__Server__ParseProjectPath(url_path)
            if project_tokens:
                self.Wv__Server__HandleProjectLoad(*project_tokens)
                return

            if url_path == "/api/templates/tree":
                self.Wv__Server__HandleTemplateTree()
                return

            if url_path == "/api/templates/read":
                self.Wv__Server__HandleTemplateRead(query_parameters)
                return

            super().do_GET()
        except Exception as unhandled_error:
            try:
                self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": f"Unhandled server error: {unhandled_error}"})
            except Exception:
                pass
    # ------------------------------------------------------------


    # SUB FUNCTION | POST dispatch
    # ------------------------------------------------------------
    def do_POST(self) -> None:
        try:
            parsed_url        = urlparse(self.path)
            url_path          = parsed_url.path.rstrip("/") or "/"
            query_parameters  = parse_qs(parsed_url.query)

            if url_path == "/api/projects":
                self.Wv__Server__HandleProjectCreate()
                return

            duplicate_tokens = self.Wv__Server__ParseProjectDuplicatePath(url_path)
            if duplicate_tokens:
                year_folder, project_name = duplicate_tokens
                self.Wv__Server__HandleProjectDuplicate(year_folder, project_name)
                return

            project_tokens = self.Wv__Server__ParseProjectPath(url_path)
            if project_tokens:
                year_folder, project_name = project_tokens
                self.Wv__Server__HandleProjectSave(year_folder, project_name)
                return

            image_upload_tokens = self.Wv__Server__ParseProjectImageUploadPath(url_path)
            if image_upload_tokens:
                year_folder, project_name, role_name = image_upload_tokens
                self.Wv__Server__HandleImageUpload(year_folder, project_name, role_name, query_parameters)
                return

            backfill_tokens = self.Wv__Server__ParseProjectThumbBackfillPath(url_path)
            if backfill_tokens:
                year_folder, project_name = backfill_tokens
                self.Wv__Server__HandleThumbBackfill(year_folder, project_name)
                return

            if url_path == "/api/generate/render":
                self.Wv__Server__HandleGenerateRender()
                return

            if url_path == "/api/generate/edit":
                self.Wv__Server__HandleGenerateEdit()
                return

            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": f"No POST handler for {url_path}"})
        except Exception as unhandled_error:
            try:
                self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": f"Unhandled server error: {unhandled_error}"})
            except Exception:
                pass
    # ------------------------------------------------------------


    # SUB FUNCTION | DELETE dispatch
    # ------------------------------------------------------------
    def do_DELETE(self) -> None:
        try:
            parsed_url = urlparse(self.path)
            url_path   = parsed_url.path.rstrip("/") or "/"
            project_tokens = self.Wv__Server__ParseProjectPath(url_path)
            if project_tokens:
                year_folder, project_name = project_tokens
                self.Wv__Server__HandleProjectDelete(year_folder, project_name)
                return
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": f"No DELETE handler for {url_path}"})
        except Exception as unhandled_error:
            try:
                self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": f"Unhandled server error: {unhandled_error}"})
            except Exception:
                pass
    # ------------------------------------------------------------


    # SUB FUNCTION | Shared asset pass-through (../assets__CommonApplicationAssets/)
    # ------------------------------------------------------------
    def Wv__Server__TryHandleSharedAssetRead(self) -> bool:
        parsed_relative_path = urlparse(self.path).path
        shared_prefix = "/assets__CommonApplicationAssets/"
        if not parsed_relative_path.startswith(shared_prefix):
            return False
        relative_path = parsed_relative_path[len(shared_prefix):]
        target_path = (WV__SERVER__SHARED_ASSETS_ROOT / relative_path).resolve()
        try:
            target_path.relative_to(WV__SERVER__SHARED_ASSETS_ROOT)
        except ValueError:
            self.send_error(403, "Forbidden")
            return True
        if not target_path.is_file():
            self.send_error(404, "File not found")
            return True
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(target_path)))
        self.send_header("Content-Length", str(target_path.stat().st_size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        with target_path.open("rb") as asset_file:
            self.copyfile(asset_file, self.wfile)
        return True
    # ------------------------------------------------------------


    # SUB FUNCTION | Route parsers
    # ------------------------------------------------------------
    def Wv__Server__ParseProjectPath(self, url_path: str) -> tuple[str, str] | None:
        match_obj = re.match(r'^/api/projects/(?P<year>Projects__\d{4})/(?P<name>[A-Za-z0-9][A-Za-z0-9_\-]{0,63})$', url_path)
        if not match_obj:
            return None
        return match_obj.group("year"), match_obj.group("name")

    def Wv__Server__ParseProjectImageUploadPath(self, url_path: str) -> tuple[str, str, str] | None:
        match_obj = re.match(
            r'^/api/projects/(?P<year>Projects__\d{4})/(?P<name>[A-Za-z0-9][A-Za-z0-9_\-]{0,63})/images/(?P<role>whitecard|material|style|edit)$',
            url_path,
        )
        if not match_obj:
            return None
        return match_obj.group("year"), match_obj.group("name"), match_obj.group("role")

    def Wv__Server__ParseProjectThumbBackfillPath(self, url_path: str) -> tuple[str, str] | None:
        match_obj = re.match(
            r'^/api/projects/(?P<year>Projects__\d{4})/(?P<name>[A-Za-z0-9][A-Za-z0-9_\-]{0,63})/thumbnails/backfill$',
            url_path,
        )
        if not match_obj:
            return None
        return match_obj.group("year"), match_obj.group("name")

    def Wv__Server__ParseProjectDuplicatePath(self, url_path: str) -> tuple[str, str] | None:
        match_obj = re.match(
            r'^/api/projects/(?P<year>Projects__\d{4})/(?P<name>[A-Za-z0-9][A-Za-z0-9_\-]{0,63})/duplicate$',
            url_path,
        )
        if not match_obj:
            return None
        return match_obj.group("year"), match_obj.group("name")

    # SUB FUNCTION | Read JSON request body or respond 400
    # ------------------------------------------------------------
    def Wv__Server__ReadJsonBody(self) -> dict[str, Any] | None:
        content_length = int(self.headers.get("Content-Length", 0) or 0)
        if content_length <= 0:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": "Empty body"})
            return None
        try:
            raw_body = self.rfile.read(content_length)
            return json.loads(raw_body.decode("utf-8"))
        except Exception as parse_error:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": f"Invalid JSON: {parse_error}"})
            return None
    # ------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Health
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Health check + env state
    # ------------------------------------------------------------
    def Wv__Server__HandleHealthCheck(self) -> None:
        env_values = Wv__EnvLoader__ReadEnvFile(WV__SERVER__SECRETS_ENV_PATH)
        self.Wv__Server__WriteJsonResponse(200, {
            "ok": True,
            "data": {
                "status"            : "healthy",
                "utcIsoTimestamp"   : datetime.now(timezone.utc).isoformat(),
                "geminiKeyPresent"  : bool(env_values.get("GEMINI_API_KEY", "").strip()),
                "geminiModelId"     : env_values.get("GEMINI_MODEL_ID", "gemini-3-pro-image-preview"),
                "schemaVersion"     : WV__SERVER__SCHEMA_VERSION,
            }
        })
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Projects
# -----------------------------------------------------------------------------


    # SUB FUNCTION | List every project across every year folder
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectList(self) -> None:
        Wv__Server__ProjectActions__HandleProjectList(
            self,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
        )
    # ------------------------------------------------------------


    # SUB FUNCTION | Create a project + full folder tree
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectCreate(self) -> None:
        Wv__Server__ProjectActions__HandleProjectCreate(
            self,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
            WV__SERVER__PROJECT_SUBFOLDERS,
            WV__SERVER__SCHEMA_VERSION,
        )
    # ------------------------------------------------------------


    # SUB FUNCTION | Load a single project JSON
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectLoad(self, year_folder_name: str, project_name: str) -> None:
        Wv__Server__ProjectActions__HandleProjectLoad(
            self,
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
        )
    # ------------------------------------------------------------


    # SUB FUNCTION | Save a project JSON (self-reconciling: renames folder when slug drifts)
    # ------------------------------------------------------------
    #  If the display name in the body implies a different slug to the current folder id,
    #  this handler atomically: moves the folder, renames the JSON file, rewrites all
    #  internal path strings, appends a PreviousNames history entry, and then writes the
    #  updated JSON.  The response always includes the (possibly new) projectName so the
    #  client knows whether a reload is needed.
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectSave(self, year_folder_name: str, current_slug: str) -> None:
        Wv__Server__ProjectActions__HandleProjectSave(
            self,
            year_folder_name,
            current_slug,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
            WV__SERVER__SCHEMA_VERSION,
        )
    # ------------------------------------------------------------


    # SUB FUNCTION | Duplicate a project into a new folder-backed clone
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectDuplicate(self, year_folder_name: str, project_name: str) -> None:
        Wv__Server__ProjectActions__HandleProjectDuplicate(
            self,
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
            WV__SERVER__SCHEMA_VERSION,
            WV__SERVER__APP_ROOT_PATH,
        )
    # ------------------------------------------------------------


    # SUB FUNCTION | Delete an entire project directory tree
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectDelete(self, year_folder_name: str, project_name: str) -> None:
        Wv__Server__ProjectActions__HandleProjectDelete(
            self,
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
        )
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Thumbnail Backfill
# -----------------------------------------------------------------------------


    # SUB FUNCTION | Generate missing thumbs and update JSON thumb fields
    # ------------------------------------------------------------
    def Wv__Server__HandleThumbBackfill(self, year_folder_name: str, project_name: str) -> None:
        Wv__Server__ProjectActions__HandleThumbBackfill(
            self,
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
            WV__SERVER__APP_ROOT_PATH,
        )
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Image Upload
# -----------------------------------------------------------------------------


    # SUB FUNCTION | Upload an image for a given project role slot
    # ------------------------------------------------------------
    def Wv__Server__HandleImageUpload(self, year_folder_name: str, project_name: str, role_name: str, query_parameters: dict) -> None:
        project_dir = Wv__Server__ResolveProjectDir(
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
        )
        if not project_dir.is_dir():
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return

        request_body = self.Wv__Server__ReadJsonBody()
        if request_body is None:
            return

        base64_data   = request_body.get("base64Data") or ""
        mime_type     = request_body.get("mimeType")   or "image/png"
        file_label    = str(request_body.get("label") or "").strip() or role_name
        slot_index    = request_body.get("slotIndex")
        iteration_id  = str(request_body.get("iterationId") or "").strip()
        file_extension = ".png" if "png" in mime_type.lower() else (".jpg" if "jpeg" in mime_type.lower() or "jpg" in mime_type.lower() else ".png")

        if not base64_data:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": "base64Data is required"})
            return

        try:
            image_bytes = base64.b64decode(base64_data.split(",", 1)[-1])
        except Exception as decode_error:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": f"Bad base64: {decode_error}"})
            return

        safe_label = re.sub(r'[^A-Za-z0-9_\-]+', '_', file_label).strip('_') or role_name

        if role_name == "whitecard":
            target_folder = project_dir / "01__ImageInput__WhitecardImage"
            target_file   = target_folder / f"01__Whitecard__{safe_label}{file_extension}"
            for existing_file in target_folder.glob("01__Whitecard__*"):
                try: existing_file.unlink()
                except Exception: pass
        elif role_name == "material":
            try: slot_value = max(1, min(99, int(slot_index or 1)))
            except Exception: slot_value = 1
            target_file = project_dir / "02__ImageInput__MaterialsReference" / f"{slot_value:02d}__Material__{safe_label}{file_extension}"
        elif role_name == "style":
            try: slot_value = max(1, min(99, int(slot_index or 1)))
            except Exception: slot_value = 1
            target_file = project_dir / "03__ImageInput__StyleReference" / f"{slot_value:02d}__Style__{safe_label}{file_extension}"
        elif role_name == "edit":
            if not iteration_id:
                iteration_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            if not WV__SERVER__SAFE_SLOT_PATTERN.match(iteration_id):
                self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": "Invalid iterationId"})
                return
            iteration_dir = project_dir / "10__ImageInput__EditModeImages" / iteration_id
            iteration_dir.mkdir(parents=True, exist_ok=True)
            target_file = iteration_dir / f"01__Base__{safe_label}{file_extension}"
        else:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": f"Unknown role '{role_name}'"})
            return

        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_bytes(image_bytes)
        thumb_file_path = Wv__Thumbnails__GenerateForFile(target_file)
        relative_thumb_path = (
            thumb_file_path.relative_to(WV__SERVER__APP_ROOT_PATH).as_posix()
            if thumb_file_path else ""
        )

        try:
            aspect_ratio_info = Wv__AspectRatio__ResolveForFile(target_file)
        except Exception as dimension_error:
            aspect_ratio_info = {"widthPx": 0, "heightPx": 0, "rawRatio": 0.0, "snappedAspectRatio": "", "snappedDeltaPct": 0.0,
                                 "parseWarning": str(dimension_error)}

        relative_image_path = target_file.relative_to(WV__SERVER__APP_ROOT_PATH).as_posix()
        print(f"[UPLOAD] {role_name} -> {relative_image_path} ({aspect_ratio_info.get('widthPx')}x{aspect_ratio_info.get('heightPx')})")
        self.Wv__Server__WriteJsonResponse(200, {
            "ok": True,
            "data": {
                "imagePathRel": relative_image_path,
                "thumbPathRel": relative_thumb_path,
                "aspectRatio" : aspect_ratio_info,
            }
        })
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Templates
# -----------------------------------------------------------------------------


    # SUB FUNCTION | Walk the template root and return a nested tree
    # ------------------------------------------------------------
    def Wv__Server__HandleTemplateTree(self) -> None:
        WV__SERVER__TEMPLATE_ROOT_PATH.mkdir(parents=True, exist_ok=True)
        hidden_path_set = Wv__Server__ReadHiddenTemplatePathsFromAppConfig(WV__SERVER__APP_CONFIG_PATH)
        tree_root = Wv__Server__BuildTemplateTreeNode(
            WV__SERVER__TEMPLATE_ROOT_PATH,
            rel_prefix="",
            hidden_path_set=hidden_path_set,
        )
        self.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": tree_root})
    # ------------------------------------------------------------


    # SUB FUNCTION | Read a single markdown template
    # ------------------------------------------------------------
    def Wv__Server__HandleTemplateRead(self, query_parameters: dict) -> None:
        relative_path_value = (query_parameters.get("relPath") or [""])[0]
        try:
            Wv__Server__AssertSafeRelativePath(relative_path_value)
        except ValueError as safe_path_error:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": str(safe_path_error)})
            return

        target_path = (WV__SERVER__TEMPLATE_ROOT_PATH / relative_path_value).resolve()
        try:
            target_path.relative_to(WV__SERVER__TEMPLATE_ROOT_PATH)
        except ValueError:
            self.Wv__Server__WriteJsonResponse(403, {"ok": False, "error": "Path outside template root"})
            return

        if not target_path.is_file() or target_path.suffix.lower() != ".md":
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Template not found"})
            return

        try:
            markdown_text = target_path.read_text(encoding="utf-8")
            self.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": {"relPath": relative_path_value, "markdown": markdown_text}})
        except Exception as read_error:
            self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(read_error)})
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Generation (Render / Edit)
# -----------------------------------------------------------------------------


    # SUB FUNCTION | Render-mode generation
    # ------------------------------------------------------------
    def Wv__Server__HandleGenerateRender(self) -> None:
        self.Wv__Server__HandleGeneration(is_edit_mode=False)
    # ------------------------------------------------------------


    # SUB FUNCTION | Edit-mode generation
    # ------------------------------------------------------------
    def Wv__Server__HandleGenerateEdit(self) -> None:
        self.Wv__Server__HandleGeneration(is_edit_mode=True)
    # ------------------------------------------------------------


    # SUB FUNCTION | Shared generation pipeline
    # ------------------------------------------------------------
    def Wv__Server__HandleGeneration(self, is_edit_mode: bool) -> None:
        request_body = self.Wv__Server__ReadJsonBody()
        if request_body is None:
            return

        project_name     = str(request_body.get("projectName") or "").strip()
        year_folder_name = str(request_body.get("yearFolder") or "").strip() or Wv__Server__CurrentYearFolderName()
        iteration_id     = str(request_body.get("iterationId") or "").strip()
        request_shell    = request_body.get("geminiRequest") or {}

        if not WV__SERVER__PROJECT_NAME_PATTERN.match(project_name):
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": "projectName invalid or missing"})
            return
        project_dir = Wv__Server__ResolveProjectDir(
            year_folder_name,
            project_name,
            WV__SERVER__PROJECT_DATA_PATH,
            WV__SERVER__YEAR_FOLDER_PATTERN,
            WV__SERVER__PROJECT_NAME_PATTERN,
        )
        if not project_dir.is_dir():
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project folder missing"})
            return

        generation_config = (request_shell.get("generationConfig") or {})
        image_config      = (generation_config.get("imageConfig") or {})
        requested_aspect  = str(image_config.get("aspectRatio") or "").strip()
        requested_size    = str(image_config.get("imageSize") or "").strip()

        if requested_aspect and requested_aspect not in WV__ASPECT_RATIO__SUPPORTED_ENUM:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": f"aspectRatio '{requested_aspect}' not supported"})
            return

        validation_result = Wv__Server__ValidateFirstImageAspectRatio(request_shell, requested_aspect)
        if validation_result is not None:
            status_code, error_message = validation_result
            self.Wv__Server__WriteJsonResponse(status_code, {"ok": False, "error": error_message})
            return

        env_values = Wv__EnvLoader__ReadEnvFile(WV__SERVER__SECRETS_ENV_PATH)
        api_key    = env_values.get("GEMINI_API_KEY", "").strip()
        base_url   = env_values.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").strip()
        model_id   = env_values.get("GEMINI_MODEL_ID", "gemini-3-pro-image-preview").strip()
        try:
            request_timeout = int(env_values.get("GEMINI_REQUEST_TIMEOUT_SECONDS", "180"))
        except ValueError:
            request_timeout = 180

        if not api_key:
            self.Wv__Server__WriteJsonResponse(503, {
                "ok": False,
                "error": "GEMINI_API_KEY missing in 06__ExernalApiAndWorkers/01__Secrets/.env"
            })
            return

        try:
            response_json = Wv__GeminiClient__GenerateContent(
                api_key=api_key,
                base_url=base_url,
                model_id=model_id,
                request_body=request_shell,
                timeout_seconds=request_timeout,
            )
            image_bytes, mime_type = Wv__GeminiClient__ExtractFirstImage(response_json)
        except Wv__Gemini__BlockedModelError as blocked_error:
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": str(blocked_error)})
            return
        except Wv__Gemini__ApiKeyMissingError as key_error:
            self.Wv__Server__WriteJsonResponse(503, {"ok": False, "error": str(key_error)})
            return
        except Wv__Gemini__TransportError as transport_error:
            self.Wv__Server__WriteJsonResponse(502, {"ok": False, "error": str(transport_error)})
            return
        except Wv__Gemini__ResponseShapeError as shape_error:
            self.Wv__Server__WriteJsonResponse(502, {"ok": False, "error": str(shape_error)})
            return
        except Exception as unexpected_error:
            self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": f"Unexpected: {unexpected_error}"})
            return

        timestamp_token = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        if is_edit_mode:
            if not iteration_id or not WV__SERVER__SAFE_SLOT_PATTERN.match(iteration_id):
                iteration_id = timestamp_token
            output_dir  = project_dir / "30__FinalExport__EditMode" / iteration_id
            output_file = output_dir / f"{timestamp_token}__edit__.png"
        else:
            output_dir  = project_dir / "20__FinalExport__RenderMode"
            output_file = output_dir / f"{timestamp_token}__render__.png"

        output_dir.mkdir(parents=True, exist_ok=True)
        output_file.write_bytes(image_bytes)
        thumb_file_path = Wv__Thumbnails__GenerateForFile(output_file)
        relative_thumb_path = (
            thumb_file_path.relative_to(WV__SERVER__APP_ROOT_PATH).as_posix()
            if thumb_file_path else ""
        )

        relative_output_path = output_file.relative_to(WV__SERVER__APP_ROOT_PATH).as_posix()
        print(f"[GEN] {'edit' if is_edit_mode else 'render'} -> {relative_output_path}")
        self.Wv__Server__WriteJsonResponse(200, {
            "ok": True,
            "data": {
                "imagePathRel"         : relative_output_path,
                "thumbPathRel"         : relative_thumb_path,
                "mimeType"             : mime_type,
                "iterationId"          : iteration_id if is_edit_mode else "",
                "appliedAspectRatio"   : requested_aspect,
                "appliedImageSize"     : requested_size,
                "modelId"              : model_id,
                "synthIdWatermarked"   : True,
            }
        })
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


    # SUB FUNCTION | Reduce noisy default formatting
    # ------------------------------------------------------------
    def log_message(self, format: str, *args) -> None:
        message_text  = format % args
        if "api/system/health" in message_text:
            return
        client_ip     = self.client_address[0]
        request_time  = datetime.now().strftime("%d-%b-%Y - %H:%M")
        print(f"[REQUEST] {request_time} | {client_ip} | {message_text}")
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Console Restart Flags
# -----------------------------------------------------------------------------

WV__SERVER__RESTART_FLAG_TOKENS = {"--r", "--R", "--restart", "--Restart"}


def Wv__Server__ConsoleCommandReader(command_queue: SimpleQueue, stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            command_value = input().strip()
        except (EOFError, KeyboardInterrupt):
            return
        if not command_value:
            continue
        command_queue.put(command_value)


def Wv__Server__TryHandleQueuedConsoleCommands(command_queue: SimpleQueue) -> bool:
    while True:
        try:
            command_value = command_queue.get_nowait()
        except Empty:
            return False
        if command_value in WV__SERVER__RESTART_FLAG_TOKENS:
            print("=============================================================================")
            print(f" WHITECARDVISION - RESTART FLAG RECEIVED ({command_value})")
            print("=============================================================================")
            return True
        print(f" [WARN] Unknown console command: '{command_value}'")


def Wv__Server__RunHttpLoop(httpd: ThreadingHTTPServer, command_queue: SimpleQueue | None) -> bool:
    httpd.timeout = 0.50
    while True:
        httpd.handle_request()
        if command_queue is None:
            continue
        if Wv__Server__TryHandleQueuedConsoleCommands(command_queue):
            return True

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Startup
# -----------------------------------------------------------------------------


def Wv__Server__GetLocalIp() -> str:
    try:
        probe_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe_socket.connect(("8.8.8.8", 80))
        local_ip_address = probe_socket.getsockname()[0]
        probe_socket.close()
        return local_ip_address
    except Exception:
        return "127.0.0.1"


def Wv__Server__ValidateAppRoot() -> tuple[bool, str]:
    app_html = WV__SERVER__APP_ROOT_PATH / "WhitecardVision__App__.html"
    if not app_html.exists():
        return False, f"Missing entry file: {app_html}"
    return True, "OK"


def main() -> int:
    parser = argparse.ArgumentParser(description="WhitecardVision local static + API server")
    parser.add_argument("--port", type=int, default=8004, help="Port (default 8004)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface")
    args = parser.parse_args()

    os.chdir(WV__SERVER__APP_ROOT_PATH)

    is_valid, validation_message = Wv__Server__ValidateAppRoot()
    if not is_valid:
        print(f"[ERROR] {validation_message}")
        return 1

    WV__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)
    WV__SERVER__TEMPLATE_ROOT_PATH.mkdir(parents=True, exist_ok=True)

    env_values_on_boot = Wv__EnvLoader__ReadEnvFile(WV__SERVER__SECRETS_ENV_PATH)
    gemini_key_present = bool(env_values_on_boot.get("GEMINI_API_KEY", "").strip())

    local_ip_address = Wv__Server__GetLocalIp()
    app_url_local    = f"http://{args.host}:{args.port}/WhitecardVision__App__.html"
    app_url_lan      = f"http://{local_ip_address}:{args.port}/WhitecardVision__App__.html"

    print("=============================================================================")
    print(" WHITECARDVISION - STATIC + API SERVER")
    print("=============================================================================")
    print(f" Root Directory   : {WV__SERVER__APP_ROOT_PATH}")
    print(f" Local URL        : {app_url_local}")
    print(f" LAN URL          : {app_url_lan}")
    print(f" Gemini API Key   : {'LOADED' if gemini_key_present else 'MISSING (generation will fail)'}")
    print(f" Model ID         : {env_values_on_boot.get('GEMINI_MODEL_ID', 'gemini-3-pro-image-preview')}")
    print(f" Thumb Generator  : {'PIL AVAILABLE' if Wv__Thumbnails__IsAvailable() else 'DISABLED (Pillow missing)'}")
    print(" Restart flags    : --r | --R | --restart | --Restart")
    print("=============================================================================")

    command_queue             = None
    command_reader_stop_event = None
    if sys.stdin and sys.stdin.isatty():
        command_queue               = SimpleQueue()
        command_reader_stop_event   = threading.Event()
        command_reader_thread       = threading.Thread(
            target=Wv__Server__ConsoleCommandReader,
            args=(command_queue, command_reader_stop_event),
            daemon=True,
        )
        command_reader_thread.start()

    try:
        while True:
            httpd = ThreadingHTTPServer((args.host, args.port), Wv__Server__RequestHandler)
            should_restart = Wv__Server__RunHttpLoop(httpd, command_queue)
            httpd.server_close()
            if not should_restart:
                break
            print(" WHITECARDVISION - SERVER RESTARTED")
    except KeyboardInterrupt:
        print("\n WHITECARDVISION - SERVER STOPPED")
        return 0
    except OSError as os_error:
        print(f"[ERROR] Failed to bind {args.host}:{args.port} -> {os_error}")
        return 1
    finally:
        if command_reader_stop_event is not None:
            command_reader_stop_event.set()

    return 0


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
