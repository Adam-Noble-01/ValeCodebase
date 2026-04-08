#!/usr/bin/env python3
"""
=============================================================================
 VALEPLANNER - STATIC DEVELOPMENT SERVER
=============================================================================
Purpose:
- Serve ValePlanner over HTTP for module loading (no file:// CORS issues)
- Provide clear startup feedback and request logging
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from typing import Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)


# -----------------------------------------------------------------------------
# REGION | Server Handler
# -----------------------------------------------------------------------------

NA__SERVER__WORKERS_JSON_PATH = Path("02__Src__AppModules/03__AppData/Na__AppData__Workers__AdamW__.json")
NA__SERVER__TIMECARD_JSON_PATH = Path("02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__Data__TimecardData__.json")
NA__SERVER__APP_ROOT_PATH = Path(__file__).resolve().parent
NA__SERVER__SHARED_ASSETS_ROOT_PATH = (NA__SERVER__APP_ROOT_PATH.parent / "assets__CommonApplicationAssets").resolve()


class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
    # SUB FUNCTION | Serve shared app assets from parent WebApps folder
    # ------------------------------------------------------------
    def Na__Server__TryHandleSharedAssetRead(self) -> bool:
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

    # SUB FUNCTION | Resolve API route key from request path
    # ------------------------------------------------------------
    def Na__Server__GetApiRouteKey(self) -> str | None:
        request_path = urlparse(self.path).path.rstrip("/")
        if request_path.endswith("/api/data/workers"):
            return "workers"
        if request_path.endswith("/api/data/timecard"):
            return "timecard"
        return None
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle API data reads on GET requests
    # ------------------------------------------------------------
    def do_GET(self) -> None:
        if self.Na__Server__TryHandleSharedAssetRead():
            return
        api_route_key = self.Na__Server__GetApiRouteKey()
        if api_route_key == "workers":
            self.Na__Server__HandleApiRead(NA__SERVER__WORKERS_JSON_PATH)
            return
        if api_route_key == "timecard":
            self.Na__Server__HandleApiRead(NA__SERVER__TIMECARD_JSON_PATH)
            return
        super().do_GET()
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle API data writes on PUT requests
    # ------------------------------------------------------------
    def do_PUT(self) -> None:
        api_route_key = self.Na__Server__GetApiRouteKey()
        if api_route_key == "workers":
            payload = self.Na__Server__ReadJsonBody()
            if payload is None:
                return
            workers_value = payload.get("workers")
            if not isinstance(workers_value, list):
                self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Invalid payload. Expected object with workers array."})
                return
            self.Na__Server__WriteJsonFile(NA__SERVER__WORKERS_JSON_PATH, {"workers": workers_value})
            return
        if api_route_key == "timecard":
            payload = self.Na__Server__ReadJsonBody()
            if payload is None:
                return
            if not isinstance(payload, dict):
                self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Invalid payload. Expected JSON object."})
                return
            self.Na__Server__WriteJsonFile(NA__SERVER__TIMECARD_JSON_PATH, payload)
            return
        self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": "Unknown API route"})
    # ------------------------------------------------------------

    # SUB FUNCTION | Read JSON file and return API response
    # ------------------------------------------------------------
    def Na__Server__HandleApiRead(self, relative_file_path: Path) -> None:
        try:
            target_path = (Path.cwd() / relative_file_path).resolve()
            with target_path.open("r", encoding="utf-8") as json_file:
                payload = json.load(json_file)
            self.Na__Server__WriteJsonResponse(200, {"ok": True, "data": payload})
        except FileNotFoundError:
            self.Na__Server__WriteJsonResponse(404, {"ok": False, "error": f"File not found: {relative_file_path.as_posix()}"})
        except json.JSONDecodeError as decode_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": f"JSON parse error: {decode_error}"})
        except OSError as os_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": f"File read error: {os_error}"})
    # ------------------------------------------------------------

    # SUB FUNCTION | Write payload JSON to disk and reply
    # ------------------------------------------------------------
    def Na__Server__WriteJsonFile(self, relative_file_path: Path, payload: dict) -> None:
        try:
            target_path = (Path.cwd() / relative_file_path).resolve()
            with target_path.open("w", encoding="utf-8", newline="\n") as json_file:
                json.dump(payload, json_file, indent=2, ensure_ascii=False)
                json_file.write("\n")
            self.Na__Server__WriteJsonResponse(200, {"ok": True, "message": f"Saved {relative_file_path.as_posix()}"})
        except OSError as os_error:
            self.Na__Server__WriteJsonResponse(500, {"ok": False, "error": f"File write error: {os_error}"})
    # ------------------------------------------------------------

    # SUB FUNCTION | Parse JSON request body
    # ------------------------------------------------------------
    def Na__Server__ReadJsonBody(self) -> dict | None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Invalid Content-Length header"})
            return None
        if content_length <= 0:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Request body is required"})
            return None
        try:
            raw_bytes = self.rfile.read(content_length)
            payload = json.loads(raw_bytes.decode("utf-8"))
        except UnicodeDecodeError:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Request body must be UTF-8 encoded JSON"})
            return None
        except json.JSONDecodeError as decode_error:
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": f"Invalid JSON body: {decode_error}"})
            return None
        if not isinstance(payload, dict):
            self.Na__Server__WriteJsonResponse(400, {"ok": False, "error": "Invalid payload. Expected JSON object."})
            return None
        return payload
    # ------------------------------------------------------------

    # SUB FUNCTION | Write JSON HTTP response body
    # ------------------------------------------------------------
    def Na__Server__WriteJsonResponse(self, status_code: int, payload: dict) -> None:
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body_bytes)
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
    index_path = root_path / "index.html"
    if not index_path.exists():
        return False, f"Missing required file: {index_path}"
    return True, "OK"
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Startup
# -----------------------------------------------------------------------------


def main() -> int:
    # FUNCTION | Parse command-line options
    # ------------------------------------------------------------
    parser = argparse.ArgumentParser(description="ValePlanner local static server")
    parser.add_argument("--port", type=int, default=8001, help="Port number (default: 8001)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    args = parser.parse_args()
    # ------------------------------------------------------------

    root_path = NA__SERVER__APP_ROOT_PATH
    os.chdir(root_path)

    is_valid, validation_message = Na__Server__ValidateRoot(root_path)
    if not is_valid:
        print("=============================================================================")
        print(" VALEPLANNER - SERVER START FAILED")
        print("=============================================================================")
        print(f"Error: {validation_message}")
        return 1

    local_ip = Na__Server__GetLocalIp()
    server_url = f"http://{args.host}:{args.port}/index.html"
    lan_url = f"http://{local_ip}:{args.port}/index.html"

    print("=============================================================================")
    print(" VALEPLANNER - STATIC DEVELOPMENT SERVER")
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
        print(" VALEPLANNER - SERVER STOPPED")
        print("=============================================================================")
        return 0
    except OSError as os_error:
        print("=============================================================================")
        print(" VALEPLANNER - SERVER ERROR")
        print("=============================================================================")
        print(f" Failed to bind to {args.host}:{args.port} -> {os_error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
