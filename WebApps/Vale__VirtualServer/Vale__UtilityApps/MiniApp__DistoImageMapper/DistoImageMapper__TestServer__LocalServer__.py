# =============================================================================
# DISTO IMAGE MAPPER - TESTING SERVER
# =============================================================================
#
# FILE       : DistoImageMapper__TestServer__LocalServer__.py
# NAMESPACE  : DistoImageMapper
# MODULE     : Testing Server
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Serve this folder on http://localhost:8033 for testing on this PC
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - ES modules cannot run from file://, and a service worker needs localhost or
#   https, so the app needs a server even though it has no back end.
# - Forces the right content types. On Windows, Python takes them from the registry,
#   which can serve .mjs as text/plain, and then no module loads.
# - Sends no-store, so a refresh always shows the files as saved.
# - Serves /AppAssets__CommonApplicationAssets/ and /help/ from the mirror, as the live
#   server does: the shared install card and its guide come from there.
# - Already running: it only opens the browser, never a second copy.
# - PC only: the sync map never pushes *.py, and nginx never serves them.
#
# =============================================================================

import argparse
import functools
import http.server
import os
import posixpath
import socket
import sys
import urllib.parse
import webbrowser

# -----------------------------------------------------------------------------
# REGION | Module Constants
# -----------------------------------------------------------------------------

DEFAULT_PORT  = 8033                                                         # <-- 8020, 8030 to 8032 and 8042 belong to the other Vale servers
APP_PAGE      = "DistoImageMapper__AppIndex__.html"                          # <-- The page to open
APP_FOLDER    = os.path.dirname(os.path.abspath(__file__))                   # <-- Served from this script's own folder
MIRROR_FOLDER = os.path.dirname(os.path.dirname(APP_FOLDER))                 # <-- Vale__VirtualServer, two folders up

SHARED_ROUTES = (                                                            # <-- The same paths the live server gives every app
    ("/AppAssets__CommonApplicationAssets/", os.path.join(MIRROR_FOLDER, "AppAssets__CommonApplicationAssets")),
    ("/help/", os.path.join(MIRROR_FOLDER, "Vale__ValeVision__Help")),
)

CONTENT_TYPES = {
    ".html"        : "text/html; charset=utf-8",
    ".js"          : "text/javascript; charset=utf-8",
    ".mjs"         : "text/javascript; charset=utf-8",
    ".css"         : "text/css; charset=utf-8",
    ".json"        : "application/json; charset=utf-8",
    ".webmanifest" : "application/manifest+json; charset=utf-8",
    ".svg"         : "image/svg+xml",
    ".png"         : "image/png",
    ".jpg"         : "image/jpeg",
    ".webp"        : "image/webp",
    ".ttf"         : "font/ttf",
    ".csv"         : "text/csv; charset=utf-8",
    ".dxf"         : "text/plain; charset=utf-8",
}

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Server
# -----------------------------------------------------------------------------

class DistoImageMapper__TestServer__Handler(http.server.SimpleHTTPRequestHandler):
    """Static files with the right content types and no caching"""

    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **CONTENT_TYPES}

    def translate_path(self, path):
        decoded = urllib.parse.unquote(urllib.parse.urlsplit(path).path)
        for prefix, folder in SHARED_ROUTES:
            if decoded.startswith(prefix):
                relative = posixpath.normpath(decoded[len(prefix):]).lstrip("/")
                if relative == "." or relative.startswith(".."):             # <-- Never above the shared folder
                    return folder
                return os.path.join(folder, *relative.split("/"))
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")                        # <-- A refresh always shows the files as saved
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"{self.address_string()}  {format % args}\n")      # <-- Keeps the console free of the date stamp


def DistoImageMapper__TestServer__IsPortInUse(port):
    """True when something already answers on this port"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.4)
        return probe.connect_ex(("127.0.0.1", port)) == 0


def DistoImageMapper__TestServer__Main():
    """Start the server, or open the browser if it is already running"""
    parser = argparse.ArgumentParser(description="Disto Image Mapper testing server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve on")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    options = parser.parse_args()

    url = f"http://localhost:{options.port}/{APP_PAGE}"

    if DistoImageMapper__TestServer__IsPortInUse(options.port):
        print(f"Already running: {url}")
        if not options.no_browser:
            webbrowser.open(url)
        return 0

    handler = functools.partial(DistoImageMapper__TestServer__Handler, directory=APP_FOLDER)
    server  = http.server.ThreadingHTTPServer(("127.0.0.1", options.port), handler)

    print(f"Disto Image Mapper testing server: {url}")
    print("Stop: Ctrl+C, or close this window.")
    if not options.no_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(DistoImageMapper__TestServer__Main())

# endregion -------------------------------------------------------------------
