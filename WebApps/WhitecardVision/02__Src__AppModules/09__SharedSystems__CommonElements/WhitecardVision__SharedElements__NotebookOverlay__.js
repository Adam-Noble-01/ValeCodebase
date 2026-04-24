/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - NOTEBOOK OVERLAY
=============================================================================
 FILE       : WhitecardVision__SharedElements__NotebookOverlay__.js
 NAMESPACE  : Wv
 MODULE     : SharedElements - NotebookOverlay
 PURPOSE    : Full-screen three-pane overlay (reference image | notebook editor |
              prompt templates) that opens via expand button or by clicking into
              any registered compact textarea that has content. Writes back to
              the source textarea on every keystroke so all existing state
              listeners fire unchanged.
============================================================================= */

// =============================================================================
// REGION | Notebook Overlay Module
// =============================================================================

(function () {
    'use strict';


    // MODULE CONSTANTS
    // ------------------------------------------------------------
    const Wv__NotebookOverlay__TargetSelector  = 'textarea.Wv__Ui__Textarea[data-wv-notebook-ref]';
    const Wv__NotebookOverlay__ImagePaneMinPx     = 120;   //<-- minimum image-pane pixel width during drag
    const Wv__NotebookOverlay__EditorPaneMinPx    = 240;   //<-- minimum editor-pane pixel width during drag
    const Wv__NotebookOverlay__TemplatesPaneMinPx = 200;   //<-- minimum templates-pane pixel width during drag
    // ------------------------------------------------------------


    // MODULE STATE
    // ------------------------------------------------------------
    let Wv__NotebookOverlay__SourceTextarea     = null;   //<-- the inline textarea that opened the overlay
    let Wv__NotebookOverlay__HostEl             = null;   //<-- injected overlay root element
    let Wv__NotebookOverlay__NotebookTa         = null;   //<-- the big textarea inside the overlay
    let Wv__NotebookOverlay__ImageEl            = null;   //<-- <img> in the left image pane
    let Wv__NotebookOverlay__ImageLabelEl       = null;   //<-- label text below the image
    let Wv__NotebookOverlay__TitleEl            = null;   //<-- field-name heading in the editor pane
    let Wv__NotebookOverlay__PlaceholderEl      = null;   //<-- shown when no image is available
    let Wv__NotebookOverlay__ImagePaneEl        = null;   //<-- left pane element (width is drag-adjusted)
    let Wv__NotebookOverlay__TemplatesPaneEl   = null;   //<-- right templates pane element (width is drag-adjusted)
    let Wv__NotebookOverlay__CardEl             = null;   //<-- inner card element
    let Wv__NotebookOverlay__KeydownHandler     = null;   //<-- Esc handler; attached/detached with open/close
    let Wv__NotebookOverlay__SuppressFocusOpen  = false;  //<-- prevents reopen when Close() refocuses source
    // ------------------------------------------------------------


    // FUNCTION | Install: inject DOM, attach expand buttons, wire mutation observer
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__Install() {
        Wv__NotebookOverlay__BuildHostDom();

        document.querySelectorAll(Wv__NotebookOverlay__TargetSelector).forEach(Wv__NotebookOverlay__RegisterTextarea);

        const mutationObserver = new MutationObserver((mutationList) => {
            for (const mutationRecord of mutationList) {
                mutationRecord.addedNodes.forEach((addedNode) => {
                    if (!(addedNode instanceof HTMLElement)) return;
                    const newTextareas = addedNode.querySelectorAll
                        ? addedNode.querySelectorAll(Wv__NotebookOverlay__TargetSelector)
                        : [];
                    newTextareas.forEach(Wv__NotebookOverlay__RegisterTextarea);
                    if (addedNode.matches && addedNode.matches(Wv__NotebookOverlay__TargetSelector)) {
                        Wv__NotebookOverlay__RegisterTextarea(addedNode);
                    }
                });
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        if (window.Wv__AppCore__StateManager) {
            window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', () => {
                requestAnimationFrame(() => {
                    document.querySelectorAll(Wv__NotebookOverlay__TargetSelector).forEach(Wv__NotebookOverlay__UpdateContentHint);
                });
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the overlay for the given source textarea
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__Open(sourceTextareaEl) {
        if (!sourceTextareaEl || !Wv__NotebookOverlay__HostEl) return;
        if (!Wv__NotebookOverlay__HostEl.hidden) return;   //<-- already open

        Wv__NotebookOverlay__SourceTextarea = sourceTextareaEl;

        const refResult = Wv__NotebookOverlay__ResolveReferenceImage(sourceTextareaEl);

        if (refResult.isPlaceholder) {
            Wv__NotebookOverlay__ImageEl.src                  = '';
            Wv__NotebookOverlay__ImageEl.style.display        = 'none';
            Wv__NotebookOverlay__PlaceholderEl.style.display  = '';
            Wv__NotebookOverlay__PlaceholderEl.textContent    = refResult.labelText;
        } else {
            Wv__NotebookOverlay__ImageEl.src                  = '/' + refResult.imagePathRel + '?_t=' + Date.now();
            Wv__NotebookOverlay__ImageEl.style.display        = '';
            Wv__NotebookOverlay__PlaceholderEl.style.display  = 'none';
        }
        Wv__NotebookOverlay__ImageLabelEl.textContent = refResult.aspectText;

        const sectionEl = sourceTextareaEl.closest('[class*="Wv__"]');
        const headingEl = sectionEl ? sectionEl.querySelector('h2') : null;
        Wv__NotebookOverlay__TitleEl.textContent = headingEl ? headingEl.textContent : 'Prompt';

        Wv__NotebookOverlay__NotebookTa.value = sourceTextareaEl.value;

        Wv__NotebookOverlay__HostEl.hidden = false;

        requestAnimationFrame(() => {
            Wv__NotebookOverlay__NotebookTa.focus();
            const len = Wv__NotebookOverlay__NotebookTa.value.length;
            Wv__NotebookOverlay__NotebookTa.setSelectionRange(len, len);
        });

        Wv__NotebookOverlay__KeydownHandler = (keyEvent) => {
            if (keyEvent.key === 'Escape') Wv__NotebookOverlay__Close();
        };
        document.addEventListener('keydown', Wv__NotebookOverlay__KeydownHandler);
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the overlay and return focus to the source textarea
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__Close() {
        if (!Wv__NotebookOverlay__HostEl) return;

        Wv__NotebookOverlay__HostEl.hidden = true;

        if (Wv__NotebookOverlay__KeydownHandler) {
            document.removeEventListener('keydown', Wv__NotebookOverlay__KeydownHandler);
            Wv__NotebookOverlay__KeydownHandler = null;
        }

        const source = Wv__NotebookOverlay__SourceTextarea;
        Wv__NotebookOverlay__SourceTextarea = null;

        if (source) {
            Wv__NotebookOverlay__SuppressFocusOpen = true;
            source.focus();
            const len = source.value.length;
            source.setSelectionRange(len, len);
            Wv__NotebookOverlay__UpdateContentHint(source);
            requestAnimationFrame(() => { Wv__NotebookOverlay__SuppressFocusOpen = false; });
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build and inject the overlay DOM once
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__BuildHostDom() {
        const hostEl = document.createElement('div');
        hostEl.id        = 'Wv__NotebookOverlay__Host';
        hostEl.className = 'Wv__NotebookOverlay';
        hostEl.hidden    = true;

        hostEl.innerHTML = `
            <div class="Wv__NotebookOverlay__Card">
                <button type="button" class="Wv__NotebookOverlay__CloseBtn" title="Close (Esc)">&#x2715;</button>
                <div class="Wv__NotebookOverlay__ImagePane">
                    <div class="Wv__NotebookOverlay__ImageWrap">
                        <img class="Wv__NotebookOverlay__Image" src="" alt="Reference" />
                        <div class="Wv__NotebookOverlay__ImagePlaceholder">No reference image</div>
                    </div>
                    <p class="Wv__NotebookOverlay__ImageLabel"></p>
                </div>
                <div class="Wv__NotebookOverlay__Divider" title="Drag to resize"></div>
                <div class="Wv__NotebookOverlay__EditorPane">
                    <h3 class="Wv__NotebookOverlay__Title"></h3>
                    <textarea class="Wv__NotebookOverlay__Textarea"></textarea>
                    <p class="Wv__NotebookOverlay__Hint">Esc to close &nbsp;|&nbsp; Saves as you type</p>
                </div>
                <div class="Wv__NotebookOverlay__Divider" title="Drag to resize"></div>
                <div class="Wv__NotebookOverlay__TemplatesPane"></div>
            </div>
        `;

        document.body.appendChild(hostEl);

        Wv__NotebookOverlay__HostEl        = hostEl;
        Wv__NotebookOverlay__CardEl        = hostEl.querySelector('.Wv__NotebookOverlay__Card');
        Wv__NotebookOverlay__ImagePaneEl   = hostEl.querySelector('.Wv__NotebookOverlay__ImagePane');
        Wv__NotebookOverlay__TemplatesPaneEl = hostEl.querySelector('.Wv__NotebookOverlay__TemplatesPane');
        Wv__NotebookOverlay__ImageEl       = hostEl.querySelector('.Wv__NotebookOverlay__Image');
        Wv__NotebookOverlay__ImageLabelEl  = hostEl.querySelector('.Wv__NotebookOverlay__ImageLabel');
        Wv__NotebookOverlay__TitleEl       = hostEl.querySelector('.Wv__NotebookOverlay__Title');
        Wv__NotebookOverlay__PlaceholderEl = hostEl.querySelector('.Wv__NotebookOverlay__ImagePlaceholder');
        Wv__NotebookOverlay__NotebookTa    = hostEl.querySelector('.Wv__NotebookOverlay__Textarea');

        hostEl.addEventListener('click', (clickEvent) => {
            if (clickEvent.target === hostEl) Wv__NotebookOverlay__Close();
        });

        hostEl.querySelector('.Wv__NotebookOverlay__CloseBtn').addEventListener('click', Wv__NotebookOverlay__Close);

        Wv__NotebookOverlay__NotebookTa.addEventListener('input', () => {
            Wv__NotebookOverlay__MirrorValueToSource(Wv__NotebookOverlay__NotebookTa.value);
        });

        const dividerEls = hostEl.querySelectorAll('.Wv__NotebookOverlay__Divider');
        Wv__NotebookOverlay__InstallDividerDrag(
            dividerEls[0],
            Wv__NotebookOverlay__ImagePaneEl,
            Wv__NotebookOverlay__CardEl
        );
        Wv__NotebookOverlay__InstallTemplatesDividerDrag(
            dividerEls[1],
            Wv__NotebookOverlay__TemplatesPaneEl,
            Wv__NotebookOverlay__CardEl
        );

        Wv__NotebookOverlay__MountTemplatesPanel(hostEl.querySelector('.Wv__NotebookOverlay__TemplatesPane'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mount the shared TemplatesPanel into the overlay's right pane
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__MountTemplatesPanel(containerEl) {
        if (!containerEl || !window.Wv__SharedElements__TemplatesPanel) return;
        window.Wv__SharedElements__TemplatesPanel.Wv__SharedElements__TemplatesPanel__Mount(containerEl, {});
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register one textarea: fix its inline size, attach expand button, wire focus/content-hint
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__RegisterTextarea(textareaEl) {
        if (textareaEl.dataset.wvNotebookRegistered) return;   //<-- idempotent guard
        textareaEl.dataset.wvNotebookRegistered = '1';

        textareaEl.style.height    = '92px';
        textareaEl.style.maxHeight = '160px';
        textareaEl.style.overflowY = 'auto';
        textareaEl.style.resize    = 'none';

        Wv__NotebookOverlay__AttachExpandButton(textareaEl);

        textareaEl.addEventListener('focus', () => {
            if (Wv__NotebookOverlay__SuppressFocusOpen) return;
            if (textareaEl.value.trim().length > 0) {
                Wv__NotebookOverlay__Open(textareaEl);
            }
        });

        textareaEl.addEventListener('input', () => Wv__NotebookOverlay__UpdateContentHint(textareaEl));

        Wv__NotebookOverlay__UpdateContentHint(textareaEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle the has-content visual hint on the wrap element
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__UpdateContentHint(textareaEl) {
        const wrapEl = textareaEl.parentElement;
        if (!wrapEl || !wrapEl.classList.contains('Wv__NotebookOverlay__TextareaWrap')) return;
        wrapEl.classList.toggle('Wv__NotebookOverlay__TextareaWrap--HasContent', textareaEl.value.trim().length > 0);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Inject a wrapped expand button adjacent to a textarea
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__AttachExpandButton(textareaEl) {
        if (textareaEl.parentElement && textareaEl.parentElement.classList.contains('Wv__NotebookOverlay__TextareaWrap')) return;

        const wrapEl = document.createElement('div');
        wrapEl.className = 'Wv__NotebookOverlay__TextareaWrap';

        textareaEl.parentNode.insertBefore(wrapEl, textareaEl);
        wrapEl.appendChild(textareaEl);

        const btnEl = document.createElement('button');
        btnEl.type      = 'button';
        btnEl.className = 'Wv__NotebookOverlay__ExpandBtn';
        btnEl.title     = 'Open notebook editor';
        btnEl.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2h5v5M14 2l-6 6M7 14H2V9M2 14l6-6"/>
        </svg>`;
        btnEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Wv__NotebookOverlay__Open(textareaEl);
        });
        wrapEl.appendChild(btnEl);

        const hintEl = document.createElement('div');
        hintEl.className = 'Wv__NotebookOverlay__InlineHint';
        hintEl.textContent = '↗  Click to expand full prompt';
        hintEl.addEventListener('click', () => Wv__NotebookOverlay__Open(textareaEl));
        wrapEl.appendChild(hintEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire drag-to-resize on the image|editor divider
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__InstallDividerDrag(dividerEl, imagePaneEl, cardEl) {
        if (!dividerEl || !imagePaneEl || !cardEl) return;

        let isDragging = false;
        let dragStartX = 0;
        let paneStartW = 0;

        dividerEl.addEventListener('mousedown', (mousedownEvent) => {
            isDragging = true;
            dragStartX = mousedownEvent.clientX;
            paneStartW = imagePaneEl.getBoundingClientRect().width;
            document.body.style.userSelect = 'none';
            document.body.style.cursor     = 'col-resize';
            mousedownEvent.preventDefault();
        });

        document.addEventListener('mousemove', (mousemoveEvent) => {
            if (!isDragging) return;
            const cardWidth      = cardEl.getBoundingClientRect().width;
            const templatesPaneW = Wv__NotebookOverlay__TemplatesPaneEl
                ? Wv__NotebookOverlay__TemplatesPaneEl.getBoundingClientRect().width
                : 520;
            const delta          = mousemoveEvent.clientX - dragStartX;
            const rawWidth       = paneStartW + delta;
            const clampedW       = Math.max(
                Wv__NotebookOverlay__ImagePaneMinPx,
                Math.min(cardWidth - Wv__NotebookOverlay__EditorPaneMinPx - templatesPaneW - 10, rawWidth)
            );
            imagePaneEl.style.width     = clampedW + 'px';
            imagePaneEl.style.flexBasis = clampedW + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging                     = false;
            document.body.style.userSelect = '';
            document.body.style.cursor     = '';
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire drag-to-resize on the editor|templates divider
    // The templates pane is right of the divider, so delta is inverted:
    // dragging left expands the templates pane, dragging right shrinks it.
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__InstallTemplatesDividerDrag(dividerEl, templatesPaneEl, cardEl) {
        if (!dividerEl || !templatesPaneEl || !cardEl) return;

        let isDragging = false;
        let dragStartX = 0;
        let paneStartW = 0;

        dividerEl.addEventListener('mousedown', (mousedownEvent) => {
            isDragging = true;
            dragStartX = mousedownEvent.clientX;
            paneStartW = templatesPaneEl.getBoundingClientRect().width;
            document.body.style.userSelect = 'none';
            document.body.style.cursor     = 'col-resize';
            mousedownEvent.preventDefault();
        });

        document.addEventListener('mousemove', (mousemoveEvent) => {
            if (!isDragging) return;
            const cardWidth  = cardEl.getBoundingClientRect().width;
            const imagePaneW = Wv__NotebookOverlay__ImagePaneEl
                ? Wv__NotebookOverlay__ImagePaneEl.getBoundingClientRect().width
                : 0;
            const delta      = mousemoveEvent.clientX - dragStartX;
            const rawWidth   = paneStartW - delta;   //<-- inverted: drag left = expand templates
            const clampedW   = Math.max(
                Wv__NotebookOverlay__TemplatesPaneMinPx,
                Math.min(cardWidth - imagePaneW - Wv__NotebookOverlay__EditorPaneMinPx - 10, rawWidth)
            );
            templatesPaneEl.style.width     = clampedW + 'px';
            templatesPaneEl.style.flexBasis = clampedW + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging                     = false;
            document.body.style.userSelect = '';
            document.body.style.cursor     = '';
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the reference image from the state tree
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__ResolveReferenceImage(sourceTextareaEl) {
        const refType     = sourceTextareaEl.getAttribute('data-wv-notebook-ref');
        const projectTree = window.Wv__AppCore__StateManager
            ? window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject()
            : null;

        if (!projectTree) {
            return { isPlaceholder: true, labelText: 'No project loaded', aspectText: '', imagePathRel: '' };
        }

        if (refType === 'whitecard') {
            const whitecardBlock = ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard) || {};
            const imagePath      = whitecardBlock.Wv__Whitecard__ImagePath || '';
            if (!imagePath) {
                return { isPlaceholder: true, labelText: 'No whitecard uploaded', aspectText: '', imagePathRel: '' };
            }
            const widthPx  = whitecardBlock.Wv__Whitecard__WidthPx  || '?';
            const heightPx = whitecardBlock.Wv__Whitecard__HeightPx || '?';
            const aspect   = whitecardBlock.Wv__Whitecard__SnappedAspectRatio || '-';
            return { isPlaceholder: false, imagePathRel: imagePath, labelText: 'Whitecard', aspectText: widthPx + ' x ' + heightPx + '  |  ' + aspect };
        }

        if (refType === 'edit-base') {
            const activeId   = projectTree.Wv__Project__ActiveEditIterationId;
            const iterations = projectTree.Wv__Project__EditIterations || [];
            const activeIter = iterations.find((iter) => iter.Wv__EditIteration__Id === activeId);
            const imagePath  = (activeIter || {}).Wv__EditIteration__BaseImagePath || '';
            if (!imagePath) {
                return { isPlaceholder: true, labelText: 'No base image for this iteration', aspectText: '', imagePathRel: '' };
            }
            const widthPx  = activeIter.Wv__EditIteration__BaseWidthPx  || '?';
            const heightPx = activeIter.Wv__EditIteration__BaseHeightPx || '?';
            const aspect   = activeIter.Wv__EditIteration__SnappedAspectRatio || '-';
            return { isPlaceholder: false, imagePathRel: imagePath, labelText: 'Base Image', aspectText: widthPx + ' x ' + heightPx + '  |  ' + aspect };
        }

        if (refType === 'ref-tile') {
            const tileEl      = sourceTextareaEl.closest('.Wv__Render__RefTile');
            const refId       = tileEl ? (tileEl.dataset.wvRefid || '') : '';
            const renderGroup = projectTree.Wv__Project__RenderGroup || {};
            const allRefs     = [
                ...(renderGroup.Wv__Project__RenderGroup__MaterialReferences || []),
                ...(renderGroup.Wv__Project__RenderGroup__StyleReferences    || [])
            ];
            const refEntry  = allRefs.find((r) => r.Wv__Reference__Id === refId);
            const imagePath = (refEntry || {}).Wv__Reference__ImagePath || '';
            if (!imagePath) {
                return { isPlaceholder: true, labelText: 'No image for this reference', aspectText: '', imagePathRel: '' };
            }
            const label = (refEntry.Wv__Reference__Label || 'Reference').trim();
            return { isPlaceholder: false, imagePathRel: imagePath, labelText: label, aspectText: '' };
        }

        return { isPlaceholder: true, labelText: 'No reference', aspectText: '', imagePathRel: '' };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mirror the notebook value back to the source textarea
    // ------------------------------------------------------------
    function Wv__NotebookOverlay__MirrorValueToSource(newValue) {
        const source = Wv__NotebookOverlay__SourceTextarea;
        if (!source) return;

        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (descriptor && descriptor.set) {
            descriptor.set.call(source, newValue);
        } else {
            source.value = newValue;
        }

        source.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__SharedElements__NotebookOverlay = {
        Wv__NotebookOverlay__Install,
        Wv__NotebookOverlay__Open,
        Wv__NotebookOverlay__Close
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
