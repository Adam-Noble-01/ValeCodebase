/* =============================================================================
 WHITECARDVISION - PROJECT MANAGER - PROJECT LIST (TABLE)
=============================================================================
 FILE       : WhitecardVision__ProjectManager__ProjectList__.js
 NAMESPACE  : Wv
 MODULE     : System - ProjectManagerMode - ProjectList
 PURPOSE    : Render a sortable/searchable table of every project on disk,
              provide inline-rename focus hooks, and wire Open/Duplicate/Delete
              row actions to Wv__ProjectManager__ProjectActions.
============================================================================= */

// =============================================================================
// REGION | Project List Module
// =============================================================================

(function () {
    'use strict';


// -----------------------------------------------------------------------------
// REGION | Private State
// -----------------------------------------------------------------------------

    const Wv__ProjectManager__ProjectList__State = {
        projectsList        : [],                                                                                                //<-- Last server response cache.
        filterQuery         : '',                                                                                                //<-- Lowercased search token.
        sortColumnKey       : 'dateModifiedUtc',
        sortDirection       : 'desc',
        focusRenameForSlug  : null                                                                                               //<-- Triggers inline-rename on next paint for this slug.
    };

    const Wv__ProjectManager__ProjectList__ColumnsFallback = [
        { key: 'projectName',     label: 'Project',     sortable: true,  primary: true  },
        { key: 'yearFolder',      label: 'Year',        sortable: true,  primary: false },
        { key: 'description',     label: 'Description', sortable: true,  primary: false },
        { key: 'dateModifiedUtc', label: 'Modified',    sortable: true,  primary: false },
        { key: 'dateCreatedUtc',  label: 'Created',     sortable: true,  primary: false }
    ];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers - Columns / Formatting / Escape
// -----------------------------------------------------------------------------

    function Wv__ProjectManager__ProjectList__GetColumns() {
        const systemConfig = window.Wv__AppCore__StateManager.Wv__StateManager__GetSystemConfig('ProjectManager');
        const configured   = (systemConfig || {}).Wv__ProjectManager__Config__Columns;
        return Array.isArray(configured) && configured.length ? configured : Wv__ProjectManager__ProjectList__ColumnsFallback;
    }


    function Wv__ProjectManager__ProjectList__EscapeHtml(rawText) {
        return String(rawText == null ? '' : rawText)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }


    function Wv__ProjectManager__ProjectList__FormatIsoForDisplay(isoString) {                                                   //<-- Converts server ISO8601 -> "22-Apr-2026 14:32".
        if (!isoString) return '';
        const dateObject = new Date(isoString);
        if (isNaN(dateObject.getTime())) return String(isoString);
        const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dateObject.getMonth()];
        const pad2       = (n) => String(n).padStart(2, '0');
        return pad2(dateObject.getDate()) + '-' + monthShort + '-' + dateObject.getFullYear()
             + ' ' + pad2(dateObject.getHours()) + ':' + pad2(dateObject.getMinutes());
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Install / Refresh / Filter / Sort / QueueRenameFocus
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the table scaffold to the DOM (called once from controller)
    // ------------------------------------------------------------
    function Wv__ProjectManager__ProjectList__Install() {
        const systemConfig   = window.Wv__AppCore__StateManager.Wv__StateManager__GetSystemConfig('ProjectManager');
        const defaultsBlock  = (systemConfig || {}).Wv__ProjectManager__Config__Defaults || {};
        Wv__ProjectManager__ProjectList__State.sortColumnKey =
            defaultsBlock.Wv__ProjectManager__Config__Defaults__SortColumn    || 'dateModifiedUtc';
        Wv__ProjectManager__ProjectList__State.sortDirection =
            defaultsBlock.Wv__ProjectManager__Config__Defaults__SortDirection || 'desc';

        Wv__ProjectManager__ProjectList__PaintTableShell();

        const searchInputEl = document.getElementById('Wv__ProjectManager__Search__Input');
        if (searchInputEl) {
            searchInputEl.addEventListener('input', () => {
                Wv__ProjectManager__ProjectList__State.filterQuery = searchInputEl.value.trim().toLowerCase();
                Wv__ProjectManager__ProjectList__PaintTableBody();
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch the latest project list from server and repaint
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectList__Refresh() {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        try {
            const listData = await projectFileManager.Wv__ProjectFileManager__ListAllProjects();
            Wv__ProjectManager__ProjectList__State.projectsList = Array.isArray(listData) ? listData : [];
            Wv__ProjectManager__ProjectList__PaintTableBody();
        } catch (fetchError) {
            if (toast) toast.Wv__Toast__Show('Could not list projects: ' + fetchError.message, 'error');
            Wv__ProjectManager__ProjectList__State.projectsList = [];
            Wv__ProjectManager__ProjectList__PaintTableBody();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Flag a project slug so the next repaint opens an inline rename input
    // ------------------------------------------------------------
    function Wv__ProjectManager__ProjectList__QueueRenameFocus(projectSlugToken) {
        Wv__ProjectManager__ProjectList__State.focusRenameForSlug = projectSlugToken || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internals - Paint thead + tbody
// -----------------------------------------------------------------------------

    function Wv__ProjectManager__ProjectList__PaintTableShell() {
        const headRowEl = document.getElementById('Wv__ProjectManager__Table__HeadRow');
        if (!headRowEl) return;
        const columnsArray = Wv__ProjectManager__ProjectList__GetColumns();

        headRowEl.innerHTML = columnsArray.map((columnDescriptor) => {
            const sortableFlag = columnDescriptor.sortable ? '1' : '0';
            const activeState  = (Wv__ProjectManager__ProjectList__State.sortColumnKey === columnDescriptor.key)
                ? Wv__ProjectManager__ProjectList__State.sortDirection
                : '';
            const arrowGlyph   = activeState === 'asc' ? '\u25B2' : activeState === 'desc' ? '\u25BC' : '\u25B2';
            return `<th
                data-wv-column-key="${Wv__ProjectManager__ProjectList__EscapeHtml(columnDescriptor.key)}"
                data-wv-sortable="${sortableFlag}"
                data-wv-sort-active="${activeState}">
                ${Wv__ProjectManager__ProjectList__EscapeHtml(columnDescriptor.label)}
                <span class="Wv__ProjectManager__Table__SortArrow">${arrowGlyph}</span>
            </th>`;
        }).join('') + '<th class="Wv__ProjectManager__Table__ActionsHead">Actions</th>';

        headRowEl.querySelectorAll('th[data-wv-sortable="1"]').forEach((headCellEl) => {
            headCellEl.addEventListener('click', () => {
                const clickedKey = headCellEl.getAttribute('data-wv-column-key');
                if (Wv__ProjectManager__ProjectList__State.sortColumnKey === clickedKey) {
                    Wv__ProjectManager__ProjectList__State.sortDirection =
                        Wv__ProjectManager__ProjectList__State.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    Wv__ProjectManager__ProjectList__State.sortColumnKey = clickedKey;
                    Wv__ProjectManager__ProjectList__State.sortDirection = 'asc';
                }
                Wv__ProjectManager__ProjectList__PaintTableShell();
                Wv__ProjectManager__ProjectList__PaintTableBody();
            });
        });
    }


    function Wv__ProjectManager__ProjectList__PaintTableBody() {
        const bodyEl = document.getElementById('Wv__ProjectManager__Table__Body');
        const statEl = document.getElementById('Wv__ProjectManager__Stat');
        if (!bodyEl) return;

        const columnsArray     = Wv__ProjectManager__ProjectList__GetColumns();
        const filteredProjects = Wv__ProjectManager__ProjectList__ComputeFilteredSorted();
        const totalCount       = Wv__ProjectManager__ProjectList__State.projectsList.length;

        if (statEl) {
            statEl.textContent = filteredProjects.length === totalCount
                ? (totalCount + (totalCount === 1 ? ' project' : ' projects'))
                : (filteredProjects.length + ' of ' + totalCount + ' shown');
        }

        if (!filteredProjects.length) {
            bodyEl.innerHTML = `<tr><td colspan="${columnsArray.length + 1}"
                class="Wv__ProjectManager__Table__EmptyState">
                ${totalCount ? 'No projects match your search.' : 'No projects yet. Click "New" to create one.'}
            </td></tr>`;
            return;
        }

        const activeTree         = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const activeSlugToken    = (activeTree && activeTree.Wv__ProjectFile__Metadata && projectFileManager)
            ? projectFileManager.Wv__ProjectFileManager__GetProjectSlugForApi(activeTree.Wv__ProjectFile__Metadata)
            : '';

        bodyEl.innerHTML = filteredProjects.map((projectItem) => {
            const isActiveRow      = activeSlugToken && projectItem.projectSlug === activeSlugToken;
            const projectSlugToken = projectItem.projectSlug || projectItem.projectName;
            const rowClassList     = 'Wv__ProjectManager__Row' + (isActiveRow ? ' Wv__ProjectManager__Row--Active' : '');
            const cellsHtml = columnsArray.map((columnDescriptor) => {
                return Wv__ProjectManager__ProjectList__RenderCell(projectItem, columnDescriptor);
            }).join('');
            const actionsHtml = `<td class="Wv__ProjectManager__Cell__Actions">
                <button class="Wv__ProjectManager__RowAction Wv__ProjectManager__RowAction--Open"
                        data-wv-action="open"
                        data-wv-year="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.yearFolder)}"
                        data-wv-slug="${Wv__ProjectManager__ProjectList__EscapeHtml(projectSlugToken)}">Open</button>
                <button class="Wv__ProjectManager__RowAction"
                        data-wv-action="duplicate"
                        data-wv-year="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.yearFolder)}"
                        data-wv-slug="${Wv__ProjectManager__ProjectList__EscapeHtml(projectSlugToken)}"
                        data-wv-name="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.projectName || projectSlugToken)}">Duplicate</button>
                <button class="Wv__ProjectManager__RowAction Wv__ProjectManager__RowAction--Danger"
                        data-wv-action="delete"
                        data-wv-year="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.yearFolder)}"
                        data-wv-slug="${Wv__ProjectManager__ProjectList__EscapeHtml(projectSlugToken)}"
                        data-wv-name="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.projectName || projectSlugToken)}">Delete</button>
            </td>`;
            return `<tr class="${rowClassList}"
                        data-wv-year="${Wv__ProjectManager__ProjectList__EscapeHtml(projectItem.yearFolder)}"
                        data-wv-slug="${Wv__ProjectManager__ProjectList__EscapeHtml(projectSlugToken)}">
                        ${cellsHtml}${actionsHtml}
                    </tr>`;
        }).join('');

        Wv__ProjectManager__ProjectList__AttachRowHandlers();
        Wv__ProjectManager__ProjectList__MaybeSpawnInlineRename();
    }


    function Wv__ProjectManager__ProjectList__RenderCell(projectItem, columnDescriptor) {
        const columnKey        = columnDescriptor.key;
        const projectSlugToken = projectItem.projectSlug || projectItem.projectName;
        const escape           = Wv__ProjectManager__ProjectList__EscapeHtml;

        if (columnKey === 'projectName') {
            const displayName   = projectItem.projectName || projectSlugToken;
            const slugIsDifferent = projectSlugToken && projectSlugToken !== displayName;
            const titleAttr     = slugIsDifferent
                ? ' title="' + escape('Folder id: ' + projectSlugToken) + '"'
                : '';
            return `<td>
                <div class="Wv__ProjectManager__Cell__ProjectName"
                     data-wv-cell="projectName"
                     data-wv-year="${escape(projectItem.yearFolder)}"
                     data-wv-slug="${escape(projectSlugToken)}"${titleAttr}>${escape(displayName)}</div>
            </td>`;
        }
        if (columnKey === 'description') {
            return `<td><div class="Wv__ProjectManager__Cell__Description" title="${escape(projectItem.description || '')}">${escape(projectItem.description || '')}</div></td>`;
        }
        if (columnKey === 'yearFolder') {
            const yearDisplay = String(projectItem.yearFolder || '').replace(/^Projects__/, '');                                 //<-- Strip "Projects__" prefix so UI shows just "2026".
            return `<td><span class="Wv__ProjectManager__Cell__Date">${escape(yearDisplay)}</span></td>`;
        }
        if (columnKey === 'dateCreatedUtc' || columnKey === 'dateModifiedUtc') {
            return `<td><span class="Wv__ProjectManager__Cell__Date">${escape(Wv__ProjectManager__ProjectList__FormatIsoForDisplay(projectItem[columnKey]))}</span></td>`;
        }
        return `<td>${escape(projectItem[columnKey] == null ? '' : projectItem[columnKey])}</td>`;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internals - Filter + Sort + Row Handlers + Inline Rename
// -----------------------------------------------------------------------------

    function Wv__ProjectManager__ProjectList__ComputeFilteredSorted() {
        const queryToken   = Wv__ProjectManager__ProjectList__State.filterQuery;
        const projectsCopy = Wv__ProjectManager__ProjectList__State.projectsList.slice();

        const filteredList = queryToken
            ? projectsCopy.filter((projectItem) => {
                const haystack = [
                    projectItem.projectName, projectItem.projectSlug, projectItem.yearFolder,
                    projectItem.description, projectItem.dateCreatedUtc, projectItem.dateModifiedUtc
                ].map(v => String(v || '').toLowerCase()).join(' || ');
                return haystack.indexOf(queryToken) !== -1;
            })
            : projectsCopy;

        const sortKey   = Wv__ProjectManager__ProjectList__State.sortColumnKey;
        const directionMultiplier = Wv__ProjectManager__ProjectList__State.sortDirection === 'asc' ? 1 : -1;
        filteredList.sort((a, b) => {
            const rawA = a[sortKey], rawB = b[sortKey];
            const strA = String(rawA == null ? '' : rawA).toLowerCase();
            const strB = String(rawB == null ? '' : rawB).toLowerCase();
            if (strA < strB) return -1 * directionMultiplier;
            if (strA > strB) return  1 * directionMultiplier;
            return 0;
        });
        return filteredList;
    }


    function Wv__ProjectManager__ProjectList__AttachRowHandlers() {
        const projectActions = window.Wv__ProjectManager__ProjectActions;
        if (!projectActions) return;

        document.querySelectorAll('#Wv__ProjectManager__Table__Body [data-wv-action="open"]').forEach((btn) => {
            btn.addEventListener('click', async (evt) => {
                evt.stopPropagation();
                await projectActions.Wv__ProjectManager__ProjectActions__OpenProject(
                    btn.getAttribute('data-wv-year'), btn.getAttribute('data-wv-slug')
                );
            });
        });
        document.querySelectorAll('#Wv__ProjectManager__Table__Body [data-wv-action="duplicate"]').forEach((btn) => {
            btn.addEventListener('click', async (evt) => {
                evt.stopPropagation();
                const duplicateDescriptor = await projectActions.Wv__ProjectManager__ProjectActions__DuplicateProject(
                    btn.getAttribute('data-wv-year'),
                    btn.getAttribute('data-wv-slug'),
                    btn.getAttribute('data-wv-name')
                );
                if (!duplicateDescriptor) return;
                Wv__ProjectManager__ProjectList__QueueRenameFocus(duplicateDescriptor.projectSlug);
                await Wv__ProjectManager__ProjectList__Refresh();
            });
        });
        document.querySelectorAll('#Wv__ProjectManager__Table__Body [data-wv-action="delete"]').forEach((btn) => {
            btn.addEventListener('click', async (evt) => {
                evt.stopPropagation();
                const didDelete = await projectActions.Wv__ProjectManager__ProjectActions__DeleteProject(
                    btn.getAttribute('data-wv-year'),
                    btn.getAttribute('data-wv-slug'),
                    btn.getAttribute('data-wv-name')
                );
                if (didDelete) Wv__ProjectManager__ProjectList__Refresh();
            });
        });
        document.querySelectorAll('#Wv__ProjectManager__Table__Body [data-wv-cell="projectName"]').forEach((cell) => {
            cell.addEventListener('click', async () => {
                Wv__ProjectManager__ProjectList__SpawnInlineRenameForCell(cell);
            });
            cell.addEventListener('dblclick', async () => {
                await projectActions.Wv__ProjectManager__ProjectActions__OpenProject(
                    cell.getAttribute('data-wv-year'), cell.getAttribute('data-wv-slug')
                );
            });
        });
    }


    function Wv__ProjectManager__ProjectList__MaybeSpawnInlineRename() {
        const targetSlug = Wv__ProjectManager__ProjectList__State.focusRenameForSlug;
        if (!targetSlug) return;
        Wv__ProjectManager__ProjectList__State.focusRenameForSlug = null;
        const cellEl = document.querySelector(
            '#Wv__ProjectManager__Table__Body [data-wv-cell="projectName"][data-wv-slug="' + targetSlug + '"]'
        );
        if (cellEl) Wv__ProjectManager__ProjectList__SpawnInlineRenameForCell(cellEl);
    }


    function Wv__ProjectManager__ProjectList__SpawnInlineRenameForCell(targetCellElement) {
        const projectActions = window.Wv__ProjectManager__ProjectActions;
        const yearFolderToken = targetCellElement.getAttribute('data-wv-year');
        const projectSlugToken = targetCellElement.getAttribute('data-wv-slug');
        const currentDisplayName = targetCellElement.textContent.trim();

        const inputEl = document.createElement('input');
        inputEl.type      = 'text';
        inputEl.className = 'Wv__ProjectManager__RenameInput';
        inputEl.value     = currentDisplayName;

        targetCellElement.innerHTML = '';
        targetCellElement.appendChild(inputEl);
        inputEl.focus();
        inputEl.select();

        let didCommit = false;
        const commit = async () => {
            if (didCommit) return;
            didCommit = true;
            const newName = inputEl.value.trim();
            if (newName && newName !== currentDisplayName) {
                const ok = await projectActions.Wv__ProjectManager__ProjectActions__CommitRename(
                    yearFolderToken, projectSlugToken, newName
                );
                if (ok) Wv__ProjectManager__ProjectList__Refresh();
                else    targetCellElement.textContent = currentDisplayName;
            } else {
                targetCellElement.textContent = currentDisplayName;
            }
        };
        const cancel = () => {
            if (didCommit) return;
            didCommit = true;
            targetCellElement.textContent = currentDisplayName;
        };

        inputEl.addEventListener('blur',    commit);
        inputEl.addEventListener('keydown', (keyEvt) => {
            if (keyEvt.key === 'Enter')  { keyEvt.preventDefault(); commit(); }
            if (keyEvt.key === 'Escape') { keyEvt.preventDefault(); cancel(); }
        });
    }

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__ProjectManager__ProjectList = {
        Wv__ProjectManager__ProjectList__Install,
        Wv__ProjectManager__ProjectList__Refresh,
        Wv__ProjectManager__ProjectList__QueueRenameFocus
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
