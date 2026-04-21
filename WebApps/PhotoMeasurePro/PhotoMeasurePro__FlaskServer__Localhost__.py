# =============================================================================
# PHOTOMEASUREPRO - FLASK LOCALHOST SERVER
# =============================================================================
#
# FILE       : PhotoMeasurePro__FlaskServer__Localhost__.py
# NAMESPACE  : PhotoMeasurePro
# MODULE     : Flask Localhost Static Server
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Localhost Flask server for PhotoMeasurePro static rebuild app
# CREATED    : 21-Apr-2026
#
# DESCRIPTION:
# - Lightweight Flask server for serving the rebuilt PhotoMeasurePro app.
# - Serves the root application shell `PhotoMeasurePro__App__.html`.
# - Serves JS, CSS, JSON, and asset files from project directories.
# - Runs on dedicated port 8003 to avoid collisions with other WebApps.
# - Uses bundled Flask dependencies from Whitecardopedia when available.
#
# API ENDPOINTS:
# - GET /                       : Serve PhotoMeasurePro app shell
# - GET /PhotoMeasurePro__App__.html : Serve app shell directly
# - GET /<path:path>            : Serve static files with app-shell fallback
#
# =============================================================================

import os
import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Dependency Setup
# -----------------------------------------------------------------------------

SCRIPT_DIR                   = os.path.dirname(os.path.abspath(__file__))        # <-- PhotoMeasurePro root
WEBAPPS_ROOT                 = os.path.dirname(SCRIPT_DIR)                        # <-- WebApps folder
BUNDLED_FLASK_DEPS_PATH      = os.path.join(
    WEBAPPS_ROOT,
    "Whitecardopedia",
    "src",
    "ThirdParty__VersionLockedDependencies",
    "SERVER__FlaskServerDepencies"
)

if os.path.exists(BUNDLED_FLASK_DEPS_PATH):
    sys.path.insert(0, BUNDLED_FLASK_DEPS_PATH)                                   # <-- Use version-locked Flask deps

# endregion -------------------------------------------------------------------

from flask import Flask, send_from_directory
from flask_cors import CORS

# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration
# -----------------------------------------------------------------------------

SERVER_HOST                  = "127.0.0.1"                                        # <-- Localhost binding
SERVER_PORT                  = 8003                                               # <-- PhotoMeasurePro dedicated local port
APP_SHELL_FILENAME           = "PhotoMeasurePro__App__.html"                      # <-- App shell entrypoint

app = Flask(__name__, static_folder=SCRIPT_DIR)
CORS(app)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Route Handlers
# -----------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def PhotoMeasurePro__FlaskServer__ServeRoot():
    return send_from_directory(SCRIPT_DIR, APP_SHELL_FILENAME)


@app.route(f"/{APP_SHELL_FILENAME}", methods=["GET"])
def PhotoMeasurePro__FlaskServer__ServeShell():
    return send_from_directory(SCRIPT_DIR, APP_SHELL_FILENAME)


@app.route("/<path:path>", methods=["GET"])
def PhotoMeasurePro__FlaskServer__ServeStatic(path):
    requested_path = Path(os.path.join(SCRIPT_DIR, path)).resolve()
    project_root = Path(SCRIPT_DIR).resolve()

    if project_root not in requested_path.parents and requested_path != project_root:
        return send_from_directory(SCRIPT_DIR, APP_SHELL_FILENAME)

    if requested_path.is_file():
        return send_from_directory(SCRIPT_DIR, path)

    return send_from_directory(SCRIPT_DIR, APP_SHELL_FILENAME)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Server Startup
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 77)
    print(" PHOTOMEASUREPRO - FLASK LOCALHOST SERVER")
    print("=" * 77)
    print()
    print(f" Server running at: http://{SERVER_HOST}:{SERVER_PORT}/{APP_SHELL_FILENAME}")
    print(" Press Ctrl+C to stop the server")
    print()
    print("=" * 77)
    print()

    app.run(
        host=SERVER_HOST,
        port=SERVER_PORT,
        debug=True
    )

# endregion -------------------------------------------------------------------
