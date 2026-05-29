# =============================================================================
# NOBLEIMAGETOOLS - SAM2 INFERENCE MODULE
# =============================================================================
#
# FILE       : NobleImageTools__Server__Sam2Inference__.py
# NAMESPACE  : NobleImageTools
# MODULE     : Server - SAM2 Inference
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Wraps Meta SAM 2.1 (sam2 pip package) to provide point-prompt,
#              box-prompt, and automatic mask generation. The model is loaded
#              lazily on first request and cached. Returns mask data as flat
#              Python lists (bool) suitable for JSON serialisation.
# CREATED    : 28-May-2026
#
# NOTES:
# - Requires: torch>=2.5.1, torchvision>=0.20.1, sam2>=1.0.0, Pillow, numpy
# - On Windows without WSL: CPU inference works; GPU requires CUDA toolkit.
# - Model checkpoint: 00__AiModels/Sam2__Checkpoints/sam2.1_hiera_large.pt
#
# DEVELOPMENT LOG:
# 28-May-2026 - Version 1.0.0
# - Initial build with SAM 2.1 hiera_large model.
#
# =============================================================================

import os
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Module State
# -----------------------------------------------------------------------------

_sam2_predictor      = None                                          # <-- Loaded SAM2ImagePredictor
_sam2_generator      = None                                          # <-- Loaded SAM2AutomaticMaskGenerator
_sam2_loaded         = False                                         # <-- True once model is loaded
_sam2_model_name     = ""                                            # <-- Name of loaded checkpoint
_sam2_error          = None                                          # <-- Load error message (if any)
_sam2_current_image  = None                                          # <-- Path of image set on predictor

MODEL_PREFERENCE     = [                                             # <-- Priority order for checkpoint search
    "sam2.1_hiera_large.pt",
    "sam2.1_hiera_base_plus.pt",
    "sam2.1_hiera_small.pt",
    "sam2.1_hiera_tiny.pt"
]

MODEL_CONFIG_MAP     = {                                             # <-- Full Hydra config paths within sam2 package
    "sam2.1_hiera_large.pt"     : "configs/sam2.1/sam2.1_hiera_l.yaml",
    "sam2.1_hiera_base_plus.pt" : "configs/sam2.1/sam2.1_hiera_b+.yaml",
    "sam2.1_hiera_small.pt"     : "configs/sam2.1/sam2.1_hiera_s.yaml",
    "sam2.1_hiera_tiny.pt"      : "configs/sam2.1/sam2.1_hiera_t.yaml"
}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Model Loading
# -----------------------------------------------------------------------------

def NobleImageTools__Sam2__FindCheckpoint(models_dir: str) -> tuple:
    """
    FUNCTION | Find the best available SAM2 checkpoint in the models directory.
    Returns (checkpoint_path, config_name) or raises FileNotFoundError.
    """
    for model_filename in MODEL_PREFERENCE:
        checkpoint_path = Path(models_dir) / model_filename
        if checkpoint_path.exists():
            return str(checkpoint_path), MODEL_CONFIG_MAP[model_filename]

    available = list(Path(models_dir).glob("*.pt"))
    msg = (
        f"No SAM2 checkpoint found in {models_dir}.\n"
        f"Run 00__AiModels/download_models.py to download the model.\n"
        f"Files found: {[f.name for f in available] or 'none'}"
    )
    raise FileNotFoundError(msg)


def NobleImageTools__Sam2__EnsureModelLoaded(models_dir: str) -> None:
    """
    FUNCTION | Load SAM2 model if not already loaded.
    Idempotent — safe to call before every inference request.
    """
    global _sam2_predictor, _sam2_generator, _sam2_loaded, _sam2_model_name, _sam2_error

    if _sam2_loaded:
        return

    if _sam2_error:
        raise RuntimeError(_sam2_error)

    try:
        import torch
        import numpy as np
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

        checkpoint_path, config_name = NobleImageTools__Sam2__FindCheckpoint(models_dir)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[SAM2] Loading model: {Path(checkpoint_path).name}  device={device}")

        sam_model   = build_sam2(config_name, checkpoint_path, device=device)
        _sam2_predictor  = SAM2ImagePredictor(sam_model)
        _sam2_generator  = SAM2AutomaticMaskGenerator(
            sam_model,
            points_per_side     = 32,
            pred_iou_thresh     = 0.86,
            stability_score_thresh = 0.92,
            min_mask_region_area = 100
        )
        _sam2_model_name    = Path(checkpoint_path).name
        _sam2_loaded        = True
        print(f"[SAM2] Ready: {_sam2_model_name}")

    except Exception as load_error:
        _sam2_error = str(load_error)
        print(f"[SAM2] Load FAILED: {_sam2_error}")
        raise RuntimeError(f"SAM2 model load failed: {_sam2_error}")

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Setup Helper
# -----------------------------------------------------------------------------

def NobleImageTools__Sam2__SetImage(image_path: str) -> tuple:
    """
    FUNCTION | Set the image on the predictor if it has changed.
    Returns (width, height) of the loaded image.
    """
    global _sam2_current_image

    import torch
    import numpy as np
    from PIL import Image

    if not Path(image_path).is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img_pil = Image.open(image_path).convert("RGB")
    img_np  = np.array(img_pil)

    if _sam2_current_image != image_path:
        with torch.inference_mode():
            _sam2_predictor.set_image(img_np)
        _sam2_current_image = image_path

    return img_pil.width, img_pil.height


def NobleImageTools__Sam2__PreloadInBackground(models_dir: str) -> None:
    """
    FUNCTION | Trigger model load in a background thread at server startup.
    Errors are captured in _sam2_error — not raised here.
    """
    import threading

    def _load():
        try:
            NobleImageTools__Sam2__EnsureModelLoaded(models_dir)
        except Exception:
            pass                                                     # <-- Error stored in _sam2_error

    t = threading.Thread(target=_load, daemon=True, name="SAM2-Preload")
    t.start()

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Point / Box Prediction
# -----------------------------------------------------------------------------

def NobleImageTools__Sam2__Predict(image_path: str, points, point_labels, box) -> dict:
    """
    FUNCTION | Run SAM2 with point and/or box prompts.
    Returns the best-scoring mask as a flat bool list.
    """
    import torch
    import numpy as np

    img_w, img_h = NobleImageTools__Sam2__SetImage(image_path)

    np_points = np.array(points, dtype=np.float32) if points else None
    np_labels = np.array(point_labels, dtype=np.int32) if point_labels else None
    np_box    = np.array(box, dtype=np.float32) if box else None

    with torch.inference_mode():
        masks, scores, _ = _sam2_predictor.predict(
            point_coords     = np_points,
            point_labels     = np_labels,
            box              = np_box,
            multimask_output = True
        )

    best_idx    = int(np.argmax(scores))
    best_mask   = masks[best_idx]                                    # <-- shape (H, W), boolean

    return {
        "mask"      : best_mask.flatten().tolist(),
        "width"     : img_w,
        "height"    : img_h,
        "score"     : float(scores[best_idx])
    }

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Automatic Mask Generation
# -----------------------------------------------------------------------------

def NobleImageTools__Sam2__AutoSegment(image_path: str) -> dict:
    """
    FUNCTION | Generate masks for all objects in the image automatically.
    Returns a list of flat bool mask arrays sorted by area (largest first).
    """
    import numpy as np
    from PIL import Image

    if not Path(image_path).is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img_pil  = Image.open(image_path).convert("RGB")
    img_np   = np.array(img_pil)
    img_w, img_h = img_pil.width, img_pil.height

    mask_results = _sam2_generator.generate(img_np)

    mask_results.sort(key=lambda m: m["area"], reverse=True)

    return {
        "masks" : [m["segmentation"].flatten().tolist() for m in mask_results],
        "count" : len(mask_results),
        "width" : img_w,
        "height": img_h
    }

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Status
# -----------------------------------------------------------------------------

def NobleImageTools__Sam2__GetStatus() -> dict:
    """
    FUNCTION | Return current model load status for the health endpoint.
    """
    return {
        "loaded"     : _sam2_loaded,
        "model_name" : _sam2_model_name,
        "error"      : _sam2_error
    }

# endregion -------------------------------------------------------------------
