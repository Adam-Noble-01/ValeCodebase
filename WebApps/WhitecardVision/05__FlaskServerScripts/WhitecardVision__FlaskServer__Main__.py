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
 - Template tree + read endpoints for the prompt constructor.
 - Role-scoped image upload endpoints (whitecard / material / style / edit).
 - Gemini generation proxy that reads the API key from .env and never leaks
   it to the browser. Flash-image models are hard-blocked per spec.
 - Stdlib-only (ThreadingHTTPServer); zero pip deps required.

 RUNS ON: http://127.0.0.1:8004/WhitecardVision__App__.html
=============================================================================
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
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

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT   = SCRIPT_DIR.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from WhitecardVision__FlaskServer__EnvLoader__ import Wv__EnvLoader__ReadEnvFile
from WhitecardVision__FlaskServer__AspectRatio__ import (
    Wv__AspectRatio__ResolveForFile,
    Wv__AspectRatio__SnapToSupported,
    WV__ASPECT_RATIO__SUPPORTED_ENUM,
)

sys.path.insert(0, str(APP_ROOT / "06__ExernalApiAndWorkers" / "02__GoogleApis"))
from WhitecardVision__Google__GeminiClient__ import (
    Wv__GeminiClient__GenerateContent,
    Wv__GeminiClient__ExtractFirstImage,
    Wv__Gemini__BlockedModelError,
    Wv__Gemini__ApiKeyMissingError,
    Wv__Gemini__TransportError,
    Wv__Gemini__ResponseShapeError,
)


# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

WV__SERVER__APP_ROOT_PATH        = APP_ROOT
WV__SERVER__PROJECT_DATA_PATH    = (APP_ROOT / "04__LocalProjectData").resolve()
WV__SERVER__TEMPLATE_ROOT_PATH   = (APP_ROOT / "10__Local__PromptTemplates").resolve()
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
# REGION | Safe Path Helpers
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Reject path traversal attempts
# ------------------------------------------------------------
def Wv__Server__AssertSafeRelativePath(relative_path_text: str) -> None:
    if not relative_path_text:
        raise ValueError("Relative path is empty.")
    if ".." in relative_path_text.split("/") or ".." in relative_path_text.split("\\"):
        raise ValueError("Relative path contains traversal tokens.")
    if relative_path_text.startswith("/") or re.match(r'^[A-Za-z]:', relative_path_text):
        raise ValueError("Absolute paths are not allowed here.")
# ------------------------------------------------------------


# HELPER FUNCTION | Resolve project folder by projectName inside a year folder
# ------------------------------------------------------------
def Wv__Server__ResolveProjectDir(year_folder_name: str, project_name: str) -> Path:
    if not WV__SERVER__YEAR_FOLDER_PATTERN.match(year_folder_name):
        raise ValueError(f"Invalid year folder: {year_folder_name}")
    if not WV__SERVER__PROJECT_NAME_PATTERN.match(project_name):
        raise ValueError(f"Invalid project name: {project_name}")
    return (WV__SERVER__PROJECT_DATA_PATH / year_folder_name / f"{project_name}__WcVisData").resolve()
# ------------------------------------------------------------


# HELPER FUNCTION | Current local year as Projects__YYYY token
# ------------------------------------------------------------
def Wv__Server__CurrentYearFolderName() -> str:
    return f"Projects__{datetime.now().year}"
# ------------------------------------------------------------


# HELPER FUNCTION | Peek the first 2KB of a template and parse front-matter
# ------------------------------------------------------------
def Wv__Server__PeekTemplateFrontMatter(markdown_path: Path) -> dict[str, str]:                                                 #<-- '--- key = value ---' block.
    try:
        with markdown_path.open("rb") as source_handle:
            head_bytes = source_handle.read(2048)
        head_text   = head_bytes.decode("utf-8", errors="replace").lstrip("\ufeff").replace("\r\n", "\n")
    except Exception:
        return {}

    pattern_match = re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n?', head_text)
    if not pattern_match:
        return {}

    front_matter_dict: dict[str, str] = {}
    for raw_line in pattern_match.group(1).split("\n"):
        trimmed_line = raw_line.strip()
        if not trimmed_line or trimmed_line.startswith("#"):
            continue
        delimiter_index = trimmed_line.find("=")
        if delimiter_index < 0:
            continue
        key_text   = trimmed_line[:delimiter_index].strip()
        value_text = trimmed_line[delimiter_index + 1:].strip()
        if key_text:
            front_matter_dict[key_text] = value_text
    return front_matter_dict
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Schema Seeder
# -----------------------------------------------------------------------------


# FUNCTION | Build default project JSON seed
# ------------------------------------------------------------
def Wv__Server__BuildDefaultProjectJson(project_name: str, year_folder_name: str, description: str) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "Wv__ProjectFile__Metadata": {
            "Wv__ProjectFile__Metadata__ProjectName"        : project_name,
            "Wv__ProjectFile__Metadata__ProjectCode"        : project_name,
            "Wv__ProjectFile__Metadata__Description"        : description or "",
            "Wv__ProjectFile__Metadata__YearFolder"         : year_folder_name,
            "Wv__ProjectFile__Metadata__SchemaVersion"      : WV__SERVER__SCHEMA_VERSION,
            "Wv__ProjectFile__Metadata__DateCreatedUtc"     : now_iso,
            "Wv__ProjectFile__Metadata__DateModifiedUtc"    : now_iso,
        },
        "Wv__Project__RenderGroup": {
            "Wv__Project__RenderGroup__Whitecard"           : {
                "Wv__Whitecard__ImagePath"                  : "",
                "Wv__Whitecard__Prompt"                     : "",
                "Wv__Whitecard__WidthPx"                    : 0,
                "Wv__Whitecard__HeightPx"                   : 0,
                "Wv__Whitecard__SnappedAspectRatio"         : "",
                "Wv__Whitecard__SnappedDeltaPct"            : 0.0,
            },
            "Wv__Project__RenderGroup__MaterialReferences" : [],
            "Wv__Project__RenderGroup__StyleReferences"    : [],
            "Wv__Project__RenderGroup__AvoidNotes"         : "",
            "Wv__Project__RenderGroup__ImageSize"          : "2K",
            "Wv__Project__RenderGroup__LastOutputPath"     : "",
        },
        "Wv__Project__EditIterations"                       : [],
        "Wv__Project__ActiveEditIterationId"                : "",
    }
# ------------------------------------------------------------


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
    # ------------------------------------------------------------


    # SUB FUNCTION | POST dispatch
    # ------------------------------------------------------------
    def do_POST(self) -> None:
        parsed_url        = urlparse(self.path)
        url_path          = parsed_url.path.rstrip("/") or "/"
        query_parameters  = parse_qs(parsed_url.query)

        if url_path == "/api/projects":
            self.Wv__Server__HandleProjectCreate()
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

        if url_path == "/api/generate/render":
            self.Wv__Server__HandleGenerateRender()
            return

        if url_path == "/api/generate/edit":
            self.Wv__Server__HandleGenerateEdit()
            return

        self.send_error(404, "Not Found")
    # ------------------------------------------------------------


    # SUB FUNCTION | DELETE dispatch
    # ------------------------------------------------------------
    def do_DELETE(self) -> None:
        parsed_url = urlparse(self.path)
        url_path   = parsed_url.path.rstrip("/") or "/"
        project_tokens = self.Wv__Server__ParseProjectPath(url_path)
        if project_tokens:
            year_folder, project_name = project_tokens
            self.Wv__Server__HandleProjectDelete(year_folder, project_name)
            return
        self.send_error(404, "Not Found")
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
    # ------------------------------------------------------------


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
        WV__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)

        collected_projects: list[dict[str, Any]] = []
        for year_path in sorted(WV__SERVER__PROJECT_DATA_PATH.iterdir()):
            if not year_path.is_dir():
                continue
            if not WV__SERVER__YEAR_FOLDER_PATTERN.match(year_path.name):
                continue

            for project_dir in sorted(year_path.iterdir()):
                if not project_dir.is_dir():
                    continue
                if not project_dir.name.endswith("__WcVisData"):
                    continue
                project_name = project_dir.name[:-len("__WcVisData")]
                json_path    = project_dir / f"{project_name}__WcVisData__.json"
                metadata_block: dict[str, Any] = {}
                if json_path.is_file():
                    try:
                        loaded_json   = json.loads(json_path.read_text(encoding="utf-8") or "{}")
                        metadata_block = loaded_json.get("Wv__ProjectFile__Metadata", {}) or {}
                    except Exception as read_error:
                        print(f"[WARN] Could not parse {json_path.name}: {read_error}")

                display_name_raw = str(metadata_block.get("Wv__ProjectFile__Metadata__ProjectName", "") or "").strip()
                collected_projects.append({
                    "projectName"     : display_name_raw or project_name,                                                        #<-- Prefer metadata display name; falls back to folder-derived slug.
                    "projectSlug"     : project_name,                                                                            #<-- Stable folder-derived id used for URL paths.
                    "yearFolder"      : year_path.name,
                    "description"     : metadata_block.get("Wv__ProjectFile__Metadata__Description", ""),
                    "dateCreatedUtc"  : metadata_block.get("Wv__ProjectFile__Metadata__DateCreatedUtc", ""),
                    "dateModifiedUtc" : metadata_block.get("Wv__ProjectFile__Metadata__DateModifiedUtc", ""),
                    "projectDirRel"   : f"04__LocalProjectData/{year_path.name}/{project_dir.name}",
                })

        collected_projects.sort(key=lambda item: item.get("dateModifiedUtc", ""), reverse=True)
        self.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": collected_projects})
    # ------------------------------------------------------------


    # SUB FUNCTION | Create a project + full folder tree
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectCreate(self) -> None:
        request_body = self.Wv__Server__ReadJsonBody()
        if request_body is None:
            return

        project_name = str(request_body.get("projectName", "")).strip()
        description  = str(request_body.get("description", "")).strip()
        year_folder_raw = str(request_body.get("yearFolder", "")).strip()

        if not WV__SERVER__PROJECT_NAME_PATTERN.match(project_name):
            self.Wv__Server__WriteJsonResponse(400, {
                "ok": False,
                "error": "projectName must be 1-64 chars of [A-Za-z0-9_-] starting with alphanumeric."
            })
            return

        year_folder_name = year_folder_raw or Wv__Server__CurrentYearFolderName()
        if not WV__SERVER__YEAR_FOLDER_PATTERN.match(year_folder_name):
            self.Wv__Server__WriteJsonResponse(400, {"ok": False, "error": f"Invalid yearFolder '{year_folder_name}'."})
            return

        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
        if project_dir.exists():
            self.Wv__Server__WriteJsonResponse(409, {
                "ok": False,
                "error": f"Project '{project_name}' already exists in {year_folder_name}."
            })
            return

        project_dir.mkdir(parents=True, exist_ok=False)
        for subfolder_name in WV__SERVER__PROJECT_SUBFOLDERS:
            (project_dir / subfolder_name).mkdir(exist_ok=True)

        project_json_path = project_dir / f"{project_name}__WcVisData__.json"
        project_json_data = Wv__Server__BuildDefaultProjectJson(project_name, year_folder_name, description)
        project_json_path.write_text(
            json.dumps(project_json_data, indent=4, ensure_ascii=False),
            encoding="utf-8",
        )

        print(f"[PROJECT] Created: {year_folder_name}/{project_name}__WcVisData/")
        self.Wv__Server__WriteJsonResponse(200, {
            "ok": True,
            "data": {
                "projectName"    : project_name,
                "yearFolder"     : year_folder_name,
                "projectDirRel"  : f"04__LocalProjectData/{year_folder_name}/{project_name}__WcVisData",
                "projectJsonRel" : f"04__LocalProjectData/{year_folder_name}/{project_name}__WcVisData/{project_name}__WcVisData__.json",
            }
        })
    # ------------------------------------------------------------


    # SUB FUNCTION | Load a single project JSON
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectLoad(self, year_folder_name: str, project_name: str) -> None:
        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
        json_path   = project_dir / f"{project_name}__WcVisData__.json"
        if not json_path.is_file():
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return
        try:
            project_json_data = json.loads(json_path.read_text(encoding="utf-8"))
            self.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": project_json_data})
        except Exception as load_error:
            self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(load_error)})
    # ------------------------------------------------------------


    # SUB FUNCTION | Save a project JSON
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectSave(self, year_folder_name: str, project_name: str) -> None:
        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
        if not project_dir.is_dir():
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return

        request_body = self.Wv__Server__ReadJsonBody()
        if request_body is None:
            return

        metadata_block = request_body.get("Wv__ProjectFile__Metadata", {}) or {}
        metadata_block["Wv__ProjectFile__Metadata__DateModifiedUtc"] = datetime.now(timezone.utc).isoformat()
        metadata_block.setdefault("Wv__ProjectFile__Metadata__ProjectName", project_name)
        metadata_block.setdefault("Wv__ProjectFile__Metadata__YearFolder", year_folder_name)
        metadata_block.setdefault("Wv__ProjectFile__Metadata__SchemaVersion", WV__SERVER__SCHEMA_VERSION)
        request_body["Wv__ProjectFile__Metadata"] = metadata_block

        json_path = project_dir / f"{project_name}__WcVisData__.json"
        try:
            json_path.write_text(json.dumps(request_body, indent=4, ensure_ascii=False), encoding="utf-8")
            print(f"[PROJECT] Saved: {year_folder_name}/{project_name}__WcVisData/{project_name}__WcVisData__.json")
            self.Wv__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as write_error:
            self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(write_error)})
    # ------------------------------------------------------------


    # SUB FUNCTION | Delete an entire project directory tree
    # ------------------------------------------------------------
    def Wv__Server__HandleProjectDelete(self, year_folder_name: str, project_name: str) -> None:
        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
        if not project_dir.is_dir():
            self.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return

        import shutil
        try:
            shutil.rmtree(project_dir)
            print(f"[PROJECT] Deleted: {year_folder_name}/{project_name}__WcVisData/")
            self.Wv__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as delete_error:
            self.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(delete_error)})
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Handler - Image Upload
# -----------------------------------------------------------------------------


    # SUB FUNCTION | Upload an image for a given project role slot
    # ------------------------------------------------------------
    def Wv__Server__HandleImageUpload(self, year_folder_name: str, project_name: str, role_name: str, query_parameters: dict) -> None:
        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
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
        tree_root = self.Wv__Server__BuildTemplateTreeNode(WV__SERVER__TEMPLATE_ROOT_PATH, rel_prefix="")
        self.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": tree_root})
    # ------------------------------------------------------------


    # HELPER FUNCTION | Recursive tree builder (also peeks front-matter per file)
    # ------------------------------------------------------------
    def Wv__Server__BuildTemplateTreeNode(self, folder_path: Path, rel_prefix: str) -> dict[str, Any]:
        children_entries: list[dict[str, Any]] = []
        for entry_path in sorted(folder_path.iterdir(), key=lambda p: p.name.lower()):
            if entry_path.name.startswith("."):
                continue
            entry_relative = f"{rel_prefix}/{entry_path.name}".lstrip("/")
            if entry_path.is_dir():
                children_entries.append(self.Wv__Server__BuildTemplateTreeNode(entry_path, entry_relative))
            elif entry_path.suffix.lower() == ".md":
                children_entries.append({
                    "type"        : "file",
                    "name"        : entry_path.name,
                    "relPath"     : entry_relative,
                    "frontMatter" : Wv__Server__PeekTemplateFrontMatter(entry_path),
                })
        return {
            "type"     : "folder",
            "name"     : folder_path.name if rel_prefix else "",
            "relPath"  : rel_prefix,
            "children" : children_entries,
        }
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
        project_dir = Wv__Server__ResolveProjectDir(year_folder_name, project_name)
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

        validation_result = self.Wv__Server__ValidateFirstImageAspectRatio(request_shell, requested_aspect)
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

        relative_output_path = output_file.relative_to(WV__SERVER__APP_ROOT_PATH).as_posix()
        print(f"[GEN] {'edit' if is_edit_mode else 'render'} -> {relative_output_path}")
        self.Wv__Server__WriteJsonResponse(200, {
            "ok": True,
            "data": {
                "imagePathRel"         : relative_output_path,
                "mimeType"             : mime_type,
                "iterationId"          : iteration_id if is_edit_mode else "",
                "appliedAspectRatio"   : requested_aspect,
                "appliedImageSize"     : requested_size,
                "modelId"              : model_id,
                "synthIdWatermarked"   : True,
            }
        })
    # ------------------------------------------------------------


    # HELPER FUNCTION | Revalidate that parts[0] is a Whitecard whose aspect matches
    # ------------------------------------------------------------
    def Wv__Server__ValidateFirstImageAspectRatio(self, request_shell: dict, declared_aspect_ratio: str) -> tuple[int, str] | None:
        if not declared_aspect_ratio:
            return None

        contents_list = request_shell.get("contents") or []
        if not contents_list:
            return (400, "contents[] missing")
        parts_list = contents_list[0].get("parts") or []
        if not parts_list:
            return (400, "contents[0].parts[] missing")

        first_part   = parts_list[0]
        inline_block = first_part.get("inlineData") or first_part.get("inline_data") or {}
        base64_data  = inline_block.get("data") or ""
        if not base64_data:
            return (400, "First part must be the Whitecard image as inlineData")

        try:
            decoded_bytes = base64.b64decode(base64_data)
            import struct as _struct
            if decoded_bytes[:8] == b"\x89PNG\r\n\x1a\n":
                width_px, height_px = _struct.unpack(">II", decoded_bytes[16:24])
            elif decoded_bytes[:2] == b"\xff\xd8":
                temp_stream = io.BytesIO(decoded_bytes)
                temp_stream.read(2)
                width_px = height_px = 0
                while True:
                    marker_bytes = temp_stream.read(2)
                    if len(marker_bytes) < 2: break
                    if marker_bytes[0] != 0xFF: break
                    marker_code = marker_bytes[1]
                    if marker_code in (0xD8, 0xD9): break
                    segment_len = _struct.unpack(">H", temp_stream.read(2))[0]
                    if 0xC0 <= marker_code <= 0xCF and marker_code not in (0xC4, 0xC8, 0xCC):
                        sof_payload = temp_stream.read(segment_len - 2)
                        height_px = _struct.unpack(">H", sof_payload[1:3])[0]
                        width_px  = _struct.unpack(">H", sof_payload[3:5])[0]
                        break
                    temp_stream.seek(segment_len - 2, 1)
                if not width_px or not height_px:
                    return None
            else:
                return None
            ratio_info = Wv__AspectRatio__SnapToSupported(int(width_px), int(height_px))
        except Exception as probe_error:
            print(f"[WARN] Could not probe first image dims: {probe_error}")
            return None

        if ratio_info["snappedAspectRatio"] != declared_aspect_ratio:
            return (
                400,
                f"aspectRatio mismatch: Whitecard snaps to {ratio_info['snappedAspectRatio']} "
                f"(raw {ratio_info['rawRatio']}) but payload declared {declared_aspect_ratio}. "
                f"Refusing to generate - outputs would not composite."
            )
        return None
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
