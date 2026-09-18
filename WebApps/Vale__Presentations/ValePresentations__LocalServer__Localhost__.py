#!/usr/bin/env python3
"""
=============================================================================
 VALE PRESENTATIONS - LOCAL SERVER LOCALHOST
=============================================================================
Purpose:
- Serve the Vale Presentations demos over HTTP so they can be reviewed in a
  browser exactly as they will look once shared
- Force no-store, so an edit reaches the browser on the next refresh

Flags:
- --port     Port to bind. Defaults to 8011, reserved for Vale Presentations.
- --host     Host to bind. Defaults to 127.0.0.1.
- --silent   Suppress the per-request log lines.
- --open     Open the default presentation in the browser once bound.

Notes:
- Standard library ThreadingHTTPServer only - no Flask, nothing to install.
- Port 8011 is reserved for Vale Presentations. 8000-8010 are taken by the
  other Vale / Noble web apps - see WebApps/.claude/launch.json and each
  app's own server for the full list.
- This folder can hold more than one presentation demo over time. "/" always
  opens NA__SERVER__DEFAULT_DOCUMENT below; any other demo is reached by its
  own path, e.g. http://127.0.0.1:8011/SomeOtherDemo/Index.html
=============================================================================
"""

from __future__ import annotations

import argparse
import os
import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Server Constants
# -----------------------------------------------------------------------------

NA__SERVER__APP_ROOT_PATH      = Path(__file__).resolve().parent
NA__SERVER__DEFAULT_DOCUMENT   = "SystemIdea__ObjectLibray/ValeObjectLibrary__Demo__.html"
NA__SERVER__DEFAULT_PORT       = 8011                                            # <-- Reserved port for Vale Presentations
NA__SERVER__DEFAULT_HOST       = "127.0.0.1"

NA__SERVER__SILENT             = False

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Request Handler
# -----------------------------------------------------------------------------

class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"    # <-- Keep-alive, avoids a fresh socket per file on Windows

    # SUB FUNCTION | Force no-store so an edit always reaches the browser
    # ------------------------------------------------------------
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()
    # ------------------------------------------------------------

    # SUB FUNCTION | Redirect the site root to the default presentation
    # ------------------------------------------------------------
    # A real redirect (not an internal path rewrite) so the browser's address bar
    # lands on the demo's own folder - otherwise every image and link inside the
    # page, written relative to its own folder, resolves against "/" instead and
    # 404s.
    def do_GET(self) -> None:                                                    # noqa: N802 - stdlib naming
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/" + NA__SERVER__DEFAULT_DOCUMENT)
            self.send_header("Content-Length", "0")                              # <-- Required under HTTP/1.1 keep-alive, or the client hangs waiting for a body
            self.end_headers()
            return
        super().do_GET()
    # ------------------------------------------------------------

    # SUB FUNCTION | Quieten the request log unless asked for
    # ------------------------------------------------------------
    def log_message(self, format: str, *args) -> None:                           # noqa: A002 - stdlib signature
        if NA__SERVER__SILENT:
            return
        sys.stdout.write("  %s  %s\n" % (self.log_date_time_string(), format % args))
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server
# -----------------------------------------------------------------------------

class Na__Server__HttpServer(ThreadingHTTPServer):
    daemon_threads      = True
    allow_reuse_address = True                                                   # <-- Restart without waiting out TIME_WAIT

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Print the Start-Up Banner
    # ------------------------------------------------------------
def Na__Server__PrintBanner(host: str, port: int) -> None:
    url = f"http://{host}:{port}/{NA__SERVER__DEFAULT_DOCUMENT}"

    print("=============================================================================")
    print(" VALE PRESENTATIONS - LOCALHOST SERVER")
    print("=============================================================================")
    print(f" Serving        : {NA__SERVER__APP_ROOT_PATH}")
    print(f" Default demo   : {url}")
    print(f" Root redirect  : http://{host}:{port}/  ->  {NA__SERVER__DEFAULT_DOCUMENT}")
    print(" Caching        : no-store on every response, so edits land on refresh")
    print(" Stop           : Ctrl+C")
    print("=============================================================================")
    # ------------------------------------------------------------


    # FUNCTION | Bind and Serve
    # ------------------------------------------------------------
def main() -> int:
    global NA__SERVER__SILENT

    parser = argparse.ArgumentParser(description="Serve Vale Presentations over localhost.")
    parser.add_argument("--port",   type=int, default=NA__SERVER__DEFAULT_PORT, help="Port to bind (default 8011)")
    parser.add_argument("--host",   type=str, default=NA__SERVER__DEFAULT_HOST, help="Host to bind (default 127.0.0.1)")
    parser.add_argument("--silent", action="store_true", help="Suppress the per-request log")
    parser.add_argument("--open",   action="store_true", help="Open the default presentation in the browser")
    args = parser.parse_args()

    NA__SERVER__SILENT = args.silent

    os.chdir(NA__SERVER__APP_ROOT_PATH)
    handler = partial(Na__Server__RequestHandler, directory=str(NA__SERVER__APP_ROOT_PATH))

    try:
        httpd = Na__Server__HttpServer((args.host, args.port), handler)
    except OSError as os_error:
        print("=============================================================================")
        print(" VALE PRESENTATIONS - SERVER ERROR")
        print("=============================================================================")
        print(f" Could not bind to {args.host}:{args.port}  ->  {os_error}")
        print(" Another process is probably already on that port. Try --port 8012.")
        print("=============================================================================")
        return 1

    Na__Server__PrintBanner(args.host, args.port)

    if args.open:
        # Opened from a timer thread rather than inline, because the browser can request
        # the document before serve_forever has started listening and get a connection
        # refused on the very first load.
        threading.Timer(
            0.6,
            lambda: webbrowser.open(f"http://{args.host}:{args.port}/{NA__SERVER__DEFAULT_DOCUMENT}")
        ).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n=============================================================================")
        print(" VALE PRESENTATIONS - SERVER STOPPED")
        print("=============================================================================")
    finally:
        httpd.server_close()

    return 0
    # ------------------------------------------------------------


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
