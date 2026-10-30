// =============================================================================
// VALEVISION AURA - VIEWPORTS - ART DIRECTION POINTS ON THE SHEET
// =============================================================================
//
// FILE       : Na__Viewports__ArtDirection__.js
// NAMESPACE  : Na__ViewportPoints
// MODULE     : Viewports - Art Direction Points
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The selected viewport's Art Direction Points, edited on the 2D
//              sheet with PainterlyNPR's own point editor and listed in the
//              sheet's right panel
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - WHOSE POINTS: a 3D viewport of a saved view edits that view's own points,
//   the set the 3D Environment edits too (one set a view, Adam, 30-Oct-2026);
//   an elevation, the roof plan or a preset view edits its own.
// - THE ENGINE IS LENT TO THE VIEWPORT while its Art direction points section
//   is open (Na__EngineHost__Borrow): the live drawing becomes that
//   viewport's, the engine's handles, rings and node of sliders lie over its
//   picture on the sheet, and its list sits in the section. The picture shows
//   the live drawing as it refines (a preview). When the section folds, the
//   viewport is let go or the tab changes, the engine goes back to the 3D
//   Environment and the viewport's still is drawn again at full quality.
// - ADD A POINT: press a type, then click the picture where it should act (Esc
//   cancels). It anchors to what lies under it, as in the 3D Environment, once
//   the viewport's drawing has refined in the engine.
// - KEYS while a point is selected: Delete, Ctrl+D, [ and ] (Shift: 10 mm), H,
//   Escape. They come before the sheet's own: Delete removes the point, not
//   the viewport.
// - The render queue waits while a viewport has the engine.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppState__Data, Na__AppState__On, Na__AppState__Touch, Na__AppState__ActiveSheet } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import {
        Na__EngineHost__Ready, Na__EngineHost__Busy, Na__EngineHost__PointTypes, Na__EngineHost__MaxPoints, Na__EngineHost__Points,
        Na__EngineHost__PointsSignature, Na__EngineHost__PointList, Na__EngineHost__RefreshPoints, Na__EngineHost__RedrawPointOverlay,
        Na__EngineHost__ArmPoint, Na__EngineHost__ArmedPoint, Na__EngineHost__PlacePoint, Na__EngineHost__PointKey, Na__EngineHost__DeselectPoint,
        Na__EngineHost__Borrow, Na__EngineHost__BorrowCamera, Na__EngineHost__Borrowed, Na__EngineHost__Release, Na__EngineHost__LiveCanvas
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Surface__Current, Na__Surface__Elements, Na__Surface__RedrawLayer } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__DrawingSet__Viewport, Na__DrawingSet__CleanPoints } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Views__Camera, Na__Views__PointsOwner, Na__Views__Points, Na__Views__SetPoints, Na__Views__PictureRect } from './Na__Viewports__Views__.js';
    import { Na__RenderQueue__Picture, Na__RenderQueue__SetPreview, Na__RenderQueue__Pause } from './Na__Viewports__RenderQueue__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ViewportPoints__POLL_MS = 150;                                   // <-- How often the borrowed drawing is looked at for a new preview

    const Na__ViewportPoints__State = {
        viewportId  : null,                      // <-- The viewport that has the engine now
        sheetId     : null,
        section     : null,                      // <-- The right panel's Art direction points section
        listHome    : null,                      // <-- Where the engine's list goes in that section
        typeButtons : [],
        stand       : null,                      // <-- Laid over the picture: the editor measures it, and it takes a placing click
        layer       : null,                      // <-- The engine's point layer over the picture
        camera      : '',                        // <-- The camera lent, as JSON: a pan, a new scale or side sends the new one
        signature   : '',                        // <-- The points as last kept
        shown       : '',                        // <-- What the preview shows (points and camera): a new one only when it changes
        idle        : 0,                         // <-- Looks in a row that found the engine still
        ready       : false,                     // <-- The viewport's drawing has refined in the engine: a dropped point anchors right
        poll        : 0,
        mounted     : false
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Viewport Being Edited
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Viewport That Has the Engine, if It Is Still There
    // ------------------------------------------------------------
    function Na__ViewportPoints__Viewport() {
        const S = Na__ViewportPoints__State;
        const sheet = Na__AppState__ActiveSheet();
        if (!S.viewportId || !sheet || sheet.Sheet__Id !== S.sheetId) return null;
        return Na__DrawingSet__Viewport(sheet, S.viewportId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Points Where They Belong (the saved view, or the viewport), if They Changed
    // ------------------------------------------------------------
    function Na__ViewportPoints__Keep() {
        const S = Na__ViewportPoints__State;
        const viewport = Na__ViewportPoints__Viewport();
        const doc = Na__AppState__Data.doc;
        if (!viewport || !doc) return;
        const signature = Na__EngineHost__PointsSignature();
        if (signature === S.signature) return;
        S.signature = signature;
        const owner = Na__Views__SetPoints(viewport, doc, Na__DrawingSet__CleanPoints(Na__EngineHost__Points()));
        Na__AppState__Touch(owner === 'view' ? 'points' : 'viewport', S.sheetId);
        Na__ViewportPoints__ShowCount(viewport);
    }

    function Na__ViewportPoints__ShowCount(viewport) {
        const S = Na__ViewportPoints__State;
        if (!S.section || !viewport) return;
        const count = Na__Views__Points(viewport, Na__AppState__Data.doc).length;
        S.section.meta.textContent = count ? `${count} of ${Na__EngineHost__MaxPoints()}` : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lending the Engine
// -----------------------------------------------------------------------------

    // FUNCTION | The Viewport's Points Are Being Edited: lend it the engine, lay the editor over its picture
    // ------------------------------------------------------------
    // listHome: where the engine's list goes in the section. Drawing the panel
    // again for the viewport already being edited only moves the list.
    // ------------------------------------------------------------
    function Na__ViewportPoints__Begin(viewport, listHome) {
        const S = Na__ViewportPoints__State;
        const doc = Na__AppState__Data.doc;
        const sheet = Na__AppState__ActiveSheet();
        const { svg } = Na__Surface__Current();
        if (!doc || !sheet || !svg || !Na__EngineHost__Ready()) return;
        if (S.viewportId === viewport.Viewport__Id && Na__EngineHost__Borrowed()) {
            if (listHome) listHome.appendChild(Na__EngineHost__PointList());
            Na__EngineHost__RefreshPoints();
            return;
        }
        Na__ViewportPoints__End();
        const camera = Na__Views__Camera(viewport, doc);
        if (!camera) return;

        const wrap = svg.parentElement;                                          // <-- The sheet's wrapper: what lies in it scrolls with the paper
        S.stand = Na__Dom__El('div', 'aura-vp-points__stand', null, { 'aria-hidden': 'true' });
        S.layer = Na__Dom__El('div', 'PainterlyNPR__PointLayer aura-vp-points__layer');
        S.stand.addEventListener('pointerdown', (e) => Na__ViewportPoints__OnPlace(e));
        wrap.appendChild(S.stand);
        wrap.appendChild(S.layer);
        S.viewportId = viewport.Viewport__Id;
        S.sheetId = sheet.Sheet__Id;
        S.camera = JSON.stringify(camera);
        Na__ViewportPoints__Place();

        Na__RenderQueue__Pause(true);                                            // <-- The viewport has the engine: other stills wait
        const picture = Na__RenderQueue__Picture(viewport, doc);
        if (picture && !picture.preview) Na__RenderQueue__SetPreview(viewport.Viewport__Id, picture.url, false);   // <-- The still stands in until the points change
        Na__EngineHost__Borrow({
            camera, points: Na__Views__Points(viewport, doc), layer: S.layer, element: S.stand,
            onEdited  : () => Na__ViewportPoints__Keep(),
            onRelease : () => Na__ViewportPoints__Cleanup()
        });
        if (listHome) listHome.appendChild(Na__EngineHost__PointList());
        Na__EngineHost__RefreshPoints();
        S.signature = Na__EngineHost__PointsSignature();
        S.shown = S.signature + S.camera;
        S.idle = 0;
        S.ready = false;
        S.poll = setInterval(() => Na__ViewportPoints__Poll(), Na__ViewportPoints__POLL_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop Editing: the engine goes back to the 3D Environment
    // ------------------------------------------------------------
    function Na__ViewportPoints__End() {
        if (Na__EngineHost__Borrowed()) Na__EngineHost__Release();              // <-- Its onRelease cleans up here
        else Na__ViewportPoints__Cleanup();
    }

    // The engine was given back (by this module or by the 3D Environment's tab)
    function Na__ViewportPoints__Cleanup() {
        const S = Na__ViewportPoints__State;
        if (S.poll) clearInterval(S.poll);
        S.poll = 0;
        if (S.stand) S.stand.remove();
        if (S.layer) S.layer.remove();
        S.stand = null;
        S.layer = null;
        const id = S.viewportId;
        S.viewportId = null;
        S.ready = false;
        Na__ViewportPoints__MarkArmed(null);
        if (!id) return;
        Na__RenderQueue__SetPreview(id, null);
        Na__RenderQueue__Pause(Na__AppState__Data.tab === 'environment');       // <-- On a sheet the stills carry on
        if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports');   // <-- Its still is drawn again, with its points as they are
    }
    // ------------------------------------------------------------


    // FUNCTION | Lay the Editor Over the Picture (after a move, a resize, a zoom, a pan)
    // ------------------------------------------------------------
    // The stand-in and the layer cover the engine's whole sheet as the
    // viewport places it on the paper (Na__Views__PictureRect), in the wrapper's
    // pixels. A new camera (a pan, a scale, a side) is sent to the engine.
    // ------------------------------------------------------------
    function Na__ViewportPoints__Place() {
        const S = Na__ViewportPoints__State;
        if (!S.stand) return;
        const viewport = Na__ViewportPoints__Viewport();
        const { svg } = Na__Surface__Current();
        if (!viewport || !svg || !svg.isConnected) return;
        const m = svg.getScreenCTM();
        if (!m) return;
        const r = Na__Views__PictureRect(viewport);
        const box = S.stand.parentElement.getBoundingClientRect();
        const a = new DOMPoint(r.X, r.Y).matrixTransform(m);
        const b = new DOMPoint(r.X + r.WidthMm, r.Y + r.HeightMm).matrixTransform(m);
        [S.stand, S.layer].forEach((el) => Object.assign(el.style, {
            left: `${a.x - box.left}px`, top: `${a.y - box.top}px`, width: `${b.x - a.x}px`, height: `${b.y - a.y}px`
        }));
        const camera = Na__Views__Camera(viewport, Na__AppState__Data.doc);
        const json = camera ? JSON.stringify(camera) : '';
        if (camera && json !== S.camera && Na__EngineHost__Borrowed()) {
            S.camera = json;
            S.ready = false;
            Na__EngineHost__BorrowCamera(camera);
        }
        if (Na__EngineHost__Borrowed()) Na__EngineHost__RedrawPointOverlay();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look at the Borrowed Drawing: once still, a new preview for the picture
    // ------------------------------------------------------------
    // Still for two looks in a row (the engine's refine has finished, not yet
    // begun is too short to pass for it): the viewport's drawing is ready for a
    // dropped point to anchor, and if the points or the camera changed since
    // the last preview, the engine's canvas becomes the viewport's picture.
    // ------------------------------------------------------------
    function Na__ViewportPoints__Poll() {
        const S = Na__ViewportPoints__State;
        if (!Na__EngineHost__Borrowed() || !S.viewportId) return;
        if (Na__EngineHost__Busy()) { S.idle = 0; return; }
        if (++S.idle < 2) return;
        S.ready = true;
        const now = Na__EngineHost__PointsSignature() + S.camera;
        if (now === S.shown) return;
        S.shown = now;
        const canvas = Na__EngineHost__LiveCanvas();
        const id = S.viewportId;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob || S.viewportId !== id || !Na__EngineHost__Borrowed()) return;
            Na__RenderQueue__SetPreview(id, URL.createObjectURL(blob), true);
            Na__Surface__RedrawLayer('viewports');
        }, 'image/webp', 0.9);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placing and Keys
// -----------------------------------------------------------------------------

    // FUNCTION | Arm a Point Type (null disarms): the next click on the picture places it
    // ------------------------------------------------------------
    function Na__ViewportPoints__Arm(type) {
        if (type && Na__EngineHost__Points().length >= Na__EngineHost__MaxPoints()) {
            Na__Toast__Show(`A view holds ${Na__EngineHost__MaxPoints()} points at most: remove one to add another.`);
            type = null;
        }
        Na__ViewportPoints__MarkArmed(Na__EngineHost__Borrowed() ? Na__EngineHost__ArmPoint(type) : null);
    }

    function Na__ViewportPoints__MarkArmed(armed) {
        const S = Na__ViewportPoints__State;
        S.typeButtons.forEach((b) => {
            const on = b.dataset.pointType === armed;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (S.stand) S.stand.classList.toggle('is-placing', !!armed);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Press on the Picture While a Type Is Armed: place it there
    // ------------------------------------------------------------
    // Taken whole, so the sheet neither selects nor moves anything under it.
    // ------------------------------------------------------------
    function Na__ViewportPoints__OnPlace(e) {
        const S = Na__ViewportPoints__State;
        if (e.button !== 0 || !Na__EngineHost__ArmedPoint()) return;
        e.preventDefault();
        e.stopPropagation();
        if (!S.ready) { Na__Toast__Show('One moment: the view is still being drawn, so the point can find what it lands on.'); return; }
        const placed = Na__EngineHost__PlacePoint(e);
        Na__ViewportPoints__MarkArmed(null);
        if (placed && placed.full) Na__Toast__Show(`A view holds ${Na__EngineHost__MaxPoints()} points at most.`);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Keys, Ahead of the Sheet's: Escape disarms; the selected point's are the engine's
    // ------------------------------------------------------------
    function Na__ViewportPoints__OnKey(e) {
        const S = Na__ViewportPoints__State;
        if (!S.viewportId || !Na__EngineHost__Borrowed() || Na__AppState__Data.tab === 'environment') return;
        const active = document.activeElement;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test((active && active.tagName) || '') || (active && active.isContentEditable)) return;
        if (e.key === 'Escape' && Na__EngineHost__ArmedPoint()) {
            e.preventDefault();
            e.stopPropagation();
            Na__ViewportPoints__Arm(null);
            return;
        }
        if (Na__EngineHost__PointKey(e)) {
            e.preventDefault();
            e.stopPropagation();                                               // <-- Delete is the point's here, never the viewport's
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Panel Section
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Selected Viewport's Art Direction Points Section
    // ------------------------------------------------------------
    // section: the Na__Panels__Section it fills (its fold lends the engine or
    // gives it back: Na__ViewportPoints__SetOpen).
    // ------------------------------------------------------------
    function Na__ViewportPoints__Panel(section, viewport) {
        const S = Na__ViewportPoints__State;
        const doc = Na__AppState__Data.doc;
        const body = section.body;
        S.section = section;
        const owner = Na__Views__PointsOwner(viewport, doc);
        body.appendChild(Na__Dom__El('p', 'aura-points__owner', owner.View
            ? `The points of the saved view "${owner.View.View__Name}": the 3D Environment edits the same set, and every sheet showing it draws with them.`
            : 'This viewport\'s own points.'));

        const types = Na__Dom__El('div', 'aura-points__types', null, { role: 'group', 'aria-label': 'Add an art direction point' });
        S.typeButtons = Na__EngineHost__PointTypes().map((t) => {
            const b = Na__Dom__El('button', 'aura-points__type', null, { type: 'button', 'aria-pressed': 'false', dataset: { pointType: t.Key },
                                                                         title: `Add ${t.Label.toLowerCase()}: press, then click the picture where it should act` });
            b.appendChild(Na__Dom__El('span', 'aura-points__glyph', t.Glyph, { 'aria-hidden': 'true' }));
            b.appendChild(Na__Dom__El('span', 'aura-points__label', t.Label));
            b.addEventListener('click', () => Na__ViewportPoints__Arm(Na__EngineHost__ArmedPoint() === t.Key ? null : t.Key));
            types.appendChild(b);
            return b;
        });
        body.appendChild(types);

        const listHome = Na__Dom__El('div', 'aura-points');
        body.appendChild(listHome);
        body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'While this section is open the points are edited on the picture, which shows the drawing as it '
                                                         + 'refines. Fold it, or select something else, and the view is drawn again in full.'));
        S.listHome = listHome;
        Na__ViewportPoints__ShowCount(viewport);
        if (section.IsOpen()) Na__ViewportPoints__Begin(viewport, listHome);
        else Na__ViewportPoints__End();
        Na__ViewportPoints__MarkArmed(Na__EngineHost__Borrowed() ? Na__EngineHost__ArmedPoint() : null);   // <-- Drawn again mid-placing: the type stays lit
    }

    // The section folded or opened
    function Na__ViewportPoints__SetOpen(open, viewport) {
        if (open && viewport) Na__ViewportPoints__Begin(viewport, Na__ViewportPoints__State.listHome);
        else Na__ViewportPoints__End();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Join the Sheet: its selection, its tab, its zoom, its keys (once)
    // ------------------------------------------------------------
    // A press on the sheet itself lets the point being edited go, as a click on
    // bare drawing does in the 3D Environment (the press carries on to the sheet).
    // ------------------------------------------------------------
    function Na__ViewportPoints__Mount() {
        const S = Na__ViewportPoints__State;
        if (S.mounted) return;
        S.mounted = true;
        Na__AppState__On('select', (sel) => { if (!sel || sel.kind !== 'viewport' || sel.id !== S.viewportId) Na__ViewportPoints__End(); });
        Na__AppState__On('tab', () => Na__ViewportPoints__End());
        Na__AppState__On('restored', () => Na__ViewportPoints__End());          // <-- An undo or redo: the points start again from the document
        document.addEventListener('keydown', (e) => Na__ViewportPoints__OnKey(e), true);
        const { desk, svg } = Na__Surface__Elements();
        if (desk) desk.addEventListener('pointerdown', (e) => {
            if (e.button === 0 && S.viewportId && !Na__EngineHost__ArmedPoint() && svg && svg.contains(e.target)) Na__EngineHost__DeselectPoint();
        }, true);
        if (svg && window.ResizeObserver) new ResizeObserver(() => Na__ViewportPoints__Place()).observe(svg);   // <-- The zoom resizes the sheet
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportPoints__Mount,
        Na__ViewportPoints__Panel,
        Na__ViewportPoints__SetOpen,
        Na__ViewportPoints__Place,
        Na__ViewportPoints__End
    };

// endregion -------------------------------------------------------------------
