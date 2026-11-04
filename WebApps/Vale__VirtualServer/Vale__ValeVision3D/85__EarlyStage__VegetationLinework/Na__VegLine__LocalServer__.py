# =============================================================================
# VALEVISION 3D - VEGETATION LINEWORK PROTOTYPE - LOCAL SERVER
# =============================================================================
#
# FILE       : Na__VegLine__LocalServer__.py
# NAMESPACE  : Na__VegServer
# MODULE     : Prototype - Vegetation Linework
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Serve this demo on its own, read only, without starting the whole
#              ValeDev local server
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - ES modules do not load from a double-clicked file, so the demo needs a server.
#   The ValeDev server on 8030 serves it too (/valevision/85__EarlyStage__
#   VegetationLinework/), but that one writes the real mirror. This one only reads.
# - WHY NOT python -m http.server. On Windows it takes each file's type from the
#   registry, and a registry that says .js is text/plain stops every module loading.
#   The types are set here. No caching, so an edited recipe shows on reload.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 04-Nov-2026 - Version 0.1.0
# - Initial build for the isolated aesthetic demo.
#
# =============================================================================

import functools
import http.server
import pathlib
import sys
import webbrowser


# -----------------------------------------------------------------------------
# REGION | Server
# -----------------------------------------------------------------------------

NA__VEGSERVER__PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8037
NA__VEGSERVER__ROOT = pathlib.Path(__file__).resolve().parents[2]              # <-- The server folder, so the shared logo resolves as it does on the real site
NA__VEGSERVER__PATH = "/Vale__ValeVision3D/85__EarlyStage__VegetationLinework/"


class Na__VegServer__Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        "": "application/octet-stream",
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".png": "image/png",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass                                                                   # <-- Quiet: a page load is a hundred module requests


if __name__ == "__main__":
    handler = functools.partial(Na__VegServer__Handler, directory=str(NA__VEGSERVER__ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", NA__VEGSERVER__PORT), handler) as server:
        url = f"http://127.0.0.1:{NA__VEGSERVER__PORT}{NA__VEGSERVER__PATH}"
        print(f"[ValeVision3D VegetationLinework] {url}", flush=True)
        if "--open" in sys.argv:
            webbrowser.open(url)
        server.serve_forever()

# endregion -------------------------------------------------------------------
