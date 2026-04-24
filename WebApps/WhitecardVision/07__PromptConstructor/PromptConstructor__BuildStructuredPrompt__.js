/* =============================================================================
 WHITECARDVISION - PROMPT CONSTRUCTOR - BUILD STRUCTURED PROMPT
=============================================================================
 FILE       : PromptConstructor__BuildStructuredPrompt__.js
 NAMESPACE  : Wv
 MODULE     : PromptConstructor - BuildStructuredPrompt
 PURPOSE    : Synthesise the final text prompt using the strict spec ordering:
              1. Whitecard frontloader
              2. Brief image index (dynamic)
              3. Main prompt body
              4. Per-Material frontloader + user prompt (for each material ref)
              5. Per-Style    frontloader + user prompt (for each style ref)
              6. AVOID suffix (standard markdown)
              7. Special avoid notes (user-supplied free text)
              8. Camera angle end reaffirmation (always last)
============================================================================= */

// =============================================================================
// REGION | PromptConstructor Build Structured Prompt Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Render-mode prompt text builder
    // ------------------------------------------------------------
    async function Wv__PromptConstructor__BuildStructuredPrompt__Render(projectTreeObject, imageDescriptorList) {
        const renderGroup        = projectTreeObject.Wv__Project__RenderGroup || {};
        const whitecardBlock     = renderGroup.Wv__Project__RenderGroup__Whitecard || {};
        const avoidNotes         = renderGroup.Wv__Project__RenderGroup__AvoidNotes || '';
        const loader             = window.Wv__PromptConstructor__LoadMarkdown;

        const sections           = [];

        const whitecardFrontload = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Whitecard');
        sections.push(loader.Wv__PromptConstructor__LoadMarkdown__ReplaceTokens(whitecardFrontload, { imageNumber: 1 }));

        const imageIndexSection  = Wv__PromptConstructor__BuildStructuredPrompt__BuildImageIndex(imageDescriptorList);
        sections.push(imageIndexSection);

        const mainPromptBody     = (whitecardBlock.Wv__Whitecard__Prompt || '').trim();
        if (mainPromptBody) {
            sections.push('--- MAIN PROMPT BODY ---\n' + mainPromptBody);
        }

        const materialFrontloadTemplate = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Material');
        const styleFrontloadTemplate    = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Style');

        for (let descriptorIndex = 0; descriptorIndex < imageDescriptorList.length; descriptorIndex++) {
            const imageDescriptor = imageDescriptorList[descriptorIndex];
            if (imageDescriptor.role === 'whitecard') continue;
            const oneBasedPositionIndex = descriptorIndex + 1;

            let frontloadedTemplateText;
            if (imageDescriptor.role === 'material') {
                frontloadedTemplateText = loader.Wv__PromptConstructor__LoadMarkdown__ReplaceTokens(
                    materialFrontloadTemplate, { imageNumber: oneBasedPositionIndex, imageLabel: imageDescriptor.label }
                );
            } else {
                frontloadedTemplateText = loader.Wv__PromptConstructor__LoadMarkdown__ReplaceTokens(
                    styleFrontloadTemplate, { imageNumber: oneBasedPositionIndex, imageLabel: imageDescriptor.label }
                );
            }
            const userSuppliedPrompt = (imageDescriptor.userPrompt || '').trim();
            const sectionHeader      = `--- ${imageDescriptor.role.toUpperCase()} REFERENCE [#${oneBasedPositionIndex}] "${imageDescriptor.label}" ---`;
            const sectionContent     = frontloadedTemplateText.trim() + (userSuppliedPrompt ? ('\n\n' + userSuppliedPrompt) : '');
            sections.push(sectionHeader + '\n' + sectionContent);
        }

        const avoidStandardText = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Avoid');
        sections.push(avoidStandardText);

        if (avoidNotes.trim()) {
            sections.push('--- SPECIAL AVOID NOTES ---\n' + avoidNotes.trim());
        }

        const cameraReaffirmationText = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__EndLoader__CameraReaffirmation');
        sections.push(cameraReaffirmationText);

        return sections.join('\n\n');
    }
    // ------------------------------------------------------------


    // FUNCTION | Edit-mode prompt text builder (target + preserve)
    // ------------------------------------------------------------
    async function Wv__PromptConstructor__BuildStructuredPrompt__Edit(editIterationObject, imageDescriptorList) {
        const loader      = window.Wv__PromptConstructor__LoadMarkdown;
        const sections    = [];

        const whitecardFrontload = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Whitecard');
        sections.push(loader.Wv__PromptConstructor__LoadMarkdown__ReplaceTokens(whitecardFrontload, { imageNumber: 1 }));
        sections.push(Wv__PromptConstructor__BuildStructuredPrompt__BuildImageIndex(imageDescriptorList));

        const targetElementText   = (editIterationObject.Wv__EditIteration__TargetPrompt || '').trim();
        if (targetElementText) {
            sections.push('--- TARGET ELEMENT (SEMANTIC MASK - WHAT TO CHANGE) ---\n' + targetElementText);
        }

        const preservePromptText  = (editIterationObject.Wv__EditIteration__PreservePrompt || '').trim();
        if (preservePromptText) {
            sections.push('--- PRESERVE (PROTECT THE REST OF THE CANVAS) ---\n' + preservePromptText);
        }

        const avoidStandardText   = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__FrontLoader__Avoid');
        sections.push(avoidStandardText);

        const iterationAvoidNotes = (editIterationObject.Wv__EditIteration__AvoidNotes || '').trim();
        if (iterationAvoidNotes) {
            sections.push('--- SPECIAL AVOID NOTES ---\n' + iterationAvoidNotes);
        }

        const cameraReaffirmationText = await loader.Wv__PromptConstructor__LoadMarkdown__ByConfigKey('Wv__AppConfig__PromptConstructor__EndLoader__CameraReaffirmation');
        sections.push(cameraReaffirmationText);

        return sections.join('\n\n');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Produce the dynamic "IMAGE INDEX" block
    // ------------------------------------------------------------
    function Wv__PromptConstructor__BuildStructuredPrompt__BuildImageIndex(imageDescriptorList) {
        const indexLines = ['--- IMAGE INDEX (positional ordering; index is 1-based) ---'];
        imageDescriptorList.forEach((imageDescriptor, descriptorIndex) => {
            const positionText = String(descriptorIndex + 1).padStart(2, '0');
            indexLines.push(`  [${positionText}] ${imageDescriptor.role.toUpperCase()} :: "${imageDescriptor.label}"`);
        });
        if (imageDescriptorList.length === 0) indexLines.push('  (no images supplied)');
        return indexLines.join('\n');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__PromptConstructor__BuildStructuredPrompt = {
        Wv__PromptConstructor__BuildStructuredPrompt__Render,
        Wv__PromptConstructor__BuildStructuredPrompt__Edit
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
