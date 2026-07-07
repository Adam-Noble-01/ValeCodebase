// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - SHARED BUILD MANIFEST HELPER
// =============================================================================
//
// FILE       : src/CloudflareHelper__BuildManifest__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Shared Build Manifest Helper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Format build timestamps and bump the shared build-version
//              manifest so ProjectLoader's cache-eviction logic fires
// CREATED    : 07-Jul-2026
//
// DESCRIPTION:
// - Shared by the Visibility and Rename editor handlers so every write path
//   bumps the same VaApps/Index/Na__BuildVersion__Manifest__.json artifact
//   that Na__AppData__ProjectLoader.js polls for cache invalidation.
// - Mirrors the schema written by the Python sync pipeline's
//   na_write_build_manifest() in AutomationUtil__R2Common__Lib__.py.
//
// R2 KEY PATH:
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Jul-2026 - Version 1.0.0
// - Initial implementation — extracted for the Visibility + Rename handlers.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | R2 Key Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | R2 Object Key Path
    // ------------------------------------------------------------
    const Na__R2Key__ManifestPath = 'VaApps/Index/Na__BuildVersion__Manifest__.json'; // <-- Build version manifest
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Date Formatting Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Unix Timestamp as DD-MMM-YYYY at HH:MM
    // ------------------------------------------------------------
    function na_format_build_date(unixTimestamp) {
        const d      = new Date(unixTimestamp * 1000);
        const day    = String(d.getUTCDate()).padStart(2, '0');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month  = months[d.getUTCMonth()];
        const year   = d.getUTCFullYear();
        const hh     = String(d.getUTCHours()).padStart(2, '0');
        const mm     = String(d.getUTCMinutes()).padStart(2, '0');
        return `${day}-${month}-${year} at ${hh}:${mm}`;                    // <-- e.g. "07-Jul-2026 at 14:30"
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Manifest Write
// -----------------------------------------------------------------------------

    // FUNCTION | Write Build Version Manifest (Bumps Shared Cache-Bust Token)
    // ------------------------------------------------------------
    async function na_write_build_manifest(r2Bucket, lastProject, buildVersion, buildDate) {
        const manifest = {
            buildVersion : buildVersion,                                    // <-- Unix timestamp integer
            buildDate    : buildDate,                                       // <-- "DD-MMM-YYYY at HH:MM"
            lastProject  : lastProject                                      // <-- Last project that triggered a write
        };
        await r2Bucket.put(
            Na__R2Key__ManifestPath,
            JSON.stringify(manifest, null, 4),
            { httpMetadata: { contentType: 'application/json' } }
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared Build Manifest Helper API
    // ------------------------------------------------------------
    export {
        na_format_build_date,
        na_write_build_manifest
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
