// =============================================================================
// VALEVISION AURA - DRAWING SET - THE MODEL
// =============================================================================
//
// FILE       : Na__DrawingSet__Model__.js
// NAMESPACE  : Na__DrawingSet
// MODULE     : Drawing Set - Model
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A project's AURA drawing set as one JSON document: the engine's
//              settings, its scenes, and the sheets with their viewports and
//              annotations. New records, defaults, and a tidy-up on load
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE DOCUMENT PER PROJECT, saved by the AURA API into the Projects Master
//   Library: <project>/ValeVision__AuraRender/UserData__AuraDrawings/
//   <project>__AuraDrawingSet__.json (user data: written on the server,
//   collected to the PC, never pushed, never web-served).
// - KEYS ARE THREE-STAGE (AuraDrawingSet__Sheets, Sheet__PaperSize,
//   Viewport__FrameMm) and carry their unit (Mm on the sheet, M in the world).
// - SHEET MILLIMETRES run from the paper's top left corner, x right, y down,
//   in the sheet's own orientation.
// - A NEW PROJECT starts with one A1 demo sheet: the four elevations at 1:50,
//   the roof plan at 1:100 and the engine's three-quarter view, so the whole
//   chain (engine, viewports, title block) shows at once.
// - SCENES, SKETCHUP TO LAYOUT (Adam, 30-Oct-2026: "these scenes become
//   viewports in the layout think SketchUp -> Layout logic"). A scene is what
//   is looked at: its kind (Perspective, Elevation or Plan), an elevation's
//   side, a 3D scene's camera (or the engine preset it starts from), a scaled
//   scene's centre and cut (its drawing plane), and its Art Direction Points.
//   They are the records of
//   AuraDrawingSet__SavedViews (View__*: the AURA API takes only the four root
//   keys it knows, so the key keeps its first name). Every viewport shows one
//   scene (Viewport__SceneId), and every viewport showing it follows it.
// - A VIEWPORT keeps what LayOut keeps: its frame, scale, pen profile, title,
//   and a pan of its own (Viewport__PanM, metres from the scene's centre), so
//   moving or resizing a frame never moves the scene in another viewport.
//   Viewport__Kind is the scene's, kept on the viewport for the sheet's code.
// - ART DIRECTION POINTS are a scene's (View__Points), as PainterlyNPR makes
//   them (its point objects, as plain data), shared by every viewport showing
//   it; AuraDrawingSet__Engine.WorkingPoints are the 3D Environment's while no
//   scene is open (inside Engine, beside the settings).
// - OLDER DOCUMENTS (saved views, viewports with a side, a centre, a camera
//   source, points or 0.4.4's Viewport__View) are moved onto scenes when they
//   load: each viewport gets the scene it was showing, an identical one
//   shared, so every view there was is a scene tab.
// - A CAMERA IN THE FILE is in three-stage keys with units (Camera__YawDeg,
//   Camera__TargetM), as ValeVision 3D's saved scenes are; CameraToJson and
//   CameraFromJson are the only crossing to the engine's own camera object. A
//   saved view from before 0.4.4 kept the engine's object as it was:
//   Normalise moves it across.
// - THE ENGINE'S SHEET the points were placed on is kept with them
//   (AuraDrawingSet__Engine.SheetMm). It became A3 at PainterlyNPR 0.8.3, so
//   a set from another sheet, or naming none, has its points moved onto
//   today's when it loads (FitToSheet, with the engine's own refit).
// - THE SUN IS A SCENE'S (View__Sun, AURA 0.5.9; Adam: "several different sun
//   positions on elevations ... that complement each shot"): { Sun__AzimuthDeg,
//   Sun__AltitudeDeg }, shared by every viewport showing the scene, as its
//   points are. AuraDrawingSet__Engine.WorkingSun is the 3D Environment's while
//   no scene is open. The engine's settings no longer carry it: a set saved
//   with one sun for all (Settings.Sun) gives it to every scene and to the
//   working sun when it loads, so nothing drawn before changes, and drops it.
//   null: the engine's own sun, until the 3D Environment fills it in.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.6.0 (AURA 0.5.9)
// - The sun is a scene's: View__Sun on every scene (NewScene takes sun),
//   AuraDrawingSet__Engine.WorkingSun, Na__DrawingSet__CleanSun,
//   Na__DrawingSet__SunToEngine, Na__DrawingSet__WorkingSun and
//   Na__DrawingSet__SetWorkingSun. Normalise moves an older set's one sun
//   (Settings.Sun) onto every scene and the working sun. FindOrMakeScene
//   shares a scene whatever its sun when none is asked for, and a scene it
//   makes starts with the working sun.
//
// 30-Oct-2026 - Version 1.5.0 (AURA 0.5.6)
// - A scaled scene's cut, View__CutM (its drawing plane, metres along the
//   plane's normal; null: not cut): NewScene takes it as cut, Normalise keeps
//   it, FindOrMakeScene never shares a cut scene with an uncut view.
//
// 30-Oct-2026 - Version 1.4.0 (AURA 0.5.0)
// - Scenes: Na__DrawingSet__NewScene, Na__DrawingSet__FindOrMakeScene,
//   Na__DrawingSet__SceneName and Na__DrawingSet__Scene; a viewport is
//   { SceneId, Kind, frame, scale, profile, title, PanM }. Normalise moves
//   older viewports onto scenes; FitToSheet refits each scene's points by its
//   kind. NewSavedView, SavedView and 0.4.4's NewViewportView are gone.
//
// 30-Oct-2026 - Version 1.3.1 (AURA 0.4.3, landed after 0.4.4)
// - The engine's sheet is A3 (PainterlyNPR 0.8.3): AuraDrawingSet__Engine.
//   SheetMm, and Na__DrawingSet__FitToSheet to move older points onto it.
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.4.4)
// - Viewport__View on every viewport (NewViewport, and Normalise for older
//   documents), and the camera's file form: Na__DrawingSet__NewViewportView,
//   Na__DrawingSet__CameraToJson and Na__DrawingSet__CameraFromJson. Saved
//   views keep their camera in the same form (NewSavedView, and Normalise
//   moves an older one across through Na__DrawingSet__CameraJson).
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.3.2)
// - A note's pen and writing style: Annotation__PenKey (a STAEDTLER Mars matic
//   700 nib, M018 0.18 mm unless chosen) and Annotation__Style (only the
//   settings changed in its Advanced writing style; null is its hand's own).
//   Normalise gives older notes both defaults.
// - A note's letters (AURA 0.4.9): Annotation__Letters, 'Capitals' (drawn
//   architect's capitals, the default, so older notes are lettered in them) or
//   'Joined' (the model's joined-up hand).
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - Art Direction Points: View__Points, Viewport__Points and
//   AuraDrawingSet__Engine.WorkingPoints; NewSavedView takes the points,
//   Normalise keeps only point records it can read (Na__DrawingSet__CleanPoints).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Id, Na__Format__Date, Na__Format__Seed, Na__Format__Clamp } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__DrawingSet__SCHEMA_VERSION  = '1.0.0';
    const Na__DrawingSet__VIEWPORT_KINDS  = ['Perspective', 'Elevation', 'Plan'];
    const Na__DrawingSet__ANNOTATION_KINDS = ['Note', 'Leader'];
    const Na__DrawingSet__FIELD_KEYS      = ['Client', 'Address', 'Title', 'Scale', 'Date', 'DrawnBy', 'CheckedBy', 'DrawingNo'];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Records
// -----------------------------------------------------------------------------

    // FUNCTION | A New Sheet: paper, orientation, name and the title block's fields
    // ------------------------------------------------------------
    function Na__DrawingSet__NewSheet(options) {
        const o = options || {};
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const paper = sizes[o.paperSize] ? o.paperSize : Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3');
        return {
            Sheet__Id          : Na__Format__Id('Sheet'),
            Sheet__Name        : String(o.name || 'New sheet').slice(0, 80),
            Sheet__PaperSize   : paper,
            Sheet__Orientation : o.orientation === 'portrait' ? 'portrait' : 'landscape',
            Sheet__Fields      : Object.assign({
                Client     : '',
                Address    : '',
                Title      : String(o.name || ''),
                Scale      : '',                                                 // <-- Empty: written from the viewports' scales
                Date       : Na__Format__Date(),
                DrawnBy    : '',
                CheckedBy  : '',
                DrawingNo  : '',
                Revisions  : []
            }, o.fields || {}),
            Sheet__Viewports   : [],
            Sheet__Annotations : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Viewport: { kind, sceneId, frame, scale, profile, title, showTitle }
    // ------------------------------------------------------------
    // kind is its scene's. Elevations and plans are scaled views: their frame
    // is at most the engine's own sheet (A3 since PainterlyNPR 0.8.3), which
    // the viewport module enforces. A perspective is a picture, scaled to its
    // frame.
    // ------------------------------------------------------------
    function Na__DrawingSet__NewViewport(options) {
        const o = options || {};
        const kind = Na__DrawingSet__VIEWPORT_KINDS.includes(o.kind) ? o.kind : 'Perspective';
        const frame = Object.assign({ X: 30, Y: 30 }, Na__AppConfig__Get('Viewport__DefaultFrameMm', { WidthMm: 180, HeightMm: 120 }), o.frame || {});
        return {
            Viewport__Id               : Na__Format__Id('Viewport'),
            Viewport__SceneId          : o.sceneId || null,                      // <-- The scene it shows (AuraDrawingSet__SavedViews)
            Viewport__Kind             : kind,                                   // <-- Its scene's, kept here for the sheet's code
            Viewport__FrameMm          : { X: frame.X, Y: frame.Y, WidthMm: frame.WidthMm, HeightMm: frame.HeightMm },
            Viewport__ScaleDenominator : kind === 'Perspective' ? null : Number(o.scale || Na__DrawingSet__DefaultScale(kind)),
            Viewport__PlanKind         : kind === 'Plan' ? 'RoofPlan' : null,
            Viewport__PanM             : null,                                   // <-- Its own pan, metres from the scene's centre; null: none
            Viewport__Profile          : kind === 'Perspective' ? 'Concept' : (o.profile || 'Measured'),
            Viewport__Title            : String(o.title || ''),
            Viewport__ShowTitle        : o.showTitle !== false
        };
    }

    function Na__DrawingSet__DefaultScale(kind) {
        return kind === 'Plan' ? Na__AppConfig__Get('Viewport__DefaultPlanScale', 100) : Na__AppConfig__Get('Viewport__DefaultScale', 50);
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Scene: { name, kind, side, camera, preset, centre, cut, points, sun }
    // ------------------------------------------------------------
    // camera: the engine's object or the file's form. A 3D scene with no camera
    // starts from an engine preset (View__Preset, ThreeQuarter unless named),
    // read from the engine when it is drawn, never copied here. A scaled
    // scene's centre is null until it is moved: centred on the building. Its
    // cut (View__CutM, AURA 0.5.6) is null until its plane is moved: not cut.
    // Its sun (View__Sun, AURA 0.5.9), in the engine's form or the file's, is
    // null until one is given (the 3D Environment fills it with the engine's).
    // ------------------------------------------------------------
    function Na__DrawingSet__NewScene(options) {
        const o = options || {};
        const kind = Na__DrawingSet__VIEWPORT_KINDS.includes(o.kind) ? o.kind : 'Perspective';
        const camera = kind === 'Perspective' ? Na__DrawingSet__CameraJson(o.camera) : null;
        const cut = o.cut === null || o.cut === undefined || o.cut === '' ? NaN : Number(o.cut);
        return {
            View__Id      : Na__Format__Id('Scene'),
            View__Name    : String(o.name || 'Scene').slice(0, 60),
            View__Kind    : kind,
            View__Side    : kind === 'Elevation' ? String(o.side || 'Front') : null,
            View__Camera  : camera,                                              // <-- A 3D scene's camera, in the file's form
            View__Preset  : kind === 'Perspective' && !camera ? String(o.preset || 'ThreeQuarter') : null,
            View__CentreM : kind !== 'Perspective' ? Na__DrawingSet__Point3(o.centre) : null,
            View__CutM    : kind !== 'Perspective' && Number.isFinite(cut) ? Math.round(cut * 1000) / 1000 : null,   // <-- Metres along the plane's normal from the world origin; null: not cut
            View__Points  : Na__DrawingSet__CleanPoints(o.points),
            View__Sun     : Na__DrawingSet__CleanSun(o.sun)                     // <-- Its own sun, { Sun__AzimuthDeg, Sun__AltitudeDeg }, or null
        };
    }

    // [x, y, z] in metres, or null
    function Na__DrawingSet__Point3(value) {
        return Array.isArray(value) && value.length === 3 && value.every((v) => Number.isFinite(Number(v))) ? value.map(Number) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Name No Scene Has Yet: base, else "base (2)", "base (3)"...
    // ------------------------------------------------------------
    function Na__DrawingSet__SceneName(doc, base, except) {
        const taken = new Set((doc && doc.AuraDrawingSet__SavedViews || []).filter((v) => v !== except).map((v) => String(v.View__Name).toLowerCase()));
        const clean = String(base || 'Scene').trim().slice(0, 54) || 'Scene';
        if (!taken.has(clean.toLowerCase())) return clean;
        for (let n = 2; ; n++) if (!taken.has(`${clean} (${n})`.toLowerCase())) return `${clean} (${n})`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Scene for a View: one just like it, else a new one added to the document
    // ------------------------------------------------------------
    // Just like it: the same kind, side, centre, preset and camera, and no
    // points of its own to keep apart. How the demo sheet, an older document's
    // viewports and a new viewport from the sheet's "Add a view" find theirs.
    // A sun asked for must match too; none asked for, any scene's will do, and
    // a scene made here starts with the working sun.
    // ------------------------------------------------------------
    function Na__DrawingSet__FindOrMakeScene(doc, options) {
        const made = Na__DrawingSet__NewScene(options);
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        const found = made.View__Points.length ? null : (doc.AuraDrawingSet__SavedViews || []).find((v) =>
            v.View__Kind === made.View__Kind && v.View__Side === made.View__Side && v.View__Preset === made.View__Preset
            && same(v.View__CentreM, made.View__CentreM) && same(v.View__Camera, made.View__Camera) && same(v.View__CutM ?? null, made.View__CutM)
            && (!made.View__Sun || same(v.View__Sun, made.View__Sun)));
        if (found) return found;
        if (!made.View__Sun) made.View__Sun = Na__DrawingSet__WorkingSun(doc);
        made.View__Name = Na__DrawingSet__SceneName(doc, made.View__Name);
        doc.AuraDrawingSet__SavedViews = doc.AuraDrawingSet__SavedViews || [];
        doc.AuraDrawingSet__SavedViews.push(made);
        return made;
    }

    // A view's natural name, for a scene made from an older viewport
    function Na__DrawingSet__NaturalName(kind, side) {
        if (kind === 'Plan') return 'Roof Plan';
        if (kind === 'Elevation') {
            const e = Na__AppConfig__Get('Viewport__Elevations', []).find((x) => x.Key === side);
            return e ? e.Label : 'Elevation';
        }
        return '3D View';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Engine's Camera to Its File Form, and Back (null when it cannot be read)
    // ------------------------------------------------------------
    // The engine's { Mode, Yaw, Pitch, Distance, Target, FovY, HalfHeight,
    // Ceiling } in degrees and metres; Ceiling is the Drawing Discipline's cap
    // (1 none). Rounded to a micrometre and a millionth of a degree, so the
    // file reads plainly and the camera comes back as it went.
    // ------------------------------------------------------------
    function Na__DrawingSet__CameraToJson(camera) {
        if (!camera || typeof camera !== 'object') return null;
        const r = (x) => Math.round((Number(x) || 0) * 1e6) / 1e6;
        const t = Array.isArray(camera.Target) ? camera.Target : [0, 0, 0];
        return {
            Camera__Mode        : camera.Mode === 'Ortho' ? 'Ortho' : 'Perspective',
            Camera__TargetM     : [r(t[0]), r(t[1]), r(t[2])],
            Camera__YawDeg      : r(camera.Yaw),
            Camera__PitchDeg    : r(camera.Pitch),
            Camera__DistanceM   : r(camera.Distance),
            Camera__FovYDeg     : r(camera.FovY),
            Camera__HalfHeightM : r(camera.HalfHeight),
            Camera__Ceiling     : r(Number.isFinite(Number(camera.Ceiling)) ? camera.Ceiling : 1)
        };
    }

    // Either form to the file's (a saved view from before 0.4.4 kept the engine's object), else null
    function Na__DrawingSet__CameraJson(camera) {
        if (Na__DrawingSet__CameraFromJson(camera)) return JSON.parse(JSON.stringify(camera));
        const raw = camera && typeof camera === 'object' && Array.isArray(camera.Target) && camera.Target.length === 3 && Number.isFinite(Number(camera.Yaw));
        return raw ? Na__DrawingSet__CameraToJson(camera) : null;
    }

    function Na__DrawingSet__CameraFromJson(json) {
        if (!json || typeof json !== 'object') return null;
        const t = json.Camera__TargetM;
        const n = (x) => Number.isFinite(Number(x));
        if (!Array.isArray(t) || t.length !== 3 || !t.every(n)) return null;
        if (!['Camera__YawDeg', 'Camera__PitchDeg', 'Camera__DistanceM', 'Camera__FovYDeg'].every((k) => n(json[k]))) return null;
        return {
            Mode       : json.Camera__Mode === 'Ortho' ? 'Ortho' : 'Perspective',
            Yaw        : Number(json.Camera__YawDeg),
            Pitch      : Number(json.Camera__PitchDeg),
            Distance   : Number(json.Camera__DistanceM),
            Target     : t.map(Number),
            FovY       : Number(json.Camera__FovYDeg),
            HalfHeight : n(json.Camera__HalfHeightM) ? Number(json.Camera__HalfHeightM) : 10,
            Ceiling    : n(json.Camera__Ceiling) ? Number(json.Camera__Ceiling) : 1
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Annotation: a handwritten Note, or a Leader note with an arrow to a tip
    // ------------------------------------------------------------
    function Na__DrawingSet__NewAnnotation(options) {
        const o = options || {};
        const kind = Na__DrawingSet__ANNOTATION_KINDS.includes(o.kind) ? o.kind : 'Note';
        const at = o.at || { X: 40, Y: 40 };
        return {
            Annotation__Id       : Na__Format__Id('Note'),
            Annotation__Kind     : kind,
            Annotation__Text     : String(o.text || '').slice(0, Na__AppConfig__Get('Handwriting__MaxChars', 600)),
            Annotation__AtMm     : { X: at.X, Y: at.Y },
            Annotation__WidthMm  : Number(o.width || Na__AppConfig__Get('Annotation__DefaultWidthMm', 70)),
            Annotation__TipMm    : kind === 'Leader' ? Object.assign({ X: at.X - 25, Y: at.Y + 25 }, o.tip || {}) : null,
            Annotation__BendsMm  : [],                                           // <-- A leader's bend points ({ X, Y } mm, words to tip): its spline passes through them
            Annotation__LeaderFrom : null,                                       // <-- Where a leader leaves its words: { Side: Bottom | Top | Left | Right, At: 0 to 1 }; null: automatic
            Annotation__Align    : 'Left',                                       // <-- The words set Left, Centre, Right or Box (justified), on the sheet
            Annotation__SizeMm   : Number(o.size || Na__AppConfig__Get('Annotation__DefaultSizeMm', 4.5)),
            Annotation__InkKey   : o.ink || Na__AppConfig__Get('Annotation__DefaultInk', 'Forest'),
            Annotation__HandKey  : o.hand || Na__AppConfig__Get('Handwriting__DefaultHand', 'Steady'),
            Annotation__Letters  : o.letters || Na__AppConfig__Get('Handwriting__DefaultLetters', 'Capitals'),   // <-- Drawn architect's capitals or the model's joined-up hand; a note from before 0.4.9 takes the default
            Annotation__PenKey   : o.pen || Na__AppConfig__Get('Handwriting__DefaultPen', 'M018'),   // <-- The nib, applied on the sheet (AuraConfig__Handwriting__Pens)
            Annotation__Style    : null,                                         // <-- The settings changed in its Advanced writing style; null: its hand's own
            Annotation__Seed     : Number.isFinite(o.seed) ? o.seed : Na__Format__Seed(),
            Annotation__Written  : null                                          // <-- The engine's strokes once written: { Key, Paths, HeightMm, InkWidthMm, Lines, Warnings }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Set of Art Direction Points as Plain Data (only records the engine can read)
    // ------------------------------------------------------------
    // The engine checks each type again when it takes them (its MakePoint),
    // so a type a later engine drops is left out there, never here.
    // ------------------------------------------------------------
    function Na__DrawingSet__CleanPoints(points) {
        return (Array.isArray(points) ? points : [])
            .filter((p) => p && typeof p === 'object' && typeof p.Type === 'string' && Array.isArray(p.PaperMm) && p.PaperMm.length === 2)
            .map((p) => JSON.parse(JSON.stringify(p)));
    }

    // The 3D Environment's unsaved view's points, and keeping them (inside Engine, beside the settings)
    function Na__DrawingSet__WorkingPoints(doc) {
        return (doc && doc.AuraDrawingSet__Engine && doc.AuraDrawingSet__Engine.WorkingPoints) || [];
    }

    function Na__DrawingSet__SetWorkingPoints(doc, points) {
        if (!doc) return;
        doc.AuraDrawingSet__Engine = doc.AuraDrawingSet__Engine || { Settings: null };
        doc.AuraDrawingSet__Engine.WorkingPoints = Na__DrawingSet__CleanPoints(points);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sun as the File Keeps It: { Sun__AzimuthDeg, Sun__AltitudeDeg }, or null
    // ------------------------------------------------------------
    // Takes the file's form or the engine's ({ Azimuth, Altitude }, degrees).
    // The engine's ranges are its sliders', applied where it takes the sun
    // (Na__EngineHost__SetSun), never guessed here.
    // ------------------------------------------------------------
    function Na__DrawingSet__CleanSun(sun) {
        if (!sun || typeof sun !== 'object') return null;
        const azimuth  = Number(sun.Sun__AzimuthDeg !== undefined ? sun.Sun__AzimuthDeg : sun.Azimuth);
        const altitude = Number(sun.Sun__AltitudeDeg !== undefined ? sun.Sun__AltitudeDeg : sun.Altitude);
        if (!Number.isFinite(azimuth) || !Number.isFinite(altitude)) return null;
        const r = (x) => Math.round(x * 100) / 100;
        return { Sun__AzimuthDeg: r(azimuth), Sun__AltitudeDeg: r(altitude) };
    }

    // The engine's form ({ Azimuth, Altitude }) of a sun in either form, or null
    function Na__DrawingSet__SunToEngine(sun) {
        const clean = Na__DrawingSet__CleanSun(sun);
        return clean ? { Azimuth: clean.Sun__AzimuthDeg, Altitude: clean.Sun__AltitudeDeg } : null;
    }

    // The 3D Environment's sun while no scene is open, and keeping it (inside Engine, beside the working points)
    function Na__DrawingSet__WorkingSun(doc) {
        return Na__DrawingSet__CleanSun(doc && doc.AuraDrawingSet__Engine && doc.AuraDrawingSet__Engine.WorkingSun);
    }

    function Na__DrawingSet__SetWorkingSun(doc, sun) {
        if (!doc) return;
        doc.AuraDrawingSet__Engine = doc.AuraDrawingSet__Engine || { Settings: null };
        doc.AuraDrawingSet__Engine.WorkingSun = Na__DrawingSet__CleanSun(sun);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Document
// -----------------------------------------------------------------------------

    // FUNCTION | A New Drawing Set for a Project, With the Demo Sheet
    // ------------------------------------------------------------
    function Na__DrawingSet__New(project, user) {
        const now = new Date().toISOString();
        const doc = {
            AuraDrawingSet__Meta       : {
                SchemaVersion : Na__DrawingSet__SCHEMA_VERSION,
                ProjectId     : project ? project.id : '',
                CreatedIso    : now,
                UpdatedIso    : now,
                CreatedBy     : user ? user.code : ''
            },
            AuraDrawingSet__Engine     : { Settings: null, WorkingPoints: [], WorkingSun: null },   // <-- Settings null: the engine's own starting state. WorkingPoints and WorkingSun: the 3D Environment's while no scene is open
            AuraDrawingSet__SavedViews : [],                                     // <-- The scenes
            AuraDrawingSet__Sheets     : []
        };
        doc.AuraDrawingSet__Sheets.push(Na__DrawingSet__DemoSheet(project, user, doc));
        return doc;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The A1 Demo Sheet: four elevations, the roof plan and a view, each its own scene
    // ------------------------------------------------------------
    function Na__DrawingSet__DemoSheet(project, user, doc) {
        const p = project || {};
        const sheet = Na__DrawingSet__NewSheet({
            name        : 'Elevations, roof plan and view',
            paperSize   : 'A1',
            orientation : 'landscape',
            fields      : {
                Client    : p.title || '',
                Address   : p.address || '',
                Title     : 'Elevations, roof plan and view (demo scene)',
                DrawnBy   : user ? (user.name || '') : '',
                DrawingNo : `${p.code ? p.code + '-' : ''}AURA-01`
            }
        });
        const add = (o) => {
            const scene = Na__DrawingSet__FindOrMakeScene(doc, Object.assign({ name: o.title }, o));
            sheet.Sheet__Viewports.push(Na__DrawingSet__NewViewport(Object.assign({ sceneId: scene.View__Id }, o)));
        };
        add({ kind: 'Elevation', side: 'Front', scale: 50,  frame: { X: 30,  Y: 30,  WidthMm: 250, HeightMm: 200 }, title: 'Front Elevation' });
        add({ kind: 'Elevation', side: 'Right', scale: 50,  frame: { X: 300, Y: 30,  WidthMm: 200, HeightMm: 200 }, title: 'Right Side Elevation' });
        add({ kind: 'Plan',                     scale: 100, frame: { X: 520, Y: 30,  WidthMm: 230, HeightMm: 200 }, title: 'Roof Plan' });
        add({ kind: 'Elevation', side: 'Rear',  scale: 50,  frame: { X: 30,  Y: 290, WidthMm: 250, HeightMm: 200 }, title: 'Rear Elevation' });
        add({ kind: 'Elevation', side: 'Left',  scale: 50,  frame: { X: 300, Y: 290, WidthMm: 200, HeightMm: 200 }, title: 'Left Side Elevation' });
        add({ kind: 'Perspective', preset: 'ThreeQuarter', frame: { X: 520, Y: 290, WidthMm: 230, HeightMm: 153 }, title: 'View From the Garden' });
        sheet.Sheet__Annotations.push(Na__DrawingSet__NewAnnotation({
            kind : 'Leader', text: 'Handmade clay plain tiles', at: { X: 175, Y: 246 }, tip: { X: 205, Y: 108 }, width: 70   // <-- Below the front elevation, its arrow on the roof slope
        }));
        return sheet;
    }
    // ------------------------------------------------------------


    // FUNCTION | Tidy a Loaded Document: every key there, every value in range
    // ------------------------------------------------------------
    // A document written by an older AURA, or edited by hand, loads into the
    // shape this version expects; unknown kinds are dropped, never guessed.
    // ------------------------------------------------------------
    function Na__DrawingSet__Normalise(doc, project) {
        const d = (doc && typeof doc === 'object') ? doc : {};
        d.AuraDrawingSet__Meta = Object.assign({ SchemaVersion: Na__DrawingSet__SCHEMA_VERSION, ProjectId: project ? project.id : '' }, d.AuraDrawingSet__Meta || {});
        d.AuraDrawingSet__Engine = Object.assign({ Settings: null }, d.AuraDrawingSet__Engine || {});
        const settings = d.AuraDrawingSet__Engine.Settings && typeof d.AuraDrawingSet__Engine.Settings === 'object' ? d.AuraDrawingSet__Engine.Settings : null;
        const oneSun = settings ? Na__DrawingSet__CleanSun(settings.Sun) : null;   // <-- A set from before 0.5.9: one sun for every scene
        if (settings) delete settings.Sun;                                      // <-- The scenes' now: the engine's settings no longer carry it
        d.AuraDrawingSet__Engine.WorkingSun = Na__DrawingSet__CleanSun(d.AuraDrawingSet__Engine.WorkingSun) || oneSun;
        d.AuraDrawingSet__SavedViews = (Array.isArray(d.AuraDrawingSet__SavedViews) ? d.AuraDrawingSet__SavedViews : [])
            .filter((v) => v && v.View__Id)
            .map((v) => {
                const kind = Na__DrawingSet__VIEWPORT_KINDS.includes(v.View__Kind) ? v.View__Kind : 'Perspective';   // <-- A saved view from before scenes was 3D
                const scene = Na__DrawingSet__NewScene({ name: v.View__Name, kind, side: v.View__Side, camera: v.View__Camera, preset: v.View__Preset, centre: v.View__CentreM, cut: v.View__CutM, points: v.View__Points,
                                                         sun: v.View__Sun || oneSun });
                scene.View__Id = v.View__Id;
                return Object.assign(v, scene);                                  // <-- The engine's camera object from before 0.4.4 moves across with it
            });
        d.AuraDrawingSet__Engine.WorkingPoints = Na__DrawingSet__CleanPoints(d.AuraDrawingSet__Engine.WorkingPoints);
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const minFrame = Na__AppConfig__Get('Viewport__MinFrameMm', 20);
        d.AuraDrawingSet__Sheets = (Array.isArray(d.AuraDrawingSet__Sheets) ? d.AuraDrawingSet__Sheets : []).filter((s) => s && s.Sheet__Id).map((s) => {
            const sheet = Object.assign(Na__DrawingSet__NewSheet({ name: s.Sheet__Name }), s);
            if (!sizes[sheet.Sheet__PaperSize]) sheet.Sheet__PaperSize = Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3');
            sheet.Sheet__Orientation = sheet.Sheet__Orientation === 'portrait' ? 'portrait' : 'landscape';
            sheet.Sheet__Fields = Object.assign(Na__DrawingSet__NewSheet({}).Sheet__Fields, s.Sheet__Fields || {});
            Na__DrawingSet__FIELD_KEYS.forEach((k) => { sheet.Sheet__Fields[k] = String(sheet.Sheet__Fields[k] || ''); });
            if (!Array.isArray(sheet.Sheet__Fields.Revisions)) sheet.Sheet__Fields.Revisions = [];
            sheet.Sheet__Viewports = (Array.isArray(s.Sheet__Viewports) ? s.Sheet__Viewports : [])
                .filter((v) => v && v.Viewport__Id && Na__DrawingSet__VIEWPORT_KINDS.includes(v.Viewport__Kind))
                .map((v) => {
                    const f = v.Viewport__FrameMm || {};
                    v.Viewport__FrameMm = {
                        X        : Number(f.X) || 0,
                        Y        : Number(f.Y) || 0,
                        WidthMm  : Math.max(minFrame, Number(f.WidthMm) || minFrame),
                        HeightMm : Math.max(minFrame, Number(f.HeightMm) || minFrame)
                    };
                    const scene = Na__DrawingSet__SceneForViewport(d, v);
                    v.Viewport__SceneId = scene.View__Id;
                    if (v.Viewport__Kind !== scene.View__Kind) v.Viewport__ScaleDenominator = null;   // <-- Its scene's kind is its kind; a new kind starts at its default scale
                    v.Viewport__Kind = scene.View__Kind;
                    v.Viewport__ScaleDenominator = v.Viewport__Kind === 'Perspective' ? null
                        : Na__Format__Clamp(Number(v.Viewport__ScaleDenominator) || Na__DrawingSet__DefaultScale(v.Viewport__Kind), 1, 5000);
                    v.Viewport__PlanKind = v.Viewport__Kind === 'Plan' ? (v.Viewport__PlanKind || 'RoofPlan') : null;
                    v.Viewport__PanM = Na__DrawingSet__Point3(v.Viewport__PanM);
                    ['Viewport__Side', 'Viewport__CentreM', 'Viewport__CameraSource', 'Viewport__Points', 'Viewport__View'].forEach((k) => { delete v[k]; });   // <-- Now the scene's
                    return v;
                });
            sheet.Sheet__Annotations = (Array.isArray(s.Sheet__Annotations) ? s.Sheet__Annotations : [])
                .filter((a) => a && a.Annotation__Id && Na__DrawingSet__ANNOTATION_KINDS.includes(a.Annotation__Kind))
                .map((a) => Object.assign(Na__DrawingSet__NewAnnotation({ kind: a.Annotation__Kind }), a));
            return sheet;
        });
        return d;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Scene a Loaded Viewport Shows: its own, else the one its older keys described
    // ------------------------------------------------------------
    // Before scenes a viewport kept its view: an elevation its side and centre,
    // a 3D viewport a saved view or a preset (0.4.4: its own camera), and any
    // viewport not showing a saved view its own points. Each becomes a scene,
    // an identical one shared.
    // ------------------------------------------------------------
    function Na__DrawingSet__SceneForViewport(doc, v) {
        const linked = Na__DrawingSet__Scene(doc, v.Viewport__SceneId);
        if (linked) return linked;
        const source = v.Viewport__CameraSource || {};
        const own = v.Viewport__View ? Na__DrawingSet__CameraJson(v.Viewport__View.View__Camera) : null;
        const saved = v.Viewport__Kind === 'Perspective' && !own ? Na__DrawingSet__Scene(doc, source.SavedViewId) : null;
        if (saved) return saved;
        return Na__DrawingSet__FindOrMakeScene(doc, {
            name   : v.Viewport__Title || Na__DrawingSet__NaturalName(v.Viewport__Kind, v.Viewport__Side),
            kind   : v.Viewport__Kind,
            side   : v.Viewport__Side,
            centre : v.Viewport__CentreM,
            camera : own,
            preset : source.Preset,
            points : v.Viewport__Points
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Points Placed on Another Engine Sheet, Moved Onto Today's (on load, and on a new set)
    // ------------------------------------------------------------
    // sheetMm: the engine's ({ WidthMm, HeightMm }, Na__EngineHost__SheetMm);
    // refit: the engine's own (Na__EngineHost__RefitPoints), so nothing of it is
    // copied here. A set that names no sheet was placed on the one before A3.
    // 3D scenes and the 3D Environment's points grow with the picture; an elevation or the roof plan is true scale, so its points keep
    // their millimetres and only follow the sheet's centre. The set then names
    // the sheet, so it happens once (when the set is next saved).
    // ------------------------------------------------------------
    function Na__DrawingSet__FitToSheet(doc, sheetMm, refit) {
        const engine = doc && doc.AuraDrawingSet__Engine;
        if (!engine || !sheetMm || typeof refit !== 'function') return doc;
        const now = [Number(sheetMm.WidthMm), Number(sheetMm.HeightMm)];
        const was = engine.SheetMm;
        const from = was && Number(was.WidthMm) > 0 && Number(was.HeightMm) > 0 ? [Number(was.WidthMm), Number(was.HeightMm)] : null;   // <-- null: placed before A3
        if (!from || from[0] !== now[0] || from[1] !== now[1]) {
            (doc.AuraDrawingSet__SavedViews || []).forEach((v) => {                // <-- After Normalise: an older viewport's points are its scene's by now
                v.View__Points = Na__DrawingSet__CleanPoints(refit(v.View__Points, from, v.View__Kind === 'Elevation' || v.View__Kind === 'Plan'));
            });
            engine.WorkingPoints = Na__DrawingSet__CleanPoints(refit(engine.WorkingPoints, from, false));
        }
        engine.SheetMm = { WidthMm: now[0], HeightMm: now[1] };
        return doc;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finding Records
// -----------------------------------------------------------------------------

    // FUNCTION | Find a Sheet, a Viewport, an Annotation or a Scene by Id
    // ------------------------------------------------------------
    function Na__DrawingSet__Sheet(doc, id) {
        return (doc && doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === id) || null;
    }

    function Na__DrawingSet__Viewport(sheet, id) {
        return (sheet && sheet.Sheet__Viewports || []).find((v) => v.Viewport__Id === id) || null;
    }

    function Na__DrawingSet__Annotation(sheet, id) {
        return (sheet && sheet.Sheet__Annotations || []).find((a) => a.Annotation__Id === id) || null;
    }

    function Na__DrawingSet__Scene(doc, id) {
        return id ? (doc && doc.AuraDrawingSet__SavedViews || []).find((v) => v.View__Id === id) || null : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__DrawingSet__SCHEMA_VERSION,
        Na__DrawingSet__VIEWPORT_KINDS,
        Na__DrawingSet__FIELD_KEYS,
        Na__DrawingSet__New,
        Na__DrawingSet__NewSheet,
        Na__DrawingSet__NewViewport,
        Na__DrawingSet__NewAnnotation,
        Na__DrawingSet__NewScene,
        Na__DrawingSet__FindOrMakeScene,
        Na__DrawingSet__SceneName,
        Na__DrawingSet__DefaultScale,
        Na__DrawingSet__CameraToJson,
        Na__DrawingSet__CameraFromJson,
        Na__DrawingSet__CameraJson,
        Na__DrawingSet__CleanPoints,
        Na__DrawingSet__WorkingPoints,
        Na__DrawingSet__SetWorkingPoints,
        Na__DrawingSet__CleanSun,
        Na__DrawingSet__SunToEngine,
        Na__DrawingSet__WorkingSun,
        Na__DrawingSet__SetWorkingSun,
        Na__DrawingSet__Normalise,
        Na__DrawingSet__FitToSheet,
        Na__DrawingSet__Sheet,
        Na__DrawingSet__Viewport,
        Na__DrawingSet__Annotation,
        Na__DrawingSet__Scene
    };

// endregion -------------------------------------------------------------------
