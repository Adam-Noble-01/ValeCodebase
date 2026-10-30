// =============================================================================
// VALEVISION AURA - VIEWPORTS - ON THE SHEET
// =============================================================================
//
// FILE       : Na__Viewports__Editor__.js
// NAMESPACE  : Na__ViewportEditor
// MODULE     : Viewports - Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw a sheet's viewports (the engine's pictures, clipped to their
//              frames, with their titles), and let them be added, moved, resized,
//              panned and set up
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A SCALED VIEW (elevation, roof plan) shows the engine's still at its true
//   size (its A3 sheet since PainterlyNPR 0.8.3), centred in the frame; the frame crops it. Resizing a frame
//   crops more or less of the same drawing, which stays put on the sheet (its
//   centre in the world follows the frame's centre). Alt + drag inside it pans
//   the view. Its frame can be no larger than the engine's sheet. Both pans
//   are the viewport's own (Viewport__PanM): its scene stays where it is.
// - A 3D VIEW is a picture: it fills its frame, cropped to the frame's shape.
// - Drag a viewport to move it; drag a handle to resize it; Delete removes it.
// - The pictures come from the render queue; until one arrives its frame shows
//   "Drawing in pen and wash".
// - SCENES (SketchUp to LayOut, AURA 0.5.0): every viewport shows a scene,
//   picked in its panel (Scene) or made as it is added. The scene is what is
//   looked at, with its points; the viewport keeps its frame, scale, pen and
//   title. A viewport made from the 3D Environment's view makes a new scene
//   of the camera and its points. The point editor over a viewport's picture
//   (Na__Viewports__ArtDirection__) follows the frame as it moves and resizes.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.1.0 (AURA 0.5.5)
// - A picture drawn for its frame (the render queue's showMm): a scaled one at
//   its own size about the frame's middle, a perspective fitting the frame.
//   A viewport's last picture stands in, pale, while its new one is drawn.
//
// 30-Oct-2026 - Version 2.0.0 (AURA 0.5.0)
// - Scenes: Add finds or makes the viewport's scene; the panel's Scene picker
//   replaces the Side and View pickers (and 0.4.4's "Its own view"); Centre
//   lets the viewport's own pan go; Alt-drag and a resize pan the viewport
//   (Na__Views__Pan with the document).
//
// 30-Oct-2026 - Version 1.3.1 (AURA 0.4.3, landed after 0.4.4)
// - The scaled view's hint names the engine's own sheet (A3), read from it.
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.4.4)
// - A 3D viewport set from the 3D Environment shows "Its own view" in the View
//   picker; picking a preset or a saved view there lets its own camera go.
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.3.4)
// - The titles are handwritten (31__System__Handwriting/Na__Handwriting__
//   Lettering__: the lettering hand, the heavier pen), typed until written;
//   Adam: "Use handwriting in the titleblock and viewports not text".
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - The panel is the right panel's Viewport section (its title is the
//   section's); the 3D Environment's view is saved with its points; the
//   overlay lays the point editor back over the picture after every redraw.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Select, Na__AppState__Touch, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Svg, Na__Dom__Field, Na__Dom__Select, Na__Dom__IconButton } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clamp, Na__Format__Round } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__Presets, Na__EngineHost__Camera, Na__EngineHost__EnvironmentPoints, Na__EngineHost__SheetMm } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Paper__Solve, Na__Paper__ClampFrame } from '../20__System__DrawingSheets/Na__DrawingSheets__Paper__.js';
    import { Na__Surface__AddLayer, Na__Surface__AddOverlay, Na__Surface__On, Na__Surface__RedrawLayer, Na__Surface__RedrawOverlay, Na__Surface__PxPerMm } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import {
        Na__DrawingSet__NewViewport, Na__DrawingSet__NewScene, Na__DrawingSet__FindOrMakeScene, Na__DrawingSet__SceneName,
        Na__DrawingSet__DefaultScale, Na__DrawingSet__Viewport
    } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Views__IsScaled, Na__Views__Title, Na__Views__ScaleLabel, Na__Views__MaxScaledFrame, Na__Views__Pan, Na__Views__Scene, Na__Views__ScenesUsing } from './Na__Viewports__Views__.js';
    import { Na__RenderQueue__Picture, Na__RenderQueue__Request } from './Na__Viewports__RenderQueue__.js';
    import { Na__ViewportPoints__Place } from './Na__Viewports__ArtDirection__.js';
    import { Na__Lettering__Draw, Na__Lettering__Size } from '../31__System__Handwriting/Na__Handwriting__Lettering__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ViewportEditor__HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const Na__ViewportEditor__State = { failures: new Map() };                 // <-- viewport id -> the last drawing error

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Layer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Open Now and Its Selected Viewport
    // ------------------------------------------------------------
    function Na__ViewportEditor__Selected(sheet) {
        const sel = Na__AppState__Data.selection;
        return sel && sel.kind === 'viewport' ? Na__DrawingSet__Viewport(sheet, sel.id) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw One Viewport: its picture (or a placeholder), its frame, its title
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawOne(parent, defs, viewport, doc) {
        const f = viewport.Viewport__FrameMm;
        const id = viewport.Viewport__Id;
        const g = Na__Dom__Svg('g', { class: 'aura-vp', 'data-hit': 'viewport', 'data-id': id }, parent);
        const clip = Na__Dom__Svg('clipPath', { id: `aura-clip-${id}` }, defs);
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm }, clip);
        const inner = Na__Dom__Svg('g', { 'clip-path': `url(#aura-clip-${id})`, class: 'aura-vp__inner' }, g);
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, fill: 'transparent' }, inner);   // <-- Something to press while it draws (clear: the sheet's paper shows through)

        const picture = Na__RenderQueue__Picture(viewport, doc);
        const failure = Na__ViewportEditor__State.failures.get(id);
        if (picture) {
            const image = Na__Dom__Svg('image', {}, inner);
            if (Na__Views__IsScaled(viewport)) {                                // <-- True scale: the picture at its own size about the frame's middle
                const size = picture.showMm || Na__Views__MaxScaledFrame();      // <-- Drawn for its frame (PainterlyNPR 0.8.9 on), else the engine's whole sheet
                const cx = f.X + f.WidthMm / 2, cy = f.Y + f.HeightMm / 2;
                Object.entries({ x: cx - size.WidthMm / 2, y: cy - size.HeightMm / 2, width: size.WidthMm, height: size.HeightMm, preserveAspectRatio: 'none' })
                      .forEach(([k, v]) => image.setAttribute(k, String(v)));
            } else {                                                             // <-- Drawn for its frame it fits it exactly; the whole sheet (or a stand-in) is sliced into it
                Object.entries({ x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, preserveAspectRatio: 'xMidYMid slice' })
                      .forEach(([k, v]) => image.setAttribute(k, String(v)));
            }
            image.setAttribute('href', picture.url);
            image.setAttribute('class', picture.stale ? 'aura-vp__picture aura-vp__picture--stale' : 'aura-vp__picture');
        } else {
            Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-vp__placeholder' }, inner);
            const words = Na__Dom__Svg('text', { x: f.X + f.WidthMm / 2, y: f.Y + f.HeightMm / 2, 'text-anchor': 'middle', class: 'aura-vp__placeholder-text',
                                                 'font-size': Na__Format__Clamp(Math.min(f.WidthMm, f.HeightMm) / 12, 2.5, 6) }, inner);
            words.textContent = failure ? 'This view could not be drawn' : 'Drawing in pen and wash...';
        }
        if ((!picture || picture.stale) && !failure) {                         // <-- Missing, or its last picture standing in: draw the new one
            Na__RenderQueue__Request(viewport, doc, (pic, error) => {
                if (error) Na__ViewportEditor__State.failures.set(id, error.message || String(error));
                else Na__ViewportEditor__State.failures.delete(id);
                if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports');
            });
        }
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-vp__frame' }, g);

        if (viewport.Viewport__ShowTitle !== false) {                           // <-- Written by hand (the lettering), typed until written (AURA 0.3.4)
            const size = Na__AppConfig__Get('Viewport__TitleSizeMm', 4);
            const gap = Na__AppConfig__Get('Viewport__TitleGapMm', 3);
            const y = f.Y + f.HeightMm + gap + size;
            const title = Na__Views__Title(viewport, doc);
            const scale = Na__Views__ScaleLabel(viewport);
            const typed = () => {
                const text = Na__Dom__Svg('text', { x: f.X, y, 'font-size': size, class: 'aura-vp__title' }, g);
                const name = Na__Dom__Svg('tspan', { 'font-weight': 600 }, text);
                name.textContent = title;
                if (scale) {
                    const s = Na__Dom__Svg('tspan', { dx: size * 0.8, 'font-weight': 400, class: 'aura-vp__scale' }, text);
                    s.textContent = scale;
                }
            };
            Na__Lettering__Draw(g, {
                Text     : [title, scale].filter(Boolean).join(' '),
                X        : f.X,
                Y        : f.Y + f.HeightMm + gap,
                WidthMm  : Math.max(f.WidthMm, 80),                             // <-- A title may run past a narrow frame, as the typed one did
                SizeMm   : Na__Lettering__Size(size),
                OneLine  : true,
                PenKey   : Na__AppConfig__Get('Handwriting__Lettering', {}).EmphasisPen,   // <-- The heavier pen: the typed title was bold
                Colour   : '#111111',
                Channel  : 'viewports'
            }, typed, () => { if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports'); });
        }
        return g;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Viewports Layer
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawLayer(group, sheet) {
        const defs = Na__Dom__Svg('defs', {}, group);
        (sheet.Sheet__Viewports || []).forEach((v) => Na__ViewportEditor__DrawOne(group, defs, v, Na__AppState__Data.doc));
        Na__ViewportPoints__Place();                                             // <-- A pan or a new scale gives the point editor a new camera
    }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Viewport's Handles (the overlay)
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawOverlay(group, sheet) {
        Na__ViewportPoints__Place();                                             // <-- The point editor over a picture follows it
        const viewport = Na__ViewportEditor__Selected(sheet);
        if (!viewport) return;
        const f = viewport.Viewport__FrameMm;
        const k = 1 / Na__Surface__PxPerMm();                                    // <-- Millimetres per screen pixel: handles keep their size on screen
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-select-frame', 'stroke-width': 1.5 * k, 'pointer-events': 'none' }, group);
        const size = 9 * k;
        Na__ViewportEditor__HANDLES.forEach((h) => {
            const x = h.includes('w') ? f.X : h.includes('e') ? f.X + f.WidthMm : f.X + f.WidthMm / 2;
            const y = h.includes('n') ? f.Y : h.includes('s') ? f.Y + f.HeightMm : f.Y + f.HeightMm / 2;
            Na__Dom__Svg('rect', { x: x - size / 2, y: y - size / 2, width: size, height: size, class: `aura-handle aura-handle--${h}`,
                                   'stroke-width': 1.2 * k, 'data-hit': 'handle', 'data-owner': 'viewport', 'data-handle': h }, group);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer: Select, Move, Pan, Resize
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Being Edited (the workspace's)
    // ------------------------------------------------------------
    function Na__ViewportEditor__Sheet() {
        const d = Na__AppState__Data;
        return d.doc ? (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab) || null : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Viewport: select it, then move it (Alt pans a scaled view)
    // ------------------------------------------------------------
    function Na__ViewportEditor__OnPress(event, mm, element) {
        if (Na__AppState__Data.tool !== 'select') return null;
        const sheet = Na__ViewportEditor__Sheet();
        const viewport = Na__DrawingSet__Viewport(sheet, element.getAttribute('data-id'));
        if (!viewport) return null;
        Na__AppState__Select('viewport', viewport.Viewport__Id);
        const start = { X: mm.X, Y: mm.Y, frame: Object.assign({}, viewport.Viewport__FrameMm) };
        let moved = false;

        if (event.altKey && Na__Views__IsScaled(viewport)) {
            const image = element.querySelector('.aura-vp__picture');
            return {
                move(p) {
                    moved = true;
                    if (image) image.setAttribute('transform', `translate(${p.X - start.X} ${p.Y - start.Y})`);
                },
                end(p) {
                    if (!moved) return;
                    Na__Views__Pan(viewport, p.X - start.X, p.Y - start.Y, Na__AppState__Data.doc);
                    Na__AppState__Touch('viewport', sheet.Sheet__Id);
                    Na__Surface__RedrawLayer('viewports');
                }
            };
        }
        return {
            move(p) {
                moved = true;
                const frame = Na__Paper__ClampFrame(sheet, Object.assign({}, start.frame, { X: start.frame.X + p.X - start.X, Y: start.frame.Y + p.Y - start.Y }));
                viewport.Viewport__FrameMm.X = Na__Format__Round(frame.X, 1);
                viewport.Viewport__FrameMm.Y = Na__Format__Round(frame.Y, 1);
                element.setAttribute('transform', `translate(${viewport.Viewport__FrameMm.X - start.frame.X} ${viewport.Viewport__FrameMm.Y - start.frame.Y})`);
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                Na__AppState__Touch('viewport', sheet.Sheet__Id);
                Na__Surface__RedrawLayer('viewports');
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Handle: resize the frame (a scaled view keeps its drawing put)
    // ------------------------------------------------------------
    function Na__ViewportEditor__OnHandle(event, mm, element) {
        const sheet = Na__ViewportEditor__Sheet();
        const viewport = Na__ViewportEditor__Selected(sheet);
        if (!viewport) return null;
        const h = element.getAttribute('data-handle');
        const start = { X: mm.X, Y: mm.Y, frame: Object.assign({}, viewport.Viewport__FrameMm) };
        const min = Na__AppConfig__Get('Viewport__MinFrameMm', 20);
        const max = Na__Views__IsScaled(viewport) ? Na__Views__MaxScaledFrame() : { WidthMm: 2000, HeightMm: 2000 };
        let moved = false;
        return {
            move(p) {
                moved = true;
                const dx = p.X - start.X, dy = p.Y - start.Y, s = start.frame;
                let x0 = s.X, y0 = s.Y, x1 = s.X + s.WidthMm, y1 = s.Y + s.HeightMm;
                if (h.includes('w')) x0 = Na__Format__Clamp(x0 + dx, x1 - max.WidthMm, x1 - min);
                if (h.includes('e')) x1 = Na__Format__Clamp(x1 + dx, x0 + min, x0 + max.WidthMm);
                if (h.includes('n')) y0 = Na__Format__Clamp(y0 + dy, y1 - max.HeightMm, y1 - min);
                if (h.includes('s')) y1 = Na__Format__Clamp(y1 + dy, y0 + min, y0 + max.HeightMm);
                Object.assign(viewport.Viewport__FrameMm, { X: Na__Format__Round(x0, 1), Y: Na__Format__Round(y0, 1), WidthMm: Na__Format__Round(x1 - x0, 1), HeightMm: Na__Format__Round(y1 - y0, 1) });
                const clip = document.querySelector(`#aura-clip-${viewport.Viewport__Id} rect`);
                if (clip) ['x', 'y', 'width', 'height'].forEach((k, i) => clip.setAttribute(k, String([x0, y0, x1 - x0, y1 - y0][i])));
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                const f = viewport.Viewport__FrameMm, s = start.frame;
                if (Na__Views__IsScaled(viewport)) {
                    const dcx = (f.X + f.WidthMm / 2) - (s.X + s.WidthMm / 2), dcy = (f.Y + f.HeightMm / 2) - (s.Y + s.HeightMm / 2);
                    if (dcx || dcy) Na__Views__Pan(viewport, -dcx, -dcy, Na__AppState__Data.doc);   // <-- The frame's centre moved: the world under it follows, so the drawing stays put
                }
                Na__AppState__Touch('viewport', sheet.Sheet__Id);
                Na__Surface__RedrawLayer('viewports');
                Na__Surface__RedrawOverlay();
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Adding and Removing
// -----------------------------------------------------------------------------

    // FUNCTION | Add a Viewport to the Open Sheet, in the Middle of Its Drawing Space
    // ------------------------------------------------------------
    // sceneId: show that scene. Else a scene is found or made: kind 'Elevation'
    // (side), 'Plan' or 'Perspective' (preset, or live: true for a new scene of
    // the 3D Environment's camera and points).
    // ------------------------------------------------------------
    function Na__ViewportEditor__Add(options) {
        const sheet = Na__ViewportEditor__Sheet();
        const doc = Na__AppState__Data.doc;
        if (!sheet || !doc) return null;
        const o = Object.assign({}, options);
        const scene = Na__ViewportEditor__SceneFor(doc, o);
        o.sceneId = scene.View__Id;
        o.kind = scene.View__Kind;
        const solve = Na__Paper__Solve(sheet);
        const scaled = o.kind === 'Elevation' || o.kind === 'Plan';
        const space = { W: solve.Border.W - (solve.Title.Portrait ? 0 : solve.Title.Rect.W), H: solve.Border.H - (solve.Title.Portrait ? solve.Title.Rect.H : 0) };
        const w = Math.min(scaled ? 220 : 180, space.W - 20), h = Math.min(scaled ? 160 : 120, space.H - 20);
        const offset = (sheet.Sheet__Viewports.length % 5) * 8;                  // <-- A new one steps down and right of the last, so none hides another
        o.frame = Na__Paper__ClampFrame(sheet, { X: solve.Border.X + (space.W - w) / 2 + offset, Y: solve.Border.Y + (space.H - h) / 2 + offset, WidthMm: w, HeightMm: h });
        const viewport = Na__DrawingSet__NewViewport(o);
        sheet.Sheet__Viewports.push(viewport);
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__AppState__Select('viewport', viewport.Viewport__Id);
        Na__Surface__RedrawLayer('viewports');
        Na__Surface__RedrawOverlay();
        return viewport;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Scene a New Viewport Shows: the one named, a new one of the live camera, or one found or made
    // ------------------------------------------------------------
    function Na__ViewportEditor__SceneFor(doc, o) {
        const named = (doc.AuraDrawingSet__SavedViews || []).find((v) => v.View__Id === o.sceneId);
        if (named) return named;
        if (o.live) {
            const scene = Na__DrawingSet__NewScene({ name: Na__DrawingSet__SceneName(doc, 'Scene'), kind: 'Perspective', camera: Na__EngineHost__Camera().Camera, points: Na__EngineHost__EnvironmentPoints() });
            doc.AuraDrawingSet__SavedViews.push(scene);
            Na__AppState__Touch('views');
            return scene;
        }
        const preset = Na__EngineHost__Presets([o.preset || 'ThreeQuarter'])[0];
        const name = o.kind === 'Elevation' ? (Na__AppConfig__Get('Viewport__Elevations', []).find((e) => e.Key === o.side) || {}).Label
                   : o.kind === 'Plan' ? 'Roof Plan' : (preset ? preset.Label : '3D View');
        const scene = Na__DrawingSet__FindOrMakeScene(doc, { name: name || 'Scene', kind: o.kind, side: o.side, preset: o.preset });
        Na__AppState__Touch('views');
        return scene;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Point a Viewport at Another Scene (a new kind starts at its default scale and pen)
    // ------------------------------------------------------------
    function Na__ViewportEditor__ShowScene(viewport, scene) {
        if (viewport.Viewport__Kind !== scene.View__Kind) {
            viewport.Viewport__Kind = scene.View__Kind;
            viewport.Viewport__ScaleDenominator = scene.View__Kind === 'Perspective' ? null : Na__DrawingSet__DefaultScale(scene.View__Kind);
            viewport.Viewport__PlanKind = scene.View__Kind === 'Plan' ? 'RoofPlan' : null;
            viewport.Viewport__Profile = scene.View__Kind === 'Perspective' ? 'Concept' : 'Measured';
        }
        viewport.Viewport__SceneId = scene.View__Id;
        viewport.Viewport__PanM = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Selected Viewport
    // ------------------------------------------------------------
    function Na__ViewportEditor__Remove(viewport) {
        const sheet = Na__ViewportEditor__Sheet();
        if (!sheet || !viewport) return;
        sheet.Sheet__Viewports = sheet.Sheet__Viewports.filter((v) => v !== viewport);
        Na__AppState__Select(null);
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__Surface__RedrawLayer('viewports');
        Na__Surface__RedrawOverlay();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Viewport Panel
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Selected Viewport's Settings Into a Panel
    // ------------------------------------------------------------
    function Na__ViewportEditor__Panel(container, viewport) {
        const sheet = Na__ViewportEditor__Sheet();
        const doc = Na__AppState__Data.doc;
        const changed = (redrawPicture) => {
            Na__AppState__Touch('viewport', sheet.Sheet__Id);
            Na__Surface__RedrawLayer('viewports');
            Na__Surface__RedrawOverlay();
            if (redrawPicture) Na__ViewportEditor__State.failures.delete(viewport.Viewport__Id);
        };
        const kindLabel = { Elevation: 'Elevation (to scale)', Plan: 'Roof plan (to scale)', Perspective: '3D view' }[viewport.Viewport__Kind];
        container.appendChild(Na__Dom__El('p', 'aura-panel__note', kindLabel));          // <-- Its title is the section's

        const title = Na__Dom__El('input', 'aura-input', null, { type: 'text', maxlength: 80, placeholder: Na__Views__Title(Object.assign({}, viewport, { Viewport__Title: '' }), doc) });
        title.value = viewport.Viewport__Title || '';
        title.addEventListener('input', () => { viewport.Viewport__Title = title.value; changed(false); });
        container.appendChild(Na__Dom__Field('Title', title));

        const show = Na__Dom__El('input', null, null, { type: 'checkbox' });
        show.checked = viewport.Viewport__ShowTitle !== false;
        show.addEventListener('change', () => { viewport.Viewport__ShowTitle = show.checked; changed(false); });
        const showRow = Na__Dom__El('label', 'aura-check');
        showRow.appendChild(show);
        showRow.appendChild(Na__Dom__El('span', null, 'Show the title and scale under the view'));
        container.appendChild(showRow);

        // The scene it shows: any of the drawing set's, or a new one of the 3D Environment's view
        const scenes = (doc.AuraDrawingSet__SavedViews || []).map((v) => ({ value: v.View__Id, label: `${v.View__Name}${Na__Views__IsScaled(v) ? ' (to scale)' : ' (3D)'}` }));
        const current = Na__Views__Scene(viewport, doc);
        if (!current) scenes.unshift({ value: '', label: 'Its scene is gone: pick one' });
        const pick = Na__Dom__Select(scenes, current ? current.View__Id : '');
        pick.addEventListener('change', () => {
            const scene = (doc.AuraDrawingSet__SavedViews || []).find((v) => v.View__Id === pick.value);
            if (!scene) return;
            Na__ViewportEditor__ShowScene(viewport, scene);
            changed(true);
            container.dispatchEvent(new CustomEvent('aura-panel-refresh', { bubbles: true }));
        });
        container.appendChild(Na__Dom__Field('Scene', pick));
        const others = current ? Na__Views__ScenesUsing(doc, current.View__Id).length - 1 : 0;
        container.appendChild(Na__Dom__El('p', 'aura-panel__hint', others > 0
            ? `${others} other viewport${others === 1 ? ' shows' : 's show'} this scene. Change it in the 3D Environment (right-click its tab) and they all follow.`
            : 'Open its tab in the 3D Environment to change the scene; right-click the tab to update it from the camera.'));
        const live = Na__Dom__IconButton('camera', 'aura-button', 'New scene from the 3D Environment', 'Make a scene of the 3D Environment\'s camera and points as they are now, and show it here');
        live.addEventListener('click', () => {
            Na__ViewportEditor__ShowScene(viewport, Na__ViewportEditor__SceneFor(doc, { live: true }));
            changed(true);
            container.dispatchEvent(new CustomEvent('aura-panel-refresh', { bubbles: true }));
        });
        container.appendChild(live);

        if (Na__Views__IsScaled(viewport)) {
            const scales = Na__AppConfig__Get('Viewport__Scales', [50, 100]).map((d) => ({ value: d, label: `1:${d}` }));
            const scale = Na__Dom__Select(scales, viewport.Viewport__ScaleDenominator);
            scale.addEventListener('change', () => { viewport.Viewport__ScaleDenominator = Number(scale.value); changed(true); });
            container.appendChild(Na__Dom__Field('Scale', scale));
            const profile = Na__Dom__Select([{ value: 'Measured', label: 'Measured (a natural pen at most)' }, { value: 'Concept', label: 'Concept (the full discipline)' }], viewport.Viewport__Profile);
            profile.addEventListener('change', () => { viewport.Viewport__Profile = profile.value; changed(true); });
            container.appendChild(Na__Dom__Field('Pen', profile));
            const centre = Na__Dom__IconButton('fit', 'aura-button', 'Back to the scene\'s centre', 'Let this viewport\'s own pan go: the scene\'s centre in the middle of the frame');
            centre.addEventListener('click', () => { viewport.Viewport__PanM = null; changed(true); });
            container.appendChild(centre);
            const sheet = Na__EngineHost__SheetMm();
            container.appendChild(Na__Dom__El('p', 'aura-panel__hint', `Alt and drag inside the frame to pan this viewport only. A scaled view is at most ${sheet.WidthMm} x ${sheet.HeightMm} mm: the engine draws one sheet that size, its pen widths true on the paper.`));
        }

        const size = Na__Dom__El('div', 'aura-field-pair');
        ['WidthMm', 'HeightMm'].forEach((key) => {
            const max = Na__Views__IsScaled(viewport) ? Na__Views__MaxScaledFrame()[key] : 2000;
            const input = Na__Dom__El('input', 'aura-input aura-input--number', null, { type: 'number', min: Na__AppConfig__Get('Viewport__MinFrameMm', 20), max, step: 1 });
            input.value = Math.round(viewport.Viewport__FrameMm[key]);
            input.addEventListener('change', () => {
                const value = Na__Format__Clamp(Number(input.value) || 0, Na__AppConfig__Get('Viewport__MinFrameMm', 20), max);
                viewport.Viewport__FrameMm = Na__Paper__ClampFrame(sheet, Object.assign({}, viewport.Viewport__FrameMm, { [key]: value }));
                input.value = Math.round(viewport.Viewport__FrameMm[key]);
                changed(false);
            });
            size.appendChild(Na__Dom__Field(key === 'WidthMm' ? 'Width (mm)' : 'Height (mm)', input));
        });
        container.appendChild(size);

        const remove = Na__Dom__IconButton('trash', 'aura-button aura-button--danger', 'Delete viewport');
        remove.addEventListener('click', () => Na__ViewportEditor__Remove(viewport));
        container.appendChild(remove);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Join the Surface: the layer, the handles, the presses
    // ------------------------------------------------------------
    function Na__ViewportEditor__Mount() {
        Na__Surface__AddLayer('viewports', Na__ViewportEditor__DrawLayer);
        Na__Surface__AddOverlay(Na__ViewportEditor__DrawOverlay);
        Na__Surface__On('viewport', Na__ViewportEditor__OnPress);
        Na__Surface__On('handle:viewport', Na__ViewportEditor__OnHandle);
        Na__AppState__On('select', () => Na__Surface__RedrawOverlay());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportEditor__Mount,
        Na__ViewportEditor__Add,
        Na__ViewportEditor__Remove,
        Na__ViewportEditor__Panel,
        Na__ViewportEditor__Selected
    };

// endregion -------------------------------------------------------------------
