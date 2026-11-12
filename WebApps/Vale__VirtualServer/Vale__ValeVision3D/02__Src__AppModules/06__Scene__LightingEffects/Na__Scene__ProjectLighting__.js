// =============================================================================
// VALEVISION3D - SCENE LIGHTING EFFECTS - PROJECT LIGHTING
// =============================================================================
//
// FILE       : Na__Scene__ProjectLighting__.js
// NAMESPACE  : Na__ProjLight
// MODULE     : Scene Lighting Effects - Project Lighting
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A project's own lighting: read it from the project record as the
//              project loads, hold the copy being edited, and save it back
// CREATED    : 12-Nov-2026
//
// DESCRIPTION:
// - Adam, 12-Nov-2026: "Add sun position so i can change the direction of the
//   faces shaded (still should be flat but can you see here some faces shad
//   greyer than others? well on a project by project basis Id like a way to
//   control that". The whitecard stays flat shaded; which faces read greyer
//   follows where the sun is, and this is where a project says so.
// - THE RECORD OBJECT is SceneLighting__ProjectOverrides, a top-level key of
//   the project record in the record dialect, with a section per light (Adam,
//   12-Nov-2026, chose "A section per light"), so a later lighting override
//   joins it as a section of its own:
//     SceneLighting__ProjectOverrides__Description    what the object is
//     SceneLighting__ProjectOverrides__SchemaVersion  1
//     SceneLighting__ProjectOverrides__Sun
//       SceneLighting__Sun__RotationDeg     clockwise seen from above, from
//                                           the app's default direction
//       SceneLighting__Sun__HeightDeg       the sun's angle above the horizon
//       SceneLighting__Sun__Intensity       the sun's strength
//       SceneLighting__Sun__ShadowsEnabled  false fades the sun's shadows out
//     SceneLighting__ProjectOverrides__Ambient
//       SceneLighting__Ambient__Intensity   the fill light's strength
// - IT STORES ONLY WHAT DIFFERS from the app default (Scene__Default__
//   LightingConfig), at the precision a scene's own block uses (whole
//   degrees, strengths to two places), and a section with nothing in it is
//   left out. A project at the app default has no key at all, so it keeps
//   following the app default when that changes.
// - THE 3D VIEW ONLY. The lighting core lays it over the app default and
//   under every scene; plans, elevations and sheet pictures keep the app
//   default (Adam, 12-Nov-2026: "3D view only"). See Na__Scene__PerSceneLighting__.
// - A CLIENT SEES IT. The key is not one of the API's client-hidden keys, so a
//   client link's 3D view is lit as staff see it.
// - THE WORKING COPY IS THE CORE'S PROJECT LAYER ITSELF, held as a save and a
//   reload would read it back, so a preview lights every scene and flight
//   exactly as the saved lighting will. SetWorking changes it; Save writes it
//   with Na__LocalMirror__MergeKeys (one PATCH merged on the server under its
//   lock, never the whole record), or takes the key out with _unset once it is
//   back at the app default. Nothing is written until Save.
// - Every change of what is held or saved is announced on window as
//   na-project-lighting-changed ({ reason, pending, hasSaved }).
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence calls LoadFromRecord as the record arrives,
//   before any scene is applied, so the launch scene resolves over it.
// - Na__Scene__ProjectLighting__DevMenu__ previews, saves and reverts it.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 12-Nov-2026 for ValeVision3D v2.98.0
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate, with Na__Scene__PerSceneLighting__.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Nov-2026 - Version 1.0.0 (ValeVision3D v2.98.0)
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Lighting Core (owns the lights and the layers)
    // @delegate: ./Na__Scene__PerSceneLighting__.js
    // ------------------------------------------------------------
    import {
        Na__SceneLighting__IsProjectEnabled,
        Na__SceneLighting__ResolveOverApp,
        Na__SceneLighting__DiffFromApp,
        Na__SceneLighting__SetProjectValues,
        Na__SceneLighting__GetProjectValues,
        Na__SceneLighting__ApplyBase
    } from './Na__Scene__PerSceneLighting__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Project Record on the Server (merge one key, never the whole record)
    // @delegate: ../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js
    // ------------------------------------------------------------
    import { Na__LocalMirror__MergeKeys } from '../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Record Object and Its Keys
    // ------------------------------------------------------------
    const Na__ProjLight__RECORD_KEY          = 'SceneLighting__ProjectOverrides';                 // <-- Top-level key of the project record
    const Na__ProjLight__K_DESCRIPTION       = 'SceneLighting__ProjectOverrides__Description';
    const Na__ProjLight__K_SCHEMA            = 'SceneLighting__ProjectOverrides__SchemaVersion';
    const Na__ProjLight__K_SUN               = 'SceneLighting__ProjectOverrides__Sun';            // <-- Section: the sun, the only light that casts shadows
    const Na__ProjLight__K_AMBIENT           = 'SceneLighting__ProjectOverrides__Ambient';        // <-- Section: the fill light every face receives
    const Na__ProjLight__K_SUN_ROTATION      = 'SceneLighting__Sun__RotationDeg';
    const Na__ProjLight__K_SUN_HEIGHT        = 'SceneLighting__Sun__HeightDeg';
    const Na__ProjLight__K_SUN_INTENSITY     = 'SceneLighting__Sun__Intensity';
    const Na__ProjLight__K_SUN_SHADOWS       = 'SceneLighting__Sun__ShadowsEnabled';
    const Na__ProjLight__K_AMBIENT_INTENSITY = 'SceneLighting__Ambient__Intensity';
    const Na__ProjLight__SCHEMA_VERSION      = 1;
    const Na__ProjLight__DESCRIPTION         =
        'This project\'s own lighting, set in the Dev menu\'s Project Lighting. It lights the 3D view and every scene '
        + 'without lighting of its own; plans, elevations and sheet pictures keep the app\'s default. Only the settings '
        + 'that differ from the app\'s default lighting (Scene__Default__LightingConfig) are stored, a section per light; '
        + 'anything absent follows the default. Sun RotationDeg turns the sun clockwise seen from above from the app\'s '
        + 'default direction; HeightDeg is its angle above the horizon.';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Event Every Change Is Announced On
    // ------------------------------------------------------------
    const Na__ProjLight__CHANGED_EVENT = 'na-project-lighting-changed';                         // <-- detail : { reason, pending, hasSaved }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What the Record Holds, as Far as This Session Knows
    // ------------------------------------------------------------
    let Na__ProjLight__SavedValues = null;     // <-- The values the saved object lights the 3D view with; null for none
    let Na__ProjLight__Loaded      = false;    // <-- A project record has been read
    let Na__ProjLight__Saving      = false;    // <-- A save is on its way
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Record Object
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Section of the Record Object, or an Empty One
    // ------------------------------------------------------------
    function Na__ProjLight__Section(block, key) {
        const section = block[key];
        return (section && typeof section === 'object' && !Array.isArray(section)) ? section : {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Record Object as the Lighting Core's Fields, or Null
    // ------------------------------------------------------------
    // Anything a section leaves out follows the app default. Anything that is
    // not an object is no lighting at all.
    // ------------------------------------------------------------
    function Na__ProjLight__FieldsFromBlock(block) {
        if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
        const sun     = Na__ProjLight__Section(block, Na__ProjLight__K_SUN);
        const ambient = Na__ProjLight__Section(block, Na__ProjLight__K_AMBIENT);
        return {
            rotationDeg          : sun[Na__ProjLight__K_SUN_ROTATION],
            heightDeg            : sun[Na__ProjLight__K_SUN_HEIGHT],
            directionalIntensity : sun[Na__ProjLight__K_SUN_INTENSITY],
            shadowsEnabled       : sun[Na__ProjLight__K_SUN_SHADOWS],
            ambientIntensity     : ambient[Na__ProjLight__K_AMBIENT_INTENSITY]
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Values a Record Object Lights the 3D View With, or Null
    // ------------------------------------------------------------
    // Null for no object, or for one that says nothing the app default does
    // not already say: a project at the app default has no lighting of its own.
    // ------------------------------------------------------------
    function Na__ProjLight__ResolveBlock(block) {
        const fields = Na__ProjLight__FieldsFromBlock(block);
        if (!fields) return null;
        const values = Na__SceneLighting__ResolveOverApp(fields);
        return (values && Na__SceneLighting__DiffFromApp(values)) ? values : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Smallest Record Object That Reproduces These Values, or Null
    // ------------------------------------------------------------
    // Null when nothing differs from the app default: the key is then taken
    // out rather than written. The keys go in one fixed order, so two objects
    // compare fairly as JSON.
    // ------------------------------------------------------------
    function Na__ProjLight__BuildBlock(values) {
        const fields = Na__SceneLighting__DiffFromApp(values);
        if (!fields) return null;

        const sun = {};
        if (fields.rotationDeg          !== undefined) sun[Na__ProjLight__K_SUN_ROTATION]  = fields.rotationDeg;
        if (fields.heightDeg            !== undefined) sun[Na__ProjLight__K_SUN_HEIGHT]    = fields.heightDeg;
        if (fields.directionalIntensity !== undefined) sun[Na__ProjLight__K_SUN_INTENSITY] = fields.directionalIntensity;
        if (fields.shadowsEnabled       !== undefined) sun[Na__ProjLight__K_SUN_SHADOWS]   = fields.shadowsEnabled;

        const ambient = {};
        if (fields.ambientIntensity !== undefined) ambient[Na__ProjLight__K_AMBIENT_INTENSITY] = fields.ambientIntensity;

        const block = {
            [Na__ProjLight__K_DESCRIPTION] : Na__ProjLight__DESCRIPTION,
            [Na__ProjLight__K_SCHEMA]      : Na__ProjLight__SCHEMA_VERSION
        };
        if (Object.keys(sun).length > 0)     block[Na__ProjLight__K_SUN]     = sun;
        if (Object.keys(ambient).length > 0) block[Na__ProjLight__K_AMBIENT] = ambient;
        return block;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Sets of Values Compared by What They Would Save
    // ------------------------------------------------------------
    // The empty string stands for "no object", the app default.
    // ------------------------------------------------------------
    function Na__ProjLight__Token(values) {
        const block = values ? Na__ProjLight__BuildBlock(values) : null;
        return block ? JSON.stringify(block) : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State and Announcements
// -----------------------------------------------------------------------------

    // FUNCTION | Is the Working Copy Different From What the Record Holds?
    // ------------------------------------------------------------
    function Na__ProjLight__IsPending() {
        return Na__ProjLight__Token(Na__SceneLighting__GetProjectValues()) !== Na__ProjLight__Token(Na__ProjLight__SavedValues);
    }
    // ------------------------------------------------------------


    // FUNCTION | Does the Record Hold Lighting for This Project?
    // ------------------------------------------------------------
    function Na__ProjLight__HasSaved() {
        return Na__ProjLight__SavedValues !== null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Values the Saved Object Lights the 3D View With (a Copy), or Null
    // ------------------------------------------------------------
    function Na__ProjLight__GetSavedValues() {
        return Na__ProjLight__SavedValues ? { ...Na__ProjLight__SavedValues } : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Has a Project Record Been Read Yet? Is a Save on Its Way?
    // ------------------------------------------------------------
    function Na__ProjLight__IsLoaded() {
        return Na__ProjLight__Loaded;
    }
    function Na__ProjLight__IsSaving() {
        return Na__ProjLight__Saving;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Announce a Change of What Is Held or Saved
    // ------------------------------------------------------------
    // reason: 'loaded' (the record arrived), 'working' (the copy being edited
    // changed) or 'saved' (the record now holds the working copy).
    // ------------------------------------------------------------
    function Na__ProjLight__Dispatch(reason) {
        window.dispatchEvent(new CustomEvent(Na__ProjLight__CHANGED_EVENT, {
            detail : {
                reason   : reason,
                pending  : Na__ProjLight__IsPending(),
                hasSaved : Na__ProjLight__HasSaved()
            }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load, Edit and Save
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Project's Lighting as the Project Loads
    // ------------------------------------------------------------
    // projectData: the record. Sets the core's project layer and lights the
    // model with the base: nothing else stands on the lights yet (no scene has
    // been applied, no frame drawn), and the launch scene, if any, lays its own
    // lighting over this one. Returns the values, or null for a project with no
    // lighting of its own (or with project lighting switched off in the app
    // config, when a saved object is left in the record untouched and unread).
    // ------------------------------------------------------------
    function Na__ProjLight__LoadFromRecord(projectData) {
        const block = (projectData && typeof projectData === 'object') ? projectData[Na__ProjLight__RECORD_KEY] : null;
        Na__ProjLight__SavedValues = Na__SceneLighting__IsProjectEnabled() ? Na__ProjLight__ResolveBlock(block) : null;
        Na__ProjLight__Loaded      = true;

        Na__SceneLighting__SetProjectValues(Na__ProjLight__SavedValues);
        Na__SceneLighting__ApplyBase({ requestRender : false });              // <-- The first frame is still to come; a no-op for a project without lighting

        if (Na__ProjLight__SavedValues) {
            console.log('[ValeVision3D] Project lighting applied: ' + JSON.stringify(Na__ProjLight__FieldsFromBlock(block)));
        }
        Na__ProjLight__Dispatch('loaded');
        return Na__ProjLight__GetSavedValues();
    }
    // ------------------------------------------------------------


    // FUNCTION | Hold a Changed Working Copy (Nothing Is Written)
    // ------------------------------------------------------------
    // values: complete values, or null for the app default. The core's layer
    // takes them as a save and a reload would read them back (stored precision),
    // so every scene and flight resolves over them from now on. The lights are
    // the caller's business: the Dev menu holds its preview back while a
    // drawing is on screen. Returns the values now held (a copy), or null.
    // ------------------------------------------------------------
    function Na__ProjLight__SetWorking(values) {
        if (!Na__SceneLighting__IsProjectEnabled()) return null;
        const block = values ? Na__ProjLight__BuildBlock(values) : null;
        Na__SceneLighting__SetProjectValues(block ? Na__ProjLight__ResolveBlock(block) : null);
        Na__ProjLight__Dispatch('working');
        return Na__SceneLighting__GetProjectValues();
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Working Copy Into the Project Record
    // ------------------------------------------------------------
    // One key merged on the server: the object, or the key taken out with
    // _unset when the working copy is back at the app default. Asks nothing:
    // the Dev menu asks first. Resolves to { ok, error, cleared }; never
    // rejects. A copy changed while the save was on its way stays pending.
    // ------------------------------------------------------------
    async function Na__ProjLight__Save() {
        if (Na__ProjLight__Saving) return { ok : false, error : 'a save is already on its way', cleared : false };

        const working = Na__SceneLighting__GetProjectValues();
        const block   = working ? Na__ProjLight__BuildBlock(working) : null;
        const payload = block ? { [Na__ProjLight__RECORD_KEY] : block } : { _unset : [Na__ProjLight__RECORD_KEY] };

        Na__ProjLight__Saving = true;
        let result = null;
        try {
            result = await Na__LocalMirror__MergeKeys(payload);               // <-- Queued, merged under the server's lock; never throws
        } catch (error) {
            result = { ok : false, error : (error && error.message) || 'the project was not saved' };
        } finally {
            Na__ProjLight__Saving = false;
        }

        const ok = Boolean(result && result.ok);
        if (ok) {
            Na__ProjLight__SavedValues = block ? Na__ProjLight__ResolveBlock(block) : null;
            Na__ProjLight__Dispatch('saved');
        }
        return { ok : ok, error : ok ? null : ((result && result.error) || 'the project was not saved'), cleared : !block };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Project Lighting API
    // ------------------------------------------------------------
    export {
        Na__ProjLight__RECORD_KEY,
        Na__ProjLight__CHANGED_EVENT,
        Na__ProjLight__ResolveBlock,
        Na__ProjLight__BuildBlock,
        Na__ProjLight__LoadFromRecord,
        Na__ProjLight__SetWorking,
        Na__ProjLight__Save,
        Na__ProjLight__IsPending,
        Na__ProjLight__HasSaved,
        Na__ProjLight__GetSavedValues,
        Na__ProjLight__IsLoaded,
        Na__ProjLight__IsSaving
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
