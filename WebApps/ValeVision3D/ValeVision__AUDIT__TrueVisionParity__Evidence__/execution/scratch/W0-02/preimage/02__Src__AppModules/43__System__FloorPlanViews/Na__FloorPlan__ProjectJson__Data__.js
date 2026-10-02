// =============================================================================
// VALEVISION3D - FLOOR PLAN VIEWS - PROJECT DATA
// =============================================================================
//
// FILE       : Na__FloorPlan__ProjectJson__Data__.js
// NAMESPACE  : Na__FpData
// MODULE     : Floor Plan Views - Project Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, validate, normalise and mutate the per-project floor plan definitions
// CREATED    : 31-Aug-2026
//
// DESCRIPTION:
// - Floor plans are stored in the LayoutEditor__DrawingsData block under
//   ...__FloorPlans, owned by Na__DrawView__ProjectData__. The scene that
//   displays a plan carries PresentationMode__Scene__FloorPlanId inside the
//   presentation block, so the scene side never has to know the drawing
//   block's shape and the drawing side never has to know the scene's.
// - A floor plan owns a floor DATUM and a CUT OFFSET above it. The cut height
//   is datum + offset, so a plan authored at datum 0 still slices the walls at
//   the standard architectural height rather than skimming the slab.
// - Annotations and dimensions ride along inside each plan, so every plan cut
//   carries its own independent markup. This module stores them opaquely; the
//   markup systems own their shape.
// - Each plan also carries its STYLE TOGGLES (projected linework, profile
//   linework, glass transparency off, whitecard, hidden lines) and an optional
//   per-category exclusion list, so a carousel drawing and a Layout Editor
//   viewport of the same plan read identically.
// - Pure data layer - no DOM, no Three.js, no camera operations.
//
// INTEGRATION:
// - Na__FloorPlan__DevMenu__Editor__ mutates through here, then saves through
//   Na__DrawView__ProjectData__.
// - Na__FloorPlan__ModeController__ reads through here to drive the cut.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js
// - Source version: 1.0.0 (31-Aug-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : adapted
// - Divergences   :
//   - Records live in LayoutEditor__DrawingsData__FloorPlans (plan D08); every reader takes the drawings
//     block, defaulting to the live one, instead of the presentation block.
//   - The client measuring grant moved to the drawings block (Na__DrawView__ProjectData__).
//   - Styles, exclusion tokens and the linework asset slot added (D19, D20, D33).
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.1.1
// - Projected Linework defaults to off on a new plan: the projection only runs when a record asks for it.
//
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: drawings block, styles, exclusions, asset slot.
//
// 31-Aug-2026 - Version 1.0.0
// - Initial implementation for the Floor Plan Builder.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Floor Plan Config Defaults
    // ------------------------------------------------------------
    // @delegate: ./Na__FloorPlan__ConfigState__.js
    // ------------------------------------------------------------
    import {
        Na__FpCfg__GetDatumRangeMm,
        Na__FpCfg__GetCutOffsetMm,
        Na__FpCfg__GetDefaultViewDepthMm,
        Na__FpCfg__FormatLabel
    } from './Na__FloorPlan__ConfigState__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Drawings Block and Its Scene Link Keys
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js
    // ------------------------------------------------------------
    import {
        Na__DrawData__FLOOR_PLANS_KEY,
        Na__DrawData__SCENE_PLAN_ID_KEY,
        Na__DrawData__GetBlock,
        Na__DrawData__GetClientDimensionsEnabled,
        Na__DrawData__SetClientDimensionsEnabled
    } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | JSON Key Names
    // ------------------------------------------------------------
    const Na__FpData__FLOOR_PLANS_KEY   = Na__DrawData__FLOOR_PLANS_KEY;         // <-- Inside LayoutEditor__DrawingsData
    const Na__FpData__SCENE_PLAN_ID_KEY = Na__DrawData__SCENE_PLAN_ID_KEY;       // <-- On the scene, inside the presentation block
    const Na__FpData__SCENE_ID_KEY      = 'PresentationMode__Scene__Id';
    const Na__FpData__SCENES_KEY        = 'PresentationMode__SavedCameraScenes__Scenes';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Floor Plan Record Field Names
    // ------------------------------------------------------------
    const Na__FpData__PLAN_ID           = 'FloorPlan__Id';
    const Na__FpData__PLAN_NAME         = 'FloorPlan__Name';
    const Na__FpData__PLAN_ORDER        = 'FloorPlan__Order';
    const Na__FpData__PLAN_ENABLED      = 'FloorPlan__Enabled';
    const Na__FpData__PLAN_DATUM_MM     = 'FloorPlan__FloorDatumMm';
    const Na__FpData__PLAN_CUT_OFFSET   = 'FloorPlan__CutOffsetMm';
    const Na__FpData__PLAN_VIEW_DEPTH   = 'FloorPlan__ViewDepthMm';
    const Na__FpData__PLAN_SCENE_ID     = 'FloorPlan__SceneId';
    const Na__FpData__PLAN_ZOOM         = 'FloorPlan__CameraZoom';
    const Na__FpData__PLAN_TARGET       = 'FloorPlan__CameraTargetMm';
    const Na__FpData__PLAN_ANNOTATIONS  = 'FloorPlan__Annotations';
    const Na__FpData__PLAN_DIMENSIONS   = 'FloorPlan__Dimensions';
    const Na__FpData__PLAN_STYLES       = 'FloorPlan__Styles';
    const Na__FpData__PLAN_EXCLUDE      = 'FloorPlan__ExcludeCategoryTokens';
    const Na__FpData__PLAN_LINEWORK     = 'FloorPlan__LineworkAsset';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Style Toggle Keys and Defaults (D33)
    // ------------------------------------------------------------
    const Na__FpData__STYLE_KEYS = Object.freeze({
        projectedLinework : 'Styles__ProjectedLinework',
        profileLinework   : 'Styles__ProfileLinework',
        glassOpaque       : 'Styles__GlassOpaque',
        whitecard         : 'Styles__Whitecard',
        hiddenLines       : 'Styles__HiddenLines'
    });
    const Na__FpData__STYLE_DEFAULTS = Object.freeze({
        projectedLinework : false,                                          // <-- Off until asked for: the projection is the slow part
        profileLinework   : true,
        glassOpaque       : false,
        whitecard         : true,
        hiddenLines       : false
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Id Formatting
    // ------------------------------------------------------------
    const Na__FpData__ID_PREFIX  = 'FloorPlan_';
    const Na__FpData__ID_PADDING = 3;                                            // <-- FloorPlan_001
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation and Normalisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Block to Read (the live one unless a caller supplies its own)
    // ------------------------------------------------------------
    function Na__FpData__Block(block) {
        return (block && typeof block === 'object') ? block : Na__DrawData__GetBlock();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This a Structurally Valid Floor Plan Record?
    // ------------------------------------------------------------
    function Na__FpData__IsValidPlan(plan) {
        if (!plan || typeof plan !== 'object') return false;

        const id   = plan[Na__FpData__PLAN_ID];
        const name = plan[Na__FpData__PLAN_NAME];
        if (!id || typeof id !== 'string')     return false;                     // <-- Id must exist
        if (!name || typeof name !== 'string') return false;                     // <-- Name must exist

        return Number.isFinite(plan[Na__FpData__PLAN_DATUM_MM]);                 // <-- Datum must be numeric
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill In Any Missing Optional Fields From Config
    // ------------------------------------------------------------
    // Applied on read so a hand-edited or partially written plan still drives
    // a correct cut rather than producing NaN geometry.
    // ------------------------------------------------------------
    function Na__FpData__NormalisePlan(plan, index) {
        const cutOffset = Na__FpCfg__GetCutOffsetMm();

        if (!Number.isFinite(plan[Na__FpData__PLAN_CUT_OFFSET])) {
            plan[Na__FpData__PLAN_CUT_OFFSET] = cutOffset.defaultMm;
        }
        if (!Number.isFinite(plan[Na__FpData__PLAN_ORDER])) {
            plan[Na__FpData__PLAN_ORDER] = index + 1;
        }
        if (typeof plan[Na__FpData__PLAN_ENABLED] !== 'boolean') {
            plan[Na__FpData__PLAN_ENABLED] = true;
        }
        if (!Array.isArray(plan[Na__FpData__PLAN_ANNOTATIONS])) {
            plan[Na__FpData__PLAN_ANNOTATIONS] = [];
        }
        if (!Array.isArray(plan[Na__FpData__PLAN_DIMENSIONS])) {
            plan[Na__FpData__PLAN_DIMENSIONS] = [];
        }
        // View depth is deliberately allowed to stay null - that is the
        // ordinary infinite cut downward, not a missing value.
        if (plan[Na__FpData__PLAN_VIEW_DEPTH] !== null
            && !Number.isFinite(plan[Na__FpData__PLAN_VIEW_DEPTH])) {
            plan[Na__FpData__PLAN_VIEW_DEPTH] = null;
        }
        Na__FpData__NormaliseStyles(plan);
        if (plan[Na__FpData__PLAN_EXCLUDE] !== null && !Array.isArray(plan[Na__FpData__PLAN_EXCLUDE])) {
            plan[Na__FpData__PLAN_EXCLUDE] = null;                               // <-- null = the AppConfig default list
        }
        if (plan[Na__FpData__PLAN_EXCLUDE] === undefined)  plan[Na__FpData__PLAN_EXCLUDE]  = null;
        if (plan[Na__FpData__PLAN_LINEWORK] === undefined) plan[Na__FpData__PLAN_LINEWORK] = null;
        return plan;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make Sure Every Style Toggle Exists on a Plan
    // ------------------------------------------------------------
    function Na__FpData__NormaliseStyles(plan) {
        let styles = plan[Na__FpData__PLAN_STYLES];
        if (!styles || typeof styles !== 'object') {
            styles = {};
            plan[Na__FpData__PLAN_STYLES] = styles;
        }
        Object.keys(Na__FpData__STYLE_KEYS).forEach((name) => {
            const key = Na__FpData__STYLE_KEYS[name];
            if (typeof styles[key] !== 'boolean') styles[key] = Na__FpData__STYLE_DEFAULTS[name];
        });
        return styles;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Reading Floor Plans
// -----------------------------------------------------------------------------

    // FUNCTION | Get Every Valid Floor Plan, Sorted by Order
    // ------------------------------------------------------------
    // block is the LayoutEditor__DrawingsData object; omitted means the live
    // one. Returns a new array of the LIVE plan objects, so mutating a returned
    // plan edits what the save path will write.
    // ------------------------------------------------------------
    function Na__FpData__GetFloorPlans(block) {
        const raw = Na__FpData__Block(block)[Na__FpData__FLOOR_PLANS_KEY];
        if (!Array.isArray(raw)) return [];                                      // <-- A project with no plans reads as an empty set

        return raw
            .filter(Na__FpData__IsValidPlan)
            .map(Na__FpData__NormalisePlan)
            .sort((a, b) => a[Na__FpData__PLAN_ORDER] - b[Na__FpData__PLAN_ORDER]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Only the Enabled Floor Plans
    // ------------------------------------------------------------
    function Na__FpData__GetEnabledFloorPlans(block) {
        return Na__FpData__GetFloorPlans(block)
            .filter((plan) => plan[Na__FpData__PLAN_ENABLED] !== false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get One Floor Plan by Id
    // ------------------------------------------------------------
    function Na__FpData__GetPlanById(block, planId) {
        if (!planId) return null;
        const plans = Na__FpData__GetFloorPlans(block);
        for (let i = 0; i < plans.length; i++) {
            if (plans[i][Na__FpData__PLAN_ID] === planId) return plans[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Floor Plan a Scene Drives, If Any
    // ------------------------------------------------------------
    // This is the hook the carousel path uses: an ordinary 3D scene returns
    // null and behaves exactly as it always has. The block argument is
    // optional; the scene's link key is all the scene side supplies.
    // ------------------------------------------------------------
    function Na__FpData__GetPlanForScene(block, scene) {
        if (!scene || typeof scene !== 'object') return null;
        const planId = scene[Na__FpData__SCENE_PLAN_ID_KEY];
        if (!planId) return null;
        return Na__FpData__GetPlanById(block, planId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Scene a Floor Plan Scene?
    // ------------------------------------------------------------
    function Na__FpData__IsFloorPlanScene(scene) {
        return Boolean(scene && typeof scene === 'object' && scene[Na__FpData__SCENE_PLAN_ID_KEY]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Derived Values
// -----------------------------------------------------------------------------

    // FUNCTION | Compute the Absolute Cut Height of a Plan in Millimetres
    // ------------------------------------------------------------
    // The single place datum and offset are combined. Everything downstream -
    // the clip plane, the camera height, the annotation layer - reads this,
    // so the two-number model can never drift apart.
    // ------------------------------------------------------------
    function Na__FpData__GetCutHeightMm(plan) {
        if (!plan) return null;

        const datum  = Number.isFinite(plan[Na__FpData__PLAN_DATUM_MM])
            ? plan[Na__FpData__PLAN_DATUM_MM]
            : Na__FpCfg__GetDatumRangeMm().defaultMm;
        const offset = Number.isFinite(plan[Na__FpData__PLAN_CUT_OFFSET])
            ? plan[Na__FpData__PLAN_CUT_OFFSET]
            : Na__FpCfg__GetCutOffsetMm().defaultMm;

        return datum + offset;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Plan's View Depth in Millimetres (null = infinite)
    // ------------------------------------------------------------
    function Na__FpData__GetViewDepthMm(plan) {
        if (!plan) return null;
        const depth = plan[Na__FpData__PLAN_VIEW_DEPTH];
        return (Number.isFinite(depth) && depth > 0) ? depth : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Plan's Saved Camera Zoom and Pan Target
    // ------------------------------------------------------------
    // Returns null members when the plan has never been framed, which tells
    // the camera module to fit the model bounds instead.
    // ------------------------------------------------------------
    function Na__FpData__GetSavedView(plan) {
        if (!plan) return { zoom: null, targetXMm: null, targetZMm: null };

        const target = plan[Na__FpData__PLAN_TARGET];
        const zoom   = plan[Na__FpData__PLAN_ZOOM];

        return {
            zoom      : Number.isFinite(zoom) && zoom > 0 ? zoom : null,
            targetXMm : (target && Number.isFinite(target.PosX)) ? target.PosX : null,
            targetZMm : (target && Number.isFinite(target.PosZ)) ? target.PosZ : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Store a Plan's Camera Zoom and Pan Target
    // ------------------------------------------------------------
    function Na__FpData__SetSavedView(plan, zoom, targetXMm, targetZMm) {
        if (!plan) return false;
        if (Number.isFinite(zoom) && zoom > 0) plan[Na__FpData__PLAN_ZOOM] = zoom;
        if (Number.isFinite(targetXMm) && Number.isFinite(targetZMm)) {
            plan[Na__FpData__PLAN_TARGET] = {
                PosX : Math.round(targetXMm),
                PosZ : Math.round(targetZMm)
            };
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Plan's Style Toggles as Plain Flags
    // ------------------------------------------------------------
    // Returns { projectedLinework, profileLinework, glassOpaque, whitecard,
    // hiddenLines } - the shape the composer and material presets read.
    // ------------------------------------------------------------
    function Na__FpData__GetStyles(plan) {
        const flags  = Object.assign({}, Na__FpData__STYLE_DEFAULTS);
        if (!plan) return flags;
        const styles = Na__FpData__NormaliseStyles(plan);
        Object.keys(Na__FpData__STYLE_KEYS).forEach((name) => {
            flags[name] = styles[Na__FpData__STYLE_KEYS[name]] === true;
        });
        return flags;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One Style Toggle by Its Flag Name
    // ------------------------------------------------------------
    function Na__FpData__SetStyle(plan, name, enabled) {
        if (!plan || !Na__FpData__STYLE_KEYS[name]) return false;
        Na__FpData__NormaliseStyles(plan)[Na__FpData__STYLE_KEYS[name]] = (enabled === true);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Plan's Category Exclusion Tokens (null = AppConfig default list)
    // ------------------------------------------------------------
    function Na__FpData__GetExcludeTokens(plan) {
        if (!plan) return null;
        const tokens = plan[Na__FpData__PLAN_EXCLUDE];
        return Array.isArray(tokens) ? tokens.slice() : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Plan's Category Exclusion Tokens (null Restores the Default)
    // ------------------------------------------------------------
    function Na__FpData__SetExcludeTokens(plan, tokens) {
        if (!plan) return false;
        plan[Na__FpData__PLAN_EXCLUDE] = Array.isArray(tokens)
            ? tokens.map((t) => String(t).trim()).filter((t) => t.length > 0)
            : null;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Mutating Floor Plans
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure the Floor Plans Array Exists on the Block
    // ------------------------------------------------------------
    function Na__FpData__EnsureArray(block) {
        const target = Na__FpData__Block(block);
        if (!Array.isArray(target[Na__FpData__FLOOR_PLANS_KEY])) {
            target[Na__FpData__FLOOR_PLANS_KEY] = [];
        }
        return target[Na__FpData__FLOOR_PLANS_KEY];
    }
    // ------------------------------------------------------------


    // FUNCTION | Allocate the Next Free Floor Plan Id
    // ------------------------------------------------------------
    // Scans for the highest numeric suffix in use rather than counting, so
    // deleting a middle plan never causes an id collision.
    // ------------------------------------------------------------
    function Na__FpData__NextPlanId(block) {
        const plans = Na__FpData__GetFloorPlans(block);
        let highest = 0;

        for (let i = 0; i < plans.length; i++) {
            const id = plans[i][Na__FpData__PLAN_ID];
            if (typeof id !== 'string' || !id.startsWith(Na__FpData__ID_PREFIX)) continue;
            const parsed = parseInt(id.slice(Na__FpData__ID_PREFIX.length), 10);
            if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
        }

        return Na__FpData__ID_PREFIX + String(highest + 1).padStart(Na__FpData__ID_PADDING, '0');
    }
    // ------------------------------------------------------------


    // FUNCTION | Create and Append a New Floor Plan
    // ------------------------------------------------------------
    // options: { name, floorDatumMm, cutOffsetMm, viewDepthMm }. Anything
    // omitted falls back to the config default.
    // ------------------------------------------------------------
    function Na__FpData__CreatePlan(block, options) {
        const array = Na__FpData__EnsureArray(block);

        const opts       = options || {};
        const datumRange = Na__FpCfg__GetDatumRangeMm();
        const cutOffset  = Na__FpCfg__GetCutOffsetMm();
        const planId     = Na__FpData__NextPlanId(block);
        const order      = array.length + 1;

        const plan = {};
        plan[Na__FpData__PLAN_ID]          = planId;
        plan[Na__FpData__PLAN_NAME]        = (typeof opts.name === 'string' && opts.name.trim().length > 0)
            ? opts.name.trim()
            : Na__FpCfg__FormatLabel('NewPlanNameFormat', 'Floor Plan {index}', { index: order });
        plan[Na__FpData__PLAN_ORDER]       = order;
        plan[Na__FpData__PLAN_ENABLED]     = true;
        plan[Na__FpData__PLAN_DATUM_MM]    = Number.isFinite(opts.floorDatumMm) ? opts.floorDatumMm : datumRange.defaultMm;
        plan[Na__FpData__PLAN_CUT_OFFSET]  = Number.isFinite(opts.cutOffsetMm)  ? opts.cutOffsetMm  : cutOffset.defaultMm;
        plan[Na__FpData__PLAN_VIEW_DEPTH]  = Number.isFinite(opts.viewDepthMm) && opts.viewDepthMm > 0
            ? opts.viewDepthMm
            : Na__FpCfg__GetDefaultViewDepthMm();
        plan[Na__FpData__PLAN_SCENE_ID]    = null;                               // <-- Linked when the scene is created
        plan[Na__FpData__PLAN_ANNOTATIONS] = [];
        plan[Na__FpData__PLAN_DIMENSIONS]  = [];
        plan[Na__FpData__PLAN_EXCLUDE]     = null;
        plan[Na__FpData__PLAN_LINEWORK]    = null;
        Na__FpData__NormaliseStyles(plan);

        array.push(plan);
        return plan;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Floor Plan and Unlink Its Scene
    // ------------------------------------------------------------
    // Returns the id of the scene that should be removed alongside it, or
    // null. The caller owns scene deletion so scene ordering stays in one
    // place rather than being split across two modules.
    // ------------------------------------------------------------
    function Na__FpData__DeletePlan(block, planId) {
        const array = Na__FpData__EnsureArray(block);

        let orphanedSceneId = null;
        for (let i = 0; i < array.length; i++) {
            if (array[i][Na__FpData__PLAN_ID] !== planId) continue;
            orphanedSceneId = array[i][Na__FpData__PLAN_SCENE_ID] || null;
            array.splice(i, 1);
            break;
        }

        Na__FpData__RenumberOrder(block);
        return orphanedSceneId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rewrite Order to a Clean 1..n Sequence
    // ------------------------------------------------------------
    function Na__FpData__RenumberOrder(block) {
        const plans = Na__FpData__GetFloorPlans(block);
        for (let i = 0; i < plans.length; i++) plans[i][Na__FpData__PLAN_ORDER] = i + 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Link a Floor Plan to the Scene That Displays It
    // ------------------------------------------------------------
    // Writes both directions at once so the pair can never half-exist.
    // ------------------------------------------------------------
    function Na__FpData__LinkPlanToScene(plan, scene) {
        if (!plan || !scene) return false;
        plan[Na__FpData__PLAN_SCENE_ID]      = scene[Na__FpData__SCENE_ID_KEY];
        scene[Na__FpData__SCENE_PLAN_ID_KEY] = plan[Na__FpData__PLAN_ID];
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Scene a Floor Plan Is Displayed By
    // ------------------------------------------------------------
    // sceneConfig is the PresentationMode__SavedCameraScenes block: the scene
    // side of the link lives there.
    // ------------------------------------------------------------
    function Na__FpData__FindSceneForPlan(sceneConfig, plan) {
        if (!sceneConfig || !plan) return null;
        const scenes = sceneConfig[Na__FpData__SCENES_KEY];
        if (!Array.isArray(scenes)) return null;

        const planId = plan[Na__FpData__PLAN_ID];
        for (let i = 0; i < scenes.length; i++) {
            if (scenes[i] && scenes[i][Na__FpData__SCENE_PLAN_ID_KEY] === planId) return scenes[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Client Measuring Grant
// -----------------------------------------------------------------------------

    // FUNCTION | May Clients Measure on This Project?
    // ------------------------------------------------------------
    // Lives on the drawings block. Absent reads as OFF: a project nobody has
    // considered never exposes the tool. The argument is accepted for call
    // compatibility and ignored; the grant is project-wide.
    // ------------------------------------------------------------
    function Na__FpData__GetClientDimensionsEnabled() {
        return Na__DrawData__GetClientDimensionsEnabled();
    }
    // ------------------------------------------------------------


    // FUNCTION | Grant or Withhold Client Measuring for This Project
    // ------------------------------------------------------------
    function Na__FpData__SetClientDimensionsEnabled(ignoredBlock, enabled) {
        return Na__DrawData__SetClientDimensionsEnabled(enabled === true || ignoredBlock === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Annotations Storage
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Plan's Annotation Array (Live Reference)
    // ------------------------------------------------------------
    // Stored opaquely: the annotations system owns the item shape, this
    // module only guarantees the array exists and is persisted.
    // ------------------------------------------------------------
    function Na__FpData__GetAnnotations(plan) {
        if (!plan) return [];
        if (!Array.isArray(plan[Na__FpData__PLAN_ANNOTATIONS])) {
            plan[Na__FpData__PLAN_ANNOTATIONS] = [];
        }
        return plan[Na__FpData__PLAN_ANNOTATIONS];
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace a Plan's Annotation Array Wholesale
    // ------------------------------------------------------------
    function Na__FpData__SetAnnotations(plan, annotations) {
        if (!plan) return false;
        plan[Na__FpData__PLAN_ANNOTATIONS] = Array.isArray(annotations) ? annotations : [];
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Floor Plan Project Data API
    // ------------------------------------------------------------
    export {
        Na__FpData__FLOOR_PLANS_KEY,
        Na__FpData__SCENE_PLAN_ID_KEY,
        Na__FpData__STYLE_KEYS,
        Na__FpData__GetFloorPlans,
        Na__FpData__GetEnabledFloorPlans,
        Na__FpData__GetPlanById,
        Na__FpData__GetPlanForScene,
        Na__FpData__IsFloorPlanScene,
        Na__FpData__GetCutHeightMm,
        Na__FpData__GetViewDepthMm,
        Na__FpData__GetSavedView,
        Na__FpData__SetSavedView,
        Na__FpData__GetStyles,
        Na__FpData__SetStyle,
        Na__FpData__GetExcludeTokens,
        Na__FpData__SetExcludeTokens,
        Na__FpData__NextPlanId,
        Na__FpData__CreatePlan,
        Na__FpData__DeletePlan,
        Na__FpData__RenumberOrder,
        Na__FpData__LinkPlanToScene,
        Na__FpData__FindSceneForPlan,
        Na__FpData__GetClientDimensionsEnabled,
        Na__FpData__SetClientDimensionsEnabled,
        Na__FpData__GetAnnotations,
        Na__FpData__SetAnnotations
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
