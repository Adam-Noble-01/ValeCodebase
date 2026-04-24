/* =============================================================================
 WHITECARDVISION - AUTO-RESIZE TEXTAREAS
=============================================================================
 FILE       : WhitecardVision__AppUtils__AutoResize__.js
 NAMESPACE  : Wv
 MODULE     : AppUtils - AutoResize
 PURPOSE    : Auto-grow and auto-shrink any textarea carrying the
              .Wv__Ui__Textarea class. Keeps the CSS min-height as the
              floor, and adds one extra line of breathing room above the
              current content height so the next keystroke never has to
              trigger a further resize.
============================================================================= */

// =============================================================================
// REGION | AutoResize Module
// =============================================================================

(function () {
    'use strict';

    const Wv__AutoResize__TargetSelector = 'textarea.Wv__Ui__Textarea';
    const Wv__AutoResize__ExtraLinePx    = 20;   //<-- ~one line-height of padding above current content


    // FUNCTION | Resize a single textarea to fit its content
    // ------------------------------------------------------------
    function Wv__AutoResize__ResizeOne(textareaElement) {
        if (!textareaElement || textareaElement.tagName !== 'TEXTAREA') return;
        if (!textareaElement.classList.contains('Wv__Ui__Textarea'))    return;

        if (textareaElement.hasAttribute('data-wv-notebook-ref')) return;   //<-- notebook textareas have a fixed inline size set by NotebookOverlay__Install()

        textareaElement.style.overflowY = 'hidden';
        textareaElement.style.resize    = 'none';

        textareaElement.style.height = 'auto';

        const computedStyle       = window.getComputedStyle(textareaElement);
        const cssMinHeightPx      = parseFloat(computedStyle.minHeight) || 0;
        const measuredContentPx   = textareaElement.scrollHeight;

        const hasOverflow         = measuredContentPx > cssMinHeightPx;
        const nextHeightPx        = hasOverflow
            ? (measuredContentPx + Wv__AutoResize__ExtraLinePx)
            : cssMinHeightPx;

        textareaElement.style.height = nextHeightPx + 'px';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resize every matching textarea in the document
    // ------------------------------------------------------------
    function Wv__AutoResize__ResizeAll() {
        const textareaList = document.querySelectorAll(Wv__AutoResize__TargetSelector);
        textareaList.forEach(Wv__AutoResize__ResizeOne);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Patch the value setter so programmatic writes also resize
    // ------------------------------------------------------------
    function Wv__AutoResize__PatchValueSetter() {
        const nativeDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (!nativeDescriptor || !nativeDescriptor.set || nativeDescriptor.__Wv__AutoResize__Patched) return;

        const nativeValueSetter = nativeDescriptor.set;
        const nativeValueGetter = nativeDescriptor.get;

        const patchedDescriptor = {
            configurable : true,
            enumerable   : nativeDescriptor.enumerable,
            get          : function () { return nativeValueGetter.call(this); },
            set          : function (newValue) {
                nativeValueSetter.call(this, newValue);
                if (this.classList && this.classList.contains('Wv__Ui__Textarea')) {
                    requestAnimationFrame(() => Wv__AutoResize__ResizeOne(this));
                }
            }
        };
        patchedDescriptor.__Wv__AutoResize__Patched = true;
        Object.defineProperty(HTMLTextAreaElement.prototype, 'value', patchedDescriptor);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Observe DOM so newly injected textareas also auto-size
    // ------------------------------------------------------------
    function Wv__AutoResize__InstallMutationObserver() {
        const mutationObserver = new MutationObserver((mutationList) => {
            for (const mutationRecord of mutationList) {
                mutationRecord.addedNodes.forEach((addedNode) => {
                    if (!(addedNode instanceof HTMLElement)) return;
                    if (addedNode.matches && addedNode.matches(Wv__AutoResize__TargetSelector)) {
                        requestAnimationFrame(() => Wv__AutoResize__ResizeOne(addedNode));
                    }
                    const descendantList = addedNode.querySelectorAll
                        ? addedNode.querySelectorAll(Wv__AutoResize__TargetSelector)
                        : [];
                    descendantList.forEach((textareaEl) => {
                        requestAnimationFrame(() => Wv__AutoResize__ResizeOne(textareaEl));
                    });
                });
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
    // ------------------------------------------------------------


    // FUNCTION | Install global listeners + initial pass
    // ------------------------------------------------------------
    function Wv__AutoResize__Install() {
        Wv__AutoResize__PatchValueSetter();

        document.addEventListener('input', (inputEvent) => {
            const eventTarget = inputEvent.target;
            if (eventTarget && eventTarget.tagName === 'TEXTAREA' &&
                eventTarget.classList.contains('Wv__Ui__Textarea')) {
                Wv__AutoResize__ResizeOne(eventTarget);
            }
        });

        window.addEventListener('resize', Wv__AutoResize__ResizeAll);

        Wv__AutoResize__InstallMutationObserver();
        Wv__AutoResize__ResizeAll();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppUtils__AutoResize = {
        Wv__AutoResize__Install,
        Wv__AutoResize__ResizeOne,
        Wv__AutoResize__ResizeAll
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
