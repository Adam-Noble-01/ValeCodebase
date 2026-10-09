// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - COMPOSITION GUIDE
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__CompositionGuide__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Composition Guide
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A grid of thirds and a centre cross over the drawing frame, whose
//              margins drag in or out, for lining a picture up on the sheet
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE GUIDE IS A RECTANGLE MEASURED FROM THE DRAWING FRAME (the space left of
//   the title block, state.drawingArea): four margins in mm, in from each edge;
//   a negative margin is out past it, as far as the edge of the sheet. Margins
//   of zero are the frame itself.
// - Inside it: the frame's outline, a 3 x 3 grid (Divisions in the config) and
//   a cross (an X) at its centre.
// - DRAGGING (Adam, 09-Oct-2026): each edge on its own, and a corner moves its two
//   edges. Shift, or Move Opposite Edges Together in the menu, moves the
//   opposite edge the same amount, so the guide stays centred where it was. A
//   guide never gets smaller than MinSizeMm and never leaves the sheet.
// - Grips sit on each edge's middle and on the corners. Away from the picture
//   the whole edge line takes the pointer; over the picture only the grips do,
//   so the picture underneath can still be dragged. Locked, it takes nothing.
// - A visual aid only: it is never printed and nothing snaps to it (Adam's
//   call). It is saved with the layout.
// - Pure logic and drawing; the menu (Na__PageLayoutSystem__CompositionGuide__Controls__)
//   and the PC and touch controls call it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Appearance and Limits
    // ------------------------------------------------------------
    const Na__PageLayout__Guide__FALLBACK = Object.freeze({
        divisions        : 3,                                               // <-- A grid of thirds
        lineColor        : 'rgba(214, 40, 57, 0.85)',
        lineWidthPx      : 1,
        frameLineWidthPx : 1.5,
        crossSizeMm      : 16,
        crossLineWidthPx : 1.5,
        gripSizePx       : 9,
        gripFill         : '#d62839',
        gripStroke       : '#ffffff',
        gripHitRadiusPx  : 12,
        touchHitRadiusPx : 22,
        minSizeMm        : 40,
        labelFont        : "600 11px 'Open Sans', sans-serif",
        labelText        : '#ffffff',
        labelFill        : 'rgba(214, 40, 57, 0.92)'
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Handles (prefixed so they never clash with the picture's)
    // ------------------------------------------------------------
    const Na__PageLayout__Guide__HANDLE_PREFIX = 'guide-';
    const Na__PageLayout__Guide__SIDES         = Object.freeze(['top', 'right', 'bottom', 'left']);
    const Na__PageLayout__Guide__CURSORS       = Object.freeze({
        'guide-top'          : 'na-layout-canvas--resize-n',
        'guide-bottom'       : 'na-layout-canvas--resize-s',
        'guide-left'         : 'na-layout-canvas--resize-w',
        'guide-right'        : 'na-layout-canvas--resize-e',
        'guide-top-left'     : 'na-layout-canvas--resize-nw',
        'guide-top-right'    : 'na-layout-canvas--resize-ne',
        'guide-bottom-left'  : 'na-layout-canvas--resize-sw',
        'guide-bottom-right' : 'na-layout-canvas--resize-se'
    });
    const Na__PageLayout__Guide__SIDE_LABELS   = Object.freeze({ top : 'Top', right : 'Right', bottom : 'Bottom', left : 'Left' });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Guide's Config From State (Fallbacks for Anything Missing)
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__ResolveConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__CompositionGuide__Config'] : null;
        const P       = 'PageLayout__CompositionGuide__Config__';
        const F       = Na__PageLayout__Guide__FALLBACK;
        const num     = (key, fallback) => (section && typeof section[P + key] === 'number' && Number.isFinite(section[P + key])) ? section[P + key] : fallback;
        const str     = (key, fallback) => (section && typeof section[P + key] === 'string') ? section[P + key] : fallback;

        return {
            divisions        : Math.max(2, Math.round(num('Divisions', F.divisions))),
            lineColor        : str('LineColor', F.lineColor),
            lineWidthPx      : num('LineWidthPx', F.lineWidthPx),
            frameLineWidthPx : num('FrameLineWidthPx', F.frameLineWidthPx),
            crossSizeMm      : num('CentreCrossSizeMm', F.crossSizeMm),
            crossLineWidthPx : num('CentreCrossLineWidthPx', F.crossLineWidthPx),
            gripSizePx       : num('GripSizePx', F.gripSizePx),
            gripFill         : str('GripFillColor', F.gripFill),
            gripStroke       : str('GripStrokeColor', F.gripStroke),
            gripHitRadiusPx  : num('GripHitRadiusPx', F.gripHitRadiusPx),
            touchHitRadiusPx : num('TouchGripHitRadiusPx', F.touchHitRadiusPx),
            minSizeMm        : Math.max(1, num('MinSizeMm', F.minSizeMm)),
            labelFont        : str('LabelFont', F.labelFont),
            labelText        : str('LabelTextColor', F.labelText),
            labelFill        : str('LabelFillColor', F.labelFill)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State and Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | A Guide Switched Off, on the Drawing Frame
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__CreateState() {
        return {
            visible    : false,                                             // <-- Shown on the sheet
            locked     : false,                                             // <-- Takes no pointer when locked
            pairEdges  : false,                                             // <-- Opposite edges move together (as Shift does)
            margins    : { top : 0, right : 0, bottom : 0, left : 0 },      // <-- mm in from the drawing frame (negative: out past it)
            dragHandle : null,                                              // <-- The handle being dragged (its margins are labelled)
            dragPaired : false                                              // <-- That drag moves the opposite edges too (labelled as well)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Far Out Each Margin May Go (to the Sheet's Edge), and the Spans
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Limits(state) {
        const area = state.drawingArea;
        return {
            outTop    : -area.y,
            outLeft   : -area.x,
            outBottom : -(state.a3.heightMm - (area.y + area.height)),
            outRight  : -(state.a3.widthMm  - (area.x + area.width)),
            spanX     : area.width,
            spanY     : area.height
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Guide's Rectangle on the Sheet, mm
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Rect(state) {
        const area = state.drawingArea;
        const m    = state.guide.margins;
        return {
            x      : area.x + m.left,
            y      : area.y + m.top,
            width  : area.width  - m.left - m.right,
            height : area.height - m.top  - m.bottom
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp an Inward Move of One Edge (and Its Opposite, When Paired)
    // ------------------------------------------------------------
    // delta: mm the dragged edge moves inward (negative: outward).
    // A paired move takes the opposite edge inward by the same amount, so both
    // limits apply to the one delta, and the size shrinks by twice it.
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__ClampInward(delta, startSide, startOpposite, outSide, outOpposite, span, minSize, pair) {
        const lo = pair
            ? Math.max(outSide - startSide, outOpposite - startOpposite)
            : (outSide - startSide);
        const hi = pair
            ? (span - minSize - startSide - startOpposite) / 2
            : (span - minSize - startSide - startOpposite);
        return Math.min(Math.max(delta, lo), Math.max(lo, hi));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Changing the Margins
// -----------------------------------------------------------------------------

    // FUNCTION | Drag a Handle by dx, dy mm From Where the Drag Started
    // ------------------------------------------------------------
    // handle: 'guide-top', 'guide-right', ..., 'guide-top-left', ...
    // startMargins: the margins when the drag began. pair: Shift or the menu toggle.
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Drag(state, handle, startMargins, dxMm, dyMm, pair) {
        const cfg  = Na__PageLayout__Guide__ResolveConfig(state);
        const lim  = Na__PageLayout__Guide__Limits(state);
        const s    = startMargins;
        const m    = { ...s };
        const name = String(handle || '').replace(Na__PageLayout__Guide__HANDLE_PREFIX, '');

        if (name.indexOf('left') >= 0) {
            const d = Na__PageLayout__Guide__ClampInward(dxMm, s.left, s.right, lim.outLeft, lim.outRight, lim.spanX, cfg.minSizeMm, pair);
            m.left = s.left + d;
            if (pair) m.right = s.right + d;
        } else if (name.indexOf('right') >= 0) {
            const d = Na__PageLayout__Guide__ClampInward(-dxMm, s.right, s.left, lim.outRight, lim.outLeft, lim.spanX, cfg.minSizeMm, pair);
            m.right = s.right + d;
            if (pair) m.left = s.left + d;
        }

        if (name.indexOf('top') >= 0) {
            const d = Na__PageLayout__Guide__ClampInward(dyMm, s.top, s.bottom, lim.outTop, lim.outBottom, lim.spanY, cfg.minSizeMm, pair);
            m.top = s.top + d;
            if (pair) m.bottom = s.bottom + d;
        } else if (name.indexOf('bottom') >= 0) {
            const d = Na__PageLayout__Guide__ClampInward(-dyMm, s.bottom, s.top, lim.outBottom, lim.outTop, lim.spanY, cfg.minSizeMm, pair);
            m.bottom = s.bottom + d;
            if (pair) m.top = s.top + d;
        }

        state.guide.margins = m;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One Margin to a Value (Typed in the Menu); Paired, Its Opposite Too
    // ------------------------------------------------------------
    // Returns the margins as applied (a value past a limit is held at it).
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__SetMargin(state, side, valueMm, pair) {
        if (Na__PageLayout__Guide__SIDES.indexOf(side) < 0 || !Number.isFinite(valueMm)) return state.guide.margins;

        const cfg      = Na__PageLayout__Guide__ResolveConfig(state);
        const lim      = Na__PageLayout__Guide__Limits(state);
        const m        = { ...state.guide.margins };
        const opposite = { top : 'bottom', bottom : 'top', left : 'right', right : 'left' }[side];
        const span     = (side === 'top' || side === 'bottom') ? lim.spanY : lim.spanX;
        const outOf    = (name) => lim['out' + name.charAt(0).toUpperCase() + name.slice(1)];

        if (pair) {
            const lo = Math.max(outOf(side), outOf(opposite));
            const hi = (span - cfg.minSizeMm) / 2;
            const v  = Math.min(Math.max(valueMm, lo), Math.max(lo, hi));
            m[side]     = v;
            m[opposite] = v;
        } else {
            const lo = outOf(side);
            const hi = span - cfg.minSizeMm - m[opposite];
            m[side]  = Math.min(Math.max(valueMm, lo), Math.max(lo, hi));
        }

        state.guide.margins = m;
        return m;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Guide Back on the Drawing Frame
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Reset(state) {
        state.guide.margins = { top : 0, right : 0, bottom : 0, left : 0 };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer Hit-Testing
// -----------------------------------------------------------------------------

    // FUNCTION | Is This One of the Guide's Handles?
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__IsHandle(handle) {
        return typeof handle === 'string' && handle.indexOf(Na__PageLayout__Guide__HANDLE_PREFIX) === 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cursor Class for a Guide Handle ('' for None)
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__CursorFor(handle) {
        return Na__PageLayout__Guide__CURSORS[handle] || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Guide Handle Is Under a Screen Point (Canvas CSS Pixels), or Null
    // ------------------------------------------------------------
    // radiusPx: the grip hit radius (mouse or finger). gripsOnly: over the
    // picture, only the grips answer, so the picture can still be dragged.
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__HitTest(screenX, screenY, state, radiusPx, gripsOnly) {
        const guide = state && state.guide;
        if (!guide || !guide.visible || guide.locked) return null;

        const ct = state.canvasTransform;
        const r  = Na__PageLayout__Guide__Rect(state);
        const L  = ct.offsetX + r.x * ct.zoom;
        const T  = ct.offsetY + r.y * ct.zoom;
        const R  = L + r.width  * ct.zoom;
        const B  = T + r.height * ct.zoom;
        const cx = (L + R) / 2;
        const cy = (T + B) / 2;
        const near = (ax, ay) => Math.abs(screenX - ax) <= radiusPx && Math.abs(screenY - ay) <= radiusPx;

        // Corners, then the edge grips
        // ------------------------------------------------------------
        if (near(L, T)) return 'guide-top-left';
        if (near(R, T)) return 'guide-top-right';
        if (near(L, B)) return 'guide-bottom-left';
        if (near(R, B)) return 'guide-bottom-right';
        if (near(cx, T)) return 'guide-top';
        if (near(cx, B)) return 'guide-bottom';
        if (near(L, cy)) return 'guide-left';
        if (near(R, cy)) return 'guide-right';
        if (gripsOnly) return null;

        // Anywhere along an edge line (a narrower band than a grip)
        // ------------------------------------------------------------
        const band = Math.max(4, radiusPx / 2);
        const inX  = screenX >= L - band && screenX <= R + band;
        const inY  = screenY >= T - band && screenY <= B + band;
        if (inX && Math.abs(screenY - T) <= band) return 'guide-top';
        if (inX && Math.abs(screenY - B) <= band) return 'guide-bottom';
        if (inY && Math.abs(screenX - L) <= band) return 'guide-left';
        if (inY && Math.abs(screenX - R) <= band) return 'guide-right';
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Margin's Value Beside Its Edge While It Is Dragged
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__DrawLabel(ctx, text, x, y, cfg) {
        ctx.font         = cfg.labelFont;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const w = ctx.measureText(text).width + 12;
        const h = 18;
        ctx.fillStyle = cfg.labelFill;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = cfg.labelText;
        ctx.fillText(text, x, y + 0.5);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Guide (ctx in Canvas CSS Pixels, Origin at the Sheet's Top Left)
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Draw(ctx, state, zoom) {
        const guide = state && state.guide;
        if (!guide || !guide.visible) return;

        const cfg = Na__PageLayout__Guide__ResolveConfig(state);
        const r   = Na__PageLayout__Guide__Rect(state);
        const x   = r.x * zoom;
        const y   = r.y * zoom;
        const w   = r.width  * zoom;
        const h   = r.height * zoom;
        const cx  = x + w / 2;
        const cy  = y + h / 2;

        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = cfg.lineColor;

        // OUTLINE | The guide's own frame
        // ------------------------------------------------------------
        ctx.lineWidth = cfg.frameLineWidthPx;
        ctx.strokeRect(x, y, w, h);

        // GRID | Divisions - 1 lines each way
        // ------------------------------------------------------------
        ctx.lineWidth = cfg.lineWidthPx;
        ctx.beginPath();
        for (let i = 1; i < cfg.divisions; i++) {
            const gx = x + (w * i) / cfg.divisions;
            const gy = y + (h * i) / cfg.divisions;
            ctx.moveTo(gx, y);
            ctx.lineTo(gx, y + h);
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
        }
        ctx.stroke();

        // CENTRE CROSS | An X at the guide's centre, sized in mm (it scales with the sheet)
        // ------------------------------------------------------------
        const half = (cfg.crossSizeMm * zoom) / 2;
        ctx.lineWidth = cfg.crossLineWidthPx;
        ctx.beginPath();
        ctx.moveTo(cx - half, cy - half);
        ctx.lineTo(cx + half, cy + half);
        ctx.moveTo(cx + half, cy - half);
        ctx.lineTo(cx - half, cy + half);
        ctx.stroke();

        // GRIPS | Edge middles (round) and corners (square), unless locked
        // ------------------------------------------------------------
        if (!guide.locked) {
            const g = cfg.gripSizePx / 2;
            ctx.fillStyle   = cfg.gripFill;
            ctx.strokeStyle = cfg.gripStroke;
            ctx.lineWidth   = 1.5;
            [[cx, y], [cx, y + h], [x, cy], [x + w, cy]].forEach(([px, py]) => {
                ctx.beginPath();
                ctx.arc(px, py, g, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
            [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => {
                ctx.fillRect(px - g, py - g, g * 2, g * 2);
                ctx.strokeRect(px - g, py - g, g * 2, g * 2);
            });
        }

        // LABELS | The dragged margins, in mm, just inside their edges
        // ------------------------------------------------------------
        const dragged = String(guide.dragHandle || '').replace(Na__PageLayout__Guide__HANDLE_PREFIX, '');
        if (dragged) {
            const m        = guide.margins;
            const label    = (side) => `${Na__PageLayout__Guide__SIDE_LABELS[side]} ${m[side].toFixed(1)} mm`;
            const opposite = { top : 'bottom', bottom : 'top', left : 'right', right : 'left' };
            const named    = Na__PageLayout__Guide__SIDES.filter((side) => dragged.indexOf(side) >= 0);
            const sides    = guide.dragPaired ? Array.from(new Set(named.concat(named.map((side) => opposite[side])))) : named;
            sides.forEach((side) => {
                if (side === 'top')    Na__PageLayout__Guide__DrawLabel(ctx, label('top'),    cx, y + 16, cfg);
                if (side === 'bottom') Na__PageLayout__Guide__DrawLabel(ctx, label('bottom'), cx, y + h - 16, cfg);
                if (side === 'left')   Na__PageLayout__Guide__DrawLabel(ctx, label('left'),   x + 52, cy, cfg);
                if (side === 'right')  Na__PageLayout__Guide__DrawLabel(ctx, label('right'),  x + w - 52, cy, cfg);
            });
        }

        ctx.restore();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saving and Opening
// -----------------------------------------------------------------------------

    // FUNCTION | The Guide as a Saved Layout Stores It
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Serialize(state) {
        const g = state.guide;
        const r = (v) => Math.round(v * 100) / 100;
        return {
            Guide__Visible       : g.visible === true,
            Guide__Locked        : g.locked === true,
            Guide__PairEdges     : g.pairEdges === true,
            Guide__MarginTopMm   : r(g.margins.top),
            Guide__MarginRightMm : r(g.margins.right),
            Guide__MarginBottomMm: r(g.margins.bottom),
            Guide__MarginLeftMm  : r(g.margins.left)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Saved Guide on the Page (Each Margin Held Within Its Limits)
    // ------------------------------------------------------------
    function Na__PageLayout__Guide__Apply(state, block) {
        const g = state.guide;
        Na__PageLayout__Guide__Reset(state);
        g.dragHandle = null;
        g.dragPaired = false;
        if (!block || typeof block !== 'object') {
            g.visible = false; g.locked = false; g.pairEdges = false;
            return;
        }
        g.visible   = block.Guide__Visible === true;
        g.locked    = block.Guide__Locked === true;
        g.pairEdges = block.Guide__PairEdges === true;
        [['top', 'Guide__MarginTopMm'], ['right', 'Guide__MarginRightMm'], ['bottom', 'Guide__MarginBottomMm'], ['left', 'Guide__MarginLeftMm']]
            .forEach(([side, key]) => {
                if (Number.isFinite(block[key])) Na__PageLayout__Guide__SetMargin(state, side, block[key], false);
            });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Composition Guide API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Guide__ResolveConfig,
        Na__PageLayout__Guide__CreateState,
        Na__PageLayout__Guide__Rect,
        Na__PageLayout__Guide__Drag,
        Na__PageLayout__Guide__SetMargin,
        Na__PageLayout__Guide__Reset,
        Na__PageLayout__Guide__IsHandle,
        Na__PageLayout__Guide__CursorFor,
        Na__PageLayout__Guide__HitTest,
        Na__PageLayout__Guide__Draw,
        Na__PageLayout__Guide__Serialize,
        Na__PageLayout__Guide__Apply
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
