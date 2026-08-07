/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | CONFIG ACCESS
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__ConfigAccess__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load and serve this experiment's own configuration block
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Fetches Na__ProjectedEdges__Config.json directly rather than registering the
     file with AppCore__ConfigLoader.
   - That is a deliberate containment choice, not an oversight. ConfigLoader holds
     a hardcoded manifest and one module variable per section, so registering there
     would mean editing a core file for an experiment. Everything this feature needs
     lives in this folder and it can be lifted out whole.
   - If the experiment graduates, moving to ConfigLoader is a two line change here
     and one line there.

   ---------------------------------------------------------------------------

   PUBLIC API:
       Ready()                      -> Promise, resolves once the config is loaded
       Section(sectionName)         -> the named config subsection
       IsEnabled()                  -> master on / off switch
       IsViewEnabled(viewKey)       -> whether this view key is in the Views list

   ============================================================================= */

// =============================================================================
// REGION | Projected Edges Config Access Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Location and Key Shape
    // ------------------------------------------------------------
    // The path is relative to VghLantern__App__.html, which is the document base
    // for every fetch the application makes.
    const CONFIG_PATH     =  './02__Src__AppModules/27__System__ProjectedEdges2d/Na__ProjectedEdges__Config.json';
    const CONFIG_ROOT_KEY =  'VghLantern__ProjectedEdges__Config';
    const SECTION_PREFIX  =  'VghLantern__ProjectedEdges__Config__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Used Only If the Config File Cannot Be Read
    // ------------------------------------------------------------
    // Disabled rather than defaulted. A missing config for an experimental overlay
    // should leave the application exactly as it was, not silently start doing
    // expensive work with numbers nobody chose.
    const FALLBACK_CONFIG  =  {
        'VghLantern__ProjectedEdges__Config__Meta' : { Enabled : false, Views : [], LogTimings : false }
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Resolved Config and Its Load Promise
    // ------------------------------------------------------------
    let VghLantern__ProjectedEdges__ConfigAccess__Resolved  =  null;
    let VghLantern__ProjectedEdges__ConfigAccess__Loading   =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Config Once and Hand Back the Same Promise Afterwards
    // ------------------------------------------------------------
    // cache: 'no-store' matches AppCore__ConfigLoader. A stale browser copy of a
    // config file is exactly how an edit appears not to work while the disk file
    // is already correct.
    export function VghLantern__ProjectedEdges__ConfigAccess__Ready() {
        if (VghLantern__ProjectedEdges__ConfigAccess__Loading) {
            return VghLantern__ProjectedEdges__ConfigAccess__Loading;
        }

        VghLantern__ProjectedEdges__ConfigAccess__Loading  =  (async function() {
            try {
                const response  =  await fetch(CONFIG_PATH, { cache : 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                const parsed  =  await response.json();
                VghLantern__ProjectedEdges__ConfigAccess__Resolved  =  parsed[CONFIG_ROOT_KEY] || FALLBACK_CONFIG;
            } catch (loadError) {
                console.warn('[VghLantern ProjectedEdges] Config unavailable, the projection overlay stays off:', loadError.message);
                VghLantern__ProjectedEdges__ConfigAccess__Resolved  =  FALLBACK_CONFIG;
            }

            return VghLantern__ProjectedEdges__ConfigAccess__Resolved;
        })();

        return VghLantern__ProjectedEdges__ConfigAccess__Loading;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reads
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Named Config Subsection
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__ConfigAccess__Section(sectionName) {
        const root  =  VghLantern__ProjectedEdges__ConfigAccess__Resolved;
        if (!root) return {};

        return root[SECTION_PREFIX + sectionName] || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Projection Overlay Is Switched On At All
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__ConfigAccess__IsEnabled() {
        return VghLantern__ProjectedEdges__ConfigAccess__Section('Meta').Enabled === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Given 2D View Key Should Carry the Overlay
    // ------------------------------------------------------------
    // Listed rather than inferred, so widening the experiment to the side elevation
    // or the plan is a config edit and not a code change. The projector already
    // knows how to orient all three.
    export function VghLantern__ProjectedEdges__ConfigAccess__IsViewEnabled(viewKey) {
        const views  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Meta').Views;
        return Array.isArray(views) && views.indexOf(viewKey) !== -1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether Stage and Projection Timings Should Be Logged
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__ConfigAccess__LogTimings() {
        return VghLantern__ProjectedEdges__ConfigAccess__Section('Meta').LogTimings === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Naming
// -----------------------------------------------------------------------------

    // FUNCTION | Human Readable Name for a 2D View Key
    // ------------------------------------------------------------
    // Used by the progress overlay to say which view is being projected. Held here
    // rather than read from the Env2d config because that would mean reaching
    // through AppCore__ConfigLoader for a label, and this module deliberately owns
    // everything it needs.
    export function VghLantern__ProjectedEdges__ConfigAccess__ViewLabel(viewKey) {
        const labels  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Meta').ViewLabels;
        return (labels && labels[viewKey]) ? labels[viewKey] : viewKey;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
