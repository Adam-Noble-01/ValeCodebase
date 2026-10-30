# 87__Export__PassesAndPdf

**80-89 · Workspace, project and export** · real code since v0.8.0

Later outputs, after the PNG.

**Files** (v0.8.0, written fresh)

- `PainterlyNPR__Export__Pdf__.mjs` - `PainterlyNPR__Export__Pdf(rgb, width, height, widthMm, heightMm, info)`: a one-page PDF whose page is the sheet at its true size (300 x 200 mm is 850.39 x 566.93 pt; A3 1190.55 x 841.89), the rendered sheet filling it as a lossless RGB image (FlateDecode, by the browser's CompressionStream), with PrintScaling /None so a viewer prints it at actual size. Used by the Export section's true-size PDF and the pen calibration sheet (86).

**Belongs here**

- Separate diagnostic and production passes; high-bit-depth formats; hybrid vector-plus-raster PDF.
- A fully editable vector watercolour is not an early requirement.

**Why a PDF** - a PNG carries its resolution (pHYs, 86) and image tools read it, but print dialogs often fit to the page. A PDF page has a size, and printed at 100% (actual size) every millimetre on the sheet is a millimetre on paper. The file is exact; a printer, its paper and its ink can still spread a line.

**Takes** a composed sheet. **Gives** files in `24__Generated__ExportedPasses` (downloads, for now).

**Manifest:** §12 Print Output.
