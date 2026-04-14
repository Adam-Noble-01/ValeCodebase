/* =============================================================================
   VALESPEC - DOCUMENT EDITOR HEADER
   =============================================================================

   FILE       : ValeSpec__DocEditor__DocumentHeader__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocEditor - DocumentHeader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render and manage the document header block in Document Editor mode
   CREATED    : 2026

   DESCRIPTION:
   - Renders document header into #ValeSpec__DocEditor__HeaderBlock
   - Shows project name and document name
   - Date authored formatted via DateFormatter.formatShort
   - Editable revision code text input
   - Status dropdown with colour-coded badge
   - Changes update project metadata in StateManager

   ============================================================================= */

// =============================================================================
// REGION | Document Header Module
// =============================================================================

const ValeSpec__DocEditor__DocumentHeader = (function() {

    // MODULE CONSTANTS | DOM Target ID
    // ------------------------------------------------------------
    const HEADER_CONTAINER_ID  =  'ValeSpec__DocEditor__HeaderBlock';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Status Options and Colour Mapping
    // ------------------------------------------------------------
    const STATUS_OPTIONS  =  ['Draft', 'In Progress', 'Pending Approval', 'Approved', 'Completed'];

    const STATUS_COLORS  =  {
        'Draft'              : '#888888',
        'In Progress'        : '#e6a817',
        'Pending Approval'   : '#d67e28',
        'Approved'           : '#2a7d4f',
        'Completed'          : '#2a7d4f'
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Project Metadata from State
    // ------------------------------------------------------------
    function _getProjectMeta() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return null;
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return null;
        return project['ValeSpec__ProjectFile__Metadata'] || null;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Format Date via DateFormatter
    // ------------------------------------------------------------
    function _formatDate(dateStr) {
        if (!dateStr) return '\u2014';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.formatShort(dateStr);
        }
        return dateStr;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Status Dropdown HTML
    // ------------------------------------------------------------
    function _buildStatusDropdown(currentStatus) {
        var html  =  '<select class="ValeSpec__DocEditor__StatusSelect" id="ValeSpec__DocEditor__StatusDropdown">';
        for (var i = 0; i < STATUS_OPTIONS.length; i++) {
            var opt       =  STATUS_OPTIONS[i];
            var selected  =  (opt === currentStatus) ? ' selected' : '';
            html  +=  '<option value="' + opt + '"' + selected + '>' + opt + '</option>';
        }
        html  +=  '</select>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Status Badge HTML
    // ------------------------------------------------------------
    function _buildStatusBadge(status) {
        var color  =  STATUS_COLORS[status] || STATUS_COLORS['Draft'];
        return '<span class="ValeSpec__DocEditor__StatusBadge" style="background:' + color + '; color:#fff; padding:2px 10px; border-radius:4px; font-size:var(--Vale_FontSize_Small);">' + status + '</span>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Inline-Editable Text Span
    // ------------------------------------------------------------
    function _buildEditableSpan(id, value, style) {
        var escaped  =  value.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<span id="' + id + '" class="ValeSpec__DocEditor__EditableField" data-value="' + escaped + '" style="' + style + ' cursor:pointer; border-radius:3px;" title="Click to edit">' + escaped + '</span>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Header HTML
    // ------------------------------------------------------------
    function _buildHeaderHtml(meta) {
        var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName']     || 'Untitled Project';
        var docName      =  meta['ValeSpec__ProjectFile__Metadata__DocumentName']    || 'Untitled Document';
        var authorName   =  meta['ValeSpec__ProjectFile__Metadata__Author']          || '';
        var projectCode  =  meta['ValeSpec__ProjectFile__Metadata__ProjectCode']     || '';
        var revision     =  meta['ValeSpec__ProjectFile__Metadata__RevisionCode']    || 'A';
        var status       =  meta['ValeSpec__ProjectFile__Metadata__DocumentStatus']  || 'Draft';

        var projectNameStyle  =  'font-size:var(--Vale_FontSize_SubHeading); font-weight:var(--Vale_FontWeight_SemiBold); color:var(--Vale_TextPrimary);';
        var docNameStyle      =  'font-size:var(--Vale_FontSize_Standard); color:var(--Vale_TextSecondary);';
        var authorStyle       =  'font-size:var(--Vale_FontSize_Small); color:var(--Vale_TextSubtle);';

        var html  =  '<div style="display:flex; align-items:center; gap:var(--Vale_Spacing_Large); width:100%; box-sizing:border-box; padding:var(--Vale_Spacing_Medium); background:var(--Vale_BackgroundWhite); border:1px solid var(--Vale_BorderLight); border-radius:var(--Vale_BorderRadius);">';

        html  +=  '<div style="flex:1;">';
        html  +=      '<div>' + _buildEditableSpan('ValeSpec__DocEditor__ProjectNameField', projectName, projectNameStyle) + '</div>';
        html  +=      '<div style="margin-top:2px;">' + _buildEditableSpan('ValeSpec__DocEditor__DocNameField', docName, docNameStyle);
        if (projectCode) html  +=  '<span style="font-size:var(--Vale_FontSize_Standard); color:var(--Vale_TextSecondary);"> &mdash; Code: ' + projectCode + '</span>'; // <-- Read-only: project code is the localStorage key used to find/load the project
        html  +=      '</div>';
        html  +=      '<div style="margin-top:4px;"><span style="font-size:var(--Vale_FontSize_Small); color:var(--Vale_TextSubtle);">Author: </span>' + _buildEditableSpan('ValeSpec__DocEditor__AuthorField', authorName || '\u2014', authorStyle) + '</div>';
        html  +=  '</div>';

        html  +=  '<div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">';
        html  +=      '<div style="display:flex; align-items:center; gap:8px;">';
        html  +=          '<label style="font-size:var(--Vale_FontSize_Small); color:var(--Vale_TextSubtle);">Rev</label>';
        html  +=          '<input id="ValeSpec__DocEditor__RevisionInput" type="text" value="' + revision + '" style="width:48px; text-align:center; padding:4px; border:1px solid var(--Vale_BorderLight); border-radius:var(--Vale_BorderRadius); font-family:var(--Vale_FontFamily); font-size:var(--Vale_FontSize_Standard);" />';
        html  +=      '</div>';
        html  +=      _buildStatusBadge(status);
        html  +=      _buildStatusDropdown(status);
        html  +=  '</div>';

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Activate Inline Edit on a Span Field
    // ------------------------------------------------------------
    function _activateInlineEdit(spanEl, metaKey) {
        if (spanEl.querySelector('input')) return; // <-- Already editing

        var currentValue  =  spanEl.getAttribute('data-value');
        var currentStyle  =  spanEl.style.cssText;

        var input  =  document.createElement('input');
        input.type        =  'text';
        input.value       =  (currentValue === '\u2014') ? '' : currentValue; // <-- Clear placeholder dash
        input.style.cssText  =  'font:inherit; color:inherit; background:transparent; border:none; border-bottom:1px solid var(--Vale_TextPrimary); outline:none; width:100%; min-width:120px; padding:0; margin:0;';

        spanEl.textContent  =  '';
        spanEl.appendChild(input);
        spanEl.style.cursor  =  'text';
        input.focus();
        input.select();

        function _commit() {
            var newValue  =  input.value.trim();
            if (!newValue) newValue  =  '\u2014'; // <-- Restore dash if left empty
            _updateMetaField(metaKey, (newValue === '\u2014') ? '' : newValue);
            spanEl.setAttribute('data-value', newValue);
            spanEl.textContent  =  newValue;
            spanEl.style.cursor  =  'pointer';
        }

        input.addEventListener('blur', _commit);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = (currentValue === '\u2014') ? '' : currentValue; input.blur(); }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Event Listeners for Header Controls
    // ------------------------------------------------------------
    function _bindEvents() {
        var revisionInput   =  document.getElementById('ValeSpec__DocEditor__RevisionInput');
        var statusDropdown  =  document.getElementById('ValeSpec__DocEditor__StatusDropdown');
        var projectNameEl   =  document.getElementById('ValeSpec__DocEditor__ProjectNameField');
        var docNameEl       =  document.getElementById('ValeSpec__DocEditor__DocNameField');
        var authorEl        =  document.getElementById('ValeSpec__DocEditor__AuthorField');

        if (revisionInput) {
            revisionInput.addEventListener('change', function() {
                _updateMetaField('ValeSpec__ProjectFile__Metadata__RevisionCode', revisionInput.value.trim());
            });
        }

        if (statusDropdown) {
            statusDropdown.addEventListener('change', function() {
                _updateMetaField('ValeSpec__ProjectFile__Metadata__DocumentStatus', statusDropdown.value);
                render();
            });
        }

        if (projectNameEl) {
            projectNameEl.addEventListener('click', function() {
                _activateInlineEdit(projectNameEl, 'ValeSpec__ProjectFile__Metadata__ProjectName');
            });
        }

        if (docNameEl) {
            docNameEl.addEventListener('click', function() {
                _activateInlineEdit(docNameEl, 'ValeSpec__ProjectFile__Metadata__DocumentName');
            });
        }

        if (authorEl) {
            authorEl.addEventListener('click', function() {
                _activateInlineEdit(authorEl, 'ValeSpec__ProjectFile__Metadata__Author');
            });
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update a Single Meta Field — Persist and Refresh
    // ------------------------------------------------------------
    function _updateMetaField(key, value) {
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var ProjectFileManager =  window.ValeSpec__AppData__ProjectFileManager;
        if (!StateManager) return;

        var state    =  StateManager.getState();
        var project  =  state.currentProject;   // <-- Shallow copy but currentProject is same reference
        if (!project) return;

        var meta  =  project['ValeSpec__ProjectFile__Metadata'];
        if (!meta) return;

        meta[key]  =  value;                    // <-- Mutates the live project object in state

        StateManager.markDirty();

        if (ProjectFileManager) {
            ProjectFileManager.saveProject(project);    // <-- Persist to localStorage + update manifest
        }

        var ProjectList  =  window.ValeSpec__DocManagement__ProjectList;
        if (ProjectList) {
            ProjectList.render();               // <-- Refresh project manager table with updated names
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Inject Editable Field Hover Styles Once
    // ------------------------------------------------------------
    function _injectStyles() {
        if (document.getElementById('ValeSpec__DocEditor__HeaderStyles')) return; // <-- Already injected
        var style  =  document.createElement('style');
        style.id   =  'ValeSpec__DocEditor__HeaderStyles';
        style.textContent  =  [
            '.ValeSpec__DocEditor__EditableField:hover {',
            '    background: rgba(0,0,0,0.05);',
            '    outline: 1px dashed rgba(0,0,0,0.2);',
            '    outline-offset: 2px;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Document Header into DOM
    // ------------------------------------------------------------
    function render() {
        var container  =  document.getElementById(HEADER_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__DocHeader] Container not found: #' + HEADER_CONTAINER_ID);
            return;
        }

        var meta  =  _getProjectMeta();
        if (!meta) {
            container.innerHTML  =  '<div style="padding:16px; color:var(--Vale_TextSubtle);">No project loaded.</div>';
            return;
        }

        _injectStyles();
        container.innerHTML  =  _buildHeaderHtml(meta);
        _bindEvents();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        render  : render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocEditor__DocumentHeader  =  ValeSpec__DocEditor__DocumentHeader;
