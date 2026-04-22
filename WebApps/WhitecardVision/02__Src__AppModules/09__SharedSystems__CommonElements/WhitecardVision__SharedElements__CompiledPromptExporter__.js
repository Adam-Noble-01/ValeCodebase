/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - COMPILED PROMPT EXPORTER
=============================================================================
 Produce a Markdown dump of the EXACT Gemini request we would POST for the
 current Render / Edit state (images omitted - the markdown carries the
 inlineData mimeType / byte length only so the file stays reviewable).
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Download compiled prompt for Render mode */
    /* ------------------------------------------------------------ */
    async function Wv__SharedElements__CompiledPromptExporter__DownloadRender(projectTree) {
        if (!projectTree) { throw new Error('No active project to export.'); }
        const geminiRequestShell = await window.Wv__PromptConstructor__BuildFinalPayload.Wv__PromptConstructor__BuildFinalPayload__Render(projectTree);
        const markdownFileContent = Wv__SharedElements__CompiledPromptExporter__BuildMarkdown({
            modeLabel           : 'Render',
            projectTree         : projectTree,
            iterationObject     : null,
            geminiRequestShell  : geminiRequestShell
        });
        Wv__SharedElements__CompiledPromptExporter__TriggerDownload(
            Wv__SharedElements__CompiledPromptExporter__BuildFilename(projectTree, 'Render'),
            markdownFileContent
        );
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Download compiled prompt for Edit mode */
    /* ------------------------------------------------------------ */
    async function Wv__SharedElements__CompiledPromptExporter__DownloadEdit(iterationObject, projectTree) {
        if (!iterationObject) { throw new Error('No active iteration to export.'); }
        const geminiRequestShell = await window.Wv__PromptConstructor__BuildFinalPayload.Wv__PromptConstructor__BuildFinalPayload__Edit(iterationObject);
        const markdownFileContent = Wv__SharedElements__CompiledPromptExporter__BuildMarkdown({
            modeLabel           : 'Edit',
            projectTree         : projectTree,
            iterationObject     : iterationObject,
            geminiRequestShell  : geminiRequestShell
        });
        Wv__SharedElements__CompiledPromptExporter__TriggerDownload(
            Wv__SharedElements__CompiledPromptExporter__BuildFilename(
                projectTree, 'Edit-' + (iterationObject.Wv__EditIteration__Id || 'active')
            ),
            markdownFileContent
        );
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Assemble the full markdown body */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__CompiledPromptExporter__BuildMarkdown(buildParams) {
        const projectMeta        = (buildParams.projectTree || {}).Wv__ProjectFile__Metadata || {};
        const partsArray         = ((buildParams.geminiRequestShell || {}).contents || [{}])[0].parts || [];
        const structuredTextPart = partsArray.find(partEntry => typeof partEntry.text === 'string') || { text: '' };
        const inlinePartsList    = partsArray.filter(partEntry => partEntry.inlineData);
        const generationConfig   = (buildParams.geminiRequestShell || {}).generationConfig || {};

        const renderGroup        = (buildParams.projectTree || {}).Wv__Project__RenderGroup || {};
        const formattedNowText   = window.Wv__AppUtils__DateFormat.Wv__DateFormat__FormatToDayMonYearTimeLocal(new Date());

        const lines = [];
        lines.push('# WhitecardVision - Compiled Gemini Prompt');
        lines.push('');
        lines.push('- **Mode:** ' + buildParams.modeLabel);
        lines.push('- **Exported:** ' + formattedNowText);
        lines.push('- **Project Name:** ' + (projectMeta.Wv__ProjectFile__Metadata__ProjectName || ''));
        lines.push('- **Project Year Folder:** ' + (projectMeta.Wv__ProjectFile__Metadata__YearFolder || ''));
        lines.push('- **Description:** ' + (projectMeta.Wv__ProjectFile__Metadata__Description || ''));
        if (buildParams.iterationObject) {
            lines.push('- **Iteration Id:** ' + (buildParams.iterationObject.Wv__EditIteration__Id || ''));
            lines.push('- **Iteration Label:** ' + (buildParams.iterationObject.Wv__EditIteration__Label || ''));
        }
        lines.push('- **Image Size:** ' + ((generationConfig.imageConfig || {}).imageSize || ''));
        lines.push('- **Aspect Ratio:** ' + ((generationConfig.imageConfig || {}).aspectRatio || ''));
        lines.push('');

        lines.push('## Image Parts (in order)');
        if (inlinePartsList.length === 0) {
            lines.push('_No inline images in this request._');
        } else {
            inlinePartsList.forEach((partEntry, partIndex) => {
                const byteLengthApprox = Math.floor(((partEntry.inlineData.data || '').length * 3) / 4);
                lines.push(`- [${String(partIndex + 1).padStart(2, '0')}] ` +
                    `${partEntry.inlineData.mimeType || 'image/png'} ` +
                    `(~${byteLengthApprox.toLocaleString()} bytes after base64 decode)`);
            });
        }
        lines.push('');

        if (buildParams.modeLabel === 'Render') {
            lines.push('## Render Avoid Notes');
            lines.push(renderGroup.Wv__Project__RenderGroup__AvoidNotes || '_(none)_');
            lines.push('');
        } else if (buildParams.iterationObject) {
            lines.push('## Iteration Fields');
            lines.push('### Target Element');
            lines.push(buildParams.iterationObject.Wv__EditIteration__TargetPrompt || '_(none)_');
            lines.push('');
            lines.push('### Preserve');
            lines.push(buildParams.iterationObject.Wv__EditIteration__PreservePrompt || '_(none)_');
            lines.push('');
            lines.push('### Avoid');
            lines.push(buildParams.iterationObject.Wv__EditIteration__AvoidNotes || '_(none)_');
            lines.push('');
        }

        lines.push('## Structured Prompt (exactly what is sent as parts[-1].text)');
        lines.push('');
        lines.push('```text');
        lines.push(structuredTextPart.text || '');
        lines.push('```');
        lines.push('');

        lines.push('## generationConfig (verbatim)');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(generationConfig, null, 2));
        lines.push('```');

        return lines.join('\n');
    }


    /* HELPER FUNCTION | Build a safe filename */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__CompiledPromptExporter__BuildFilename(projectTree, modeDescriptor) {
        const projectName = (((projectTree || {}).Wv__ProjectFile__Metadata || {}).Wv__ProjectFile__Metadata__ProjectName || 'NoProject')
            .replace(/[^A-Za-z0-9_\-]+/g, '-');
        const timestampTok = window.Wv__AppUtils__DateFormat.Wv__DateFormat__FormatToFilenameToken(new Date());
        const safeMode     = modeDescriptor.replace(/[^A-Za-z0-9_\-]+/g, '-');
        return `${projectName}__CompiledPrompt__${safeMode}__${timestampTok}.md`;
    }


    /* HELPER FUNCTION | Kick the browser download */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__CompiledPromptExporter__TriggerDownload(filenameValue, markdownBody) {
        const blob         = new Blob([markdownBody], { type: 'text/markdown;charset=utf-8' });
        const objectUrl    = URL.createObjectURL(blob);
        const anchorElement = document.createElement('a');
        anchorElement.href  = objectUrl;
        anchorElement.download = filenameValue;
        document.body.appendChild(anchorElement);
        anchorElement.click();
        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            anchorElement.remove();
        }, 0);
    }


    window.Wv__SharedElements__CompiledPromptExporter = {
        Wv__SharedElements__CompiledPromptExporter__DownloadRender,
        Wv__SharedElements__CompiledPromptExporter__DownloadEdit
    };

})();
