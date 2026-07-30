/* =============================================================================
   VGHLANTERN - BROWSER AUTOFILL GUARD
   =============================================================================

   FILE       : VghLantern__AppUtils__AutofillGuard__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - AutofillGuard
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Disable browser autofill / saved-address heuristics app-wide
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Sets autocomplete and related attributes on input, textarea, and select
   - Runs once on the document tree and watches for dynamically inserted fields
   - Avoids per-screen repetition of the same attributes in innerHTML strings
   - Especially important for the dimension edit inputs injected into the SVG

   ============================================================================= */

// =============================================================================
// REGION | Autofill Guard Module
// =============================================================================

const VghLantern__AppUtils__AutofillGuard = (function() {

    // MODULE CONSTANTS | Input Types Excluded From Autocomplete Tagging
    // ------------------------------------------------------------
    const VGHLANTERN__AUTOFILL_GUARD__SKIP_INPUT_TYPES  =  {                  // <-- Lowercase type → ignore
        hidden   : true,
        button   : true,
        submit   : true,
        reset    : true,
        image    : true
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Observer Singleton
    // ------------------------------------------------------------
    let VghLantern__AutofillGuard__Observer  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether an Input Element Should Receive the Guard
    // ------------------------------------------------------------
    function VghLantern__AutofillGuard__ShouldTagInput(el) {
        if (!el || el.tagName !== 'INPUT') return false;
        var t  =  (el.type || 'text').toLowerCase();                          // <-- Default missing type to text
        return !VGHLANTERN__AUTOFILL_GUARD__SKIP_INPUT_TYPES[t];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Guard Attributes to a Single Form Control
    // ------------------------------------------------------------
    function VghLantern__AutofillGuard__ApplyToElement(el) {
        if (!el || el.nodeType !== 1) return;

        if (el.tagName === 'TEXTAREA') {
            el.setAttribute('autocomplete', 'off');                           // <-- Suppress autofill dropdowns
            el.setAttribute('autocapitalize', 'off');                         // <-- Reduce mobile assist noise
            el.setAttribute('autocorrect', 'off');
            return;
        }

        if (el.tagName === 'SELECT') {
            el.setAttribute('autocomplete', 'off');
            return;
        }

        if (!VghLantern__AutofillGuard__ShouldTagInput(el)) return;

        el.setAttribute('autocomplete', 'off');

        var t  =  (el.type || 'text').toLowerCase();
        if (t === 'text' || t === 'search' || t === 'email' || t === 'tel' || t === 'url' || t === 'password' || t === '') {
            el.setAttribute('autocapitalize', 'off');
            el.setAttribute('autocorrect', 'off');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Guard to an Element and Its Descendant Controls
    // ------------------------------------------------------------
    function VghLantern__AutofillGuard__ApplyToSubtree(rootEl) {
        if (!rootEl || rootEl.nodeType !== 1) return;

        if (rootEl.matches && rootEl.matches('input, textarea, select')) {
            VghLantern__AutofillGuard__ApplyToElement(rootEl);
        }

        var list  =  rootEl.querySelectorAll('input, textarea, select');
        var i;
        for (i = 0; i < list.length; i++) {
            VghLantern__AutofillGuard__ApplyToElement(list[i]);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | MutationObserver Callback - Tag Newly Inserted Controls
    // ------------------------------------------------------------
    function VghLantern__AutofillGuard__OnMutations(mutations) {
        var m, n, node;
        for (m = 0; m < mutations.length; m++) {
            var nodes  =  mutations[m].addedNodes;
            for (n = 0; n < nodes.length; n++) {
                node  =  nodes[n];
                if (node.nodeType === 1) {
                    VghLantern__AutofillGuard__ApplyToSubtree(node);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Install Guard on Document (Initial Pass + Observer)
    // ------------------------------------------------------------
    function VghLantern__AutofillGuard__Install(rootEl) {
        var root  =  rootEl || document.documentElement;
        if (!root) return;

        VghLantern__AutofillGuard__ApplyToSubtree(root);

        if (VghLantern__AutofillGuard__Observer) return;                      // <-- Idempotent: one observer only

        VghLantern__AutofillGuard__Observer  =  new MutationObserver(VghLantern__AutofillGuard__OnMutations);
        VghLantern__AutofillGuard__Observer.observe(root, { childList: true, subtree: true });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__AutofillGuard__Install        : VghLantern__AutofillGuard__Install,
        VghLantern__AutofillGuard__ApplyToSubtree : VghLantern__AutofillGuard__ApplyToSubtree
    };

})();

// endregion ===================================================================

window.VghLantern__AppUtils__AutofillGuard  =  VghLantern__AppUtils__AutofillGuard;

// -----------------------------------------------------------------------------
// Boot | Activate guard before subsequent scripts mutate the DOM
// -----------------------------------------------------------------------------
VghLantern__AppUtils__AutofillGuard.VghLantern__AutofillGuard__Install();
