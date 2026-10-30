// =============================================================================
// VALEVISION AURA - VIEWPORTS - THE GROUND CUT
// =============================================================================
//
// FILE       : Na__Viewports__GroundCut__.js
// NAMESPACE  : Na__GroundCut
// MODULE     : Viewports - Ground Cut
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : End an elevation viewport cut off at the ground as an
//              illustrator does: the drawing's foot lost into a swish of wash
//              along the ground, painted by the engine
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026, with an elevation viewport whose bottom handle cut
//   through the planting, and three of Vale's hand-coloured elevations: "create
//   a special effect on elevation viewports when they have the bottom handle
//   brought upwards. It effectively becomes a ground plane clipping boundary".
//   His calls: the painter in PainterlyNPR, synced; on by itself when the
//   bottom handle is dragged up past the ground line; Grass sweep, Grass strip,
//   Hardstanding, Gravel and Paving, Plain cut always there; a right-click menu
//   with a small Adjust panel (Na__Viewports__GroundCutMenu__).
// - WHERE THE GROUND IS: the building's foot (the lowest point of its
//   Architecture and Focal objects), on the sheet at the viewport's scale: the
//   frame's middle is the camera's target, and an elevation looks level.
// - WHEN (Viewport__GroundCut.GroundCut__Mode): 'Auto' cuts once the frame's
//   bottom is above the ground line by GroundCut__TriggerMm, at the frame's
//   bottom; 'On' always, at the ground line or the frame's bottom, whichever is
//   higher; 'Off' never. Elevations only.
// - HOW: the picture keeps its clip and gains a mask: everything above the cut
//   kept, the band just above it lost as the engine's foot mask says, nothing
//   below. The engine's swish is laid over the picture and the paper with a
//   multiply blend, outside the clip: it runs past the frame's sides and below
//   it, as a hand's does.
// - THE SETTINGS ARE THE ENGINE'S FORM (GroundCut__Settings: its Clean), kept
//   with the viewport, saved and undone with the drawing set. A cut with no
//   seed takes one from the viewport's id, so it never changes until New swish.
// - PAINTED ONCE, KEPT: each painting (at the stills' 300 dpi) is cached by
//   what it depends on, as a blob URL, and painted one at a time off the
//   drawing's own redraw. While a slider moves, a quick painting at the
//   engine's preview density stands in and is swapped into the sheet in place.
// - Without the engine's ground cut (a pin before PainterlyNPR v0.8.13) every
//   elevation keeps its plain cut, as before.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.13)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__Svg } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__BuildingBounds } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__EngineHost__GroundCut, Na__EngineHost__GroundCutLoad, Na__EngineHost__GroundCutMissing } from '../10__System__EngineHost/Na__EngineHost__GroundCut__.js';
    import { Na__Surface__RedrawLayer } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__Views__Camera } from './Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__GroundCut__MODES = ['Auto', 'On', 'Off'];
    const Na__GroundCut__KEEP  = 24;                                             // <-- Finished paintings kept (each a few hundred kB at 300 dpi)

    const Na__GroundCut__State = {
        cache    : new Map(),                    // <-- key -> { ready, request, swish, foot }: swish and foot { url, rect } or null
        queue    : [],                           // <-- keys waiting to be painted, one at a time
        busy     : false,
        last     : new Map(),                    // <-- viewport id -> its last finished painting: stands in while the next is painted
        previews : new Map(),                    // <-- viewport id -> a quick painting while a slider moves ({ settling } once let go)
        waiting  : false                         // <-- The engine's modules are being fetched: one redraw when they arrive
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Viewport's Cut
// -----------------------------------------------------------------------------

    // FUNCTION | Is This Viewport One That Can Be Cut at the Ground? (elevations only)
    // ------------------------------------------------------------
    function Na__GroundCut__Applies(viewport) {
        return !!viewport && viewport.Viewport__Kind === 'Elevation';
    }
    // ------------------------------------------------------------


    // FUNCTION | Its Record: { Mode, Settings } (Settings in the engine's kept form, or null: the default kind)
    // ------------------------------------------------------------
    function Na__GroundCut__Of(viewport) {
        const rec = (viewport && viewport.Viewport__GroundCut) || {};
        return {
            Mode     : Na__GroundCut__MODES.includes(rec.GroundCut__Mode) ? rec.GroundCut__Mode : 'Auto',
            Settings : rec.GroundCut__Settings && typeof rec.GroundCut__Settings === 'object' ? rec.GroundCut__Settings : null
        };
    }

    // Write it ({ mode } and/or { settings }); the caller announces the edit
    function Na__GroundCut__Write(viewport, patch) {
        const now = Na__GroundCut__Of(viewport);
        viewport.Viewport__GroundCut = {
            GroundCut__Mode     : 'mode' in patch ? patch.mode : now.Mode,
            GroundCut__Settings : 'settings' in patch ? patch.settings : now.Settings
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Ground Line on the Sheet (mm down the paper), Else Null
    // ------------------------------------------------------------
    function Na__GroundCut__GroundY(viewport, doc) {
        const bounds = Na__EngineHost__BuildingBounds();
        const camera = bounds ? Na__Views__Camera(viewport, doc) : null;
        if (!camera || !Array.isArray(camera.Target)) return null;
        const f = viewport.Viewport__FrameMm;
        const scale = Number(viewport.Viewport__ScaleDenominator) || 50;
        return f.Y + f.HeightMm / 2 + (Number(camera.Target[1]) - bounds.Min[1]) * 1000 / scale;   // <-- Level: one metre up the world is 1000 / scale mm up the paper
    }
    // ------------------------------------------------------------


    // FUNCTION | Where It Is Cut Now: { Y, Ground, Mode }, or null when it is not
    // ------------------------------------------------------------
    // ground: the ground line to use (a resize keeps the one it started with:
    // the drawing stays put on the sheet while the frame moves).
    // ------------------------------------------------------------
    function Na__GroundCut__Cut(viewport, doc, ground) {
        if (!Na__GroundCut__Applies(viewport)) return null;
        const mode = Na__GroundCut__Of(viewport).Mode;
        if (mode === 'Off') return null;
        const f = viewport.Viewport__FrameMm;
        const bottom = f.Y + f.HeightMm;
        const g = ground === undefined ? Na__GroundCut__GroundY(viewport, doc) : ground;
        if (mode === 'Auto') {
            if (g === null || bottom > g - Na__AppConfig__Get('GroundCut__TriggerMm', 1)) return null;   // <-- The bottom handle has not been brought up into the drawing
            return { Y: bottom, Ground: g, Mode: mode };
        }
        return { Y: g === null ? bottom : Math.min(bottom, g), Ground: g, Mode: mode };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Painting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Stills' Density: the paper's dpi in pixels a millimetre
    // ------------------------------------------------------------
    function Na__GroundCut__PxPerMm() {
        return Na__AppConfig__Get('Viewport__RenderDpi', 300) / 25.4;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Painted Part as { url, rect } (rect in the cut's frame: x from the frame's left, y from the cut)
    // ------------------------------------------------------------
    function Na__GroundCut__Rect(part) {
        return { X: part.X, Y: part.Y, WidthMm: part.WidthMm, HeightMm: part.HeightMm };
    }

    function Na__GroundCut__BlobUrl(canvas) {
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')), 'image/png'));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Painting a Viewport Shows Now (a quick one, its finished one, or its last), Else Null
    // ------------------------------------------------------------
    // Asks for the finished one when it is not there yet; it is painted off this
    // redraw and the layer is drawn again once it is ready.
    // ------------------------------------------------------------
    function Na__GroundCut__Painted(engine, viewport) {
        const S = Na__GroundCut__State;
        const id = viewport.Viewport__Id;
        const preview = S.previews.get(id);
        if (preview && !preview.settling) return preview;
        const settings = Na__GroundCut__Of(viewport).Settings;
        const width = viewport.Viewport__FrameMm.WidthMm;
        const k = Na__GroundCut__PxPerMm();
        const key = `${engine.Settings.PainterlyNPR__GroundCut__Key(settings, id)}|${width}|${k.toFixed(3)}`;
        const hit = S.cache.get(key);
        if (hit && hit.ready) {
            S.cache.delete(key);                                                 // <-- To the back of the queue to be let go
            S.cache.set(key, hit);
            S.last.set(id, hit);
            if (preview) S.previews.delete(id);
            return hit;
        }
        if (!hit) {
            S.cache.set(key, { ready: false, request: { Settings: settings ? JSON.parse(JSON.stringify(settings)) : null, Identity: id, WidthMm: width, PxPerMm: k } });
            S.queue.push(key);
            Na__GroundCut__Pump();
        }
        return preview || S.last.get(id) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Paint What Is Waiting, One at a Time, Then Draw the Sheet Again
    // ------------------------------------------------------------
    function Na__GroundCut__Pump() {
        const S = Na__GroundCut__State;
        if (S.busy || !S.queue.length) return;
        S.busy = true;
        setTimeout(async () => {
            const key = S.queue.shift();
            const entry = S.cache.get(key);
            const engine = Na__EngineHost__GroundCut();
            try {
                if (entry && !entry.ready && engine) {
                    const painted = engine.Swish.PainterlyNPR__GroundCut__Paint(entry.request);
                    entry.swish = painted.Swish ? { url: await Na__GroundCut__BlobUrl(painted.Swish.Canvas), rect: Na__GroundCut__Rect(painted.Swish) } : null;
                    entry.foot = painted.Foot ? { url: await Na__GroundCut__BlobUrl(painted.Foot.Canvas), rect: Na__GroundCut__Rect(painted.Foot) } : null;
                }
            } catch (error) {
                console.error('[AURA] The ground cut could not be painted', error);
                if (entry) { entry.swish = null; entry.foot = null; }
            }
            if (entry) entry.ready = true;
            Na__GroundCut__Trim();
            S.busy = false;
            if (S.queue.length) Na__GroundCut__Pump();
            else if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports');
        }, 0);
    }

    // Let the oldest finished paintings go, never one a viewport shows
    function Na__GroundCut__Trim() {
        const S = Na__GroundCut__State;
        const shown = new Set(S.last.values());
        const ready = [...S.cache.entries()].filter(([, e]) => e.ready);
        for (let i = 0; i < ready.length - Na__GroundCut__KEEP; i++) {
            const [key, entry] = ready[i];
            if (shown.has(entry)) continue;
            [entry.swish, entry.foot].forEach((part) => { if (part && part.url.startsWith('blob:')) URL.revokeObjectURL(part.url); });
            S.cache.delete(key);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | A Quick Painting While a Slider Moves, Swapped Into the Sheet in Place
    // ------------------------------------------------------------
    // At the engine's preview density, as a data URL. When the parts drawn on
    // the sheet are not the parts it has (a swish appearing or going), the
    // layer is drawn again instead.
    // ------------------------------------------------------------
    function Na__GroundCut__Preview(viewport) {
        const engine = Na__EngineHost__GroundCut();
        if (!engine || !Na__GroundCut__Applies(viewport)) return;
        const id = viewport.Viewport__Id;
        const painted = engine.Swish.PainterlyNPR__GroundCut__Paint({
            Settings : Na__GroundCut__Of(viewport).Settings, Identity: id,
            WidthMm  : viewport.Viewport__FrameMm.WidthMm, PxPerMm: engine.Settings.PainterlyNPR__GroundCut__Output().PreviewPxPerMm
        });
        const part = (p) => (p ? { url: p.Canvas.toDataURL('image/png'), rect: Na__GroundCut__Rect(p) } : null);
        const preview = { ready: true, swish: part(painted.Swish), foot: part(painted.Foot), settling: false };
        Na__GroundCut__State.previews.set(id, preview);
        if (!Na__GroundCut__Swap(viewport, preview)) Na__Surface__RedrawLayer('viewports');
    }

    // The slider was let go: the quick painting stands until the finished one is ready
    function Na__GroundCut__EndPreview(viewport) {
        const preview = viewport ? Na__GroundCut__State.previews.get(viewport.Viewport__Id) : null;
        if (preview) preview.settling = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put a Painting Into the Parts Drawn on the Sheet (false: they do not match it)
    // ------------------------------------------------------------
    function Na__GroundCut__Swap(viewport, painted) {
        const id = viewport.Viewport__Id;
        const swish = document.querySelector(`.aura-ground__swish[data-ground-id="${id}"]`);
        const foot = document.querySelector(`.aura-ground__foot[data-ground-id="${id}"]`);
        const keep = document.querySelector(`.aura-ground__keep[data-ground-id="${id}"]`);
        if (!keep || !!swish !== !!painted.swish || !!foot !== !!painted.foot) return false;
        const f = viewport.Viewport__FrameMm;
        const cutY = Number(keep.getAttribute('data-cut-y'));
        if (swish) Na__GroundCut__Place(swish, painted.swish, f, cutY);
        if (foot) Na__GroundCut__Place(foot, painted.foot, f, cutY);
        const top = Number(keep.getAttribute('y'));
        keep.setAttribute('height', String(Math.max(0, cutY + (painted.foot ? painted.foot.rect.Y : 0) - top + 0.02)));
        return true;
    }

    function Na__GroundCut__Place(image, part, f, cutY) {
        image.setAttribute('x', String(f.X + part.rect.X));
        image.setAttribute('y', String(cutY + part.rect.Y));
        image.setAttribute('width', String(part.rect.WidthMm));
        image.setAttribute('height', String(part.rect.HeightMm));
        image.setAttribute('href', part.url);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | On the Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | Cut a Viewport at the Ground: the picture's mask, and the swish over it
    // ------------------------------------------------------------
    // g: the viewport's group; inner: its clipped picture group; defs: the
    // layer's. Called as the viewport is drawn, after its picture and before
    // its frame and title. Returns how far down the paper the swish reaches
    // (its title goes under it), or null when nothing is drawn below the frame.
    // ------------------------------------------------------------
    function Na__GroundCut__Decorate(g, inner, defs, viewport, doc) {
        const cut = Na__GroundCut__Cut(viewport, doc);
        if (!cut) return null;
        const engine = Na__EngineHost__GroundCut();
        if (!engine) {
            if (!Na__EngineHost__GroundCutMissing() && !Na__GroundCut__State.waiting) {   // <-- Its modules are on their way: draw again once, when they arrive
                Na__GroundCut__State.waiting = true;
                Na__EngineHost__GroundCutLoad().then((e) => { Na__GroundCut__State.waiting = false; if (e && Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports'); });
            }
            return null;
        }
        const f = viewport.Viewport__FrameMm;
        const id = viewport.Viewport__Id;
        const painted = Na__GroundCut__Painted(engine, viewport);
        const plain = engine.Settings.PainterlyNPR__GroundCut__Resolve(Na__GroundCut__Of(viewport).Settings, id).Plain;
        const shown = plain ? null : painted;
        const reach = Na__AppConfig__Get('GroundCut__MaskReachMm', 400);         // <-- The mask's room: a resize moves its content before the sheet is drawn again

        // The picture: kept above the cut, its foot lost as the engine says, nothing below
        const mask = Na__Dom__Svg('mask', { id: `aura-ground-${id}`, maskUnits: 'userSpaceOnUse', x: f.X - 1, y: f.Y - reach, width: f.WidthMm + 2, height: f.HeightMm + 2 * reach }, defs);
        const content = Na__Dom__Svg('g', { 'data-ground': id }, mask);
        const top = f.Y - reach;
        const keepTo = cut.Y + (shown && shown.foot ? shown.foot.rect.Y : 0);
        Na__Dom__Svg('rect', { x: f.X - 1, y: top, width: f.WidthMm + 2, height: Math.max(0, keepTo - top + 0.02), fill: '#ffffff',
                               class: 'aura-ground__keep', 'data-ground-id': id, 'data-cut-y': cut.Y, 'data-ground-y': cut.Ground === null ? '' : cut.Ground }, content);
        if (shown && shown.foot) {
            const foot = Na__Dom__Svg('image', { preserveAspectRatio: 'none', class: 'aura-ground__foot', 'data-ground-id': id }, content);
            Na__GroundCut__Place(foot, shown.foot, f, cut.Y);
        }
        inner.setAttribute('mask', `url(#aura-ground-${id})`);

        // The swish over the picture and the paper, past the frame's sides and below it
        if (!shown || !shown.swish) return null;
        const holder = Na__Dom__Svg('g', { class: 'aura-ground', 'data-ground': id }, g);
        const swish = Na__Dom__Svg('image', { preserveAspectRatio: 'none', class: 'aura-ground__swish', 'data-ground-id': id }, holder);
        Na__GroundCut__Place(swish, shown.swish, f, cut.Y);
        return cut.Y + shown.swish.rect.Y + shown.swish.rect.HeightMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Follow a Resize of the Frame: the cut moves with its bottom (the ground line stays put)
    // ------------------------------------------------------------
    // Only what was drawn moves: a cut that comes or goes during the drag shows
    // once the handle is let go and the sheet is drawn again.
    // ------------------------------------------------------------
    function Na__GroundCut__Drag(viewport, doc) {
        const id = viewport ? viewport.Viewport__Id : null;
        const keep = id ? document.querySelector(`.aura-ground__keep[data-ground-id="${id}"]`) : null;
        if (!keep) return;
        const drawn = Number(keep.getAttribute('data-cut-y'));
        const groundText = keep.getAttribute('data-ground-y');
        const cut = Na__GroundCut__Cut(viewport, doc, groundText === '' ? null : Number(groundText));
        document.querySelectorAll(`[data-ground="${id}"]`).forEach((el) => {
            if (cut) { el.removeAttribute('display'); el.setAttribute('transform', `translate(0 ${cut.Y - drawn})`); }
            else el.setAttribute('display', 'none');
        });
        const inner = document.querySelector(`.aura-vp[data-id="${id}"] .aura-vp__inner`);
        if (inner && cut) inner.setAttribute('mask', `url(#aura-ground-${id})`);
        else if (inner) inner.removeAttribute('mask');                          // <-- Not cut any more: the whole picture shows while the handle moves
    }
    // ------------------------------------------------------------


    // FUNCTION | Announce a Change to a Viewport's Cut (saved, and a step in the history)
    // ------------------------------------------------------------
    function Na__GroundCut__Changed(viewport) {
        const doc = Na__AppState__Data.doc;
        const sheet = doc ? (doc.AuraDrawingSet__Sheets || []).find((s) => (s.Sheet__Viewports || []).includes(viewport)) : null;
        Na__AppState__Touch('viewport', sheet ? sheet.Sheet__Id : null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__GroundCut__Applies,
        Na__GroundCut__Of,
        Na__GroundCut__Write,
        Na__GroundCut__GroundY,
        Na__GroundCut__Cut,
        Na__GroundCut__Preview,
        Na__GroundCut__EndPreview,
        Na__GroundCut__Decorate,
        Na__GroundCut__Drag,
        Na__GroundCut__Changed,
        Na__GroundCut__MODES
    };

// endregion -------------------------------------------------------------------
