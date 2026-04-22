/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - TEMPLATES PANEL
=============================================================================
 FILE       : WhitecardVision__SharedElements__TemplatesPanel__.js
 NAMESPACE  : Wv
 MODULE     : SharedElements - TemplatesPanel
 PURPOSE    : Collapsible right-docked sidebar that renders the markdown prompt-
              template tree using native <details> folders (all collapsed by
              default). Each file row shows ONLY the PromptTitle and PromptSummary
              pulled from the markdown front matter. Filename is never displayed -
              if front matter is missing from the server tree response we lazy-
              fetch the body and re-render the row once parsed. A search bar
              flattens results into a list and bypasses folder collapse.
============================================================================= */

// =============================================================================
// REGION | Templates Panel Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Mount the panel into a host element
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__Mount(hostElement, mountOptions) {
        if (!hostElement) return;
        const onInsertFn = (mountOptions && mountOptions.onInsert) || Wv__SharedElements__TemplatesPanel__DefaultInsert;

        hostElement.classList.add('Wv__TemplatesPanel');
        hostElement.innerHTML = `
            <div class="Wv__TemplatesPanel__Header">
                <button type="button" class="Wv__TemplatesPanel__ToggleBtn" aria-label="Toggle templates panel" title="Toggle templates panel" data-wv-role="toggle">
                    <span class="Wv__TemplatesPanel__Hamburger"></span>
                    <span class="Wv__TemplatesPanel__Hamburger"></span>
                    <span class="Wv__TemplatesPanel__Hamburger"></span>
                </button>
                <h2 class="Wv__Ui__H2 Wv__TemplatesPanel__Title">Prompt Templates</h2>
            </div>
            <div class="Wv__TemplatesPanel__Body">
                <div class="Wv__TemplatesPanel__SearchWrap">
                    <input type="search" class="Wv__Ui__Input Wv__TemplatesPanel__SearchInput"
                           placeholder="Search by title, summary, flag..." data-wv-role="search" />
                </div>
                <div class="Wv__TemplatesPanel__Tree" data-wv-role="tree">
                    <span class="Wv__Ui__Hint">Loading templates...</span>
                </div>
                <p class="Wv__Ui__Hint Wv__TemplatesPanel__Hint">Click a template to insert at the cursor of the last focused prompt field.</p>
            </div>
        `;

        const toggleButtonEl = hostElement.querySelector('[data-wv-role="toggle"]');
        toggleButtonEl.addEventListener('click', () => hostElement.classList.toggle('Wv__TemplatesPanel--Collapsed'));

        const searchInputEl  = hostElement.querySelector('[data-wv-role="search"]');
        searchInputEl.addEventListener('input', () => Wv__SharedElements__TemplatesPanel__ApplyFilter(hostElement, searchInputEl.value));

        Wv__SharedElements__TemplatesPanel__LoadTree(hostElement, onInsertFn);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch tree JSON and render it
    // ------------------------------------------------------------
    async function Wv__SharedElements__TemplatesPanel__LoadTree(hostElement, onInsertFn) {
        const treeHostEl = hostElement.querySelector('[data-wv-role="tree"]');
        try {
            const appConfig              = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
            const templatesTreeEndpoint  = (appConfig.Wv__AppConfig__Server || {}).Wv__AppConfig__Server__TemplatesTreeEndpoint || '/api/templates/tree';
            const response               = await fetch(templatesTreeEndpoint + '?_t=' + Date.now());
            const payload                = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.error || ('HTTP ' + response.status));

            treeHostEl.innerHTML = '';
            Wv__SharedElements__TemplatesPanel__RenderNode(treeHostEl, payload.data, 0, onInsertFn);
        } catch (loadError) {
            treeHostEl.innerHTML = `<span class="Wv__Ui__Hint">Could not load templates: ${loadError.message}</span>`;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively render folders and files using native <details>
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__RenderNode(parentContainerEl, nodeObject, depthLevel, onInsertFn) {
        if (!nodeObject) return;
        const children = nodeObject.children || [];
        for (const childEntry of children) {
            if (childEntry.type === 'folder') {
                const folderBranchEl         = document.createElement('details');
                folderBranchEl.className     = 'Wv__TemplatesPanel__FolderBranch';                                            //<-- Default closed (no `open` attribute).
                folderBranchEl.dataset.wvFolderName = (childEntry.name || '').toLowerCase();

                const summaryEl              = document.createElement('summary');
                summaryEl.textContent        = Wv__SharedElements__TemplatesPanel__FormatFolderDisplayName(childEntry.name);
                folderBranchEl.appendChild(summaryEl);

                const childrenWrapperEl      = document.createElement('div');
                childrenWrapperEl.className  = 'Wv__TemplatesPanel__FolderChildren';
                folderBranchEl.appendChild(childrenWrapperEl);

                parentContainerEl.appendChild(folderBranchEl);
                Wv__SharedElements__TemplatesPanel__RenderNode(childrenWrapperEl, childEntry, depthLevel + 1, onInsertFn);
            } else {
                parentContainerEl.appendChild(Wv__SharedElements__TemplatesPanel__BuildFileEntry(childEntry, onInsertFn));
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a single tree row for a markdown file
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__FormatFolderDisplayName(rawFolderNameText) {
        const pathSegmentList = String(rawFolderNameText || '').split('__').filter(Boolean);
        const displaySegmentList = [];
        for (const pathSegment of pathSegmentList) {
            if (/^\d+$/.test(pathSegment)) continue;                                                                         //<-- Ordering prefixes are hidden from display.
            const spacedSegment = pathSegment
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
            if (spacedSegment.trim()) {
                displaySegmentList.push(spacedSegment.trim());
            }
        }
        return displaySegmentList.join(' - ') || String(rawFolderNameText || '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a single tree row for a markdown file
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__BuildFileEntry(fileDescriptor, onInsertFn) {
        const fileElement                = document.createElement('div');
        fileElement.className            = 'Wv__TemplatesPanel__File';
        fileElement.title                = fileDescriptor.relPath;
        fileElement.dataset.wvRelPath    = fileDescriptor.relPath;
        fileElement.addEventListener('click', () => onInsertFn(fileDescriptor.relPath));

        const hasServerFrontMatter       = fileDescriptor.frontMatter && (fileDescriptor.frontMatter.PromptTitle || fileDescriptor.frontMatter.PromptSummary);
        Wv__SharedElements__TemplatesPanel__PaintFileEntry(fileElement, fileDescriptor.frontMatter || {});

        if (!hasServerFrontMatter) {
            Wv__SharedElements__TemplatesPanel__HydrateFrontMatter(fileElement, fileDescriptor.relPath);                      //<-- Lazy-fetch body so titles appear without a Flask restart.
        }
        return fileElement;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Paint (or repaint) a file row using front matter fields
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__PaintFileEntry(fileElement, frontMatterObject) {
        const titleText            = (frontMatterObject.PromptTitle || frontMatterObject.PromptTile || '').trim(); // typo tolerance: PromptTile
        const summaryText          = (frontMatterObject.PromptSummary || '').trim();
        const flagsText            = (frontMatterObject.PromptFlags || '').trim();
        const dateText             = (frontMatterObject.DateCreated || '').trim();

        const titleHtml            = titleText   ? Wv__SharedElements__TemplatesPanel__EscapeHtml(titleText)   : '<em class="Wv__TemplatesPanel__File__Placeholder">Missing PromptTitle</em>';
        const summaryHtml          = summaryText ? Wv__SharedElements__TemplatesPanel__EscapeHtml(summaryText) : '';

        fileElement.dataset.wvSearchBlob = (titleText + ' || ' + summaryText + ' || ' + flagsText).toLowerCase();
        fileElement.innerHTML      = `
            <div class="Wv__TemplatesPanel__File__Title">${titleHtml}</div>
            ${summaryHtml ? `<div class="Wv__TemplatesPanel__File__Summary">${summaryHtml}</div>` : ''}
            ${(flagsText || dateText) ? `
            <div class="Wv__TemplatesPanel__File__Meta">
                ${flagsText ? `<span class="Wv__TemplatesPanel__File__Flags">${Wv__SharedElements__TemplatesPanel__EscapeHtml(flagsText)}</span>` : ''}
                ${dateText  ? `<span class="Wv__TemplatesPanel__File__Date">${Wv__SharedElements__TemplatesPanel__EscapeHtml(dateText)}</span>`   : ''}
            </div>` : ''}
        `;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-fetch the markdown body so the loader parses front matter, then repaint
    // ------------------------------------------------------------
    async function Wv__SharedElements__TemplatesPanel__HydrateFrontMatter(fileElement, relativePathValue) {
        try {
            const loader = window.Wv__PromptConstructor__LoadMarkdown;
            if (!loader || !loader.Wv__PromptConstructor__LoadMarkdown__ReadTemplate) return;

            await loader.Wv__PromptConstructor__LoadMarkdown__ReadTemplate(relativePathValue);                                 //<-- Populates the front-matter cache as a side effect.
            const frontMatterObject = (loader.Wv__PromptConstructor__LoadMarkdown__GetFrontMatter
                ? loader.Wv__PromptConstructor__LoadMarkdown__GetFrontMatter(relativePathValue)
                : {}) || {};
            Wv__SharedElements__TemplatesPanel__PaintFileEntry(fileElement, frontMatterObject);
        } catch (_err) { /* row keeps placeholder label */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape untrusted strings for safe innerHTML use
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__EscapeHtml(rawString) {
        return String(rawString)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Filter tree rows by the search query
    // ------------------------------------------------------------
    function Wv__SharedElements__TemplatesPanel__ApplyFilter(hostElement, rawQuery) {
        const trimmedQuery        = (rawQuery || '').trim().toLowerCase();
        const fileElements        = hostElement.querySelectorAll('.Wv__TemplatesPanel__File');
        const folderBranchElements = hostElement.querySelectorAll('.Wv__TemplatesPanel__FolderBranch');

        if (!trimmedQuery) {
            // No query: restore native tree behaviour - all files visible, folders collapsed by default.
            fileElements.forEach(el => el.style.display = '');
            folderBranchElements.forEach(detailsEl => {
                detailsEl.style.display = '';
                detailsEl.open = false;                                                                                        //<-- Force-close all folders again.
            });
            return;
        }

        // Active query: show matching files, hide the rest, force-open every folder that has a match.
        fileElements.forEach(fileEl => {
            const matches = (fileEl.dataset.wvSearchBlob || '').includes(trimmedQuery);
            fileEl.style.display = matches ? '' : 'none';
        });

        folderBranchElements.forEach(detailsEl => {
            const visibleFiles = detailsEl.querySelectorAll('.Wv__TemplatesPanel__File:not([style*="display: none"])');
            if (visibleFiles.length > 0) {
                detailsEl.style.display = '';
                detailsEl.open = true;
            } else {
                detailsEl.style.display = 'none';
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Default insert action (clipboard + caret insert)
    // ------------------------------------------------------------
    async function Wv__SharedElements__TemplatesPanel__DefaultInsert(relativePathValue) {
        try {
            const markdownBody = await window.Wv__PromptConstructor__LoadMarkdown.Wv__PromptConstructor__LoadMarkdown__ReadTemplate(relativePathValue);
            await window.Wv__AppUtils__Clipboard.Wv__Clipboard__CopyAndInsertAtCursor(markdownBody);
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Template inserted.', 'success', 1600);
        } catch (insertError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Template error: ' + insertError.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__SharedElements__TemplatesPanel = { Wv__SharedElements__TemplatesPanel__Mount };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
