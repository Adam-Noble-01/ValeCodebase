/* =============================================================================
   NOBLEIMAGETOOLS - MASK EXPORT - COLOR ID MAP
   =============================================================================

   FILE       : NobleImageTools__MaskExport__ColorId__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskExport - Color ID / Cryptomatte-style
   PURPOSE    : Exports a color ID composite where every layer object is
                rendered as a unique flat color on a single PNG. Use "Select
                by Color Range" in Photoshop to re-isolate any object. Also
                handles setting/updating the export output directory.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Export API Call
// =============================================================================

    // HELPER FUNCTION | POST to the color ID export endpoint
    // ------------------------------------------------------------
    async function NobleImageTools__ColorId__CallExportApi(payload) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/mask/export-colorid`;

        const res       = await fetch(url, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(payload)
        });

        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Color ID export failed');
        return json.data;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | POST to browse for a directory (used for output dir picker)
    // ------------------------------------------------------------
    async function NobleImageTools__ColorId__FetchDirListing(path) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/files/browse?path=${encodeURIComponent(path)}&dirs_only=1`;

        const res       = await fetch(url);
        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Browse failed');
        return json.data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Export Actions
// =============================================================================

    // FUNCTION | Export all layers as a color ID composite PNG
    // ------------------------------------------------------------
    async function NobleImageTools__ColorId__ExportColorId() {
        const state     = window.NobleImageTools__State;

        if (!state.layers.length) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('No layers to export.', 'warning');
            return;
        }

        try {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Exporting Color ID map...', 'info');

            const layersPayload = state.layers.map(function (l) {
                return {
                    id          : l.id,
                    name        : l.name,
                    color       : l.color,
                    mask_data   : Array.from(l.maskData || [])
                };
            });

            const data = await NobleImageTools__ColorId__CallExportApi({
                image_path  : state.image.path,
                layers      : layersPayload,
                output_dir  : state.exportDir || ''
            });

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Color ID saved: ' + data.filename, 'success'
            );

        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Color ID export error: ' + err.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the export output directory and update the label
    // ------------------------------------------------------------
    function NobleImageTools__ColorId__SetExportDir(dirPath) {
        window.NobleImageTools__State.exportDir = dirPath || '';

        const labelEl   = document.getElementById('Nit__ExportPanel__DirLabel');
        const short     = dirPath ? dirPath.replace(/\\/g, '/').split('/').slice(-2).join('/') : '(same as image)';
        if (labelEl) {
            labelEl.textContent = short;
            labelEl.title       = dirPath || '';
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Prompt the user to type or paste an output directory path
    // ------------------------------------------------------------
    function NobleImageTools__ColorId__PickExportDir() {
        const state     = window.NobleImageTools__State;
        const current   = state.exportDir || '';

        const path      = window.prompt(
            'Enter the full folder path for exported masks:\n(Leave blank to export next to the source image)',
            current
        );

        if (path === null) return;                                   // <-- User cancelled
        NobleImageTools__ColorId__SetExportDir(path.trim());

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            path.trim() ? 'Export folder set: ' + path.trim() : 'Export folder reset to image location.', 'info'
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__MaskExport__ColorId = {
        NobleImageTools__ColorId__ExportColorId : NobleImageTools__ColorId__ExportColorId,
        NobleImageTools__ColorId__SetExportDir  : NobleImageTools__ColorId__SetExportDir,
        NobleImageTools__ColorId__PickExportDir : NobleImageTools__ColorId__PickExportDir
    };

// endregion -------------------------------------------------------------------

}());
