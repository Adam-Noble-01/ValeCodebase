// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - PAPER AND LAYOUT
// =============================================================================
//
// FILE       : Na__DrawingSheets__Paper__.js
// NAMESPACE  : Na__Paper
// MODULE     : Drawing Sheets - Paper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Where everything sits on a sheet: the paper, the ruled border and
//              Vale's title column, for A1 to A4, landscape and portrait
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - VALE'S DRAWING PAGE (the RecConcept layouts of Feb-2026, the A3 one
//   ValeVision 3D's Create Drawing uses): a ruled border, and a title column
//   60 x 280.5 mm, the SAME physical size on A1, A2 and A3, standing at the
//   bottom right inside the border. In portrait the whole column turns 90
//   degrees clockwise and lies along the foot at the bottom left, its text
//   reading down the page, exactly as Vale's portrait layouts have it.
// - A4 is shorter than the column, so there (and only there) it is scaled to
//   fit the border's height (landscape) or width (portrait).
// - Millimetres from the paper's top left, x right, y down.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, measured on the A3 and A1 RecConcept layouts.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paper
// -----------------------------------------------------------------------------

    // FUNCTION | A Sheet's Paper in Millimetres, in Its Own Orientation
    // ------------------------------------------------------------
    // Sizes are listed landscape; portrait swaps them here, so a size is only
    // described once (the Layout Editor's rule).
    // ------------------------------------------------------------
    function Na__Paper__SizeMm(sheet) {
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const size = sizes[sheet.Sheet__PaperSize] || sizes[Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3')] || { WidthMm: 420, HeightMm: 297 };
        const long = Math.max(size.WidthMm, size.HeightMm), short = Math.min(size.WidthMm, size.HeightMm);
        return sheet.Sheet__Orientation === 'portrait' ? { WidthMm: short, HeightMm: long } : { WidthMm: long, HeightMm: short };
    }
    // ------------------------------------------------------------


    // FUNCTION | Solve a Sheet: paper, border, and the title column's place and turn
    // ------------------------------------------------------------
    // Title.Transform maps the column's own millimetres (0..60 across, 0..280.5
    // down, logo at the top) onto the sheet; Title.Rect is the space it takes,
    // square to the sheet, for keeping drawings clear of it.
    // ------------------------------------------------------------
    function Na__Paper__Solve(sheet) {
        const paper = Na__Paper__SizeMm(sheet);
        const portrait = sheet.Sheet__Orientation === 'portrait';
        const side = Na__AppConfig__Get('Sheet__BorderSideMm', 10.5);
        const end = Na__AppConfig__Get('Sheet__BorderEndMm', 8.25);
        const mx = portrait ? end : side, my = portrait ? side : end;           // <-- The paper turned: the long edges' margins swap with it
        const border = { X: mx, Y: my, W: paper.WidthMm - 2 * mx, H: paper.HeightMm - 2 * my };
        const cw = Na__AppConfig__Get('TitleBlock__ColumnWidthMm', 60);
        const ch = Na__AppConfig__Get('TitleBlock__ColumnHeightMm', 280.5);
        let title;
        if (!portrait) {
            const s = Math.min(1, border.H / ch);
            const x = border.X + border.W - cw * s, y = border.Y + border.H - ch * s;
            title = { Scale: s, Portrait: false, Transform: `translate(${x} ${y}) scale(${s})`, Rect: { X: x, Y: y, W: cw * s, H: ch * s } };
        } else {
            const s = Math.min(1, border.W / ch);
            const tx = border.X + ch * s, ty = border.Y + border.H - cw * s;
            title = { Scale: s, Portrait: true, Transform: `translate(${tx} ${ty}) rotate(90) scale(${s})`, Rect: { X: border.X, Y: ty, W: ch * s, H: cw * s } };
        }
        return { Paper: paper, Border: border, Title: title, ColumnWidthMm: cw, ColumnHeightMm: ch };
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep a Frame on the Paper (inside the border)
    // ------------------------------------------------------------
    function Na__Paper__ClampFrame(sheet, frame) {
        const b = Na__Paper__Solve(sheet).Border;
        const w = Math.min(frame.WidthMm, b.W), h = Math.min(frame.HeightMm, b.H);
        return {
            X        : Math.min(Math.max(frame.X, b.X), b.X + b.W - w),
            Y        : Math.min(Math.max(frame.Y, b.Y), b.Y + b.H - h),
            WidthMm  : w,
            HeightMm : h
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Paper__SizeMm,
        Na__Paper__Solve,
        Na__Paper__ClampFrame
    };

// endregion -------------------------------------------------------------------
