/* =============================================================================
   VALESPEC - DOCUMENT EDITOR SECTION MANAGER
   =============================================================================

   FILE       : ValeSpec__DocEditor__SectionManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocEditor - SectionManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render and manage assembly section blocks in Document Editor mode
   CREATED    : 2026

   DESCRIPTION:
   - Renders assembly section blocks into #ValeSpec__DocEditor__SectionsContainer
   - Each block shows SVG thumbnail, editable title, spec summary, action buttons
   - Edit Assembly switches to AssemblyEditor mode with selected index
   - Duplicate copies assembly data to a new entry in the project
   - Delete confirms and removes assembly from the project
   - Add New Assembly creates a default assembly entry
   - Reorder via up/down arrows changes Assembly__Identity__Config__SortOrder

   ============================================================================= */

// =============================================================================
// REGION | Section Manager Module
// =============================================================================

const ValeSpec__DocEditor__SectionManager = (function() {

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const SECTIONS_CONTAINER_ID  =  'ValeSpec__DocEditor__SectionsContainer';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Binding Guard
    // ------------------------------------------------------------
    let ValeSpec__SectionManager__DelegationBound  =  false;   // <-- Prevents duplicate click listeners on re-renders
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Assemblies Array
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__GetAssemblies() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return [];
        var state    =  StateManager.ValeSpec__StateManager__GetState();           // <-- Read-only state snapshot
        var project  =  state.currentProject;
        if (!project) return [];
        return project['ValeSpec__ProjectFile__Assemblies'] || [];                 // <-- Assembly array from project data
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Persist Current Project to Disk After Structural Changes
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__SaveCurrentProject() {
        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        if (!ProjectFileManager || !StateManager) return;

        var state  =  StateManager.ValeSpec__StateManager__GetState();
        if (state.currentProject) {
            ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject(state.currentProject);  // <-- Persist full project JSON to localStorage + disk
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Default Assembly Title
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildDefaultTitle(assembly) {
        var identity  =  assembly['Assembly__Identity__Config'] || {};
        var custom    =  identity['Assembly__Identity__Config__Title'];
        if (custom) return custom;

        var doorType    =  (assembly['Assembly__DoorType__Config'] || {})['Assembly__DoorType__Config__Type'] || 'Door';
        var dimensions  =  assembly['Assembly__Dimensions__Config'] || {};
        var width       =  dimensions['Assembly__Dimensions__Config__WidthMm']  || '\u2014';
        var height      =  dimensions['Assembly__Dimensions__Config__HeightMm'] || '\u2014';
        return doorType + ' \u2014 ' + width + ' x ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Spec Summary HTML
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildSpecSummary(assembly) {
        var doorConfig   =  assembly['Assembly__DoorType__Config']   || {};
        var hingeConfig  =  assembly['Assembly__Hinge__Config']      || {};
        var lockConfig   =  assembly['Assembly__Locking__Config']    || {};

        var doorType    =  doorConfig['Assembly__DoorType__Config__Type']        || '\u2014';
        var hingeCount  =  hingeConfig['Assembly__Hinge__Config__HingesPerLeaf'] || '\u2014';
        var hingeProj   =  hingeConfig['Assembly__Hinge__Config__Projection']    || '\u2014';
        var lockPoints  =  lockConfig['Assembly__Locking__Config__Points']        || '\u2014';
        var lockType    =  lockConfig['Assembly__Locking__Config__Type']          || '\u2014';

        var html  =  '<div class="ValeSpec__DocEditor__SpecSummary">';
        html     +=      '<span>Door Type: ' + doorType + '</span>';
        html     +=      '<span>Hinges: ' + hingeCount + ' per leaf, ' + hingeProj + '&quot;</span>';
        html     +=      '<span>Locking: ' + lockPoints + '-Point ' + lockType + '</span>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Action Buttons HTML
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildActionButtons(index) {
        var html  =  '<div class="ValeSpec__DocEditor__SectionActions">';
        html     +=      '<button class="ValeSpec__DocEditor__BtnEdit" data-action="edit" data-index="' + index + '">Edit Assembly</button>';
        html     +=      '<button class="ValeSpec__DocEditor__BtnDuplicate" data-action="duplicate" data-index="' + index + '">Duplicate</button>';
        html     +=      '<button class="ValeSpec__DocEditor__BtnDelete" data-action="delete" data-index="' + index + '">Delete</button>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Reorder Handles HTML
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildReorderHandles(index, total) {
        var html  =  '<div class="ValeSpec__DocEditor__ReorderHandles">';
        html     +=      '<button class="ValeSpec__DocEditor__ReorderBtn" data-action="move-up" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + '>&uarr;</button>';
        html     +=      '<button class="ValeSpec__DocEditor__ReorderBtn" data-action="move-down" data-index="' + index + '"' + (index === total - 1 ? ' disabled' : '') + '>&darr;</button>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Section Block HTML
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildSectionBlock(assembly, index, total) {
        var title  =  ValeSpec__SectionManager__BuildDefaultTitle(assembly);

        var html  =  '<div class="ValeSpec__DocEditor__SectionBlock" data-index="' + index + '">';
        html     +=      ValeSpec__SectionManager__BuildReorderHandles(index, total);
        html     +=      '<div class="ValeSpec__DocEditor__Thumbnail" id="ValeSpec__DocEditor__Thumb_' + index + '"></div>';
        html     +=      '<div class="ValeSpec__DocEditor__SectionContent">';
        html     +=          '<div class="ValeSpec__DocEditor__SectionTitle" data-index="' + index + '">' + title + '</div>';
        html     +=          ValeSpec__SectionManager__BuildSpecSummary(assembly);
        html     +=          ValeSpec__SectionManager__BuildActionButtons(index);
        html     +=      '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Add New Assembly Button HTML
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildAddButton() {
        return '<button class="ValeSpec__DocEditor__BtnAddAssembly" data-action="add-new">+ Add New Assembly</button>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Assembly Title in State
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__UpdateAssemblyTitle(index, newTitle) {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assemblies    =  ValeSpec__SectionManager__GetAssemblies();
        if (!assemblies[index]) return;

        var identity  =  assemblies[index]['Assembly__Identity__Config'] || {};
        identity['Assembly__Identity__Config__Title']     =  newTitle;
        assemblies[index]['Assembly__Identity__Config']   =  identity;

        StateManager.ValeSpec__StateManager__MarkDirty();
        ValeSpec__SectionManager__SaveCurrentProject();                            // <-- Persist title change to disk
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recalculate Sort Orders After Reorder
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__RecalcSortOrders(assemblies) {
        for (var i = 0; i < assemblies.length; i++) {
            var identity  =  assemblies[i]['Assembly__Identity__Config'] || {};
            identity['Assembly__Identity__Config__SortOrder']  =  i;
            assemblies[i]['Assembly__Identity__Config']         =  identity;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Thumbnails into Mounted Containers
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__RenderThumbnails(assemblies) {
        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (!RenderPipeline) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var hwIndex       =  StateManager ? StateManager.ValeSpec__StateManager__GetState().hardwareIndex : null;

        for (var i = 0; i < assemblies.length; i++) {
            var thumbContainer  =  document.getElementById('ValeSpec__DocEditor__Thumb_' + i);
            if (thumbContainer) {
                try {
                    var svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblies[i], hwIndex);
                    thumbContainer.innerHTML  =  svgMarkup || '';
                } catch (e) {
                    thumbContainer.innerHTML  =  '<div style="padding:12px;color:var(--Vale_TextSubtle);font-size:var(--Vale_FontSize_Small);">Preview unavailable</div>';
                    console.warn('[ValeSpec__SectionManager] Thumbnail render error for index ' + i + ':', e);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Edit Assembly Action
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__HandleEditAssembly(index) {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var ModeManager   =  window.ValeSpec__AppCore__ModeManager;
        if (!StateManager || !ModeManager) return;

        StateManager.ValeSpec__StateManager__SetCurrentAssemblyIndex(index);                   // <-- Set active assembly for editor
        ModeManager.ValeSpec__ModeManager__SwitchToMode(ModeManager.MODE_ASSEMBLY_EDITOR);     // <-- Navigate to Assembly Editor
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Duplicate Assembly Action
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__HandleDuplicateAssembly(index) {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assemblies    =  ValeSpec__SectionManager__GetAssemblies();
        if (!assemblies[index]) return;

        var clone     =  JSON.parse(JSON.stringify(assemblies[index]));
        var identity  =  clone['Assembly__Identity__Config'] || {};
        identity['Assembly__Identity__Config__Id']         =  'asm_' + String(Date.now()).slice(-6);
        identity['Assembly__Identity__Config__Title']      =  (identity['Assembly__Identity__Config__Title'] || '') + ' (Copy)';
        identity['Assembly__Identity__Config__SortOrder']  =  assemblies.length;
        clone['Assembly__Identity__Config']  =  identity;

        assemblies.push(clone);
        StateManager.ValeSpec__StateManager__MarkDirty();
        ValeSpec__SectionManager__SaveCurrentProject();                            // <-- Persist duplicated assembly to disk
        ValeSpec__SectionManager__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Delete Assembly Action
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__HandleDeleteAssembly(index) {
        var assemblies  =  ValeSpec__SectionManager__GetAssemblies();
        if (!assemblies[index]) return;

        var confirmed  =  confirm('Delete this assembly? This action cannot be undone.');
        if (!confirmed) return;

        assemblies.splice(index, 1);                                               // <-- Remove assembly at index
        ValeSpec__SectionManager__RecalcSortOrders(assemblies);

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        StateManager.ValeSpec__StateManager__MarkDirty();
        ValeSpec__SectionManager__SaveCurrentProject();                            // <-- Persist deletion to disk
        ValeSpec__SectionManager__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Reorder Action
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__HandleReorder(index, direction) {
        var assemblies   =  ValeSpec__SectionManager__GetAssemblies();
        var targetIndex  =  index + direction;
        if (targetIndex < 0 || targetIndex >= assemblies.length) return;

        var temp                  =  assemblies[index];
        assemblies[index]         =  assemblies[targetIndex];
        assemblies[targetIndex]   =  temp;

        ValeSpec__SectionManager__RecalcSortOrders(assemblies);

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        StateManager.ValeSpec__StateManager__MarkDirty();
        ValeSpec__SectionManager__SaveCurrentProject();                            // <-- Persist reordered assembly list to disk
        ValeSpec__SectionManager__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Add New Assembly Action
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__HandleAddNewAssembly() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assemblies    =  ValeSpec__SectionManager__GetAssemblies();

        var newAssembly  =  {
            'Assembly__Identity__Config': {
                'Assembly__Identity__Config__Id'         : 'asm_' + String(Date.now()).slice(-6),
                'Assembly__Identity__Config__Title'      : '',
                'Assembly__Identity__Config__SortOrder'  : assemblies.length
            },
            'Assembly__DoorType__Config': {
                'Assembly__DoorType__Config__Type'       : 'Outward Opening Double Doors',
                'Assembly__DoorType__Config__Quantity'   : 1
            },
            'Assembly__Dimensions__Config': {
                'Assembly__Dimensions__Config__WidthMm'  : 1800,
                'Assembly__Dimensions__Config__HeightMm' : 2100
            },
            'Assembly__Hinge__Config': {
                'Assembly__Hinge__Config__Projection'    : 5,
                'Assembly__Hinge__Config__HingesPerLeaf' : 3,
                'Assembly__Hinge__Config__Hanging'       : 'Standard'
            },
            'Assembly__Locking__Config': {
                'Assembly__Locking__Config__Points'  : 5,
                'Assembly__Locking__Config__Type'    : 'Multi-Point'
            },
            'Assembly__Lever__Config': {
                'Assembly__Lever__Config__Type'      : 'Scroll',
                'Assembly__Lever__Config__HeightMm'  : 1000,
                'Assembly__Lever__Config__Handing'   : 'Dual'
            },
            'Assembly__CabinHooks__Config': {
                'Assembly__CabinHooks__Config__Size'       : '6"',
                'Assembly__CabinHooks__Config__HookCount'  : 2,
                'Assembly__CabinHooks__Config__EyeCount'   : 2
            },
            'Assembly__Miscellaneous__Config': {
                'Assembly__Miscellaneous__Config__Items'  : ['N/A']
            }
        };

        assemblies.push(newAssembly);
        StateManager.ValeSpec__StateManager__MarkDirty();
        ValeSpec__SectionManager__SaveCurrentProject();                            // <-- Persist new assembly to disk
        ValeSpec__SectionManager__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Click Delegation — called once only
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BindClickDelegation(container) {
        if (ValeSpec__SectionManager__DelegationBound) return;                    // <-- Guard: container persists across renders
        container.addEventListener('click', function(e) {
            var btn  =  e.target.closest('[data-action]');
            if (!btn) return;

            var action  =  btn.dataset.action;
            var index   =  parseInt(btn.dataset.index, 10);

            if (action === 'edit')       ValeSpec__SectionManager__HandleEditAssembly(index);
            if (action === 'duplicate')  ValeSpec__SectionManager__HandleDuplicateAssembly(index);
            if (action === 'delete')     ValeSpec__SectionManager__HandleDeleteAssembly(index);
            if (action === 'move-up')    ValeSpec__SectionManager__HandleReorder(index, -1);
            if (action === 'move-down')  ValeSpec__SectionManager__HandleReorder(index, 1);
            if (action === 'add-new')    ValeSpec__SectionManager__HandleAddNewAssembly();
        });
        ValeSpec__SectionManager__DelegationBound  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Double-Click Title Editing
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BindTitleEditing(container) {
        var titles  =  container.querySelectorAll('.ValeSpec__DocEditor__SectionTitle');
        for (var i = 0; i < titles.length; i++) {
            titles[i].addEventListener('dblclick', function(e) {
                var el   =  e.currentTarget;
                var idx  =  parseInt(el.dataset.index, 10);
                el.contentEditable  =  'true';
                el.classList.add('ValeSpec__DocEditor__SectionTitle--editing');
                el.focus();

                el.addEventListener('blur', function onBlur() {
                    el.contentEditable  =  'false';
                    el.classList.remove('ValeSpec__DocEditor__SectionTitle--editing');
                    ValeSpec__SectionManager__UpdateAssemblyTitle(idx, el.textContent.trim());  // <-- Save new title on blur
                    el.removeEventListener('blur', onBlur);
                });

                el.addEventListener('keydown', function(ke) {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        el.blur();                                                // <-- Commit on Enter key
                    }
                });
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render All Section Blocks into DOM
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__Render() {
        var container  =  document.getElementById(SECTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__SectionManager] Container not found: #' + SECTIONS_CONTAINER_ID);
            return;
        }

        var assemblies  =  ValeSpec__SectionManager__GetAssemblies();

        var html  =  '';
        for (var i = 0; i < assemblies.length; i++) {
            html  +=  ValeSpec__SectionManager__BuildSectionBlock(assemblies[i], i, assemblies.length); // <-- Build each section block
        }
        html  +=  ValeSpec__SectionManager__BuildAddButton();                                           // <-- Append add-new button at end

        container.innerHTML  =  html;

        ValeSpec__SectionManager__RenderThumbnails(assemblies);
        ValeSpec__SectionManager__BindClickDelegation(container);                                       // <-- Bound once only
        ValeSpec__SectionManager__BindTitleEditing(container);                                          // <-- Rebound each render
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SectionManager__Render  : ValeSpec__SectionManager__Render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocEditor__SectionManager  =  ValeSpec__DocEditor__SectionManager;
