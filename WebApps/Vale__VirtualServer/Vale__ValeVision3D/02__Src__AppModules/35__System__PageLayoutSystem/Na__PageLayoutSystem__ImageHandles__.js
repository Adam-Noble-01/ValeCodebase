// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - IMAGE HANDLES (SCALE AND TRIM)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__ImageHandles__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Image Handles
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The picture's eight handles in the Drawing Editor: where they
//              sit, what is under the pointer, what a drag does, and how they
//              are drawn, so the mouse, touch and the screen always agree
// CREATED    : 11-Nov-2026
//
// DESCRIPTION:
// - TWO KINDS, TWO LOOKS (Adam, 11-Nov-2026: "larger, different shaped and
//   visually clearly describe scale drag points or clipping drag points"):
//   - SCALE, the four corners: a navy disc with a white diagonal double arrow.
//     Dragging one scales the whole picture, trims and all, about the opposite
//     visible corner, which stays where it is.
//   - TRIM, the four edge middles: a white tab with a navy arrow across the
//     edge. Dragging one moves that edge of the visible picture in or out; the
//     picture itself does not move or change size.
// - The handles sit on the VISIBLE picture (inside its trims), never on the
//   untrimmed one, so a trimmed edge's tab is on the edge you can see.
// - Pointing at a handle (mouse) enlarges it and labels it "Drag to scale" or
//   "Drag to trim"; while it is dragged the label gives the visible size, or
//   that side's trim, in mm. A trim drag also shows the trimmed-away picture
//   faintly, with its untrimmed outline, so you can see what you are cutting
//   and what comes back.
// - A trim tab is left out (and does not answer) when the visible picture is
//   too small on screen for it to sit clear of the corner discs: zoom in.
// - Sizes and colours: PageLayout__CanvasAppearance__Config (CSS pixels, the
//   same at every zoom).
// - A LEAF: no imports. state.imageHandleHover and state.imageHandleDrag (a
//   handle id or null) are set by the controls and read here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.0.0 (ValeVision3D v2.94.1)
// - Initial build: scale discs and trim tabs on the visible picture, hover and
//   drag labels, the trim ghost; one hit test and one drag for mouse and touch.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Handle Ids (the Controls Have Always Used These)
    // ------------------------------------------------------------
    const Na__PageLayout__Handles__SCALE = Object.freeze(['tl', 'tr', 'bl', 'br']);    // <-- Corners: scale
    const Na__PageLayout__Handles__TRIM  = Object.freeze(['tc', 'bc', 'lc', 'rc']);    // <-- Edge middles: trim
    const Na__PageLayout__Handles__BODY  = 'body';                                    // <-- The picture itself: move
    const Na__PageLayout__Handles__NONE  = 'none';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Which Way Each Corner Points (x and y, +1 Right or Down)
    // ------------------------------------------------------------
    const Na__PageLayout__Handles__CORNER_SIGNS = Object.freeze({
        tl : [-1, -1],
        tr : [ 1, -1],
        bl : [-1,  1],
        br : [ 1,  1]
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Cursors (the Classes Are in Styles__Main)
    // ------------------------------------------------------------
    const Na__PageLayout__Handles__CURSORS = Object.freeze({
        tl   : 'na-layout-canvas--resize-nw',
        tr   : 'na-layout-canvas--resize-ne',
        bl   : 'na-layout-canvas--resize-sw',
        br   : 'na-layout-canvas--resize-se',
        tc   : 'na-layout-canvas--trim-y',                                  // <-- Row resize: an edge moving up or down
        bc   : 'na-layout-canvas--trim-y',
        lc   : 'na-layout-canvas--trim-x',                                  // <-- Column resize: an edge moving sideways
        rc   : 'na-layout-canvas--trim-x',
        body : 'na-layout-canvas--grab',
        none : ''
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Side Each Trim Tab Moves
    // ------------------------------------------------------------
    const Na__PageLayout__Handles__TRIM_SIDES = Object.freeze({ tc : 'top', bc : 'bottom', lc : 'left', rc : 'right' });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Look (CSS Pixels)
    // ------------------------------------------------------------
    const Na__PageLayout__Handles__FALLBACK = Object.freeze({
        scaleRadiusPx   : 11,                                               // <-- The corner disc
        trimLengthPx    : 28,                                               // <-- The tab, along its edge
        trimDepthPx     : 16,                                               // <-- The tab, across its edge
        hoverGrow       : 1.2,                                              // <-- A handle under the pointer, or dragged
        ink             : '#172b3a',                                        // <-- Vale navy
        paper           : '#ffffff',
        shadow          : 'rgba(0, 0, 0, 0.35)',
        shadowBlurPx    : 4,
        borderColor     : 'rgba(51, 102, 153, 0.6)',
        borderWidthPx   : 1,
        labelFont       : "600 11px 'Open Sans', sans-serif",
        labelFill       : 'rgba(23, 43, 58, 0.94)',
        labelText       : '#ffffff',
        trimGhostAlpha  : 0.3
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | The Handles' Look From the Canvas Appearance Config (Fallbacks for Anything Missing)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__ResolveConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__CanvasAppearance__Config'] : null;
        const P       = 'PageLayout__CanvasAppearance__Config__';
        const F       = Na__PageLayout__Handles__FALLBACK;
        const num     = (key, fallback) => (section && typeof section[P + key] === 'number' && Number.isFinite(section[P + key])) ? section[P + key] : fallback;
        const str     = (key, fallback) => (section && typeof section[P + key] === 'string') ? section[P + key] : fallback;

        return {
            scaleRadiusPx  : Math.max(4, num('ScaleHandleRadiusPx', F.scaleRadiusPx)),
            trimLengthPx   : Math.max(8, num('TrimHandleLengthPx',  F.trimLengthPx)),
            trimDepthPx    : Math.max(6, num('TrimHandleDepthPx',   F.trimDepthPx)),
            hoverGrow      : Math.max(1, num('HandleHoverGrow',     F.hoverGrow)),
            ink            : str('HandleInkColor',       F.ink),
            paper          : str('HandlePaperColor',     F.paper),
            shadow         : str('HandleShadowColor',    F.shadow),
            shadowBlurPx   : num('HandleShadowBlurPx',   F.shadowBlurPx),
            borderColor    : str('ImageBorderColor',     F.borderColor),
            borderWidthPx  : num('ImageBorderWidth',     F.borderWidthPx),
            labelFont      : str('HandleLabelFont',      F.labelFont),
            labelFill      : str('HandleLabelFillColor', F.labelFill),
            labelText      : str('HandleLabelTextColor', F.labelText),
            trimGhostAlpha : Math.min(1, Math.max(0, num('TrimGhostAlpha', F.trimGhostAlpha)))
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This a Scale Corner, a Trim Tab, a Picture Handle at All?
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__IsScale(handle) { return Na__PageLayout__Handles__SCALE.indexOf(handle) >= 0; }
    function Na__PageLayout__Handles__IsTrim(handle)  { return Na__PageLayout__Handles__TRIM.indexOf(handle) >= 0; }
    function Na__PageLayout__Handles__IsHandle(handle) {
        return Na__PageLayout__Handles__IsScale(handle) || Na__PageLayout__Handles__IsTrim(handle);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Cursor Class for a Picture Handle (or the Body)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__CursorClass(handle) {
        return Na__PageLayout__Handles__CURSORS[handle] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Cursor Class This Module Can Set (So the Controls Can Clear Them)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__CursorClasses() {
        return Array.from(new Set(Object.values(Na__PageLayout__Handles__CURSORS).filter(Boolean)));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Visible Picture (Inside Its Trims) in Sheet mm
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__VisibleRectMm(it) {
        return {
            left   : it.x + (it.clipLeft || 0),
            top    : it.y + (it.clipTop  || 0),
            right  : it.x + it.width  - (it.clipRight  || 0),
            bottom : it.y + it.height - (it.clipBottom || 0)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Where Each Handle Sits, in CSS Pixels From the Sheet's Top Left
    // ------------------------------------------------------------
    // Resolves { rect: { left, top, right, bottom }, handles: [{ id, kind, x, y,
    // axis, sx, sy }] }. axis: 'x' for a tab moving sideways (left, right), 'y'
    // for one moving up or down; sx, sy: a corner's outward direction.
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__Layout(state, zoom, cfg) {
        const v    = Na__PageLayout__Handles__VisibleRectMm(state.imageTransform);
        const rect = { left : v.left * zoom, top : v.top * zoom, right : v.right * zoom, bottom : v.bottom * zoom };
        const midX = (rect.left + rect.right) / 2;
        const midY = (rect.top + rect.bottom) / 2;

        const handles = [];
        Na__PageLayout__Handles__SCALE.forEach((id) => {
            const [sx, sy] = Na__PageLayout__Handles__CORNER_SIGNS[id];
            handles.push({
                id, kind : 'scale', sx, sy,
                x : sx < 0 ? rect.left : rect.right,
                y : sy < 0 ? rect.top  : rect.bottom
            });
        });

        // A tab only where it sits clear of the two corner discs on its edge
        // ------------------------------------------------------------
        const needPx = cfg.trimLengthPx * cfg.hoverGrow + 4 * cfg.scaleRadiusPx * cfg.hoverGrow + 8;
        if (rect.right - rect.left >= needPx) {
            handles.push({ id : 'tc', kind : 'trim', axis : 'y', x : midX, y : rect.top });
            handles.push({ id : 'bc', kind : 'trim', axis : 'y', x : midX, y : rect.bottom });
        }
        if (rect.bottom - rect.top >= needPx) {
            handles.push({ id : 'lc', kind : 'trim', axis : 'x', x : rect.left,  y : midY });
            handles.push({ id : 'rc', kind : 'trim', axis : 'x', x : rect.right, y : midY });
        }
        return { rect, handles };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What Is Under the Pointer, and What a Drag Does
// -----------------------------------------------------------------------------

    // FUNCTION | Hit-Test the Picture: a Handle (Selected Only), Then the Visible Picture
    // ------------------------------------------------------------
    // screenX, screenY: canvas CSS pixels. hitRadiusPx: the least reach of a
    // handle (the mouse's or the finger's); a handle answers over all of itself
    // and a few pixels round it, whichever is larger. Returns a handle id,
    // 'body' or 'none'.
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__HitTest(screenX, screenY, state, hitRadiusPx) {
        const it = state.imageTransform;
        if (!state.viewportImage || !it || !(it.width > 0) || !(it.height > 0)) return Na__PageLayout__Handles__NONE;

        const ct  = state.canvasTransform;
        const cfg = Na__PageLayout__Handles__ResolveConfig(state);
        const lay = Na__PageLayout__Handles__Layout(state, ct.zoom, cfg);
        const px  = screenX - ct.offsetX;                                   // <-- The pointer from the sheet's top left
        const py  = screenY - ct.offsetY;
        const hit = Math.max(0, hitRadiusPx || 0);

        if (state.isImageSelected) {
            const cornerReach = Math.max(hit, cfg.scaleRadiusPx * cfg.hoverGrow + 4);
            const along       = Math.max(hit, (cfg.trimLengthPx * cfg.hoverGrow) / 2 + 4);
            const across      = Math.max(hit, (cfg.trimDepthPx  * cfg.hoverGrow) / 2 + 4);
            for (const h of lay.handles) {                                  // <-- Corners first: they win where they overlap a tab
                if (h.kind !== 'scale') continue;
                if (Math.abs(px - h.x) <= cornerReach && Math.abs(py - h.y) <= cornerReach) return h.id;
            }
            for (const h of lay.handles) {
                if (h.kind !== 'trim') continue;
                const reachX = h.axis === 'x' ? across : along;
                const reachY = h.axis === 'x' ? along  : across;
                if (Math.abs(px - h.x) <= reachX && Math.abs(py - h.y) <= reachY) return h.id;
            }
        }

        const r = lay.rect;
        if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return Na__PageLayout__Handles__BODY;
        return Na__PageLayout__Handles__NONE;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Picture's Place, Size and Trims as a Drag Starts
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__StartDrag(it) {
        return {
            x          : it.x,
            y          : it.y,
            width      : it.width,
            height     : it.height,
            clipTop    : it.clipTop    || 0,
            clipRight  : it.clipRight  || 0,
            clipBottom : it.clipBottom || 0,
            clipLeft   : it.clipLeft   || 0
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Drag to the Picture (Move, Scale or Trim)
    // ------------------------------------------------------------
    // start: StartDrag's snapshot. dx, dy: the pointer's travel in sheet mm.
    // limits: { minImageMm, minVisibleMm }.
    // - Move: the picture follows the pointer.
    // - Scale: the pointer's travel along the corner's diagonal sets one scale
    //   for the width, the height and every trim, so the visible picture keeps
    //   its shape and its crop; the opposite visible corner stays put. With no
    //   trims this is the old corner drag exactly.
    // - Trim: that side's trim follows the pointer, between none and leaving
    //   minVisibleMm of picture.
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__Drag(state, handle, start, dx, dy, limits) {
        const it         = state.imageTransform;
        const minImage   = (limits && limits.minImageMm   > 0) ? limits.minImageMm   : 10;
        const minVisible = (limits && limits.minVisibleMm > 0) ? limits.minVisibleMm : 10;

        if (handle === Na__PageLayout__Handles__BODY) {
            it.x = start.x + dx;
            it.y = start.y + dy;
            return;
        }

        // SCALE | About the opposite visible corner
        // ------------------------------------------------------------
        if (Na__PageLayout__Handles__IsScale(handle)) {
            const [sx, sy] = Na__PageLayout__Handles__CORNER_SIGNS[handle];
            const vw0  = start.width  - start.clipLeft - start.clipRight;
            const vh0  = start.height - start.clipTop  - start.clipBottom;
            const diag = Math.hypot(vw0, vh0);
            if (!(diag > 0) || !(start.width > 0) || !(start.height > 0)) return;

            const along = (dx * sx * vw0 + dy * sy * vh0) / diag;          // <-- Travel outward along the corner's diagonal
            const least = Math.max(minImage / start.width, minVisible / vw0, minVisible / vh0);
            const scale = Math.max(least, (diag + along) / diag);

            const width  = start.width  * scale;
            const height = start.height * scale;
            const cl = start.clipLeft  * scale, cr = start.clipRight  * scale;
            const ct = start.clipTop   * scale, cb = start.clipBottom * scale;
            const anchorX = sx > 0 ? start.x + start.clipLeft : start.x + start.width  - start.clipRight;
            const anchorY = sy > 0 ? start.y + start.clipTop  : start.y + start.height - start.clipBottom;

            it.width      = width;
            it.height     = height;
            it.clipLeft   = cl;
            it.clipRight  = cr;
            it.clipTop    = ct;
            it.clipBottom = cb;
            it.x          = sx > 0 ? anchorX - cl : anchorX - width  + cr;
            it.y          = sy > 0 ? anchorY - ct : anchorY - height + cb;
            return;
        }

        // TRIM | One side of the visible picture
        // ------------------------------------------------------------
        const clamp = (value, most) => Math.max(0, Math.min(most, value));
        if (handle === 'rc') it.clipRight  = clamp(start.clipRight  - dx, start.width  - minVisible - start.clipLeft);
        if (handle === 'lc') it.clipLeft   = clamp(start.clipLeft   + dx, start.width  - minVisible - start.clipRight);
        if (handle === 'bc') it.clipBottom = clamp(start.clipBottom - dy, start.height - minVisible - start.clipTop);
        if (handle === 'tc') it.clipTop    = clamp(start.clipTop    + dy, start.height - minVisible - start.clipBottom);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing (ctx in CSS Pixels, Origin at the Sheet's Top Left)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Rounded Rectangle Path (No Reliance on ctx.roundRect)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__RoundRectPath(ctx, x, y, w, h, r) {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y,     x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x,     y + h, rr);
        ctx.arcTo(x,     y + h, x,     y,     rr);
        ctx.arcTo(x,     y,     x + w, y,     rr);
        ctx.closePath();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Double-Headed Arrow From (x1, y1) to (x2, y2)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__DoubleArrow(ctx, x1, y1, x2, y2, headPx) {
        const angle  = Math.atan2(y2 - y1, x2 - x1);
        const spread = 0.7;                                                 // <-- About 40 degrees either side of the shaft
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        [[x2, y2, angle], [x1, y1, angle + Math.PI]].forEach(([px, py, a]) => {
            ctx.moveTo(px - headPx * Math.cos(a - spread), py - headPx * Math.sin(a - spread));
            ctx.lineTo(px, py);
            ctx.lineTo(px - headPx * Math.cos(a + spread), py - headPx * Math.sin(a + spread));
        });
        ctx.stroke();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Scale Corner: Navy Disc, White Ring, White Diagonal Arrow
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__DrawScale(ctx, h, cfg, emphasis) {
        const r = cfg.scaleRadiusPx * (emphasis ? cfg.hoverGrow : 1);
        ctx.save();
        ctx.shadowColor   = cfg.shadow;
        ctx.shadowBlur    = cfg.shadowBlurPx;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
        ctx.fillStyle = cfg.ink;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth   = 2;
        ctx.strokeStyle = cfg.paper;
        ctx.stroke();

        const half = r * 0.5;                                               // <-- The arrow lies along the corner's diagonal
        const ux   = h.sx / Math.SQRT2;
        const uy   = h.sy / Math.SQRT2;
        ctx.lineWidth   = 1.75;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = cfg.paper;
        Na__PageLayout__Handles__DoubleArrow(ctx, h.x - ux * half, h.y - uy * half, h.x + ux * half, h.y + uy * half, r * 0.36);
        ctx.restore();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Trim Tab: White Tab on the Edge, Navy Arrow Across It (Inverted While Active)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__DrawTrim(ctx, h, cfg, emphasis) {
        const grow   = emphasis ? cfg.hoverGrow : 1;
        const along  = cfg.trimLengthPx * grow;
        const across = cfg.trimDepthPx  * grow;
        const w      = h.axis === 'x' ? across : along;                    // <-- A left or right tab stands upright
        const ht     = h.axis === 'x' ? along  : across;
        const fill   = emphasis ? cfg.ink   : cfg.paper;
        const mark   = emphasis ? cfg.paper : cfg.ink;

        ctx.save();
        ctx.shadowColor   = cfg.shadow;
        ctx.shadowBlur    = cfg.shadowBlurPx;
        ctx.shadowOffsetY = 1;
        Na__PageLayout__Handles__RoundRectPath(ctx, h.x - w / 2, h.y - ht / 2, w, ht, 4 * grow);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth   = 2;
        ctx.strokeStyle = emphasis ? cfg.paper : cfg.ink;
        ctx.stroke();

        const reach = across * 0.32;                                        // <-- The arrow points the way the edge moves
        ctx.lineWidth   = 1.75;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = mark;
        if (h.axis === 'x') Na__PageLayout__Handles__DoubleArrow(ctx, h.x - reach, h.y, h.x + reach, h.y, across * 0.22);
        else                Na__PageLayout__Handles__DoubleArrow(ctx, h.x, h.y - reach, h.x, h.y + reach, across * 0.22);
        ctx.restore();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What the Label Says for a Handle
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__LabelText(state, handle, dragging) {
        const it = state.imageTransform;
        if (!dragging) return Na__PageLayout__Handles__IsScale(handle) ? 'Drag to scale' : 'Drag to trim';
        if (Na__PageLayout__Handles__IsScale(handle)) {
            const v = Na__PageLayout__Handles__VisibleRectMm(it);
            return `Scale: ${Math.round(v.right - v.left)} x ${Math.round(v.bottom - v.top)} mm`;
        }
        const side  = Na__PageLayout__Handles__TRIM_SIDES[handle];
        const key   = { top : 'clipTop', bottom : 'clipBottom', left : 'clipLeft', right : 'clipRight' }[side];
        const value = it[key] || 0;
        return value > 0.05 ? `Trim ${side}: ${value.toFixed(1)} mm` : `Trim ${side}: none`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Label Beside a Handle, Outside the Picture, Kept on the Canvas
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__DrawLabel(ctx, h, text, cfg, bounds) {
        ctx.save();
        ctx.font         = cfg.labelFont;
        ctx.textBaseline = 'middle';
        ctx.textAlign    = 'left';
        const w   = Math.ceil(ctx.measureText(text).width) + 14;
        const ht  = 20;
        const gap = (h.kind === 'scale' ? cfg.scaleRadiusPx * cfg.hoverGrow : (cfg.trimDepthPx * cfg.hoverGrow) / 2) + 8;

        let x;
        let y;
        if (h.kind === 'scale') {                                           // <-- Out along the corner's diagonal
            x = h.sx > 0 ? h.x + gap : h.x - gap - w;
            y = h.sy > 0 ? h.y + gap - ht / 2 : h.y - gap - ht / 2;
        } else if (h.id === 'lc') { x = h.x - gap - w; y = h.y - ht / 2; }
        else if   (h.id === 'rc') { x = h.x + gap;     y = h.y - ht / 2; }
        else if   (h.id === 'tc') { x = h.x - w / 2;   y = h.y - gap - ht; }
        else                      { x = h.x - w / 2;   y = h.y + gap; }

        if (bounds) {                                                       // <-- Never off the canvas
            x = Math.max(bounds.left + 4, Math.min(bounds.right  - 4 - w,  x));
            y = Math.max(bounds.top  + 4, Math.min(bounds.bottom - 4 - ht, y));
        }

        Na__PageLayout__Handles__RoundRectPath(ctx, x, y, w, ht, 4);
        ctx.fillStyle = cfg.labelFill;
        ctx.fill();
        ctx.fillStyle = cfg.labelText;
        ctx.fillText(text, x + 7, y + ht / 2 + 0.5);
        ctx.restore();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Trimmed-Away Picture, Faintly, While a Trim Is Dragged (Under the Guide)
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__DrawGhost(ctx, state, zoom) {
        const it    = state ? state.imageTransform : null;
        const image = state ? state.viewportImage  : null;
        if (!image || !it || !state.isImageSelected || !Na__PageLayout__Handles__IsTrim(state.imageHandleDrag)) return;

        const cfg  = Na__PageLayout__Handles__ResolveConfig(state);
        const v    = Na__PageLayout__Handles__VisibleRectMm(it);
        const full = { x : it.x * zoom, y : it.y * zoom, w : it.width * zoom, h : it.height * zoom };

        ctx.save();
        ctx.beginPath();
        ctx.rect(full.x, full.y, full.w, full.h);
        ctx.rect(v.left * zoom, v.top * zoom, (v.right - v.left) * zoom, (v.bottom - v.top) * zoom);
        ctx.clip('evenodd');                                                // <-- Only the trimmed-away part
        ctx.globalAlpha = cfg.trimGhostAlpha;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, full.x, full.y, full.w, full.h);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = cfg.borderColor;
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(full.x, full.y, full.w, full.h);                    // <-- The untrimmed picture's outline
        ctx.restore();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Picture's Outline, Handles and Label (Over the Guide)
    // ------------------------------------------------------------
    // bounds: the canvas's visible area in the same units (sheet top left at
    // 0, 0), so a label is never drawn off screen. Draws nothing unless the
    // picture is selected.
    // ------------------------------------------------------------
    function Na__PageLayout__Handles__Draw(ctx, state, zoom, bounds) {
        const it = state ? state.imageTransform : null;
        if (!state || !state.viewportImage || !it || !state.isImageSelected || !(it.width > 0) || !(it.height > 0)) return;

        const cfg    = Na__PageLayout__Handles__ResolveConfig(state);
        const lay    = Na__PageLayout__Handles__Layout(state, zoom, cfg);
        const active = Na__PageLayout__Handles__IsHandle(state.imageHandleDrag)  ? state.imageHandleDrag  : null;
        const hover  = !active && Na__PageLayout__Handles__IsHandle(state.imageHandleHover) ? state.imageHandleHover : null;
        const r      = lay.rect;

        // OUTLINE | Dashed round the visible picture
        // ------------------------------------------------------------
        ctx.save();
        ctx.strokeStyle = cfg.borderColor;
        ctx.lineWidth   = cfg.borderWidthPx;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
        ctx.restore();

        // HANDLES | Tabs first, so a corner disc is always on top
        // ------------------------------------------------------------
        lay.handles.filter((h) => h.kind === 'trim').forEach((h) => {
            Na__PageLayout__Handles__DrawTrim(ctx, h, cfg, h.id === active || h.id === hover);
        });
        lay.handles.filter((h) => h.kind === 'scale').forEach((h) => {
            Na__PageLayout__Handles__DrawScale(ctx, h, cfg, h.id === active || h.id === hover);
        });

        // LABEL | What the handle under the pointer does, or the drag's numbers
        // ------------------------------------------------------------
        const named = active || hover;
        const h     = named ? lay.handles.find((each) => each.id === named) : null;
        if (h) Na__PageLayout__Handles__DrawLabel(ctx, h, Na__PageLayout__Handles__LabelText(state, named, !!active), cfg, bounds);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Image Handles API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Handles__ResolveConfig,
        Na__PageLayout__Handles__IsScale,
        Na__PageLayout__Handles__IsTrim,
        Na__PageLayout__Handles__IsHandle,
        Na__PageLayout__Handles__CursorClass,
        Na__PageLayout__Handles__CursorClasses,
        Na__PageLayout__Handles__VisibleRectMm,
        Na__PageLayout__Handles__Layout,
        Na__PageLayout__Handles__HitTest,
        Na__PageLayout__Handles__StartDrag,
        Na__PageLayout__Handles__Drag,
        Na__PageLayout__Handles__DrawGhost,
        Na__PageLayout__Handles__Draw
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
