/* =============================================================================
   VALESPEC - BROWSER AUTOFILL GUARD
   =============================================================================

   FILE       : ValeSpec__AppUtils__AutofillGuard__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppUtils - AutofillGuard
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Disable browser autofill / saved-address heuristics app-wide
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Sets autocomplete and related attributes on input, textarea, and select
   - Runs once on the document tree and watches for dynamically inserted fields
   - Avoids per-screen repetition of the same attributes in innerHTML strings

   ============================================================================= */

// =============================================================================
// REGION | Autofill Guard Module
// =============================================================================

const ValeSpec__AppUtils__AutofillGuard = (function() {

    // MODULE CONSTANTS | Input Types Excluded From Autocomplete Tagging
    // ------------------------------------------------------------
    const VALESPEC__AUTOFILL_GUARD__SKIP_INPUT_TYPES  =  {                    // <-- Lowercase type → ignore
        hidden   : true,
        button   : true,
        submit   : true,
        reset    : true,
        image    : true
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether an Input Element Should Receive the Guard
    // ------------------------------------------------------------
    function ValeSpec__AutofillGuard__ShouldTagInput(el) {
        if (!el || el.tagName !== 'INPUT') return false;
        var t  =  (el.type || 'text').toLowerCase();                           // <-- Default missing type to text
        return !VALESPEC__AUTOFILL_GUARD__SKIP_INPUT_TYPES[t];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Guard Attributes to a Single Form Control
    // ------------------------------------------------------------
    function ValeSpec__AutofillGuard__ApplyToElement(el) {
        if (!el || el.nodeType !== 1) return;

        if (el.tagName === 'TEXTAREA') {
            el.setAttribute('autocomplete', 'off');                           // <-- Suppress autofill dropdowns
            el.setAttribute('autocapitalize', 'off');                       // <-- Reduce mobile assist noise
            el.setAttribute('autocorrect', 'off');
            return;
        }

        if (el.tagName === 'SELECT') {
            el.setAttribute('autocomplete', 'off');
            return;
        }

        if (!ValeSpec__AutofillGuard__ShouldTagInput(el)) return;

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
    function ValeSpec__AutofillGuard__ApplyToSubtree(rootEl) {
        if (!rootEl || rootEl.nodeType !== 1) return;

        if (rootEl.matches && rootEl.matches('input, textarea, select')) {
            ValeSpec__AutofillGuard__ApplyToElement(rootEl);
        }

        var list  =  rootEl.querySelectorAll('input, textarea, select');
        var i;
        for (i = 0; i < list.length; i++) {
            ValeSpec__AutofillGuard__ApplyToElement(list[i]);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | MutationObserver Callback — Tag Newly Inserted Controls
    // ------------------------------------------------------------
    function ValeSpec__AutofillGuard__OnMutations(mutations) {
        var m, n, node;
        for (m = 0; m < mutations.length; m++) {
            var nodes  =  mutations[m].addedNodes;
            for (n = 0; n < nodes.length; n++) {
                node  =  nodes[n];
                if (node.nodeType === 1) {
                    ValeSpec__AutofillGuard__ApplyToSubtree(node);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // MODULE VARIABLES | Observer Singleton
    // ------------------------------------------------------------
    var ValeSpec__AutofillGuard__Observer  =  null;
    // ------------------------------------------------------------


    // FUNCTION | Install Guard on Document (Initial Pass + Observer)
    // ------------------------------------------------------------
    function ValeSpec__AutofillGuard__Install(rootEl) {
        var root  =  rootEl || document.documentElement;
        if (!root) return;

        ValeSpec__AutofillGuard__ApplyToSubtree(root);

        if (ValeSpec__AutofillGuard__Observer) return;                       // <-- Idempotent: one observer only

        ValeSpec__AutofillGuard__Observer  =  new MutationObserver(ValeSpec__AutofillGuard__OnMutations);
        ValeSpec__AutofillGuard__Observer.observe(root, { childList: true, subtree: true });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__AutofillGuard__Install       : ValeSpec__AutofillGuard__Install,
        ValeSpec__AutofillGuard__ApplyToSubtree : ValeSpec__AutofillGuard__ApplyToSubtree
    };

})();

// endregion ===================================================================

window.ValeSpec__AppUtils__AutofillGuard  =  ValeSpec__AppUtils__AutofillGuard;

// -----------------------------------------------------------------------------
// Boot | Activate guard before subsequent scripts mutate the DOM
// -----------------------------------------------------------------------------
ValeSpec__AppUtils__AutofillGuard.ValeSpec__AutofillGuard__Install();
