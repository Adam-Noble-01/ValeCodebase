/* =============================================================================
   VGHLANTERN - COMPONENT INDEX DETAIL VIEW
   =============================================================================

   FILE       : VghLantern__ComponentIndex__DetailView__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ComponentIndex - DetailView
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Modal detail panel for a single component or profile asset
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Opens in the shared app modal, so it inherits overlay and dismiss behaviour
   - Shows a large 2D preview: a component traces its index entry's Preview2d
     block (front elevation, or a legacy Profile2D fallback), a profile traces
     its own Na__Asset__Profile2D outline
   - Lists metadata, bounding extents, applicable member roles, and asset URLs
   - Copy-to-clipboard action for the asset id, for pasting into a config JSON
   - Reads assets only through ComponentIndexLoader / ProfileIndexLoader

   -----------------------------------------------------------------------------

   WHY THE SHARED MODAL:
   The gallery is a browse surface, not an editor. A modal keeps the grid state
   intact behind it, so dismissing returns the user to the same scroll position
   and filter selection.

   ============================================================================= */

// =============================================================================
// REGION | Component Index Detail View Module
// =============================================================================

const VghLantern__ComponentIndex__DetailView = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Shared Modal DOM Targets
    // ------------------------------------------------------------
    const MODAL_ROOT_ID       =  'VghLantern__Modal__Root';
    const MODAL_TITLE_ID      =  'VghLantern__Modal__TitleEl';
    const MODAL_BODY_ID       =  'VghLantern__Modal__BodyEl';
    const MODAL_ACTIONS_ID    =  'VghLantern__Modal__ActionsEl';
    const MODAL_VISIBLE_CLASS =  'VghLantern__Modal__Overlay--visible';
    const LIBRARY_PROFILES    =  'profiles';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Asset Schema Keys
    // ------------------------------------------------------------
    const KEY_METADATA   =  'Na__Asset__Metadata';
    const KEY_PROFILE2D  =  'Na__Asset__Profile2D';
    const KEY_MESH3D     =  'Na__Asset__Mesh3D';
    const KEY_GLB_URL    =  'Na__Asset__Glb3D__Url';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show the Shared Modal with Supplied Content
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__ShowModal(title, bodyHtml, actionsHtml) {
        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);

        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        titleEl.textContent  =  title;
        bodyEl.innerHTML     =  bodyHtml;
        actionsEl.innerHTML  =  actionsHtml;

        root.classList.add(MODAL_VISIBLE_CLASS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide the Shared Modal
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__Hide() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) root.classList.remove(MODAL_VISIBLE_CLASS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Metadata Definition Row
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__Row(labelText, valueText) {
        if (valueText === undefined || valueText === null || valueText === '') return '';

        var html  =  '<div class="VghLantern__ComponentIndex__DetailRow">';
        html     +=      '<span class="VghLantern__ComponentIndex__DetailLabel">' +
                             VghLantern__ComponentIndex__DetailView__Escape(labelText) + '</span>';
        html     +=      '<span class="VghLantern__ComponentIndex__DetailValue">' +
                             VghLantern__ComponentIndex__DetailView__Escape(valueText) + '</span>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Describe the Extents of an Outline in mm
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__DescribeExtents(points) {
        if (!Array.isArray(points) || points.length === 0) return '';

        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (var i = 0; i < points.length; i++) {
            var point  =  points[i];
            var x      =  Number(point.X_mm !== undefined ? point.X_mm : point.x);
            var y      =  Number(point.Y_mm !== undefined ? point.Y_mm : point.y);
            if (!isFinite(x) || !isFinite(y)) continue;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        if (!isFinite(minX)) return '';

        return (maxX - minX).toFixed(1) + ' mm wide  x  ' + (maxY - minY).toFixed(1) + ' mm tall';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Describe the Extents Carried on a Preview2d Block
    // ------------------------------------------------------------
    // Preview2d already states its own width and height in mm - the build
    // utility read them straight off the source bounding box - so this is a
    // formatting step, not a recomputation.
    function VghLantern__ComponentIndex__DetailView__DescribeExtentsFromPreview2d(preview2d) {
        if (!preview2d || !isFinite(preview2d.WidthMm) || !isFinite(preview2d.HeightMm)) return '';
        return preview2d.WidthMm.toFixed(1) + ' mm wide  x  ' + preview2d.HeightMm.toFixed(1) + ' mm tall';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Load the Index Entry and Full Asset JSON
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndex__DetailView__Resolve(entryId, libraryKey) {
        var isProfile  =  (libraryKey === LIBRARY_PROFILES);
        var loader     =  isProfile
            ? window.VghLantern__AppData__ProfileIndexLoader
            : window.VghLantern__AppData__ComponentIndexLoader;

        if (!loader || !entryId) return null;

        var entry  =  isProfile
            ? loader.VghLantern__ProfileIndexLoader__GetEntry(entryId)
            : loader.VghLantern__ComponentIndexLoader__GetEntry(entryId);

        var assetData  =  isProfile
            ? await loader.VghLantern__ProfileIndexLoader__LoadProfile(entryId)
            : await loader.VghLantern__ComponentIndexLoader__LoadAsset(entryId);

        return { Entry : entry, Asset : assetData, IsProfile : isProfile };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Body Markup Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Large Preview Block
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__BuildPreviewBlock(outlinePoints) {
        var Gallery  =  window.VghLantern__System__ComponentIndex;
        var svg      =  (Gallery && Gallery.VghLantern__ComponentIndex__BuildPreviewSvg)
            ? Gallery.VghLantern__ComponentIndex__BuildPreviewSvg(outlinePoints)   // <-- Reuse the gallery tracer, never duplicate it
            : '';

        var inner  =  svg || '<div class="VghLantern__ComponentIndex__PreviewMissing">No 2D profile</div>';

        return '<div class="VghLantern__ComponentIndex__DetailPreview">' + inner + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Large Preview Block from a Baked Preview2d Block
    // ------------------------------------------------------------
    // Components carry their front elevation as Preview2d.PathData rather than
    // Profile2D points, so the detail panel traces it through the gallery's
    // matching builder instead - same rule as above, different source.
    function VghLantern__ComponentIndex__DetailView__BuildPreviewBlockFromPreview2d(preview2d, isLineArt) {
        var Gallery  =  window.VghLantern__System__ComponentIndex;
        var svg      =  (preview2d && Gallery && Gallery.VghLantern__ComponentIndex__BuildPreviewSvgFromPathData)
            ? Gallery.VghLantern__ComponentIndex__BuildPreviewSvgFromPathData(preview2d, isLineArt)
            : '';

        var inner  =  svg || '<div class="VghLantern__ComponentIndex__PreviewMissing">3D only</div>';

        return '<div class="VghLantern__ComponentIndex__DetailPreview">' + inner + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Metadata Block
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__BuildMetadataBlock(resolved, outlinePoints, extentsText) {
        var entry     =  resolved.Entry || {};
        var asset     =  resolved.Asset || {};
        var metadata  =  asset[KEY_METADATA] || {};

        var roles  =  Array.isArray(entry.ApplicableRoles) ? entry.ApplicableRoles.join(', ') : '';
        var glbUrl =  asset[KEY_GLB_URL] || entry.Glb3dUrl || '';

        var html  =  '<div class="VghLantern__ComponentIndex__DetailMeta">';
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Asset Id',
                             entry.AssetId || entry.ProfileId || metadata['Na__Asset__Metadata__Id']);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Name',
                             entry.Name || metadata['Na__Asset__Metadata__Name']);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Category',
                             entry.CategoryName || entry.CategoryId);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Applicable Roles', roles);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Extents', extentsText);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Outline Points',
                             Array.isArray(outlinePoints) ? outlinePoints.length : '');
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Has Inline Mesh',
                             asset[KEY_MESH3D] ? 'Yes' : 'No');
        html     +=      VghLantern__ComponentIndex__DetailView__Row('GLB Reference', glbUrl);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Revision',
                             metadata['Na__Asset__Metadata__Revision']);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Description',
                             metadata['Na__Asset__Metadata__Description']);
        html     +=      VghLantern__ComponentIndex__DetailView__Row('Data File', entry.JsonUrl);
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Surface
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Detail Panel for One Asset
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndex__DetailView__Show(entryId, libraryKey) {
        var resolved  =  await VghLantern__ComponentIndex__DetailView__Resolve(entryId, libraryKey);

        if (!resolved || !resolved.Entry) {
            VghLantern__ComponentIndex__DetailView__ShowModal(
                'Asset Not Found',
                '<p>No index entry exists for <strong>' +
                    VghLantern__ComponentIndex__DetailView__Escape(entryId) + '</strong>.</p>',
                '<button id="VghLantern__ComponentIndex__DetailClose" class="VghLantern__Modal__BtnSecondary">Close</button>');
            VghLantern__ComponentIndex__DetailView__BindActions(entryId);
            return;
        }

        var entry          =  resolved.Entry;
        var previewHtml    =  '';
        var outlinePoints  =  null;
        var extentsText    =  '';

        if (resolved.IsProfile) {
            // Profiles have no Preview2d block - trace the swept cross-section's
            // own outline points, same as the gallery card does.
            var asset      =  resolved.Asset || {};
            var profile2d  =  asset[KEY_PROFILE2D] || {};
            outlinePoints  =  Array.isArray(profile2d['Na__Asset__Profile2D__Points'])
                ? profile2d['Na__Asset__Profile2D__Points']
                : null;

            previewHtml  =  VghLantern__ComponentIndex__DetailView__BuildPreviewBlock(outlinePoints);
            extentsText  =  VghLantern__ComponentIndex__DetailView__DescribeExtents(outlinePoints);
        } else {
            // Components carry their front elevation pre-baked on the index
            // entry - the same Preview2d block the gallery card already drew.
            var preview2d  =  entry.Preview2d || null;

            previewHtml  =  VghLantern__ComponentIndex__DetailView__BuildPreviewBlockFromPreview2d(
                preview2d, entry.Has2dElevation === true);
            extentsText  =  VghLantern__ComponentIndex__DetailView__DescribeExtentsFromPreview2d(preview2d);
        }

        var bodyHtml  =  '<div class="VghLantern__ComponentIndex__DetailLayout">';
        bodyHtml     +=      previewHtml;
        bodyHtml     +=      VghLantern__ComponentIndex__DetailView__BuildMetadataBlock(resolved, outlinePoints, extentsText);
        bodyHtml     +=  '</div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__ComponentIndex__DetailCopyId" class="VghLantern__Modal__BtnSecondary">Copy Asset Id</button>';
        actionsHtml     +=  '<button id="VghLantern__ComponentIndex__DetailClose" class="VghLantern__Modal__BtnPrimary">Close</button>';

        var titleText  =  resolved.Entry.Name || entryId;
        VghLantern__ComponentIndex__DetailView__ShowModal(titleText, bodyHtml, actionsHtml);
        VghLantern__ComponentIndex__DetailView__BindActions(entryId);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Detail Panel Action Buttons
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__BindActions(entryId) {
        var closeBtn   =  document.getElementById('VghLantern__ComponentIndex__DetailClose');
        var copyIdBtn  =  document.getElementById('VghLantern__ComponentIndex__DetailCopyId');

        if (closeBtn) closeBtn.addEventListener('click', VghLantern__ComponentIndex__DetailView__Hide);

        if (copyIdBtn) {
            copyIdBtn.addEventListener('click', function() {
                VghLantern__ComponentIndex__DetailView__CopyToClipboard(entryId);
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Copy Text to the Clipboard with Toast Feedback
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__DetailView__CopyToClipboard(textValue) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;

        function report(message, variantKey) {
            if (Toast) Toast.VghLantern__Toast__Show(message, variantKey);
        }

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            report('Clipboard access is unavailable in this browser.', 'warning');
            return;
        }

        navigator.clipboard.writeText(String(textValue)).then(function() {
            report('Copied ' + textValue + ' to the clipboard.', 'success');
        }).catch(function() {
            report('Could not copy to the clipboard.', 'error');
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ComponentIndex__DetailView__Show : VghLantern__ComponentIndex__DetailView__Show,
        VghLantern__ComponentIndex__DetailView__Hide : VghLantern__ComponentIndex__DetailView__Hide
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ComponentIndex__DetailView  =  VghLantern__ComponentIndex__DetailView;
