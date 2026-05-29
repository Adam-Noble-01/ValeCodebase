/* =============================================================================
   NOBLEIMAGETOOLS - MASK EXPORT - BLACK & WHITE
   =============================================================================

   FILE       : NobleImageTools__MaskExport__BW__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskExport - B&W + RGBA
   PURPOSE    : Sends selected or all layers to the Flask export endpoints.
                Handles B&W grayscale PNG (for PS layer masks), RGBA cutout
                (transparent background), and triggers file save responses.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Export API Calls
// =============================================================================

    // HELPER FUNCTION | POST to a Flask mask export endpoint
    // ------------------------------------------------------------
    async function NobleImageTools__ExportBW__CallExportApi(endpoint, payload) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}${endpoint}`;

        const res       = await fetch(url, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(payload)
        });

        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Export failed');
        return json.data;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Serialize a layer for transport
    // ------------------------------------------------------------
    function NobleImageTools__ExportBW__SerialiseLayer(layer) {
        return {
            id          : layer.id,
            name        : layer.name,
            mask_data   : Array.from(layer.maskData || [])
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Export Actions
// =============================================================================

    // HELPER FUNCTION | Collect all visible layers serialised for transport
    // ------------------------------------------------------------
    function NobleImageTools__ExportBW__GetVisibleLayers() {
        return window.NobleImageTools__State.layers
            .filter(function (l) { return l.visible; })
            .map(NobleImageTools__ExportBW__SerialiseLayer);
    }
    // ------------------------------------------------------------


    // FUNCTION | Export all visible layers as one flat B&W PNG (union)
    // ------------------------------------------------------------
    async function NobleImageTools__ExportBW__ExportSelectedBW() {
        const state     = window.NobleImageTools__State;
        const visible   = NobleImageTools__ExportBW__GetVisibleLayers();

        if (!visible.length) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('No visible layers to export.', 'warning');
            return;
        }

        try {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Exporting flat B&W mask…', 'info');

            const data = await NobleImageTools__ExportBW__CallExportApi('/api/mask/export-bw', {
                image_path  : state.image.path,
                layers      : visible,
                output_dir  : state.exportDir || ''
            });

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                `B&W saved (${data.layer_count} layers flattened): ${data.filename}`, 'success', 3500
            );

        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Export error: ' + err.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Export all visible layers as one flat RGBA cutout
    // ------------------------------------------------------------
    async function NobleImageTools__ExportBW__ExportSelectedRGBA() {
        const state     = window.NobleImageTools__State;
        const visible   = NobleImageTools__ExportBW__GetVisibleLayers();

        if (!visible.length) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('No visible layers to export.', 'warning');
            return;
        }

        try {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Exporting flat RGBA cutout…', 'info');

            const data = await NobleImageTools__ExportBW__CallExportApi('/api/mask/export-rgba', {
                image_path  : state.image.path,
                layers      : visible,
                output_dir  : state.exportDir || ''
            });

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                `RGBA saved (${data.layer_count} layers flattened): ${data.filename}`, 'success', 3500
            );

        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Export error: ' + err.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Export all layers as individual B&W PNGs in a ZIP
    // ------------------------------------------------------------
    async function NobleImageTools__ExportBW__ExportAllBW() {
        const state     = window.NobleImageTools__State;

        if (!state.layers.length) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('No layers to export.', 'warning');
            return;
        }

        try {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Exporting all B&W masks...', 'info');

            const data = await NobleImageTools__ExportBW__CallExportApi('/api/mask/export-all', {
                image_path  : state.image.path,
                layers      : state.layers.map(NobleImageTools__ExportBW__SerialiseLayer),
                output_dir  : state.exportDir || ''
            });

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'All exported: ' + data.zip_filename, 'success'
            );

        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Export error: ' + err.message, 'error');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    // FUNCTION | Open the current export folder in Windows Explorer
    // ------------------------------------------------------------
    async function NobleImageTools__ExportBW__OpenExportFolder() {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const folder    = window.NobleImageTools__State.exportDir || '';

        try {
            await fetch(`${base}/api/files/open-folder`, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({ folder })
            });
        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Could not open folder: ' + err.message, 'error');
        }
    }
    // ------------------------------------------------------------

    window.NobleImageTools__MaskExport__BW = {
        NobleImageTools__ExportBW__ExportSelectedBW   : NobleImageTools__ExportBW__ExportSelectedBW,
        NobleImageTools__ExportBW__ExportSelectedRGBA : NobleImageTools__ExportBW__ExportSelectedRGBA,
        NobleImageTools__ExportBW__ExportAllBW        : NobleImageTools__ExportBW__ExportAllBW,
        NobleImageTools__ExportBW__OpenExportFolder   : NobleImageTools__ExportBW__OpenExportFolder
    };

// endregion -------------------------------------------------------------------

}());
