# 86__Export__StillRender

**80-89 · Workspace, project and export** · real code since v0.5.0

The final high-resolution still.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__Export__Png__.mjs` - Export a still: the sheet, or the buffer on view, at a scale or a print resolution (`dpi:300`, `dpi:600`), as a PNG carrying its print size or a true-size PDF (`pdf:300`, through 87); the pen calibration sheet (`calibration:pdf:300` ...)

**Print size and the pens** (v0.8.0, written fresh)

- `PainterlyNPR__Export__PrintSize__.mjs` (164 lines) - a PNG's pHYs (pixels per metre, both axes) and a comment naming the sheet and the dpi; the browser download every export ends in.
- `PainterlyNPR__Export__PenCalibration__.mjs` (487 lines) - the technical pen calibration sheet, drawn by the engine's own stroke synthesis and ink pass into targets of its own at a print resolution: for each pen a 100 mm horizontal, a 25 mm vertical, diagonals at 30, 45 and 60 degrees, a circle, a cross, a saltire and a small window, labelled in the lettering pen (38); a 100 mm scale ticked every millimetre, a 10 mm square, a 100 mm upright and corner marks in the base pen. `Measure` checks the ribbon geometry strictly and the raster's coverage to 5 microns; `Export` gives a true-size PDF or a PNG with its print size, and the measured widths on the status line.
- `Na__PenCalibration__Config.json` - the sheet's layout (centred on the real sheet), its ink and the tolerances.
- The sheet's pixels are `SheetPixels` (21): the sheet's own proportion at the resolution, so the density is the pixels' own - 300 dpi on 300 x 200 mm is 3543 x 2362 at 11.81 px/mm; A3 4961 x 3508.

**Belongs here**

- Off-screen output with print dimensions and clear DPI controls; PNG first. Since v0.8.0 every export says its print size (pHYs, the comment, the PDF's page). The file is exact; a printer, its paper and its ink can still spread a line.
- Tiled rendering with overlap and guard bands for blur, bleed and large-radius pigment work; seam-free tiles from global seeds and page coordinates.

**Takes** a composed sheet. **Gives** a PNG in `23__Generated__RenderedStills`.

**Manifest:** §12 Print Output.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Export* - PNG at 1x and 2x, untiled.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
