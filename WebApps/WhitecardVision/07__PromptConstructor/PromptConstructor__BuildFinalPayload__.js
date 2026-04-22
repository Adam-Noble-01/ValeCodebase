/* =============================================================================
 WHITECARDVISION - PROMPT CONSTRUCTOR - BUILD FINAL PAYLOAD
=============================================================================
 PURPOSE : Compile the exact JSON body we forward to the Flask proxy, which
           then forwards it verbatim to
           POST {base_url}/models/{model_id}:generateContent.

 SHAPE (locked to Gemini docs):
   {
     "contents": [
       { "parts": [
         { "inlineData": { "mimeType": "image/png", "data": "<base64>" } },   //<-- index 0 = Whitecard
         { "inlineData": { "mimeType": "image/png", "data": "<base64>" } },   //<-- other refs in order
         ...
         { "text": "<fully structured prompt>" }
       ]}
     ],
     "generationConfig": {
       "responseModalities": ["TEXT", "IMAGE"],
       "imageConfig": { "imageSize": "2K", "aspectRatio": "16:9" }
     }
   }
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Build the Gemini request body for Render mode */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__BuildFinalPayload__Render(projectTreeObject, overrideImageSize) {
        const renderGroup           = projectTreeObject.Wv__Project__RenderGroup || {};
        const whitecardBlock        = renderGroup.Wv__Project__RenderGroup__Whitecard || {};
        if (!whitecardBlock.Wv__Whitecard__ImagePath) {
            throw new Error('Upload a Whitecard image first.');
        }

        const imageDescriptorList   = await window.Wv__PromptConstructor__BuildImageList.Wv__PromptConstructor__BuildImageList__Render(projectTreeObject);
        const structuredPromptText  = await window.Wv__PromptConstructor__BuildStructuredPrompt.Wv__PromptConstructor__BuildStructuredPrompt__Render(projectTreeObject, imageDescriptorList);

        return await Wv__PromptConstructor__BuildFinalPayload__AssembleShell({
            imageDescriptorList       : imageDescriptorList,
            structuredPromptText      : structuredPromptText,
            aspectRatioString         : whitecardBlock.Wv__Whitecard__SnappedAspectRatio || '',
            imageSizeString           : overrideImageSize || renderGroup.Wv__Project__RenderGroup__ImageSize || '2K'
        });
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Build the Gemini request body for Edit mode */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__BuildFinalPayload__Edit(editIterationObject, overrideImageSize) {
        if (!editIterationObject.Wv__EditIteration__BaseImagePath) {
            throw new Error('Upload a base image for this iteration first.');
        }

        const imageDescriptorList   = window.Wv__PromptConstructor__BuildImageList.Wv__PromptConstructor__BuildImageList__Edit(editIterationObject);
        const structuredPromptText  = await window.Wv__PromptConstructor__BuildStructuredPrompt.Wv__PromptConstructor__BuildStructuredPrompt__Edit(editIterationObject, imageDescriptorList);

        const editModeConfig        = window.Wv__AppCore__StateManager.Wv__StateManager__GetSystemConfig('Editor') || {};
        const editDefaultSize       = (editModeConfig.Wv__EditMode__Config__Defaults || {}).Wv__EditMode__Config__Defaults__ImageSize || '2K';
        const perIterationSize      = editIterationObject.Wv__EditIteration__ImageSize || '';

        return await Wv__PromptConstructor__BuildFinalPayload__AssembleShell({
            imageDescriptorList       : imageDescriptorList,
            structuredPromptText      : structuredPromptText,
            aspectRatioString         : editIterationObject.Wv__EditIteration__SnappedAspectRatio || '',
            imageSizeString           : overrideImageSize || perIterationSize || editDefaultSize
        });
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Common payload assembly logic */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__BuildFinalPayload__AssembleShell(assemblyParams) {
        const appConfig             = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const geminiConfigBlock     = appConfig.Wv__AppConfig__Gemini || {};
        const responseModalities    = geminiConfigBlock.Wv__AppConfig__Gemini__ResponseModalities || ['TEXT','IMAGE'];
        const validImageSizes       = geminiConfigBlock.Wv__AppConfig__Gemini__ValidImageSizes    || ['512','1K','2K','4K'];

        const imageSizeSafe         = validImageSizes.includes(assemblyParams.imageSizeString)
            ? assemblyParams.imageSizeString
            : (geminiConfigBlock.Wv__AppConfig__Gemini__DefaultImageSize || '2K');

        const partsList             = [];
        for (const imageDescriptor of assemblyParams.imageDescriptorList) {
            const inlineDataBlock   = await Wv__PromptConstructor__BuildFinalPayload__FetchInlineData(imageDescriptor.imageRelPath);
            partsList.push({ inlineData: inlineDataBlock });
        }
        partsList.push({ text: assemblyParams.structuredPromptText });

        const generationConfigBlock = {
            responseModalities : responseModalities,
            imageConfig        : {
                imageSize : imageSizeSafe
            }
        };
        if (assemblyParams.aspectRatioString) {
            generationConfigBlock.imageConfig.aspectRatio = assemblyParams.aspectRatioString;
        }

        return {
            contents         : [ { parts: partsList } ],
            generationConfig : generationConfigBlock
        };
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Fetch an image from the Flask static server and base64 it */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__BuildFinalPayload__FetchInlineData(relativeImagePath) {
        const response = await fetch('/' + relativeImagePath + '?_t=' + Date.now());
        if (!response.ok) throw new Error('Could not fetch image: ' + relativeImagePath);
        const imageBlob = await response.blob();
        const mimeType  = imageBlob.type || 'image/png';
        const base64Data = await new Promise((resolve, reject) => {
            const fileReader   = new FileReader();
            fileReader.onload  = () => {
                const dataUrlValue = String(fileReader.result || '');
                resolve(dataUrlValue.includes(',') ? dataUrlValue.split(',', 2)[1] : dataUrlValue);
            };
            fileReader.onerror = () => reject(fileReader.error || new Error('Could not base64 encode image'));
            fileReader.readAsDataURL(imageBlob);
        });
        return { mimeType: mimeType, data: base64Data };
    }
    /* ------------------------------------------------------------ */


    window.Wv__PromptConstructor__BuildFinalPayload = {
        Wv__PromptConstructor__BuildFinalPayload__Render,
        Wv__PromptConstructor__BuildFinalPayload__Edit
    };

})();
