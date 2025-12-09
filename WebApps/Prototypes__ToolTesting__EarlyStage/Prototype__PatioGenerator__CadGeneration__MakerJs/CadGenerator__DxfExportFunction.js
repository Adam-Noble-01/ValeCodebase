// -----------------------------------------------------------------------------
// REGION | CadGenerator - DXF Export Module
// -----------------------------------------------------------------------------
// Provides standardized DXF export functionality for CAD generators
// Dependencies: MakerJS library must be loaded before this module
// -----------------------------------------------------------------------------

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // REGION | Module Configuration
    // -------------------------------------------------------------------------
    const DEFAULT_OPTIONS = {
        usePOLYLINE:    true,                                                    // <-- Use POLYLINE entities (better compatibility)
        units:          null                                                     // <-- Auto-detect from model, or override
    };
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | MakerJS Accessor
    // -------------------------------------------------------------------------

    // FUNCTION | Get MakerJS library reference safely
    // ------------------------------------------------------------
    function getMakerJS() {
        if (window.makerjs) return window.makerjs;
        if (window.require) {
            try { return window.require('makerjs'); } catch(e) {}
        }
        return null;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Export Functions
    // -------------------------------------------------------------------------

    // FUNCTION | Download model as DXF file
    // ------------------------------------------------------------
    function download(makerModel, filenamePrefix = 'CAD_Export', options = {}) {
        const M = getMakerJS();

        // Validate inputs
        if (!M) {
            console.error('[DxfExport] MakerJS library not loaded.');
            alert('Error: CAD library not loaded. Cannot export DXF.');
            return false;
        }

        if (!makerModel) {
            console.error('[DxfExport] No model provided for export.');
            alert('Generate geometry first before exporting.');
            return false;
        }

        // Merge options
        const exportOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            // Generate DXF content
            const dxfContent = M.exporter.toDXF(makerModel, {
                usePOLYLINE: exportOptions.usePOLYLINE,
                units:       exportOptions.units || makerModel.units
            });

            // Create blob and trigger download
            const blob = new Blob([dxfContent], { type: 'application/dxf' });
            const url  = URL.createObjectURL(blob);

            const link      = document.createElement('a');
            link.href       = url;
            link.download   = `${filenamePrefix}_${Date.now()}.dxf`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up URL object
            URL.revokeObjectURL(url);

            return true;
        } catch (e) {
            console.error('[DxfExport] Export failed:', e);
            alert('DXF export failed: ' + e.message);
            return false;
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get DXF content as string (for custom handling)
    // ------------------------------------------------------------
    function toString(makerModel, options = {}) {
        const M = getMakerJS();

        if (!M || !makerModel) {
            console.error('[DxfExport] Cannot generate DXF string.');
            return null;
        }

        const exportOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            return M.exporter.toDXF(makerModel, {
                usePOLYLINE: exportOptions.usePOLYLINE,
                units:       exportOptions.units || makerModel.units
            });
        } catch (e) {
            console.error('[DxfExport] toDXF failed:', e);
            return null;
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get DXF as Blob object
    // ------------------------------------------------------------
    function toBlob(makerModel, options = {}) {
        const dxfContent = toString(makerModel, options);
        if (!dxfContent) return null;

        return new Blob([dxfContent], { type: 'application/dxf' });
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Module Export
    // -------------------------------------------------------------------------
    window.CadGenerator = window.CadGenerator || {};
    window.CadGenerator.DxfExport = {
        download,
        toString,
        toBlob
    };
    // endregion ---------------------------------------------------------------

})();

