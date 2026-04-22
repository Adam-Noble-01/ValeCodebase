/* =============================================================================
 WHITECARDVISION - PROMPT CONSTRUCTOR - BUILD IMAGE LIST
=============================================================================
 PURPOSE : Produce the ordered image descriptor list used by
           BuildStructuredPrompt and BuildFinalPayload.

 CRITICAL: Whitecard MUST be index 0. Materials follow, then Styles. Index
           is 1-based in the prompt text (the model reads positional text).
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Assemble Render-mode descriptors (Whitecard + refs) */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__BuildImageList__Render(projectTreeObject) {
        const renderGroup        = projectTreeObject.Wv__Project__RenderGroup || {};
        const whitecardBlock     = renderGroup.Wv__Project__RenderGroup__Whitecard || {};
        const materialReferences = renderGroup.Wv__Project__RenderGroup__MaterialReferences || [];
        const styleReferences    = renderGroup.Wv__Project__RenderGroup__StyleReferences    || [];

        const imageDescriptorList = [];

        if (whitecardBlock.Wv__Whitecard__ImagePath) {
            imageDescriptorList.push({
                role               : 'whitecard',
                label              : 'Whitecard',
                imageRelPath       : whitecardBlock.Wv__Whitecard__ImagePath,
                userPrompt         : whitecardBlock.Wv__Whitecard__Prompt || '',
                snappedAspectRatio : whitecardBlock.Wv__Whitecard__SnappedAspectRatio || '',
                widthPx            : whitecardBlock.Wv__Whitecard__WidthPx  || 0,
                heightPx           : whitecardBlock.Wv__Whitecard__HeightPx || 0
            });
        }

        for (const materialEntry of materialReferences) {
            if (!materialEntry.Wv__Reference__ImagePath) continue;
            imageDescriptorList.push({
                role         : 'material',
                label        : materialEntry.Wv__Reference__Label || 'Material',
                imageRelPath : materialEntry.Wv__Reference__ImagePath,
                userPrompt   : materialEntry.Wv__Reference__Prompt || ''
            });
        }
        for (const styleEntry of styleReferences) {
            if (!styleEntry.Wv__Reference__ImagePath) continue;
            imageDescriptorList.push({
                role         : 'style',
                label        : styleEntry.Wv__Reference__Label || 'Style',
                imageRelPath : styleEntry.Wv__Reference__ImagePath,
                userPrompt   : styleEntry.Wv__Reference__Prompt || ''
            });
        }
        return imageDescriptorList;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Assemble Edit-mode descriptors (base image only; no refs by default) */
    /* ------------------------------------------------------------ */
    function Wv__PromptConstructor__BuildImageList__Edit(editIterationObject) {
        const descriptorList = [];
        if (editIterationObject.Wv__EditIteration__BaseImagePath) {
            descriptorList.push({
                role         : 'whitecard',                                                                                     //<-- For prompt indexing purposes the base image plays the same role.
                label        : editIterationObject.Wv__EditIteration__Label || 'Base',
                imageRelPath : editIterationObject.Wv__EditIteration__BaseImagePath,
                userPrompt   : ''
            });
        }
        return descriptorList;
    }
    /* ------------------------------------------------------------ */


    window.Wv__PromptConstructor__BuildImageList = {
        Wv__PromptConstructor__BuildImageList__Render,
        Wv__PromptConstructor__BuildImageList__Edit
    };

})();
