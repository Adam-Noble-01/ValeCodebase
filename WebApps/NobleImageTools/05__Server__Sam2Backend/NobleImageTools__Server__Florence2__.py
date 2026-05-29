# =============================================================================
# NOBLEIMAGETOOLS - TEXT-GUIDED DETECTOR (Grounding DINO)
# =============================================================================
#
# FILE       : NobleImageTools__Server__Florence2__.py
# NAMESPACE  : NobleImageTools
# MODULE     : Server - Text-Guided Detector
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Wraps IDEA Research Grounding DINO for open-vocabulary object
#              detection from a text query. Returns pixel bounding boxes that
#              are passed to SAM2 for precise mask generation.
#
#              Replaces earlier Florence-2 implementation. API is unchanged
#              so Flask routes require no modification.
#
# PIPELINE:
#   text_query → Grounding DINO → pixel bounding boxes
#   pixel boxes → SAM2 predictor.predict(box=...) → segmentation masks
#
# MODEL:     IDEA-Research/grounding-dino-base (auto-downloaded, ~340MB)
# CREATED    : 28-May-2026
#
# =============================================================================

from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Module State
# -----------------------------------------------------------------------------

_detector_model     = None                                           # <-- Loaded GroundingDino model
_detector_processor = None                                           # <-- Loaded processor
_detector_loaded    = False                                          # <-- True once model is ready
_detector_model_id  = ""                                             # <-- HuggingFace model ID
_florence2_loaded   = False                                          # <-- Alias kept for compat
_florence2_error    = None                                           # <-- Load error message

DETECTOR_MODEL_ID   = "IDEA-Research/grounding-dino-base"           # <-- ~340MB via HuggingFace
BOX_THRESHOLD       = 0.30                                           # <-- Confidence threshold for boxes
TEXT_THRESHOLD      = 0.20                                           # <-- Text-token match threshold

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Model Loading
# -----------------------------------------------------------------------------

def NobleImageTools__Florence2__EnsureLoaded(model_id: str = DETECTOR_MODEL_ID) -> None:
    """
    FUNCTION | Load Grounding DINO model lazily on first text-predict request.
    Idempotent — safe to call before every inference.
    """
    global _detector_model, _detector_processor, _detector_loaded, _detector_model_id
    global _florence2_loaded, _florence2_error

    if _detector_loaded:
        return

    if _florence2_error:
        raise RuntimeError(_florence2_error)

    try:
        import torch
        from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

        device  = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[GroundingDINO] Loading {model_id}  device={device}", flush=True)

        _detector_processor = AutoProcessor.from_pretrained(model_id)
        _detector_model     = AutoModelForZeroShotObjectDetection.from_pretrained(
            model_id
        ).to(device).eval()

        _detector_model_id  = model_id
        _detector_loaded    = True
        _florence2_loaded   = True                                   # <-- compat alias
        print(f"[GroundingDINO] Ready: {model_id}", flush=True)

    except Exception as load_error:
        _florence2_error    = str(load_error)
        print(f"[GroundingDINO] Load FAILED: {_florence2_error}", flush=True)
        raise RuntimeError(f"GroundingDINO load failed: {_florence2_error}")


def NobleImageTools__Florence2__PreloadInBackground(model_id: str = DETECTOR_MODEL_ID) -> None:
    """
    FUNCTION | Trigger model load in a background daemon thread at server startup.
    """
    import threading

    def _load():
        try:
            NobleImageTools__Florence2__EnsureLoaded(model_id)
        except Exception:
            pass

    t = threading.Thread(target=_load, daemon=True, name="GroundingDINO-Preload")
    t.start()

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Inference
# -----------------------------------------------------------------------------

def NobleImageTools__Florence2__Detect(image_path: str, text_query: str) -> list:
    """
    FUNCTION | Run Grounding DINO detection for a text query on the given image.
    Accepts comma-separated terms: "window, door, roof".
    Returns a list of {label, box: [x1, y1, x2, y2]} dicts in pixel coordinates.
    """
    import torch
    from PIL import Image

    if not Path(image_path).is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img_pil     = Image.open(image_path).convert("RGB")

    terms       = [t.strip().lower() for t in text_query.split(",") if t.strip()]
    if not terms:
        return []

    grounding_text = " ".join(f"{t}." for t in terms)               # <-- "window. orangery. glass."

    device      = next(_detector_model.parameters()).device

    inputs      = _detector_processor(
        images          = img_pil,
        text            = grounding_text,
        return_tensors  = "pt"
    ).to(device)

    with torch.inference_mode():
        outputs = _detector_model(**inputs)

    results     = _detector_processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        box_threshold   = BOX_THRESHOLD,
        text_threshold  = TEXT_THRESHOLD,
        target_sizes    = [img_pil.size[::-1]]
    )

    detections  = []
    result      = results[0]
    boxes       = result["boxes"].cpu().numpy()
    labels      = result["labels"]
    scores      = result["scores"].cpu().numpy()

    for box, label, score in zip(boxes, labels, scores):
        x1, y1, x2, y2 = float(box[0]), float(box[1]), float(box[2]), float(box[3])

        x1  = max(0.0, min(x1, img_pil.width))
        y1  = max(0.0, min(y1, img_pil.height))
        x2  = max(0.0, min(x2, img_pil.width))
        y2  = max(0.0, min(y2, img_pil.height))

        if (x2 - x1) > 4 and (y2 - y1) > 4:
            detections.append({
                "label" : label,
                "box"   : [x1, y1, x2, y2],
                "score" : float(score)
            })

    return detections

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Status
# -----------------------------------------------------------------------------

def NobleImageTools__Florence2__GetStatus() -> dict:
    """
    FUNCTION | Return current model load status for the health endpoint.
    """
    return {
        "loaded"     : _detector_loaded,
        "model_id"   : _detector_model_id,
        "error"      : _florence2_error
    }

# endregion -------------------------------------------------------------------
