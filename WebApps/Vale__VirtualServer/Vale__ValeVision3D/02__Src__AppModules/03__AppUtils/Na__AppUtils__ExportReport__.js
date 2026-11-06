// =============================================================================
// VALEVISION3D - APP UTILS - EXPORT REPORT (WHAT PEOPLE PRODUCE WITH THE APP)
// =============================================================================
//
// FILE       : Na__AppUtils__ExportReport__.js
// NAMESPACE  : Na__ExportReport
// MODULE     : AppUtils - Export Report
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : One way for ValeVision 3D's exports to tell the activity ledger
//              what was made, so the Server Manager's tab 05 shows what people
//              produce
// CREATED    : 06-Nov-2026
//
// DESCRIPTION:
// - CALLED WHERE THE FILE IS HANDED TO THE BROWSER, after the save call, never
//   by listening for clicks: a long render, a detached download link (jsPDF's)
//   or a write into a chosen folder (File System Access) is still reported.
// - REPORTED (Adam, 06-Nov-2026: these three only; the ledger's
//   NA__ACTIVITY__CLIENT_ACTIONS, ValeShared__Activity__ 1.2.2):
//     image.export    Download Image
//     drawing.export  the Drawing Editor's PDF, a Layout Editor sheet PDF
//   Not reported here, on purpose: the presentation scenes batch, render layers,
//   the specification and register PDFs, Video Studio, the developer JSON files.
//   Target says what it was ("Test Drawing 01", "4K 16:9 image"); Detail holds
//   Kind, File and a few facts (Width, Height, SizeMb), never in Text.
// - WHO, WHERE FROM, WHICH PROJECT AND WHICH CLIENT LINK are added by the shared
//   ValeShared__ActivityLog__.js (window.ValeActivity). The Drawing Editor runs in
//   a frame of the app, so its parent's ValeActivity is used (same origin).
// - The shared script's own "Downloaded a file" report stays quiet for a download
//   within 3 seconds of this one, so nothing is counted twice.
// - NEVER IN THE WAY: no ValeActivity (a page alone, a test bench), a bad value
//   or a throw inside it, and nothing happens. An export never fails for this.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Nov-2026 - Version 1.0.0 (ValeVision3D v2.90.0)
// - Initial build: Download Image, the Drawing Editor PDF and Layout Editor
//   sheet PDFs report through here.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Ledger's Browser Script: This Window's, Else the App's Around a Frame
    // ------------------------------------------------------------
    function Na__ExportReport__Activity() {
        try {
            if (window.ValeActivity && typeof window.ValeActivity.Log === 'function') return window.ValeActivity;
            if (window.parent && window.parent !== window && window.parent.ValeActivity
                && typeof window.parent.ValeActivity.Log === 'function') return window.parent.ValeActivity;
        } catch (error) { /* a parent that cannot be read is no ValeVision 3D */ }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bytes as Megabytes, One Decimal (0 when unknown)
    // ------------------------------------------------------------
    function Na__ExportReport__SizeMb(bytes) {
        const n = Number(bytes);
        return (n > 0) ? Math.round(n / 104857.6) / 10 : 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Detail With Only the Facts That Are Known
    // ------------------------------------------------------------
    function Na__ExportReport__Clean(detail) {
        const out = {};
        Object.keys(detail || {}).forEach((key) => {
            const value = detail[key];
            if (value === undefined || value === null || value === '') return;
            out[key] = value;
        });
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reporting
// -----------------------------------------------------------------------------

    // FUNCTION | Report One Export (never throws)
    // ------------------------------------------------------------
    // action  'image.export' | 'drawing.export' | 'video.export' | 'data.export'
    // target  what was made, in words ("Test Drawing 01", "the specification")
    // detail  { Kind, File, Files, Width, Height, SizeMb, ... } (unknowns left out)
    // project optional library id; the shared script uses the page's own otherwise
    // ------------------------------------------------------------
    function Na__ExportReport__Send(action, target, detail, project) {
        try {
            const activity = Na__ExportReport__Activity();
            if (!activity) return false;
            const fields = { target: String(target || '').trim(), detail: Na__ExportReport__Clean(detail) };
            if (project) fields.project = String(project).split('/').pop();
            activity.Log(action, fields);
            return true;
        } catch (error) {
            return false;                                                    // <-- The ledger never stops an export
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Export Report API
    // ------------------------------------------------------------
    export {
        Na__ExportReport__Send,
        Na__ExportReport__SizeMb
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
