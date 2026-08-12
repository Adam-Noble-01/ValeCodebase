/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | FILE WRITER
   =============================================================================

   FILE       : VghLantern__SketchUpExport__FileWriter__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - FileWriter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Serialise a build payload and hand it to the browser as a download
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - The Developer Tools menu's route out. Asks the payload builder for the
     current lantern, serialises the result and triggers a download.
   - Owns the toast messages and nothing else about the export: what goes in the
     file is entirely the builder's business.

   ---------------------------------------------------------------------------

   WHY A BROWSER DOWNLOAD AND NOT A SERVER WRITE:

   Every other file this application produces goes through the local Flask
   server, because a project file has to land in a known folder to be found
   again. A SketchUp build file does not: it is picked up by an OS file dialog
   in SketchUp, on whatever machine is running it, and the downloads folder is
   as good a place as any. Going through the browser also means the export works
   from the read-only web build, where there is no server to write to at all.

   ---------------------------------------------------------------------------

   WHY THE JSON IS PRETTY PRINTED:

   A build payload for a divided lantern runs to a few hundred kilobytes either
   way, and the indented form is the one somebody can open in an editor to see
   why a part came out wrong. Compact JSON would save roughly a third of a file
   that is never transmitted anywhere and read by hand more often than not.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export File Writer Module
// =============================================================================

const VghLantern__SketchUpExport__FileWriter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const MENU_CONFIG_KEY  =  'VghLantern__SketchUpExport__Config__Menu';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Serialisation
    // ------------------------------------------------------------
    const JSON_INDENT_SPACES  =  2;                                          // <-- Readable in an editor without doubling the file
    const MIME_TYPE           =  'application/json;charset=utf-8';
    const REVOKE_DELAY_MS     =  2000;                                       // <-- Long enough for the download to have started in every browser
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and Notification Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Menu Config Block
    // ------------------------------------------------------------
    function VghLantern__FileWriter__MenuConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[MENU_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise a Toast, if the Notification System Is Up
    // ------------------------------------------------------------
    function VghLantern__FileWriter__Toast(message, level) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, level);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Route
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Current Lantern as a SketchUp Build File
    // ------------------------------------------------------------
    // The single routine the Developer Tools menu item calls. Every failure
    // path reports through a toast and returns false rather than throwing, so a
    // menu click can never leave the application in a broken state.
    //
    // @return  Promise resolving to true when a file was downloaded
    async function VghLantern__SketchUpExport__FileWriter__ExportCurrentLantern() {
        var Builder  =  window.VghLantern__SketchUpExport__PayloadBuilder;
        var menu     =  VghLantern__FileWriter__MenuConfig();

        if (!Builder) {
            VghLantern__FileWriter__Toast(menu.FailureMessage || 'The SketchUp exporter is not available.', 'error');
            return false;
        }

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var lantern       =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentLantern() : null;
        var skeleton      =  StateManager ? StateManager.VghLantern__StateManager__GetSolvedSkeleton() : null;

        if (!lantern) {
            VghLantern__FileWriter__Toast(menu.NoLanternMessage || 'Open a lantern first.', 'error');
            return false;
        }
        if (!skeleton) {
            VghLantern__FileWriter__Toast(menu.NotSolvedMessage || 'The lantern has not solved yet.', 'error');
            return false;
        }

        var result;
        try {
            result  =  await Builder.VghLantern__SketchUpExport__PayloadBuilder__Build();
        } catch (buildError) {
            console.error('[VghLantern SketchUpExport] Payload build threw:', buildError);
            VghLantern__FileWriter__Toast(menu.FailureMessage || 'The SketchUp build file could not be written.', 'error');
            return false;
        }

        if (!result || !result.Ok) {
            VghLantern__FileWriter__Toast(
                (result && result.Message) || menu.FailureMessage || 'The SketchUp build file could not be written.', 'error');
            return false;
        }

        var written  =  VghLantern__SketchUpExport__FileWriter__Download(result.Payload, result.Filename);
        if (!written) {
            VghLantern__FileWriter__Toast(menu.FailureMessage || 'The SketchUp build file could not be written.', 'error');
            return false;
        }

        VghLantern__FileWriter__Toast(
            VghLantern__FileWriter__SuccessText(menu, result.Payload), 'success');
        return true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Success Message, With the Part Count Appended
    // ------------------------------------------------------------
    // The count is the cheapest possible check that the export did what it was
    // asked: a lantern that exports twelve parts when it should export two
    // hundred is visible before SketchUp is even opened.
    function VghLantern__FileWriter__SuccessText(menu, payload) {
        var base   =  menu.SuccessMessage || 'SketchUp build file downloaded.';
        var count  =  (payload && payload.Summary) ? payload.Summary.TotalPartCount : 0;
        return base + ' (' + count + ' parts)';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Serialisation and Download
// -----------------------------------------------------------------------------

    // FUNCTION | Serialise a Payload and Trigger a Browser Download
    // ------------------------------------------------------------
    // Kept public so a future exporter - the DXF writer next door - can reuse
    // the download half without going through the lantern payload builder.
    //
    // @param payload   Any JSON serialisable object
    // @param filename  Name offered to the browser
    // @return          true when the click was dispatched
    function VghLantern__SketchUpExport__FileWriter__Download(payload, filename) {
        var text, blob, url, anchor;

        try {
            text  =  JSON.stringify(payload, null, JSON_INDENT_SPACES);
        } catch (serialiseError) {
            console.error('[VghLantern SketchUpExport] Payload could not be serialised:', serialiseError);
            return false;
        }

        try {
            blob    =  new Blob([text], { type: MIME_TYPE });
            url     =  URL.createObjectURL(blob);

            anchor           =  document.createElement('a');
            anchor.href      =  url;
            anchor.download  =  filename || 'VghLantern__SketchUpBuild__.json';
            anchor.style.display  =  'none';

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            window.setTimeout(function() {
                URL.revokeObjectURL(url);                                     // <-- Released late; revoking immediately cancels the download in some browsers
            }, REVOKE_DELAY_MS);

            return true;

        } catch (downloadError) {
            console.error('[VghLantern SketchUpExport] Download failed:', downloadError);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__FileWriter__ExportCurrentLantern : VghLantern__SketchUpExport__FileWriter__ExportCurrentLantern,
        VghLantern__SketchUpExport__FileWriter__Download             : VghLantern__SketchUpExport__FileWriter__Download
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__FileWriter  =  VghLantern__SketchUpExport__FileWriter;
