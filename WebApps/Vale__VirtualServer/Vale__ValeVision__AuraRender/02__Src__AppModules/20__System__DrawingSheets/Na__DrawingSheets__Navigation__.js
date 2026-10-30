// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - NAVIGATION
// =============================================================================
//
// FILE       : Na__DrawingSheets__Navigation__.js
// NAMESPACE  : Na__SheetNav
// MODULE     : Drawing Sheets - Navigation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The maths that moves the sheet: zoom about a point, zoom to a
//              level, fit, and pan
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - This module is the only place that decides where the sheet ends up. It
//   knows nothing about buttons, keys or fingers: the PC and touchscreen
//   control modules read the key map, work out what the user meant, and call
//   in here, so a binding changes in a JSON file without any movement code
//   being touched.
// - Zoom keeps the paper point under a client position exactly where it was,
//   which is what makes zooming into a corner of a sheet feel controlled. The
//   sheet is an SVG sized to the zoom inside a scrolling desk, so panning is
//   nothing more than moving the desk's scroll position.
// - Fit computes the zoom that shows the whole paper inside the desk with a
//   padding, then centres it. Each sheet is fitted the first time it is shown.
// - A WHEEL OR PINCH ZOOM SETTLES: the selection handles, drawn at a size on
//   screen, are drawn again once the zoom has rested (ZoomSettleMs).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D (51__System__LayoutEditor/10__Core__SheetSurface/
//                   Na__LayoutEditor__Navigation__.js 1.3.0)
// - Ported on     : 30-Oct-2026 for AURA 0.1.3 - whole, to AURA's sheet surface
// - Parity        : diverged (the surface underneath)
// - Divergences   :
//   - AURA's sheet is an SVG whose width and height carry the zoom, not a
//     transform-scaled paper in a scaler: ZoomAbout reads where the paper
//     landed after the resize instead of the scaler's offsets.
//   - One ceiling (ZoomMax, from the key map file): AURA has no authoring gate.
//   - The settle only redraws the selection overlay; the Layout Editor's
//     held-layer, Draft and Measurements box work have no AURA counterpart.
//   - FitOnce added: AURA fits a sheet the first time it is shown.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.1.3)
// - Initial port. The zoom, fit and pan that were the surface's own moved here.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__SheetKeys__GetNavigationSetup } from './Na__DrawingSheets__KeyMap__.js';
    import {
        Na__Surface__GetZoom,
        Na__Surface__SetZoom,
        Na__Surface__Elements,
        Na__Surface__ClientToMm,
        Na__Surface__PxPerMm,
        Na__Surface__RedrawOverlay
    } from './Na__DrawingSheets__Surface__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__SheetNav__State = {
        fitted : {},                             // <-- sheet id -> true once fitted on first show
        settle : 0                               // <-- The timer that redraws the handles once a zoom rests
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Zoom Maths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clamp a Zoom to the Configured Range
    // ------------------------------------------------------------
    function Na__SheetNav__Clamp(zoom) {
        const setup = Na__SheetKeys__GetNavigationSetup();
        return Math.min(setup.zoomMax, Math.max(setup.zoomMin, zoom));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Redraw What Follows the Zoom: at once, or once a gesture rests
    // ------------------------------------------------------------
    function Na__SheetNav__Settle(gesture) {
        const S = Na__SheetNav__State;
        if (S.settle) { clearTimeout(S.settle); S.settle = 0; }
        if (gesture !== true) { Na__Surface__RedrawOverlay(); return; }
        S.settle = setTimeout(() => { S.settle = 0; Na__Surface__RedrawOverlay(); }, Na__SheetKeys__GetNavigationSetup().zoomSettleMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom So the Paper Point Under a Client Position Stays Put
    // ------------------------------------------------------------
    // gesture: true for a wheel or pinch step, which settles once it rests.
    // ------------------------------------------------------------
    function Na__SheetNav__ZoomAbout(newZoom, clientX, clientY, gesture) {
        const els = Na__Surface__Elements();
        if (!els.desk || !els.svg || !els.solve) return;
        const before = Na__Surface__GetZoom();
        const after  = Na__SheetNav__Clamp(newZoom);
        if (after === before) return;
        const mm = Na__Surface__ClientToMm(clientX, clientY);                    // <-- The paper millimetre under the pointer
        Na__Surface__SetZoom(after);
        const paper = els.svg.getBoundingClientRect();                           // <-- Where the paper landed at its new size
        const k = Na__Surface__PxPerMm();
        els.desk.scrollLeft += (paper.left + mm.X * k) - clientX;
        els.desk.scrollTop  += (paper.top + mm.Y * k) - clientY;
        Na__SheetNav__Settle(gesture);
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom About the Centre of the Desk
    // ------------------------------------------------------------
    function Na__SheetNav__ZoomTo(newZoom) {
        const els = Na__Surface__Elements();
        if (!els.desk) return;
        const rect = els.desk.getBoundingClientRect();
        Na__SheetNav__ZoomAbout(newZoom, rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    }

    function Na__SheetNav__ZoomBy(factor) {
        Na__SheetNav__ZoomTo(Na__Surface__GetZoom() * factor);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit the Whole Paper Into the Desk
    // ------------------------------------------------------------
    function Na__SheetNav__Fit() {
        const els = Na__Surface__Elements();
        if (!els.desk || !els.solve) return;
        const setup  = Na__SheetKeys__GetNavigationSetup();
        const ppm    = Na__Surface__PxPerMm() / Na__Surface__GetZoom();          // <-- Screen pixels to the millimetre at zoom 1
        const availW = els.desk.clientWidth  - (setup.fitPaddingPx * 2);
        const availH = els.desk.clientHeight - (setup.fitPaddingPx * 2);
        if (availW <= 0 || availH <= 0) return;
        Na__Surface__SetZoom(Na__SheetNav__Clamp(Math.min(availW / (els.solve.Paper.WidthMm * ppm), availH / (els.solve.Paper.HeightMm * ppm))));
        els.desk.scrollLeft = (els.desk.scrollWidth - els.desk.clientWidth) / 2;
        els.desk.scrollTop  = (els.desk.scrollHeight - els.desk.clientHeight) / 2;
        Na__SheetNav__Settle(false);
    }

    function Na__SheetNav__FitOnce(sheetId) {
        if (!sheetId || Na__SheetNav__State.fitted[sheetId]) return;
        Na__SheetNav__State.fitted[sheetId] = true;
        Na__SheetNav__Fit();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pan
// -----------------------------------------------------------------------------

    // FUNCTION | Move the View by a Number of Screen Pixels
    // ------------------------------------------------------------
    // Positive values move the view right and down, which is the same as the
    // content travelling left and up. A drag therefore passes the inverse of
    // the pointer delta, so the sheet stays under the finger or the cursor.
    // The browser clamps the scroll position, so an over-pan simply stops at
    // the edge of the desk.
    // ------------------------------------------------------------
    function Na__SheetNav__PanBy(dxPx, dyPx) {
        const els = Na__Surface__Elements();
        if (!els.desk) return;
        if (Number.isFinite(dxPx) && dxPx !== 0) els.desk.scrollLeft += dxPx;
        if (Number.isFinite(dyPx) && dyPx !== 0) els.desk.scrollTop  += dyPx;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SheetNav__ZoomAbout,
        Na__SheetNav__ZoomTo,
        Na__SheetNav__ZoomBy,
        Na__SheetNav__Fit,
        Na__SheetNav__FitOnce,
        Na__SheetNav__PanBy
    };

// endregion -------------------------------------------------------------------
