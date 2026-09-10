// =============================================================================
// VALEVISION3D - ELEVATION VIEWS - PROJECT DATA
// =============================================================================
//
// FILE       : Na__Elevation__ProjectJson__Data__.js
// NAMESPACE  : Na__ElevData
// MODULE     : Elevation Views - Project Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, validate, normalise and mutate the per-project elevations
// CREATED    : 07-Sep-2026
//
// DESCRIPTION:
// - Elevations are stored in the LayoutEditor__DrawingsData block under
//   ...__Elevations, owned by Na__DrawView__ProjectData__. The scene that
//   displays one carries PresentationMode__Scene__ElevationId inside the
//   presentation block, exactly as the floor plans do.
//
// - AN ELEVATION IS TWO NUMBERS AND A MODE, NOT A PICKED FACE.
//     AZIMUTH  - the compass bearing of the side the viewer stands on, so 0
//                draws the north elevation seen from the north. World north
//                is -Z, matching the plan camera's up vector, so a plan and an
//                elevation of the same building agree on which wall is which.
//     ORIGIN   - a world X/Z point the vertical drawing plane passes through.
//                This is what the Dev menu's two sliders, the face pick and
//                the gizmo grip all move.
//     MODE     - elevation (nothing is cut) or section (everything between the
//                viewer and the plane is removed).
//   Everything else - the clip plane, the camera pose, the framing - is
//   derived from those here, so there is exactly one place the geometry of an
//   elevation is defined. A face pick SEEDS the two numbers; it is never the
//   stored definition, so the drawing survives a re-export of the model.
//
// - THE DRAWING'S OWN AXES ARE ANCHORED AT THE WORLD ORIGIN, NOT AT THE PLANE.
//   The horizontal run of a point is its distance along the elevation's right
//   axis measured from the world origin - never from the movable plane origin.
//   Anchoring to the plane would silently drag every stored annotation and
//   dimension sideways the moment the plane was nudged along X or Z.
//
// - Annotations, dimensions, the style toggles, the exclusion list and the
//   linework asset slot ride along inside each record. Pure data layer - no
//   DOM, no Three.js, no camera operations.
//
// INTEGRATION:
// - Na__Elevation__DevMenu__Editor__ mutates through here, then saves through
//   Na__DrawView__ProjectData__.
// - Na__Elevation__ModeController__ reads through here to drive the cut, the
//   camera and the drawing plane mapping.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js
// - Source version: 1.0.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)
// - Parity        : adapted
// - Divergences   :
//   - Records live in LayoutEditor__DrawingsData__Elevations (plan D08); every reader takes the drawings
//     block, defaulting to the live one, instead of the presentation block.
//   - Styles, exclusion tokens, the linework asset slot and SeededFrom added (D16, D19, D20, D33).
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.1.1
// - Projected Linework defaults to off on a new elevation or section: the projection only runs when a record asks for it.
//
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: drawings block, styles, exclusions, asset slot,
//   face-pick provenance.
//
// 07-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Drawings build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Elevation Config Defaults
    // ------------------------------------------------------------
    // @delegate: ./Na__Elevation__ConfigState__.js
    // ------------------------------------------------------------
    import {
        Na__ElevCfg__GetDirectionSetup,
        Na__ElevCfg__GetPlaneOriginRangeMm,
        Na__ElevCfg__GetDefaultViewDepthMm,
        Na__ElevCfg__FormatLabel
    } from './Na__Elevation__ConfigState__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Drawings Block and Its Scene Link Keys
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js
    // ------------------------------------------------------------
    import {
        Na__DrawData__ELEVATIONS_KEY,
        Na__DrawData__SCENE_ELEVATION_ID_KEY,
        Na__DrawData__GetBlock
    } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | JSON Key Names
    // ------------------------------------------------------------
    const Na__ElevData__ELEVATIONS_KEY = Na__DrawData__ELEVATIONS_KEY;          // <-- Inside LayoutEditor__DrawingsData
    const Na__ElevData__SCENE_ELEV_ID  = Na__DrawData__SCENE_ELEVATION_ID_KEY;  // <-- On the scene, inside the presentation block
    const Na__ElevData__SCENE_ID_KEY   = 'PresentationMode__Scene__Id';
    const Na__ElevData__SCENES_KEY     = 'PresentationMode__SavedCameraScenes__Scenes';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Elevation Record Field Names
    // ------------------------------------------------------------
    const Na__ElevData__F_ID          = 'Elevation__Id';
    const Na__ElevData__F_NAME        = 'Elevation__Name';
    const Na__ElevData__F_ORDER       = 'Elevation__Order';
    const Na__ElevData__F_ENABLED     = 'Elevation__Enabled';
    const Na__ElevData__F_AZIMUTH     = 'Elevation__AzimuthDeg';
    const Na__ElevData__F_MODE        = 'Elevation__Mode';
    const Na__ElevData__F_ORIGIN      = 'Elevation__PlaneOriginMm';
    const Na__ElevData__F_VIEW_DEPTH  = 'Elevation__ViewDepthMm';
    const Na__ElevData__F_SCENE_ID    = 'Elevation__SceneId';
    const Na__ElevData__F_ZOOM        = 'Elevation__CameraZoom';
    const Na__ElevData__F_TARGET      = 'Elevation__CameraTargetMm';
    const Na__ElevData__F_ANNOTATIONS = 'Elevation__Annotations';
    const Na__ElevData__F_DIMENSIONS  = 'Elevation__Dimensions';
    const Na__ElevData__F_STYLES      = 'Elevation__Styles';
    const Na__ElevData__F_EXCLUDE     = 'Elevation__ExcludeCategoryTokens';
    const Na__ElevData__F_LINEWORK    = 'Elevation__LineworkAsset';
    const Na__ElevData__F_SEEDED_FROM = 'Elevation__SeededFrom';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Drawing Modes and Provenance
    // ------------------------------------------------------------
    const Na__ElevData__MODE_ELEVATION = 'elevation';   // <-- Nothing is cut
    const Na__ElevData__MODE_SECTION   = 'section';     // <-- The plane bites
    const Na__ElevData__SEEDED_VALUES  = Object.freeze(['facepick', 'preset', 'manual']);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Style Toggle Keys and Defaults (D33)
    // ------------------------------------------------------------
    const Na__ElevData__STYLE_KEYS = Object.freeze({
        projectedLinework : 'Styles__ProjectedLinework',
        profileLinework   : 'Styles__ProfileLinework',
        glassOpaque       : 'Styles__GlassOpaque',
        whitecard         : 'Styles__Whitecard',
        hiddenLines       : 'Styles__HiddenLines'
    });
    const Na__ElevData__STYLE_DEFAULTS = Object.freeze({
        projectedLinework : false,                                          // <-- Off until asked for: the projection is the slow part
        profileLinework   : true,
        glassOpaque       : false,
        whitecard         : true,
        hiddenLines       : false
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Id Formatting
    // ------------------------------------------------------------
    const Na__ElevData__ID_PREFIX  = 'Elevation_';
    const Na__ElevData__ID_PADDING = 3;                                          // <-- Elevation_001
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation and Normalisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Block to Read (the live one unless a caller supplies its own)
    // ------------------------------------------------------------
    function Na__ElevData__Block(block) {
        return (block && typeof block === 'object') ? block : Na__DrawData__GetBlock();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This a Structurally Valid Elevation Record?
    // ------------------------------------------------------------
    function Na__ElevData__IsValid(elevation) {
        if (!elevation || typeof elevation !== 'object') return false;

        const id   = elevation[Na__ElevData__F_ID];
        const name = elevation[Na__ElevData__F_NAME];
        if (!id || typeof id !== 'string')     return false;                     // <-- Id must exist
        if (!name || typeof name !== 'string') return false;                     // <-- Name must exist

        return Number.isFinite(elevation[Na__ElevData__F_AZIMUTH]);              // <-- A direction is the one thing that cannot be guessed
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wrap an Azimuth Into 0-360
    // ------------------------------------------------------------
    // Applied on read as well as on write, so a hand-edited -90 behaves as 270
    // rather than producing a mirrored drawing.
    // ------------------------------------------------------------
    function Na__ElevData__WrapAzimuth(degrees) {
        if (!Number.isFinite(degrees)) return 0;
        const wrapped = degrees % 360;
        return wrapped < 0 ? wrapped + 360 : wrapped;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make Sure Every Style Toggle Exists on a Record
    // ------------------------------------------------------------
    function Na__ElevData__NormaliseStyles(elevation) {
        let styles = elevation[Na__ElevData__F_STYLES];
        if (!styles || typeof styles !== 'object') {
            styles = {};
            elevation[Na__ElevData__F_STYLES] = styles;
        }
        Object.keys(Na__ElevData__STYLE_KEYS).forEach((name) => {
            const key = Na__ElevData__STYLE_KEYS[name];
            if (typeof styles[key] !== 'boolean') styles[key] = Na__ElevData__STYLE_DEFAULTS[name];
        });
        return styles;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill In Any Missing Optional Fields From Config
    // ------------------------------------------------------------
    // Applied on read so a hand-edited or partially written elevation still
    // drives a correct camera rather than producing NaN geometry.
    // ------------------------------------------------------------
    function Na__ElevData__Normalise(elevation, index) {
        const originRange = Na__ElevCfg__GetPlaneOriginRangeMm();

        elevation[Na__ElevData__F_AZIMUTH] = Na__ElevData__WrapAzimuth(elevation[Na__ElevData__F_AZIMUTH]);

        if (elevation[Na__ElevData__F_MODE] !== Na__ElevData__MODE_SECTION) {
            elevation[Na__ElevData__F_MODE] = Na__ElevData__MODE_ELEVATION;      // <-- Anything unrecognised is a plain elevation
        }
        if (!Number.isFinite(elevation[Na__ElevData__F_ORDER])) {
            elevation[Na__ElevData__F_ORDER] = index + 1;
        }
        if (typeof elevation[Na__ElevData__F_ENABLED] !== 'boolean') {
            elevation[Na__ElevData__F_ENABLED] = true;
        }
        if (!Array.isArray(elevation[Na__ElevData__F_ANNOTATIONS])) {
            elevation[Na__ElevData__F_ANNOTATIONS] = [];
        }
        if (!Array.isArray(elevation[Na__ElevData__F_DIMENSIONS])) {
            elevation[Na__ElevData__F_DIMENSIONS] = [];
        }

        const origin = elevation[Na__ElevData__F_ORIGIN];
        if (!origin || !Number.isFinite(origin.PosX) || !Number.isFinite(origin.PosZ)) {
            elevation[Na__ElevData__F_ORIGIN] = {
                PosX : originRange.defaultXMm,
                PosZ : originRange.defaultZMm
            };
        }

        // View depth is deliberately allowed to stay null - that is the
        // ordinary infinite cut away from the viewer, not a missing value.
        if (elevation[Na__ElevData__F_VIEW_DEPTH] !== null
            && !Number.isFinite(elevation[Na__ElevData__F_VIEW_DEPTH])) {
            elevation[Na__ElevData__F_VIEW_DEPTH] = null;
        }

        Na__ElevData__NormaliseStyles(elevation);
        if (elevation[Na__ElevData__F_EXCLUDE] !== null && !Array.isArray(elevation[Na__ElevData__F_EXCLUDE])) {
            elevation[Na__ElevData__F_EXCLUDE] = null;                           // <-- null = the AppConfig default list
        }
        if (elevation[Na__ElevData__F_EXCLUDE]  === undefined) elevation[Na__ElevData__F_EXCLUDE]  = null;
        if (elevation[Na__ElevData__F_LINEWORK] === undefined) elevation[Na__ElevData__F_LINEWORK] = null;
        if (Na__ElevData__SEEDED_VALUES.indexOf(elevation[Na__ElevData__F_SEEDED_FROM]) === -1) {
            elevation[Na__ElevData__F_SEEDED_FROM] = 'manual';
        }
        return elevation;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Reading Elevations
// -----------------------------------------------------------------------------

    // FUNCTION | Get Every Valid Elevation, Sorted by Order
    // ------------------------------------------------------------
    // block is the LayoutEditor__DrawingsData object; omitted means the live
    // one. Returns a new array of the LIVE records, so mutating a returned
    // elevation edits what the save path will write.
    // ------------------------------------------------------------
    function Na__ElevData__GetElevations(block) {
        const raw = Na__ElevData__Block(block)[Na__ElevData__ELEVATIONS_KEY];
        if (!Array.isArray(raw)) return [];                                      // <-- A project with no elevations reads as an empty set

        return raw
            .filter(Na__ElevData__IsValid)
            .map(Na__ElevData__Normalise)
            .sort((a, b) => a[Na__ElevData__F_ORDER] - b[Na__ElevData__F_ORDER]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Only the Enabled Elevations
    // ------------------------------------------------------------
    function Na__ElevData__GetEnabledElevations(block) {
        return Na__ElevData__GetElevations(block)
            .filter((elevation) => elevation[Na__ElevData__F_ENABLED] !== false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get One Elevation by Id
    // ------------------------------------------------------------
    function Na__ElevData__GetElevationById(block, elevationId) {
        if (!elevationId) return null;
        const list = Na__ElevData__GetElevations(block);
        for (let i = 0; i < list.length; i++) {
            if (list[i][Na__ElevData__F_ID] === elevationId) return list[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Elevation a Scene Drives, If Any
    // ------------------------------------------------------------
    // The hook the carousel path uses: an ordinary 3D scene returns null and
    // behaves exactly as it always has.
    // ------------------------------------------------------------
    function Na__ElevData__GetElevationForScene(block, scene) {
        if (!scene || typeof scene !== 'object') return null;
        const elevationId = scene[Na__ElevData__SCENE_ELEV_ID];
        if (!elevationId) return null;
        return Na__ElevData__GetElevationById(block, elevationId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Scene an Elevation Scene?
    // ------------------------------------------------------------
    function Na__ElevData__IsElevationScene(scene) {
        return Boolean(scene && typeof scene === 'object' && scene[Na__ElevData__SCENE_ELEV_ID]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Derived Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Elevation's Two Horizontal Axes
    // ------------------------------------------------------------
    // THE SINGLE PLACE AN AZIMUTH BECOMES VECTORS. Everything downstream - the
    // clip plane, the camera pose, the drawing plane mapping, the gizmo, the
    // face pick - reads this, so the direction convention can never drift.
    //
    //   normal  points FROM the building TOWARD the viewer
    //   right   is the direction that reads left-to-right on the finished sheet
    //
    // World north is -Z, so azimuth 0 puts the viewer to the north looking
    // south. The right axis is the camera's own screen-right for an upright
    // camera at that heading, which is why it is derived here rather than
    // guessed at each use.
    // ------------------------------------------------------------
    function Na__ElevData__GetAxes(elevation) {
        const azimuthRad = Na__ElevData__WrapAzimuth(
            elevation ? elevation[Na__ElevData__F_AZIMUTH] : 0
        ) * (Math.PI / 180);

        const normalX = Math.sin(azimuthRad);
        const normalZ = -Math.cos(azimuthRad);

        return {
            normalX : normalX,
            normalZ : normalZ,
            rightX  : normalZ,                                                   // <-- cross(worldUp, normal), reduced for a horizontal normal
            rightZ  : -normalX
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn a Horizontal Normal (building toward viewer) Into an Azimuth
    // ------------------------------------------------------------
    // The inverse of GetAxes, used by the face pick. Snapped to whole degrees
    // so a picked wall reads as a number a person would type.
    // ------------------------------------------------------------
    function Na__ElevData__AzimuthFromNormal(normalX, normalZ) {
        if (!Number.isFinite(normalX) || !Number.isFinite(normalZ)) return 0;
        const degrees = Math.atan2(normalX, -normalZ) * (180 / Math.PI);
        return Na__ElevData__WrapAzimuth(Math.round(degrees));
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Drawing Plane Origin in Millimetres
    // ------------------------------------------------------------
    function Na__ElevData__GetPlaneOriginMm(elevation) {
        const range  = Na__ElevCfg__GetPlaneOriginRangeMm();
        const origin = elevation ? elevation[Na__ElevData__F_ORIGIN] : null;

        return {
            xMm : (origin && Number.isFinite(origin.PosX)) ? origin.PosX : range.defaultXMm,
            zMm : (origin && Number.isFinite(origin.PosZ)) ? origin.PosZ : range.defaultZMm
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Drawing Plane to a New World X/Z Point
    // ------------------------------------------------------------
    function Na__ElevData__SetPlaneOriginMm(elevation, xMm, zMm) {
        if (!elevation) return false;

        const current = Na__ElevData__GetPlaneOriginMm(elevation);
        elevation[Na__ElevData__F_ORIGIN] = {
            PosX : Math.round(Number.isFinite(xMm) ? xMm : current.xMm),
            PosZ : Math.round(Number.isFinite(zMm) ? zMm : current.zMm)
        };
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Azimuth Directly (wrapped, whole degrees)
    // ------------------------------------------------------------
    function Na__ElevData__SetAzimuthDeg(elevation, degrees) {
        if (!elevation || !Number.isFinite(degrees)) return false;
        elevation[Na__ElevData__F_AZIMUTH] = Na__ElevData__WrapAzimuth(Math.round(degrees));
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far Along the View Axis the Plane Sits
    // ------------------------------------------------------------
    // The one number the section cut engine needs, and the one the two origin
    // sliders actually control between them: a move perpendicular to the view
    // changes nothing here, which is exactly right - sliding the plane
    // sideways does not change where it cuts.
    // ------------------------------------------------------------
    function Na__ElevData__GetPlaneDistanceMm(elevation) {
        const axes   = Na__ElevData__GetAxes(elevation);
        const origin = Na__ElevData__GetPlaneOriginMm(elevation);
        return (origin.xMm * axes.normalX) + (origin.zMm * axes.normalZ);
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a World X/Z Point to Its Horizontal Run on the Sheet
    // ------------------------------------------------------------
    // Measured from the WORLD ORIGIN along the right axis - see the header on
    // why not from the plane. This is drawing axis 1.
    // ------------------------------------------------------------
    function Na__ElevData__WorldToRunMm(elevation, worldXMm, worldZMm) {
        const axes = Na__ElevData__GetAxes(elevation);
        return (worldXMm * axes.rightX) + (worldZMm * axes.rightZ);
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a Horizontal Run Back to a World X/Z Point on the Plane
    // ------------------------------------------------------------
    function Na__ElevData__RunToWorldMm(elevation, runMm) {
        const axes       = Na__ElevData__GetAxes(elevation);
        const distanceMm = Na__ElevData__GetPlaneDistanceMm(elevation);

        return {
            xMm : (runMm * axes.rightX) + (distanceMm * axes.normalX),
            zMm : (runMm * axes.rightZ) + (distanceMm * axes.normalZ)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Elevation Cut, or Drawn Whole?
    // ------------------------------------------------------------
    function Na__ElevData__IsSection(elevation) {
        return Boolean(elevation && elevation[Na__ElevData__F_MODE] === Na__ElevData__MODE_SECTION);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get an Elevation's View Depth in Millimetres (null = infinite)
    // ------------------------------------------------------------
    function Na__ElevData__GetViewDepthMm(elevation) {
        if (!elevation) return null;
        const depth = elevation[Na__ElevData__F_VIEW_DEPTH];
        return (Number.isFinite(depth) && depth > 0) ? depth : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get an Elevation's Saved Zoom and Pan Target
    // ------------------------------------------------------------
    // The pan target is stored in the DRAWING's axes - horizontal run and
    // height - not in world X/Z, because that is what the camera is moved in.
    // Null members mean the elevation has never been framed.
    // ------------------------------------------------------------
    function Na__ElevData__GetSavedView(elevation) {
        if (!elevation) return { zoom: null, runMm: null, heightMm: null };

        const target = elevation[Na__ElevData__F_TARGET];
        const zoom   = elevation[Na__ElevData__F_ZOOM];

        return {
            zoom     : Number.isFinite(zoom) && zoom > 0 ? zoom : null,
            runMm    : (target && Number.isFinite(target.PosRun))    ? target.PosRun    : null,
            heightMm : (target && Number.isFinite(target.PosHeight)) ? target.PosHeight : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Store an Elevation's Zoom and Pan Target
    // ------------------------------------------------------------
    function Na__ElevData__SetSavedView(elevation, zoom, runMm, heightMm) {
        if (!elevation) return false;
        if (Number.isFinite(zoom) && zoom > 0) elevation[Na__ElevData__F_ZOOM] = zoom;
        if (Number.isFinite(runMm) && Number.isFinite(heightMm)) {
            elevation[Na__ElevData__F_TARGET] = {
                PosRun    : Math.round(runMm),
                PosHeight : Math.round(heightMm)
            };
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get an Elevation's Style Toggles as Plain Flags
    // ------------------------------------------------------------
    function Na__ElevData__GetStyles(elevation) {
        const flags = Object.assign({}, Na__ElevData__STYLE_DEFAULTS);
        if (!elevation) return flags;
        const styles = Na__ElevData__NormaliseStyles(elevation);
        Object.keys(Na__ElevData__STYLE_KEYS).forEach((name) => {
            flags[name] = styles[Na__ElevData__STYLE_KEYS[name]] === true;
        });
        return flags;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One Style Toggle by Its Flag Name
    // ------------------------------------------------------------
    function Na__ElevData__SetStyle(elevation, name, enabled) {
        if (!elevation || !Na__ElevData__STYLE_KEYS[name]) return false;
        Na__ElevData__NormaliseStyles(elevation)[Na__ElevData__STYLE_KEYS[name]] = (enabled === true);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Category Exclusion Tokens (null = AppConfig default list)
    // ------------------------------------------------------------
    function Na__ElevData__GetExcludeTokens(elevation) {
        if (!elevation) return null;
        const tokens = elevation[Na__ElevData__F_EXCLUDE];
        return Array.isArray(tokens) ? tokens.slice() : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Category Exclusion Tokens (null Restores the Default)
    // ------------------------------------------------------------
    function Na__ElevData__SetExcludeTokens(elevation, tokens) {
        if (!elevation) return false;
        elevation[Na__ElevData__F_EXCLUDE] = Array.isArray(tokens)
            ? tokens.map((t) => String(t).trim()).filter((t) => t.length > 0)
            : null;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Record How an Elevation Was Seeded (informational)
    // ------------------------------------------------------------
    function Na__ElevData__SetSeededFrom(elevation, source) {
        if (!elevation) return false;
        elevation[Na__ElevData__F_SEEDED_FROM] = (Na__ElevData__SEEDED_VALUES.indexOf(source) !== -1) ? source : 'manual';
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Mutating Elevations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure the Elevations Array Exists on the Block
    // ------------------------------------------------------------
    function Na__ElevData__EnsureArray(block) {
        const target = Na__ElevData__Block(block);
        if (!Array.isArray(target[Na__ElevData__ELEVATIONS_KEY])) {
            target[Na__ElevData__ELEVATIONS_KEY] = [];
        }
        return target[Na__ElevData__ELEVATIONS_KEY];
    }
    // ------------------------------------------------------------


    // FUNCTION | Allocate the Next Free Elevation Id
    // ------------------------------------------------------------
    // Scans for the highest numeric suffix in use rather than counting, so
    // deleting a middle elevation never causes an id collision.
    // ------------------------------------------------------------
    function Na__ElevData__NextElevationId(block) {
        const list = Na__ElevData__GetElevations(block);
        let highest = 0;

        for (let i = 0; i < list.length; i++) {
            const id = list[i][Na__ElevData__F_ID];
            if (typeof id !== 'string' || !id.startsWith(Na__ElevData__ID_PREFIX)) continue;
            const parsed = parseInt(id.slice(Na__ElevData__ID_PREFIX.length), 10);
            if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
        }

        return Na__ElevData__ID_PREFIX + String(highest + 1).padStart(Na__ElevData__ID_PADDING, '0');
    }
    // ------------------------------------------------------------


    // FUNCTION | Create and Append a New Elevation
    // ------------------------------------------------------------
    // options: { name, azimuthDeg, mode, originXMm, originZMm, viewDepthMm,
    // seededFrom }. Anything omitted falls back to the config default.
    // ------------------------------------------------------------
    function Na__ElevData__CreateElevation(block, options) {
        const array = Na__ElevData__EnsureArray(block);

        const opts        = options || {};
        const direction   = Na__ElevCfg__GetDirectionSetup();
        const originRange = Na__ElevCfg__GetPlaneOriginRangeMm();
        const order       = array.length + 1;

        const record = {};
        record[Na__ElevData__F_ID]      = Na__ElevData__NextElevationId(block);
        record[Na__ElevData__F_NAME]    = (typeof opts.name === 'string' && opts.name.trim().length > 0)
            ? opts.name.trim()
            : Na__ElevCfg__FormatLabel('NewElevationNameFormat', 'Elevation {index}', { index: order });
        record[Na__ElevData__F_ORDER]   = order;
        record[Na__ElevData__F_ENABLED] = true;
        record[Na__ElevData__F_AZIMUTH] = Na__ElevData__WrapAzimuth(
            Number.isFinite(opts.azimuthDeg) ? Math.round(opts.azimuthDeg) : direction.defaultDeg
        );
        record[Na__ElevData__F_MODE]    = (opts.mode === Na__ElevData__MODE_SECTION)
            ? Na__ElevData__MODE_SECTION
            : Na__ElevData__MODE_ELEVATION;
        record[Na__ElevData__F_ORIGIN]  = {
            PosX : Math.round(Number.isFinite(opts.originXMm) ? opts.originXMm : originRange.defaultXMm),
            PosZ : Math.round(Number.isFinite(opts.originZMm) ? opts.originZMm : originRange.defaultZMm)
        };
        record[Na__ElevData__F_VIEW_DEPTH]  = Number.isFinite(opts.viewDepthMm) && opts.viewDepthMm > 0
            ? opts.viewDepthMm
            : Na__ElevCfg__GetDefaultViewDepthMm();
        record[Na__ElevData__F_SCENE_ID]    = null;                              // <-- Linked when the scene is created
        record[Na__ElevData__F_ANNOTATIONS] = [];
        record[Na__ElevData__F_DIMENSIONS]  = [];
        record[Na__ElevData__F_EXCLUDE]     = null;
        record[Na__ElevData__F_LINEWORK]    = null;
        record[Na__ElevData__F_SEEDED_FROM] = (Na__ElevData__SEEDED_VALUES.indexOf(opts.seededFrom) !== -1) ? opts.seededFrom : 'manual';
        Na__ElevData__NormaliseStyles(record);

        array.push(record);
        return record;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete an Elevation and Unlink Its Scene
    // ------------------------------------------------------------
    // Returns the id of the scene that should be removed alongside it, or
    // null. The caller owns scene deletion so scene ordering stays in one
    // place rather than being split across two modules.
    // ------------------------------------------------------------
    function Na__ElevData__DeleteElevation(block, elevationId) {
        const array = Na__ElevData__EnsureArray(block);

        let orphanedSceneId = null;
        for (let i = 0; i < array.length; i++) {
            if (array[i][Na__ElevData__F_ID] !== elevationId) continue;
            orphanedSceneId = array[i][Na__ElevData__F_SCENE_ID] || null;
            array.splice(i, 1);
            break;
        }

        Na__ElevData__RenumberOrder(block);
        return orphanedSceneId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rewrite Order to a Clean 1..n Sequence
    // ------------------------------------------------------------
    function Na__ElevData__RenumberOrder(block) {
        const list = Na__ElevData__GetElevations(block);
        for (let i = 0; i < list.length; i++) list[i][Na__ElevData__F_ORDER] = i + 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Link an Elevation to the Scene That Displays It
    // ------------------------------------------------------------
    // Writes both directions at once so the pair can never half-exist.
    // ------------------------------------------------------------
    function Na__ElevData__LinkToScene(elevation, scene) {
        if (!elevation || !scene) return false;
        elevation[Na__ElevData__F_SCENE_ID] = scene[Na__ElevData__SCENE_ID_KEY];
        scene[Na__ElevData__SCENE_ELEV_ID]  = elevation[Na__ElevData__F_ID];
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Scene an Elevation Is Displayed By
    // ------------------------------------------------------------
    // sceneConfig is the PresentationMode__SavedCameraScenes block: the scene
    // side of the link lives there.
    // ------------------------------------------------------------
    function Na__ElevData__FindSceneFor(sceneConfig, elevation) {
        if (!sceneConfig || !elevation) return null;
        const scenes = sceneConfig[Na__ElevData__SCENES_KEY];
        if (!Array.isArray(scenes)) return null;

        const elevationId = elevation[Na__ElevData__F_ID];
        for (let i = 0; i < scenes.length; i++) {
            if (scenes[i] && scenes[i][Na__ElevData__SCENE_ELEV_ID] === elevationId) return scenes[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Markup Storage
// -----------------------------------------------------------------------------

    // FUNCTION | Get an Elevation's Annotation Array (Live Reference)
    // ------------------------------------------------------------
    // Stored opaquely: the annotations system owns the item shape, this module
    // only guarantees the array exists and is persisted. Handing back the LIVE
    // array is what lets the overlay, the undo stack and the saved record all
    // hold one object rather than three copies.
    // ------------------------------------------------------------
    function Na__ElevData__GetAnnotations(elevation) {
        if (!elevation) return [];
        if (!Array.isArray(elevation[Na__ElevData__F_ANNOTATIONS])) {
            elevation[Na__ElevData__F_ANNOTATIONS] = [];
        }
        return elevation[Na__ElevData__F_ANNOTATIONS];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get an Elevation's Dimension Array (Live Reference)
    // ------------------------------------------------------------
    function Na__ElevData__GetDimensions(elevation) {
        if (!elevation) return [];
        if (!Array.isArray(elevation[Na__ElevData__F_DIMENSIONS])) {
            elevation[Na__ElevData__F_DIMENSIONS] = [];
        }
        return elevation[Na__ElevData__F_DIMENSIONS];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Project Data API
    // ------------------------------------------------------------
    export {
        Na__ElevData__ELEVATIONS_KEY,
        Na__ElevData__SCENE_ELEV_ID,
        Na__ElevData__MODE_ELEVATION,
        Na__ElevData__MODE_SECTION,
        Na__ElevData__STYLE_KEYS,
        Na__ElevData__GetElevations,
        Na__ElevData__GetEnabledElevations,
        Na__ElevData__GetElevationById,
        Na__ElevData__GetElevationForScene,
        Na__ElevData__IsElevationScene,
        Na__ElevData__GetAxes,
        Na__ElevData__AzimuthFromNormal,
        Na__ElevData__GetPlaneOriginMm,
        Na__ElevData__SetPlaneOriginMm,
        Na__ElevData__SetAzimuthDeg,
        Na__ElevData__GetPlaneDistanceMm,
        Na__ElevData__WorldToRunMm,
        Na__ElevData__RunToWorldMm,
        Na__ElevData__IsSection,
        Na__ElevData__GetViewDepthMm,
        Na__ElevData__GetSavedView,
        Na__ElevData__SetSavedView,
        Na__ElevData__GetStyles,
        Na__ElevData__SetStyle,
        Na__ElevData__GetExcludeTokens,
        Na__ElevData__SetExcludeTokens,
        Na__ElevData__SetSeededFrom,
        Na__ElevData__NextElevationId,
        Na__ElevData__CreateElevation,
        Na__ElevData__DeleteElevation,
        Na__ElevData__RenumberOrder,
        Na__ElevData__LinkToScene,
        Na__ElevData__FindSceneFor,
        Na__ElevData__GetAnnotations,
        Na__ElevData__GetDimensions
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
