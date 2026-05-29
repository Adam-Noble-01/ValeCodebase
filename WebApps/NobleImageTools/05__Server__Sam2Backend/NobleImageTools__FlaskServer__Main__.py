# =============================================================================
# NOBLEIMAGETOOLS - FLASK LOCALHOST SERVER
# =============================================================================
#
# FILE       : NobleImageTools__FlaskServer__Main__.py
# NAMESPACE  : NobleImageTools
# MODULE     : Flask Localhost Server
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Single Flask process that serves the static SPA shell and
#              exposes the REST API for image loading, SAM2 inference,
#              mask export, and project persistence. Runs on port 8005.
# CREATED    : 28-May-2026
#
# DEVELOPMENT LOG:
# 28-May-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

import os
import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Dependency Setup
# -----------------------------------------------------------------------------

SCRIPT_DIR               = os.path.dirname(os.path.abspath(__file__))
APP_ROOT                 = os.path.dirname(SCRIPT_DIR)              # <-- NobleImageTools root
WEBAPPS_ROOT             = os.path.dirname(APP_ROOT)                # <-- WebApps root
BUNDLED_FLASK_DEPS_PATH  = os.path.join(
    WEBAPPS_ROOT,
    "Whitecardopedia",
    "src",
    "ThirdParty__VersionLockedDependencies",
    "SERVER__FlaskServerDepencies"
)

if os.path.exists(BUNDLED_FLASK_DEPS_PATH):
    sys.path.insert(0, BUNDLED_FLASK_DEPS_PATH)

sys.path.insert(0, SCRIPT_DIR)                                       # <-- Import sibling server modules

# endregion -------------------------------------------------------------------

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from NobleImageTools__Server__Sam2Inference__ import (
    NobleImageTools__Sam2__EnsureModelLoaded,
    NobleImageTools__Sam2__Predict,
    NobleImageTools__Sam2__AutoSegment,
    NobleImageTools__Sam2__GetStatus,
    NobleImageTools__Sam2__PreloadInBackground
)
from NobleImageTools__Server__FileManager__ import (
    NobleImageTools__Files__Browse,
    NobleImageTools__Files__LoadImage,
    NobleImageTools__Files__UploadImage
)
from NobleImageTools__Server__MaskExport__ import (
    NobleImageTools__Export__SaveBW,
    NobleImageTools__Export__SaveRGBA,
    NobleImageTools__Export__SaveColorId,
    NobleImageTools__Export__SaveAll
)
from NobleImageTools__Server__Florence2__ import (
    NobleImageTools__Florence2__EnsureLoaded,
    NobleImageTools__Florence2__Detect,
    NobleImageTools__Florence2__GetStatus,
    NobleImageTools__Florence2__PreloadInBackground
)

# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration
# -----------------------------------------------------------------------------

SERVER_HOST              = "127.0.0.1"                              # <-- Localhost only
SERVER_PORT              = 8005                                      # <-- NobleImageTools port
APP_SHELL_FILENAME       = "NobleImageTools__App__.html"            # <-- Main app HTML
APP_ROOT_PATH            = Path(APP_ROOT)
PROJECT_DATA_DIR         = APP_ROOT_PATH / "06__LocalProjectData"
EXPORTS_DIR              = PROJECT_DATA_DIR / "__MaskExports__"
UPLOADS_DIR              = PROJECT_DATA_DIR / "__Uploads__"
AI_MODELS_DIR            = APP_ROOT_PATH / "00__AiModels" / "Sam2__Checkpoints"

app = Flask(__name__, static_folder=str(APP_ROOT_PATH))
CORS(app)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Startup Helpers
# -----------------------------------------------------------------------------

def NobleImageTools__Server__EnsureDirectories() -> None:
    PROJECT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    AI_MODELS_DIR.mkdir(parents=True, exist_ok=True)


def NobleImageTools__Server__RunTextSegment(image_path: str, text_query: str) -> dict:
    """
    FUNCTION | Two-stage text segmentation: Florence-2 detection → SAM2 masks.
    Florence-2 returns bounding boxes; each box is passed individually to SAM2.
    Returns all resulting masks with their labels and detected boxes.
    """
    import torch
    import numpy as np
    from PIL import Image

    detections  = NobleImageTools__Florence2__Detect(image_path, text_query)

    if not detections:
        return {"masks": [], "labels": [], "boxes": [], "count": 0}

    img_pil     = Image.open(image_path).convert("RGB")
    img_np      = np.array(img_pil)
    img_w, img_h = img_pil.width, img_pil.height

    import NobleImageTools__Server__Sam2Inference__ as sam2_state

    predictor = sam2_state._sam2_predictor                          # <-- Always live reference via module

    with torch.inference_mode():
        if sam2_state._sam2_current_image != image_path:
            predictor.set_image(img_np)
            sam2_state._sam2_current_image = image_path

    result_masks    = []
    result_labels   = []
    result_boxes    = []

    for detection in detections:
        box     = np.array(detection["box"], dtype=np.float32)
        label   = detection["label"]

        with torch.inference_mode():
            masks, scores, _ = predictor.predict(
                point_coords     = None,
                point_labels     = None,
                box              = box,
                multimask_output = False
            )

        best_mask = masks[0]                                         # <-- shape (H, W), boolean

        result_masks.append(best_mask.flatten().tolist())
        result_labels.append(label)
        result_boxes.append(detection["box"])

    return {
        "masks"  : result_masks,
        "labels" : result_labels,
        "boxes"  : result_boxes,
        "count"  : len(result_masks),
        "width"  : img_w,
        "height" : img_h
    }

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Health Route
# -----------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def NobleImageTools__Server__HealthApi():
    sam2_status     = NobleImageTools__Sam2__GetStatus()
    florence_status = NobleImageTools__Florence2__GetStatus()
    return jsonify({
        "ok"               : True,
        "service"          : "NobleImageTools",
        "port"             : SERVER_PORT,
        "sam2_ready"       : sam2_status["loaded"],
        "sam2_model"       : sam2_status["model_name"],
        "sam2_error"       : sam2_status.get("error"),
        "florence2_ready"  : florence_status["loaded"],
        "florence2_model"  : florence_status["model_id"],
        "florence2_error"  : florence_status.get("error")
    })

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | File Manager Routes
# -----------------------------------------------------------------------------

@app.route("/api/files/browse", methods=["GET"])
def NobleImageTools__Server__BrowseFilesApi():
    path        = request.args.get("path", "")
    dirs_only   = request.args.get("dirs_only", "0") == "1"
    try:
        data    = NobleImageTools__Files__Browse(path, dirs_only)
        return jsonify({"ok": True, "data": data})
    except Exception as browse_error:
        return jsonify({"ok": False, "error": str(browse_error)}), 400


@app.route("/api/files/load", methods=["POST"])
def NobleImageTools__Server__LoadFileApi():
    body        = request.get_json(silent=True) or {}
    file_path   = body.get("path", "")
    if not file_path:
        return jsonify({"ok": False, "error": "path is required"}), 400
    try:
        data    = NobleImageTools__Files__LoadImage(file_path)
        return jsonify({"ok": True, "data": data})
    except Exception as load_error:
        return jsonify({"ok": False, "error": str(load_error)}), 400


@app.route("/api/files/open-folder", methods=["POST"])
def NobleImageTools__Server__OpenFolderApi():
    """Open a folder in Windows Explorer (local dev tool only)."""
    import subprocess
    body    = request.get_json(silent=True) or {}
    folder  = body.get("folder", str(EXPORTS_DIR))
    target  = Path(folder) if folder else EXPORTS_DIR
    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.Popen(["explorer", str(target)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/files/upload", methods=["POST"])
def NobleImageTools__Server__UploadFileApi():
    uploaded    = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return jsonify({"ok": False, "error": "No file in request"}), 400
    try:
        data    = NobleImageTools__Files__UploadImage(uploaded, str(UPLOADS_DIR))
        return jsonify({"ok": True, "data": data})
    except Exception as upload_error:
        return jsonify({"ok": False, "error": str(upload_error)}), 400

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | SAM2 Inference Routes
# -----------------------------------------------------------------------------

@app.route("/api/sam2/predict", methods=["POST"])
def NobleImageTools__Server__Sam2PredictApi():
    body        = request.get_json(silent=True) or {}
    image_path  = body.get("image_path", "")
    points      = body.get("points")
    labels      = body.get("point_labels")
    box         = body.get("box")

    if not image_path:
        return jsonify({"ok": False, "error": "image_path is required"}), 400

    try:
        NobleImageTools__Sam2__EnsureModelLoaded(str(AI_MODELS_DIR))
        result  = NobleImageTools__Sam2__Predict(image_path, points, labels, box)
        return jsonify({"ok": True, "data": result})
    except Exception as predict_error:
        return jsonify({"ok": False, "error": str(predict_error)}), 500


@app.route("/api/sam2/auto", methods=["POST"])
def NobleImageTools__Server__Sam2AutoApi():
    body        = request.get_json(silent=True) or {}
    image_path  = body.get("image_path", "")

    if not image_path:
        return jsonify({"ok": False, "error": "image_path is required"}), 400

    try:
        NobleImageTools__Sam2__EnsureModelLoaded(str(AI_MODELS_DIR))
        result  = NobleImageTools__Sam2__AutoSegment(image_path)
        return jsonify({"ok": True, "data": result})
    except Exception as auto_error:
        return jsonify({"ok": False, "error": str(auto_error)}), 500


@app.route("/api/sam2/text-predict", methods=["POST"])
def NobleImageTools__Server__Sam2TextPredictApi():
    """
    Florence-2 + SAM2 text-guided segmentation.
    Body: { image_path, text_query }
    Returns: { masks: [...], labels: [...], boxes: [...], count }
    """
    body        = request.get_json(silent=True) or {}
    image_path  = body.get("image_path", "")
    text_query  = body.get("text_query", "").strip()

    if not image_path:
        return jsonify({"ok": False, "error": "image_path is required"}), 400
    if not text_query:
        return jsonify({"ok": False, "error": "text_query is required"}), 400

    try:
        NobleImageTools__Florence2__EnsureLoaded()
        NobleImageTools__Sam2__EnsureModelLoaded(str(AI_MODELS_DIR))
        result  = NobleImageTools__Server__RunTextSegment(image_path, text_query)
        return jsonify({"ok": True, "data": result})
    except Exception as text_error:
        return jsonify({"ok": False, "error": str(text_error)}), 500

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Mask Export Routes
# -----------------------------------------------------------------------------

@app.route("/api/mask/export-bw", methods=["POST"])
def NobleImageTools__Server__ExportBWApi():
    body        = request.get_json(silent=True) or {}
    try:
        data    = NobleImageTools__Export__SaveBW(body, str(EXPORTS_DIR))
        return jsonify({"ok": True, "data": data})
    except Exception as export_error:
        return jsonify({"ok": False, "error": str(export_error)}), 500


@app.route("/api/mask/export-rgba", methods=["POST"])
def NobleImageTools__Server__ExportRGBAApi():
    body        = request.get_json(silent=True) or {}
    try:
        data    = NobleImageTools__Export__SaveRGBA(body, str(EXPORTS_DIR))
        return jsonify({"ok": True, "data": data})
    except Exception as export_error:
        return jsonify({"ok": False, "error": str(export_error)}), 500


@app.route("/api/mask/export-colorid", methods=["POST"])
def NobleImageTools__Server__ExportColorIdApi():
    body        = request.get_json(silent=True) or {}
    try:
        data    = NobleImageTools__Export__SaveColorId(body, str(EXPORTS_DIR))
        return jsonify({"ok": True, "data": data})
    except Exception as export_error:
        return jsonify({"ok": False, "error": str(export_error)}), 500


@app.route("/api/mask/export-all", methods=["POST"])
def NobleImageTools__Server__ExportAllApi():
    body        = request.get_json(silent=True) or {}
    try:
        data    = NobleImageTools__Export__SaveAll(body, str(EXPORTS_DIR))
        return jsonify({"ok": True, "data": data})
    except Exception as export_error:
        return jsonify({"ok": False, "error": str(export_error)}), 500

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Static File Routes
# -----------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def NobleImageTools__Server__ServeRoot():
    return send_from_directory(str(APP_ROOT_PATH), APP_SHELL_FILENAME)


@app.route(f"/{APP_SHELL_FILENAME}", methods=["GET"])
def NobleImageTools__Server__ServeShell():
    return send_from_directory(str(APP_ROOT_PATH), APP_SHELL_FILENAME)


@app.route("/<path:path>", methods=["GET"])
def NobleImageTools__Server__ServeStatic(path):
    requested   = Path(os.path.join(str(APP_ROOT_PATH), path)).resolve()
    root        = APP_ROOT_PATH.resolve()

    if root not in requested.parents and requested != root:
        return send_from_directory(str(APP_ROOT_PATH), APP_SHELL_FILENAME)

    if requested.is_file():
        return send_from_directory(str(APP_ROOT_PATH), path)

    return send_from_directory(str(APP_ROOT_PATH), APP_SHELL_FILENAME)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Server Startup
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    NobleImageTools__Server__EnsureDirectories()

    print("=" * 77)
    print(" NOBLEIMAGETOOLS - FLASK LOCALHOST SERVER")
    print("=" * 77)
    print()
    print(f" Server      : http://{SERVER_HOST}:{SERVER_PORT}/{APP_SHELL_FILENAME}")
    print(f" AI Models   : {AI_MODELS_DIR}")
    print(f" Export Dir  : {EXPORTS_DIR}")
    print()
    print(" Starting SAM2 model preload in background thread...")
    print(" Model will be ready within ~10-30 seconds (first load).")
    print(" Press Ctrl+C to stop the server")
    print()
    print("=" * 77)
    print()

    NobleImageTools__Sam2__PreloadInBackground(str(AI_MODELS_DIR))
    NobleImageTools__Florence2__PreloadInBackground()

    app.run(
        host=SERVER_HOST,
        port=SERVER_PORT,
        debug=False,
        threaded=True
    )

# endregion -------------------------------------------------------------------
