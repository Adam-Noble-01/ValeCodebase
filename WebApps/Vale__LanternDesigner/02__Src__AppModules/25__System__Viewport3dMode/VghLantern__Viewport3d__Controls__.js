/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | CONTROLS OVERLAY
   =============================================================================

   FILE       : VghLantern__Viewport3d__Controls__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - Controls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build and bind the floating control overlay for the 3D View mode
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the overlay panel that floats above the full-screen 3D canvas: camera
     preset buttons, zoom-extents, a lantern selector and a skeleton mode readout.
   - Owns no surface and no renderer. It reports user intent back to the Layout
     module through a callback map, so the overlay can be rebuilt at will without
     touching the live GL context.
   - Every visible control is gated by the DedicatedViewportMode block of the Env3d
     config, so the overlay contents are configuration, not code.

   -----------------------------------------------------------------------------

   WHY THE CALLBACK MAP:
   The overlay is markup plus intent. Layout holds the surface handle and decides
   what a preset click actually means. Keeping that split means this module never
   needs to know the pipeline exists, and Layout never needs to parse the DOM.

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
    const CSS_OVERLAY       =  'VghLantern__Viewport3d__Overlay';
    const CSS_GROUP         =  'VghLantern__Viewport3d__OverlayGroup';
    const CSS_GROUP_LABEL   =  'VghLantern__Viewport3d__OverlayGroupLabel';
    const CSS_BTN           =  'VghLantern__Viewport3d__OverlayBtn';
    const CSS_BTN_ACTIVE    =  'VghLantern__Viewport3d__OverlayBtn--active';
    const CSS_SELECT        =  'VghLantern__Viewport3d__OverlaySelect';
    const CSS_READOUT       =  'VghLantern__Viewport3d__OverlayReadout';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes and Action Keys
    // ------------------------------------------------------------
    const ATTR_PRESET       =  'data-vgh-preset';
    const ATTR_ACTION       =  'data-vgh-action';
    const ATTR_LANTERN      =  'data-vgh-lantern-select';
    const ATTR_DISPLAY_MODE =  'data-vgh-display-mode';
    const ATTR_SECTION_MODE =  'data-vgh-section-mode';
    const ATTR_ELEMENT_VIEW =  'data-vgh-element-view';

    const ACTION_ZOOM_FIT   =  'zoomExtents';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Static Copy
    // ------------------------------------------------------------
    const LABEL_VIEWS       =  'Views';
    const LABEL_TOOLS       =  'Tools';
    const LABEL_LANTERN     =  'Lantern';
    const LABEL_DISPLAY     =  'Display';
    const LABEL_SECTION     =  'Cross Section';
    const LABEL_ELEMENTS    =  'Elements';
    const LABEL_FIT         =  'Zoom to Fit';
    const LABEL_MODE_PREFIX =  'Members: ';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Context Label
    // ------------------------------------------------------------
    const MODE_CONFIG_LABEL =  'Na__Env3d__Config.json -> VghLantern__Env3d__Config__DedicatedViewportMode';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Overlay References and Callback Map
    // ------------------------------------------------------------
    let VghLantern__Viewport3dControls__HostElement  =  null;                 // <-- Overlay container this module owns
    let VghLantern__Viewport3dControls__Callbacks     =  {};                  // <-- Intent handlers supplied by Layout
    let VghLantern__Viewport3dControls__ActivePreset  =  '';                  // <-- Preset key currently highlighted
    let VghLantern__Viewport3dControls__ActiveDisplay =  '';                  // <-- Display mode key currently highlighted
    let VghLantern__Viewport3dControls__ActiveSection =  '';                  // <-- Cross section cut key currently highlighted
    let VghLantern__Viewport3dControls__ActiveElement =  '';                  // <-- Element view key currently highlighted
    let VghLantern__Viewport3dControls__IsBound       =  false;               // <-- Guards duplicate delegated listeners
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Markup Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Camera Preset Button Group
    // ------------------------------------------------------------
    // Preset list is asked of the pipeline rather than hardcoded, so a preset added
    // to Env3d config appears here with no code change.
    function VghLantern__Viewport3dControls__BuildPresetGroup() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListPresets) return '';

        var presets  =  pipeline.VghLantern__Env3d__RenderPipeline__ListPresets() || [];
        if (!presets.length) return '';

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_VIEWS + '</span>';

        var i, preset, presetKey, presetLabel, activeClass;
        for (i = 0; i < presets.length; i++) {
            preset       =  presets[i];
            presetKey    =  typeof preset === 'string' ? preset : preset.Key;
            presetLabel  =  typeof preset === 'string' ? preset : (preset.Label || preset.Key);
            activeClass  =  (presetKey === VghLantern__Viewport3dControls__ActivePreset) ? ' ' + CSS_BTN_ACTIVE : '';

            html  +=  '<button type="button" class="' + CSS_BTN + activeClass + '"' +
                      ' ' + ATTR_PRESET + '="' + VghLantern__Viewport3dControls__Escape(presetKey) + '">' +
                      VghLantern__Viewport3dControls__Escape(presetLabel) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Display Mode Button Group
    // ------------------------------------------------------------
    // The three modes are asked of the pipeline rather than written out here, for
    // the same reason the preset list is: a mode added to the 3D environment
    // appears in this overlay with no edit to the overlay.
    //
    // This is the control that switches between the finished model and the
    // setting-out view - the datums and construction triangles the factory works
    // to - so it sits above the camera presets rather than below them.
    function VghLantern__Viewport3dControls__BuildDisplayGroup(modeConfig) {
        if (modeConfig.ShowDisplayModeToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListDisplayModes) return '';

        var modes  =  pipeline.VghLantern__Env3d__RenderPipeline__ListDisplayModes() || [];
        if (!modes.length) return '';

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_DISPLAY + '</span>';

        var i, activeClass;
        for (i = 0; i < modes.length; i++) {
            activeClass  =  (modes[i].Key === VghLantern__Viewport3dControls__ActiveDisplay) ? ' ' + CSS_BTN_ACTIVE : '';

            html  +=  '<button type="button" class="' + CSS_BTN + activeClass + '"' +
                      ' ' + ATTR_DISPLAY_MODE + '="' + VghLantern__Viewport3dControls__Escape(modes[i].Key) + '">' +
                      VghLantern__Viewport3dControls__Escape(modes[i].Label) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Element View Button Group
    // ------------------------------------------------------------
    // Switches between the finished lantern and the structure inside it. Distinct
    // from the display mode beside it: that one chooses between solid geometry
    // and setting-out linework, this one chooses which elements of the solid
    // model are drawn, and the two are usable together.
    //
    // The list is asked of the pipeline rather than written out here, so a third
    // element view would appear in this overlay with no edit to it.
    function VghLantern__Viewport3dControls__BuildElementGroup(modeConfig) {
        if (modeConfig.ShowElementViewToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListElementViews) return '';

        var views  =  pipeline.VghLantern__Env3d__RenderPipeline__ListElementViews() || [];
        if (!views.length) return '';

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_ELEMENTS + '</span>';

        var i, activeClass;
        for (i = 0; i < views.length; i++) {
            activeClass  =  (views[i].Key === VghLantern__Viewport3dControls__ActiveElement) ? ' ' + CSS_BTN_ACTIVE : '';

            html  +=  '<button type="button" class="' + CSS_BTN + activeClass + '"' +
                      ' ' + ATTR_ELEMENT_VIEW + '="' + VghLantern__Viewport3dControls__Escape(views[i].Key) + '">' +
                      VghLantern__Viewport3dControls__Escape(views[i].Label) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Cross Section Button Group
    // ------------------------------------------------------------
    // Three states rather than a checkbox, because "no cut" is a view in its own
    // right and reads better as the button a reviewer returns to than as an
    // un-ticked box. The list is asked of the pipeline for the same reason the
    // display modes are, and comes back empty when the feature is switched off in
    // Na__CrossSection__Config.json, which leaves no cluster rather than an inert one.
    //
    // Placed between the camera presets and the tools deliberately: a cut is chosen
    // after the viewing angle and before the reviewer starts zooming into detail.
    function VghLantern__Viewport3dControls__BuildSectionGroup(modeConfig) {
        if (modeConfig.ShowCrossSectionToggle === false) return '';

        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !pipeline.VghLantern__Env3d__RenderPipeline__ListSectionModes) return '';

        var modes  =  pipeline.VghLantern__Env3d__RenderPipeline__ListSectionModes() || [];
        if (!modes.length) return '';

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_SECTION + '</span>';

        var i, activeClass;
        for (i = 0; i < modes.length; i++) {
            activeClass  =  (modes[i].Key === VghLantern__Viewport3dControls__ActiveSection) ? ' ' + CSS_BTN_ACTIVE : '';

            html  +=  '<button type="button" class="' + CSS_BTN + activeClass + '"' +
                      ' ' + ATTR_SECTION_MODE + '="' + VghLantern__Viewport3dControls__Escape(modes[i].Key) + '">' +
                      VghLantern__Viewport3dControls__Escape(modes[i].Label) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Tool Button Group
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__BuildToolGroup(modeConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(modeConfig, 'ShowZoomExtents', MODE_CONFIG_LABEL)) return '';

        return '<div class="' + CSS_GROUP + '">' +
               '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_TOOLS + '</span>' +
               '<button type="button" class="' + CSS_BTN + '" ' + ATTR_ACTION + '="' + ACTION_ZOOM_FIT + '">' +
               LABEL_FIT + '</button>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Lantern Selector Group
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

        var html  =  '<div class="' + CSS_GROUP + '">' +
                     '<span class="' + CSS_GROUP_LABEL + '">' + LABEL_LANTERN + '</span>' +
                     '<select class="' + CSS_SELECT + '" ' + ATTR_LANTERN + '="1">';

        var i, identity, label, selected;
        for (i = 0; i < lanterns.length; i++) {
            identity  =  lanterns[i] ? lanterns[i]['Lantern__Identity__Config'] : null;
            label     =  (identity && identity['Lantern__Identity__Config__Title'])
                ? identity['Lantern__Identity__Config__Title']
                : 'Lantern ' + (i + 1);                                       // <-- Same fallback the editor tab strip uses
            selected  =  (i === activeIndex) ? ' selected' : '';

            html  +=  '<option value="' + i + '"' + selected + '>' +
                      VghLantern__Viewport3dControls__Escape(label) + '</option>';
        }

        return html + '</select></div>';
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind Delegated Overlay Interaction
    // ------------------------------------------------------------
    // Delegated once onto the overlay container, which survives every rebuild, so
    // repainting the overlay never leaks listeners.
    function VghLantern__Viewport3dControls__BindDelegated() {
        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement || VghLantern__Viewport3dControls__IsBound) return;

        hostElement.addEventListener('click', function(ev) {
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

        VghLantern__Viewport3dControls__IsBound  =  true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Invoke a Registered Callback If Present
    // ------------------------------------------------------------
    function VghLantern__Viewport3dControls__Invoke(callbackKey, argument) {
        var handler  =  VghLantern__Viewport3dControls__Callbacks[callbackKey];
        if (typeof handler === 'function') handler(argument);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Overlay Into Its Host
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Controls__Render(hostElement, callbacks) {
        if (!hostElement) return;

        VghLantern__Viewport3dControls__HostElement  =  hostElement;
        if (callbacks) VghLantern__Viewport3dControls__Callbacks  =  callbacks;

        hostElement.classList.add(CSS_OVERLAY);

        var modeConfig  =  VghLantern__Viewport3dControls__ModeConfig();

        hostElement.innerHTML  =  VghLantern__Viewport3dControls__BuildDisplayGroup(modeConfig) +
                                  VghLantern__Viewport3dControls__BuildElementGroup(modeConfig) +
                                  VghLantern__Viewport3dControls__BuildPresetGroup() +
                                  VghLantern__Viewport3dControls__BuildSectionGroup(modeConfig) +
                                  VghLantern__Viewport3dControls__BuildToolGroup(modeConfig) +
                                  VghLantern__Viewport3dControls__BuildLanternGroup(modeConfig) +
                                  VghLantern__Viewport3dControls__BuildModeReadout(modeConfig);

        VghLantern__Viewport3dControls__BindDelegated();
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Preset Currently Applied to the Camera
    // ------------------------------------------------------------
    // Updates classes in place rather than repainting, so a preset click does not
    // rebuild the lantern selector out from under the user.
    function VghLantern__Viewport3d__Controls__SetActivePreset(presetKey) {
        VghLantern__Viewport3dControls__ActivePreset  =  presetKey || '';

        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var buttons  =  hostElement.querySelectorAll('[' + ATTR_PRESET + ']');
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute(ATTR_PRESET) === VghLantern__Viewport3dControls__ActivePreset) {
                buttons[i].classList.add(CSS_BTN_ACTIVE);
            } else {
                buttons[i].classList.remove(CSS_BTN_ACTIVE);
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Highlight the Display Mode the Surface Is In
    // ------------------------------------------------------------
    // Updated in place for the same reason the preset highlight is: repainting the
    // whole overlay on a mode click would rebuild the lantern selector under the
    // user's cursor.
    function VghLantern__Viewport3d__Controls__SetActiveDisplayMode(modeKey) {
        VghLantern__Viewport3dControls__ActiveDisplay  =  modeKey || '';

        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var buttons  =  hostElement.querySelectorAll('[' + ATTR_DISPLAY_MODE + ']');
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute(ATTR_DISPLAY_MODE) === VghLantern__Viewport3dControls__ActiveDisplay) {
                buttons[i].classList.add(CSS_BTN_ACTIVE);
            } else {
                buttons[i].classList.remove(CSS_BTN_ACTIVE);
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Highlight the Element View the Surface Is In
    // ------------------------------------------------------------
    // Updated in place, like every other highlight in this overlay.
    function VghLantern__Viewport3d__Controls__SetActiveElementView(viewKey) {
        VghLantern__Viewport3dControls__ActiveElement  =  viewKey || '';

        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var buttons  =  hostElement.querySelectorAll('[' + ATTR_ELEMENT_VIEW + ']');
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute(ATTR_ELEMENT_VIEW) === VghLantern__Viewport3dControls__ActiveElement) {
                buttons[i].classList.add(CSS_BTN_ACTIVE);
            } else {
                buttons[i].classList.remove(CSS_BTN_ACTIVE);
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Highlight the Cut the Surface Is Showing
    // ------------------------------------------------------------
    // Updated in place for the same reason the preset and display highlights are:
    // repainting the whole overlay on a click would rebuild the lantern selector
    // under the user's cursor.
    function VghLantern__Viewport3d__Controls__SetActiveSectionMode(modeKey) {
        VghLantern__Viewport3dControls__ActiveSection  =  modeKey || '';

        var hostElement  =  VghLantern__Viewport3dControls__HostElement;
        if (!hostElement) return;

        var buttons  =  hostElement.querySelectorAll('[' + ATTR_SECTION_MODE + ']');
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute(ATTR_SECTION_MODE) === VghLantern__Viewport3dControls__ActiveSection) {
                buttons[i].classList.add(CSS_BTN_ACTIVE);
            } else {
                buttons[i].classList.remove(CSS_BTN_ACTIVE);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__Controls__Render          : VghLantern__Viewport3d__Controls__Render,
        VghLantern__Viewport3d__Controls__SetActivePreset      : VghLantern__Viewport3d__Controls__SetActivePreset,
        VghLantern__Viewport3d__Controls__SetActiveDisplayMode : VghLantern__Viewport3d__Controls__SetActiveDisplayMode,
        VghLantern__Viewport3d__Controls__SetActiveElementView : VghLantern__Viewport3d__Controls__SetActiveElementView,
        VghLantern__Viewport3d__Controls__SetActiveSectionMode : VghLantern__Viewport3d__Controls__SetActiveSectionMode
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__Controls  =  VghLantern__Viewport3d__Controls;
