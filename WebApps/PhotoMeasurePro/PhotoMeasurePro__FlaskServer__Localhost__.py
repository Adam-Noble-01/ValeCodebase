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
SCENE3D_PIPELINE_PATH        = os.path.join(
    SCRIPT_DIR,
    "05__Server__DepthAndSegmentation"
)
VERSION_LOCKED_DEPS_PATH     = os.path.join(
    SCRIPT_DIR,
    "00__ThirdParty__VersionLockedDependencies"
)

if os.path.exists(BUNDLED_FLASK_DEPS_PATH):
    sys.path.insert(0, BUNDLED_FLASK_DEPS_PATH)
if os.path.exists(SCENE3D_PIPELINE_PATH):
    sys.path.insert(0, SCENE3D_PIPELINE_PATH)
if os.path.exists(VERSION_LOCKED_DEPS_PATH):
    sys.path.insert(0, VERSION_LOCKED_DEPS_PATH)

# endregion -------------------------------------------------------------------

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from PhotoMeasurePro__Server__DepthAndSegmentation__Main__ import (
    PhotoMeasurePro__Scene3d__EnsureDirectories,
    PhotoMeasurePro__Scene3d__RunDepth,
    PhotoMeasurePro__Scene3d__RunSegmentation,
    PhotoMeasurePro__Scene3d__RunDetectVolumes
)

# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration
# -----------------------------------------------------------------------------

SERVER_HOST                  = "127.0.0.1"
SERVER_PORT                  = 8003
APP_SHELL_FILENAME           = "PhotoMeasurePro__App__.html"
PROJECT_DATA_DIR             = Path(SCRIPT_DIR) / "04__LocalProjectData"
PROJECT_FILE_PREFIX          = "PhotoMeasurePro__ProjectFile__"
SCENE3D_CACHE_DIR            = PROJECT_DATA_DIR / "__Scene3dCache__"

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
    SCENE3D_CACHE_DIR.mkdir(parents=True, exist_ok=True)


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
# REGION | Scene3D Helpers
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Server__LoadProjectData(project_code: str) -> dict:
    project_file = PhotoMeasurePro__Server__ResolveProjectFile(project_code)
    if not project_file.exists():
        raise FileNotFoundError(f"Project not found: {project_code}")
    with project_file.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)

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


@app.route("/api/scene3d/depth/<project_code>", methods=["POST"])
def PhotoMeasurePro__Server__GenerateDepthApi(project_code: str):
    try:
        PhotoMeasurePro__Server__EnsureProjectDataDir()
        project_data = PhotoMeasurePro__Server__LoadProjectData(project_code)
        dirs = PhotoMeasurePro__Scene3d__EnsureDirectories(PROJECT_DATA_DIR)
        depth_result = PhotoMeasurePro__Scene3d__RunDepth(
            project_data,
            project_code,
            dirs["cache_dir"],
            Path(VERSION_LOCKED_DEPS_PATH)
        )
        return jsonify({
            "ok": True,
            "data": {
                "filename": depth_result["filename"],
                "cacheUrl": "/api/scene3d/cache/" + depth_result["filename"]
            }
        })
    except Exception as depth_error:
        return jsonify({"ok": False, "error": str(depth_error)}), 500


@app.route("/api/scene3d/segmentation/<project_code>", methods=["POST"])
def PhotoMeasurePro__Server__GenerateSegmentationApi(project_code: str):
    try:
        PhotoMeasurePro__Server__EnsureProjectDataDir()
        project_data = PhotoMeasurePro__Server__LoadProjectData(project_code)
        dirs = PhotoMeasurePro__Scene3d__EnsureDirectories(PROJECT_DATA_DIR)
        segmentation_result = PhotoMeasurePro__Scene3d__RunSegmentation(
            project_data,
            project_code,
            dirs["cache_dir"],
            Path(VERSION_LOCKED_DEPS_PATH)
        )
        return jsonify({
            "ok": True,
            "data": {
                "filename": segmentation_result["filename"],
                "cacheUrl": "/api/scene3d/cache/" + segmentation_result["filename"]
            }
        })
    except Exception as segmentation_error:
        return jsonify({"ok": False, "error": str(segmentation_error)}), 500


@app.route("/api/scene3d/detect-volumes/<project_code>", methods=["POST"])
def PhotoMeasurePro__Server__DetectVolumesApi(project_code: str):
    try:
        PhotoMeasurePro__Server__EnsureProjectDataDir()
        client_payload = request.get_json(silent=True) or {}
        project_data   = PhotoMeasurePro__Server__LoadProjectData(project_code)
        dirs           = PhotoMeasurePro__Scene3d__EnsureDirectories(PROJECT_DATA_DIR)
        detection      = PhotoMeasurePro__Scene3d__RunDetectVolumes(
            project_data,
            project_code,
            dirs["cache_dir"],
            Path(VERSION_LOCKED_DEPS_PATH),
            client_payload
        )
        label_map_payload = detection.get("labelMap") or {}
        return jsonify({
            "ok": True,
            "data": {
                "offsetPlanes":   detection["offsetPlanes"],
                "depthSource":    detection["depthSource"],
                "depthCacheUrl":  "/api/scene3d/cache/" + detection["depthFilename"],
                "calibration":    detection["calibration"],
                "labelMap": {
                    "cacheUrl":       "/api/scene3d/cache/" + label_map_payload["filename"] if label_map_payload.get("filename") else None,
                    "widthPixels":    label_map_payload.get("widthPixels"),
                    "heightPixels":   label_map_payload.get("heightPixels"),
                    "labelsByPlane":  label_map_payload.get("labelsByPlane"),
                },
            }
        })
    except Exception as detect_error:
        return jsonify({"ok": False, "error": str(detect_error)}), 500

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


@app.route("/api/scene3d/cache/<path:filename>", methods=["GET"])
def PhotoMeasurePro__FlaskServer__ServeScene3dCache(filename: str):
    PhotoMeasurePro__Server__EnsureProjectDataDir()
    safe_name = os.path.basename(filename)
    return send_from_directory(SCENE3D_CACHE_DIR, safe_name)


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
