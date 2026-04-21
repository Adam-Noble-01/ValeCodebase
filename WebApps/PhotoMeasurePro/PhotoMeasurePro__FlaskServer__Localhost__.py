# =============================================================================
# PHOTOMEASUREPRO - FLASK LOCALHOST SERVER
# =============================================================================
#
# FILE       : PhotoMeasurePro__FlaskServer__Localhost__.py
# NAMESPACE  : PhotoMeasurePro
# MODULE     : Flask Localhost Static Server + Project API
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Localhost Flask server for PhotoMeasurePro; serves the static
#              app shell and exposes CRUD endpoints for project JSON files
#              stored under 04__LocalProjectData/.
# CREATED    : 21-Apr-2026
#
# =============================================================================

import json
import os
import re
import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Dependency Setup
# -----------------------------------------------------------------------------

SCRIPT_DIR                   = os.path.dirname(os.path.abspath(__file__))
WEBAPPS_ROOT                 = os.path.dirname(SCRIPT_DIR)
BUNDLED_FLASK_DEPS_PATH      = os.path.join(
    WEBAPPS_ROOT,
    "Whitecardopedia",
    "src",
    "ThirdParty__VersionLockedDependencies",
    "SERVER__FlaskServerDepencies"
)

if os.path.exists(BUNDLED_FLASK_DEPS_PATH):
    sys.path.insert(0, BUNDLED_FLASK_DEPS_PATH)

# endregion -------------------------------------------------------------------

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration
# -----------------------------------------------------------------------------

SERVER_HOST                  = "127.0.0.1"
SERVER_PORT                  = 8003
APP_SHELL_FILENAME           = "PhotoMeasurePro__App__.html"
PROJECT_DATA_DIR             = Path(SCRIPT_DIR) / "04__LocalProjectData"
PROJECT_FILE_PREFIX          = "PhotoMeasurePro__ProjectFile__"

app = Flask(__name__, static_folder=SCRIPT_DIR)
CORS(app)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project File Helpers
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Server__SanitiseName(raw_name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", raw_name or "Project").strip("_")[:80]


def PhotoMeasurePro__Server__EnsureProjectDataDir() -> None:
    PROJECT_DATA_DIR.mkdir(parents=True, exist_ok=True)


def PhotoMeasurePro__Server__ResolveProjectFile(project_code: str, project_name: str = "") -> Path:
    PhotoMeasurePro__Server__EnsureProjectDataDir()
    safe_code = PhotoMeasurePro__Server__SanitiseName(project_code)
    for existing_path in PROJECT_DATA_DIR.glob(PROJECT_FILE_PREFIX + safe_code + "__*.json"):
        return existing_path
    safe_name = PhotoMeasurePro__Server__SanitiseName(project_name or "Project")
    return PROJECT_DATA_DIR / f"{PROJECT_FILE_PREFIX}{safe_code}__{safe_name}__.json"


def PhotoMeasurePro__Server__ReadManifestEntry(project_file: Path) -> dict | None:
    try:
        with project_file.open("r", encoding="utf-8") as file_handle:
            project_data = json.load(file_handle)
        metadata = project_data.get("PhotoMeasurePro__ProjectFile__Metadata", {}) or {}
        image    = project_data.get("PhotoMeasurePro__ProjectFile__Image", {}) or {}
        return {
            "projectCode":   metadata.get("ProjectCode", ""),
            "projectName":   metadata.get("ProjectName", ""),
            "author":        metadata.get("Author", ""),
            "dateCreated":   metadata.get("DateCreated", ""),
            "dateModified":  metadata.get("DateModified", ""),
            "imageFileName": image.get("FileName", "")
        }
    except (OSError, json.JSONDecodeError):
        return None

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project API Routes
# -----------------------------------------------------------------------------

@app.route("/api/projects", methods=["GET"])
def PhotoMeasurePro__Server__ListProjectsApi():
    PhotoMeasurePro__Server__EnsureProjectDataDir()
    manifest_entries = []
    for project_file in sorted(PROJECT_DATA_DIR.glob(PROJECT_FILE_PREFIX + "*.json")):
        entry = PhotoMeasurePro__Server__ReadManifestEntry(project_file)
        if entry:
            manifest_entries.append(entry)
    return jsonify({"ok": True, "data": manifest_entries})


@app.route("/api/projects/<project_code>", methods=["GET"])
def PhotoMeasurePro__Server__LoadProjectApi(project_code: str):
    project_file = PhotoMeasurePro__Server__ResolveProjectFile(project_code)
    if not project_file.exists():
        return jsonify({"ok": False, "error": "Project not found: " + project_code}), 404
    try:
        with project_file.open("r", encoding="utf-8") as file_handle:
            project_data = json.load(file_handle)
        return jsonify({"ok": True, "data": project_data})
    except (OSError, json.JSONDecodeError) as read_error:
        return jsonify({"ok": False, "error": str(read_error)}), 500


@app.route("/api/projects/<project_code>", methods=["POST"])
def PhotoMeasurePro__Server__SaveProjectApi(project_code: str):
    project_data = request.get_json(silent=True)
    if not isinstance(project_data, dict):
        return jsonify({"ok": False, "error": "Invalid JSON body"}), 400

    metadata = project_data.get("PhotoMeasurePro__ProjectFile__Metadata", {}) or {}
    project_name_value = metadata.get("ProjectName", "Project")
    project_file = PhotoMeasurePro__Server__ResolveProjectFile(project_code, project_name_value)

    for stale_file in PROJECT_DATA_DIR.glob(PROJECT_FILE_PREFIX + PhotoMeasurePro__Server__SanitiseName(project_code) + "__*.json"):
        if stale_file != project_file:
            try:
                stale_file.unlink()
            except OSError:
                pass

    try:
        with project_file.open("w", encoding="utf-8") as file_handle:
            json.dump(project_data, file_handle, indent=4, ensure_ascii=False)
        return jsonify({"ok": True, "data": {"path": str(project_file.name)}})
    except OSError as write_error:
        return jsonify({"ok": False, "error": str(write_error)}), 500


@app.route("/api/projects/<project_code>", methods=["DELETE"])
def PhotoMeasurePro__Server__DeleteProjectApi(project_code: str):
    project_file = PhotoMeasurePro__Server__ResolveProjectFile(project_code)
    if not project_file.exists():
        return jsonify({"ok": False, "error": "Project not found: " + project_code}), 404
    try:
        project_file.unlink()
        return jsonify({"ok": True})
    except OSError as delete_error:
        return jsonify({"ok": False, "error": str(delete_error)}), 500

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Static File Routes
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
    PhotoMeasurePro__Server__EnsureProjectDataDir()
    print("=" * 77)
    print(" PHOTOMEASUREPRO - FLASK LOCALHOST SERVER")
    print("=" * 77)
    print()
    print(f" Server running at: http://{SERVER_HOST}:{SERVER_PORT}/{APP_SHELL_FILENAME}")
    print(f" Project data dir : {PROJECT_DATA_DIR}")
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
