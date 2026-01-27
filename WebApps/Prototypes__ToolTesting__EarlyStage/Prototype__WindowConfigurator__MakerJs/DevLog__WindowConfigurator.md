# Dev Log - Window Configurator

===========================================================
## 27-Jan-2026 - Version 0.5.1
- **CAD Layer Naming Convention Refactor - Complete Implementation**
  - Implemented standardized CAD layer naming convention: `95_0X__WindowGen__*`
  - Created new layer name constants block replacing single `DIM_LAYER` constant:
    - `LAYER_DEFAULT` = `'95_01__WindowGen__Default__Layer0'` (Default geometry layer)
    - `LAYER_CASEMENTS` = `'95_02__WindowGen__CasementLines'` (Casement lines layer)
    - `LAYER_GLAZEBARS` = `'95_03__WindowGen__GlazeBars'` (Glaze bars layer)
    - `LAYER_LEADLINES` = `'95_04__WindowGen__LeadLines'` (Lead lines layer)
    - `LAYER_DIMENSIONS` = `'95_05__WindowGen__Dimensions'` (Dimension annotations layer)
  - Updated all layer assignments throughout codebase to use constants instead of hardcoded strings
  - Assigned `LAYER_GLAZEBARS` to both horizontal (`hBar_${h}`) and vertical (`vBar_${v}`) glaze bar models in `createFrameworkGlazeBars__WithinOpenings()` function
  - Updated viewport `layerOptions` to use `LAYER_DIMENSIONS` constant
  - Updated DXF export `layerOptions` with all five layers and explicit color assignments:
    - `LAYER_DEFAULT` - Color 7 (White)
    - `LAYER_CASEMENTS` - Color 3 (Green)
    - `LAYER_GLAZEBARS` - Color 4 (Cyan)
    - `LAYER_LEADLINES` - Color 8 (Gray)
    - `LAYER_DIMENSIONS` - Color 1 (Red)
  - Created `assignDefaultLayerToModel()` helper function to assign default layer to unlayered geometry at export time
  - Fixed layer inheritance bug: Updated `assignDefaultLayerToModel()` to respect parent layer inheritance, preventing nested models from overriding parent layers (fixes casement lines layer assignment)
  - Updated all SVG styling layer detection (`pathId.includes()`, `parentId.includes()`, `groupId.includes()`) to use layer constants
  - Updated code comments to reflect new layer names and numbering
  - Ensured consistent use of layer constants throughout codebase for good script discipline
===========================================================

===========================================================
## 27-Jan-2026 - Version 0.5.0
- **Lead Lines Feature - Complete Implementation**
  - Added Lead Lines configuration section to SECONDARY_CONFIG with toggle and three sliders (V Panel Divisions, H Panel Divisions, Thickness)
  - Added four getter functions: `getShowLeadLines()`, `getLeadLinesVDivisions()`, `getLeadLinesHDivisions()`, `getLeadLinesThickness()`
  - Built Lead Lines control panel with space-efficient two-column compact layout
  - Created complete Lead Lines CAD generation region with:
    - Main function `createLeadLines__WithinAllOpenings()` that iterates through all window openings
    - Helper function `calculatePaneBoundaries()` for calculating glass pane boundaries
    - Centerline mode function `createLeadLinesCenterlines__SinglePane()` for thickness = 0mm (single centerlines)
    - Offset mode function `createLeadLinesOffset__SinglePane()` for thickness > 0mm (paired offset lines)
  - Integrated lead lines generation into model pipeline (step 3.5 in `generateWindow()`)
  - Added `STROKE_WIDTH_LEADLINES` constant for thin lead line stroke width
  - Updated `applyLayerStyles()` function to apply thin stroke to leadLines layer
  - Added `leadLines` layer to DXF export options with gray color (AutoCAD color code 8)
- **UI Improvements**
  - Removed pink/purple highlighting border and background from Lead Lines panel (was markup-only)
  - Rearranged Lead Lines panel to compact two-column layout:
    - Left column: Lead Lines toggle + Thickness slider
    - Right column: V Panel Divisions + H Panel Divisions sliders
- **HTML Structure Changes**
  - Removed `<h1>Window Configurator</h1>` element from body
===========================================================