/* =============================================================================
 WHITECARDVISION - PROJECT SCHEMA VALIDATOR
=============================================================================
 FILE       : WhitecardVision__AppData__ProjectSchemaValidator__.js
 NAMESPACE  : Wv
 MODULE     : AppData - ProjectSchemaValidator
 PURPOSE    : Normalise loaded project JSON to the current schema shape so
              missing keys never crash the UI. Emits a new default tree when
              the input is completely absent.
============================================================================= */

// =============================================================================
// REGION | Project Schema Validator Module
// =============================================================================

(function () {
    'use strict';

    const WV__PROJECTSCHEMA__CURRENT_VERSION = '0.1.0';


    // FUNCTION | Build an empty project tree with every required key present
    // ------------------------------------------------------------
    function Wv__ProjectSchemaValidator__BuildDefault(projectName, yearFolder, description) {                                   //<-- Used when starting a brand-new project locally before first save.
        const currentIsoTimestamp = new Date().toISOString();
        return {
            Wv__ProjectFile__Metadata: {
                Wv__ProjectFile__Metadata__ProjectName      : projectName  || '',
                Wv__ProjectFile__Metadata__ProjectCode      : projectName  || '',
                Wv__ProjectFile__Metadata__PreviousNames    : [],
                Wv__ProjectFile__Metadata__Description      : description  || '',
                Wv__ProjectFile__Metadata__YearFolder       : yearFolder   || '',
                Wv__ProjectFile__Metadata__SchemaVersion    : WV__PROJECTSCHEMA__CURRENT_VERSION,
                Wv__ProjectFile__Metadata__DateCreatedUtc   : currentIsoTimestamp,
                Wv__ProjectFile__Metadata__DateModifiedUtc  : currentIsoTimestamp
            },
            Wv__Project__RenderGroup: {
                Wv__Project__RenderGroup__Whitecard: {
                    Wv__Whitecard__ImagePath            : '',
                    Wv__Whitecard__ImageThumbPath       : '',
                    Wv__Whitecard__Prompt               : '',
                    Wv__Whitecard__WidthPx              : 0,
                    Wv__Whitecard__HeightPx             : 0,
                    Wv__Whitecard__SnappedAspectRatio   : '',
                    Wv__Whitecard__SnappedDeltaPct      : 0
                },
                Wv__Project__RenderGroup__MaterialReferences : [],
                Wv__Project__RenderGroup__StyleReferences    : [],
                Wv__Project__RenderGroup__AvoidNotes         : '',
                Wv__Project__RenderGroup__ImageSize          : '2K',
                Wv__Project__RenderGroup__LastOutputPath     : '',
                Wv__Project__RenderGroup__LastOutputThumbPath: ''
            },
            Wv__Project__EditIterations        : [],
            Wv__Project__ActiveEditIterationId : ''
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge loaded JSON into the default shape (non-destructive)
    // ------------------------------------------------------------
    function Wv__ProjectSchemaValidator__Normalise(loadedJson, projectName, yearFolder) {                                       //<-- Tolerant merge so partial files still open cleanly.
        const defaultTree  = Wv__ProjectSchemaValidator__BuildDefault(projectName, yearFolder, '');
        const safeSource   = (loadedJson && typeof loadedJson === 'object') ? loadedJson : {};

        defaultTree.Wv__ProjectFile__Metadata = Object.assign(
            defaultTree.Wv__ProjectFile__Metadata,
            safeSource.Wv__ProjectFile__Metadata || {}
        );

        const metaMerged = defaultTree.Wv__ProjectFile__Metadata;
        if (!String((metaMerged || {}).Wv__ProjectFile__Metadata__ProjectCode || '').trim()) {
            metaMerged.Wv__ProjectFile__Metadata__ProjectCode = projectName  || '';
        }
        if (!Array.isArray(metaMerged.Wv__ProjectFile__Metadata__PreviousNames)) {
            metaMerged.Wv__ProjectFile__Metadata__PreviousNames = [];
        }

        const sourceRenderGroup        = safeSource.Wv__Project__RenderGroup || {};
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard = Object.assign(
            defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard,
            sourceRenderGroup.Wv__Project__RenderGroup__Whitecard || {}
        );
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard.Wv__Whitecard__ImageThumbPath =
            defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard.Wv__Whitecard__ImageThumbPath || '';
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__MaterialReferences =
            Array.isArray(sourceRenderGroup.Wv__Project__RenderGroup__MaterialReferences)
                ? sourceRenderGroup.Wv__Project__RenderGroup__MaterialReferences.map((refEntry) => Object.assign(
                    Wv__ProjectSchemaValidator__BuildBlankReference(String((refEntry || {}).Wv__Reference__Type || 'material')),
                    refEntry || {}
                ))
                : [];
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__StyleReferences =
            Array.isArray(sourceRenderGroup.Wv__Project__RenderGroup__StyleReferences)
                ? sourceRenderGroup.Wv__Project__RenderGroup__StyleReferences.map((refEntry) => Object.assign(
                    Wv__ProjectSchemaValidator__BuildBlankReference(String((refEntry || {}).Wv__Reference__Type || 'style')),
                    refEntry || {}
                ))
                : [];
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__AvoidNotes =
            sourceRenderGroup.Wv__Project__RenderGroup__AvoidNotes || '';
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__ImageSize =
            sourceRenderGroup.Wv__Project__RenderGroup__ImageSize || '2K';
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__LastOutputPath =
            sourceRenderGroup.Wv__Project__RenderGroup__LastOutputPath || '';
        defaultTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__LastOutputThumbPath =
            sourceRenderGroup.Wv__Project__RenderGroup__LastOutputThumbPath || '';

        defaultTree.Wv__Project__EditIterations         = Array.isArray(safeSource.Wv__Project__EditIterations)
            ? safeSource.Wv__Project__EditIterations.map((iterationEntry, index) => Object.assign(
                Wv__ProjectSchemaValidator__BuildBlankEditIteration(index),
                iterationEntry || {}
            ))
            : [];
        defaultTree.Wv__Project__ActiveEditIterationId  =
            safeSource.Wv__Project__ActiveEditIterationId || '';

        return defaultTree;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a blank reference image entry
    // ------------------------------------------------------------
    function Wv__ProjectSchemaValidator__BuildBlankReference(referenceTypeToken) {                                              //<-- Used when the UI adds a new Material/Style reference tile.
        return {
            Wv__Reference__Id           : 'ref_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            Wv__Reference__Type         : referenceTypeToken,                                                                   //<-- "material" or "style".
            Wv__Reference__Label        : '',
            Wv__Reference__ImagePath    : '',
            Wv__Reference__ThumbPath    : '',
            Wv__Reference__Prompt       : ''
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a blank edit iteration entry
    // ------------------------------------------------------------
    function Wv__ProjectSchemaValidator__BuildBlankEditIteration(index) {                                                       //<-- Used by Editor Mode when the user clicks New.
        const iterationId      = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15) + 'Z';                            //<-- e.g. 20260422T145730Z (safe for folder names).
        const versionNumber    = String(index + 1).padStart(2, '0');                                                             //<-- e.g. 01, 02, 03 ...
        return {
            Wv__EditIteration__Id             : iterationId,
            Wv__EditIteration__Label          : 'Iter ' + (index + 1),
            Wv__EditIteration__Version        : 'Version-' + versionNumber,
            Wv__EditIteration__BaseImagePath  : '',
            Wv__EditIteration__BaseImageThumbPath : '',
            Wv__EditIteration__BaseWidthPx    : 0,
            Wv__EditIteration__BaseHeightPx   : 0,
            Wv__EditIteration__SnappedAspectRatio : '',
            Wv__EditIteration__SnappedDeltaPct : 0,
            Wv__EditIteration__TargetPrompt   : '',
            Wv__EditIteration__PreservePrompt :
                'Keep everything else exactly the same. Preserve original style, lighting, composition, camera angle, perspective, and aspect ratio without any alteration to untouched areas of the image.',
            Wv__EditIteration__AvoidNotes     : '',
            Wv__EditIteration__ImageSize      : '2K',
            Wv__EditIteration__LastOutputPath : '',
            Wv__EditIteration__LastOutputThumbPath : '',
            Wv__EditIteration__DateCreatedUtc : new Date().toISOString()
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppData__ProjectSchemaValidator = {
        Wv__ProjectSchemaValidator__BuildDefault,
        Wv__ProjectSchemaValidator__Normalise,
        Wv__ProjectSchemaValidator__BuildBlankReference,
        Wv__ProjectSchemaValidator__BuildBlankEditIteration,
        WV__PROJECTSCHEMA__CURRENT_VERSION
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
