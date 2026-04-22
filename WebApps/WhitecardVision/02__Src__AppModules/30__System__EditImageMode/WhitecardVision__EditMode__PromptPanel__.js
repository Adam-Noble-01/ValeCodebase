/* =============================================================================
 WHITECARDVISION - EDIT MODE - PROMPT PANEL
=============================================================================
 FILE       : WhitecardVision__EditMode__PromptPanel__.js
 NAMESPACE  : Wv
 MODULE     : System — Edit — PromptPanel
 PURPOSE    : Binds the Target / Preserve / Avoid textareas to the active
              iteration.
============================================================================= */

// =============================================================================
// REGION | Edit Mode Prompt Panel Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Wire textareas to the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__PromptPanel__Install() {
        const targetTextareaEl    = document.getElementById('Wv__Edit__TargetElement__Input');
        const preserveTextareaEl  = document.getElementById('Wv__Edit__Preserve__Input');
        const avoidTextareaEl     = document.getElementById('Wv__Edit__Avoid__Input');

        targetTextareaEl.addEventListener('input',    () => Wv__EditMode__PromptPanel__SyncToActive('Wv__EditIteration__TargetPrompt',   targetTextareaEl.value));
        preserveTextareaEl.addEventListener('input',  () => Wv__EditMode__PromptPanel__SyncToActive('Wv__EditIteration__PreservePrompt', preserveTextareaEl.value));
        avoidTextareaEl.addEventListener('input',     () => Wv__EditMode__PromptPanel__SyncToActive('Wv__EditIteration__AvoidNotes',     avoidTextareaEl.value));

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__EditMode__PromptPanel__RefreshFromState);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a field into the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__PromptPanel__SyncToActive(fieldKey, newValue) {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            entry => entry.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) return;
        activeIteration[fieldKey] = newValue;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh textareas from the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__PromptPanel__RefreshFromState(projectTree) {
        const targetTextareaEl   = document.getElementById('Wv__Edit__TargetElement__Input');
        const preserveTextareaEl = document.getElementById('Wv__Edit__Preserve__Input');
        const avoidTextareaEl    = document.getElementById('Wv__Edit__Avoid__Input');
        if (!projectTree) { targetTextareaEl.value = ''; preserveTextareaEl.value = ''; avoidTextareaEl.value = ''; return; }
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            entry => entry.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) { targetTextareaEl.value = ''; preserveTextareaEl.value = ''; avoidTextareaEl.value = ''; return; }
        targetTextareaEl.value    = activeIteration.Wv__EditIteration__TargetPrompt   || '';
        preserveTextareaEl.value  = activeIteration.Wv__EditIteration__PreservePrompt || '';
        avoidTextareaEl.value     = activeIteration.Wv__EditIteration__AvoidNotes     || '';
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__EditMode__PromptPanel = { Wv__EditMode__PromptPanel__Install };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
