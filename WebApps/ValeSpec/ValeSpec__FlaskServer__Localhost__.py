#!/usr/bin/env python3
"""
=============================================================================
 VALESPEC - FLASK SERVER LOCALHOST
=============================================================================
Purpose:
- Serve ValeSpec over HTTP for module loading (no file:// CORS issues)
- Provide clear startup feedback and request logging
- Serve shared assets from ../assets__CommonApplicationAssets/
- Provide project CRUD API backed by 04__LocalProjectData/ on disk
"""

from __future__ import annotations

import argparse
import json
import os
import re
import socket
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Tuple


# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

NA__SERVER__APP_ROOT_PATH         = Path(__file__).resolve().parent
NA__SERVER__SHARED_ASSETS_ROOT_PATH = (NA__SERVER__APP_ROOT_PATH.parent / "assets__CommonApplicationAssets").resolve()
NA__SERVER__PROJECT_DATA_PATH     = (NA__SERVER__APP_ROOT_PATH / "04__LocalProjectData").resolve()
NA__SERVER__OUTPUT_LOG_HANDLE     = None

NA__SERVER__PROJECT_CODE_PATTERN  = re.compile(r'^[A-Za-z0-9_\-]{1,64}$')   # Allowlist for safe project codes

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server Handler
# -----------------------------------------------------------------------------

class Na__Server__RequestHandler(SimpleHTTPRequestHandler):

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

    # SUB FUNCTION | Resolve path for a project data file
    # ------------------------------------------------------------
    def Na__Server__GetProjectFilePath(self, project_code: str) -> Path:
        filename = f"ValeSpec__ProjectFile__{project_code}__.json"
        return NA__SERVER__PROJECT_DATA_PATH / filename
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

        project_code = self.Na__Server__ParseProjectCode(request_path)
        if project_code:
            self.Na__Server__HandleProjectLoad(project_code)
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

    # SUB FUNCTION | List all project files from 04__LocalProjectData/
    # ------------------------------------------------------------
    def Na__Server__HandleProjectList(self) -> None:
        NA__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)
        projects = []

        for file_path in sorted(NA__SERVER__PROJECT_DATA_PATH.glob("ValeSpec__ProjectFile__*__.json")):
            try:
                raw_data    = json.loads(file_path.read_text(encoding="utf-8"))
                metadata    = raw_data.get("ValeSpec__ProjectFile__Metadata", {})
                projects.append({
                    "projectCode"  : metadata.get("ValeSpec__ProjectFile__Metadata__ProjectCode", ""),
                    "projectName"  : metadata.get("ValeSpec__ProjectFile__Metadata__ProjectName", ""),
                    "documentName" : metadata.get("ValeSpec__ProjectFile__Metadata__DocumentName", ""),
                    "status"       : metadata.get("ValeSpec__ProjectFile__Metadata__DocumentStatus", "Draft"),
                    "dateCreated"  : metadata.get("ValeSpec__ProjectFile__Metadata__DateCreated", ""),
                    "dateModified" : metadata.get("ValeSpec__ProjectFile__Metadata__DateModified", ""),
                })
            except Exception as read_error:
                print(f"[WARN] Could not read project file {file_path.name}: {read_error}")

        self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": projects})
    # ------------------------------------------------------------

    # SUB FUNCTION | Load a single project file from disk
    # ------------------------------------------------------------
    def Na__Server__HandleProjectLoad(self, project_code: str) -> None:
        file_path = self.Na__Server__GetProjectFilePath(project_code)
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

        metadata = project_data.get("ValeSpec__ProjectFile__Metadata", {})
        code_in_body = metadata.get("ValeSpec__ProjectFile__Metadata__ProjectCode", "")
        if code_in_body != project_code:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Project code mismatch"})
            return

        NA__SERVER__PROJECT_DATA_PATH.mkdir(parents=True, exist_ok=True)
        file_path = self.Na__Server__GetProjectFilePath(project_code)
        try:
            file_path.write_text(json.dumps(project_data, indent=4, ensure_ascii=False), encoding="utf-8")
            print(f"[PROJECT] Saved: {file_path.name}")
            self.Na__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as write_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(write_error)})
    # ------------------------------------------------------------

    # SUB FUNCTION | Delete a project file from disk
    # ------------------------------------------------------------
    def Na__Server__HandleProjectDelete(self, project_code: str) -> None:
        file_path = self.Na__Server__GetProjectFilePath(project_code)
        if not file_path.is_file():
            self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
            return
        try:
            file_path.unlink()
            print(f"[PROJECT] Deleted: {file_path.name}")
            self.Na__Server__WriteJsonResponse(200, {"ok": True})
        except Exception as delete_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": str(delete_error)})
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
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    # ------------------------------------------------------------

    # SUB FUNCTION | Reduce noisy default formatting
    # ------------------------------------------------------------
    def log_message(self, format: str, *args) -> None:
        client_ip = self.client_address[0]
        message = format % args
        print(f"[REQUEST] {client_ip} | {message}")
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------


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
    index_path = root_path / "ValeSpec__App__.html"
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
    print(f" VALESPEC - SILENT SERVER OUTPUT REDIRECT ACTIVE -> {log_file_path}")
    print("=============================================================================")
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Startup
# -----------------------------------------------------------------------------


def main() -> int:
    # FUNCTION | Parse command-line options
    # ------------------------------------------------------------
    parser = argparse.ArgumentParser(description="ValeSpec local static server")
    parser.add_argument("--port", type=int, default=8002, help="Port number (default: 8002)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    parser.add_argument("--silent", action="store_true", help="Redirect output to log file for no-console launches")
    parser.add_argument("--log-file", type=str, default="Na__ValeSpecServer__Startup.log", help="Log file path relative to app root")
    args = parser.parse_args()
    # ------------------------------------------------------------

    Na__Server__ConfigureOutputStreams(args.silent, args.log_file)

    root_path = NA__SERVER__APP_ROOT_PATH
    os.chdir(root_path)

    is_valid, validation_message = Na__Server__ValidateRoot(root_path)
    if not is_valid:
        print("=============================================================================")
        print(" VALESPEC - SERVER START FAILED")
        print("=============================================================================")
        print(f"Error: {validation_message}")
        return 1

    local_ip = Na__Server__GetLocalIp()
    server_url = f"http://{args.host}:{args.port}/ValeSpec__App__.html"
    lan_url = f"http://{local_ip}:{args.port}/ValeSpec__App__.html"

    print("=============================================================================")
    print(" VALESPEC - STATIC DEVELOPMENT SERVER")
    print("=============================================================================")
    print(f" Root Directory : {root_path}")
    print(f" Local URL      : {server_url}")
    print(f" LAN URL        : {lan_url}")
    print(" Press Ctrl+C to stop server")
    print("=============================================================================")

    try:
        httpd = ThreadingHTTPServer((args.host, args.port), Na__Server__RequestHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n=============================================================================")
        print(" VALESPEC - SERVER STOPPED")
        print("=============================================================================")
        return 0
    except OSError as os_error:
        print("=============================================================================")
        print(" VALESPEC - SERVER ERROR")
        print("=============================================================================")
        print(f" Failed to bind to {args.host}:{args.port} -> {os_error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
