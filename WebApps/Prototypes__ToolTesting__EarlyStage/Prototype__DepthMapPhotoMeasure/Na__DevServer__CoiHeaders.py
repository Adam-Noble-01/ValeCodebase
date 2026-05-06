"""
Na__DevServer__CoiHeaders

Tiny static file server that adds the Cross-Origin Isolation headers required
by browsers to enable SharedArrayBuffer (and therefore multi-threaded WASM in
onnxruntime-web). Without these headers the browser refuses to expose multiple
threads, and large ONNX models (DepthPro / Depth Anything V2 ViT-L) take many
minutes to compile a session in single-threaded WASM.

Headers set on every response:
    Cross-Origin-Opener-Policy:   same-origin
    Cross-Origin-Embedder-Policy: require-corp
    Cross-Origin-Resource-Policy: cross-origin     (so HF CDN scripts can load)

Usage:
    python Na__DevServer__CoiHeaders.py [PORT]

Defaults to port 8765, binds to 127.0.0.1.
"""

from __future__ import annotations

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn


class Na__DevServer__Handler(SimpleHTTPRequestHandler):
    """Adds COOP/COEP/CORP headers and applies smart caching:
    - long cache for the heavy version-locked externals (multi-hundred-MB ONNX
      model files, ORT runtime, etc) so reloads stay fast,
    - no-store for everything else so live edits to app source / HTML / CSS /
      JSON config are picked up on the next reload without manual cache-busting.
    """

    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy",   "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", self.Na__DevServer__ResolveCacheControl())
        super().end_headers()

    def Na__DevServer__ResolveCacheControl(self) -> str:
        path = (self.path or "").split("?", 1)[0].split("#", 1)[0].lower()
        if "01__externaldependencies__versionlocked" in path:
            return "public, max-age=86400"
        return "no-store, must-revalidate"

    def log_message(self, format, *args) -> None:
        sys.stdout.write("[%s] %s\n" % (self.address_string(), format % args))


class Na__DevServer__Threaded(ThreadingMixIn, HTTPServer):
    """Threaded so a long ONNX download doesn't block the page reload."""
    daemon_threads = True
    allow_reuse_address = True


def Na__DevServer__Run(port: int = 8765) -> None:
    bind = ("127.0.0.1", port)
    server = Na__DevServer__Threaded(bind, Na__DevServer__Handler)
    print(f"Serving on http://{bind[0]}:{bind[1]}/App.html  (with COI headers)")
    print("Stop with Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    Na__DevServer__Run(port)
