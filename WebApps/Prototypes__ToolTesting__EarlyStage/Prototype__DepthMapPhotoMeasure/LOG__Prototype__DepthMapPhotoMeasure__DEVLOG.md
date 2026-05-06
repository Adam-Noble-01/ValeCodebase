# =============================================================================
# PROTOTYPE__DEPTHMAP_PHOTOMEASURE - DEVELOPMENT LOG
# =============================================================================
#
# FILE       : LOG__Prototype__DepthMapPhotoMeasure__DEVLOG.md
# NAMESPACE  : Prototype__DepthMapPhotoMeasure
# MODULE     : Depth Map Photo Measure (metric monocular depth + survey)
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Session-by-session build notes, infrastructure decisions, and fixes
# CREATED    : 2026
#
# DESCRIPTION:
# - Living dev log for the browser-based depth-measurement prototype
# - Mirrors Vale Design Suite documentation standards (Whitecardopedia dev log pattern)
# - Add new dated entries below this banner; newest session directly under the separator line
#
# =============================================================================

# -----------------------------------------------------------------------------

## Prototype__DepthMapPhotoMeasure - 05-May-2026 (Late Eve) - Secondary reference commit fix + depth-anchored vertical wall measurements

### Symptom
- Secondary wall reference capture appeared in diagnostics but did not render as a committed dimension overlay on the image, creating the impression that the menu never committed.
- Vertical measurements on the same wall plane remained unstable because they were still falling into the depth-led fallback with noisy local depth.

### Fix
- **Dual persistent calibration overlays**: bootstrap now tracks separate `REF1` and `REF2` overlay records and sends both to the measurement overlay renderer. Both references remain visible after apply, and secondary pending/apply states now draw on-canvas.
- **Secondary apply return contract**: `Na__Bootstrap__ApplySecondaryWallReference` now returns `{ success, reason }`. The calibration modal consumes that result and keeps the form open with an explicit banner message when the secondary apply is rejected (for example, too close along the wall axis), instead of silently resetting.
- **Depth-anchored vertical path**: added `wallDepthVertical` measurement mode. For segments near perpendicular to the wall axis, depth is interpolated from primary/secondary wall reference depths at midpoint axis-coordinate `s`, then optionally safety-clamped toward local depth via config. This keeps perspective/depth awareness while reducing vertical drift on the same plane.

### Config Added
- `measurementHybrid.enableDepthAnchoredVertical`
- `measurementHybrid.verticalWallAngleDeg`
- `measurementHybrid.verticalDepthMaxRelativeShift`

### Files Touched
- `02__AppSource/01__Bootstrap__/Na__Bootstrap__Main.js`
- `02__AppSource/06__UserInterface__/Na__CalibrationModal__ReferenceFlow.js`
- `02__AppSource/06__UserInterface__/Na__MeasurementOverlay__RenderLines.js`
- `02__AppSource/02__AppData__/Na__AppConfig__Main.json`

## Prototype__DepthMapPhotoMeasure - 05-May-2026 (Eve) - Hybrid wall measurement stabilisation (primary + secondary wall references, wall-plane interpolation, depth-led fallback)

### Symptom
Five horizontal widths across the same physical sash window came back as 1260, 1545, 1610, 1455 mm vs the typed reference of 1380 mm; the matching width on the leftmost window came back at 1385 mm. Pure 2D frontoparallel-at-midpoint took the depth-noise out of single segments but couldn't compensate for perspective scale variation across image x-position when the wall sits at an oblique angle to the camera.

### Fix - Hybrid measurement dispatcher
Bootstrap (`Na__Bootstrap__ComputeMeasurementDistance`) now picks between two paths per measurement:

1. **wallPlane** - when a calibration is active and the segment vector is within `measurementHybrid.wallParallelAngleDeg` of the primary reference's axis. Distance is `deltaPx / ppm(s)` where `ppm(s)` is linearly interpolated along the wall axis between the primary and (optional) secondary wall references. With only the primary, ppm is constant; with a secondary at a different x-position, perspective scale variation across the wall is corrected directly.
2. **depthModel / frontoparallel** - existing scaled-frontoparallel path with the active reference's depth/length ratio, used for non-wall-parallel segments or when no calibration is active.

### Features Added
- **Wall-plane primary anchor** captured automatically by the existing primary calibration. Bootstrap stores `wallRefPrimary` with axis (origin + unit + normal vectors), pixel length, midpoint, ppm, sCoord = 0.
- **Secondary wall reference capture** via a new "Add second wall reference" button revealed in the sidebar after a primary calibration succeeds. Same two-click + length flow; modal now tracks a `captureMode` ('primary' or 'secondary') and dispatches to `onApplied` / `onSecondaryApplied` accordingly.
- **Calibration summary readout** in the sidebar showing primary/secondary ppm, sCoord separation and the secondary/primary ppm ratio so the surveyor can see at a glance how strong the perspective correction is.
- **Hybrid config block** in `Na__AppConfig__Main.json`: `measurementHybrid.enableWallPlaneClamp`, `measurementHybrid.wallParallelAngleDeg` (12 deg default), `measurementHybrid.minRefSeparationPx` (50 px default - rejects a secondary that is too close to the primary along the wall axis to form a stable interpolation).
- **Diagnostics** include `mode=wallPlane|depthModel|frontoparallel`, `s=<px>`, `ppm=<px/m>`, `angle=<deg>` for every measurement, and `Wall plane primary/secondary` lines on calibration apply.

### Files Touched
- `02__AppSource/01__Bootstrap__/Na__Bootstrap__Main.js` - wallRefPrimary/Secondary state, axis/ppm helpers, hybrid measurement branch, secondary calibration handler, summary refresh.
- `02__AppSource/06__UserInterface__/Na__CalibrationModal__ReferenceFlow.js` - capture-mode state machine, `onSecondaryApplied`, `showSecondaryAvailable`, `showSummary`.
- `02__AppSource/02__AppData__/Na__AppConfig__Main.json` - `measurementHybrid` config block.
- `App.html` - secondary-button + summary-readout + capture-mode-label DOM nodes.
- `03__AppStyles/Na__Stylesheet__Main.css` - styling for the new sidebar elements.

### Validation
- Calibrate primary 1.380 m on the right window's bottom edge.
- Click "Add second wall reference"; calibrate secondary against another known dimension on the same wall at a different x-position (e.g. left window's matching edge).
- Re-measure the four horizontals across the right window pane: they should converge tightly around the typed reference.
- Verify diagnostics show `mode=wallPlane` for those segments and `mode=depthModel` for any segment off the wall axis.

# -----------------------------------------------------------------------------

## Prototype__DepthMapPhotoMeasure - 05-May-2026 (PM) - Calibration robustness: divergence guardrail + Plane-Anchor + Depth-Rescale modes + live cursor depth HUD

### Summary
Diagnosed and fixed the systematic **2x measurement-scale error** seen on architectural photos when calibrating against a back-wall reference. The depth model (DA V2 Metric Outdoor / vKITTI ViT-L) was reporting **37.64 m vs 17.57 m** for two clicks on what was visually the same coplanar feature; the existing `frontoparallel` solver silently averaged the 20 m depth split into `dAvg=27.6 m`, solved a focal of 3807 px that produced consistent geometry only at that average plane, and every subsequent click on the back wall inherited the same model depth-spread (~17-38 m), making distances dominated by a bogus delta-Z and coming out roughly 2x physical reality. Fix layered: visibility (live cursor depth chip), guardrails (depth-divergence banner on the captured pair), and two new calibration modes that sidestep the depth-map's per-point gradient errors (Plane Anchor + Depth Rescale).

### Features Added
- **Live cursor depth HUD** (`Na__DepthHud__CursorReadout.js`) - floating chip at the cursor showing image-pixel coords + sampled metric depth + a 5x5 local depth gradient flag. Turns yellow ("uneven") whenever `range/centre >= gradientWarnRelative` so the user can see model errors before clicking.
- **Calibration depth-divergence guardrail** - new exported helper `Na__Calibration__InspectPairDepths(depthA, depthB, thresholds)` returns `{ status: 'ok'|'warn'|'bad', dAvg, ratio, deltaAbs, deltaRel }`. Bootstrap samples raw depths immediately on `onPairCaptured` and pushes the inspection into the calibration modal, which now shows a coloured banner (warn = amber, bad = red) explaining the divergence and suggesting either re-clicking on a flatter feature or switching mode.
- **Calibration mode selector** in the sidebar with three modes:
  1. **Frontoparallel** (legacy default) - unchanged maths.
  2. **Plane Anchor** (new) - after the two reference clicks, the modal asks for one more click on the plane the user actually wants to measure; bootstrap arms the picker via `Na__PointPicker__Create.startAnchorMode()` and the solver `Na__Calibration__SolvePlaneAnchor` uses *only* the anchor's depth: `focalPx = deltaPx_ref * depthAnchor / L`. Robust to per-point depth-map noise on the reference clicks because their own depths are not used in the solve.
  3. **Depth Rescale** (new) - trusts an external focal source (DepthPro `focalPxImageSpace` else EXIF) and instead solves a single multiplicative scale alpha on the depth map: alpha = L / |worldB - worldA|(at trustedFocal, raw depths). The new bootstrap state `depthScaleAlpha` is then multiplied into every depth sample at measurement time, so existing measurements re-recompute through the new scale on the next `RecomputeAllMeasurements` pass.
- **Configurable everything** - added `calibration` block to `Na__AppConfig__Main.json` (depthDivergence thresholds, depthHud kernel + warn ratio, depthSampleKernelRadius, default mode). No behaviour hardcoded in modules per the workspace's "config is single source of truth" rule.
- **Diagnostics line upgrades** - the `Calibration: points captured ...` log line now prints the depths and divergence status directly; the `Calibration applied (...)` log includes `depthScale=` when alpha != 1; `Focal resolved -> ...` and the status bar focal slot append `, alpha=N.NN` when a depth rescale is active.

### Technical Implementation
- **Solver dispatcher** - `Na__Calibration__FromKnownReference.js` is now a thin dispatcher over `strategy: 'frontoparallel' | 'full3D' | 'auto' | 'planeAnchor' | 'depthRescale'`; the new strategies are isolated in `Na__Calibration__PlaneAnchorSolver.js` and `Na__Calibration__DepthRescaleSolver.js` with `// @delegate:` breadcrumbs left in the dispatcher.
- **Two-flavour depth sampling** in bootstrap:
  - `Na__Bootstrap__SampleRawDepth(point)` - used by the calibration solvers (does NOT apply alpha; otherwise depthRescale would double-apply).
  - `Na__Bootstrap__SampleDepth(point)` - used by every measurement path; applies `state.depthScaleAlpha`.
- **Existing measurements survive recalibration** - `Na__Bootstrap__RecomputeOneMeasurement` was changed to re-sample depths through `Na__Bootstrap__SampleDepth` on every recompute (instead of using the stale `item.depthA/B` that were stored when the measurement was first created), so a Depth Rescale calibration applied *after* measurements were taken correctly rescales the prior list.
- **Picker `anchor` mode** - `Na__PointPicker__InteractiveClick.js` gained `startAnchorMode()` and a new `onAnchorPoint` listener; the mousemove preview now also passes `clientX/clientY` through to listeners so the HUD chip can position itself relative to the stage rect.
- **HUD respects depth scale** - `Na__DepthHud__CursorReadout` exposes `setDepthScale(alpha)`; bootstrap calls it on inference complete, image load, model switch, and after each calibration apply, so the chip always shows the *effective* depth (raw_depth * alpha).

### Issues Encountered & Resolutions
- **Frontoparallel silently averages divergent depths** - calibrating across the upper edge of the conservatory and a corner of the back facade gave `dAvg = 27.6 m` from `(37.64, 17.57)` model depths, solving a focal that was geometrically consistent only at that average plane; back-projection of the same pair using each point's own depth then reconstructed a 20.97 m segment for a 10.85 m reference. **Fix**: surface the divergence in the modal, and offer two solver modes that don't depend on the reference points' own depths.
- **DA V2 Metric Outdoor (vKITTI) is out-of-distribution for architectural shots** - depth range on PM01 returned 8.05-70.02 m (the back wall is ~10-15 m). DepthPro on the same image returned 0.78-37.09 m which is plausible. **Fix**: Depth Rescale mode lets the user lock to EXIF/DepthPro focal and rescale the model's depth map so at least the linear scale error is corrected; Plane Anchor mode sidesteps the depth gradient altogether by pinning to one user-chosen anchor.
- **Picker preview event signature change** - added `mouseClient` payload as a 4th arg; the bootstrap preview handler reads it but legacy listeners that ignore it are unaffected.

### Validation Path (manual)
- Reload sample PM01 with DA V2.
- Repeat the exact reference clicks from the original diagnostics: A=(2183,1543), B=(3653,1267), L=10840 mm.
- Expect: divergence banner shows `~37.64 m vs 17.57 m (ratio 2.14x)` immediately after the second click.
- Switch to Depth Rescale, re-arm, re-click, type 10840 mm, Apply.
- Expect: log line shows `depthScale ~= 0.50`; status bar focal shows `2912 px (~69.4 deg, CALIBRATION, alpha=0.50)`; the same back-wall measurement that previously read 21.76 m now reads ~10.85 m.
- Switch to Plane Anchor, click two ref points, then a third anchor click in the centre of the back wall, type 10840 mm, Apply.
- Expect: log line shows `focalPx ~= 2900 px` (close to EXIF) with `depthScale=1.00`; back-wall measurements collapse to physical sizes; conservatory measurements may differ because they sit at a different depth (this is expected and matches surveying intent: pin to the plane you actually want).

### Files Touched / Added
- **New**: `02__AppSource/04__CameraIntrinsics__/Na__Calibration__PlaneAnchorSolver.js`, `02__AppSource/04__CameraIntrinsics__/Na__Calibration__DepthRescaleSolver.js`, `02__AppSource/06__UserInterface__/Na__DepthHud__CursorReadout.js`.
- **Edited**: `02__AppSource/02__AppData__/Na__AppConfig__Main.json` (calibration block), `02__AppSource/04__CameraIntrinsics__/Na__Calibration__FromKnownReference.js` (dispatcher + InspectPairDepths), `02__AppSource/06__UserInterface__/Na__PointPicker__InteractiveClick.js` (anchor mode + clientXY in preview), `02__AppSource/06__UserInterface__/Na__CalibrationModal__ReferenceFlow.js` (mode selector, banner, anchor flow, payload-shape onApplied), `02__AppSource/01__Bootstrap__/Na__Bootstrap__Main.js` (state.depthScaleAlpha, raw vs scaled sample helpers, dispatch by mode, recompute through current alpha, status bar alpha tag), `App.html` (HUD chip, mode fieldset, divergence banner, anchor hint + readout), `03__AppStyles/Na__Stylesheet__Main.css` (HUD chip, banner, mode option, anchor rows).

### Follow-Up / Carry Forward
- Multi-point planar calibration (N>=3 ref points + 1-2 known dimensions, least-squares) for full plane-orientation + scale solve - flagged as future, not in this change set.
- Depth-overlay heatmap re-renders use raw depths only; consider a "scaled view" toggle that re-renders with alpha applied so users see what the system is actually measuring with.
- Lens-distortion model still absent; ultra-wide phone shots will drift at frame edges until added.

### Hotfix (same session) - Plane Anchor must lock ALL subsequent depth samples
First Plane Anchor pass only solved focal at `anchorDepth`; back-projection of measurement clicks still pulled per-point depth from the model, so noisy depth gradients on the same wall (e.g. 14 m to 38 m within a single back facade in PM01) re-injected the bogus delta-Z and labels still read ~2x truth.
Patched: bootstrap now stores `lockedAnchorDepth` whenever a Plane Anchor calibration succeeds, and `Na__Bootstrap__SampleDepth` returns that locked value for every measurement until a different calibration runs (or the image / model changes). Effect: the scene is treated as a single frontoparallel plane at the anchor's depth - the Z-component of any Δ becomes zero and world distances reduce to `deltaPx_meas * L / deltaPx_ref`, which is exactly the surveying intent. Status bar / focal hint / DEVLOG line all gained a `lockedDepth=N.NNm` tag so the lock is visible. Caveat: measurements off the locked plane will be wrong by the depth ratio; user must re-calibrate to a new anchor when measuring a different plane.

### Final geometry - switch to 2D frontoparallel measurement, drop displayScale entirely
After the displayScale simplification, a single calibrated photo of a sash window still produced five different widths (1260, 1545, 1610, 1455 mm) for the same physical pane that the reference (bottom of the same window) had typed at 1380 mm. The leftmost window's matching width came back at 1385 mm. Single-multiplier displayScale could not correct this because the depth model assigns different depths to neighbouring pixels even on a flat wall - the resulting per-measurement Z-component noise varies with image position, so no global multiplier can flatten it.

Fix: every measurement now computes as 2D frontoparallel projection at the average sampled depth instead of 3D back-projection.
```
deltaPx2D = sqrt((pxB-pxA)^2 + (pyB-pyA)^2)
dAvg     = (depthA + depthB) / 2
distance = deltaPx2D * dAvg / focalPx
```
New helper module `02__AppSource/05__Measurement__/Na__Distance__FrontoparallelPlanar.js` owns the maths. Bootstrap's `Na__Bootstrap__OnMeasurementPair` and `Na__Bootstrap__RecomputeOneMeasurement` both call it; the prior 3D back-projection plus `Na__Distance__ComputeBetweenPoints` chain is gone from the bootstrap path (the helpers stay on disk for future reuse).

Why this works without an extra scale factor: under frontoparallel calibration the focal is solved as `deltaPx_ref * dAvg_ref / L_typed`, so plugging the reference back into the 2D formula recovers exactly `L_typed`. Same-plane measurements scale by `(deltaPx_meas / deltaPx_ref) * (dAvg_meas / dAvg_ref) * L_typed`, where the depth ratio is ~1 on a coplanar feature - no Z-noise contribution. Different-plane measurements scale by the model's relative depth ratio, which is the correct surveying behaviour (re-calibrate to a new plane when measuring a different feature).

`displayScale` is deleted: state field removed, focal hint line removed, status-bar `, scale=...` tag removed, all `rawDistanceMeters` / `displayScale` writes inside measurement records removed. `Na__BackProject__PixelToWorldPoint` and `Na__Distance__ComputeBetweenPoints` imports pruned from the bootstrap (modules retained for any future diagonal-3D mode).

### Simplification (earlier in session) - displayScale collapses everything to a single multiplier
Both prior over-engineered systems (Plane Anchor lock + Depth Rescale alpha + multi-mode UI) deleted. Final design is a single global `state.displayScale` derived at calibration apply time:
1. Solver gives a focal via existing frontoparallel maths.
2. Back-project the reference pair through that focal at raw depths to get `refNaturalM`.
3. `displayScale = L_typed / refNaturalM`.
4. Every measurement (new or recomputed) stores `distanceMeters = rawDistance * displayScale` and `deltaMeters` scaled component-wise. Display layers read `distanceMeters` unchanged - no plumbing into formatters, sidebar, or overlay needed.

Why this works: the depth model produces broadly proportional errors on the scene, so the reference's own scale error is the same scale error every measurement carries. One multiplier corrects the lot. For PM01: typed 10.84 m, refNatural ~21.59 m, displayScale ~0.502, and the 21.76 m back-wall horizontal collapses to 10.92 m - what the surveyor wanted.

What was deleted:
- `Na__Calibration__PlaneAnchorSolver.js`, `Na__Calibration__DepthRescaleSolver.js`
- Mode selector UI (App.html) and its CSS
- Anchor hint / anchor readout UI and CSS
- Picker `startAnchorMode` / `onAnchorPoint`
- Modal `onAnchorRequested` / `onAnchorCaptured` / `handleAnchorPoint` / `showAnchorReadout`
- Bootstrap `state.depthScaleAlpha`, `state.lockedAnchorDepth`, `Na__Bootstrap__SampleRawDepth`, `Na__Bootstrap__BuildCalibrationOptions`, `Na__Bootstrap__PickTrustedFocalForRescale`
- HUD `setDepthScale` (chip just shows raw model depth now)
- Config `calibration.defaultMode`, `calibration.availableModes`

What was kept:
- Frontoparallel solver (still produces a sensible focal even when no EXIF is available)
- Divergence-warning banner (cheap to keep, useful awareness when the model disagrees about coplanarity even though displayScale corrects regardless)
- Live cursor depth HUD
- `Na__Calibration__InspectPairDepths` helper

# -----------------------------------------------------------------------------

## Prototype__DepthMapPhotoMeasure - 05-May-2026 - Initial build + ONNX metric depth pipeline + calibration hardening + COI dev server

### Summary
Built **Prototype__DepthMapPhotoMeasure** end-to-end: two metric depth models (Apple Depth Pro + Depth Anything V2 Metric Outdoor) running in-browser via **onnxruntime-web**, EXIF + model + manual + reference-calibration intrinsics chain, click-to-measure with 3D back-projection, modular `Na__Domain__Purpose__` source layout, and a **COOP/COEP** dev server so multi-threaded WASM works. Session also fixed truncated CDN downloads (BITS), persistent reference-dimension drawing, calibration solver semantics (frontoparallel default), and aggressive browser caching of ES modules.

### Features Added
- **Dual metric depth models (side-by-side toggle)**:
  - **Apple Depth Pro** — `onnx-community/DepthPro-ONNX` **Q4** single-file ONNX (`model_q4.onnx`, ~746 MB) as default for WASM; optional **Q4F16** for WebGPU-capable GPUs; outputs `predicted_depth` + `focallength_px` (tensor name `focallength_px` in the shipped graph)
  - **Depth Anything V2 Metric Outdoor (vKITTI ViT-L)** — community ONNX from `yuvraj108c/Depth-Anything-2-Onnx` (`depth_anything_v2_metric_vkitti_vitl.onnx`, ~1.34 GB); fixed **518×518** input / output; no focal output — intrinsics from EXIF / manual / calibration
- **Modular app skeleton** under `02__AppSource/` — `01__Bootstrap__`, `02__AppData__` (single `Na__AppConfig__Main.json`), `03__ModelInference__`, `04__CameraIntrinsics__`, `05__Measurement__`, `06__UserInterface__` plus `03__AppStyles/Na__Stylesheet__Main.css`
- **Inference pipeline** — `Na__OnnxRuntime__SessionLoader.js` (dynamic import of ORT, session cache per model id, fetch progress, EP preference from config), generic `Na__ImagePreprocess__NormalizeForModel.js` (letterbox for DepthPro, stretch for DA V2), per-model post-processors that **resample model-space depth back to original image pixel grid** for consistent clicking
- **Intrinsics fallback chain** — `Na__FocalLength__ResolveWithFallback.js`: **MANUAL** (slider / focal-px input wins) → **CALIBRATION** → **MODEL** (DepthPro only) → **EXIF** (`FocalLengthIn35mmFilm` preferred; sensor presets for iPhone / Canon / Sony / MFT / OnePlus) → **DEFAULT** 60° FOV; two-way bound FOV slider ↔ focal-px (range widened to **10°–170°** so extreme calibrations are not clamped visually)
- **Reference calibration** — click two points, enter known length in mm, solve focal; **persistent dashed magenta “REF …” overlay** on the measurement canvas until new image / model switch / re-arm calibration; Enter applies, Escape cancels; console + diagnostics logging on every step (`[Na__Calibration]`, `[Na__PointPicker]`, `[Na__Bootstrap]`)
- **Measurements** — bilinear depth sampling with optional small kernel average; pin-hole back-projection; Euclidean distance + horizontal/vertical breakdown; in-memory store with subscribe/notify; sidebar list with delete + clear all
- **UI** — three stacked canvases (base / depth turbo heatmap / measurement overlay), drag-drop + file picker + **Use sample (PM01)**, model toggle strip, status bar with session-create timer, diagnostics `<pre>` panel
- **Developer ergonomics**:
  - `Na__DevServer__CoiHeaders.py` — serves with **COOP same-origin + COEP require-corp + CORP cross-origin**; **no-store** for all paths except `01__ExternalDependencies__VersionLocked/` (24h cache for ONNX/WASM/ORT)
  - `Na__Run__StartDevServer.bat` — one double-click to open `http://127.0.0.1:8766/App.html` and start the server
  - `Na__ModelDownload__FetchAll.ps1` — BITS/WebClient for multi-GB ONNX; protobuf header verification
  - `Na__LibraryDownload__FetchAll.ps1` — **Invoke-WebRequest only** (BITS was truncating jsdelivr responses — produced a **95 KB** fake `ort.min.js` instead of **~358 KB**; same for wasm slices)
  - `Na__ModelInspect__InputsOutputs.py` — prints ONNX I/O into `Na__ModelInspect__Result.json` for AppConfig authoring
- **Safety rails** — `Na__Bootstrap__GuardAgainstFileProtocol()` blocks `file://` with an on-page explanation (ES modules + ONNX fetch require `http://https://`); `App.html` injects bootstrap with `?v=Date.now()` so the entry module is not stuck on stale disk cache

### Technical Implementation
- **Config as single source of truth** — `02__AppSource/02__AppData__/Na__AppConfig__Main.json`: model paths, tensor names (`pixel_values`, `predicted_depth`, `focallength_px`; DA V2 `input` / `output`), preprocess means/std, default EP **wasm** (DepthPro WebGPU hits **maxStorageBuffersPerShaderStage** on many consumer GPUs), local ORT + exifr paths under `01__ExternalDependencies__VersionLocked/`
- **WASM threading** — `ort.env.wasm.numThreads` set from `self.crossOriginIsolated` (8 threads when COI headers present; 1 when not); dev server is mandatory for acceptable DepthPro session compile + first inference times
- **Calibration solver v2** — `Na__Calibration__FromKnownReference.js` now tries **`frontoparallel`** first: `focalPx = deltaPx * d_avg / L` (coplanar reference intent); falls back to legacy **full 3D** solver only when explicitly requested; fixes silent failure when `L² − C² ≤ 0` on noisy depth pairs (user saw EXIF focal stick and ~3× wrong window width)
- **Measurement overlay layering** — `Na__MeasurementOverlay__RenderLines.js` draws calibration reference **under** user measurements; pending first click uses **magenta** in calibrate mode, **amber** in measure mode; immediate preview trigger after first mousedown
- **Readme** — `Readme.md` quick-start, folder map, focal chain, EP switching, DA V2 re-export note (`fabio-sim/Depth-Anything-ONNX`), troubleshooting table (COI, WebGPU buffer limit, wasm Q4 vs Q4F16, EXIF stripped, calibration degeneracy)

### Issues Encountered & Resolutions
- **`file://` + CORS** — Browsers block `type="module"` imports from `null` origin; documented + runtime guard
- **Plain `python -m http.server`** — no COI → no `SharedArrayBuffer` → single-thread ORT → appears “stuck” on large models; replaced with dedicated COI server
- **Port 8766 collision** — multiple zombie listeners; cleared with `taskkill` / `netstat`; single clean instance verified via response headers
- **Tracking Prevention / CDN storage warnings** — mitigated by vendoring ORT + exifr locally (`02__OnnxRuntime__Web`, `03__Exifr__Library`)
- **`ort.min.js: Unexpected end of input`** — corrupted partial file from BITS; re-download via `Invoke-WebRequest`; library script updated to avoid BITS for small assets
- **Stale JS in Edge** — old `Cache-Control: max-age=3600` on all assets during early iteration; handler now scopes long cache strictly to version-locked subtree; bootstrap query cache-bust added

### Validation (performed during session)
- Head request: App source JS returns `Cache-Control: no-store, must-revalidate`; locked `ort.min.js` returns `public, max-age=86400`
- Browser console: `crossOriginIsolated=true`, `wasm.numThreads=8` when served from COI server on **8766**
- **DA V2 Metric Outdoor**: sample PM01 inference ~34 s WASM, depth range sensible, focal from EXIF **2912 px** (26 mm equiv × 4032 px / 36 mm)
- **Depth Pro Q4**: sample PM01 inference ~94 s WASM, depth range **0.78–37.09 m**, model focal **3756 px** vs EXIF 2912 px — deliberate cross-check path
- Reference calibration callbacks: pairing logs + persistent REF geometry after apply; recomputed measurement list honours **CALIBRATION** focal precedence

### Files Touched / Added (inventory)
- `App.html` — shell, cache-busted bootstrap injector
- `Readme.md` — operator documentation
- `Na__DevServer__CoiHeaders.py`, `Na__Run__StartDevServer.bat`
- `01__ExternalDependencies__VersionLocked/` — `Na__ModelDownload__FetchAll.ps1`, `Na__LibraryDownload__FetchAll.ps1`, `Na__ModelInspect__InputsOutputs.py`, `Na__ModelInspect__Result.json`, model weights + local ORT/exifr blobs
- `02__AppSource/` — full modular tree (`Na__Bootstrap__Main.js`, config, inference, intrinsics, measurement, UI modules)
- `03__AppStyles/Na__Stylesheet__Main.css`

### Follow-Up / Known Limits (carry forward)
- Pin-hole model — no radial distortion; ultra-wide phone lenses will drift at frame edges until a distortion model exists
- No measurement persistence across reload (by design for prototype)
- WebGPU DepthPro remains hardware-limited unless device exposes high `maxStorageBuffersPerShaderStage`; WASM path is default
- Zoom/pan viewport controller appeared in workspace after this log entry — wire into picker coordinate transform if interactions land on scaled canvases without remapping screen→image px

# -----------------------------------------------------------------------------
