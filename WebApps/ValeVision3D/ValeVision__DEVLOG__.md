# ValeVision3D Development Log
# =========================================================

# ---------------------------------------------------------
## DD-MMM-YYYY - ValeVision3D v0.?.? 
### Template
-
-
-
# ---------------------------------------------------------


# ---------------------------------------------------------
## 10-Feb-2026 - ValeVision3D v0.5.0 
### Multi-Model Category Loading System
- New `Na__ModelLoader__MultiModel.js` module for loading multiple GLB model pairs.
- Models are now classified by ValeVision category (e.g. MainBuildingModel__Existing, LandscapeEnvironment).
- Priority-based sequential loading order matches GLB Builder tag range definitions.
- Each category gets its own THREE.Group enabling future per-category visibility toggling.
- URL parser accepts both `__ValeVision__` (preferred CDN) and `__NaModel__` (backstop) namespaces.
- Mesh and linework loading logic extracted from index.html into dedicated module.
- AppConfig modelDefaults now uses `modelUrls` array instead of separate base/linework URLs.
- Backwards-compatible project.json extraction supporting all four legacy URL formats (v1-v4).
- Cloudflare R2 sync script updated to rename `__NaModel__` to `__ValeVision__` in CDN filenames.
- R2 sync script now skips `01__Archive/` subfolder and pushes all root-level GLBs without version logic.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.4 
### Web Project Path Fixes
- Added absolute GitHub Pages base URL for project.json fetching.
- Added year-aware and legacy project ID normalization for web loading.
- Removed hard-coded 2025 web path to prevent 404 on new year projects.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.3 
### Normalized Navigation Controls
- Added normalized mouse wheel zoom with fixed step per tick.
- Added touch-first navigation module for iPad/mobile detection.
- Routed nav initialization through device-aware control selection.
- Added AppConfig-based navmode settings for mouse and iPad controls.
- Inverted mouse wheel zoom direction for expected scroll behavior.
- Added arrow key movement alongside WASD navigation.
- Added mouse wheel acceleration after 3 consecutive ticks for faster long-range zoom.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.2 
### Navigation, Units, and Camera Tools Updates
- Added Dev__DeveloperMode default cube for fixed scale + pivot reference.
- Standardized config units as integer millimeters with mm-to-units helpers.
- Updated camera defaults schema and live JSON export/import panel.
- Removed bounding-box recentering logic and added orbit limits by scale.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 04-Feb-2026 - ValeVision3D v0.1.0 
### Total Engine Rebuild and New Features
- Switched to a new engine architecture.
  - Previously use Babylon.js for the 3D engine.
  - Now using Three.js for the 3D engine.
- Refactored the old codebase to be more modular and maintainable.
# ---------------------------------------------------------