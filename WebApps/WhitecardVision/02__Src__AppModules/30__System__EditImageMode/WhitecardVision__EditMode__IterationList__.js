/* =============================================================================
 WHITECARDVISION - EDIT MODE - ITERATION LIST
=============================================================================
 FILE       : WhitecardVision__EditMode__IterationList__.js
 NAMESPACE  : Wv
 MODULE     : System — Edit — IterationList
 PURPOSE    : New / Duplicate / Delete / Select iteration. Persists into
              Wv__Project__EditIterations[] without overwriting prior entries.
============================================================================= */

// =============================================================================
// REGION | Edit Mode Iteration List Module
// =============================================================================

(function () {
    'use strict';

// -----------------------------------------------------------------------------
// REGION | Module Private State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Rerender cache and one-time list delegates
    // ------------------------------------------------------------
    let Wv__EditMode__IterationList__LastIterationSignature = '';
    let Wv__EditMode__IterationList__DelegatesInstalled     = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Install and List Event Delegation
// -----------------------------------------------------------------------------

    // FUNCTION | Install list + button handlers
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__Install() {
        const hostElement = document.getElementById('Wv__Edit__IterationList__Items');

        document.getElementById('Wv__Edit__IterationList__NewBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleNew);
        document.getElementById('Wv__Edit__IterationList__DuplicateBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleDuplicate);
        document.getElementById('Wv__Edit__IterationList__DeleteBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleDelete);
        document.getElementById('Wv__Edit__IterationList__SaveBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleSave);

        if (!Wv__EditMode__IterationList__DelegatesInstalled) {
            Wv__EditMode__IterationList__DelegatesInstalled = true;

            hostElement.addEventListener('click', (clickEvent) => {
                if (clickEvent.target.closest('.Wv__Edit__IterationList__Item__RenameInput')) return;
                if (hostElement.querySelector('.Wv__Edit__IterationList__Item__RenameInput')) return;

                const cardElement = clickEvent.target.closest('[data-iteration-id]');
                if (!cardElement) return;

                const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                if (!projectTree) return;
                const targetIterationId = cardElement.dataset.iterationId || '';
                if (!targetIterationId) return;
                if (projectTree.Wv__Project__ActiveEditIterationId === targetIterationId) return;

                projectTree.Wv__Project__ActiveEditIterationId = targetIterationId;
                window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
                window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
            });

            hostElement.addEventListener('dblclick', (doubleClickEvent) => {
                const titleElement = doubleClickEvent.target.closest('.Wv__Edit__IterationList__Item__Title');
                if (!titleElement) return;

                const cardElement = titleElement.closest('[data-iteration-id]');
                if (!cardElement) return;

                const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                if (!projectTree) return;

                const iterationEntry = (projectTree.Wv__Project__EditIterations || []).find(
                    entry => entry.Wv__EditIteration__Id === cardElement.dataset.iterationId
                );
                if (!iterationEntry) return;

                Wv__EditMode__IterationList__BeginRename(titleElement, iterationEntry, projectTree);
            });
        }

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__EditMode__IterationList__Rerender);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | List Rerender
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Rerender the list from active project
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__Rerender(projectTree, forceRerender) {
        const hostElement = document.getElementById('Wv__Edit__IterationList__Items');
        if (!hostElement) return;

        if (!projectTree) {
            hostElement.innerHTML = '';
            Wv__EditMode__IterationList__LastIterationSignature = '';
            return;
        }

        if (!forceRerender && hostElement.querySelector('.Wv__Edit__IterationList__Item__RenameInput')) return;

        const iterationsArray = projectTree.Wv__Project__EditIterations || [];
        const activeIdValue   = projectTree.Wv__Project__ActiveEditIterationId || '';
        const signaturePartsArray = iterationsArray.map((iterationEntry) => {
            return [
                iterationEntry.Wv__EditIteration__Id || '',
                iterationEntry.Wv__EditIteration__Label || '',
                iterationEntry.Wv__EditIteration__Version || '',
                Wv__EditMode__IterationList__ResolveCardThumbSrc(iterationEntry)
            ].join('|');
        });
        const nextSignature = signaturePartsArray.join('\n');

        if (!forceRerender && nextSignature === Wv__EditMode__IterationList__LastIterationSignature) {
            hostElement.querySelectorAll('[data-iteration-id]').forEach((cardElement) => {
                cardElement.classList.toggle(
                    'Wv__Edit__IterationList__Item--Active',
                    cardElement.dataset.iterationId === activeIdValue
                );
            });
            return;
        }

        Wv__EditMode__IterationList__LastIterationSignature = nextSignature;
        hostElement.innerHTML = '';

        for (const iterationEntry of iterationsArray) {
            const rowElement = Wv__EditMode__IterationList__BuildCard(iterationEntry, activeIdValue);
            hostElement.appendChild(rowElement);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Card Presentation (Thumb + Row DOM)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve card thumb path with fallback precedence
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__ResolveCardThumbSrc(iterationEntry) {
        return iterationEntry.Wv__EditIteration__LastOutputThumbPath
            || iterationEntry.Wv__EditIteration__LastOutputPath
            || iterationEntry.Wv__EditIteration__BaseImageThumbPath
            || iterationEntry.Wv__EditIteration__BaseImagePath
            || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build one card row DOM element
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__BuildCard(iterationEntry, activeIdValue) {
        const rowElement = document.createElement('div');
        rowElement.className = 'Wv__Edit__IterationList__Item' + (iterationEntry.Wv__EditIteration__Id === activeIdValue ? ' Wv__Edit__IterationList__Item--Active' : '');
        rowElement.dataset.iterationId = iterationEntry.Wv__EditIteration__Id || '';

        const thumbElement = document.createElement('div');
        thumbElement.className = 'Wv__Edit__IterationList__Item__Thumb';
        const thumbSrc = Wv__EditMode__IterationList__ResolveCardThumbSrc(iterationEntry);
        if (thumbSrc) {
            const thumbImg = document.createElement('img');
            thumbImg.src = '/' + thumbSrc + '?_t=' + Date.now();
            thumbImg.alt = '';
            thumbImg.onerror = function () {
                thumbElement.innerHTML = '<span class="Wv__Edit__IterationList__Item__Thumb__Empty">?</span>';
            };
            thumbElement.appendChild(thumbImg);
        } else {
            const emptySpan = document.createElement('span');
            emptySpan.className = 'Wv__Edit__IterationList__Item__Thumb__Empty';
            emptySpan.textContent = '🖼';
            thumbElement.appendChild(emptySpan);
        }

        const bodyElement = document.createElement('div');
        bodyElement.className = 'Wv__Edit__IterationList__Item__Body';

        const titleElement = document.createElement('div');
        titleElement.className = 'Wv__Edit__IterationList__Item__Title';
        titleElement.textContent = iterationEntry.Wv__EditIteration__Label || 'Iteration';
        titleElement.title = 'Double-click to rename';

        const versionElement = document.createElement('div');
        versionElement.className = 'Wv__Edit__IterationList__Item__Meta';
        versionElement.textContent = iterationEntry.Wv__EditIteration__Version || 'Version-??';

        bodyElement.appendChild(titleElement);
        bodyElement.appendChild(versionElement);

        rowElement.appendChild(thumbElement);
        rowElement.appendChild(bodyElement);

        return rowElement;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inline Label Rename
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Inline rename for an iteration label
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__BeginRename(titleElement, iterationEntry, projectTree) {
        const previousLabel  = iterationEntry.Wv__EditIteration__Label || '';
        const inputElement   = document.createElement('input');
        inputElement.type    = 'text';
        inputElement.className = 'Wv__Edit__IterationList__Item__RenameInput';
        inputElement.value   = previousLabel;

        titleElement.replaceWith(inputElement);
        inputElement.focus();
        inputElement.select();

        let commitCalled = false;

        function commitRename() {
            if (commitCalled) return;
            commitCalled = true;
            const newLabel = inputElement.value.trim() || previousLabel || 'Iteration';
            iterationEntry.Wv__EditIteration__Label = newLabel;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            Wv__EditMode__IterationList__LastIterationSignature = '';
            Wv__EditMode__IterationList__Rerender(projectTree, true);
            window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
        }

        inputElement.addEventListener('blur', commitRename);
        inputElement.addEventListener('keydown', (keyEvent) => {
            if (keyEvent.key === 'Enter')  { keyEvent.preventDefault(); inputElement.blur(); }
            if (keyEvent.key === 'Escape') { inputElement.value = previousLabel; inputElement.blur(); }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New, Duplicate, Save, and Delete
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Add a new blank iteration
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__HandleNew() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const newIteration = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__BuildBlankEditIteration(
            (projectTree.Wv__Project__EditIterations || []).length
        );
        projectTree.Wv__Project__EditIterations.push(newIteration);
        projectTree.Wv__Project__ActiveEditIterationId = newIteration.Wv__EditIteration__Id;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Duplicate the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__HandleDuplicate() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            entry => entry.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No iteration selected.', 'warning'); return; }

        const duplicatedIteration = JSON.parse(JSON.stringify(activeIteration));
        const nextVersionNumber   = String(projectTree.Wv__Project__EditIterations.length + 1).padStart(2, '0');
        duplicatedIteration.Wv__EditIteration__Id      = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15) + 'Z';
        duplicatedIteration.Wv__EditIteration__Label   = (activeIteration.Wv__EditIteration__Label || 'Iter') + ' (copy)';
        duplicatedIteration.Wv__EditIteration__Version = 'Version-' + nextVersionNumber;
        duplicatedIteration.Wv__EditIteration__DateCreatedUtc  = new Date().toISOString();
        duplicatedIteration.Wv__EditIteration__LastOutputPath  = '';
        duplicatedIteration.Wv__EditIteration__LastOutputThumbPath = '';
        projectTree.Wv__Project__EditIterations.push(duplicatedIteration);
        projectTree.Wv__Project__ActiveEditIterationId = duplicatedIteration.Wv__EditIteration__Id;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save the active project to disk
    // ------------------------------------------------------------
    async function Wv__EditMode__IterationList__HandleSave() {
        const saveBtnElement = document.getElementById('Wv__Edit__IterationList__SaveBtn');
        saveBtnElement.disabled = true;
        try {
            await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject();
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Project saved.', 'success');
        } catch (saveError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Save failed: ' + saveError.message, 'error');
        } finally {
            saveBtnElement.disabled = false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__IterationList__HandleDelete() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIdValue = projectTree.Wv__Project__ActiveEditIterationId;
        if (!activeIdValue) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No iteration selected.', 'warning'); return; }
        if (!window.confirm('Delete iteration "' + activeIdValue + '"? Image folder will remain on disk.')) return;

        projectTree.Wv__Project__EditIterations = (projectTree.Wv__Project__EditIterations || []).filter(
            entry => entry.Wv__EditIteration__Id !== activeIdValue
        );
        projectTree.Wv__Project__ActiveEditIterationId = (projectTree.Wv__Project__EditIterations[0] || {}).Wv__EditIteration__Id || '';
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__EditMode__IterationList = { Wv__EditMode__IterationList__Install };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================
