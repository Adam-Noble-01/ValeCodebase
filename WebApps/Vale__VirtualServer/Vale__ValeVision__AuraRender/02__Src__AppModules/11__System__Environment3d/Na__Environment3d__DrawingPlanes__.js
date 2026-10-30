// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - DRAWING PLANES
// =============================================================================
//
// FILE       : Na__Environment3d__DrawingPlanes__.js
// NAMESPACE  : Na__DrawingPlanes
// MODULE     : 3D Environment - Drawing Planes
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The elevations' and the roof plan's planes over the live drawing,
//              each standing where its drawing is cut, dragged along its own
//              normal and snapped to a world grid
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - TRUEVISION 3D'S DRAWING PLANES (Adam, 30-Oct-2026: "show elevation camera
//   planes, switches on the elevation camera planes alowing you to reposition
//   them, look at the way these kinds of plan and section planes work in
//   TrueVision 3D AND COPY THAT FUINCTIONALITY"), after its
//   47__System__DrawingPlanes (TrueVision__PLAN__DrawingPlanes__.md):
//   - THE PLANE: a faint face and a solid outline in its one colour, the
//     scene's name in capitals in a boxed tab inside its top-left corner, a
//     boxed plus inside each of the other three corners (the grips), and an
//     arrow from each corner the way the drawing looks (down, for the plan).
//   - ONE COLOUR A PLANE, chosen from the scene's own id, so deleting a scene
//     never recolours the rest; its row in the Cameras section has the same.
//   - SIZED FROM THE BUILDING, never the garden: its span across the view plus
//     an overshoot (the larger of 1.5 m and 8 % of its longer side) where the
//     grips sit clear of the building; an elevation's foot 100 mm above the
//     building's lowest point, its head the overshoot over its highest.
//   - DRAGGED BY A GRIP OR ITS NAME, ALONG ITS OWN NORMAL ONLY: the point on
//     the normal nearest the pointer's ray (Na__AppUtils__PlaneMaths__). With
//     the normal within 6 degrees of the camera the plane holds still and the
//     readout asks for another angle. Snapped on the ABSOLUTE world grid, never
//     by the distance dragged. Escape puts it back.
//   - NUMBERS STAY THE DEFINITION: a drag writes the scene's cut (View__CutM)
//     when it is let go, and nothing else; every viewport of the scene
//     follows, and undo takes it back.
// - THE CUT IS THE DRAWING: nothing in front of the plane is drawn (the camera
//   stands at it: Na__Views__ApplyCut). A scene never cut (Adam's call: "Not
//   cut until moved") has its plane waiting, dashed, an overshoot in front of
//   the building, NOT CUT on its tab; the first drag cuts it there.
// - NEVER IN A DRAWING: an SVG layer over the canvas, not part of the engine,
//   so no still, viewport or export can hold one. One switch shows them all
//   (Adam's pick, no eye per plane), and it is not remembered.
// - DRAWN OVER THE ENGINE'S DRAWING through the engine's own projection
//   (Na__EngineHost__ProjectWorld), not in a 3D scene as TrueVision's are, so
//   the building never stands in front of a plane: the face is faint and the
//   outline carries it. In an elevation or the plan a plane seen square on
//   would cover the drawing and cannot be dragged, so it is left out there.
//   Grips are a fixed size on screen, not in metres.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.6)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__Svg, Na__Dom__Clear, Na__Dom__SVG_NS } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import {
        Na__PlaneMath__ApplySnap, Na__PlaneMath__FormatMm, Na__PlaneMath__NearestInList, Na__PlaneMath__ClosestParamOnAxis,
        Na__PlaneMath__IsAxisTooSteep
    } from '../03__AppUtils/Na__AppUtils__PlaneMaths__.js';
    import {
        Na__EngineHost__ProjectWorld, Na__EngineHost__PointerRay, Na__EngineHost__Camera, Na__EngineHost__BuildingBounds,
        Na__EngineHost__Borrowed
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Views__IsScaled, Na__Views__SceneNormal, Na__Views__CutM, Na__Views__SetCut } from '../21__System__Viewports/Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | What the Config Gives, Else These (AuraConfig__Cameras__Plane*)
    // ------------------------------------------------------------
    const Na__DrawingPlanes__DEFAULTS = {
        Snap   : { EnabledByDefault: true, DefaultIncrementMm: 50, IncrementsMm: [10, 25, 50, 100, 250, 500] },
        Bounds : { OvershootM: 1.5, OvershootFraction: 0.08, GroundLiftM: 0.1, MinHeightM: 1 },
        Look   : { Palette: ['#2e7d4f', '#1f6fd1', '#d9731a', '#7b3fb8', '#0e8f8a', '#c2277a', '#8a6d1c', '#c0392b'],
                   FillOpacity: 0.07, FillOpacityActive: 0.16, FillOpacityUncut: 0.04, OutlineWidthPx: 2, OutlineWidthActivePx: 3.5,
                   GripPx: 16, ArrowLengthFraction: 0.12, ArrowLengthMinM: 1, ArrowLengthMaxM: 3 },
        Drag   : { MinAxisAngleDeg: 6 }
    };
    const Na__DrawingPlanes__NEAR_M     = 0.25;                                 // <-- Clipped this far in front of a perspective eye, past the engine's own 0.2 m
    const Na__DrawingPlanes__SNAP_STORE = 'AuraRender.PlaneSnap';               // <-- This viewer's snap, as TrueVision keeps its own
    const Na__DrawingPlanes__DEG        = Math.PI / 180;
    // ------------------------------------------------------------


    // MODULE STATE | The Layer, the Switch, the Snap, a Drag
    // ------------------------------------------------------------
    const Na__DrawingPlanes__State = {
        svg      : null,                         // <-- The layer over the canvas
        canvas   : null,
        shown    : false,                        // <-- The one switch (Cameras section): never remembered
        key      : '',                           // <-- What was last drawn: drawn again only when it changes
        tick     : 0,                            // <-- The watch's frame, while shown
        hover    : null,                         // <-- The scene whose plane is under the pointer
        drag     : null,                         // <-- { SceneId, PointerId, StartM, Param0, Origin, Normal, ValueM, Moved, Steep, X, Y (the pointer over the layer) }
        snap     : null,                         // <-- { enabled, incrementMm }
        listeners: []                            // <-- Told when a plane is moved or the switch changes: (scene | null) => {}
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config, Colours and the Snap
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Group of the Config, Over Its Defaults
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Cfg(group) {
        return Object.assign({}, Na__DrawingPlanes__DEFAULTS[group], Na__AppConfig__Get(`Cameras__Plane${group}`, {}) || {});
    }
    // ------------------------------------------------------------


    // FUNCTION | The Scenes With a Plane: the elevations and the roof plan, in the tabs' order
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Scenes(doc) {
        return ((doc || Na__AppState__Data.doc || {}).AuraDrawingSet__SavedViews || []).filter((s) => Na__Views__IsScaled(s));
    }
    // ------------------------------------------------------------


    // FUNCTION | Each Plane's Colour: Map sceneId -> colour
    // ------------------------------------------------------------
    // TrueVision indexes its palette by the record's own id number, so a
    // deletion never recolours the others. A scene's id is a string: hashed,
    // then the next free colour when two land on one (until all are used).
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Colours(scenes) {
        const palette = Na__DrawingPlanes__Cfg('Look').Palette;
        const out = new Map();
        let taken = new Set();
        scenes.forEach((scene) => {
            let h = 2166136261;
            for (const ch of String(scene.View__Id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
            let i = (h >>> 0) % palette.length;
            for (let k = 0; k < palette.length && taken.has(i); k++) i = (i + 1) % palette.length;
            taken.add(i);
            out.set(scene.View__Id, palette[i]);
            if (taken.size >= palette.length) taken = new Set();
        });
        return out;
    }

    function Na__DrawingPlanes__Colour(sceneId) {
        return Na__DrawingPlanes__Colours(Na__DrawingPlanes__Scenes()).get(sceneId) || Na__DrawingPlanes__Cfg('Look').Palette[0];
    }
    // ------------------------------------------------------------


    // FUNCTION | The Snap: { enabled, incrementMm }, This Viewer's Last Choice Else the Config's
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Snap() {
        const S = Na__DrawingPlanes__State;
        if (S.snap) return Object.assign({}, S.snap);
        const cfg = Na__DrawingPlanes__Cfg('Snap');
        let saved = null;
        try { saved = JSON.parse(window.localStorage.getItem(Na__DrawingPlanes__SNAP_STORE) || 'null'); } catch (error) { saved = null; }
        S.snap = {
            enabled     : saved && typeof saved.enabled === 'boolean' ? saved.enabled : cfg.EnabledByDefault !== false,
            incrementMm : Na__PlaneMath__NearestInList(cfg.IncrementsMm, Number(saved && saved.incrementMm) || cfg.DefaultIncrementMm)   // <-- Back onto the list if it has changed
        };
        return Object.assign({}, S.snap);
    }

    function Na__DrawingPlanes__SetSnap(snap) {
        const S = Na__DrawingPlanes__State;
        const cfg = Na__DrawingPlanes__Cfg('Snap');
        const now = Na__DrawingPlanes__Snap();
        S.snap = {
            enabled     : snap && typeof snap.enabled === 'boolean' ? snap.enabled : now.enabled,
            incrementMm : Na__PlaneMath__NearestInList(cfg.IncrementsMm, Number(snap && snap.incrementMm) || now.incrementMm)
        };
        try { window.localStorage.setItem(Na__DrawingPlanes__SNAP_STORE, JSON.stringify(S.snap)); }
        catch (error) { /* a blocked store: the snap still works, it is just not remembered */ }
        return Object.assign({}, S.snap);
    }

    function Na__DrawingPlanes__Increments() {
        return Na__DrawingPlanes__Cfg('Snap').IncrementsMm.slice();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Plane in the World
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Vectors
    // ------------------------------------------------------------
    const Na__DrawingPlanes__Dot  = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const Na__DrawingPlanes__Lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    // ------------------------------------------------------------


    // FUNCTION | The Building's Bounds (the planes are sized from it, never the garden)
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Bounds() {
        return Na__EngineHost__BuildingBounds() || { Min: [-5, 0, -4], Max: [5, 7, 4] };   // <-- No building: a cottage-sized box, so the planes still show
    }
    // ------------------------------------------------------------


    // FUNCTION | A Scene's Plane: { Scene, Normal, CutM, Uncut, PositionM, Corners [TL, TR, BR, BL], Centre, ArrowM }
    // ------------------------------------------------------------
    // Laid out in the plane's own frame, as TrueVision's are: u along the view's
    // right, v up the drawing (the plan's up is the rear, -Z), both square to
    // the normal, so every corner lies on the plane. positionM: a drag's value
    // in place of the scene's own.
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Plane(scene, bounds, positionM) {
        const B = Na__DrawingPlanes__Cfg('Bounds');
        const L = Na__DrawingPlanes__Cfg('Look');
        const n = Na__Views__SceneNormal(scene);
        const plan = scene.View__Kind === 'Plan';
        const u = plan ? [1, 0, 0] : [n[2], 0, -n[0]];                         // <-- The view's right, as a viewport's pan reads it
        const v = plan ? [0, 0, -1] : [0, 1, 0];
        const b = bounds;
        const corners = [];
        [b.Min[0], b.Max[0]].forEach((x) => [b.Min[1], b.Max[1]].forEach((y) => [b.Min[2], b.Max[2]].forEach((z) => corners.push([x, y, z]))));
        const range = (axis) => corners.reduce((r, c) => { const d = Na__DrawingPlanes__Dot(c, axis); return [Math.min(r[0], d), Math.max(r[1], d)]; }, [Infinity, -Infinity]);
        const span = Math.max(b.Max[0] - b.Min[0], b.Max[2] - b.Min[2]);
        const over = Math.max(B.OvershootM, B.OvershootFraction * span);
        const ru = range(u), rv = range(v), rn = range(n);
        const cut = Na__Views__CutM(scene);
        const position = Number.isFinite(positionM) ? positionM : cut !== null ? cut : rn[1] + over;   // <-- Never cut: it waits an overshoot in front of the building
        const u0 = ru[0] - over, u1 = ru[1] + over;
        const v0 = plan ? rv[0] - over : b.Min[1] + B.GroundLiftM;
        const v1 = plan ? rv[1] + over : Math.max(v0 + B.MinHeightM, b.Max[1] + over);
        const at = (a, c) => [0, 1, 2].map((i) => n[i] * position + u[i] * a + v[i] * c);
        return {
            Scene     : scene,
            Normal    : n,
            CutM      : cut,
            Uncut     : cut === null && !Number.isFinite(positionM),
            PositionM : position,
            Corners   : [at(u0, v1), at(u1, v1), at(u1, v0), at(u0, v0)],
            Centre    : at((u0 + u1) / 2, (v0 + v1) / 2),
            ArrowM    : Math.min(L.ArrowLengthMaxM, Math.max(L.ArrowLengthMinM, L.ArrowLengthFraction * span))
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Over the Canvas
// -----------------------------------------------------------------------------

    // FUNCTION | Draw Every Plane (only when shown, on the 3D Environment, with the engine at home)
    // ------------------------------------------------------------
    // The plane being dragged or under the pointer is drawn last, on top.
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Draw() {
        const S = Na__DrawingPlanes__State;
        if (!S.svg) return;
        Na__Dom__Clear(S.svg);
        const doc = Na__AppState__Data.doc;
        const visible = S.shown && !!doc && Na__AppState__Data.tab === 'environment' && !Na__EngineHost__Borrowed();
        S.svg.classList.toggle('is-shown', visible);
        S.svg.classList.toggle('is-dragging', visible && !!S.drag);
        if (!visible) return;
        const w = S.canvas.clientWidth, h = S.canvas.clientHeight;
        if (!w || !h) return;
        S.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

        const camera = Na__EngineHost__Camera().Camera;
        const yaw = camera.Yaw * Na__DrawingPlanes__DEG, pitch = camera.Pitch * Na__DrawingPlanes__DEG;
        const look = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];   // <-- The way the camera looks
        const squareOn = Math.cos(Na__DrawingPlanes__Cfg('Drag').MinAxisAngleDeg * Na__DrawingPlanes__DEG);
        const bounds = Na__DrawingPlanes__Bounds();
        const scenes = Na__DrawingPlanes__Scenes(doc);
        const colours = Na__DrawingPlanes__Colours(scenes);
        const active = S.drag ? S.drag.SceneId : S.hover;
        scenes.slice().sort((a, b) => (a.View__Id === active) - (b.View__Id === active)).forEach((scene) => {
            const plane = Na__DrawingPlanes__Plane(scene, bounds, S.drag && S.drag.SceneId === scene.View__Id ? S.drag.ValueM : undefined);
            if (camera.Mode === 'Ortho' && Math.abs(Na__DrawingPlanes__Dot(plane.Normal, look)) > squareOn) return;   // <-- Square on: it would cover the drawing
            Na__DrawingPlanes__DrawPlane(plane, colours.get(scene.View__Id), scene.View__Id === active, w, h);
        });
        if (S.drag) Na__DrawingPlanes__DrawReadout(w, h);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Plane: face, outline, arrows, grips, name tab
    // ------------------------------------------------------------
    // The face is clipped where it passes behind a perspective eye (in the
    // world, where depth is linear), then projected; a corner behind the eye
    // loses its grip or tab and its arrow.
    // ------------------------------------------------------------
    function Na__DrawingPlanes__DrawPlane(plane, colour, active, w, h) {
        const S = Na__DrawingPlanes__State;
        const L = Na__DrawingPlanes__Cfg('Look');
        const near = Na__DrawingPlanes__NEAR_M;
        const id = plane.Scene.View__Id;
        const corners = plane.Corners;
        const at = Na__EngineHost__ProjectWorld(corners);
        const kept = [];
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4, da = at[i].Depth, db = at[j].Depth;
            if (da >= near) kept.push(corners[i]);
            if ((da >= near) !== (db >= near)) kept.push(Na__DrawingPlanes__Lerp(corners[i], corners[j], (near - da) / (db - da)));
        }
        if (kept.length < 3) return;
        const face = Na__EngineHost__ProjectWorld(kept).map((p) => [p.U * w, p.V * h]);
        const points = face.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const cx = face.reduce((s, p) => s + p[0], 0) / face.length, cy = face.reduce((s, p) => s + p[1], 0) / face.length;

        const g = Na__Dom__Svg('g', { class: `aura-planes__plane${active ? ' is-active' : ''}${plane.Uncut ? ' is-uncut' : ''}` }, S.svg);
        Na__Dom__Svg('polygon', { class: 'aura-planes__face', points, fill: colour,
                                  'fill-opacity': active ? L.FillOpacityActive : plane.Uncut ? L.FillOpacityUncut : L.FillOpacity }, g);
        Na__Dom__Svg('polygon', { class: 'aura-planes__outline', points, fill: 'none', stroke: colour,
                                  'stroke-width': active ? L.OutlineWidthActivePx : L.OutlineWidthPx, 'stroke-dasharray': plane.Uncut ? '7 5' : null }, g);

        // Arrows: from each corner the way the drawing looks (into the building; down, for the plan)
        const ends = Na__EngineHost__ProjectWorld(corners.map((c) => c.map((v, i) => v - plane.Normal[i] * plane.ArrowM)));
        corners.forEach((c, i) => {
            if (at[i].Depth < near || ends[i].Depth < near) return;
            Na__DrawingPlanes__Arrow(g, [at[i].U * w, at[i].V * h], [ends[i].U * w, ends[i].V * h], colour);
        });

        // Inside a corner: toward the face's middle, by a little
        const inward = (x, y, px) => {
            const dx = cx - x, dy = cy - y, len = Math.hypot(dx, dy) || 1;
            const k = Math.min(px, len * 0.4) / len;
            return [x + dx * k, y + dy * k];
        };

        // Grips: a boxed plus inside the top-right, bottom-right and bottom-left corners
        const grip = L.GripPx;
        [1, 2, 3].forEach((i) => {
            if (at[i].Depth < near) return;
            const [x, y] = inward(at[i].U * w, at[i].V * h, grip * 0.9);
            const handle = Na__Dom__Svg('g', { class: 'aura-planes__grip', 'data-handle': 'grip', 'data-plane': id }, g);
            Na__Dom__Svg('rect', { x: x - grip / 2, y: y - grip / 2, width: grip, height: grip, rx: 2, class: 'aura-planes__pad', stroke: colour }, handle);
            Na__Dom__Svg('path', { d: `M${x - grip * 0.28} ${y}H${x + grip * 0.28}M${x} ${y - grip * 0.28}V${y + grip * 0.28}`, stroke: colour, class: 'aura-planes__plus' }, handle);
            Na__Dom__Svg('title', null, handle).textContent = `Drag to move the ${plane.Scene.View__Name} plane along its direction`;
        });

        // The name: a boxed tab inside the top-left corner, in capitals
        if (at[0].Depth >= near) {
            const x = at[0].U * w, y = at[0].V * h;
            const tab = Na__Dom__Svg('g', { class: 'aura-planes__tab', 'data-handle': 'name', 'data-plane': id }, g);
            const label = `${String(plane.Scene.View__Name).toUpperCase()}${plane.Uncut ? ' · NOT CUT' : ''}`;
            const rect = Na__Dom__Svg('rect', { rx: 2, class: 'aura-planes__pad', stroke: colour }, tab);
            const text = Na__Dom__Svg('text', { class: 'aura-planes__name', fill: colour }, tab);
            text.textContent = label;
            let tw = 0;
            try { tw = text.getComputedTextLength(); } catch (error) { tw = 0; }
            const bw = (tw || label.length * 6.4) + 12, bh = 18;
            const bx = cx >= x ? x + 4 : x - 4 - bw;                            // <-- Toward the middle of the face, whichever way it lies on screen
            const by = cy >= y ? y + 4 : y - 4 - bh;
            Object.entries({ x: bx, y: by, width: bw, height: bh }).forEach(([k, val]) => rect.setAttribute(k, val.toFixed(1)));
            text.setAttribute('x', (bx + 6).toFixed(1));
            text.setAttribute('y', (by + 12.6).toFixed(1));
            Na__Dom__Svg('title', null, tab).textContent = `${plane.Scene.View__Name}: drag to move its plane${plane.Uncut ? '. Not cut yet: the first move cuts it' : ''}`;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Arrow From a to b on Screen
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Arrow(parent, a, b, colour) {
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 6) return;                                                     // <-- Pointing at the camera: nothing to see
        const ux = dx / len, uy = dy / len, head = Math.min(8, len * 0.45);
        Na__Dom__Svg('line', { x1: a[0], y1: a[1], x2: b[0] - ux * head * 0.6, y2: b[1] - uy * head * 0.6, stroke: colour, class: 'aura-planes__arrow' }, parent);
        Na__Dom__Svg('path', { d: `M${b[0]} ${b[1]}L${b[0] - ux * head - uy * head * 0.5} ${b[1] - uy * head + ux * head * 0.5}`
                                 + `L${b[0] - ux * head + uy * head * 0.5} ${b[1] - uy * head - ux * head * 0.5}Z`, fill: colour, class: 'aura-planes__head' }, parent);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drag's Readout Beside the Pointer: the plane's position, or a better angle wanted
    // ------------------------------------------------------------
    function Na__DrawingPlanes__DrawReadout(w, h) {
        const S = Na__DrawingPlanes__State;
        const d = S.drag;
        const scene = Na__DrawingPlanes__Scenes().find((s) => s.View__Id === d.SceneId);
        if (!scene) return;
        const text = d.Steep ? 'Orbit round: this plane is facing you'
            : `${scene.View__Name}: ${Na__PlaneMath__FormatMm(d.ValueM * 1000)} mm${Na__DrawingPlanes__Snap().enabled ? '' : ' (free)'}`;
        const g = Na__Dom__Svg('g', { class: 'aura-planes__readout' }, S.svg);
        const rect = Na__Dom__Svg('rect', { rx: 3 }, g);
        const label = Na__Dom__Svg('text', null, g);
        label.textContent = text;
        let tw = 0;
        try { tw = label.getComputedTextLength(); } catch (error) { tw = 0; }
        const bw = (tw || text.length * 6.6) + 14, bh = 22;
        const bx = Math.max(4, Math.min(w - bw - 4, d.X + 16)), by = Math.max(4, Math.min(h - bh - 4, d.Y + 16));
        Object.entries({ x: bx, y: by, width: bw, height: bh }).forEach(([k, val]) => rect.setAttribute(k, val.toFixed(1)));
        label.setAttribute('x', (bx + 7).toFixed(1));
        label.setAttribute('y', (by + 15).toFixed(1));
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch While Shown: draw again when the camera, the size or a scene changes
    // ------------------------------------------------------------
    // Every camera move reaches the planes this way, from the navigation, a
    // scene tab, a preset, the lens or an undo, with no one having to say so.
    // Off the 3D Environment it stops; Redraw starts it again.
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Tick() {
        const S = Na__DrawingPlanes__State;
        S.tick = 0;
        if (!S.svg) return;
        if (!S.shown || Na__AppState__Data.tab !== 'environment') { Na__DrawingPlanes__Draw(); S.key = ''; return; }
        const scenes = Na__DrawingPlanes__Scenes().map((s) => [s.View__Id, s.View__Name, s.View__Kind, s.View__Side, s.View__CutM]);
        const key = JSON.stringify([Na__EngineHost__Camera().Camera, S.canvas.clientWidth, S.canvas.clientHeight, Na__EngineHost__Borrowed(),
                                    scenes, S.hover, S.drag && [S.drag.ValueM, S.drag.Steep, S.drag.X, S.drag.Y]]);
        if (key !== S.key) {
            S.key = key;
            Na__DrawingPlanes__Draw();
        }
        S.tick = requestAnimationFrame(Na__DrawingPlanes__Tick);
    }

    function Na__DrawingPlanes__Redraw() {
        const S = Na__DrawingPlanes__State;
        S.key = '';
        if (!S.tick) S.tick = requestAnimationFrame(Na__DrawingPlanes__Tick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dragging a Plane Along Its Normal
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Pointer's Ray, From a Pointer Event on the Canvas
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Ray(e) {
        const r = Na__DrawingPlanes__State.canvas.getBoundingClientRect();
        return Na__EngineHost__PointerRay((e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1));
    }
    // ------------------------------------------------------------


    // FUNCTION | Press a Grip or a Name: the drag starts from where the plane is
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Press(e) {
        const S = Na__DrawingPlanes__State;
        if (e.button !== 0 || S.drag) return;
        const handle = e.target && e.target.closest ? e.target.closest('[data-handle]') : null;
        const scene = handle ? Na__DrawingPlanes__Scenes().find((s) => s.View__Id === handle.dataset.plane) : null;
        if (!scene) return;
        e.preventDefault();
        e.stopPropagation();                                                     // <-- The plane's, never the navigation's
        const plane = Na__DrawingPlanes__Plane(scene, Na__DrawingPlanes__Bounds());
        const ray = Na__DrawingPlanes__Ray(e);
        const r = Na__PlaneMath__ClosestParamOnAxis(plane.Centre, plane.Normal, ray.Origin, ray.Dir);
        S.drag = {
            SceneId : scene.View__Id, PointerId: e.pointerId, StartM: plane.PositionM, Param0: r ? r.param : 0,
            Origin  : plane.Centre, Normal: plane.Normal, ValueM: plane.PositionM, Moved: false,
            Steep   : !r || Na__PlaneMath__IsAxisTooSteep(r.alignment, Na__DrawingPlanes__Cfg('Drag').MinAxisAngleDeg),
            X       : 0, Y: 0
        };
        Na__DrawingPlanes__Track(e);
        try { S.svg.setPointerCapture(e.pointerId); } catch (error) { /* a synthetic pointer */ }
        Na__DrawingPlanes__Redraw();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Pointer Is Over the Layer (for the readout)
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Track(e) {
        const S = Na__DrawingPlanes__State;
        const r = S.svg.getBoundingClientRect();
        S.drag.X = e.clientX - r.left;
        S.drag.Y = e.clientY - r.top;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move: the point on the normal nearest the pointer's ray, snapped on the world's grid
    // ------------------------------------------------------------
    // From where the drag began, by how far along the normal the pointer has
    // gone; the ABSOLUTE position is then snapped (TrueVision's rule). Too
    // square on to the camera, the plane holds where it is.
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Move(e) {
        const S = Na__DrawingPlanes__State;
        const d = S.drag;
        if (!d || e.pointerId !== d.PointerId) return;
        Na__DrawingPlanes__Track(e);
        const ray = Na__DrawingPlanes__Ray(e);
        const r = Na__PlaneMath__ClosestParamOnAxis(d.Origin, d.Normal, ray.Origin, ray.Dir);
        d.Steep = !r || Na__PlaneMath__IsAxisTooSteep(r.alignment, Na__DrawingPlanes__Cfg('Drag').MinAxisAngleDeg);
        if (!d.Steep) {
            const mm = Na__PlaneMath__ApplySnap((d.StartM + (r.param - d.Param0)) * 1000, Na__DrawingPlanes__Snap());
            if (mm / 1000 !== d.ValueM) { d.ValueM = mm / 1000; d.Moved = true; }
        }
        Na__DrawingPlanes__Redraw();
    }
    // ------------------------------------------------------------


    // FUNCTION | Let Go: the scene takes the cut (one undo step), or Escape / a cancel puts it back
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Release(e, keep) {
        const S = Na__DrawingPlanes__State;
        const d = S.drag;
        if (!d || (e && e.pointerId !== undefined && e.pointerId !== d.PointerId)) return;
        S.drag = null;
        try { S.svg.releasePointerCapture(d.PointerId); } catch (error) { /* already released */ }
        const scene = Na__DrawingPlanes__Scenes().find((s) => s.View__Id === d.SceneId);
        if (keep && d.Moved && scene) {
            Na__Views__SetCut(scene, d.ValueM);
            Na__AppState__Touch('views');                                        // <-- Saved, a step in the history, and every viewport of the scene follows
            Na__DrawingPlanes__Tell(scene);
        }
        Na__DrawingPlanes__Redraw();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pointer Over a Grip or a Name Lights Its Plane
    // ------------------------------------------------------------
    function Na__DrawingPlanes__SetHover(id) {
        const S = Na__DrawingPlanes__State;
        if (S.drag || S.hover === id) return;
        S.hover = id;
        Na__DrawingPlanes__Redraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount, the Switch and Listeners
// -----------------------------------------------------------------------------

    // FUNCTION | Lay the Planes' Layer Over the Canvas (under the art direction points)
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Mount(wrap, canvas) {
        const S = Na__DrawingPlanes__State;
        S.canvas = canvas;
        S.svg = document.createElementNS(Na__Dom__SVG_NS, 'svg');
        S.svg.setAttribute('class', 'aura-planes');
        S.svg.setAttribute('aria-hidden', 'true');
        canvas.after(S.svg);                                                     // <-- Before the point layer, which stays on top
        S.svg.addEventListener('pointerdown', Na__DrawingPlanes__Press);
        S.svg.addEventListener('pointermove', Na__DrawingPlanes__Move);
        S.svg.addEventListener('pointerup', (e) => Na__DrawingPlanes__Release(e, true));
        S.svg.addEventListener('pointercancel', (e) => Na__DrawingPlanes__Release(e, false));
        S.svg.addEventListener('lostpointercapture', (e) => Na__DrawingPlanes__Release(e, true));   // <-- A capture lost without its pointerup still lets go
        S.svg.addEventListener('pointerover', (e) => {
            const h = e.target && e.target.closest ? e.target.closest('[data-handle]') : null;
            Na__DrawingPlanes__SetHover(h ? h.dataset.plane : null);
        });
        S.svg.addEventListener('pointerout', (e) => {
            const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-handle]') : null;
            Na__DrawingPlanes__SetHover(to ? to.dataset.plane : null);
        });
        window.addEventListener('keydown', (e) => {                             // <-- Escape puts a dragged plane back, ahead of the navigation's keys
            if (!S.drag || e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            Na__DrawingPlanes__Release(null, false);
        }, true);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Switch: show every plane, or none
    // ------------------------------------------------------------
    function Na__DrawingPlanes__Show(on) {
        const S = Na__DrawingPlanes__State;
        S.shown = !!on;
        if (!S.shown) { S.hover = null; if (S.drag) Na__DrawingPlanes__Release(null, false); }
        Na__DrawingPlanes__Redraw();
        Na__DrawingPlanes__Tell(null);
        return S.shown;
    }

    function Na__DrawingPlanes__Shown() {
        return Na__DrawingPlanes__State.shown;
    }
    // ------------------------------------------------------------


    // FUNCTION | Listen for a Plane Moved (the scene) or the Switch (null)
    // ------------------------------------------------------------
    function Na__DrawingPlanes__OnChange(fn) {
        if (typeof fn === 'function') Na__DrawingPlanes__State.listeners.push(fn);
    }

    function Na__DrawingPlanes__Tell(scene) {
        Na__DrawingPlanes__State.listeners.forEach((fn) => { try { fn(scene); } catch (error) { console.error(error); } });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__DrawingPlanes__Mount,
        Na__DrawingPlanes__Show,
        Na__DrawingPlanes__Shown,
        Na__DrawingPlanes__Redraw,
        Na__DrawingPlanes__OnChange,
        Na__DrawingPlanes__Scenes,
        Na__DrawingPlanes__Colour,
        Na__DrawingPlanes__Snap,
        Na__DrawingPlanes__SetSnap,
        Na__DrawingPlanes__Increments
    };

// endregion -------------------------------------------------------------------
