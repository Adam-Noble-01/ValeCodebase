// =============================================================================
// REGION | CadGenerator - DXF Export Module
// =============================================================================
(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // CONSTANTS | Default Export Options
    // -------------------------------------------------------------------------
    const DEFAULT_OPTIONS = {
        usePOLYLINE                            : true,
        units                                  : null
    };

    // -------------------------------------------------------------------------
    // FUNCTION | Get MakerJS Library Instance
    // -------------------------------------------------------------------------
    function getMakerJS() {
        if (window.makerjs) return window.makerjs;
        if (window.require) {
            try { return window.require('makerjs'); } catch(e) {}
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // FUNCTION | Download DXF File
    // -------------------------------------------------------------------------
    function download(makerModel, filenamePrefix = 'CAD_Export', options = {}) {
        const M = getMakerJS();

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

        const exportOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            const dxfContent = M.exporter.toDXF(makerModel, {
                usePOLYLINE                    : exportOptions.usePOLYLINE,
                units                           : exportOptions.units || makerModel.units
            });

            const blob = new Blob([dxfContent], { type: 'application/dxf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${filenamePrefix}_${Date.now()}.dxf`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (e) {
            console.error('[DxfExport] Export failed:', e);
            alert('DXF export failed: ' + e.message);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // FUNCTION | Convert Model to DXF String
    // -------------------------------------------------------------------------
    function toString(makerModel, options = {}) {
        const M = getMakerJS();
        if (!M || !makerModel) {
            console.error('[DxfExport] Cannot generate DXF string.');
            return null;
        }

        const exportOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            return M.exporter.toDXF(makerModel, {
                usePOLYLINE                    : exportOptions.usePOLYLINE,
                units                           : exportOptions.units || makerModel.units
            });
        } catch (e) {
            console.error('[DxfExport] toDXF failed:', e);
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // FUNCTION | Convert Model to DXF Blob
    // -------------------------------------------------------------------------
    function toBlob(makerModel, options = {}) {
        const dxfContent = toString(makerModel, options);
        if (!dxfContent) return null;
        return new Blob([dxfContent], { type: 'application/dxf' });
    }

    // -------------------------------------------------------------------------
    // MODULE EXPORT | Attach to Global Namespace
    // -------------------------------------------------------------------------
    window.CadGenerator = window.CadGenerator || {};
    window.CadGenerator.DxfExport = {
        download,
        toString,
        toBlob
    };
})();
// endregion ====================================================================
