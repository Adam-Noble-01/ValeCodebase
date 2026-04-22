/* =============================================================================
 WHITECARDVISION - PROMPT CONSTRUCTOR - LOAD MARKDOWN
=============================================================================
 FILE       : PromptConstructor__LoadMarkdown__.js
 NAMESPACE  : Wv
 MODULE     : PromptConstructor - LoadMarkdown
 PURPOSE    : Fetch front-loaded markdown templates via the Flask
              /api/templates/read endpoint. Caches per session so the same
              file isn't re-read on every Generate click.
              Strips optional `--- key = value ---` front-matter so the
              compiled prompt body stays clean; the parsed metadata is
              still available to the Templates Panel via __GetFrontMatter.
============================================================================= */

(function () {
    'use strict';

    const Wv__PromptConstructor__LoadMarkdown__BodyCache        = new Map();                                                    //<-- relPath -> body string.
    const Wv__PromptConstructor__LoadMarkdown__FrontMatterCache = new Map();                                                    //<-- relPath -> parsed metadata.


    /* FUNCTION | Read a markdown file (returns BODY only, front-matter stripped) */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__LoadMarkdown__ReadTemplate(relativePathToTemplatesRoot) {
        if (Wv__PromptConstructor__LoadMarkdown__BodyCache.has(relativePathToTemplatesRoot)) {
            return Wv__PromptConstructor__LoadMarkdown__BodyCache.get(relativePathToTemplatesRoot);
        }
        const appConfig              = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const templatesReadEndpoint  = (appConfig.Wv__AppConfig__Server || {}).Wv__AppConfig__Server__TemplatesReadEndpoint || '/api/templates/read';
        const encodedRelativePath    = encodeURIComponent(relativePathToTemplatesRoot);
        const response               = await fetch(templatesReadEndpoint + '?relPath=' + encodedRelativePath);
        const payload                = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || ('HTTP ' + response.status));

        const rawMarkdown            = payload.data.markdown || '';
        const parsedResult           = Wv__PromptConstructor__LoadMarkdown__ParseFrontMatter(rawMarkdown);

        Wv__PromptConstructor__LoadMarkdown__BodyCache.set(relativePathToTemplatesRoot, parsedResult.body);
        Wv__PromptConstructor__LoadMarkdown__FrontMatterCache.set(relativePathToTemplatesRoot, parsedResult.frontMatter);
        return parsedResult.body;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Split `--- key = value ---` sentinels from the body */
    /* ------------------------------------------------------------ */
    function Wv__PromptConstructor__LoadMarkdown__ParseFrontMatter(rawMarkdown) {
        const normalisedInput = (rawMarkdown || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');                              //<-- strip BOM + normalise line endings.
        const frontMatterPattern = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
        const matchResult        = normalisedInput.match(frontMatterPattern);
        if (!matchResult) {
            return { frontMatter: {}, body: normalisedInput };
        }
        const frontMatterDict = {};
        const rawBlock        = matchResult[1];
        rawBlock.split('\n').forEach(lineRaw => {
            const lineTrimmed = lineRaw.trim();
            if (!lineTrimmed || lineTrimmed.startsWith('#')) return;
            const delimiterIndex = lineTrimmed.indexOf('=');
            if (delimiterIndex < 0) return;
            const keyText   = lineTrimmed.slice(0, delimiterIndex).trim();
            const valueText = lineTrimmed.slice(delimiterIndex + 1).trim();
            if (keyText) frontMatterDict[keyText] = valueText;
        });
        return { frontMatter: frontMatterDict, body: normalisedInput.slice(matchResult[0].length) };
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Lookup cached front-matter for a given relPath (may be empty) */
    /* ------------------------------------------------------------ */
    function Wv__PromptConstructor__LoadMarkdown__GetFrontMatter(relativePathToTemplatesRoot) {
        return Wv__PromptConstructor__LoadMarkdown__FrontMatterCache.get(relativePathToTemplatesRoot) || {};
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Resolve a config-key path (e.g. "...FrontLoader__Whitecard") */
    /* ------------------------------------------------------------ */
    async function Wv__PromptConstructor__LoadMarkdown__ByConfigKey(fullConfigKey) {
        const appConfig              = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const promptConstructorBlock = appConfig.Wv__AppConfig__PromptConstructor || {};
        const fullRelativePath       = promptConstructorBlock[fullConfigKey];
        if (!fullRelativePath) throw new Error('Unknown template config key: ' + fullConfigKey);

        const templatesRootRelPath   = promptConstructorBlock.Wv__AppConfig__PromptConstructor__TemplatesRootRelPath || '10__Local__PromptTemplates';
        const rootPrefix             = templatesRootRelPath.endsWith('/') ? templatesRootRelPath : (templatesRootRelPath + '/');
        const relativeToTemplatesRoot = fullRelativePath.startsWith(rootPrefix)
            ? fullRelativePath.slice(rootPrefix.length)
            : fullRelativePath;
        return await Wv__PromptConstructor__LoadMarkdown__ReadTemplate(relativeToTemplatesRoot);
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Substitute {{Wv__ImageNumber}} / {{Wv__ImageLabel}} tokens */
    /* ------------------------------------------------------------ */
    function Wv__PromptConstructor__LoadMarkdown__ReplaceTokens(templateString, tokenMap) {
        const appConfig              = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const promptConstructorBlock = appConfig.Wv__AppConfig__PromptConstructor || {};
        const imageNumberToken       = promptConstructorBlock.Wv__AppConfig__PromptConstructor__TokenImageNumber || '{{Wv__ImageNumber}}';
        const imageLabelToken        = promptConstructorBlock.Wv__AppConfig__PromptConstructor__TokenImageLabel  || '{{Wv__ImageLabel}}';

        let resultString = templateString;
        if (Object.prototype.hasOwnProperty.call(tokenMap, 'imageNumber')) {
            resultString = resultString.split(imageNumberToken).join(String(tokenMap.imageNumber));
        }
        if (Object.prototype.hasOwnProperty.call(tokenMap, 'imageLabel')) {
            resultString = resultString.split(imageLabelToken).join(String(tokenMap.imageLabel));
        }
        return resultString;
    }
    /* ------------------------------------------------------------ */


    window.Wv__PromptConstructor__LoadMarkdown = {
        Wv__PromptConstructor__LoadMarkdown__ReadTemplate,
        Wv__PromptConstructor__LoadMarkdown__ByConfigKey,
        Wv__PromptConstructor__LoadMarkdown__ReplaceTokens,
        Wv__PromptConstructor__LoadMarkdown__ParseFrontMatter,
        Wv__PromptConstructor__LoadMarkdown__GetFrontMatter
    };

})();
