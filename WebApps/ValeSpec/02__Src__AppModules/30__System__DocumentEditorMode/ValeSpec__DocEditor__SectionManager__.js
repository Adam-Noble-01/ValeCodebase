/* =============================================================================
   VALESPEC - DOCUMENT EDITOR SECTION MANAGER
   =============================================================================

   FILE       : ValeSpec__DocEditor__SectionManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocEditor - SectionManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render and manage assembly section blocks in Document Editor mode
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders assembly section blocks into #ValeSpec__DocEditor__SectionsContainer
   - Each block shows SVG thumbnail, editable title, spec summary, action buttons
   - Edit Assembly switches to AssemblyEditor mode with selected index
   - Duplicate copies assembly data to a new entry in the project
   - Delete confirms and removes assembly from the project
   - Add New Assembly creates a default assembly entry
   - Reorder via up/down arrows changes Assembly__Identity__Config__SortOrder
   - Expects canonical project/assembly schema from AppUtils ProjectSchemaValidator (via ProjectFileManager)

   ============================================================================= */

// =============================================================================
// REGION | Section Manager Module
// =============================================================================

const ValeSpec__DocEditor__SectionManager = (function() {

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const SECTIONS_CONTAINER_ID           =  'ValeSpec__DocEditor__SectionsContainer';
    const ASSEMBLY_EDITOR_CONFIG_PATH     =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Binding Guard
    // ------------------------------------------------------------
    let ValeSpec__SectionManager__DelegationBound  =  false;   // <-- Prevents duplicate click listeners on re-renders
    let ValeSpec__SectionManager__AssemblyEditorConfig         =  null;   // <-- Cached assembly editor config JSON
    let ValeSpec__SectionManager__AssemblyEditorConfigPromise  =  null;   // <-- Shared in-flight config request
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


    // HELPER FUNCTION | Read Door Type String from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__GetDoorTypeValue(assembly) {
        var doorConfig  =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  doorConfig['Assembly__DoorType__Config__Type'];
        return typeof doorType === 'string' ? doorType.trim() : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Assembly is Configured
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__IsAssemblyConfigured(assembly) {
        var doorType  =  ValeSpec__SectionManager__GetDoorTypeValue(assembly);
        if (!doorType) return false;
        var lower  =  doorType.toLowerCase();
        return lower !== 'none' && lower !== '';
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


    // HELPER FUNCTION | Ensure Assembly Editor Config Is Loaded
    // ------------------------------------------------------------
    async function ValeSpec__SectionManager__EnsureAssemblyEditorConfigLoaded() {
        if (ValeSpec__SectionManager__AssemblyEditorConfig) return ValeSpec__SectionManager__AssemblyEditorConfig;
        if (ValeSpec__SectionManager__AssemblyEditorConfigPromise) return ValeSpec__SectionManager__AssemblyEditorConfigPromise;

        ValeSpec__SectionManager__AssemblyEditorConfigPromise  =  fetch(ASSEMBLY_EDITOR_CONFIG_PATH)
            .then(function(response) {
                if (!response.ok) throw new Error('Config fetch failed: ' + response.status);
                return response.json();
            })
            .then(function(data) {
                ValeSpec__SectionManager__AssemblyEditorConfig  =  data || {};
                return ValeSpec__SectionManager__AssemblyEditorConfig;
            })
            .catch(function(e) {
                console.warn('[ValeSpec__SectionManager] Assembly config load failed:', e);
                return null;
            })
            .finally(function() {
                ValeSpec__SectionManager__AssemblyEditorConfigPromise  =  null;
            });

        return ValeSpec__SectionManager__AssemblyEditorConfigPromise;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Door Panel Profile for Door Type
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__GetDoorPanelProfileForType(configData, doorType) {
        var doorDefaults  =  (configData && configData['AssemblyEditor__DoorPanelDefaults__Config']) || {};
        var profileMap    =  doorDefaults['AssemblyEditor__DoorPanelDefaults__Config__DoorTypeProfileMap'] || {};
        var profiles      =  doorDefaults['AssemblyEditor__DoorPanelDefaults__Config__Profiles'] || {};
        var fallbackKey   =  doorDefaults['AssemblyEditor__DoorPanelDefaults__Config__FallbackProfileKey'] || 'DoubleDoors';

        var profileKey    =  profileMap[doorType] || fallbackKey;
        var profile       =  profiles[profileKey] || profiles[fallbackKey];
        if (profile) return profile;

        return {
            'AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'   : 1800,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'  : 2100
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Default Assembly Title
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildDefaultTitle(assembly) {
        var identity  =  assembly['Assembly__Identity__Config'] || {};
        var custom    =  identity['Assembly__Identity__Config__Title'];
        if (custom) return custom;
        if (!ValeSpec__SectionManager__IsAssemblyConfigured(assembly)) {
            return 'Assembly not configured \u2014 start in Edit Assembly';
        }

        var doorCfg     =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  ValeSpec__SectionManager__GetDoorTypeValue(assembly) || 'Door';
        var direction   =  doorCfg['Assembly__DoorType__Config__OpeningDirection'] || '';
        var fullLabel   =  direction ? (direction + ' Opening ' + doorType) : doorType;
        var dimensions  =  assembly['Assembly__Dimensions__Config'] || {};
        var width       =  dimensions['Assembly__Dimensions__Config__WidthMm']  || '\u2014';
        var height      =  dimensions['Assembly__Dimensions__Config__HeightMm'] || '\u2014';
        return fullLabel + ' \u2014 ' + width + ' x ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Default Assembly Progress State
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildDefaultProgressState() {
        return {
            'Assembly__ProgressState__Config__CompletedSteps' : {
                'Assembly__ProgressState__Config__CompletedSteps__DoorType'   : false,
                'Assembly__ProgressState__Config__CompletedSteps__Dimensions' : false,
                'Assembly__ProgressState__Config__CompletedSteps__Finish'     : false,
                'Assembly__ProgressState__Config__CompletedSteps__Handles'    : false,
                'Assembly__ProgressState__Config__CompletedSteps__Hinges'     : false,
                'Assembly__ProgressState__Config__CompletedSteps__Hooks'      : false,
                'Assembly__ProgressState__Config__CompletedSteps__Misc'       : false
            },
            'Assembly__ProgressState__Config__ActiveStepId' : 'doorType'
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Spec Table HTML via Shared SpecTableRenderer
    // ------------------------------------------------------------
    function ValeSpec__SectionManager__BuildSpecSummary(assembly) {
        if (!ValeSpec__SectionManager__IsAssemblyConfigured(assembly)) {
            return '<div class="ValeSpec__DocEditor__SpecSummary ValeSpec__DocEditor__SpecSummary--unconfigured"><span>Configuration not started.</span><span>Click &quot;Edit Assembly&quot; and choose Door Type to begin.</span></div>';
        }

        var SpecTableRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        if (SpecTableRenderer) {
            return SpecTableRenderer.ValeSpec__SpecTableRenderer__RenderSpecTable(assembly);  // <-- Reuse preview-mode spec table
        }

        return '<div class="ValeSpec__DocEditor__SpecSummary"><span>Spec table unavailable</span></div>';
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
        html     +=      '<div class="ValeSpec__DocEditor__SectionTitle" data-index="' + index + '">' + title + '</div>';
        html     +=      '<div class="ValeSpec__DocEditor__SectionBodyRow">';
        html     +=          '<div class="ValeSpec__DocEditor__Thumbnail" id="ValeSpec__DocEditor__Thumb_' + index + '"></div>';
        html     +=          '<div class="ValeSpec__DocEditor__SectionContent">';
        html     +=              ValeSpec__SectionManager__BuildSpecSummary(assembly);
        html     +=          '</div>';
        html     +=      '</div>';
        html     +=      ValeSpec__SectionManager__BuildActionButtons(index);
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
                if (!ValeSpec__SectionManager__IsAssemblyConfigured(assemblies[i])) {
                    thumbContainer.innerHTML  =  '<div class="ValeSpec__DocEditor__ThumbPlaceholder"><div class="ValeSpec__DocEditor__ThumbPlaceholderTitle">Preview not available</div><div class="ValeSpec__DocEditor__ThumbPlaceholderText">Start configuration by choosing a Door Type.</div></div>';
                    continue;
                }

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
        clone['Assembly__ProgressState__Config']  =  ValeSpec__SectionManager__BuildDefaultProgressState(); // <-- Duplicates start unconfigured in workflow progress

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
    async function ValeSpec__SectionManager__HandleAddNewAssembly() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assemblies    =  ValeSpec__SectionManager__GetAssemblies();

        var configData     =  await ValeSpec__SectionManager__EnsureAssemblyEditorConfigLoaded();
        var defaultsCfg    =  (configData && configData['AssemblyEditor__DoorPanelDefaults__Config']) || {};
        var handingCfg     =  (configData && configData['AssemblyEditor__DoorHanding__Config']) || {};
        var defaultDoor    =  defaultsCfg['AssemblyEditor__DoorPanelDefaults__Config__DefaultDoorTypeForNewAssembly'] || 'None';
        var defaultHanding =  handingCfg['AssemblyEditor__DoorHanding__Config__DefaultValue'] || 'Left';
        if (defaultHanding !== 'Right') defaultHanding  =  'Left';
        var profile        =  ValeSpec__SectionManager__GetDoorPanelProfileForType(configData, defaultDoor);

        var widthDefault   =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'], 10)  || 1800;
        var heightDefault  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'], 10) || 2100;

        var newAssembly  =  {
            'Assembly__Identity__Config': {
                'Assembly__Identity__Config__Id'         : 'asm_' + String(Date.now()).slice(-6),
                'Assembly__Identity__Config__Title'      : '',
                'Assembly__Identity__Config__SortOrder'  : assemblies.length
            },
            'Assembly__DoorType__Config': {
                'Assembly__DoorType__Config__Type'              : defaultDoor,
                'Assembly__DoorType__Config__OpeningDirection'  : 'Outward'
            },
            'Assembly__Dimensions__Config': {
                'Assembly__Dimensions__Config__WidthMm'  : widthDefault,
                'Assembly__Dimensions__Config__HeightMm' : heightDefault
            },
            'Handing' : defaultHanding,
            'Assembly__ProgressState__Config' : ValeSpec__SectionManager__BuildDefaultProgressState()
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
