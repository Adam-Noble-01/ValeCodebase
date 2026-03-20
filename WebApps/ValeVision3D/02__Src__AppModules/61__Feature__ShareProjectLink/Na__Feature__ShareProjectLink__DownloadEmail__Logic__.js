// =============================================================================
// VALEVISION3D - SHARE PROJECT LINK - DOWNLOAD EMAIL HTML
// =============================================================================
//
// FILE       : Na__Feature__ShareProjectLink__DownloadEmail__Logic__.js
// NAMESPACE  : Na__Feature__ShareProjectLink
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Trigger download of generated email HTML in the browser
// CREATED    : Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Download Helper
// -----------------------------------------------------------------------------

    // FUNCTION | Download HTML String as .html File
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__DownloadHtmlFile(filename, htmlString) {
        const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Feature__ShareProjectLink__DownloadHtmlFile };

// endregion -------------------------------------------------------------------
