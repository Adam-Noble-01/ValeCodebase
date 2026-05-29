# NobleImageTools — Development Log

---

## 28-May-2026 — Version 1.0.1 — Bug Fixes

- Fixed critical `MODEL_CONFIG_MAP` bug: SAM2 `build_sam2()` requires `"configs/sam2.1/..."` Hydra config paths, not bare YAML filenames
- Added `NobleImageTools__Sam2__PreloadInBackground()` — model loads in daemon thread at server start, no cold-start delay on first click
- Added `torch.inference_mode()` wrapper around `predictor.set_image()` call
- Fixed canvas box drag: moved box-drag `mousemove` to `window` so drag tracks even when mouse leaves the canvas
- Added `e.preventDefault()` to mousedown in click/box modes — prevents browser native drag hijacking the box gesture
- Added CSS `user-select:none`, `touch-action:none`, JS `selectstart`/`dragstart` prevention on canvas
- Status bar now shows mode-specific hint text (changes when switching Click / Box / Pan mode)
- Health badge polls every 5 seconds until SAM2 is ready, fires a toast when model finishes loading
- Full SAM2 errors logged to console; toast shows first 120 chars for readability

---

## 28-May-2026 — Version 1.0.0 — Initial Build

- Project scaffold created under `WebApps/NobleImageTools/`
- Flask server on port 8005 (follows PhotoMeasurePro pattern)
- SAM 2.1 hiera_large integration via `sam2` pip package
- HTML5 Canvas 2D renderer with pan (middle-mouse / Space+drag) and scroll-wheel zoom
- Click prompting (left=positive, right=negative) with live preview overlay
- Box prompting (drag to draw bounding box)
- Auto-segment everything mode (SAM2AutomaticMaskGenerator)
- Layer manager (add, delete, rename, toggle visibility)
- Export: B&W PNG, RGBA cutout, Color ID map, ZIP bundle
- File browser dialog for loading images from local machine
- Dark theme UI matching WhitecardVision design language
