/* =============================================================================
 WHITECARDVISION - EDIT MODE - ITERATION LIST
=============================================================================
 New / Duplicate / Delete / Select iteration. Persists into
 Wv__Project__EditIterations[] without overwriting prior entries.
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Install list + button handlers */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__IterationList__Install() {
        document.getElementById('Wv__Edit__IterationList__NewBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleNew);
        document.getElementById('Wv__Edit__IterationList__DuplicateBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleDuplicate);
        document.getElementById('Wv__Edit__IterationList__DeleteBtn')
            .addEventListener('click', Wv__EditMode__IterationList__HandleDelete);

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__EditMode__IterationList__Rerender);
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Rerender the list from active project */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__IterationList__Rerender(projectTree) {
        const hostElement   = document.getElementById('Wv__Edit__IterationList__Items');
        hostElement.innerHTML = '';
        if (!projectTree) return;

        const iterationsArray = projectTree.Wv__Project__EditIterations || [];
        const activeIdValue   = projectTree.Wv__Project__ActiveEditIterationId || '';

        for (const iterationEntry of iterationsArray) {
            const rowElement = document.createElement('div');
            rowElement.className = 'Wv__Edit__IterationList__Item' + (iterationEntry.Wv__EditIteration__Id === activeIdValue ? ' Wv__Edit__IterationList__Item--Active' : '');
            rowElement.innerHTML = `
                <div class="Wv__Edit__IterationList__Item__Title">${iterationEntry.Wv__EditIteration__Label || 'Iteration'}</div>
                <div class="Wv__Edit__IterationList__Item__Meta">${iterationEntry.Wv__EditIteration__Id}</div>
            `;
            rowElement.addEventListener('click', () => {
                projectTree.Wv__Project__ActiveEditIterationId = iterationEntry.Wv__EditIteration__Id;
                window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
                window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
            });
            hostElement.appendChild(rowElement);
        }
    }


    /* HELPER FUNCTION | Add a new blank iteration */
    /* ------------------------------------------------------------ */
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


    /* HELPER FUNCTION | Duplicate the active iteration */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__IterationList__HandleDuplicate() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            entry => entry.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No iteration selected.', 'warning'); return; }

        const duplicatedIteration = JSON.parse(JSON.stringify(activeIteration));
        duplicatedIteration.Wv__EditIteration__Id = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15) + 'Z';
        duplicatedIteration.Wv__EditIteration__Label = (activeIteration.Wv__EditIteration__Label || 'Iter') + ' (copy)';
        duplicatedIteration.Wv__EditIteration__DateCreatedUtc = new Date().toISOString();
        duplicatedIteration.Wv__EditIteration__LastOutputPath = '';
        projectTree.Wv__Project__EditIterations.push(duplicatedIteration);
        projectTree.Wv__Project__ActiveEditIterationId = duplicatedIteration.Wv__EditIteration__Id;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
    }


    /* HELPER FUNCTION | Delete the active iteration */
    /* ------------------------------------------------------------ */
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


    window.Wv__EditMode__IterationList = { Wv__EditMode__IterationList__Install };

})();
