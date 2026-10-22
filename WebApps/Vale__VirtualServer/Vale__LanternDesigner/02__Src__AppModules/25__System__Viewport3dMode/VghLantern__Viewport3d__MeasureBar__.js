/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | MEASURE BAR
   =============================================================================

   FILE       : VghLantern__Viewport3d__MeasureBar__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - MeasureBar
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The bar along the foot of the 3D View while a measure tool is on
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - TrueVision's measure bar, in this app's chrome: the tool's icon, what to do
     next ("Click the first vertex", "Click the second face"), and the live line's
     reading - its length and how it stands against the axes ("On Red Axis (X)",
     "Free, 3.4 deg off Green (Y)") - with Undo and Done.
   - Polycam's bottom bar does the same job: the number being measured, large,
     where the eye can find it without hunting the model for the label.
   - A finger has no Escape key and no Delete key, so the bar is how a tablet
     takes a point back and switches the tool off.
   - Fed the measure tool's composed payload by Viewport3d__Layout; it owns no
     surface and never touches the pipeline. Hidden whenever no tool is on.

   ============================================================================= */

// =============================================================================
// REGION | Measure Bar Module
// =============================================================================

const VghLantern__Viewport3d__MeasureBar = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers and Classes
    // ------------------------------------------------------------
    const DOM_BAR          =  'VghLantern__Viewport3d__MeasureBar';
    const CSS_BAR          =  'VghLantern__Viewport3d__MeasureBar';
    const CSS_FLASH        =  'VghLantern__Viewport3d__MeasureBar--flash';
    const CSS_ICON         =  'VghLantern__Viewport3d__MeasureBarIcon';
    const CSS_WORDS        =  'VghLantern__Viewport3d__MeasureBarWords';
    const CSS_TEXT         =  'VghLantern__Viewport3d__MeasureBarText';
    const CSS_LIVE         =  'VghLantern__Viewport3d__MeasureBarLive';
    const CSS_VALUE        =  'VghLantern__Viewport3d__MeasureBarValue';
    const CSS_STATE        =  'VghLantern__Viewport3d__MeasureBarState';      // <-- + --x | --y | --z | --square | --free colours it
    const CSS_BTNS         =  'VghLantern__Viewport3d__MeasureBarBtns';
    const CSS_BTN          =  'VghLantern__Viewport3d__MeasureBarBtn';
    const CSS_BTN_DONE     =  'VghLantern__Viewport3d__MeasureBarBtn--done';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Actions and Copy
    // ------------------------------------------------------------
    const ATTR_ACTION      =  'data-vgh-measure-bar';
    const ACTION_UNDO      =  'undo';
    const ACTION_DONE      =  'done';

    const LABEL_UNDO       =  'Undo';
    const LABEL_DONE       =  'Done';
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Bar and Who It Reports To
    // ------------------------------------------------------------
    let VghLantern__Viewport3dMeasureBar__Root       =  null;                // <-- The bar element, made once
    let VghLantern__Viewport3dMeasureBar__Callbacks  =  {};                  // <-- { OnUndo, OnDone } supplied by Layout
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Find One Part of the Bar
    // ------------------------------------------------------------
    function VghLantern__Viewport3dMeasureBar__Part(className) {
        var root  =  VghLantern__Viewport3dMeasureBar__Root;
        return root ? root.querySelector('.' + className) : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Invoke a Registered Callback If Present
    // ------------------------------------------------------------
    function VghLantern__Viewport3dMeasureBar__Invoke(callbackKey) {
        var handler  =  VghLantern__Viewport3dMeasureBar__Callbacks[callbackKey];
        if (typeof handler === 'function') handler();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Bar Inside the 3D View Container (once)
    // ------------------------------------------------------------
    // Idempotent: a second call only takes the new callbacks, because the 3D View
    // renders on every entry and the bar must not stack.
    function VghLantern__Viewport3d__MeasureBar__Render(containerElement, callbacks) {
        if (callbacks) VghLantern__Viewport3dMeasureBar__Callbacks  =  callbacks;
        if (VghLantern__Viewport3dMeasureBar__Root && VghLantern__Viewport3dMeasureBar__Root.isConnected) return;
        if (!containerElement) return;

        var root  =  document.createElement('div');
        root.id         =  DOM_BAR;
        root.className  =  CSS_BAR;
        root.hidden     =  true;
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');

        root.innerHTML  =
            '<img class="' + CSS_ICON + '" alt="" aria-hidden="true" draggable="false">' +
            '<div class="' + CSS_WORDS + '">' +
                '<span class="' + CSS_TEXT + '"></span>' +
                '<span class="' + CSS_LIVE + '"><span class="' + CSS_VALUE + '"></span><span class="' + CSS_STATE + '"></span></span>' +
            '</div>' +
            '<div class="' + CSS_BTNS + '">' +
                '<button type="button" class="' + CSS_BTN + '" ' + ATTR_ACTION + '="' + ACTION_UNDO + '">' + LABEL_UNDO + '</button>' +
                '<button type="button" class="' + CSS_BTN + ' ' + CSS_BTN_DONE + '" ' + ATTR_ACTION + '="' + ACTION_DONE + '">' + LABEL_DONE + '</button>' +
            '</div>';

        // One listener on the bar itself, which outlives every update.
        root.addEventListener('click', function(ev) {
            var button  =  ev.target.closest('[' + ATTR_ACTION + ']');
            if (!button) return;

            var action  =  button.getAttribute(ATTR_ACTION);
            if (action === ACTION_UNDO) VghLantern__Viewport3dMeasureBar__Invoke('OnUndo');
            if (action === ACTION_DONE) VghLantern__Viewport3dMeasureBar__Invoke('OnDone');
        });

        containerElement.appendChild(root);
        VghLantern__Viewport3dMeasureBar__Root  =  root;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Measure Tool's State (hidden when no tool is on)
    // ------------------------------------------------------------
    // payload is the measure tool's report (RenderPipeline__AttachMeasure). Only
    // text and classes change, so an update every frame of a live line is cheap.
    function VghLantern__Viewport3d__MeasureBar__Show(payload) {
        var root  =  VghLantern__Viewport3dMeasureBar__Root;
        if (!root) return;

        if (!payload || !payload.Tool) {
            root.hidden  =  true;
            return;
        }

        var icon   =  VghLantern__Viewport3dMeasureBar__Part(CSS_ICON);
        var text   =  VghLantern__Viewport3dMeasureBar__Part(CSS_TEXT);
        var live   =  VghLantern__Viewport3dMeasureBar__Part(CSS_LIVE);
        var value  =  VghLantern__Viewport3dMeasureBar__Part(CSS_VALUE);
        var state  =  VghLantern__Viewport3dMeasureBar__Part(CSS_STATE);
        var undo   =  root.querySelector('[' + ATTR_ACTION + '="' + ACTION_UNDO + '"]');

        if (icon && payload.ToolIcon && icon.getAttribute('src') !== payload.ToolIcon) icon.setAttribute('src', payload.ToolIcon);
        if (text)  text.textContent   =  payload.Instruction || '';
        if (value) value.textContent  =  payload.LiveText || '';

        if (state) {
            state.textContent  =  payload.LiveState || '';
            state.className    =  CSS_STATE + (payload.LiveAxisKey ? ' ' + CSS_STATE + '--' + payload.LiveAxisKey : '');
        }
        if (live)  live.hidden  =  !payload.LiveText;
        if (undo)  undo.hidden  =  !payload.CanUndo;

        root.classList.toggle(CSS_FLASH, payload.IsFlash === true);
        root.hidden  =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Bar
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__MeasureBar__Hide() {
        if (VghLantern__Viewport3dMeasureBar__Root) VghLantern__Viewport3dMeasureBar__Root.hidden  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Bar
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__MeasureBar__Dispose() {
        var root  =  VghLantern__Viewport3dMeasureBar__Root;
        if (root && root.parentNode) root.parentNode.removeChild(root);
        VghLantern__Viewport3dMeasureBar__Root  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__MeasureBar__Render  : VghLantern__Viewport3d__MeasureBar__Render,
        VghLantern__Viewport3d__MeasureBar__Show    : VghLantern__Viewport3d__MeasureBar__Show,
        VghLantern__Viewport3d__MeasureBar__Hide    : VghLantern__Viewport3d__MeasureBar__Hide,
        VghLantern__Viewport3d__MeasureBar__Dispose : VghLantern__Viewport3d__MeasureBar__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__MeasureBar  =  VghLantern__Viewport3d__MeasureBar;
