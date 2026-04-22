# =============================================================================
# PHOTOMEASUREPRO - DEPTH AND SEGMENTATION PIPELINE
# =============================================================================
# Real Depth-Anything V2 Small inference when the ONNX model is available, with
# a heuristic luma fallback otherwise. Adds metric calibration of the depth map
# against the user's known constraint planes, and a histogram-based volume
# detector that returns offset-plane suggestions relative to the Facade plane.
# =============================================================================

import base64
import io
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort                                                    # Optional, used when model files are available.
except Exception:
    ort = None

PhotoMeasurePro__Scene3d__MissingModelWarningPrinted = False
PhotoMeasurePro__Scene3d__DepthOnnxSession = None
PhotoMeasurePro__Scene3d__DepthOnnxSessionPath = None

DEPTH_INPUT_SIZE_PX = 518                                                        # Multiple of 14 required by DepthAnythingV2 ViT-S.
DEPTH_NORMALIZATION_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
DEPTH_NORMALIZATION_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


# -----------------------------------------------------------------------------
# REGION | Directory + Image I/O Helpers
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__EnsureDirectories(project_data_root: Path) -> dict:
    models_dir = project_data_root / "__Models__"
    cache_dir  = project_data_root / "__Scene3dCache__"
    models_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    return {"models_dir": models_dir, "cache_dir": cache_dir}


def PhotoMeasurePro__Scene3d__DecodeProjectImageToArray(project_data: dict) -> np.ndarray:
    image_section = (project_data or {}).get("PhotoMeasurePro__ProjectFile__Image", {}) or {}
    data_url = image_section.get("DataUrlBase64", "")
    if not data_url or "," not in data_url:
        raise ValueError("Project image DataUrlBase64 is missing.")
    raw_b64     = data_url.split(",", 1)[1]
    image_bytes = base64.b64decode(raw_b64)
    image       = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.asarray(image)


def PhotoMeasurePro__Scene3d__SaveArrayAsPng(depth_or_seg_array: np.ndarray, output_path: Path, is_depth: bool) -> None:
    if is_depth:
        image = Image.fromarray(depth_or_seg_array.astype(np.uint16), mode="I;16")
    else:
        image = Image.fromarray(depth_or_seg_array.astype(np.uint8), mode="L")
    image.save(output_path)


# -----------------------------------------------------------------------------
# REGION | Model Path Resolution + Warnings
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__ResolveModelPaths(version_locked_deps_path: Path | None = None) -> dict:
    if version_locked_deps_path is None:
        version_locked_deps_path = Path(__file__).resolve().parents[2] / "00__ThirdParty__VersionLockedDependencies"
    depth_model_path      = version_locked_deps_path / "00__DepthAnythingV2__Small__Onnx" / "depth_anything_v2_vits.onnx"
    mobile_sam_model_path = version_locked_deps_path / "01__MobileSAM__Onnx" / "mobile_sam.onnx"
    return {
        "deps_root":               version_locked_deps_path,
        "depth_model_path":        depth_model_path,
        "mobile_sam_model_path":   mobile_sam_model_path,
        "depth_model_exists":      depth_model_path.exists(),
        "mobile_sam_model_exists": mobile_sam_model_path.exists(),
    }


def PhotoMeasurePro__Scene3d__LogMissingModelWarningOnce(model_paths: dict) -> None:
    global PhotoMeasurePro__Scene3d__MissingModelWarningPrinted
    if PhotoMeasurePro__Scene3d__MissingModelWarningPrinted:
        return
    if model_paths["depth_model_exists"]:
        return
    print(
        "[PhotoMeasurePro][Scene3D] Depth-Anything V2 ONNX model not found under "
        f"{model_paths['deps_root']}. Falling back to heuristic luma depth. Run "
        "00__ThirdParty__VersionLockedDependencies/download_models.py to enable real inference."
    )
    PhotoMeasurePro__Scene3d__MissingModelWarningPrinted = True


# -----------------------------------------------------------------------------
# REGION | Depth Inference
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__LoadDepthSession(depth_model_path: Path):
    """CPU-only session by default. The CUDA provider probe in ONNX Runtime prints a noisy warning on
    systems without matching cuDNN/CUDA; opt in via the PMP_ONNX_ENABLE_CUDA environment variable."""
    global PhotoMeasurePro__Scene3d__DepthOnnxSession, PhotoMeasurePro__Scene3d__DepthOnnxSessionPath
    if ort is None:
        return None
    if (PhotoMeasurePro__Scene3d__DepthOnnxSession is not None
            and PhotoMeasurePro__Scene3d__DepthOnnxSessionPath == str(depth_model_path)):
        return PhotoMeasurePro__Scene3d__DepthOnnxSession
    import os as _os
    providers = ["CPUExecutionProvider"]
    if _os.environ.get("PMP_ONNX_ENABLE_CUDA") == "1" and "CUDAExecutionProvider" in ort.get_available_providers():
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    session_options = ort.SessionOptions()
    session_options.log_severity_level = 3                                       # Suppress INFO+WARNING noise from ORT.
    PhotoMeasurePro__Scene3d__DepthOnnxSession     = ort.InferenceSession(str(depth_model_path), sess_options=session_options, providers=providers)
    PhotoMeasurePro__Scene3d__DepthOnnxSessionPath = str(depth_model_path)
    return PhotoMeasurePro__Scene3d__DepthOnnxSession


def PhotoMeasurePro__Scene3d__PreprocessImageForDepth(image_rgb: np.ndarray) -> np.ndarray:
    pil_image = Image.fromarray(image_rgb).resize((DEPTH_INPUT_SIZE_PX, DEPTH_INPUT_SIZE_PX), Image.BICUBIC)
    resized   = np.asarray(pil_image, dtype=np.float32) / 255.0
    normalized = (resized - DEPTH_NORMALIZATION_MEAN) / DEPTH_NORMALIZATION_STD
    chw        = np.transpose(normalized, (2, 0, 1))                             # HWC -> CHW
    return np.expand_dims(chw, axis=0).astype(np.float32)                        # Prepend batch dim.


def PhotoMeasurePro__Scene3d__RunDepthOnnx(image_rgb: np.ndarray, depth_model_path: Path) -> np.ndarray | None:
    session = PhotoMeasurePro__Scene3d__LoadDepthSession(depth_model_path)
    if session is None:
        return None
    input_tensor = PhotoMeasurePro__Scene3d__PreprocessImageForDepth(image_rgb)
    input_name   = session.get_inputs()[0].name
    output       = session.run(None, {input_name: input_tensor})
    relative_depth_small = output[0][0]                                          # Shape (h_small, w_small), unitless relative depth.
    height_full, width_full = image_rgb.shape[:2]
    relative_depth = np.asarray(
        Image.fromarray(relative_depth_small.astype(np.float32)).resize((width_full, height_full), Image.BICUBIC),
        dtype=np.float32
    )
    return relative_depth


def PhotoMeasurePro__Scene3d__BuildFallbackRelativeDepth(image_rgb: np.ndarray) -> np.ndarray:
    image_float       = image_rgb.astype(np.float32)
    luminance         = 0.2126 * image_float[:, :, 0] + 0.7152 * image_float[:, :, 1] + 0.0722 * image_float[:, :, 2]
    luminance_norm    = luminance / 255.0
    vertical_gradient = np.linspace(0.0, 1.0, image_rgb.shape[0], dtype=np.float32).reshape(-1, 1)
    return (1.0 - luminance_norm) * 0.65 + vertical_gradient * 0.35              # Pseudo relative depth, 0..1.


def PhotoMeasurePro__Scene3d__BuildFallbackSegmentation(image_rgb: np.ndarray) -> np.ndarray:
    image_float = image_rgb.astype(np.float32)
    height, width = image_rgb.shape[:2]
    seg = np.zeros((height, width), dtype=np.uint8)
    red    = image_float[:, :, 0]
    green  = image_float[:, :, 1]
    blue   = image_float[:, :, 2]
    top_mask     = np.repeat(np.linspace(1.0, 0.0, height, dtype=np.float32).reshape(-1, 1), width, axis=1)
    sky_mask     = (blue > red * 1.05) & (blue > green * 1.05) & (top_mask > 0.45)
    ground_mask  = np.repeat(np.linspace(0.0, 1.0, height, dtype=np.float32).reshape(-1, 1), width, axis=1) > 0.72
    seg[sky_mask]    = 4
    seg[ground_mask] = 3
    mid_x = width // 2
    facade_mask = (seg == 0) & (np.arange(width)[None, :] <= mid_x)
    side_mask   = (seg == 0) & (np.arange(width)[None, :] >  mid_x)
    seg[facade_mask] = 1
    seg[side_mask]   = 2
    return seg


# -----------------------------------------------------------------------------
# REGION | Perspective Math (pure Python, mirrors client-side logic)
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__ExtractPerspectiveData(project_data: dict, client_payload: dict | None) -> dict | None:
    """Accept perspective data posted by the client (the JS side already solves it via vanishing points).
    Falls back to None if the payload is absent or incomplete; the server does not re-derive perspective."""
    image    = (project_data or {}).get("PhotoMeasurePro__ProjectFile__Image", {}) or {}
    metadata = (project_data or {}).get("PhotoMeasurePro__ProjectFile__Metadata", {}) or {}
    image_width  = image.get("WidthPx")  or metadata.get("ImageWidth")
    image_height = image.get("HeightPx") or metadata.get("ImageHeight")
    perspective_payload = (client_payload or {}).get("perspective") or {}
    focal_length        = perspective_payload.get("f")
    principal           = perspective_payload.get("principal") or {}
    basis               = perspective_payload.get("basis") or {}
    anchor              = perspective_payload.get("anchor") or {}
    if not focal_length:
        return None
    if not basis.get("Rx") or not basis.get("Ry") or not basis.get("Rz"):
        return None
    return {
        "f":            float(focal_length),
        "cx":           float(principal.get("x", 0.0)),
        "cy":           float(principal.get("y", 0.0)),
        "basis_rx":     np.array(basis["Rx"], dtype=np.float64),
        "basis_ry":     np.array(basis["Ry"], dtype=np.float64),
        "basis_rz":     np.array(basis["Rz"], dtype=np.float64),
        "anchor_u":     float(anchor.get("x", principal.get("x", 0.0))),
        "anchor_v":     float(anchor.get("y", principal.get("y", 0.0))),
        "image_width":  int(image_width)  if image_width  else None,
        "image_height": int(image_height) if image_height else None,
    }


def PhotoMeasurePro__Scene3d__ExtractConstraints(project_data: dict, client_payload: dict | None) -> dict:
    client_constraints = ((client_payload or {}).get("constraints") or {})
    facade_length = (client_constraints.get("Facade") or {}).get("lengthMm")
    side_length   = (client_constraints.get("Side")   or {}).get("lengthMm")
    if facade_length is None or side_length is None:
        calibration    = (project_data or {}).get("PhotoMeasurePro__ProjectFile__Calibration", {}) or {}
        project_consts = calibration.get("ConstraintsByPlane") or {}
        if facade_length is None:
            facade_length = (project_consts.get("Facade") or {}).get("lengthMm")
        if side_length is None:
            side_length = (project_consts.get("Side") or {}).get("lengthMm")
    return {
        "facade_length_mm": float(facade_length) if facade_length else 0.0,
        "side_length_mm":   float(side_length)   if side_length   else 0.0,
    }


def PhotoMeasurePro__Scene3d__BuildCameraPose(perspective: dict, facade_length_mm: float, side_length_mm: float) -> dict:
    rotation_camera_from_world = np.stack([perspective["basis_rx"], perspective["basis_ry"], perspective["basis_rz"]], axis=1)
    rotation_world_from_camera = rotation_camera_from_world.T
    anchor_ray_camera = np.array([
        (perspective["anchor_u"] - perspective["cx"]) / perspective["f"],
        (perspective["anchor_v"] - perspective["cy"]) / perspective["f"],
        1.0,
    ], dtype=np.float64)
    anchor_ray_world = rotation_world_from_camera @ anchor_ray_camera
    norm             = np.linalg.norm(anchor_ray_world)
    if norm < 1e-9:
        return None
    anchor_ray_world = anchor_ray_world / norm
    scene_scale_mm   = max(3000.0, max(facade_length_mm or 6000.0, side_length_mm or 6000.0) * 1.6)
    camera_position  = -anchor_ray_world * scene_scale_mm
    return {
        "R_wc": rotation_camera_from_world,
        "R_cw": rotation_world_from_camera,
        "C":    camera_position,
    }


def PhotoMeasurePro__Scene3d__BuildPixelRaysWorld(
    height: int,
    width:  int,
    perspective: dict,
    camera_pose: dict,
    downsample_step: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return pixel grid (v,u) plus their normalized camera-space and world-space ray direction arrays."""
    v_indices = np.arange(0, height, downsample_step, dtype=np.float32)
    u_indices = np.arange(0, width,  downsample_step, dtype=np.float32)
    v_grid, u_grid = np.meshgrid(v_indices, u_indices, indexing="ij")
    x_cam = (u_grid - perspective["cx"]) / perspective["f"]
    y_cam = (v_grid - perspective["cy"]) / perspective["f"]
    z_cam = np.ones_like(x_cam)
    rays_camera = np.stack([x_cam, y_cam, z_cam], axis=-1)                       # (h_ds, w_ds, 3)
    rays_world  = rays_camera @ camera_pose["R_cw"].T                            # Right-multiply by R_cw^T == applying R_cw.
    return v_grid.astype(np.int32), u_grid.astype(np.int32), rays_world


# -----------------------------------------------------------------------------
# REGION | Metric Calibration + Volume Detection
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__ProjectWorldToImage(world_point: np.ndarray, perspective: dict, camera_pose: dict) -> tuple[float, float] | None:
    relative  = world_point - camera_pose["C"]
    cam_point = camera_pose["R_wc"] @ relative
    if cam_point[2] <= 1e-6:
        return None
    return (
        perspective["f"] * (cam_point[0] / cam_point[2]) + perspective["cx"],
        perspective["f"] * (cam_point[1] / cam_point[2]) + perspective["cy"],
    )


def PhotoMeasurePro__Scene3d__BuildPlaneCornersWorld(plane_name: str, facade_length_mm: float, side_length_mm: float) -> np.ndarray:
    facade = max(1000.0, float(facade_length_mm) if facade_length_mm else 6000.0)
    side   = max(1000.0, float(side_length_mm)   if side_length_mm   else 6000.0)
    height = max(facade, side) * 0.8                                              # Rough vertical span for calibration bounds.
    if plane_name == "Facade":                                                    # Y = 0, extends along +X and +Z.
        return np.array([[0, 0, 0], [facade, 0, 0], [facade, 0, height], [0, 0, height]], dtype=np.float64)
    if plane_name == "Side":                                                      # X = 0, extends along +Y and +Z.
        return np.array([[0, 0, 0], [0, side, 0], [0, side, height], [0, 0, height]], dtype=np.float64)
    return np.array([[0, 0, 0], [facade, 0, 0], [facade, side, 0], [0, side, 0]], dtype=np.float64)  # Ground Z = 0.


def PhotoMeasurePro__Scene3d__BuildPlaneFootprintMaskAtGrid(
    plane_corners_world: np.ndarray,
    perspective:         dict,
    camera_pose:         dict,
    v_grid:              np.ndarray,
    u_grid:              np.ndarray
) -> np.ndarray:
    """Project plane corners to image pixels, then mask the downsampled ray grid to pixels lying inside
    the convex quad via sign-of-cross-product on each edge. Returns a boolean array matching v_grid shape."""
    projected_corners = [
        PhotoMeasurePro__Scene3d__ProjectWorldToImage(corner, perspective, camera_pose)
        for corner in plane_corners_world
    ]
    if any(corner is None for corner in projected_corners):
        return np.zeros_like(v_grid, dtype=bool)
    corners = np.asarray(projected_corners, dtype=np.float64)
    x_grid  = u_grid.astype(np.float64)
    y_grid  = v_grid.astype(np.float64)
    crosses = []
    for edge_index in range(4):
        p0 = corners[edge_index]
        p1 = corners[(edge_index + 1) % 4]
        crosses.append((p1[0] - p0[0]) * (y_grid - p0[1]) - (p1[1] - p0[1]) * (x_grid - p0[0]))
    cross_stack = np.stack(crosses, axis=-1)
    inside_mask = (cross_stack >= 0).all(axis=-1) | (cross_stack <= 0).all(axis=-1)
    return inside_mask


def PhotoMeasurePro__Scene3d__CalibrateDepthToMetric(
    relative_depth:   np.ndarray,
    rays_world:       np.ndarray,
    v_grid:           np.ndarray,
    u_grid:           np.ndarray,
    camera_pose:      dict,
    perspective:      dict,
    facade_length_mm: float,
    side_length_mm:   float
) -> dict:
    """Fit a linear model `metric = alpha * (1/rel) + beta` using only pixels that lie inside the
    projected footprint of each known plane (Facade Y=0, Side X=0, Ground Z=0). Returns the fitted
    coefficients plus the calibrated metric depth at the downsampled grid."""
    plane_defs = [
        {"name": "Facade", "normal": np.array([0.0, 1.0, 0.0])},
        {"name": "Side",   "normal": np.array([1.0, 0.0, 0.0])},
        {"name": "Ground", "normal": np.array([0.0, 0.0, 1.0])},
    ]
    sampled_pairs = []                                                           # List of (rel_value, metric_t_mm) pairs.
    for plane_def in plane_defs:
        plane_corners_world = PhotoMeasurePro__Scene3d__BuildPlaneCornersWorld(plane_def["name"], facade_length_mm, side_length_mm)
        footprint_mask      = PhotoMeasurePro__Scene3d__BuildPlaneFootprintMaskAtGrid(plane_corners_world, perspective, camera_pose, v_grid, u_grid)
        if not footprint_mask.any():
            continue
        denominator = rays_world @ plane_def["normal"]
        numerator   = -np.dot(camera_pose["C"], plane_def["normal"])
        safe_denom  = np.where(np.abs(denominator) < 1e-6, np.nan, denominator)
        t_mm        = numerator / safe_denom
        combined_mask = footprint_mask & np.isfinite(t_mm) & (t_mm > 100.0)
        if not combined_mask.any():
            continue
        rel_samples    = relative_depth[v_grid[combined_mask], u_grid[combined_mask]]
        metric_samples = t_mm[combined_mask]
        if rel_samples.size == 0:
            continue
        stride = max(1, rel_samples.size // 2000)
        sampled_pairs.append((rel_samples[::stride], metric_samples[::stride]))

    if not sampled_pairs:
        return {"alpha": None, "beta": None, "metric_depth_ds": None, "quality": 0.0}

    rel_all   = np.concatenate([pair[0] for pair in sampled_pairs]).astype(np.float64)
    metric_all = np.concatenate([pair[1] for pair in sampled_pairs]).astype(np.float64)
    valid_mask = np.isfinite(rel_all) & np.isfinite(metric_all) & (rel_all > 1e-3) & (metric_all > 0)
    if valid_mask.sum() < 50:
        return {"alpha": None, "beta": None, "metric_depth_ds": None, "quality": 0.0}

    rel_all    = rel_all[valid_mask]
    metric_all = metric_all[valid_mask]
    inv_rel    = 1.0 / rel_all
    design     = np.stack([inv_rel, np.ones_like(inv_rel)], axis=1)              # metric = alpha * (1/rel) + beta
    solution, residuals, rank, singular = np.linalg.lstsq(design, metric_all, rcond=None)
    alpha, beta = float(solution[0]), float(solution[1])
    predicted  = design @ solution
    ss_residual = float(np.sum((metric_all - predicted) ** 2))
    ss_total    = float(np.sum((metric_all - np.mean(metric_all)) ** 2))
    quality     = 0.0 if ss_total < 1e-9 else max(0.0, 1.0 - ss_residual / ss_total)

    relative_at_grid = relative_depth[v_grid, u_grid].astype(np.float64)         # Sample at the downsampled ray grid.
    safe_rel         = np.where(relative_at_grid > 1e-3, relative_at_grid, 1e-3)
    metric_depth_ds  = alpha / safe_rel + beta
    metric_depth_ds  = np.clip(metric_depth_ds, 100.0, 200000.0).astype(np.float32)
    return {
        "alpha":           alpha,
        "beta":            beta,
        "metric_depth_ds": metric_depth_ds,
        "quality":         quality,
    }


def PhotoMeasurePro__Scene3d__ComputeWorldPointsFromMetric(
    metric_depth: np.ndarray,
    rays_world:   np.ndarray,
    camera_pose:  dict
) -> np.ndarray:
    """Lift each downsampled pixel to world space: P = C + t * rays_world, where t comes from metric depth."""
    t_values = metric_depth[..., None]
    return camera_pose["C"][None, None, :] + t_values * rays_world               # Shape (h_ds, w_ds, 3).


def PhotoMeasurePro__Scene3d__DetectOffsetVolumes(
    world_points_ds: np.ndarray,
    facade_length_mm: float,
    side_length_mm: float
) -> list[dict]:
    """Histogram wall-like pixels by signed offset from Facade (Y_world) and Side (X_world). Peaks far from
    the parent plane become offset-plane suggestions. Suggestions capped at 3 to keep the UI sensible."""
    suggestions: list[dict] = []
    flat_points = world_points_ds.reshape(-1, 3)
    # Mask: keep only points above ground and in front of camera-facing bounds; discard extreme outliers.
    above_ground   = flat_points[:, 2] > 200.0                                   # 20 cm above ground.
    in_scene_range = (np.abs(flat_points[:, 0]) < max(facade_length_mm, side_length_mm) * 3.0) \
                   & (np.abs(flat_points[:, 1]) < max(facade_length_mm, side_length_mm) * 3.0) \
                   & (flat_points[:, 2] < 30000.0)
    wall_points = flat_points[above_ground & in_scene_range]
    if wall_points.shape[0] < 200:
        return suggestions

    for axis_index, parent_plane, extent_key in [(1, "Facade", "side_length_mm"), (0, "Side", "facade_length_mm")]:
        offset_values = wall_points[:, axis_index]
        bin_width_mm  = 100.0
        lower_bound   = float(np.percentile(offset_values, 1.0))
        upper_bound   = float(np.percentile(offset_values, 99.0))
        if upper_bound - lower_bound < 2 * bin_width_mm:
            continue
        bin_edges = np.arange(lower_bound, upper_bound + bin_width_mm, bin_width_mm)
        histogram, bin_edges = np.histogram(offset_values, bins=bin_edges)
        if histogram.max() < 200:
            continue
        # Find peaks: local maxima above 30 % of global max with at least 600 mm separation from parent plane.
        min_peak_count   = int(histogram.max() * 0.3)
        min_distance_bins = max(1, int(round(600.0 / bin_width_mm)))
        peak_indices = []
        for bin_index in range(1, len(histogram) - 1):
            if histogram[bin_index] < min_peak_count:
                continue
            if histogram[bin_index] < histogram[bin_index - 1] or histogram[bin_index] < histogram[bin_index + 1]:
                continue
            peak_center_mm = (bin_edges[bin_index] + bin_edges[bin_index + 1]) * 0.5
            if abs(peak_center_mm) < 300.0:
                continue                                                         # Too close to parent plane.
            if any(abs(peak_center_mm - existing) < 600.0 for existing in peak_indices):
                continue
            peak_indices.append(peak_center_mm)
        peak_indices.sort(key=lambda offset: -abs(offset))                        # Prefer strongest offset first.
        for peak_offset_mm in peak_indices[:2]:
            band_mask = (
                (offset_values > peak_offset_mm - 3 * bin_width_mm)
                & (offset_values < peak_offset_mm + 3 * bin_width_mm)
            )
            if band_mask.sum() < 100:
                continue
            band_points = wall_points[band_mask]
            other_axis = 0 if axis_index == 1 else 1
            min_extent = float(np.percentile(band_points[:, other_axis], 5.0))
            max_extent = float(np.percentile(band_points[:, other_axis], 95.0))
            min_height = float(np.percentile(band_points[:, 2],          5.0))
            max_height = float(np.percentile(band_points[:, 2],         95.0))
            if max_extent - min_extent < 500.0 or max_height - min_height < 500.0:
                continue
            corners_world = PhotoMeasurePro__Scene3d__BuildRectangleForOffsetPlane(
                axis_index, peak_offset_mm, min_extent, max_extent, min_height, max_height
            )
            suggestions.append({
                "parentPlane":   parent_plane,
                "offsetMm":      float(round(peak_offset_mm)),
                "cornersWorld":  corners_world,
                "widthMm":       float(max_extent - min_extent),
                "heightMm":      float(max_height - min_height),
                "pixelSupport":  int(band_mask.sum()),
            })
        if len(suggestions) >= 3:
            break
    return suggestions[:3]


def PhotoMeasurePro__Scene3d__BuildPlaneLabelMap(
    perspective:        dict,
    camera_pose:        dict,
    height_pixels:      int,
    width_pixels:       int,
    offset_planes:      list[dict],
    facade_length_mm:   float,
    side_length_mm:     float,
    inferred_height_mm: float = 8000.0,
    working_long_edge:  int   = 1024
) -> tuple[np.ndarray, dict]:
    """Partition every pixel of the photo by geometric ray-plane intersection + z-buffering against the
    analytical rectangles (Facade, Side, Ground) and the detected offset quads. This is robust even
    with a noisy depth calibration: it only uses the perspective solve + constraint lengths to place
    pixels. Labels:
        0 = background (sky / foliage / no plane hit)
        1 = Facade  (Y = 0 plane, main)
        2 = Side    (X = 0 plane, main)
        3 = Ground  (Z = 0 plane)
        4..N = detected offsets, in order."""
    labels_by_plane = {"background": 0, "Facade": 1, "Side": 2, "Ground": 3}

    # Work at a reduced resolution and blow back up afterwards so per-pixel math stays vectorisable.
    scale_factor = max(1.0, float(max(width_pixels, height_pixels)) / float(working_long_edge))
    working_w    = max(1, int(round(width_pixels  / scale_factor)))
    working_h    = max(1, int(round(height_pixels / scale_factor)))
    focal_scaled = float(perspective["f"]) / scale_factor
    cx_scaled    = float(perspective["cx"]) / scale_factor
    cy_scaled    = float(perspective["cy"]) / scale_factor

    u_coords = np.arange(working_w, dtype=np.float64)
    v_coords = np.arange(working_h, dtype=np.float64)
    u_grid, v_grid = np.meshgrid(u_coords, v_coords)
    ray_cam_x = (u_grid - cx_scaled) / focal_scaled                              # OpenCV convention: +X right, +Y down, +Z forward.
    ray_cam_y = (v_grid - cy_scaled) / focal_scaled
    ray_cam_z = np.ones_like(ray_cam_x)
    ray_cam   = np.stack([ray_cam_x, ray_cam_y, ray_cam_z], axis=-1)              # Shape (H, W, 3).
    rotation_world_from_camera = camera_pose["R_cw"]
    ray_world = ray_cam @ rotation_world_from_camera.T                            # (H, W, 3).
    camera_origin = camera_pose["C"]

    label_map   = np.zeros((working_h, working_w), dtype=np.uint8)
    best_t_mm   = np.full((working_h, working_w), np.inf, dtype=np.float64)

    margin_mm = 300.0                                                             # Slight slop so pixels on the plane edges still register.

    def intersect_and_assign(
        label_index:   int,
        plane_normal:  np.ndarray,
        plane_offset:  float,
        bounds_world:  tuple[tuple[float, float], tuple[float, float], tuple[float, float]]
    ) -> None:
        nonlocal label_map, best_t_mm
        denominator = ray_world @ plane_normal                                    # (H, W).
        numerator   = plane_offset - float(np.dot(camera_origin, plane_normal))
        valid_ray   = np.abs(denominator) > 1e-6
        t_mm        = np.where(valid_ray, numerator / np.where(valid_ray, denominator, 1.0), np.inf)
        t_mm        = np.where(t_mm > 10.0, t_mm, np.inf)                         # Reject behind-camera / pathological.

        hit_x = camera_origin[0] + t_mm * ray_world[..., 0]
        hit_y = camera_origin[1] + t_mm * ray_world[..., 1]
        hit_z = camera_origin[2] + t_mm * ray_world[..., 2]

        (x_min, x_max), (y_min, y_max), (z_min, z_max) = bounds_world
        inside_quad = (
            (hit_x >= x_min - margin_mm) & (hit_x <= x_max + margin_mm) &
            (hit_y >= y_min - margin_mm) & (hit_y <= y_max + margin_mm) &
            (hit_z >= z_min - margin_mm) & (hit_z <= z_max + margin_mm)
        )
        replacement_mask = inside_quad & (t_mm < best_t_mm)
        label_map        = np.where(replacement_mask, label_index, label_map)
        best_t_mm        = np.where(replacement_mask, t_mm,        best_t_mm)

    intersect_and_assign(1, np.array([0.0, 1.0, 0.0]), 0.0, (                     # Facade (Y = 0) — bounded by facade_length in X, 0..inferred_height in Z.
        (0.0, facade_length_mm),
        (-10.0, 10.0),
        (0.0, inferred_height_mm),
    ))
    intersect_and_assign(2, np.array([1.0, 0.0, 0.0]), 0.0, (                     # Side (X = 0).
        (-10.0, 10.0),
        (0.0, side_length_mm),
        (0.0, inferred_height_mm),
    ))
    intersect_and_assign(3, np.array([0.0, 0.0, 1.0]), 0.0, (                     # Ground (Z = 0).
        (0.0, facade_length_mm),
        (0.0, side_length_mm),
        (-10.0, 10.0),
    ))

    for offset_index, offset_plane in enumerate(offset_planes):
        label_index  = 4 + offset_index
        parent       = offset_plane.get("parentPlane")
        plane_offset = float(offset_plane.get("offsetMm", 0.0))
        corners_arr  = np.asarray(offset_plane.get("cornersWorld") or [], dtype=np.float64)
        if corners_arr.shape != (4, 3):
            continue
        labels_by_plane[f"Offset_{offset_index}"] = label_index
        if parent == "Facade":
            x_min, x_max = float(corners_arr[:, 0].min()), float(corners_arr[:, 0].max())
            z_min, z_max = float(corners_arr[:, 2].min()), float(corners_arr[:, 2].max())
            intersect_and_assign(label_index, np.array([0.0, 1.0, 0.0]), plane_offset, (
                (x_min, x_max),
                (plane_offset - 10.0, plane_offset + 10.0),
                (z_min, z_max),
            ))
        elif parent == "Side":
            y_min, y_max = float(corners_arr[:, 1].min()), float(corners_arr[:, 1].max())
            z_min, z_max = float(corners_arr[:, 2].min()), float(corners_arr[:, 2].max())
            intersect_and_assign(label_index, np.array([1.0, 0.0, 0.0]), plane_offset, (
                (plane_offset - 10.0, plane_offset + 10.0),
                (y_min, y_max),
                (z_min, z_max),
            ))

    if scale_factor > 1.0:                                                        # Upsample label map back to original photo resolution via nearest neighbour.
        label_image = Image.fromarray(label_map, mode="L").resize((width_pixels, height_pixels), Image.NEAREST)
        label_map   = np.asarray(label_image, dtype=np.uint8)
    return label_map, labels_by_plane


def PhotoMeasurePro__Scene3d__UpsampleLabelMapToFullResolution(
    label_map_ds:    np.ndarray,
    v_grid:          np.ndarray,
    u_grid:          np.ndarray,
    height_full:     int,
    width_full:      int,
    downsample_step: int
) -> np.ndarray:
    """Blow the coarse label grid back to the original photo resolution using nearest-neighbour replication.
    The downsampled labels live at pixels (v_grid[i,j], u_grid[i,j]); every pixel inside a step x step tile
    inherits the same label."""
    full = np.zeros((height_full, width_full), dtype=np.uint8)
    h_ds, w_ds = label_map_ds.shape
    for row_index in range(h_ds):
        v_start = int(v_grid[row_index, 0]) - downsample_step // 2
        v_end   = v_start + downsample_step
        if v_start < 0: v_start = 0
        if v_end > height_full: v_end = height_full
        if v_end <= v_start: continue
        row_labels = label_map_ds[row_index]
        for col_index in range(w_ds):
            u_start = int(u_grid[0, col_index]) - downsample_step // 2
            u_end   = u_start + downsample_step
            if u_start < 0: u_start = 0
            if u_end > width_full: u_end = width_full
            if u_end <= u_start: continue
            full[v_start:v_end, u_start:u_end] = row_labels[col_index]
    return full


def PhotoMeasurePro__Scene3d__BuildRectangleForOffsetPlane(
    plane_axis_index: int,
    offset_mm:        float,
    extent_min_mm:    float,
    extent_max_mm:    float,
    height_min_mm:    float,
    height_max_mm:    float
) -> list[list[float]]:
    """Return four world-space corners of a plane parallel to Facade (axis 1) or Side (axis 0),
    offset from origin by offset_mm, spanning [extent_min_mm..extent_max_mm] along the parent
    plane's width direction and [height_min_mm..height_max_mm] along Z."""
    if plane_axis_index == 1:                                                    # Parent = Facade, normal is +Y.
        return [
            [extent_min_mm, offset_mm, height_min_mm],
            [extent_max_mm, offset_mm, height_min_mm],
            [extent_max_mm, offset_mm, height_max_mm],
            [extent_min_mm, offset_mm, height_max_mm],
        ]
    return [                                                                     # Parent = Side, normal is +X.
        [offset_mm, extent_min_mm, height_min_mm],
        [offset_mm, extent_max_mm, height_min_mm],
        [offset_mm, extent_max_mm, height_max_mm],
        [offset_mm, extent_min_mm, height_max_mm],
    ]


# -----------------------------------------------------------------------------
# REGION | Public Runners (Depth / Segmentation / Volume Detection)
# -----------------------------------------------------------------------------

def PhotoMeasurePro__Scene3d__WriteDepthArtifact(
    relative_depth_01: np.ndarray,
    cache_dir:         Path,
    project_code:      str
) -> str:
    depth_u16 = np.clip(1500.0 + relative_depth_01 * 9000.0, 1, 65535).astype(np.uint16)
    depth_filename = f"{project_code}__depth__.png"
    PhotoMeasurePro__Scene3d__SaveArrayAsPng(depth_u16, cache_dir / depth_filename, is_depth=True)
    return depth_filename


def PhotoMeasurePro__Scene3d__NormalizeDepthToUnitRange(depth_map: np.ndarray) -> np.ndarray:
    finite_mask = np.isfinite(depth_map)
    if not finite_mask.any():
        return np.zeros_like(depth_map, dtype=np.float32)
    low  = float(np.percentile(depth_map[finite_mask], 2.0))
    high = float(np.percentile(depth_map[finite_mask], 98.0))
    if high - low < 1e-6:
        return np.zeros_like(depth_map, dtype=np.float32)
    normalized = (depth_map - low) / (high - low)
    return np.clip(normalized, 0.0, 1.0).astype(np.float32)


def PhotoMeasurePro__Scene3d__WriteMetaPatch(cache_dir: Path, project_code: str, key: str, payload: dict) -> None:
    meta_path = cache_dir / f"{project_code}__scene3d__.json"
    meta_doc: dict[str, Any] = {}
    if meta_path.exists():
        try:
            meta_doc = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta_doc = {}
    meta_doc[key] = payload
    meta_path.write_text(json.dumps(meta_doc, indent=2), encoding="utf-8")


def PhotoMeasurePro__Scene3d__RunDepth(
    project_data: dict,
    project_code: str,
    cache_dir:    Path,
    version_locked_deps_path: Path | None = None
) -> dict:
    image_rgb    = PhotoMeasurePro__Scene3d__DecodeProjectImageToArray(project_data)
    model_paths  = PhotoMeasurePro__Scene3d__ResolveModelPaths(version_locked_deps_path)
    PhotoMeasurePro__Scene3d__LogMissingModelWarningOnce(model_paths)

    source_label = "fallback-luma-gradient"
    relative_depth = None
    if model_paths["depth_model_exists"] and ort is not None:
        try:
            relative_depth = PhotoMeasurePro__Scene3d__RunDepthOnnx(image_rgb, model_paths["depth_model_path"])
            if relative_depth is not None:
                source_label = "depth-anything-v2-small-onnx"
        except Exception as inference_error:
            print(f"[PhotoMeasurePro][Scene3D] Depth inference failed, using fallback: {inference_error}")
            relative_depth = None
    if relative_depth is None:
        relative_depth = PhotoMeasurePro__Scene3d__BuildFallbackRelativeDepth(image_rgb)

    relative_depth_unit = PhotoMeasurePro__Scene3d__NormalizeDepthToUnitRange(relative_depth)
    depth_filename      = PhotoMeasurePro__Scene3d__WriteDepthArtifact(relative_depth_unit, cache_dir, project_code)

    PhotoMeasurePro__Scene3d__WriteMetaPatch(cache_dir, project_code, "depth", {
        "source":       source_label,
        "modelPath":    str(model_paths["depth_model_path"]),
        "modelPresent": bool(model_paths["depth_model_exists"]),
        "shape":        [int(relative_depth_unit.shape[0]), int(relative_depth_unit.shape[1])],
    })
    return {"filename": depth_filename, "source": source_label, "relative_depth": relative_depth}


def PhotoMeasurePro__Scene3d__RunSegmentation(
    project_data: dict,
    project_code: str,
    cache_dir:    Path,
    version_locked_deps_path: Path | None = None
) -> dict:
    image_rgb   = PhotoMeasurePro__Scene3d__DecodeProjectImageToArray(project_data)
    model_paths = PhotoMeasurePro__Scene3d__ResolveModelPaths(version_locked_deps_path)
    PhotoMeasurePro__Scene3d__LogMissingModelWarningOnce(model_paths)
    seg_map      = PhotoMeasurePro__Scene3d__BuildFallbackSegmentation(image_rgb)
    seg_filename = f"{project_code}__segmentation__.png"
    PhotoMeasurePro__Scene3d__SaveArrayAsPng(seg_map, cache_dir / seg_filename, is_depth=False)
    PhotoMeasurePro__Scene3d__WriteMetaPatch(cache_dir, project_code, "segmentation", {
        "source":       "fallback-heuristic-segmentation",
        "modelPath":    str(model_paths["mobile_sam_model_path"]),
        "modelPresent": bool(model_paths["mobile_sam_model_exists"]),
        "classes":      {"0": "unknown", "1": "facade", "2": "side", "3": "ground", "4": "sky", "5": "foliage", "6": "opening"},
        "shape":        [int(seg_map.shape[0]), int(seg_map.shape[1])],
    })
    return {"filename": seg_filename}


def PhotoMeasurePro__Scene3d__RunDetectVolumes(
    project_data: dict,
    project_code: str,
    cache_dir:    Path,
    version_locked_deps_path: Path | None = None,
    client_payload: dict | None = None
) -> dict:
    """Full pipeline: ensure depth exists, lift to metric world coordinates, histogram-cluster wall pixels,
    return a list of offset-plane suggestions plus diagnostic info."""
    perspective = PhotoMeasurePro__Scene3d__ExtractPerspectiveData(project_data, client_payload)
    if perspective is None:
        raise ValueError("Perspective data is incomplete; run Setup Perspective first and retry.")
    constraints = PhotoMeasurePro__Scene3d__ExtractConstraints(project_data, client_payload)
    camera_pose = PhotoMeasurePro__Scene3d__BuildCameraPose(
        perspective,
        constraints["facade_length_mm"],
        constraints["side_length_mm"]
    )
    if camera_pose is None:
        raise ValueError("Camera pose could not be solved; check perspective + anchor.")

    depth_result    = PhotoMeasurePro__Scene3d__RunDepth(project_data, project_code, cache_dir, version_locked_deps_path)
    relative_depth  = depth_result["relative_depth"]
    image_rgb       = PhotoMeasurePro__Scene3d__DecodeProjectImageToArray(project_data)
    height, width   = image_rgb.shape[:2]
    target_points   = 120000                                                      # Cap so detection stays fast on large photos.
    downsample_step = max(1, int(round(math.sqrt((height * width) / target_points))))
    v_grid, u_grid, rays_world = PhotoMeasurePro__Scene3d__BuildPixelRaysWorld(
        height, width, perspective, camera_pose, downsample_step
    )
    calibration = PhotoMeasurePro__Scene3d__CalibrateDepthToMetric(
        relative_depth, rays_world, v_grid, u_grid, camera_pose, perspective,
        constraints["facade_length_mm"] or 6000.0,
        constraints["side_length_mm"]   or 6000.0
    )
    if calibration["metric_depth_ds"] is None:
        return {
            "offsetPlanes":    [],
            "depthSource":     depth_result["source"],
            "depthFilename":   depth_result["filename"],
            "calibration":     {"ok": False, "reason": "Could not fit metric depth model."},
        }
    world_points = PhotoMeasurePro__Scene3d__ComputeWorldPointsFromMetric(
        calibration["metric_depth_ds"], rays_world, camera_pose
    )
    offset_planes = PhotoMeasurePro__Scene3d__DetectOffsetVolumes(
        world_points,
        constraints["facade_length_mm"] or 6000.0,
        constraints["side_length_mm"]   or 6000.0,
    )

    label_map_full, labels_by_plane = PhotoMeasurePro__Scene3d__BuildPlaneLabelMap(    # Partition every wall/ground pixel into exactly one plane so each mesh only textures its own chunk of the photo.
        perspective,
        camera_pose,
        height,
        width,
        offset_planes,
        constraints["facade_length_mm"] or 6000.0,
        constraints["side_length_mm"]   or 6000.0,
    )
    label_map_filename = f"{project_code}__planeLabels__.png"
    PhotoMeasurePro__Scene3d__SaveArrayAsPng(label_map_full, cache_dir / label_map_filename, is_depth=False)

    PhotoMeasurePro__Scene3d__WriteMetaPatch(cache_dir, project_code, "volumeDetection", {
        "downsampleStep":       int(downsample_step),
        "calibrationAlpha":     calibration["alpha"],
        "calibrationBeta":      calibration["beta"],
        "calibrationQualityR2": calibration["quality"],
        "offsetPlaneCount":     len(offset_planes),
        "labelMapFilename":     label_map_filename,
        "labelsByPlane":        labels_by_plane,
    })
    return {
        "offsetPlanes":  offset_planes,
        "depthSource":   depth_result["source"],
        "depthFilename": depth_result["filename"],
        "calibration": {
            "ok":        True,
            "alpha":     calibration["alpha"],
            "beta":      calibration["beta"],
            "qualityR2": calibration["quality"],
        },
        "labelMap": {
            "filename":       label_map_filename,
            "widthPixels":    int(width),
            "heightPixels":   int(height),
            "labelsByPlane":  labels_by_plane,
        },
    }
