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
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)


# -----------------------------------------------------------------------------
# REGION | Server Handler
# -----------------------------------------------------------------------------


class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
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
    parser.add_argument("--port", type=int, default=8000, help="Port number (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    args = parser.parse_args()
    # ------------------------------------------------------------

    root_path = Path(__file__).resolve().parent
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
