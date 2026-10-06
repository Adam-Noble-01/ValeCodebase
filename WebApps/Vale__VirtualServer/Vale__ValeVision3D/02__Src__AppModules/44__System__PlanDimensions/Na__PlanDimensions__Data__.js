// =============================================================================
// VALEVISION3D - PLAN DIMENSIONS - DATA MODEL
// =============================================================================
//
// FILE       : Na__PlanDimensions__Data__.js
// NAMESPACE  : Na__PlanDim
// MODULE     : Plan Dimensions - Data Model
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the dimension record shape and per-plan storage
// CREATED    : 31-Aug-2026
//
// DESCRIPTION:
// - Dimensions ride INSIDE each floor plan record, as FloorPlan__Dimensions,
//   exactly as that plan's annotations ride in FloorPlan__Annotations. In
//   ValeVision the plan records live in the LayoutEditor__DrawingsData block,
//   which the SketchUp cloud sync never writes, so dimensions survive a
//   re-sync without any key list needing to know about them.
// - A dimension stores only its two snapped endpoints, an axis lock and a
//   perpendicular offset. The LENGTH IS NEVER STORED - it is recomputed from
//   the endpoints on every read. Storing a measured figure alongside the
//   geometry that produces it is how drawings end up lying: the two drift
//   apart the moment anything is edited, and the number is the half everyone
//   trusts. Derived-on-read cannot drift.
// - Endpoints arrive already snapped by Na__PlanDimensions__Grid__, and are
//   re-snapped on normalise so a hand-edited JSON figure is pulled back onto
//   the grid rather than rendering half a step off every other dimension.
//
// INTEGRATION:
// - Na__PlanDimensions__Overlay__ reads through here to draw the SVG layer.
// - Na__PlanDimensions__Editor__ mutates through here.
// - Na__FloorPlan__ModeController__ resolves the per-plan array through
//   GetPlanDimensions and hands it to both of them.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Data__.js
// - Source version: 1.0.0 (31-Aug-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : adapted (split)
// - Divergences   :
//   - Config fetch and every Get*Setup getter moved to Na__PlanDimensions__ConfigState__.js so both files stay inside the line budget.
//   - Header prose describes the ValeVision drawings block instead of the TrueVision presentation block.
// - Back-port     : the split itself.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - ValeVision3D v2.18.0 (port Phase 2)
// - Split: config loading and getters moved to Na__PlanDimensions__ConfigState__.js; record layer unchanged.
//
// 31-Aug-2026 - Version 1.0.0
// - Initial implementation for the Floor Plan Builder dimensioning system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Snap Grid
    // ------------------------------------------------------------
    // @delegate: ./Na__PlanDimensions__Grid__.js
    // ------------------------------------------------------------
    import {
        Na__PlanDimGrid__AXIS_X,
        Na__PlanDimGrid__AXIS_Z,
        Na__PlanDimGrid__AXIS_FREE,
        Na__PlanDimGrid__SnapValueMm,
        Na__PlanDimGrid__SnapMeasurementMm
    } from './Na__PlanDimensions__Grid__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Config Blocks (split out to Na__PlanDimensions__ConfigState__)
    // ------------------------------------------------------------
    // @delegate: ./Na__PlanDimensions__ConfigState__.js
    // ------------------------------------------------------------
    import {
        Na__PlanDim__GetLineSetup,
        Na__PlanDim__GetTextSetup,
        Na__PlanDim__GetClientModeSetup
    } from './Na__PlanDimensions__ConfigState__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Record Field Names
    // ------------------------------------------------------------
    const Na__PlanDim__F_ID       = 'Dimension__Id';
    const Na__PlanDim__F_AXIS     = 'Dimension__Axis';
    const Na__PlanDim__F_START_X  = 'Dimension__StartXMm';
    const Na__PlanDim__F_START_Z  = 'Dimension__StartZMm';
    const Na__PlanDim__F_END_X    = 'Dimension__EndXMm';
    const Na__PlanDim__F_END_Z    = 'Dimension__EndZMm';
    const Na__PlanDim__F_OFFSET   = 'Dimension__OffsetMm';
    const Na__PlanDim__F_SIZE     = 'Dimension__TextSizeMm';
    const Na__PlanDim__F_WEIGHT   = 'Dimension__FontWeight';
    const Na__PlanDim__F_COLOR    = 'Dimension__Color';
    const Na__PlanDim__F_TERM     = 'Dimension__Terminator';
    const Na__PlanDim__F_OVERRIDE = 'Dimension__OverrideText';
    const Na__PlanDim__F_AUTHOR   = 'Dimension__Author';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Plan Record Storage Field
    // ------------------------------------------------------------
    // Deliberately mirrors FloorPlan__Annotations. Accessed here rather than
    // through Na__FloorPlan__ProjectJson__Data__ so the dimensioning system
    // adds nothing to that module's surface.
    // ------------------------------------------------------------
    // MODULE CONSTANTS | Who Authored a Dimension
    // ------------------------------------------------------------
    // The single flag that separates an issued dimension from a client's own
    // scratch measurement. It rides on the record, so any code that can see a
    // record can tell which it is without consulting global state.
    // ------------------------------------------------------------
    const Na__PlanDim__AUTHOR_DEV    = 'dev';
    const Na__PlanDim__AUTHOR_CLIENT = 'client';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Separate Id Space for Client Measurements
    // ------------------------------------------------------------
    // Ids are integers allocated per array, and client measurements live in a
    // DIFFERENT array from the issued ones - so both would otherwise start at
    // 1 and collide the moment the overlay renders them together. Client ids
    // start above this base, which keeps the two spaces disjoint without the
    // two arrays needing to know about each other.
    // ------------------------------------------------------------
    const Na__PlanDim__CLIENT_ID_BASE = 1000000;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Plan Record Storage Field
    // ------------------------------------------------------------
    // Deliberately mirrors FloorPlan__Annotations. Accessed here rather than
    // through Na__FloorPlan__ProjectJson__Data__ so the dimensioning system
    // adds nothing to that module's surface.
    // ------------------------------------------------------------
    const Na__PlanDim__PLAN_FIELD = 'FloorPlan__Dimensions';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Loaded Configuration
    // ------------------------------------------------------------
    let Na__PlanDim__NewDefaults = null; // <-- Live defaults for the NEXT dimension (seeded from config)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Authoring Mode and the Ephemeral Client List
    // ------------------------------------------------------------
    // Client measurements are held in THIS array and nowhere else. It is never
    // attached to a floor plan record, so there is no code path by which a
    // client dimension can reach project data or R2 - it cannot be saved by
    // accident because there is nothing to save it into.
    // ------------------------------------------------------------
    let Na__PlanDim__AuthoringMode        = Na__PlanDim__AUTHOR_DEV;
    const Na__PlanDim__SessionDimensions  = [];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Plan Storage
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Plan's Dimension Array, Creating It On First Use
    // ------------------------------------------------------------
    // Returns the LIVE array off the plan record, never a copy: the overlay,
    // the editor and the record that gets saved to R2 must all be bound to one
    // reference or an edit will be drawn but never persisted.
    // ------------------------------------------------------------
    function Na__PlanDim__GetPlanDimensions(plan) {
        if (!plan || typeof plan !== 'object') return [];
        if (!Array.isArray(plan[Na__PlanDim__PLAN_FIELD])) {
            plan[Na__PlanDim__PLAN_FIELD] = [];                              // <-- Seed on first use
        }
        return plan[Na__PlanDim__PLAN_FIELD];
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace a Plan's Dimension Array Wholesale
    // ------------------------------------------------------------
    function Na__PlanDim__SetPlanDimensions(plan, dimensions) {
        if (!plan || typeof plan !== 'object') return false;
        plan[Na__PlanDim__PLAN_FIELD] = Array.isArray(dimensions) ? dimensions : [];
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Record Validation and Normalisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Coerce a Font Weight onto an Allowed Face
    // ------------------------------------------------------------
    // Only the three Open Sans faces the app loads will actually render, so a
    // value outside that set is pulled back to the default rather than being
    // handed to the browser to approximate.
    // ------------------------------------------------------------
    function Na__PlanDim__CoerceWeight(weight) {
        const setup   = Na__PlanDim__GetTextSetup();
        const allowed = Array.isArray(setup.allowedWeights) ? setup.allowedWeights : [400];
        const numeric = Number(weight);
        return allowed.includes(numeric) ? numeric : setup.defaultWeight;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Coerce an Axis Value
    // ------------------------------------------------------------
    function Na__PlanDim__CoerceAxis(axis) {
        if (axis === Na__PlanDimGrid__AXIS_X) return Na__PlanDimGrid__AXIS_X;
        if (axis === Na__PlanDimGrid__AXIS_Z) return Na__PlanDimGrid__AXIS_Z;
        return Na__PlanDimGrid__AXIS_FREE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is a Stored Record Usable?
    // ------------------------------------------------------------
    function Na__PlanDim__IsValid(record) {
        if (!record || typeof record !== 'object') return false;
        if (!record[Na__PlanDim__F_ID]) return false;
        return Number.isFinite(record[Na__PlanDim__F_START_X])
            && Number.isFinite(record[Na__PlanDim__F_START_Z])
            && Number.isFinite(record[Na__PlanDim__F_END_X])
            && Number.isFinite(record[Na__PlanDim__F_END_Z]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill Gaps and Pull Endpoints Back onto the Grid
    // ------------------------------------------------------------
    // Mutates in place so the normalised values are what subsequently save.
    // Re-snapping matters: a hand-edited or older-tolerance figure is dragged
    // onto the current grid rather than rendering out of step with its
    // neighbours on the same drawing.
    // ------------------------------------------------------------
    function Na__PlanDim__Normalise(record) {
        const lineSetup = Na__PlanDim__GetLineSetup();
        const textSetup = Na__PlanDim__GetTextSetup();

        record[Na__PlanDim__F_START_X] = Na__PlanDimGrid__SnapValueMm(record[Na__PlanDim__F_START_X]);
        record[Na__PlanDim__F_START_Z] = Na__PlanDimGrid__SnapValueMm(record[Na__PlanDim__F_START_Z]);
        record[Na__PlanDim__F_END_X]   = Na__PlanDimGrid__SnapValueMm(record[Na__PlanDim__F_END_X]);
        record[Na__PlanDim__F_END_Z]   = Na__PlanDimGrid__SnapValueMm(record[Na__PlanDim__F_END_Z]);

        record[Na__PlanDim__F_AXIS] = Na__PlanDim__CoerceAxis(record[Na__PlanDim__F_AXIS]);

        if (!Number.isFinite(record[Na__PlanDim__F_OFFSET])) {
            record[Na__PlanDim__F_OFFSET] = lineSetup.defaultOffsetMm;
        }
        if (!Number.isFinite(record[Na__PlanDim__F_SIZE])) {
            record[Na__PlanDim__F_SIZE] = textSetup.defaultSizeMm;
        }
        record[Na__PlanDim__F_WEIGHT] = Na__PlanDim__CoerceWeight(record[Na__PlanDim__F_WEIGHT]);

        if (typeof record[Na__PlanDim__F_COLOR] !== 'string') {
            record[Na__PlanDim__F_COLOR] = lineSetup.defaultColor;
        }
        if (typeof record[Na__PlanDim__F_TERM] !== 'string') {
            record[Na__PlanDim__F_TERM] = lineSetup.terminator;
        }

        return record;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read and Normalise Every Usable Record in an Array
    // ------------------------------------------------------------
    function Na__PlanDim__ReadAll(dimensionArray) {
        if (!Array.isArray(dimensionArray)) return [];
        return dimensionArray
            .filter(Na__PlanDim__IsValid)
            .map(Na__PlanDim__Normalise);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measurement and Formatting
// -----------------------------------------------------------------------------

    // FUNCTION | Recompute a Record's Length From Its Stored Endpoints
    // ------------------------------------------------------------
    // The single source of truth for what a dimension reads. Nothing caches
    // this, so a moved endpoint cannot leave a stale figure on the drawing.
    // ------------------------------------------------------------
    function Na__PlanDim__MeasureLengthMm(record) {
        if (!Na__PlanDim__IsValid(record)) return 0;

        const deltaX = record[Na__PlanDim__F_END_X] - record[Na__PlanDim__F_START_X];
        const deltaZ = record[Na__PlanDim__F_END_Z] - record[Na__PlanDim__F_START_Z];

        return Na__PlanDimGrid__SnapMeasurementMm(
            Math.sqrt((deltaX * deltaX) + (deltaZ * deltaZ))
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Length for the Drawing
    // ------------------------------------------------------------
    // An explicit override string wins over the measured figure, for the
    // occasional "VARIES" or a dimension deliberately shown to a stated size.
    // ------------------------------------------------------------
    function Na__PlanDim__FormatLength(lengthMm, record) {
        if (record && typeof record[Na__PlanDim__F_OVERRIDE] === 'string'
            && record[Na__PlanDim__F_OVERRIDE].trim().length > 0) {
            return record[Na__PlanDim__F_OVERRIDE].trim();
        }

        const setup   = Na__PlanDim__GetTextSetup();
        const rounded = Math.round(lengthMm);
        const body    = setup.thousandsSep ? rounded.toLocaleString() : String(rounded);

        return setup.unitsSuffix ? `${body}${setup.unitsSuffix}` : body;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Record CRUD
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Allocate the Next Free Id Within One Plan
    // ------------------------------------------------------------
    // Ids are unique per plan, not globally: two plans each holding a
    // dimension 1 is correct, because a plan's markup is independent.
    // ------------------------------------------------------------
    function Na__PlanDim__NextId(dimensionArray) {
        let highest = Na__PlanDim__IsClientAuthoring() ? Na__PlanDim__CLIENT_ID_BASE : 0;
        if (Array.isArray(dimensionArray)) {
            for (let i = 0; i < dimensionArray.length; i++) {
                const id = dimensionArray[i] && dimensionArray[i][Na__PlanDim__F_ID];
                if (Number.isFinite(id) && id > highest) highest = id;
            }
        }
        return highest + 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Dimension From a Resolved Span
    // ------------------------------------------------------------
    // Takes the span object produced by Na__PlanDimGrid__ResolveSpan, which
    // has already snapped both ends, applied the axis lock and rejected
    // degenerate picks - so anything arriving here is known good.
    // ------------------------------------------------------------
    function Na__PlanDim__Create(dimensionArray, span, options) {
        if (!Array.isArray(dimensionArray) || !span || !span.start || !span.end) return null;

        const defaults = Na__PlanDim__GetNewDefaults();                      // <-- What the preview just showed
        const opts     = options || {};
        const client   = Na__PlanDim__IsClientAuthoring();

        const record = {};
        record[Na__PlanDim__F_ID]      = Na__PlanDim__NextId(dimensionArray);
        record[Na__PlanDim__F_AXIS]    = Na__PlanDim__CoerceAxis(span.axis);
        record[Na__PlanDim__F_START_X] = Math.round(span.start.posXMm);
        record[Na__PlanDim__F_START_Z] = Math.round(span.start.posZMm);
        record[Na__PlanDim__F_END_X]   = Math.round(span.end.posXMm);
        record[Na__PlanDim__F_END_Z]   = Math.round(span.end.posZMm);
        record[Na__PlanDim__F_OFFSET]  = Number.isFinite(opts.offsetMm) ? opts.offsetMm : defaults.offsetMm;
        record[Na__PlanDim__F_SIZE]    = Number.isFinite(opts.sizeMm)   ? opts.sizeMm   : defaults.sizeMm;
        record[Na__PlanDim__F_WEIGHT]  = Na__PlanDim__CoerceWeight(
            opts.fontWeight !== undefined ? opts.fontWeight : defaults.fontWeight);
        // CLIENT MEASUREMENTS ARE ALWAYS THE CLIENT COLOUR. Forced here rather
        // than defaulted, so a client dimension can never be made to look like
        // an issued one - not by config, not by a stale default, not by a
        // caller passing a colour in.
        record[Na__PlanDim__F_COLOR]   = (client && Na__PlanDim__GetClientModeSetup().lockColor)
            ? Na__PlanDim__GetClientModeSetup().color
            : ((typeof opts.color === 'string') ? opts.color : defaults.color);
        record[Na__PlanDim__F_AUTHOR]  = client ? Na__PlanDim__AUTHOR_CLIENT : Na__PlanDim__AUTHOR_DEV;
        record[Na__PlanDim__F_TERM]    = (typeof opts.terminator === 'string') ? opts.terminator : defaults.terminator;

        dimensionArray.push(record);
        return record;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Live Defaults Applied to the NEXT Dimension
    // ------------------------------------------------------------
    // Seeded from AppConfig on first read, then editable from the toolbar so
    // the author can set text size and colour BEFORE drawing rather than
    // placing a dimension and correcting it afterwards. The placement preview
    // renders from these same values, so what is previewed is what is created.
    // ------------------------------------------------------------
    function Na__PlanDim__GetNewDefaults() {
        if (!Na__PlanDim__NewDefaults) {
            const lineSetup = Na__PlanDim__GetLineSetup();
            const textSetup = Na__PlanDim__GetTextSetup();
            const clientSetup = Na__PlanDim__GetClientModeSetup();
            Na__PlanDim__NewDefaults = {
                sizeMm     : textSetup.defaultSizeMm,
                fontWeight : textSetup.defaultWeight,
                color      : Na__PlanDim__IsClientAuthoring() ? clientSetup.color : lineSetup.defaultColor,
                terminator : lineSetup.terminator,
                offsetMm   : lineSetup.defaultOffsetMm
            };
        }
        return Na__PlanDim__NewDefaults;
    }
    // ------------------------------------------------------------


    // FUNCTION | Change the Defaults Applied to the NEXT Dimension
    // ------------------------------------------------------------
    // Returns true when something actually changed, so a caller only pays for
    // a redraw when there is one to do.
    // ------------------------------------------------------------
    function Na__PlanDim__SetNewDefaults(patch) {
        if (!patch || typeof patch !== 'object') return false;

        const current = Na__PlanDim__GetNewDefaults();
        const text    = Na__PlanDim__GetTextSetup();
        let   changed = false;

        if (Number.isFinite(patch.sizeMm)) {
            const clamped = Math.min(text.maxSizeMm, Math.max(text.minSizeMm, patch.sizeMm));
            if (clamped !== current.sizeMm) { current.sizeMm = clamped; changed = true; }
        }
        if (patch.fontWeight !== undefined) {
            const weight = Na__PlanDim__CoerceWeight(patch.fontWeight);
            if (weight !== current.fontWeight) { current.fontWeight = weight; changed = true; }
        }
        if (Na__PlanDim__IsClientAuthoring() && Na__PlanDim__GetClientModeSetup().lockColor) {
            delete patch.color;                                              // <-- Client colour is not theirs to change
        }
        if (typeof patch.color === 'string' && patch.color !== current.color) {
            current.color = patch.color;
            changed = true;
        }
        if (typeof patch.terminator === 'string' && patch.terminator !== current.terminator) {
            current.terminator = patch.terminator;
            changed = true;
        }
        return changed;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Who Is Currently Authoring
    // ------------------------------------------------------------
    // Switching to client mode also clears any leftover session measurements,
    // so a client never inherits the previous visitor's scratch work.
    // ------------------------------------------------------------
    function Na__PlanDim__SetAuthoringMode(mode) {
        const next = (mode === Na__PlanDim__AUTHOR_CLIENT)
            ? Na__PlanDim__AUTHOR_CLIENT
            : Na__PlanDim__AUTHOR_DEV;

        if (next === Na__PlanDim__AuthoringMode) return false;

        Na__PlanDim__AuthoringMode = next;
        Na__PlanDim__NewDefaults   = null;                                   // <-- Re-seed so the client colour applies
        Na__PlanDim__ClearSessionDimensions();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Who Is Currently Authoring?
    // ------------------------------------------------------------
    function Na__PlanDim__GetAuthoringMode() {
        return Na__PlanDim__AuthoringMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Client Doing the Authoring?
    // ------------------------------------------------------------
    function Na__PlanDim__IsClientAuthoring() {
        return Na__PlanDim__AuthoringMode === Na__PlanDim__AUTHOR_CLIENT;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Ephemeral List Client Measurements Live In
    // ------------------------------------------------------------
    // A stable module-level array so the overlay, the editor and the undo
    // history can all bind to the same reference for the whole session.
    // ------------------------------------------------------------
    function Na__PlanDim__GetSessionDimensions() {
        return Na__PlanDim__SessionDimensions;
    }
    // ------------------------------------------------------------


    // FUNCTION | Discard Every Client Measurement
    // ------------------------------------------------------------
    // Mutates in place - the overlay and history hold this reference.
    // ------------------------------------------------------------
    function Na__PlanDim__ClearSessionDimensions() {
        Na__PlanDim__SessionDimensions.length = 0;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | May the Current Author Edit This Record?
    // ------------------------------------------------------------
    // A client may only touch their own measurements. This is what stops an
    // issued dimension being dragged, restyled or deleted from a browser, and
    // it is enforced on the RECORD rather than on which array it came from, so
    // no future refactor of the storage can quietly lose the rule.
    // ------------------------------------------------------------
    function Na__PlanDim__IsRecordEditable(record) {
        if (!record) return false;
        if (!Na__PlanDim__IsClientAuthoring()) return true;                  // <-- The developer may edit anything
        return record[Na__PlanDim__F_AUTHOR] === Na__PlanDim__AUTHOR_CLIENT;
    }
    // ------------------------------------------------------------


    // FUNCTION | Find One Record by Id
    // ------------------------------------------------------------
    function Na__PlanDim__FindById(dimensionArray, dimensionId) {
        if (!Array.isArray(dimensionArray)) return null;
        for (let i = 0; i < dimensionArray.length; i++) {
            if (dimensionArray[i] && dimensionArray[i][Na__PlanDim__F_ID] === dimensionId) {
                return dimensionArray[i];
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove One Record by Id
    // ------------------------------------------------------------
    function Na__PlanDim__Delete(dimensionArray, dimensionId) {
        if (!Array.isArray(dimensionArray)) return false;
        for (let i = 0; i < dimensionArray.length; i++) {
            if (dimensionArray[i] && dimensionArray[i][Na__PlanDim__F_ID] === dimensionId) {
                dimensionArray.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Record's Perpendicular Offset (Clamped)
    // ------------------------------------------------------------
    function Na__PlanDim__SetOffsetMm(record, offsetMm) {
        if (!record || !Number.isFinite(offsetMm)) return false;
        const setup = Na__PlanDim__GetLineSetup();
        record[Na__PlanDim__F_OFFSET] = Math.min(Math.max(offsetMm, setup.minOffsetMm), setup.maxOffsetMm);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move One Endpoint, Re-Snapping It onto the Grid
    // ------------------------------------------------------------
    function Na__PlanDim__SetEndpoint(record, which, point) {
        if (!record || !point) return false;

        const snappedX = Na__PlanDimGrid__SnapValueMm(point.posXMm);
        const snappedZ = Na__PlanDimGrid__SnapValueMm(point.posZMm);

        if (which === 'start') {
            record[Na__PlanDim__F_START_X] = snappedX;
            record[Na__PlanDim__F_START_Z] = snappedZ;
        } else {
            record[Na__PlanDim__F_END_X] = snappedX;
            record[Na__PlanDim__F_END_Z] = snappedZ;
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Partial Update to a Record
    // ------------------------------------------------------------
    function Na__PlanDim__Update(record, patch) {
        if (!record || !patch) return false;

        if (Number.isFinite(patch.sizeMm))    record[Na__PlanDim__F_SIZE]   = patch.sizeMm;
        if (patch.fontWeight !== undefined)   record[Na__PlanDim__F_WEIGHT] = Na__PlanDim__CoerceWeight(patch.fontWeight);
        if (typeof patch.color === 'string')  record[Na__PlanDim__F_COLOR]  = patch.color;
        if (typeof patch.terminator === 'string') record[Na__PlanDim__F_TERM] = patch.terminator;
        if (typeof patch.overrideText === 'string') record[Na__PlanDim__F_OVERRIDE] = patch.overrideText;
        if (Number.isFinite(patch.offsetMm))  Na__PlanDim__SetOffsetMm(record, patch.offsetMm);

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Plan Dimensions Data API
    // ------------------------------------------------------------
    export {
        Na__PlanDim__F_ID,
        Na__PlanDim__F_AXIS,
        Na__PlanDim__F_START_X,
        Na__PlanDim__F_START_Z,
        Na__PlanDim__F_END_X,
        Na__PlanDim__F_END_Z,
        Na__PlanDim__F_OFFSET,
        Na__PlanDim__F_SIZE,
        Na__PlanDim__F_WEIGHT,
        Na__PlanDim__F_COLOR,
        Na__PlanDim__F_TERM,
        Na__PlanDim__PLAN_FIELD,
        Na__PlanDim__AUTHOR_DEV,
        Na__PlanDim__AUTHOR_CLIENT,
        Na__PlanDim__F_AUTHOR,
        Na__PlanDim__SetAuthoringMode,
        Na__PlanDim__GetAuthoringMode,
        Na__PlanDim__IsClientAuthoring,
        Na__PlanDim__GetSessionDimensions,
        Na__PlanDim__ClearSessionDimensions,
        Na__PlanDim__IsRecordEditable,
        Na__PlanDim__GetNewDefaults,
        Na__PlanDim__SetNewDefaults,
        Na__PlanDim__GetPlanDimensions,
        Na__PlanDim__SetPlanDimensions,
        Na__PlanDim__ReadAll,
        Na__PlanDim__MeasureLengthMm,
        Na__PlanDim__FormatLength,
        Na__PlanDim__Create,
        Na__PlanDim__FindById,
        Na__PlanDim__Delete,
        Na__PlanDim__SetOffsetMm,
        Na__PlanDim__SetEndpoint,
        Na__PlanDim__Update,
        Na__PlanDim__CoerceWeight
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
