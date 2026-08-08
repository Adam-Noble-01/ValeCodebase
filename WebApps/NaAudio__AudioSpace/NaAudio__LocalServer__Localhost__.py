#!/usr/bin/env python3
"""
=============================================================================
 NAAUDIO - LOCAL SERVER LOCALHOST
=============================================================================
Purpose:
- Serve AudioSPACE over HTTP so ES modules load at all (file:// blocks them outright)
- Send the right MIME types for .mjs, .webmanifest and the audio bank
- Support HTTP range requests, which the audio bank needs
- Force no-store, so a config edit reaches the browser on the next refresh

Flags:
- --port     Port to bind. Defaults to 8010, which is reserved for AudioSPACE.
- --host     Host to bind. Defaults to 127.0.0.1.
- --silent   Suppress the per-request log lines.
- --open     Open the application in the default browser once bound.

Notes:
- Despite the sibling apps naming theirs "FlaskServer", none of them use Flask and
  neither does this - it is the Python standard library ThreadingHTTPServer. The name
  here is honest about that; the siblings keep theirs for continuity.
- Port 8010 is reserved for AudioSPACE. 8001 to 8006 are taken by ValePlanner,
  ValeSpec and the Lantern Designer.
- There is NO project API here, deliberately. AudioSPACE currently persists nothing -
  PersistenceMode in NaAudio__AppConfig__Main__.json is 'sessionOnly'. When a save path
  lands, it writes into the 2x__Generated__ folders and gets its endpoints here.
- HTTP/1.1 keep-alive is forced. The application loads roughly thirty ES modules plus a
  megabyte of audio, and HTTP/1.0 opens a fresh socket per file - which on Windows
  exhausts socket buffer space and surfaces in Chrome as net::ERR_NO_BUFFER_SPACE.

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
NA__SERVER__APP_DOCUMENT       = "NaAudio__App__.html"
NA__SERVER__DEFAULT_PORT       = 8010                                            # <-- Reserved port for AudioSPACE
NA__SERVER__DEFAULT_HOST       = "127.0.0.1"

NA__SERVER__SILENT             = False

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Request Handler
# -----------------------------------------------------------------------------

class Na__Server__RequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"    # <-- Keep-alive; see the socket buffer note in the file header

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mjs"         : "text/javascript",
        ".webmanifest" : "application/manifest+json",
        ".json"        : "application/json",
        ".wasm"        : "application/wasm",
        ".mp3"         : "audio/mpeg",
        ".ogg"         : "audio/ogg",
        ".wav"         : "audio/wav",
        ".flac"        : "audio/flac",
        ".mid"         : "audio/midi",
        ".hdr"         : "image/vnd.radiance",
    }

    # SUB FUNCTION | Force no-store and advertise range support
    # ------------------------------------------------------------
    # no-store matters more here than it looks. Without it Chrome happily serves a
    # cached Na__Palette__Config.json, and a colour edit appears to do nothing at all
    # while the file on disk is plainly correct - which is a genuinely maddening hour.
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()
    # ------------------------------------------------------------

    # SUB FUNCTION | Serve the application document at the site root
    # ------------------------------------------------------------
    # So http://127.0.0.1:8010/ opens the app rather than a directory listing. A
    # listing is also a small information leak of every folder in the project.
    def do_GET(self) -> None:                                                    # noqa: N802 - stdlib naming
        if self.path in ("/", "/index.html"):
            self.path = "/" + NA__SERVER__APP_DOCUMENT
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
    url = f"http://{host}:{port}/{NA__SERVER__APP_DOCUMENT}"

    print("=============================================================================")
    print(" NAAUDIO - AUDIOSPACE LOCALHOST SERVER")
    print("=============================================================================")
    print(f" Serving        : {NA__SERVER__APP_ROOT_PATH}")
    print(f" Application    : {url}")
    print(f" Root redirect  : http://{host}:{port}/  ->  {NA__SERVER__APP_DOCUMENT}")
    print(" Caching        : no-store on every response, so edits land on refresh")
    print(" Persistence    : none - this build saves nothing. See PersistenceMode in")
    print("                  02__Src__AppModules/02__AppData/NaAudio__AppConfig__Main__.json")
    print(" Stop           : Ctrl+C")
    print("=============================================================================")
    # ------------------------------------------------------------


    # FUNCTION | Bind and Serve
    # ------------------------------------------------------------
def main() -> int:
    global NA__SERVER__SILENT

    parser = argparse.ArgumentParser(description="Serve AudioSPACE over localhost.")
    parser.add_argument("--port",   type=int, default=NA__SERVER__DEFAULT_PORT, help="Port to bind (default 8010)")
    parser.add_argument("--host",   type=str, default=NA__SERVER__DEFAULT_HOST, help="Host to bind (default 127.0.0.1)")
    parser.add_argument("--silent", action="store_true", help="Suppress the per-request log")
    parser.add_argument("--open",   action="store_true", help="Open the application in the default browser")
    args = parser.parse_args()

    NA__SERVER__SILENT = args.silent

    os.chdir(NA__SERVER__APP_ROOT_PATH)
    handler = partial(Na__Server__RequestHandler, directory=str(NA__SERVER__APP_ROOT_PATH))

    try:
        httpd = Na__Server__HttpServer((args.host, args.port), handler)
    except OSError as os_error:
        print("=============================================================================")
        print(" NAAUDIO - SERVER ERROR")
        print("=============================================================================")
        print(f" Could not bind to {args.host}:{args.port}  ->  {os_error}")
        print(" Another process is probably already on that port. Try --port 8011.")
        print("=============================================================================")
        return 1

    Na__Server__PrintBanner(args.host, args.port)

    if args.open:
        # Opened from a timer thread rather than inline, because the browser can request
        # the document before serve_forever has started listening and get a connection
        # refused on the very first load.
        threading.Timer(
            0.6,
            lambda: webbrowser.open(f"http://{args.host}:{args.port}/{NA__SERVER__APP_DOCUMENT}")
        ).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n=============================================================================")
        print(" NAAUDIO - SERVER STOPPED")
        print("=============================================================================")
    finally:
        httpd.server_close()

    return 0
    # ------------------------------------------------------------


if __name__ == "__main__":
    sys.exit(main())

# endregion ----------------------------------------------------
