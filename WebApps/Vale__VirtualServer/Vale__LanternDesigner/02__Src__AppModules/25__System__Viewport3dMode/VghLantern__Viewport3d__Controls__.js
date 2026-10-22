/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | CONTROLS MENU
   =============================================================================

   FILE       : VghLantern__Viewport3d__Controls__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - Controls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build and bind the floating tools menu for the 3D View mode
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the tools menu that floats over the full-screen 3D canvas: a titled
     card docked to the right of the viewport, holding five collapsible sections.
   - The Measure section (21-Oct-2026) offers the 3D measure tool's two tools,
     its precision and the dimensions taken. The list is repainted in place from
     the tool's reports (SetMeasurements), never by repainting the card, so a row
     clicked mid-measure is never rebuilt out from under the cursor.
   - Owns no surface and no renderer. It reports user intent back to the Layout
     module through a callback map, so the menu can be rebuilt at will without
     touching the live GL context.
   - Every visible control is gated by the DedicatedViewportMode block of the Env3d
     config, so the menu contents are configuration, not code.
   - Menu position and which sections are open persist per user through
     Viewport3d__MenuDataHandler.

   -----------------------------------------------------------------------------

   WHY IT IS BUILT THIS WAY

   It was a flat stack of six labelled clusters pinned to the top left, and it grew
   past the point a flat stack works: every control in the mode was on screen at
   once, at equal weight, whether or not the reviewer was using it. The clusters are
   now four collapsible sections in a card, on the ValeSpec document menu pattern -
   same header, same rotating caret, same section panel - so the app reads as one
   product and the menu stays legible as more controls arrive.

   Docked RIGHT rather than left, because the model is framed centre-left by the
   camera presets and the reviewer's cursor lives over the model. The setting-out
   key moved to the left as its counterweight.

   WHY THE CALLBACK MAP:
   The menu is markup plus intent. Layout holds the surface handle and decides what
   a preset click actually means. Keeping that split means this module never needs
   to know the pipeline exists, and Layout never needs to parse the DOM.

   ============================================================================= */

// =============================================================================
// REGION | Dedicated 3D Viewport Controls Module
// =============================================================================

const VghLantern__Viewport3d__Controls = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_COLUMN        =  'VghLantern__Viewport3d__MenuColumn';
    const CSS_CARD          =  'VghLantern__Viewport3d__MenuCard';
    const CSS_HEADER        =  'VghLantern__Viewport3d__MenuHeader';
    const CSS_HEADER_LABEL  =  'VghLantern__Viewport3d__MenuHeaderLabel';
    const CSS_DRAG_HANDLE   =  'VghLantern__Viewport3d__MenuDragHandle';
    const CSS_SECTIONS      =  'VghLantern__Viewport3d__MenuSections';
    const CSS_SECTION       =  'VghLantern__Viewport3d__MenuSection';
    const CSS_SECTION_TGL   =  'VghLantern__Viewport3d__MenuSectionToggle';
    const CSS_SECTION_LABEL =  'VghLantern__Viewport3d__MenuSectionLabel';
    const CSS_SECTION_ARROW =  'VghLantern__Viewport3d__MenuSectionArrow';
    const CSS_SECTION_PANEL =  'VghLantern__Viewport3d__MenuSectionPanel';
    const CSS_ICON          =  'VghLantern__Viewport3d__MenuIcon';
    const CSS_ICON_HEADER   =  'VghLantern__Viewport3d__MenuIcon--header';
    const CSS_GROUP         =  'VghLantern__Viewport3d__MenuGroup';
    const CSS_GROUP_LABEL   =  'VghLantern__Viewport3d__MenuGroupLabel';
    const CSS_BTN           =  'VghLantern__Viewport3d__MenuBtn';
    const CSS_BTN_ACTIVE    =  'VghLantern__Viewport3d__MenuBtn--active';
    const CSS_SELECT        =  'VghLantern__Viewport3d__MenuSelect';
    const CSS_READOUT       =  'VghLantern__Viewport3d__MenuReadout';
    const CSS_OPEN          =  'is-open';

    const CSS_BTN_TOOL      =  'VghLantern__Viewport3d__MenuBtn--tool';     // <-- A button with its icon beside its words
    const CSS_BTN_CONFIRM   =  'VghLantern__Viewport3d__MenuBtn--confirm';  // <-- Clear All armed: the second press clears
    const CSS_TOOL_ICON     =  'VghLantern__Viewport3d__MenuToolIcon';
    const CSS_CHOICE_ROW    =  'VghLantern__Viewport3d__MenuChoiceRow';
    const CSS_GROUP_HEAD    =  'VghLantern__Viewport3d__MenuGroupHead';
    const CSS_MEASURE_LIST  =  'VghLantern__Viewport3d__MeasureList';
    const CSS_MEASURE_EMPTY =  'VghLantern__Viewport3d__MeasureEmpty';
    const CSS_ROW           =  'VghLantern__Viewport3d__MeasureRow';
    const CSS_ROW_PICKED    =  'VghLantern__Viewport3d__MeasureRow--selected';
    const CSS_ROW_MAIN      =  'VghLantern__Viewport3d__MeasureRowMain';
    const CSS_ROW_TOP       =  'VghLantern__Viewport3d__MeasureRowTop';
    const CSS_ROW_NUMBER    =  'VghLantern__Viewport3d__MeasureRowNumber';
    const CSS_ROW_VALUE     =  'VghLantern__Viewport3d__MeasureRowValue';
    const CSS_ROW_NOTE      =  'VghLantern__Viewport3d__MeasureRowNote';
    const CSS_ROW_DELETE    =  'VghLantern__Viewport3d__MeasureRowDelete';
    const CSS_AXIS_CHIP     =  'VghLantern__Viewport3d__MeasureAxis';        // <-- + --x | --y | --z | --square | --free
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes and Action Keys
    // ------------------------------------------------------------
    const ATTR_PRESET        =  'data-vgh-preset';
    const ATTR_ACTION        =  'data-vgh-action';
    const ATTR_LANTERN       =  'data-vgh-lantern-select';
    const ATTR_DISPLAY_MODE  =  'data-vgh-display-mode';
    const ATTR_SECTION_MODE  =  'data-vgh-section-mode';
    const ATTR_ELEMENT_VIEW  =  'data-vgh-element-view';
    const ATTR_MENU_SECTION  =  'data-vgh-menu-section';                      // <-- On the section toggle button
    const ATTR_MENU_PANEL    =  'data-vgh-menu-panel';                        // <-- On the panel the toggle opens
    const ATTR_DRAG_HANDLE   =  'data-vgh-menu-drag';
    const ATTR_MEASURE_TOOL  =  'data-vgh-measure-tool';
    const ATTR_PRECISION     =  'data-vgh-measure-precision';
    const ATTR_MEASURE_DO    =  'data-vgh-measure-action';                    // <-- One of the three actions below
    const ATTR_MEASURE_ID    =  'data-vgh-measure-id';

    const ACTION_ZOOM_FIT    =  'zoomExtents';
    const ACTION_CLEAR       =  'clear';                                      // <-- The Measure section's Clear All
    const ACTION_SELECT      =  'select';                                     // <-- A row of the dimensions list
    const ACTION_DELETE      =  'delete';                                     // <-- A row's cross
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Static Copy
    // ------------------------------------------------------------
    const LABEL_MENU_TITLE   =  '3D View Tools';
    const LABEL_DRAG_HINT    =  'Drag to move. Double click to dock right.';

    const LABEL_SEC_DISPLAY  =  'Model Display';
    const LABEL_SEC_CAMERA   =  'Camera';
    const LABEL_SEC_SECTION  =  'Cross Section';
    const LABEL_SEC_LANTERN  =  'Lantern';
    const LABEL_SEC_MEASURE  =  'Measure';

    const LABEL_DISPLAY      =  'Display';
    const LABEL_ELEMENTS     =  'Elements';
    const LABEL_VIEWS        =  'Preset Views';
    const LABEL_TOOLS        =  'Tools';
    const LABEL_LANTERN      =  'Active Lantern';
    const LABEL_FIT          =  'Zoom to Fit';
    const LABEL_MODE_PREFIX  =  'Members: ';
    const LABEL_PRECISION    =  'Precision';
    const LABEL_DIMENSIONS   =  'Dimensions';
    const LABEL_CLEAR_ALL    =  'Clear All';
    const LABEL_CLEAR_ARMED  =  'Press Again to Clear';
    const LABEL_DELETE_ROW   =  'Delete dimension ';
    const LABEL_MEASURE_TIP  =  'How measuring snaps';
    const TIP_MEASURE        =  'measure3d.snapping';                         // <-- Its words are in Na__InfoTooltip__Config.json
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Section Keys
    // ------------------------------------------------------------
    // The four sections the six old clusters were grouped into. Each key is also
    // the persisted field name, minus the MenuSection prefix and Open suffix, so
    // the menu, the user file and the JSON defaults all say the same word.
    const SECTION_DISPLAY  =  'display';
    const SECTION_CAMERA   =  'camera';
    const SECTION_CUT      =  'crossSection';
    const SECTION_LANTERN  =  'lantern';
    const SECTION_MEASURE  =  'measure';

    const PERSIST_FIELD  =  {
        display      : 'MenuSectionDisplayOpen',
        camera       : 'MenuSectionCameraOpen',
        crossSection : 'MenuSectionCrossSectionOpen',
        lantern      : 'MenuSectionLanternOpen',
        measure      : 'MenuSectionMeasureOpen'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Inline Section Icons
    // ------------------------------------------------------------
    // Drawn here rather than loaded as image files: they are four small glyphs, and
    // inline strokes take the brand colour from CSS and stay crisp at any UI scale
    // without an asset to keep in step with the markup.
    const ICON_PATHS  =  {
        menu         : '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h9M17 17h3"/>' +
                       '<circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
        display      : '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5"/>',
        camera       : '<path d="M4 8h3l2-2h6l2 2h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
        crossSection : '<path d="M4 20 20 4"/><path d="M4 20V9l7-5h9v11l-7 5H4Z"/>',
        lantern      : '<path d="M3 19h18"/><path d="M12 5 3 15h18L12 5Z"/><path d="M12 5v10M3 15l9-10 9 10"/>',
        chevron      : '<path d="m6 9 6 6 6-6"/>',
        grip         : '<circle cx="9"  cy="6"  r="1.1"/><circle cx="9"  cy="12" r="1.1"/><circle cx="9"  cy="18" r="1.1"/>' +
                       '<circle cx="15" cy="6"  r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="15" cy="18" r="1.1"/>',
        cross        : '<path d="M7 7l10 10M17 7 7 17"/>',
        measure      : '<path d="M236.7 240.1H369.2A206.5 206.5 0 0 1 575.7 446.6V729.9H226.2A137.7 137.7 0 0 1 88.5 592.3V388.2A148.1 148.1 0 0 1 236.7 240.1Z"/>' +
                       '<path d="M470.1 266.4A39.2 39.2 0 0 1 472 264.4L488 248.4A39.2 39.2 0 0 1 543.4 248.4L592.6 297.6A39.2 39.2 0 0 1 592.6 352.9L576.6 369A39.2 39.2 0 0 1 563.8 377.5"/>' +
                       '<circle cx="332" cy="486.7" r="148.4"/>' +
                       '<polyline points="575.7 621.7 935.7 621.7 935.7 777.6"/>' +
                       '<path d="M575.7 729.9H935.7M636.5 729.9V698.3M696.9 729.9V684.7M757.2 729.9V702.4M817.5 729.9V684.7M877.8 729.9V698.3"/>'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Icon Frames
    // ------------------------------------------------------------
    // Every glyph above is drawn in a 24 unit box at 1.6, except the tape measure:
    // TrueVision's own path data (Icon__MeasureTools__TapeMeasure__.svg, copied
    // unchanged) in its 1024 artboard, where 68 is the same weight as 1.6 here, so
    // the five section icons read as one set.
    const ICON_FRAME_DEFAULT  =  { ViewBox : '0 0 24 24',     StrokeWidth : 1.6 };
    const ICON_FRAMES         =  { measure : { ViewBox : '0 0 1024 1024', StrokeWidth : 68 } };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Context Label
    // ------------------------------------------------------------
    const MODE_CONFIG_LABEL  =  'Na__Env3d__Config.json -> VghLantern__Env3d__Config__DedicatedViewportMode';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Menu References and Callback Map
    // ------------------------------------------------------------
    let VghLantern__Viewport3dControls__HostElement   =  null;                // <-- Menu column this module owns
    let VghLantern__Viewport3dControls__Callbacks     =  {};                  // <-- Intent handlers supplied by Layout
    let VghLantern__Viewport3dControls__ActivePreset  =  '';                  // <-- Preset key currently highlighted
    let VghLantern__Viewport3dControls__ActiveDisplay =  '';                  // <-- Display mode key currently highlighted
    let VghLantern__Viewport3dControls__ActiveSection =  '';                  // <-- Cross section cut key currently highlighted
    let VghLantern__Viewport3dControls__ActiveElement =  '';                  // <-- Element view key currently highlighted
    let VghLantern__Viewport3dControls__IsBound       =  false;               // <-- Guards duplicate delegated listeners
    let VghLantern__Viewport3dControls__PrefsRequested=  false;               // <-- Guards a second load of the user file
    let VghLantern__Viewport3dControls__ActiveTool    =  '';                  // <-- Measure tool currently on ('' for none)
    let VghLantern__Viewport3dControls__ActiveDecimal =  '';                  // <-- Measure precision key currently highlighted
    let VghLantern__Viewport3dControls__MeasureRows   =  [];                  // <-- The dimensions taken, as the tool last reported them
    let VghLantern__Viewport3dControls__MeasureRev    =  -1;                  // <-- The list revision those rows came from
    let VghLantern__Viewport3dControls__ClearArmed    =  false;               // <-- Clear All pressed once and waiting for the second
    let VghLantern__Viewport3dControls__ClearTimerId  =  null;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Menu State
    // ------------------------------------------------------------
    // Three layers, applied in order: these pre-config values, then the app config
    // block, then the user file once it arrives. The literals here are only what
    // holds in the instant before config resolves - which sections a first run
    // opens with is a JSON edit, in
    // VghLantern__AppData__UserMenuConfig__Defaults__.json.
    let VghLantern__Viewport3dControls__SectionOpen  =  {
        display      : true,
        camera       : true,
        crossSection : false,
        lantern      : false,
        measure      : false
    };

    let VghLantern__Viewport3dControls__MenuPosition  =  { left : null, top : null };
    let VghLantern__Viewport3dControls__PersistPos    =  true;
    let VghLantern__Viewport3dControls__PersistOpen   =  true;
    let VghLantern__Viewport3dControls__Drag          =  { isDragging : false, offsetX : 0, offsetY : 0 };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Dedicated Viewport Mode Config Block
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__ModeConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var env3dCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Env3d') || {};
        return env3dCfg['VghLantern__Env3d__Config__DedicatedViewportMode'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Current Project's Lantern Array
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__Lanterns() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return [];

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return [];

        return project['VghLantern__ProjectFile__Lanterns'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Attribute and Content Use
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get One Block of the Measure Tool's Config
    // ------------------------------------------------------------
    // Na__Measure3d__Config.json, merged by ConfigLoader. Only the menu's own words
    // and timing are read here; what the tool does is the pipeline's business.
    function VghLantern__Viewport3dControls__MeasureConfig(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader || !ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig) return {};

        var root  =  (ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig() || {})['VghLantern__Measure3d__Config'] || {};
        return root['VghLantern__Measure3d__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Persisted Menu Preferences
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Menu Data Handler, If It Loaded
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__MenuData() {
        return window.VghLantern__Viewport3d__MenuDataHandler || null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fold One Menu State Over What the Menu Currently Holds
    // ------------------------------------------------------------
    // A state states only the fields its block carried, so applying the config
    // defaults and then the user file leaves anything the user has never touched on
    // its configured value rather than on nothing.
    function VghLantern__Viewport3dControls__ApplyMenuState(state) {
        if (!state) return;

        VghLantern__Viewport3dControls__PersistPos   =  state.persistMenuPosition !== false;
        VghLantern__Viewport3dControls__PersistOpen  =  state.persistSections     !== false;

        // The two Persist switches are read as "restore this", not only as "save
        // this": a user who has turned one off wants the menu to open the way the
        // config says every time, so a stored value is skipped rather than applied.
        if (VghLantern__Viewport3dControls__PersistOpen) {
            var keys  =  Object.keys(PERSIST_FIELD);
            for (var i = 0; i < keys.length; i++) {
                var value  =  state[PERSIST_FIELD[keys[i]]];
                if (typeof value === 'boolean') VghLantern__Viewport3dControls__SectionOpen[keys[i]]  =  value;
            }
        }

        if (VghLantern__Viewport3dControls__PersistPos &&
            typeof state.MenuPositionX === 'number' && typeof state.MenuPositionY === 'number') {
            VghLantern__Viewport3dControls__MenuPosition.left  =  state.MenuPositionX;
            VghLantern__Viewport3dControls__MenuPosition.top   =  state.MenuPositionY;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rebuild the Menu State From Config, Then From the User File
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__RefreshMenuState() {
        var MenuData  =  VghLantern__Viewport3dControls__MenuData();
        if (!MenuData) return;

        VghLantern__Viewport3dControls__ApplyMenuState(
            MenuData.VghLantern__Viewport3d__MenuDataHandler__GetMenuStateDefaults());
        VghLantern__Viewport3dControls__ApplyMenuState(
            MenuData.VghLantern__Viewport3d__MenuDataHandler__GetMenuStateOverride());
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load the User File Once, Then Repaint the Menu
    // ------------------------------------------------------------
    // The menu paints from defaults first and corrects itself when the file lands,
    // which is what keeps the 3D view instant on a slow or absent server.
    function VghLantern__Viewport3dControls__RequestPersistedState() {
        var MenuData  =  VghLantern__Viewport3dControls__MenuData();
        if (!MenuData || VghLantern__Viewport3dControls__PrefsRequested) return;

        VghLantern__Viewport3dControls__PrefsRequested  =  true;

        MenuData.VghLantern__Viewport3d__MenuDataHandler__EnsureLoaded().then(function() {
            VghLantern__Viewport3dControls__RefreshMenuState();
            VghLantern__Viewport3dControls__Paint();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Save of the Menu State
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__QueueSave(patch) {
        var MenuData  =  VghLantern__Viewport3dControls__MenuData();
        if (!MenuData) return;

        MenuData.VghLantern__Viewport3d__MenuDataHandler__QueuePersistMenuPatch(patch);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Markup Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Inline Icon
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildIcon(iconKey, extraClass) {
        var paths  =  ICON_PATHS[iconKey];
        if (!paths) return '';

        var frame  =  ICON_FRAMES[iconKey] || ICON_FRAME_DEFAULT;

        return '<svg class="' + CSS_ICON + (extraClass ? ' ' + extraClass : '') + '" viewBox="' + frame.ViewBox + '"' +
               ' fill="none" stroke="currentColor" stroke-width="' + frame.StrokeWidth + '" stroke-linecap="round"' +
               ' stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Labelled Control Cluster
    // ------------------------------------------------------------
    // A section panel holds one or two of these. The label is what the old flat
    // overlay called a group caption, kept because two clusters can share a section
    // and the reader still needs to know which is which.
    function VghLantern__Viewport3dControls__BuildGroup(labelText, innerHtml) {
        if (!innerHtml) return '';

        return '<div class="' + CSS_GROUP + '">' +
               '<span class="' + CSS_GROUP_LABEL + '">' + VghLantern__Viewport3dControls__Escape(labelText) + '</span>' +
               innerHtml +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Stack of Choice Buttons From a Pipeline List
    // ------------------------------------------------------------
    // Every cluster in this menu is the same shape - a list of {Key, Label} asked of
    // the pipeline, one button each, one of them active - so they are all built
    // here. A view, preset, mode or cut added to config appears in the menu with no
    // edit to this module.
    function VghLantern__Viewport3dControls__BuildChoiceStack(items, attributeName, activeKey) {
        var html  =  '';
        var i, item, itemKey, itemLabel, activeClass;

        for (i = 0; i < items.length; i++) {
            item       =  items[i];
            itemKey    =  (typeof item === 'string') ? item : item.Key;
            itemLabel  =  (typeof item === 'string') ? item : (item.Label || item.Key);
            activeClass=  (itemKey === activeKey) ? ' ' + CSS_BTN_ACTIVE : '';

            html  +=  '<button type="button" class="' + CSS_BTN + activeClass + '"' +
                      ' ' + attributeName + '="' + VghLantern__Viewport3dControls__Escape(itemKey) + '">' +
                      VghLantern__Viewport3dControls__Escape(itemLabel) +
                      '</button>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Display Mode Cluster
    // ------------------------------------------------------------
    // Switches between the finished model and the setting-out view - the datums and
    // construction triangles the factory works to.
    function VghLantern__Viewport3dControls__BuildDisplayGroup(modeConfig) {
        if (modeConfig.ShowDisplayModeToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListDisplayModes) return '';

        var modes  =  pipeline.VghLantern__Env3d__RenderPipeline__ListDisplayModes() || [];
        if (!modes.length) return '';

        return VghLantern__Viewport3dControls__BuildGroup(LABEL_DISPLAY,
            VghLantern__Viewport3dControls__BuildChoiceStack(
                modes, ATTR_DISPLAY_MODE, VghLantern__Viewport3dControls__ActiveDisplay));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Element View Cluster
    // ------------------------------------------------------------
    // Distinct from the display mode above it: that one chooses between solid
    // geometry and setting-out linework, this one chooses which elements of the
    // solid model are drawn, and the two are usable together. They share a section
    // because a reviewer stripping the model back reaches for both in one go.
    function VghLantern__Viewport3dControls__BuildElementGroup(modeConfig) {
        if (modeConfig.ShowElementViewToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListElementViews) return '';

        var views  =  pipeline.VghLantern__Env3d__RenderPipeline__ListElementViews() || [];
        if (!views.length) return '';

        return VghLantern__Viewport3dControls__BuildGroup(LABEL_ELEMENTS,
            VghLantern__Viewport3dControls__BuildChoiceStack(
                views, ATTR_ELEMENT_VIEW, VghLantern__Viewport3dControls__ActiveElement));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Camera Preset Cluster
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildPresetGroup() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListPresets) return '';

        var presets  =  pipeline.VghLantern__Env3d__RenderPipeline__ListPresets() || [];
        if (!presets.length) return '';

        return VghLantern__Viewport3dControls__BuildGroup(LABEL_VIEWS,
            VghLantern__Viewport3dControls__BuildChoiceStack(
                presets, ATTR_PRESET, VghLantern__Viewport3dControls__ActivePreset));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Cross Section Cluster
    // ------------------------------------------------------------
    // Three states rather than a checkbox, because "no cut" is a view in its own
    // right and reads better as the button a reviewer returns to than as an
    // un-ticked box. Comes back empty when the feature is switched off in
    // Na__CrossSection__Config.json, which leaves no section rather than an inert one.
    function VghLantern__Viewport3dControls__BuildSectionGroup(modeConfig) {
        if (modeConfig.ShowCrossSectionToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListSectionModes) return '';

        var modes  =  pipeline.VghLantern__Env3d__RenderPipeline__ListSectionModes() || [];
        if (!modes.length) return '';

        return VghLantern__Viewport3dControls__BuildChoiceStack(
            modes, ATTR_SECTION_MODE, VghLantern__Viewport3dControls__ActiveSection);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Tool Cluster
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildToolGroup(modeConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(modeConfig, 'ShowZoomExtents', MODE_CONFIG_LABEL)) return '';

        return VghLantern__Viewport3dControls__BuildGroup(LABEL_TOOLS,
            '<button type="button" class="' + CSS_BTN + '" ' + ATTR_ACTION + '="' + ACTION_ZOOM_FIT + '">' +
            LABEL_FIT + '</button>');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Lantern Selector Cluster
    // ------------------------------------------------------------
    // Only rendered when the project actually holds more than one lantern; a single
    // lantern job gets no redundant dropdown.
    function VghLantern__Viewport3dControls__BuildLanternGroup(modeConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(modeConfig, 'ShowLanternSelector', MODE_CONFIG_LABEL)) return '';

        var lanterns  =  VghLantern__Viewport3dControls__Lanterns();
        if (lanterns.length < 2) return '';

        var StateManager   =  window.VghLantern__AppCore__StateManager;
        var state          =  StateManager ? StateManager.VghLantern__StateManager__GetState() : {};
        var activeIndex    =  typeof state.currentLanternIndex === 'number' ? state.currentLanternIndex : 0;

        var options  =  '<select class="' + CSS_SELECT + '" ' + ATTR_LANTERN + '="1">';

        var i, identity, label, selected;
        for (i = 0; i < lanterns.length; i++) {
            identity  =  lanterns[i] ? lanterns[i]['Lantern__Identity__Config'] : null;
            label     =  (identity && identity['Lantern__Identity__Config__Title'])
                ? identity['Lantern__Identity__Config__Title']
                : 'Lantern ' + (i + 1);                                       // <-- Same fallback the editor tab strip uses
            selected  =  (i === activeIndex) ? ' selected' : '';

            options  +=  '<option value="' + i + '"' + selected + '>' +
                         VghLantern__Viewport3dControls__Escape(label) + '</option>';
        }

        return VghLantern__Viewport3dControls__BuildGroup(LABEL_LANTERN, options + '</select>');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Skeleton Mode Readout
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildModeReadout(modeConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(modeConfig, 'ShowSkeletonModeLabel', MODE_CONFIG_LABEL)) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ActiveSkeletonMode) return '';

        var mode  =  pipeline.VghLantern__Env3d__RenderPipeline__ActiveSkeletonMode();
        if (!mode) return '';

        return '<span class="' + CSS_READOUT + '">' +
               LABEL_MODE_PREFIX + VghLantern__Viewport3dControls__Escape(mode) +
               '</span>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Dimensions List's Rows
    // ------------------------------------------------------------
    // One row per dimension taken: its number, value and the axis it snapped to on
    // the first line, then the parts it runs between, and for a free one its X Y Z
    // parts. A row selects its dimension on the model; its cross removes it.
    function VghLantern__Viewport3dControls__BuildMeasureRows() {
        var E     =  VghLantern__Viewport3dControls__Escape;
        var rows  =  VghLantern__Viewport3dControls__MeasureRows;

        if (!rows.length) {
            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var emptyText     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                VghLantern__Viewport3dControls__MeasureConfig('Copy'), 'EmptyList',
                'Na__Measure3d__Config.json -> VghLantern__Measure3d__Config__Copy');
            return '<span class="' + CSS_MEASURE_EMPTY + '">' + E(emptyText) + '</span>';
        }

        var html  =  '';
        var i, row;
        for (i = 0; i < rows.length; i++) {
            row  =  rows[i];

            html  +=  '<div class="' + CSS_ROW + (row.IsSelected ? ' ' + CSS_ROW_PICKED : '') + '">';
            html  +=      '<button type="button" class="' + CSS_ROW_MAIN + '" ' + ATTR_MEASURE_DO + '="' + ACTION_SELECT + '"' +
                          ' ' + ATTR_MEASURE_ID + '="' + E(row.Id) + '" aria-pressed="' + (row.IsSelected ? 'true' : 'false') + '">';
            html  +=          '<span class="' + CSS_ROW_TOP + '">' +
                              '<span class="' + CSS_ROW_NUMBER + '">' + E(row.Number) + '</span>' +
                              '<span class="' + CSS_ROW_VALUE + '">' + E(row.ValueText) + '</span>' +
                              '<span class="' + CSS_AXIS_CHIP + ' ' + CSS_AXIS_CHIP + '--' + E(row.AxisKey) + '">' + E(row.AxisChip) + '</span>' +
                              '</span>';
            if (row.Between) html  +=  '<span class="' + CSS_ROW_NOTE + '">' + E(row.Between) + '</span>';
            if (row.Parts)   html  +=  '<span class="' + CSS_ROW_NOTE + '">' + E(row.Parts) + '</span>';
            html  +=      '</button>';
            html  +=      '<button type="button" class="' + CSS_ROW_DELETE + '" ' + ATTR_MEASURE_DO + '="' + ACTION_DELETE + '"' +
                          ' ' + ATTR_MEASURE_ID + '="' + E(row.Id) + '" aria-label="' + E(LABEL_DELETE_ROW + row.Number) + '">' +
                          VghLantern__Viewport3dControls__BuildIcon('cross') + '</button>';
            html  +=  '</div>';
        }
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Clear All Button
    // ------------------------------------------------------------
    // Asks twice, as TrueVision's does, so one slip cannot wipe an audit: the first
    // press arms it (red, "Press Again to Clear") and it stands down by itself.
    function VghLantern__Viewport3dControls__BuildClearButton() {
        var pipeline   =  window.VghLantern__Env3d__RenderPipeline;
        var iconUrl    =  (pipeline && pipeline.VghLantern__Env3d__RenderPipeline__MeasureClearIcon)
            ? pipeline.VghLantern__Env3d__RenderPipeline__MeasureClearIcon() : '';
        var isArmed    =  VghLantern__Viewport3dControls__ClearArmed;
        var isEmpty    =  VghLantern__Viewport3dControls__MeasureRows.length === 0;

        return '<button type="button" class="' + CSS_BTN + ' ' + CSS_BTN_TOOL + (isArmed ? ' ' + CSS_BTN_CONFIRM : '') + '"' +
               ' ' + ATTR_MEASURE_DO + '="' + ACTION_CLEAR + '"' + (isEmpty ? ' disabled' : '') + '>' +
               (iconUrl ? '<img class="' + CSS_TOOL_ICON + '" src="' + VghLantern__Viewport3dControls__Escape(iconUrl) + '" alt="" aria-hidden="true" draggable="false">' : '') +
               '<span>' + (isArmed ? LABEL_CLEAR_ARMED : LABEL_CLEAR_ALL) + '</span>' +
               '</button>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Measure Section
    // ------------------------------------------------------------
    // Adam: "Add a dimension tool section to the 3D Tab menu - Vertex to vertex
    // measurement tool - Face to face measurement tool. Measure in 1mm but have the
    // ability to also change to 0.00mm". The tools carry TrueVision's measure icons;
    // how the snapping works sits behind the Vale "i", not as text in the panel.
    // Comes back empty when the tool is switched off in config, which leaves no
    // section rather than an inert one.
    function VghLantern__Viewport3dControls__BuildMeasureBody(modeConfig) {
        if (modeConfig.ShowMeasureTools === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListMeasureTools) return '';

        var tools  =  pipeline.VghLantern__Env3d__RenderPipeline__ListMeasureTools() || [];
        if (!tools.length) return '';

        var E           =  VghLantern__Viewport3dControls__Escape;
        var precisions  =  pipeline.VghLantern__Env3d__RenderPipeline__ListMeasurePrecisions
            ? (pipeline.VghLantern__Env3d__RenderPipeline__ListMeasurePrecisions() || []) : [];

        var toolHtml  =  '';
        var i, tool, activeClass;
        for (i = 0; i < tools.length; i++) {
            tool         =  tools[i];
            activeClass  =  (tool.Key === VghLantern__Viewport3dControls__ActiveTool) ? ' ' + CSS_BTN_ACTIVE : '';

            toolHtml  +=  '<button type="button" class="' + CSS_BTN + ' ' + CSS_BTN_TOOL + activeClass + '"' +
                          ' ' + ATTR_MEASURE_TOOL + '="' + E(tool.Key) + '">' +
                          (tool.Icon ? '<img class="' + CSS_TOOL_ICON + '" src="' + E(tool.Icon) + '" alt="" aria-hidden="true" draggable="false">' : '') +
                          '<span>' + E(tool.Label) + '</span>' +
                          '</button>';
        }

        var InfoTooltip  =  window.VghLantern__AppCore__InfoTooltip;
        var tipHtml      =  (InfoTooltip && InfoTooltip.VghLantern__InfoTooltip__IconMarkup)
            ? InfoTooltip.VghLantern__InfoTooltip__IconMarkup(TIP_MEASURE, LABEL_MEASURE_TIP, '') : '';

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + ' ' + CSS_GROUP_HEAD + '">' + E(LABEL_TOOLS) + tipHtml + '</span>' +
                     toolHtml +
                     '</div>';

        if (precisions.length) {
            html  +=  VghLantern__Viewport3dControls__BuildGroup(LABEL_PRECISION,
                '<div class="' + CSS_CHOICE_ROW + '">' +
                VghLantern__Viewport3dControls__BuildChoiceStack(precisions, ATTR_PRECISION, VghLantern__Viewport3dControls__ActiveDecimal) +
                '</div>');
        }

        html  +=  VghLantern__Viewport3dControls__BuildGroup(LABEL_DIMENSIONS,
            '<div class="' + CSS_MEASURE_LIST + '">' + VghLantern__Viewport3dControls__BuildMeasureRows() + '</div>' +
            VghLantern__Viewport3dControls__BuildClearButton());

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Collapsible Section
    // ------------------------------------------------------------
    // A section with no body is not rendered at all. That is what lets a config
    // switch or a single-lantern project remove a whole heading rather than leave an
    // empty one that opens onto nothing.
    function VghLantern__Viewport3dControls__BuildSection(sectionKey, iconKey, titleText, bodyHtml) {
        if (!bodyHtml) return '';

        var isOpen     =  VghLantern__Viewport3dControls__SectionOpen[sectionKey] !== false;
        var openClass  =  isOpen ? ' ' + CSS_OPEN : '';

        var html  =  '<section class="' + CSS_SECTION + '">';
        html     +=      '<button type="button" class="' + CSS_SECTION_TGL + openClass + '"' +
                         ' ' + ATTR_MENU_SECTION + '="' + sectionKey + '"' +
                         ' aria-expanded="' + (isOpen ? 'true' : 'false') + '">';
        html     +=          VghLantern__Viewport3dControls__BuildIcon(iconKey);
        html     +=          '<span class="' + CSS_SECTION_LABEL + '">' + VghLantern__Viewport3dControls__Escape(titleText) + '</span>';
        html     +=          '<span class="' + CSS_SECTION_ARROW + '">' + VghLantern__Viewport3dControls__BuildIcon('chevron') + '</span>';
        html     +=      '</button>';
        html     +=      '<div class="' + CSS_SECTION_PANEL + openClass + '" ' + ATTR_MENU_PANEL + '="' + sectionKey + '">';
        html     +=          bodyHtml;
        html     +=      '</div>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Whole Menu Card
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildCard(modeConfig) {
        var displayBody  =  VghLantern__Viewport3dControls__BuildDisplayGroup(modeConfig) +
                            VghLantern__Viewport3dControls__BuildElementGroup(modeConfig);

        var cameraBody   =  VghLantern__Viewport3dControls__BuildPresetGroup() +
                            VghLantern__Viewport3dControls__BuildToolGroup(modeConfig);

        var cutBody      =  VghLantern__Viewport3dControls__BuildSectionGroup(modeConfig);

        var lanternBody  =  VghLantern__Viewport3dControls__BuildLanternGroup(modeConfig) +
                            VghLantern__Viewport3dControls__BuildModeReadout(modeConfig);

        var measureBody  =  VghLantern__Viewport3dControls__BuildMeasureBody(modeConfig);

        // Measure sits with the other ways of looking at the model, above Lantern,
        // which says which lantern is on screen and stays last.
        var sections  =  VghLantern__Viewport3dControls__BuildSection(SECTION_DISPLAY, 'display',      LABEL_SEC_DISPLAY, displayBody) +
                         VghLantern__Viewport3dControls__BuildSection(SECTION_CAMERA,  'camera',       LABEL_SEC_CAMERA,  cameraBody)  +
                         VghLantern__Viewport3dControls__BuildSection(SECTION_CUT,     'crossSection', LABEL_SEC_SECTION, cutBody)     +
                         VghLantern__Viewport3dControls__BuildSection(SECTION_MEASURE, 'measure',      LABEL_SEC_MEASURE, measureBody) +
                         VghLantern__Viewport3dControls__BuildSection(SECTION_LANTERN, 'lantern',      LABEL_SEC_LANTERN, lanternBody);

        if (!sections) return '';                                             // <-- Nothing to show: no empty card over the model

        var html  =  '<div class="' + CSS_CARD + '">';
        html     +=      '<div class="' + CSS_HEADER + '">';
        html     +=          VghLantern__Viewport3dControls__BuildIcon('menu', CSS_ICON_HEADER);
        html     +=          '<span class="' + CSS_HEADER_LABEL + '">' + LABEL_MENU_TITLE + '</span>';
        html     +=          '<button type="button" class="' + CSS_DRAG_HANDLE + '" ' + ATTR_DRAG_HANDLE + '="1"' +
                             ' title="' + LABEL_DRAG_HINT + '" aria-label="' + LABEL_DRAG_HINT + '">';
        html     +=              VghLantern__Viewport3dControls__BuildIcon('grip');
        html     +=          '</button>';
        html     +=      '</div>';
        html     +=      '<div class="' + CSS_SECTIONS + '">' + sections + '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Position
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Viewport Container the Menu Floats Over
    // ------------------------------------------------------------
    // Position is held against the container rather than the window, so the menu
    // keeps its place on the canvas whatever the app chrome around it does.
    function VghLantern__Viewport3dControls__Container() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        return hostElement ? hostElement.parentElement : null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Clamp a Position Inside the Container
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__ClampPosition(leftPx, topPx) {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        var container    =  VghLantern__Viewport3dControls__Container();
        if (!hostElement || !container) return { left : leftPx, top : topPx };

        var margin      =  8;
        var hostWidth   =  hostElement.offsetWidth  || 280;
        var hostHeight  =  hostElement.offsetHeight || 320;
        var maxLeft     =  Math.max(margin, container.clientWidth  - hostWidth  - margin);
        var maxTop      =  Math.max(margin, container.clientHeight - hostHeight - margin);

        return {
            left : Math.min(Math.max(leftPx, margin), maxLeft),
            top  : Math.min(Math.max(topPx,  margin), maxTop)
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Push the Held Position Onto the Element
    // ------------------------------------------------------------
    // With no held position the element keeps its docked corner from the stylesheet,
    // which is the one place the default lives.
    function VghLantern__Viewport3dControls__ApplyPosition() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var held  =  VghLantern__Viewport3dControls__MenuPosition;

        if (typeof held.left !== 'number' || typeof held.top !== 'number') {
            hostElement.style.left   =  '';
            hostElement.style.top    =  '';
            hostElement.style.right  =  '';
            return;
        }

        var clamped  =  VghLantern__Viewport3dControls__ClampPosition(held.left, held.top);
        held.left  =  clamped.left;
        held.top   =  clamped.top;

        hostElement.style.left   =  clamped.left + 'px';
        hostElement.style.top    =  clamped.top + 'px';
        hostElement.style.right  =  'auto';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Track a Drag in Progress
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__OnDragMove(ev) {
        if (!VghLantern__Viewport3dControls__Drag.isDragging) return;

        var container  =  VghLantern__Viewport3dControls__Container();
        if (!container) return;

        var containerRect  =  container.getBoundingClientRect();
        var clamped        =  VghLantern__Viewport3dControls__ClampPosition(
            ev.clientX - containerRect.left - VghLantern__Viewport3dControls__Drag.offsetX,
            ev.clientY - containerRect.top  - VghLantern__Viewport3dControls__Drag.offsetY
        );

        VghLantern__Viewport3dControls__MenuPosition.left  =  Math.round(clamped.left);
        VghLantern__Viewport3dControls__MenuPosition.top   =  Math.round(clamped.top);
        VghLantern__Viewport3dControls__ApplyPosition();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | End a Drag and Save Where It Landed
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__OnDragEnd() {
        var wasDragging  =  VghLantern__Viewport3dControls__Drag.isDragging;
        VghLantern__Viewport3dControls__Drag.isDragging  =  false;

        document.removeEventListener('mousemove', VghLantern__Viewport3dControls__OnDragMove);
        document.removeEventListener('mouseup',   VghLantern__Viewport3dControls__OnDragEnd);

        if (!wasDragging || !VghLantern__Viewport3dControls__PersistPos) return;

        VghLantern__Viewport3dControls__QueueSave({
            MenuPositionX : VghLantern__Viewport3dControls__MenuPosition.left,
            MenuPositionY : VghLantern__Viewport3dControls__MenuPosition.top
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Return the Menu to Its Docked Corner
    // ------------------------------------------------------------
    // Saves nulls rather than the docked coordinates, so the menu follows the
    // stylesheet's corner rather than freezing at wherever that corner is today.
    function VghLantern__Viewport3dControls__DockMenu() {
        VghLantern__Viewport3dControls__MenuPosition.left  =  null;
        VghLantern__Viewport3dControls__MenuPosition.top   =  null;
        VghLantern__Viewport3dControls__ApplyPosition();

        if (!VghLantern__Viewport3dControls__PersistPos) return;
        VghLantern__Viewport3dControls__QueueSave({ MenuPositionX : null, MenuPositionY : null });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Open or Close One Section
    // ------------------------------------------------------------
    // Toggled in place rather than by repainting the card, so a click never rebuilds
    // the lantern selector out from under the user's cursor.
    function VghLantern__Viewport3dControls__ToggleSection(sectionKey, toggleElement) {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement || !PERSIST_FIELD[sectionKey]) return;

        var nextOpen  =  !(VghLantern__Viewport3dControls__SectionOpen[sectionKey] !== false);
        VghLantern__Viewport3dControls__SectionOpen[sectionKey]  =  nextOpen;

        var panel  =  hostElement.querySelector('[' + ATTR_MENU_PANEL + '="' + sectionKey + '"]');
        if (panel) panel.classList.toggle(CSS_OPEN, nextOpen);

        toggleElement.classList.toggle(CSS_OPEN, nextOpen);
        toggleElement.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');

        if (!VghLantern__Viewport3dControls__PersistOpen) return;

        var patch  =  {};
        patch[PERSIST_FIELD[sectionKey]]  =  nextOpen;
        VghLantern__Viewport3dControls__QueueSave(patch);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Delegated Menu Interaction
    // ------------------------------------------------------------
    // Delegated once onto the menu column, which survives every repaint, so
    // rebuilding the card never leaks listeners.
    function VghLantern__Viewport3dControls__BindDelegated() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement || VghLantern__Viewport3dControls__IsBound) return;

        hostElement.addEventListener('click', function(ev) {
            var sectionToggle  =  ev.target.closest('[' + ATTR_MENU_SECTION + ']');
            if (sectionToggle) {
                ev.preventDefault();
                VghLantern__Viewport3dControls__ToggleSection(sectionToggle.getAttribute(ATTR_MENU_SECTION), sectionToggle);
                return;
            }

            var presetEl  =  ev.target.closest('[' + ATTR_PRESET + ']');
            if (presetEl) {
                VghLantern__Viewport3dControls__Invoke('OnPreset', presetEl.getAttribute(ATTR_PRESET));
                return;
            }

            var displayEl  =  ev.target.closest('[' + ATTR_DISPLAY_MODE + ']');
            if (displayEl) {
                VghLantern__Viewport3dControls__Invoke('OnDisplayMode', displayEl.getAttribute(ATTR_DISPLAY_MODE));
                return;
            }

            var elementEl  =  ev.target.closest('[' + ATTR_ELEMENT_VIEW + ']');
            if (elementEl) {
                VghLantern__Viewport3dControls__Invoke('OnElementView', elementEl.getAttribute(ATTR_ELEMENT_VIEW));
                return;
            }

            var sectionEl  =  ev.target.closest('[' + ATTR_SECTION_MODE + ']');
            if (sectionEl) {
                VghLantern__Viewport3dControls__Invoke('OnSectionMode', sectionEl.getAttribute(ATTR_SECTION_MODE));
                return;
            }

            var measureToolEl  =  ev.target.closest('[' + ATTR_MEASURE_TOOL + ']');
            if (measureToolEl) {
                VghLantern__Viewport3dControls__Invoke('OnMeasureTool', measureToolEl.getAttribute(ATTR_MEASURE_TOOL));
                return;
            }

            var precisionEl  =  ev.target.closest('[' + ATTR_PRECISION + ']');
            if (precisionEl) {
                VghLantern__Viewport3dControls__Invoke('OnMeasurePrecision', precisionEl.getAttribute(ATTR_PRECISION));
                return;
            }

            var measureEl  =  ev.target.closest('[' + ATTR_MEASURE_DO + ']');
            if (measureEl) {
                VghLantern__Viewport3dControls__OnMeasureAction(measureEl);
                return;
            }

            var actionEl  =  ev.target.closest('[' + ATTR_ACTION + ']');
            if (actionEl && actionEl.getAttribute(ATTR_ACTION) === ACTION_ZOOM_FIT) {
                VghLantern__Viewport3dControls__Invoke('OnZoomExtents');
            }
        });

        hostElement.addEventListener('change', function(ev) {
            var selectEl  =  ev.target.closest('[' + ATTR_LANTERN + ']');
            if (!selectEl) return;
            VghLantern__Viewport3dControls__Invoke('OnLanternSelected', parseInt(selectEl.value, 10));
        });

        // Drag is bound to the column too, so the handle inside a repainted card is
        // picked up without rebinding.
        hostElement.addEventListener('mousedown', function(ev) {
            var handle  =  ev.target.closest('[' + ATTR_DRAG_HANDLE + ']');
            if (!handle || ev.button !== 0) return;

            var container  =  VghLantern__Viewport3dControls__Container();
            if (!container) return;

            ev.preventDefault();
            var hostRect  =  hostElement.getBoundingClientRect();

            VghLantern__Viewport3dControls__Drag.isDragging  =  true;
            VghLantern__Viewport3dControls__Drag.offsetX     =  ev.clientX - hostRect.left;
            VghLantern__Viewport3dControls__Drag.offsetY     =  ev.clientY - hostRect.top;

            document.addEventListener('mousemove', VghLantern__Viewport3dControls__OnDragMove);
            document.addEventListener('mouseup',   VghLantern__Viewport3dControls__OnDragEnd);
        });

        hostElement.addEventListener('dblclick', function(ev) {
            if (!ev.target.closest('[' + ATTR_DRAG_HANDLE + ']')) return;
            ev.preventDefault();
            VghLantern__Viewport3dControls__DockMenu();
        });

        VghLantern__Viewport3dControls__IsBound  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Act on a Measure Section Button
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__OnMeasureAction(buttonEl) {
        var action  =  buttonEl.getAttribute(ATTR_MEASURE_DO);
        var id      =  buttonEl.getAttribute(ATTR_MEASURE_ID) || '';

        if (action === ACTION_CLEAR) {
            VghLantern__Viewport3dControls__ArmOrClear();
            return;
        }
        if (action === ACTION_DELETE) {
            VghLantern__Viewport3dControls__Invoke('OnMeasureDelete', id);
            return;
        }
        if (action === ACTION_SELECT) {
            var isPicked  =  buttonEl.getAttribute('aria-pressed') === 'true';
            VghLantern__Viewport3dControls__Invoke('OnMeasureSelect', isPicked ? '' : id);   // <-- A second click on a picked row lets it go
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Swap the Clear All Button for a Fresh One, in Place
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__RefreshClearButton() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var current  =  hostElement.querySelector('[' + ATTR_MEASURE_DO + '="' + ACTION_CLEAR + '"]');
        if (!current) return;

        var holder  =  document.createElement('div');
        holder.innerHTML  =  VghLantern__Viewport3dControls__BuildClearButton();
        if (holder.firstChild) current.parentNode.replaceChild(holder.firstChild, current);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stand Clear All Down
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__DisarmClear() {
        if (VghLantern__Viewport3dControls__ClearTimerId) clearTimeout(VghLantern__Viewport3dControls__ClearTimerId);
        VghLantern__Viewport3dControls__ClearTimerId  =  null;

        if (!VghLantern__Viewport3dControls__ClearArmed) return;
        VghLantern__Viewport3dControls__ClearArmed  =  false;
        VghLantern__Viewport3dControls__RefreshClearButton();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Arm Clear All, or Clear on the Second Press
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__ArmOrClear() {
        if (VghLantern__Viewport3dControls__ClearArmed) {
            VghLantern__Viewport3dControls__DisarmClear();
            VghLantern__Viewport3dControls__Invoke('OnMeasureClear');
            return;
        }

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var waitMs        =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__Viewport3dControls__MeasureConfig('Menu'), 'ClearConfirmMs',
            'Na__Measure3d__Config.json -> VghLantern__Measure3d__Config__Menu');

        VghLantern__Viewport3dControls__ClearArmed  =  true;
        VghLantern__Viewport3dControls__RefreshClearButton();
        VghLantern__Viewport3dControls__ClearTimerId  =  setTimeout(VghLantern__Viewport3dControls__DisarmClear, waitMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Invoke a Registered Callback If Present
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__Invoke(callbackKey, argument) {
        var handler  =  VghLantern__Viewport3dControls__Callbacks[callbackKey];
        if (typeof handler === 'function') handler(argument);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Set a Highlight Across One Attribute's Buttons
    // ------------------------------------------------------------
    // Highlights are moved in place rather than by repainting, for the same reason
    // section toggles are: a repaint would rebuild the lantern selector mid-click.
    function VghLantern__Viewport3dControls__Highlight(attributeName, activeKey) {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var buttons  =  hostElement.querySelectorAll('[' + attributeName + ']');
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute(attributeName) === activeKey) {
                buttons[i].classList.add(CSS_BTN_ACTIVE);
            } else {
                buttons[i].classList.remove(CSS_BTN_ACTIVE);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Paint the Card Into the Held Host
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__Paint() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        hostElement.innerHTML  =  VghLantern__Viewport3dControls__BuildCard(
            VghLantern__Viewport3dControls__ModeConfig());

        VghLantern__Viewport3dControls__ApplyPosition();
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Menu Into Its Host
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__Render(hostElement, callbacks) {
        if (!hostElement) return;

        VghLantern__Viewport3dControls__HostElement  =  hostElement;
        if (callbacks) VghLantern__Viewport3dControls__Callbacks  =  callbacks;

        hostElement.classList.add(CSS_COLUMN);

        VghLantern__Viewport3dControls__RefreshMenuState();                   // <-- Config defaults now, the user file when it lands
        VghLantern__Viewport3dControls__Paint();
        VghLantern__Viewport3dControls__BindDelegated();
        VghLantern__Viewport3dControls__RequestPersistedState();
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Preset Currently Applied to the Camera
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActivePreset(presetKey) {
        VghLantern__Viewport3dControls__ActivePreset  =  presetKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_PRESET, VghLantern__Viewport3dControls__ActivePreset);
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Display Mode the Surface Is In
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActiveDisplayMode(modeKey) {
        VghLantern__Viewport3dControls__ActiveDisplay  =  modeKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_DISPLAY_MODE, VghLantern__Viewport3dControls__ActiveDisplay);
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Element View the Surface Is In
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActiveElementView(viewKey) {
        VghLantern__Viewport3dControls__ActiveElement  =  viewKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_ELEMENT_VIEW, VghLantern__Viewport3dControls__ActiveElement);
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Cut the Surface Is Showing
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActiveSectionMode(modeKey) {
        VghLantern__Viewport3dControls__ActiveSection  =  modeKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_SECTION_MODE, VghLantern__Viewport3dControls__ActiveSection);
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Measure Tool That Is On ('' for none)
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActiveMeasureTool(toolKey) {
        VghLantern__Viewport3dControls__ActiveTool  =  toolKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_MEASURE_TOOL, VghLantern__Viewport3dControls__ActiveTool);
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Precision Dimensions Print At
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__SetActiveMeasurePrecision(precisionKey) {
        VghLantern__Viewport3dControls__ActiveDecimal  =  precisionKey || '';
        VghLantern__Viewport3dControls__Highlight(ATTR_PRECISION, VghLantern__Viewport3dControls__ActiveDecimal);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Dimensions Taken, Repainting the List in Place
    // ------------------------------------------------------------
    // revision is the tool's list revision. A report with the same revision is a
    // frame of a live line, which changes nothing here, so the rows are left alone
    // and never rebuilt under a cursor reaching for one.
    function VghLantern__Viewport3d__Controls__SetMeasurements(rows, revision) {
        if (revision === VghLantern__Viewport3dControls__MeasureRev) return;

        VghLantern__Viewport3dControls__MeasureRev   =  revision;
        VghLantern__Viewport3dControls__MeasureRows  =  Array.isArray(rows) ? rows : [];

        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var list  =  hostElement.querySelector('.' + CSS_MEASURE_LIST);
        if (list) list.innerHTML  =  VghLantern__Viewport3dControls__BuildMeasureRows();

        if (!VghLantern__Viewport3dControls__MeasureRows.length) VghLantern__Viewport3dControls__DisarmClear();
        VghLantern__Viewport3dControls__RefreshClearButton();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__Controls__Render               : VghLantern__Viewport3d__Controls__Render,
        VghLantern__Viewport3d__Controls__SetActivePreset      : VghLantern__Viewport3d__Controls__SetActivePreset,
        VghLantern__Viewport3d__Controls__SetActiveDisplayMode : VghLantern__Viewport3d__Controls__SetActiveDisplayMode,
        VghLantern__Viewport3d__Controls__SetActiveElementView : VghLantern__Viewport3d__Controls__SetActiveElementView,
        VghLantern__Viewport3d__Controls__SetActiveSectionMode : VghLantern__Viewport3d__Controls__SetActiveSectionMode,
        VghLantern__Viewport3d__Controls__SetActiveMeasureTool : VghLantern__Viewport3d__Controls__SetActiveMeasureTool,
        VghLantern__Viewport3d__Controls__SetActiveMeasurePrecision : VghLantern__Viewport3d__Controls__SetActiveMeasurePrecision,
        VghLantern__Viewport3d__Controls__SetMeasurements      : VghLantern__Viewport3d__Controls__SetMeasurements
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__Controls  =  VghLantern__Viewport3d__Controls;
