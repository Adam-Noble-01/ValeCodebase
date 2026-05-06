# Depth Map Photo Measure — Prototype

A browser-based metric monocular-depth surveying tool for Vale architectural surveyors. Drop a photo in, the app produces a metric depth map locally (ONNX in WASM/WebGPU), then click any two points to read true real-world distances.

Two metric depth models run side-by-side so accuracy can be compared on a per-photo basis:

| Model | Input | Output | Strength |
|---|---|---|---|
| **Apple Depth Pro** (Q4 ONNX, 746 MB) | dynamic, 1536×1536 default | metric depth in metres + auto-estimated focal length in pixels | best general-purpose; no calibration needed |
| **Depth Anything V2 Metric Outdoor** (vKITTI ViT-L, 1.34 GB ONNX) | 518×518 fixed | metric depth in metres only | tuned on outdoor scenes, very stable for elevations |

For two clicked pixels with sampled depths d1, d2 and a resolved focal f, world points are recovered with the standard pin-hole model and Euclidean distance is reported in mm/m.

---

## Quick start

```powershell
cd "D:\10_CoreLib__ValeCodebase\WebApps\Prototypes__ToolTesting__EarlyStage\Prototype__DepthMapPhotoMeasure"

# 1. (Once) download model weights and JS libraries into 01__ExternalDependencies__VersionLocked/
powershell -ExecutionPolicy Bypass -File ".\01__ExternalDependencies__VersionLocked\01__DepthAnything__ModelFiles\Na__ModelDownload__FetchAll.ps1"
powershell -ExecutionPolicy Bypass -File ".\01__ExternalDependencies__VersionLocked\Na__LibraryDownload__FetchAll.ps1"

# 2. Inspect the ONNX I/O once - prints input/output names + shapes into Na__ModelInspect__Result.json
python ".\01__ExternalDependencies__VersionLocked\01__DepthAnything__ModelFiles\Na__ModelInspect__InputsOutputs.py"

# 3. Start the dev server (sets the COOP/COEP headers required for multi-threaded WASM)
python Na__DevServer__CoiHeaders.py 8766

# 4. Open in browser
start http://127.0.0.1:8766/App.html
```

> **Important**: do not use `python -m http.server`. It does **not** set the cross-origin-isolation headers required for multi-threaded WASM — without those, ORT runs in single-threaded mode and DepthPro takes 10+ minutes per inference instead of ~90 seconds.

---

## Folder layout

```
Prototype__DepthMapPhotoMeasure/
├── App.html                          - app shell
├── PM01__FrontRight__.JPG            - sample photo
├── Readme.md                         - this file
├── Na__DevServer__CoiHeaders.py      - dev server with COOP/COEP/CORP headers
│
├── 01__ExternalDependencies__VersionLocked/
│   ├── Na__LibraryDownload__FetchAll.ps1     - pulls onnxruntime-web + exifr locally
│   ├── 01__DepthAnything__ModelFiles/
│   │   ├── Na__ModelDownload__FetchAll.ps1   - downloads + validates ONNX
│   │   ├── Na__ModelInspect__InputsOutputs.py - prints model I/O for AppConfig
│   │   ├── Na__ModelInspect__Result.json     - generated artifact
│   │   ├── DepthPro__Onnx/
│   │   │   ├── model_q4.onnx                 - 746 MB (recommended for WASM)
│   │   │   ├── model_q4f16.onnx              - 600 MB (recommended for WebGPU)
│   │   │   ├── preprocessor_config.json
│   │   │   └── config.json
│   │   └── DepthAnythingV2Metric__OutdoorLarge/
│   │       └── depth_anything_v2_metric_vkitti_vitl.onnx  - 1.34 GB
│   ├── 02__OnnxRuntime__Web/                 - onnxruntime-web 1.23.0 cache
│   └── 03__Exifr__Library/                   - exifr 7.1.3 cache
│
├── 02__AppSource/
│   ├── 01__Bootstrap__/
│   │   └── Na__Bootstrap__Main.js            - entry, wires every module
│   ├── 02__AppData__/
│   │   └── Na__AppConfig__Main.json          - SINGLE SOURCE OF TRUTH
│   ├── 03__ModelInference__/
│   │   ├── Na__OnnxRuntime__SessionLoader.js
│   │   ├── Na__ImagePreprocess__NormalizeForModel.js
│   │   ├── Na__DepthPro__InferAndPostprocess.js
│   │   ├── Na__DepthAnythingV2__InferAndPostprocess.js
│   │   └── Na__ModelRegistry__SelectActiveModel.js
│   ├── 04__CameraIntrinsics__/
│   │   ├── Na__ExifReader__ParseFocalLength.js
│   │   ├── Na__FocalLength__ComputePixelsFromExif.js
│   │   ├── Na__FocalLength__ResolveWithFallback.js
│   │   └── Na__Calibration__FromKnownReference.js
│   ├── 05__Measurement__/
│   │   ├── Na__DepthSampler__SampleAtPixel.js
│   │   ├── Na__BackProject__PixelToWorldPoint.js
│   │   ├── Na__Distance__ComputeBetweenPoints.js
│   │   ├── Na__Measurement__StoreModel.js
│   │   └── Na__Measurement__FormatLabel.js
│   └── 06__UserInterface__/
│       ├── Na__ImageLoader__FileInputHandler.js
│       ├── Na__ImageCanvas__RenderBaseImage.js
│       ├── Na__DepthOverlay__RenderColorMap.js
│       ├── Na__PointPicker__InteractiveClick.js
│       ├── Na__MeasurementOverlay__RenderLines.js
│       ├── Na__MeasurementList__SidebarPanel.js
│       ├── Na__FocalControls__SliderAndInput.js
│       ├── Na__CalibrationModal__ReferenceFlow.js
│       ├── Na__ModelToggle__SelectorButtons.js
│       └── Na__StatusBar__ProgressIndicator.js
│
└── 03__AppStyles/
    └── Na__Stylesheet__Main.css
```

All identifiers follow the three-stage `Na__Domain__Purpose__` convention, and every behavioural switch lives in `Na__AppConfig__Main.json`.

---

## How focal length is resolved

This is the part that makes "metric measurement" actually metric. To convert a depth value at a pixel into a real-world XYZ point you need the camera's focal length expressed in pixels. Without it you can only measure pure depth differences (Z-axis), not the lateral horizontal/vertical components.

The app walks this chain (highest priority first) and shows the chosen source as a coloured tag in the sidebar:

1. **MANUAL** — user has dragged the FOV slider or typed a focal-px value. Always wins.
2. **CALIBRATION** — user clicked two points on something of known length and entered the value (e.g. a 900 mm door leaf). The app solves for the focal length analytically — see `Na__Calibration__FromKnownReference.js`.
3. **MODEL** — Apple Depth Pro emits its own estimate as part of inference (DA V2 does not).
4. **EXIF** — `FocalLengthIn35mmFilm` (preferred) or `FocalLength + sensor preset` (Apple iPhone, Canon, Sony, Olympus/Panasonic, OnePlus phones).
5. **DEFAULT** — 60° horizontal FOV fallback. Marked red in the UI to flag that measurements are not trustworthy.

For the iPhone 14 sample shot included (`PM01__FrontRight__.JPG`), the comparison is:
- DepthPro estimate: f ≈ 3756 px (56.5° FOV)
- EXIF (`FocalLengthIn35mmFilm = 26 mm`, image width 4032 px): f = 4032 × 26 / 36 ≈ 2912 px (69.4° FOV)

Both are valid; cross-checking the two against a known reference dimension is the recommended workflow on the first photo from each new camera.

---

## Switching execution providers

Default config: **WASM** (multi-threaded, requires the COI headers in `Na__DevServer__CoiHeaders.py`).

To enable **WebGPU** (works on Apple Silicon and high-end NVIDIA / RTX cards that report `maxStorageBuffersPerShaderStage >= 36`), edit `Na__AppConfig__Main.json`:

```json
"inference": {
  "preferredExecutionProvider": "webgpu",
  "fallbackExecutionProvider":  "wasm"
}
```

Also point DepthPro at the FP16 variant:
```json
"DepthPro": {
  "modelPath": "01__ExternalDependencies__VersionLocked/01__DepthAnything__ModelFiles/DepthPro__Onnx/model_q4f16.onnx"
}
```

If WebGPU session creation fails (device limit exceeded), the loader falls back to WASM automatically.

---

## Re-exporting Depth Anything V2 Metric ONNX (fallback)

`yuvraj108c/Depth-Anything-2-Onnx` is a community export and may go stale. To regenerate it:

```bash
git clone https://github.com/fabio-sim/Depth-Anything-ONNX
cd Depth-Anything-ONNX
pip install -r requirements.txt
python dynamo.py export -e vitl --metric outdoor --output depth_anything_v2_metric_vkitti_vitl.onnx
```

Drop the resulting file into `01__ExternalDependencies__VersionLocked/01__DepthAnything__ModelFiles/DepthAnythingV2Metric__OutdoorLarge/` and re-run the inspector script to confirm the I/O names still match `Na__AppConfig__Main.json`.

---

## Measurement maths (reference)

For two image-space pixels p1 = (px1, py1) and p2 = (px2, py2), sampled depths d1, d2 (metres), focal length f (px), and principal point at the image centre (cx, cy):

```
P_i = ((px_i − cx) · d_i / f,
       (py_i − cy) · d_i / f,
        d_i)

distance = ‖ P1 − P2 ‖
```

For reference-calibration we invert the same equations: given an asserted true distance L and the two pixels-and-depths, we solve for f directly:

```
A = (px1 − cx) · d1 − (px2 − cx) · d2
B = (py1 − cy) · d1 − (py2 − cy) · d2
C = d1 − d2
f = sqrt( (A² + B²) / (L² − C²) )
```

The solution is undefined when L ≈ |C| — meaning the user has clicked two points that lie almost exactly along the camera axis, with no lateral separation. In that case the app refuses the calibration and prompts to pick points further apart in the image plane.

---

## Known limits / out of scope

- **Pinhole assumption** — no lens-distortion correction. Wide-angle and ultra-wide camera lenses (especially iPhone 0.5×) will read short on edges. Use a known reference dimension as close to the measurement region as possible.
- **Single photo only** — no multi-view stereo, no SfM, no parallax stitching.
- **No persisted measurements** — the in-memory list resets on page reload.
- **No mobile camera capture** — file upload only for now.
- **Sky / glass / specular surfaces** — depth model output is unreliable on featureless/transparent surfaces; verify with reference dimension if measuring near these.
- **`crossOriginIsolated` on `file://`** — won't work. Use the supplied dev server.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Status bar stuck on "Creating inference session..." for >5 min | Single-threaded WASM (no COI) | Use `Na__DevServer__CoiHeaders.py`, not `python -m http.server` |
| `crossOriginIsolated=false` in console | COI headers not reaching the page | Confirm the dev server is the COI one; check no leftover `http.server` is bound to the same port |
| WebGPU `storage buffers (36) exceeds limit (8)` | DepthPro needs >8 storage buffers per stage | Stay on WASM EP; or run on Apple Silicon / high-end NVIDIA |
| `INFERENCE FAILED: 1210945920` (or some integer) | ORT WASM threw a heap pointer instead of a JS error | Switch DepthPro modelPath from `model_q4f16.onnx` to `model_q4.onnx` (Q4F16 mixes FP16 ops that aren't fully supported on WASM) |
| Focal source stuck on `DEFAULT` after EXIF parse | Photo is heavily-edited and EXIF was stripped | Use reference calibration or manual override |
| Calibration solves to extreme values (160°+ FOV) | Typed reference length doesn't match the real distance between the two clicked points | Re-do calibration; common sanity check: stand near a door, click jamb-to-jamb, type 762 / 813 / 900 mm |
