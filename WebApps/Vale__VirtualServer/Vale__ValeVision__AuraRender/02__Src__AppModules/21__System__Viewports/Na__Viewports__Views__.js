// =============================================================================
// VALEVISION AURA - VIEWPORTS - VIEWS AND SCALES
// =============================================================================
//
// FILE       : Na__Viewports__Views__.js
// NAMESPACE  : Na__Views
// MODULE     : Viewports - Views
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What a viewport looks at: its scene (an elevation, the roof plan
//              or a 3D view), the engine camera for it, how a viewport's scale
//              becomes a frame of the world, and how a drag on the sheet pans it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - SCENES, SKETCHUP TO LAYOUT (Adam, 30-Oct-2026): a viewport shows a scene
//   (Viewport__SceneId, a record of AuraDrawingSet__SavedViews). The scene
//   says what is looked at (kind, side, camera or preset, centre) and holds
//   the art direction points; the viewport says at what scale, with which pen
//   profile, in which frame. Update a scene and every viewport showing it
//   follows.
// - TRUE SCALE: the engine draws on its own sheet, A3 (420 x 297 mm) since
//   PainterlyNPR 0.8.3, read from it (SheetMm). An orthographic camera whose
//   half-height is (sheet height x scale / 2000) metres puts the world on that
//   sheet at exactly 1:scale (1:50 on A3 is a 7.425 m half-height, the engine's
//   own measured elevation). The still is placed on the AURA sheet at its true
//   size, centred in the frame, and the frame shows what lies inside it. A
//   scaled frame can therefore be no larger than the engine's sheet.
// - ELEVATIONS look square at a face: yaw 0 front (+Z), 90 right (+X), 180 rear,
//   -90 left; pitch 0. The ROOF PLAN looks straight down (pitch 89.9 so the
//   engine keeps world up), front of the building at the foot of the sheet.
//   Opened in the 3D Environment, a scaled scene is drawn at the scale of the
//   first viewport showing it (else the default), and its orientation is held
//   (SceneLock).
// - CENTRE: a scaled scene is centred on the building (its walls, roofs and
//   porch, not the garden) until it is moved (View__CentreM). A viewport's own
//   pan (an Alt-drag, a frame resized) is Viewport__PanM from there, so it
//   never moves the scene under another viewport.
// - PROFILE: Measured caps the drawing discipline at the engine's measured
//   elevation ceiling (a Natural Pen at most); Concept follows the discipline.
// - ART DIRECTION POINTS are the scene's, shared by every viewport showing it
//   and edited in the 3D Environment or on any sheet (Adam, 30-Oct-2026).
// - THE CUT (Adam, 30-Oct-2026: "we need to be able to adjust elevation cut
//   position"): a scaled scene's plane (View__CutM) is where its drawing is
//   taken from, TrueVision 3D's section plane: nothing in front of it is
//   drawn. It is one number, how far along the plane's normal (towards the
//   viewer) it sits from the world origin, in metres; a height for the roof
//   plan. The camera's eye stands just before it (ApplyCut), so the engine's
//   own near clip does the cutting. Null is not cut: the camera stands its
//   usual 60 m out, as before (Adam's call: "Not cut until moved").
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.2.0 (AURA 0.5.9)
// - Sun: the sun a viewport draws with, its scene's own (View__Sun), else the
//   drawing set's working sun, in the engine's form.
//
// 30-Oct-2026 - Version 2.1.0 (AURA 0.5.6)
// - The cut: SceneNormal, CutM, SetCut, ApplyCut (SceneCamera and Camera stand
//   the eye at it) and ScaledCentre (UpdateScene keeps a scaled scene's centre
//   at its own depth, so a cut's target never moves the scene).
//
// 30-Oct-2026 - Version 2.0.0 (AURA 0.5.0)
// - Scenes: Scene, SceneCamera, SceneLock, UpdateScene and ScenesUsing; Camera,
//   Title, Pan and the points read the viewport's scene. Pan takes the
//   document and moves the viewport's own Viewport__PanM. 0.4.4's OwnCamera,
//   Label and Set are gone (a viewport no longer keeps a camera of its own).
//
// 30-Oct-2026 - Version 1.2.1 (AURA 0.4.3, landed after 0.4.4)
// - Notes only: the engine's sheet is A3 (PainterlyNPR 0.8.3), read from it.
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.4.4)
// - A 3D viewport's own camera (Viewport__View.View__Camera) comes first in
//   Camera, and makes its points its own in PointsOwner. OwnCamera, Label,
//   SameCamera and Set (the 3D Environment's viewport strip).
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - PointsOwner, Points and SetPoints (whose points a viewport draws with),
//   and PictureRect (where the engine's whole sheet lies on the paper, for
//   the point handles over a viewport).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Scale } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__SheetMm, Na__EngineHost__BuildingBounds, Na__EngineHost__PresetCamera } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import {
        Na__DrawingSet__Scene, Na__DrawingSet__CameraToJson, Na__DrawingSet__CameraFromJson, Na__DrawingSet__CleanPoints,
        Na__DrawingSet__DefaultScale, Na__DrawingSet__SunToEngine, Na__DrawingSet__WorkingSun
    } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Kinds, Scenes and Labels
// -----------------------------------------------------------------------------

    // FUNCTION | Is This a Scaled (Orthographic) View? (a viewport, or a scene)
    // ------------------------------------------------------------
    function Na__Views__IsScaled(record) {
        const kind = record && (record.Viewport__Kind || record.View__Kind);
        return kind === 'Elevation' || kind === 'Plan';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Scene a Viewport Shows (null when it is gone)
    // ------------------------------------------------------------
    function Na__Views__Scene(viewport, doc) {
        return viewport ? Na__DrawingSet__Scene(doc, viewport.Viewport__SceneId) : null;
    }

    // Every viewport showing a scene: [{ Sheet, Viewport }]
    function Na__Views__ScenesUsing(doc, sceneId) {
        const out = [];
        (doc && doc.AuraDrawingSet__Sheets || []).forEach((sheet) => (sheet.Sheet__Viewports || []).forEach((viewport) => {
            if (viewport.Viewport__SceneId === sceneId) out.push({ Sheet: sheet, Viewport: viewport });
        }));
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Elevation's Definition by Side ({ Key, Label, YawDeg })
    // ------------------------------------------------------------
    function Na__Views__Elevation(side) {
        const all = Na__AppConfig__Get('Viewport__Elevations', []);
        return all.find((e) => e.Key === side) || all[0] || { Key: 'Front', Label: 'Front Elevation', YawDeg: 0 };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Viewport's Own Title, Else Its Scene's Name
    // ------------------------------------------------------------
    function Na__Views__Title(viewport, doc) {
        if (viewport.Viewport__Title) return viewport.Viewport__Title;
        const scene = Na__Views__Scene(viewport, doc);
        if (scene) return scene.View__Name;
        if (viewport.Viewport__Kind === 'Plan') return 'Roof Plan';
        return viewport.Viewport__Kind === 'Elevation' ? 'Elevation' : '3D View';
    }

    function Na__Views__ScaleLabel(viewport) {
        return Na__Views__IsScaled(viewport) ? Na__Format__Scale(viewport.Viewport__ScaleDenominator) : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Largest Frame a Scaled View Can Have (the engine's sheet)
    // ------------------------------------------------------------
    function Na__Views__MaxScaledFrame() {
        const s = Na__EngineHost__SheetMm();
        return { WidthMm: s.WidthMm, HeightMm: s.HeightMm };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cameras
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Point a Scaled Scene Is Centred On (world metres)
    // ------------------------------------------------------------
    function Na__Views__SceneCentre(scene) {
        if (Array.isArray(scene.View__CentreM) && scene.View__CentreM.length === 3) return scene.View__CentreM.slice();
        const b = Na__EngineHost__BuildingBounds();
        const c = b ? b.Centre.slice() : [0, 4, 0];
        if (scene.View__Kind === 'Plan') c[1] = 0;                               // <-- Looking down at the ground: the roofs sit just above it
        return c;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Engine Camera for a Scene, at a Viewport's Scale and Profile
    // ------------------------------------------------------------
    // viewport: the one drawing it; none (the 3D Environment) takes the first
    // viewport showing the scene, else the default scale and the measured
    // profile for a scaled scene, the full discipline for a 3D one.
    // ------------------------------------------------------------
    function Na__Views__SceneCamera(scene, doc, viewport) {
        const v = viewport || (Na__Views__ScenesUsing(doc, scene.View__Id)[0] || {}).Viewport || null;
        const scaled = Na__Views__IsScaled(scene);
        const measured = v ? v.Viewport__Profile !== 'Concept' : scaled;
        const ceiling = measured ? Na__AppConfig__Get('Viewport__MeasuredCeiling', 0.33) : 1;
        if (!scaled) {
            const camera = Na__DrawingSet__CameraFromJson(scene.View__Camera)
                || Na__EngineHost__PresetCamera(scene.View__Preset || 'ThreeQuarter') || Na__EngineHost__PresetCamera('ThreeQuarter');
            if (viewport) camera.Ceiling = ceiling;                              // <-- On a sheet the viewport's pen profile caps it
            return camera;
        }
        const scale = Number(v && v.Viewport__ScaleDenominator) || Na__DrawingSet__DefaultScale(scene.View__Kind);
        const halfHeight = (Na__EngineHost__SheetMm().HeightMm * scale) / 2000;  // <-- 297 mm (A3) at 1:50 is 14.85 m: a 7.425 m half-height
        const lock = Na__Views__SceneLock(scene);
        return Na__Views__ApplyCut({ Mode: 'Ortho', Yaw: lock.Yaw, Pitch: lock.Pitch, Distance: Na__AppConfig__Get('Viewport__OrthoDistanceM', 60),
                                     Target: Na__Views__SceneCentre(scene), FovY: 30, HalfHeight: halfHeight, Ceiling: ceiling }, scene);
    }

    // A scaled scene's held orientation ({ Yaw, Pitch }), else null
    function Na__Views__SceneLock(scene) {
        if (!scene) return null;
        if (scene.View__Kind === 'Elevation') return { Yaw: Na__Views__Elevation(scene.View__Side).YawDeg, Pitch: 0 };
        if (scene.View__Kind === 'Plan') return { Yaw: 0, Pitch: Na__AppConfig__Get('Viewport__PlanPitchDeg', 89.9) };
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Engine Camera for a Viewport: its scene, at its scale, moved by its own pan
    // ------------------------------------------------------------
    function Na__Views__Camera(viewport, doc) {
        const scene = Na__Views__Scene(viewport, doc);
        if (!scene) return Na__EngineHost__PresetCamera('ThreeQuarter');
        const camera = Na__Views__SceneCamera(scene, doc, viewport);
        const pan = viewport.Viewport__PanM;
        if (Na__Views__IsScaled(scene) && Array.isArray(pan) && pan.length === 3) camera.Target = camera.Target.map((v, i) => v + Number(pan[i] || 0));
        return Na__Views__ApplyCut(camera, scene);                               // <-- Again after the pan: the roof plan's slight tilt carries a pan into its depth
    }
    // ------------------------------------------------------------


    // FUNCTION | A Scaled Scene's Plane Normal, Towards the Viewer ([x, y, z], unit), Else Null
    // ------------------------------------------------------------
    // An elevation's is level, square to the face it looks at (yaw 0: +Z, the
    // front); the roof plan's is straight up.
    // ------------------------------------------------------------
    function Na__Views__SceneNormal(scene) {
        if (!scene) return null;
        if (scene.View__Kind === 'Plan') return [0, 1, 0];
        if (scene.View__Kind !== 'Elevation') return null;
        const yaw = Na__Views__Elevation(scene.View__Side).YawDeg * Math.PI / 180;
        const tidy = (v) => (Math.abs(v) < 1e-9 ? 0 : v);                      // <-- cos 90 degrees is 6e-17, not 0
        return [tidy(Math.sin(yaw)), 0, tidy(Math.cos(yaw))];
    }

    // A scaled scene's cut in metres along its normal, else null (not cut)
    function Na__Views__CutM(scene) {
        const v = scene ? scene.View__CutM : null;
        return v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
    }

    // Set it (metres, kept to the millimetre), or null for not cut
    function Na__Views__SetCut(scene, cutM) {
        if (!Na__Views__IsScaled(scene)) return;
        scene.View__CutM = cutM === null || cutM === undefined || !Number.isFinite(Number(cutM)) ? null : Math.round(Number(cutM) * 1000) / 1000;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stand a Scaled Camera at Its Scene's Cut: nothing in front of the plane is drawn
    // ------------------------------------------------------------
    // The engine clips at its near plane: 0.1 m from the eye for the wash, 0.2 m
    // for the pen (PainterlyNPR 31__Line__Visibility). The eye stands
    // Cameras__CutEyeOffsetM (0.2) before the plane, so the pen stops exactly
    // at it and a face standing on it keeps its lines. Under a parallel
    // projection the distance changes what is cut, never the scale. A plane at
    // or behind the target takes the target back with it (the eye stays where
    // it is), so the camera always looks forward. Not cut: its usual stand-off
    // (Viewport__OrthoDistanceM) from the scene's own depth, as before cuts.
    // Running it twice changes nothing: the open elevation runs it every frame.
    // ------------------------------------------------------------
    function Na__Views__ApplyCut(camera, scene) {
        const n = Na__Views__SceneNormal(scene);
        if (!n || !camera || !Array.isArray(camera.Target)) return camera;
        const cut = Na__Views__CutM(scene);
        if (cut === null) {
            camera.Target = Na__Views__AtDepth(scene, camera.Target);
            camera.Distance = Na__AppConfig__Get('Viewport__OrthoDistanceM', 60);
            return camera;
        }
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const yaw = Number(camera.Yaw) * Math.PI / 180, pitch = Number(camera.Pitch) * Math.PI / 180;
        const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];   // <-- Target to eye, as the engine's camera rig reads Yaw and Pitch
        const along = dot(n, dir) || 1;                                          // <-- 1 for an elevation, sin 89.9 degrees for the roof plan
        const target = camera.Target.map(Number);
        const least = Na__AppConfig__Get('Cameras__CutLeastDistanceM', 1);
        let distance = (cut - dot(target, n)) * along + Na__AppConfig__Get('Cameras__CutEyeOffsetM', 0.2);
        if (distance < least) {
            const back = (least - distance) / (along * along);                  // <-- Exactly enough that the distance is the least again
            camera.Target = target.map((v, i) => v - dir[i] * back);
            distance = least;
        }
        camera.Distance = distance;
        return camera;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Scaled Scene's Centre From a Camera Target, at the Scene's Own Depth
    // ------------------------------------------------------------
    // Across the view the target is where the scene is centred; along it, it is
    // the cut's business (ApplyCut moves it back), so the scene keeps the depth
    // it had and taking a cut away later leaves the camera where it was.
    // ScaledCentre is for the file (to the millimetre), AtDepth for the camera.
    // ------------------------------------------------------------
    function Na__Views__AtDepth(scene, target) {
        const t = (Array.isArray(target) ? target : [0, 0, 0]).map(Number);
        const n = Na__Views__SceneNormal(scene);
        if (!n) return t;
        const was = Na__Views__SceneCentre(scene);
        const off = (t[0] - was[0]) * n[0] + (t[1] - was[1]) * n[1] + (t[2] - was[2]) * n[2];
        return t.map((v, i) => v - n[i] * off);
    }

    function Na__Views__ScaledCentre(scene, target) {
        return Na__Views__AtDepth(scene, target).map((v) => Math.round(v * 1000) / 1000);
    }
    // ------------------------------------------------------------


    // FUNCTION | Are Two Cameras the Same View? (within what the file keeps)
    // ------------------------------------------------------------
    function Na__Views__SameCamera(a, b) {
        if (!a || !b) return false;
        const near = (x, y) => Math.abs((Number(x) || 0) - (Number(y) || 0)) < 1e-4;
        return a.Mode === b.Mode && near(a.Yaw, b.Yaw) && near(a.Pitch, b.Pitch) && near(a.Distance, b.Distance)
            && near(a.FovY, b.FovY) && near(a.HalfHeight, b.HalfHeight) && [0, 1, 2].every((i) => near((a.Target || [])[i], (b.Target || [])[i]));
    }
    // ------------------------------------------------------------


    // FUNCTION | Update a Scene From the 3D Environment: the camera now, and the points
    // ------------------------------------------------------------
    // SketchUp's Update Scene. A 3D scene takes the camera whole; a scaled one
    // keeps its side and its cut and takes only where the camera is centred
    // across the view, so it stays square and to scale. Every viewport showing
    // it follows.
    // ------------------------------------------------------------
    function Na__Views__UpdateScene(scene, camera, points) {
        if (Na__Views__IsScaled(scene)) {
            scene.View__CentreM = Na__Views__ScaledCentre(scene, camera.Target);
        } else {
            scene.View__Camera = Na__DrawingSet__CameraToJson(camera);
            scene.View__Preset = null;
        }
        scene.View__Points = Na__DrawingSet__CleanPoints(points);
    }
    // ------------------------------------------------------------


    // FUNCTION | Pan a Scaled Viewport: a drag of (dx, dy) mm on the sheet moves the world under the frame
    // ------------------------------------------------------------
    // Dragging the picture right shows what lay to its left, so the centre moves
    // against the drag along the view's right; dragging it down shows what lay
    // above, so the centre moves up the view. A plan's "up" on the sheet is -Z.
    // The viewport's own pan: its scene, and every other viewport of it, stay.
    // ------------------------------------------------------------
    function Na__Views__Pan(viewport, dxMm, dyMm, doc) {
        const scene = Na__Views__Scene(viewport, doc);
        if (!scene || !Na__Views__IsScaled(scene)) return;
        const k = (Number(viewport.Viewport__ScaleDenominator) || 50) / 1000;    // <-- Metres in the world per millimetre on the sheet
        const p = Array.isArray(viewport.Viewport__PanM) && viewport.Viewport__PanM.length === 3 ? viewport.Viewport__PanM.map(Number) : [0, 0, 0];
        if (scene.View__Kind === 'Plan') {
            p[0] -= dxMm * k;
            p[2] -= dyMm * k;
        } else {
            const yaw = Na__Views__Elevation(scene.View__Side).YawDeg * Math.PI / 180;
            const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
            p[0] -= right[0] * dxMm * k;
            p[2] -= right[2] * dxMm * k;
            p[1] += dyMm * k;
        }
        viewport.Viewport__PanM = p.map((v) => Math.round(v * 1000) / 1000);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Art Direction Points
// -----------------------------------------------------------------------------

    // FUNCTION | Whose Points a Viewport Draws With: { Kind: 'view' | 'viewport', View, Points }
    // ------------------------------------------------------------
    // Its scene's ('view'), shared by every viewport showing it. A viewport
    // whose scene is gone draws with none until it has one again.
    // ------------------------------------------------------------
    function Na__Views__PointsOwner(viewport, doc) {
        const scene = Na__Views__Scene(viewport, doc);
        if (scene) return { Kind: 'view', View: scene, Points: scene.View__Points || [] };
        return { Kind: 'viewport', View: null, Points: [] };
    }

    function Na__Views__Points(viewport, doc) {
        return Na__Views__PointsOwner(viewport, doc).Points;
    }

    // Write a viewport's points into its scene: 'view' (or 'viewport' when it has none, and nothing is kept)
    function Na__Views__SetPoints(viewport, doc, points) {
        const owner = Na__Views__PointsOwner(viewport, doc);
        if (owner.View) owner.View.View__Points = points;
        return owner.Kind;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sun a Viewport Draws With: { Azimuth, Altitude } (the engine's form), or null
    // ------------------------------------------------------------
    // Its scene's own (View__Sun, AURA 0.5.9), shared by every viewport showing
    // it, else the working sun; null only before either is known (the engine's
    // own is drawn).
    // ------------------------------------------------------------
    function Na__Views__Sun(viewport, doc) {
        const scene = Na__Views__Scene(viewport, doc);
        return Na__DrawingSet__SunToEngine(scene && scene.View__Sun) || Na__DrawingSet__SunToEngine(Na__DrawingSet__WorkingSun(doc));
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Engine's Whole Sheet Lies on the Paper for a Viewport: { X, Y, WidthMm, HeightMm }
    // ------------------------------------------------------------
    // As the viewport draws its picture: a scaled view's still at its true size
    // (the engine's sheet) centred in the frame (the frame shows what lies inside it); a 3D
    // view's scaled to cover its frame, centred (xMidYMid slice). The point
    // handles lie over this, in the engine's own sheet millimetres.
    // ------------------------------------------------------------
    function Na__Views__PictureRect(viewport) {
        const f = viewport.Viewport__FrameMm;
        const s = Na__EngineHost__SheetMm();
        const cx = f.X + f.WidthMm / 2, cy = f.Y + f.HeightMm / 2;
        const k = Na__Views__IsScaled(viewport) ? 1 : Math.max(f.WidthMm / s.WidthMm, f.HeightMm / s.HeightMm);
        return { X: cx - (s.WidthMm * k) / 2, Y: cy - (s.HeightMm * k) / 2, WidthMm: s.WidthMm * k, HeightMm: s.HeightMm * k };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Views__IsScaled,
        Na__Views__Scene,
        Na__Views__ScenesUsing,
        Na__Views__Elevation,
        Na__Views__Title,
        Na__Views__ScaleLabel,
        Na__Views__MaxScaledFrame,
        Na__Views__SceneCamera,
        Na__Views__SceneLock,
        Na__Views__Camera,
        Na__Views__SceneNormal,
        Na__Views__CutM,
        Na__Views__SetCut,
        Na__Views__ApplyCut,
        Na__Views__ScaledCentre,
        Na__Views__SceneCentre,
        Na__Views__SameCamera,
        Na__Views__UpdateScene,
        Na__Views__Pan,
        Na__Views__PointsOwner,
        Na__Views__Points,
        Na__Views__SetPoints,
        Na__Views__Sun,
        Na__Views__PictureRect
    };

// endregion -------------------------------------------------------------------
