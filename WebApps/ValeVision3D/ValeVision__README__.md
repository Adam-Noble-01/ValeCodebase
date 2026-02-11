# ValeVision3D

## Overview

FILL THIS OUT LATER

---

## Architecture

FILL THIS OUT LATER

# -----------------------------------------------------------------------------

## Image Export — Enhance Whitecard Post-Process Effects

The "Enhance Whitecard" toggle in the Export Image panel applies a post-process pipeline to exported images. Post-processing runs **only at export time** on the rendered canvas; the live viewport pipeline is unchanged.

### Flow

1. Three.js renders at target resolution (viewport or custom).
2. Canvas is copied to an offscreen canvas.
3. Pipeline reads `ImageExport__PostProcessEffects` config, sorts effects by `Order`.
4. Effects applied in sequence → final canvas → PNG download.

### Methods Employed

**Levels** — Pixel-level tonal remapping (black point, white point, gamma). Pixels above the white point (e.g. 230) are clamped to pure white; darker values remapped linearly. Removes light grey shading from faces and background.

**High Pass Sharpen** — Blurred copy is subtracted from original; result centered at grey (128) and composited with Overlay blend. Sharpens edges (black lines) without amplifying noise. Uses Canvas 2D `filter: blur()` for GPU blur.

**Pipeline** — Config-driven orchestrator: sorts effects by `Order`, calls each enabled effect in turn. Each effect is a standalone module; pipeline imports and invokes them.

### Key Modules

| Module | Purpose |
| :----- | :------ |
| `Na__ImageExport__PostProcessEffects__Levels.js` | Levels adjustment via ImageData |
| `Na__ImageExport__PostProcessEffects__HighPassSharpen.js` | High pass + overlay blend |
| `Na__ImageExport__PostProcessEffects__Pipeline.js` | Config-driven effect orchestration |
| `Na__UiFeature__ImageExport__Controls.js` | Export UI, enhance toggle, pipeline call |
| `Na__AppConfig__Main.json` | Post-process config (`ImageExport__PostProcessEffects`) |

### Config

Effect order and parameters are defined in `Na__AppConfig__Main.json` under `ImageExport__PostProcessEffects`. Effects are ordered by `Order` (1, 2, …). The "Enhance Whitecard" toggle controls whether the pipeline runs (default: on).

# -----------------------------------------------------------------------------
## Image Export "Safe Frame" Overlay & Rule Of Thirds Grid Overlay
### "Safe Frame" Overlay
- When the image export menu it opened it will overlay a "Safe Frame" over the 3D model viewport.
  - This is a transparent grey overlay each side of the viewport.
  - It is tied to reflect the selected aspect ratio of the viewport.
  - When the aspect ratio is changed the safe frame will be updated to reflect the new aspect ratio.
  - The overlay hides again when the image export menu is closed.
  - This allows for quick visual reference of the viewport aspect ratio and the safe frame before exporting the image.
  - This makes it obvious what is in the shot across different screen widths.

### Rule Of Thirds Grid Overlay
- When the image export menu it opened it will overlay a Rule Of Thirds Grid on the image.
  - This is a transparent grid of lines that divides the space within the safe frame into 9 equal parts.
    - It is tied to reflect the selected aspect ratio of the viewport.
  - When the aspect ratio is changed the rule of thirds grid will be updated to reflect the new aspect ratio.
  - The overlay hides again when the image export menu is closed.
  - This allows for quick visual reference of the viewport aspect ratio and the rule of thirds grid before exporting the image.
  - This makes it obvious what is in the shot across different screen widths.
  - Allows for proper composition of the image by placing the subject of interest on the rule of thirds grid lines.

# -----------------------------------------------------------------------------
## Page Layout View System
`src__PageLayoutSystem` This directory contains the code for the layout view system.

- This system is used to display the layout of the 3D model in a 2D view.
- It creates a viewport similar to the viewport system used in SketchUp/Layout.
- It loads `src__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png` as the title block for the layout view. 
  - This is a PNG of a A3 Drawing which should be position at the very back under the Image Export viewport.

### "Viewport" 
- The viewport is actually a rendered image of the 3D model in the Image Export viewport.
- The image should be rendered as per the render settings in the Image Export viewport menu options.
- A new button should be added under Export Now called "Layout View" which will open the layout view system.

### User Interface & Experience
- User configures the image settings in the Image Export menu that already exists.
- The user clicks the "Layout View" button to open the layout view system.
- The Layout system should open a new tab in the browser with the layout view.
- The layout is scaled to an A3 Document and has 2D Zoom and panning controlls.
- The 2D Canvas loads `src__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png` as a locked background layer.
- The image created by the image export feature is loaded as a foreground layer above the fixed background title block layer.
- The user can then position the image within the A3 Document by dragging it around.
- The user can resize and rescale the image to fit the A3 Document by dragging the edges of the image.
- Final after the user is happy with the layout they can click the "Export Full Layout" button to export the layout as a PDF file.
  - The PDF is saved to exact A3 Scale.
  -The Export Full feature exports the whole layout (Title Block and Image) as a single flattened PDF file.
- Alternatively the user can click the "Export Image Only" button to export only the image without the title block.
  - It still exports the image at the exact A3 Scale.
  - It exports in the same position as the image in the layout view onto the A3 Document.
  - It does not export the title block.
- The user can click the "Close" button to close the layout view system.

### Files
`src__PageLayoutSystem/Na__PageLayoutSystem__Stylesheet__.css`
`src__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`
`src__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js`
`src__PageLayoutSystem/Na__PageLayoutSystem__CanvasRenderPipeline__.js` 
`src__PageLayoutSystem/Na__PageLayoutSystem__2dNavigationControls__.js` 
`src__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js` 
`src__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js`
`src__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js`


# -----------------------------------------------------------------------------