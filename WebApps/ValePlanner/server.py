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
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty, SimpleQueue
from urllib.parse import urlparse
from typing import Tuple


# -----------------------------------------------------------------------------
# REGION | Server Handler
# -----------------------------------------------------------------------------

NA__SERVER__WORKERS_JSON_PATH = Path("02__Src__AppModules/03__AppData/Na__AppData__Workers__AdamW__.json")
NA__SERVER__TIMECARD_JSON_PATH = Path("02__Src__AppModules/12__Feature__TimecardSystem/Na__Feature__Data__TimecardData__.json")
NA__SERVER__APP_ROOT_PATH = Path(__file__).resolve().parent
NA__SERVER__SHARED_ASSETS_ROOT_PATH = (NA__SERVER__APP_ROOT_PATH.parent / "assets__CommonApplicationAssets").resolve()
NA__SERVER__OUTPUT_LOG_HANDLE = None


class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
    }

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
        if request_path.endswith("/api/system/health"):
            return "health"
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
        if api_route_key == "health":
            self.Na__Server__WriteJsonResponse(200, {
                "ok": True,
                "data": {
                    "status": "healthy",
                    "utcIsoTimestamp": datetime.now(timezone.utc).isoformat(),
                }
            })
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
            print(f" VALEPLANNER - RESTART FLAG RECEIVED ({command_value})")
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
    print(f" VALEPLANNER - SILENT SERVER OUTPUT REDIRECT ACTIVE -> {log_file_path}")
    print("=============================================================================")
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
    parser.add_argument("--silent", action="store_true", help="Redirect output to log file for no-console launches")
    parser.add_argument("--log-file", type=str, default="Na__ValePlannerServer__Runtime.log", help="Log file path relative to app root")
    args = parser.parse_args()
    # ------------------------------------------------------------

    Na__Server__ConfigureOutputStreams(args.silent, args.log_file)

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
    if not args.silent:
        print(" Restart flags  : --r | --R | --restart | --Restart")
    print("=============================================================================")

    command_queue = None
    command_reader_stop_event = None
    command_reader_thread = None
    if not args.silent and sys.stdin and sys.stdin.isatty():
        command_queue = SimpleQueue()
        command_reader_stop_event = threading.Event()
        command_reader_thread = threading.Thread(
            target=Na__Server__ConsoleCommandReader,
            args=(command_queue, command_reader_stop_event),
            daemon=True
        )
        command_reader_thread.start()

    try:
        while True:
            httpd = ThreadingHTTPServer((args.host, args.port), Na__Server__RequestHandler)
            should_restart_server = Na__Server__RunHttpLoopWithConsoleCommands(httpd, command_queue)
            httpd.server_close()
            if not should_restart_server:
                break
            print("=============================================================================")
            print(" VALEPLANNER - SERVER RESTARTED")
            print("=============================================================================")
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
    finally:
        if command_reader_stop_event is not None:
            command_reader_stop_event.set()


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
