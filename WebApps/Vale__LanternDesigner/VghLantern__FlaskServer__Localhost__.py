#!/usr/bin/env python3
"""
=============================================================================
 VGHLANTERN - FLASK SERVER LOCALHOST
=============================================================================
Purpose:
- Serve the Lantern Designer over HTTP for module loading (no file:// CORS issues)
- Provide clear startup feedback and request logging
- Serve shared assets from ../assets__CommonApplicationAssets/
- Provide project CRUD API backed by 07__LocalProjectData/ on disk
- Serve the generated component and profile library indexes with no-store caching

Notes:
- Despite the "FlaskServer" filename this uses the Python stdlib ThreadingHTTPServer.
  The name is retained for consistency with the sibling Vale WebApps.
- Port 8006 is reserved for this app. See the WebApps localhost ports Cursor rule.
- The handler forces HTTP/1.1 keep-alive (see Na__Server__RequestHandler.protocol_version).
  The app boots via ~90 individual <script> tags; HTTP/1.0 (the http.server default)
  opens and closes a brand-new socket per file, which on Windows exhausts socket
  buffer space and surfaces in Chrome as net::ERR_NO_BUFFER_SPACE. Keep-alive lets
  the browser reuse a handful of persistent connections for the whole page load.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import socket
import sys
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty, SimpleQueue
from typing import Any, Tuple


# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

NA__SERVER__APP_ROOT_PATH           = Path(__file__).resolve().parent
NA__SERVER__SHARED_ASSETS_ROOT_PATH = (NA__SERVER__APP_ROOT_PATH.parent / "assets__CommonApplicationAssets").resolve()
NA__SERVER__PROJECT_DATA_PATH       = (NA__SERVER__APP_ROOT_PATH / "07__LocalProjectData").resolve()
NA__SERVER__USER_MENU_DATA_PATH     = (NA__SERVER__APP_ROOT_PATH / "08__LocalUserData").resolve()
NA__SERVER__MAIN_APP_CONFIG_PATH    = (NA__SERVER__APP_ROOT_PATH / "02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json").resolve()
NA__SERVER__COMPONENT_INDEX_PATH    = (NA__SERVER__APP_ROOT_PATH / "05__Data__LanternComponentLibrary/VghLantern__ComponentDataIndex__.json").resolve()
NA__SERVER__PROFILE_INDEX_PATH      = (NA__SERVER__APP_ROOT_PATH / "06__Data__LanternProfileLibrary/VghLantern__ProfileDataIndex__.json").resolve()
NA__SERVER__SERVICE_WORKER_PATH     = (NA__SERVER__APP_ROOT_PATH / "Na__ServiceWorker__VghLantern.js").resolve()
NA__SERVER__DEFAULT_PORT            = 8006                                       # <-- Reserved port for the Lantern Designer
NA__SERVER__OUTPUT_LOG_HANDLE       = None

NA__SERVER__SW_VERSION_TOKEN_PATTERN = re.compile(r"(const PWA_SW_VERSION_TOKEN\s*=\s*)'[^']*'")  # Matches the one token line in the service worker

NA__SERVER__PROJECT_CODE_PATTERN    = re.compile(r'^[A-Za-z0-9_\-]{1,64}$')       # Allowlist for safe project codes
NA__SERVER__PROJECT_FILE_NAME_PATTERN = re.compile(
    r'^VghLantern__ProjectFile__(?P<projectCode>[A-Za-z0-9_\-]{1,64})__(?:(?P<projectName>.+?)__)?\.json$'
)                                                                                # Supports legacy and name-suffixed project files
NA__SERVER__USER_SLUG_PATTERN       = re.compile(r'^[A-Za-z0-9_\-]{1,64}$')       # Allowlist for safe user slugs
NA__SERVER__USER_MENU_SYNC_USER_SLUG = "AdamW"
NA__SERVER__USER_MENU_APP_DEFAULTS_SECTION_KEY = "VghLantern__UserMenu__AppDefaults__Config"

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server Handler
# -----------------------------------------------------------------------------

class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"    # <-- Enables keep-alive; avoids one fresh TCP socket per <script> tag (fixes ERR_NO_BUFFER_SPACE)

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".mjs": "text/javascript",
    }

    # SUB FUNCTION | Force no-store on every local-dev response
    # ------------------------------------------------------------
    # Local JSON / JS / CSS edits must reach the browser on the next refresh.
    # Without this, Chrome can keep serving a stale Na__Env2d__Config.json and
    # config changes look like they "do nothing" while the disk file is correct.
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    # ------------------------------------------------------------

    # SUB FUNCTION | Serve shared app assets from parent WebApps folder
    # ------------------------------------------------------------
    def Na__Server__TryHandleSharedAssetRead(self) -> bool:
        from urllib.parse import urlparse
        parsed_path = urlparse(self.path).path
        shared_assets_prefix = "/assets__CommonApplicationAssets/"
        if not parsed_path.startswith(shared_assets_prefix):
            return False

        shared_relative_path = parsed_path[len(shared_assets_prefix):]
        shared_target_path = (NA__SERVER__SHARED_ASSETS_ROOT_PATH / shared_relative_path).resolve()
        try:
            shared_target_path.relative_to(NA__SERVER__SHARED_ASSETS_ROOT_PATH)
        except ValueError:
            self.send_error(403, "Forbidden")
            return True

        if not shared_target_path.is_file():
            self.send_error(404, "File not found")
            return True

        content_type = self.guess_type(str(shared_target_path))
        file_size = shared_target_path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(file_size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        with shared_target_path.open("rb") as shared_file:
            self.copyfile(shared_file, self.wfile)
        return True
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve project code from an /api/projects/{code} path
    # ------------------------------------------------------------
    def Na__Server__ParseProjectCode(self, request_path: str) -> str | None:
        prefix = "/api/projects/"
        if not request_path.startswith(prefix):
            return None
        code = request_path[len(prefix):].rstrip("/")
        if not code or not NA__SERVER__PROJECT_CODE_PATTERN.match(code):
            return None
        return code
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve user slug from an /api/user-menu-config/{slug} path
    # ------------------------------------------------------------
    def Na__Server__ParseUserSlug(self, request_path: str) -> str | None:
        prefix = "/api/user-menu-config/"
        if not request_path.startswith(prefix):
            return None
        user_slug = request_path[len(prefix):].rstrip("/")
        if not user_slug or not NA__SERVER__USER_SLUG_PATTERN.match(user_slug):
            return None
        return user_slug
    # ------------------------------------------------------------

    # SUB FUNCTION | Build Safe Project Name Segment for File Names
    # ------------------------------------------------------------
    def Na__Server__SanitizeProjectNameForFilename(self, project_name: str) -> str:
        raw_name = str(project_name or "").strip()
        if not raw_name:
            return "UnnamedProject"

        safe_name = re.sub(r"[^A-Za-z0-9\-]+", "_", raw_name)
        safe_name = re.sub(r"_+", "_", safe_name).strip("_")
        if not safe_name:
            return "UnnamedProject"
        return safe_name[:96]
    # ------------------------------------------------------------

    # SUB FUNCTION | Extract Project Code from Project File Name
    # ------------------------------------------------------------
    def Na__Server__ExtractProjectCodeFromFileName(self, file_name: str) -> str | None:
        match = NA__SERVER__PROJECT_FILE_NAME_PATTERN.match(file_name or "")
        if not match:
            return None
        return match.group("projectCode")
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve legacy path for a project data file
    # ------------------------------------------------------------
    def Na__Server__GetLegacyProjectFilePath(self, project_code: str) -> Path:
        filename = f"VghLantern__ProjectFile__{project_code}__.json"
        return NA__SERVER__PROJECT_DATA_PATH / filename
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve canonical path for a project data file
    # ------------------------------------------------------------
    def Na__Server__GetProjectFilePath(self, project_code: str, project_name: str) -> Path:
        safe_project_name = self.Na__Server__SanitizeProjectNameForFilename(project_name)
        filename = f"VghLantern__ProjectFile__{project_code}__{safe_project_name}__.json"
        return NA__SERVER__PROJECT_DATA_PATH / filename
    # ------------------------------------------------------------

    # SUB FUNCTION | List All File Variants for a Project Code
    # ------------------------------------------------------------
    def Na__Server__ListProjectFileCandidates(self, project_code: str) -> list[Path]:
        file_pattern = f"VghLantern__ProjectFile__{project_code}__*.json"
        candidates = list(NA__SERVER__PROJECT_DATA_PATH.glob(file_pattern))
        candidates.sort(
            key=lambda path_obj: path_obj.stat().st_mtime if path_obj.exists() else 0.0,
            reverse=True
        )
        return candidates
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve Existing Project File Path by Project Code
    # ------------------------------------------------------------
    def Na__Server__ResolveProjectFilePath(self, project_code: str, project_name: str | None = None) -> Path:
        if project_name:
            canonical_path = self.Na__Server__GetProjectFilePath(project_code, project_name)
            if canonical_path.is_file():
                return canonical_path

        candidates = self.Na__Server__ListProjectFileCandidates(project_code)
        if candidates:
            return candidates[0]

        if project_name:
            return self.Na__Server__GetProjectFilePath(project_code, project_name)
        return self.Na__Server__GetLegacyProjectFilePath(project_code)
    # ------------------------------------------------------------

    # SUB FUNCTION | Remove Non-Canonical File Variants for a Project
    # ------------------------------------------------------------
    def Na__Server__DeleteStaleProjectFileVariants(self, project_code: str, keep_file_path: Path) -> None:
        for candidate_path in self.Na__Server__ListProjectFileCandidates(project_code):
            if candidate_path == keep_file_path:
                continue
            try:
                candidate_path.unlink()
                print(f"[PROJECT] Removed stale file variant: {candidate_path.name}")
            except Exception as remove_error:
                print(f"[WARN] Failed removing stale variant {candidate_path.name}: {remove_error}")
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve path for a per-user menu config file
    # ------------------------------------------------------------
    def Na__Server__GetUserMenuConfigFilePath(self, user_slug: str) -> Path:
        filename = f"VghLantern__AppData__UserMenuConfig__{user_slug}__.json"
        return NA__SERVER__USER_MENU_DATA_PATH / filename
    # ------------------------------------------------------------

    # SUB FUNCTION | Build Main App Defaults Section from User Menu Config
    # ------------------------------------------------------------
    def Na__Server__BuildUserMenuAppDefaultsSection(self, user_slug: str, menu_config_data: dict) -> dict:
        preview_config = menu_config_data.get("VghLantern__UserMenu__ModeDocumentPreview__Config", {})
        return {
            "VghLantern__UserMenu__AppDefaults__Config__Description"             : "Application-wide default menu settings mirrored from the sync user. Used when no user override config exists.",
            "VghLantern__UserMenu__AppDefaults__Config__SourceUserSlug"          : user_slug,
            "VghLantern__UserMenu__AppDefaults__Config__OverrideEnabled"         : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__OverrideEnabled", True),
            "VghLantern__UserMenu__AppDefaults__Config__MenuPositionX"           : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__MenuPositionX", None),
            "VghLantern__UserMenu__AppDefaults__Config__MenuPositionY"           : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__MenuPositionY", None),
            "VghLantern__UserMenu__AppDefaults__Config__MenuSectionDrawingsOpen" : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__MenuSectionDrawingsOpen", True),
            "VghLantern__UserMenu__AppDefaults__Config__MenuSectionDocumentOpen" : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__MenuSectionDocumentOpen", True),
            "VghLantern__UserMenu__AppDefaults__Config__MenuSectionActionsOpen"  : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__MenuSectionActionsOpen", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowPlanView"            : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowPlanView", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowFrontElevation"      : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowFrontElevation", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowSideElevation"       : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowSideElevation", True),
            "VghLantern__UserMenu__AppDefaults__Config__Show3dView"              : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__Show3dView", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowTakeoffSchedule"     : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowTakeoffSchedule", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowComponentSchedule"   : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowComponentSchedule", True),
            "VghLantern__UserMenu__AppDefaults__Config__ShowJobNotes"            : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__ShowJobNotes", True),
            "VghLantern__UserMenu__AppDefaults__Config__PersistMenuPosition"     : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__PersistMenuPosition", True),
            "VghLantern__UserMenu__AppDefaults__Config__PersistMenuSectionState" : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__PersistMenuSectionState", True),
            "VghLantern__UserMenu__AppDefaults__Config__PersistViewState"        : preview_config.get("VghLantern__UserMenu__ModeDocumentPreview__Config__PersistViewState", True)
        }
    # ------------------------------------------------------------

    # SUB FUNCTION | Sync Primary User Menu Defaults into Main App Config
    # ------------------------------------------------------------
    def Na__Server__SyncMainAppDefaultsFromUserMenu(self, user_slug: str, menu_config_data: dict) -> bool:
        if user_slug != NA__SERVER__USER_MENU_SYNC_USER_SLUG:
            return True

        if not NA__SERVER__MAIN_APP_CONFIG_PATH.is_file():
            print(f"[WARN] Main app config missing: {NA__SERVER__MAIN_APP_CONFIG_PATH}")
            return False

        try:
            main_config_data = json.loads(NA__SERVER__MAIN_APP_CONFIG_PATH.read_text(encoding="utf-8"))
            if not isinstance(main_config_data, dict):
                print("[WARN] Main app config is not a JSON object.")
                return False

            app_defaults_section = self.Na__Server__BuildUserMenuAppDefaultsSection(user_slug, menu_config_data)
            main_config_data[NA__SERVER__USER_MENU_APP_DEFAULTS_SECTION_KEY] = app_defaults_section

            NA__SERVER__MAIN_APP_CONFIG_PATH.write_text(
                json.dumps(main_config_data, indent=4, ensure_ascii=False),
                encoding="utf-8"
            )
            print(f"[USER_MENU] Synced {user_slug} defaults into VghLantern__AppConfig__Main__.json")
            return True

        except Exception as sync_error:
            print(f"[WARN] Failed syncing {user_slug} defaults to main app config: {sync_error}")
            return False
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle GET requests
    # ------------------------------------------------------------
    def do_GET(self) -> None:
        from urllib.parse import urlparse
        if self.Na__Server__TryHandleSharedAssetRead():
            return

        request_path = urlparse(self.path).path.rstrip("/")

        if request_path == "/api/system/health":
            self.Na__Server__WriteJsonResponse(200, {
                "ok": True,
                "data": {
                    "status": "healthy",
                    "utcIsoTimestamp": datetime.now(timezone.utc).isoformat(),
                }
            })
            return

        if request_path == "/api/projects":
            self.Na__Server__HandleProjectList()
            return

        if request_path == "/api/component-index":
            self.Na__Server__HandleDataIndexLoad(NA__SERVER__COMPONENT_INDEX_PATH, "Component index")
            return

        if request_path == "/api/profile-index":
            self.Na__Server__HandleDataIndexLoad(NA__SERVER__PROFILE_INDEX_PATH, "Profile index")
            return

        project_code = self.Na__Server__ParseProjectCode(request_path)
        if project_code:
            self.Na__Server__HandleProjectLoad(project_code)
            return

        user_slug = self.Na__Server__ParseUserSlug(request_path)
        if user_slug:
            self.Na__Server__HandleUserMenuConfigLoad(user_slug)
            return

        super().do_GET()
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle POST requests
    # ------------------------------------------------------------
    def do_POST(self) -> None:
        from urllib.parse import urlparse
        request_path = urlparse(self.path).path.rstrip("/")

        project_code = self.Na__Server__ParseProjectCode(request_path)
        if project_code:
            self.Na__Server__HandleProjectSave(project_code)
            return

        user_slug = self.Na__Server__ParseUserSlug(request_path)
        if user_slug:
            self.Na__Server__HandleUserMenuConfigSave(user_slug)
            return

        self.send_error(404, "Not Found")
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle DELETE requests
    # ------------------------------------------------------------
    def do_DELETE(self) -> None:
        from urllib.parse import urlparse
        request_path = urlparse(self.path).path.rstrip("/")

        project_code = self.Na__Server__ParseProjectCode(request_path)
        if project_code:
            self.Na__Server__HandleProjectDelete(project_code)
            return

        self.send_error(404, "Not Found")
    # ------------------------------------------------------------

    # SUB FUNCTION | Serve a generated data library index file
    # ------------------------------------------------------------
    def Na__Server__HandleDataIndexLoad(self, index_file_path: Path, index_label: str) -> None:
        if not index_file_path.is_file():
            self.Na__Server__WriteJsonResponse(404, {
                "ok": False,
                "error": f"{index_label} not found. Run the matching builder in 60__Dev__WebBuildUtils."
            })
            return
        try:
            index_data = json.loads(index_file_path.read_text(encoding="utf-8"))
            self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": index_data})
        except Exception as load_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(load_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | List all project files from 07__LocalProjectData/
    # ------------------------------------------------------------
    def Na__Server__HandleProjectList(self) -> None:
        NA__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)
        projects = []
        seen_project_codes = set()
        all_project_files = sorted(
            NA__SERVER__PROJECT_DATA_PATH.glob("VghLantern__ProjectFile__*__.json"),
            key=lambda path_obj: path_obj.stat().st_mtime if path_obj.exists() else 0.0,
            reverse=True
        )

        for file_path in all_project_files:
            try:
                raw_data     = json.loads(file_path.read_text(encoding="utf-8"))
                metadata     = raw_data.get("VghLantern__ProjectFile__Metadata", {})
                project_code = metadata.get("VghLantern__ProjectFile__Metadata__ProjectCode", "")
                if not project_code:
                    project_code = self.Na__Server__ExtractProjectCodeFromFileName(file_path.name) or ""
                if not project_code or project_code in seen_project_codes:
                    continue

                seen_project_codes.add(project_code)
                projects.append({
                    "projectCode"  : project_code,
                    "projectName"  : metadata.get("VghLantern__ProjectFile__Metadata__ProjectName", ""),
                    "documentName" : metadata.get("VghLantern__ProjectFile__Metadata__DocumentName", ""),
                    "clientName"   : metadata.get("VghLantern__ProjectFile__Metadata__ClientName", ""),
                    "status"       : metadata.get("VghLantern__ProjectFile__Metadata__DocumentStatus", "Draft"),
                    "dateCreated"  : metadata.get("VghLantern__ProjectFile__Metadata__DateCreated", ""),
                    "dateModified" : metadata.get("VghLantern__ProjectFile__Metadata__DateModified", ""),
                })
            except Exception as read_error:
                print(f"[WARN] Could not read project file {file_path.name}: {read_error}")

        self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": projects})
    # ------------------------------------------------------------

    # SUB FUNCTION | Load a single project file from disk
    # ------------------------------------------------------------
    def Na__Server__HandleProjectLoad(self, project_code: str) -> None:
        file_path = self.Na__Server__ResolveProjectFilePath(project_code)
        if not file_path.is_file():
            self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return
        try:
            project_data = json.loads(file_path.read_text(encoding="utf-8"))
            self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": project_data})
        except Exception as load_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(load_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Save project JSON body to disk
    # ------------------------------------------------------------
    def Na__Server__HandleProjectSave(self, project_code: str) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Empty body"})
            return

        try:
            raw_body     = self.rfile.read(content_length)
            project_data = json.loads(raw_body.decode("utf-8"))
        except Exception as parse_error:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": f"Invalid JSON: {parse_error}"})
            return

        metadata = project_data.get("VghLantern__ProjectFile__Metadata", {})
        code_in_body = metadata.get("VghLantern__ProjectFile__Metadata__ProjectCode", "")
        if code_in_body != project_code:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Project code mismatch"})
            return
        project_name = metadata.get("VghLantern__ProjectFile__Metadata__ProjectName", "")

        update_source    = self.headers.get("X-VghLantern-UpdateSource", "unspecified")
        file_path        = self.Na__Server__ResolveProjectFilePath(project_code)
        target_file_path = self.Na__Server__GetProjectFilePath(project_code, project_name)
        existing_project_data = None

        if file_path.is_file():
            try:
                existing_project_data = json.loads(file_path.read_text(encoding="utf-8"))
            except Exception as read_error:
                print(f"[WARN] Could not parse existing project file {file_path.name}: {read_error}")

        baseline_project_data = existing_project_data if existing_project_data is not None else {}
        change_entries = Na__Server__CollectJsonDiffEntries(baseline_project_data, project_data)

        print(
            f"[PROJECT_SAVE] code={project_code} source={update_source} "
            f"payloadBytes={content_length} changedKeys={len(change_entries)}"
        )
        if not change_entries:
            print(f"[PROJECT_SAVE] code={project_code} source={update_source} no key/value updates detected.")
        else:
            for change_entry in change_entries:
                path_label  = change_entry["path"]
                change_type = change_entry["changeType"]
                old_value   = Na__Server__JsonValueToLogValue(change_entry["oldValue"])
                new_value   = Na__Server__JsonValueToLogValue(change_entry["newValue"])
                print(
                    f"[PROJECT_CHANGE] code={project_code} source={update_source} "
                    f"path={path_label} change={change_type} old={old_value} new={new_value}"
                )

        NA__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)
        try:
            target_file_path.write_text(json.dumps(project_data, indent=4, ensure_ascii=False), encoding="utf-8")
            if file_path.is_file() and file_path != target_file_path:
                print(f"[PROJECT] Filename updated: {file_path.name} -> {target_file_path.name}")
            self.Na__Server__DeleteStaleProjectFileVariants(project_code, target_file_path)
            print(f"[PROJECT] Saved: {target_file_path.name}")
            self.Na__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as write_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(write_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Delete a project file from disk
    # ------------------------------------------------------------
    def Na__Server__HandleProjectDelete(self, project_code: str) -> None:
        file_candidates = self.Na__Server__ListProjectFileCandidates(project_code)
        if not file_candidates:
            self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return
        try:
            for file_path in file_candidates:
                file_path.unlink()
                print(f"[PROJECT] Deleted: {file_path.name}")
            self.Na__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as delete_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(delete_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Load a single user menu config file from disk
    # ------------------------------------------------------------
    def Na__Server__HandleUserMenuConfigLoad(self, user_slug: str) -> None:
        file_path = self.Na__Server__GetUserMenuConfigFilePath(user_slug)
        if not file_path.is_file():
            self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": "User menu config not found"})
            return
        try:
            menu_config_data = json.loads(file_path.read_text(encoding="utf-8"))
            self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": menu_config_data})
        except Exception as load_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(load_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Save user menu config JSON body to disk
    # ------------------------------------------------------------
    def Na__Server__HandleUserMenuConfigSave(self, user_slug: str) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Empty body"})
            return

        try:
            raw_body = self.rfile.read(content_length)
            menu_config_data = json.loads(raw_body.decode("utf-8"))
        except Exception as parse_error:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": f"Invalid JSON: {parse_error}"})
            return

        NA__SERVER__USER_MENU_DATA_PATH.mkdir(parents=True, exist_ok=True)
        file_path = self.Na__Server__GetUserMenuConfigFilePath(user_slug)

        try:
            file_path.write_text(json.dumps(menu_config_data, indent=4, ensure_ascii=False), encoding="utf-8")
            print(f"[USER_MENU] Saved: {file_path.name}")
            sync_ok = self.Na__Server__SyncMainAppDefaultsFromUserMenu(user_slug, menu_config_data)
            if not sync_ok:
                self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": "Saved user menu config but failed to sync app defaults"})
                return
            self.Na__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as write_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(write_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Write JSON HTTP response body
    # ------------------------------------------------------------
    def Na__Server__WriteJsonResponse(self, status_code: int, payload: dict) -> None:
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body_bytes)
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle OPTIONS preflight (CORS)
    # ------------------------------------------------------------
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-VghLantern-UpdateSource")
        self.send_header("Content-Length", "0")    # <-- Explicit zero-length body keeps HTTP/1.1 keep-alive framing unambiguous
        self.end_headers()
    # ------------------------------------------------------------

    # SUB FUNCTION | Reduce noisy default formatting and suppress health pings
    # ------------------------------------------------------------
    def log_message(self, format: str, *args) -> None:
        message = format % args
        if "api/system/health" in message:
            return                                                               # <-- Suppress health check noise from console output
        client_ip    = self.client_address[0]
        request_time = datetime.now().strftime("%d-%b-%Y - %H:%M")
        print(f"[REQUEST] {request_time} | {client_ip} | {message}")
    # ------------------------------------------------------------


class Na__Server__HttpServer(ThreadingHTTPServer):
    request_queue_size = 128    # <-- Larger accept() backlog absorbs the page-load burst of 90+ concurrent script requests


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Console Flags - Runtime Restart Commands
# -----------------------------------------------------------------------------

NA__SERVER__RESTART_FLAG_TOKENS = {
    "--r",
    "--R",
    "--restart",
    "--Restart"
}


def Na__Server__ConsoleCommandReader(command_queue: SimpleQueue, stop_event: threading.Event) -> None:
    # HELPER FUNCTION | Read Console Commands and Queue Them
    # ------------------------------------------------------------
    while not stop_event.is_set():
        try:
            command_value = input().strip()
        except EOFError:
            return
        except KeyboardInterrupt:
            return

        if not command_value:
            continue
        command_queue.put(command_value)
    # ------------------------------------------------------------


def Na__Server__TryHandleQueuedConsoleCommands(command_queue: SimpleQueue) -> bool:
    # HELPER FUNCTION | Process Queued Console Commands
    # ------------------------------------------------------------
    should_restart_server = False
    while True:
        try:
            command_value = command_queue.get_nowait()
        except Empty:
            break

        if command_value in NA__SERVER__RESTART_FLAG_TOKENS:
            print("=============================================================================")
            print(f" VGHLANTERN - RESTART FLAG RECEIVED ({command_value})")
            print(" Restarting server...")
            print("=============================================================================")
            should_restart_server = True
            break

        print(f' [WARN] Unknown console command: "{command_value}"')
        print(" [WARN] Supported restart flags: --r | --R | --restart | --Restart")
    return should_restart_server
    # ------------------------------------------------------------


def Na__Server__RunHttpLoopWithConsoleCommands(httpd: ThreadingHTTPServer, command_queue: SimpleQueue | None) -> bool:
    # HELPER FUNCTION | Run Request Loop and Check Console Commands
    # ------------------------------------------------------------
    httpd.timeout = 0.50
    while True:
        httpd.handle_request()
        if command_queue is None:
            continue
        if Na__Server__TryHandleQueuedConsoleCommands(command_queue):
            return True
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Deep-Bust Every Client Cache via the Service Worker Token
# ------------------------------------------------------------
# The service worker's PWA_SW_VERSION_TOKEN names every cache bucket, and the
# worker deletes any bucket that does not match it on activate. Stamping a
# fresh timestamp token here makes the worker file byte-different, so every
# connected browser re-fetches it (served no-store), installs it, and drops
# ALL cached shell and data buckets on activation - a complete cache bust
# pushed from the server side with no client action needed beyond a reload.
# The /api/ routes are never cached by the worker and every response already
# carries Cache-Control: no-store, so this token is the one stale surface.
# Returns the new token, or None when the worker file could not be stamped.
def Na__Server__BustClientCaches() -> str | None:
    try:
        worker_source = NA__SERVER__SERVICE_WORKER_PATH.read_text(encoding="utf-8")
    except OSError as read_error:
        print(f" [WARN] Cache bust skipped - could not read service worker: {read_error}")
        return None

    new_token = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    stamped_source, replaced_count = NA__SERVER__SW_VERSION_TOKEN_PATTERN.subn(
        rf"\g<1>'{new_token}'", worker_source, count=1
    )

    if replaced_count != 1:
        print(" [WARN] Cache bust skipped - PWA_SW_VERSION_TOKEN line not found in the service worker.")
        return None

    try:
        NA__SERVER__SERVICE_WORKER_PATH.write_text(stamped_source, encoding="utf-8")
    except OSError as write_error:
        print(f" [WARN] Cache bust skipped - could not write service worker: {write_error}")
        return None

    return new_token
# ------------------------------------------------------------


# HELPER FUNCTION | Build Dot/Index JSON Path Segment
# ------------------------------------------------------------
def Na__Server__BuildJsonPath(parent_path: str, key_or_index: str) -> str:
    if not parent_path:
        return key_or_index
    if key_or_index.startswith("["):
        return parent_path + key_or_index
    return f"{parent_path}.{key_or_index}"
# ------------------------------------------------------------


# HELPER FUNCTION | Format JSON Value for Log Output
# ------------------------------------------------------------
def Na__Server__JsonValueToLogValue(value: Any) -> str:
    if value is None:
        return "null"
    try:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except TypeError:
        return json.dumps(str(value), ensure_ascii=False, separators=(",", ":"))
# ------------------------------------------------------------


# HELPER FUNCTION | Collect JSON Key/Value Diff Entries
# ------------------------------------------------------------
def Na__Server__CollectJsonDiffEntries(old_value: Any, new_value: Any, path: str = "") -> list[dict]:
    diff_entries: list[dict] = []

    if isinstance(old_value, dict) and isinstance(new_value, dict):
        all_keys = sorted(set(old_value.keys()) | set(new_value.keys()))
        for key in all_keys:
            child_path  = Na__Server__BuildJsonPath(path, key)
            old_has_key = key in old_value
            new_has_key = key in new_value

            if not old_has_key:
                diff_entries.append({
                    "path": child_path,
                    "changeType": "added",
                    "oldValue": None,
                    "newValue": new_value[key],
                })
                continue

            if not new_has_key:
                diff_entries.append({
                    "path": child_path,
                    "changeType": "removed",
                    "oldValue": old_value[key],
                    "newValue": None,
                })
                continue

            diff_entries.extend(Na__Server__CollectJsonDiffEntries(old_value[key], new_value[key], child_path))
        return diff_entries

    if isinstance(old_value, list) and isinstance(new_value, list):
        max_len = max(len(old_value), len(new_value))
        for index in range(max_len):
            child_path = Na__Server__BuildJsonPath(path, f"[{index}]")
            if index >= len(old_value):
                diff_entries.append({
                    "path": child_path,
                    "changeType": "added",
                    "oldValue": None,
                    "newValue": new_value[index],
                })
                continue

            if index >= len(new_value):
                diff_entries.append({
                    "path": child_path,
                    "changeType": "removed",
                    "oldValue": old_value[index],
                    "newValue": None,
                })
                continue

            diff_entries.extend(Na__Server__CollectJsonDiffEntries(old_value[index], new_value[index], child_path))
        return diff_entries

    if old_value != new_value:
        diff_entries.append({
            "path": path if path else "<root>",
            "changeType": "updated",
            "oldValue": old_value,
            "newValue": new_value,
        })
    return diff_entries
# ------------------------------------------------------------


def Na__Server__GetLocalIp() -> str:
    # HELPER FUNCTION | Resolve LAN IP for network testing
    # ------------------------------------------------------------
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip_address = sock.getsockname()[0]
        sock.close()
        return ip_address
    except Exception:
        return "127.0.0.1"
    # ------------------------------------------------------------


def Na__Server__ValidateRoot(root_path: Path) -> Tuple[bool, str]:
    # HELPER FUNCTION | Validate required app entry file exists
    # ------------------------------------------------------------
    index_path = root_path / "VghLantern__App__.html"
    if not index_path.exists():
        return False, f"Missing required file: {index_path}"
    return True, "OK"
    # ------------------------------------------------------------


def Na__Server__ConfigureOutputStreams(silent_mode: bool, log_file_name: str) -> None:
    # HELPER FUNCTION | Configure Output Streams for Visible or Silent Runtime
    # ------------------------------------------------------------
    global NA__SERVER__OUTPUT_LOG_HANDLE

    should_redirect_to_log = silent_mode or sys.stdout is None or sys.stderr is None
    if not should_redirect_to_log:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(line_buffering=True)
        return

    log_file_path = (NA__SERVER__APP_ROOT_PATH / log_file_name).resolve()
    log_file_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        NA__SERVER__OUTPUT_LOG_HANDLE = log_file_path.open("a", encoding="utf-8", buffering=1)
    except OSError:
        NA__SERVER__OUTPUT_LOG_HANDLE = open(os.devnull, "w", encoding="utf-8")

    sys.stdout = NA__SERVER__OUTPUT_LOG_HANDLE
    sys.stderr = NA__SERVER__OUTPUT_LOG_HANDLE
    print("=============================================================================")
    print(f" VGHLANTERN - SILENT SERVER OUTPUT REDIRECT ACTIVE -> {log_file_path}")
    print("=============================================================================")
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Startup
# -----------------------------------------------------------------------------


def main() -> int:
    # FUNCTION | Parse command-line options
    # ------------------------------------------------------------
    parser = argparse.ArgumentParser(description="VghLantern local static server")
    parser.add_argument("--port", type=int, default=NA__SERVER__DEFAULT_PORT, help=f"Port number (default: {NA__SERVER__DEFAULT_PORT})")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    parser.add_argument("--silent", action="store_true", help="Redirect output to log file for no-console launches")
    parser.add_argument("--log-file", type=str, default="Na__VghLanternServer__Startup.log", help="Log file path relative to app root")
    parser.add_argument("--no-cache-bust", action="store_true", help="Skip stamping a fresh service worker cache token on start and restart")
    args = parser.parse_args()
    # ------------------------------------------------------------

    Na__Server__ConfigureOutputStreams(args.silent, args.log_file)

    root_path = NA__SERVER__APP_ROOT_PATH
    os.chdir(root_path)

    is_valid, validation_message = Na__Server__ValidateRoot(root_path)
    if not is_valid:
        print("=============================================================================")
        print(" VGHLANTERN - SERVER START FAILED")
        print("=============================================================================")
        print(f"Error: {validation_message}")
        return 1

    local_ip   = Na__Server__GetLocalIp()
    server_url = f"http://{args.host}:{args.port}/VghLantern__App__.html"
    lan_url    = f"http://{local_ip}:{args.port}/VghLantern__App__.html"

    print("=============================================================================")
    print(" VGHLANTERN - STATIC DEVELOPMENT SERVER")
    print("=============================================================================")
    print(f" Root Directory : {root_path}")
    print(f" Local URL      : {server_url}")
    print(f" LAN URL        : {lan_url}")
    print(" Press Ctrl+C to stop server")
    if not args.silent:
        print(" Restart flags  : --r | --R | --restart | --Restart")
        print(" Cache bust     : every start and restart stamps a fresh service worker")
        print("                  token, so clients drop ALL cached files on next load")
        print("                  (disable with --no-cache-bust)")
    print("=============================================================================")

    command_queue             = None
    command_reader_stop_event = None
    command_reader_thread     = None
    if not args.silent and sys.stdin and sys.stdin.isatty():
        command_queue             = SimpleQueue()
        command_reader_stop_event = threading.Event()
        command_reader_thread     = threading.Thread(
            target=Na__Server__ConsoleCommandReader,
            args=(command_queue, command_reader_stop_event),
            daemon=True
        )
        command_reader_thread.start()

    try:
        while True:
            # Runs on the first start AND on every console-flag restart, so
            # typing --r after a data edit pushes a complete cache bust: every
            # client's service worker re-installs and drops all cached buckets.
            if not args.no_cache_bust:
                stamped_token = Na__Server__BustClientCaches()
                if stamped_token:
                    print(f" Cache bust     : service worker token stamped {stamped_token}")
                    print("                  Reload the app once for the fresh worker to take over.")

            httpd = Na__Server__HttpServer((args.host, args.port), Na__Server__RequestHandler)
            should_restart_server = Na__Server__RunHttpLoopWithConsoleCommands(httpd, command_queue)
            httpd.server_close()
            if not should_restart_server:
                break
            print("=============================================================================")
            print(" VGHLANTERN - SERVER RESTARTED")
            print("=============================================================================")
    except KeyboardInterrupt:
        print("\n=============================================================================")
        print(" VGHLANTERN - SERVER STOPPED")
        print("=============================================================================")
        return 0
    except OSError as os_error:
        print("=============================================================================")
        print(" VGHLANTERN - SERVER ERROR")
        print("=============================================================================")
        print(f" Failed to bind to {args.host}:{args.port} -> {os_error}")
        return 1
    finally:
        if command_reader_stop_event is not None:
            command_reader_stop_event.set()


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
