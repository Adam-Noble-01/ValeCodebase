/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | DIMENSION EDITOR
   =============================================================================

   FILE       : VghLantern__Env2d__DimensionEditor__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - DimensionEditor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Click a dimension on the plan or elevation and type a new value
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - This is the primary interaction of the whole application. The user reads a
     dimension on the drawing, clicks it, types the value they want, and the
     lantern rebuilds around it.
   - Ported from ValeSpec's proven inline dimension edit
     (ValeSpec__SvgPreview__OnDimensionTextClick) and generalised: bounds and
     write-back semantics now come from the ConstraintResolver descriptor table
     rather than being hardcoded per dimension.

   ---------------------------------------------------------------------------

   HOW THE PIECES DIVIDE:
     DimensionRenderer  draws the text and tags it data-vgh-dimension-key
     DimensionEditor    binds the click, floats an <input>, collects the value
     ConstraintResolver decides what the value means and writes the config
     StateManager       broadcasts the change; AppCore re-solves and re-renders

   No module in that chain reaches past its neighbour, so the interaction can be
   reused unchanged by the drawing editor later.

   ============================================================================= */

// =============================================================================
// REGION | Dimension Editor Module
// =============================================================================

const VghLantern__Env2d__DimensionEditor = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Selectors and CSS Classes
    // ------------------------------------------------------------
    const SELECTOR_EDITABLE_TEXT  =  'text[data-vgh-dimension-key][data-vgh-dimension-editable="true"]';
    const CSS_INPUT               =  'VghLantern__Env2d__DimensionInput';     // <-- Floating HTML input
    const CSS_TEXT_ACTIVE         =  'VghLantern__Env2d__Dimension__Text--active';

    const ATTR_KEY                =  'data-vgh-dimension-key';
    const ATTR_VALUE              =  'data-vgh-dimension-value';

    const INPUT_HEIGHT_PX         =  28;                                     // <-- Used to centre the input on the text
    // ------------------------------------------------------------


    // MODULE VARIABLES | Single Active Edit Session
    // ------------------------------------------------------------
    // Only one dimension may be edited at a time, so the session is module
    // scoped rather than per viewport. Opening a second edit closes the first.
    let VghLantern__DimensionEditor__ActiveSession  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Dimension Editor Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var editorCfg     =  (env2d && env2d['VghLantern__Env2d__Config__DimensionEditor']) || {};

        return {
            Enabled            : editorCfg.Enabled           !== false,
            CommitOnEnter      : editorCfg.CommitOnEnter     !== false,
            CommitOnBlur       : editorCfg.CommitOnBlur      !== false,
            CancelOnEscape     : editorCfg.CancelOnEscape    !== false,
            SelectAllOnOpen    : editorCfg.SelectAllOnOpen   !== false,
            ShowWarningToasts  : editorCfg.ShowWarningToasts !== false,
            InputWidthPx       : (typeof editorCfg.InputWidthPx === 'number') ? editorCfg.InputWidthPx : 96
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Teardown
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Close the Active Edit Session Without Committing
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__CloseSession() {
        var session  =  VghLantern__DimensionEditor__ActiveSession;
        if (!session) return;

        VghLantern__DimensionEditor__ActiveSession  =  null;                 // <-- Cleared first so commit cannot re-enter

        session.Input.removeEventListener('blur',    session.OnBlur);
        session.Input.removeEventListener('keydown', session.OnKeydown);

        if (session.Input.parentNode) session.Input.parentNode.removeChild(session.Input);
        if (session.TextEl) session.TextEl.classList.remove(CSS_TEXT_ACTIVE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Commit Path
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Surface Resolver Warnings to the User
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__ReportWarnings(result, config) {
        if (!config.ShowWarningToasts) return;
        if (!result.Warnings || !result.Warnings.length) return;

        var Toast  =  window.VghLantern__AppNotifications__Toast;
        var i;

        for (i = 0; i < result.Warnings.length; i++) {
            if (Toast && Toast.VghLantern__Toast__Show) {
                Toast.VghLantern__Toast__Show(result.Warnings[i], 'warning');
            } else {
                console.warn('[VghLantern__DimensionEditor] ' + result.Warnings[i]);
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the Typed Value Through the Constraint Resolver
    // ------------------------------------------------------------
    // The editor never writes a config field itself. It hands the raw string to
    // the resolver, which owns bounds, derived back-solves and side effects.
    function VghLantern__Env2d__DimensionEditor__Commit() {
        var session  =  VghLantern__DimensionEditor__ActiveSession;
        if (!session) return;

        var rawValue  =  session.Input.value;
        var config    =  session.Config;

        VghLantern__Env2d__DimensionEditor__CloseSession();

        var Resolver      =  window.VghLantern__Geometry__ConstraintResolver;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!Resolver || !StateManager) return;

        var lantern  =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        if (!lantern) return;

        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton();
        var result    =  Resolver.VghLantern__ConstraintResolver__ApplyDimension(
            session.DimensionKey, rawValue, lantern, skeleton);

        VghLantern__Env2d__DimensionEditor__ReportWarnings(result, config);

        // A rejected or unchanged edit must not dirty the project.
        if (!result.Applied) return;

        StateManager.VghLantern__StateManager__UpdateCurrentLantern(lantern);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Opening
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Position the Floating Input Over the Dimension Text
    // ------------------------------------------------------------
    // The input is an HTML element layered over the SVG rather than a foreignObject,
    // so it inherits app styling and behaves normally for keyboard and autofill.
    // Client rects are visual space but style.left/top are layout space, so when an
    // ancestor carries a CSS scale (the drawing sheet zoom) the screen offsets must
    // be divided back through that scale or the input lands wide of the text.
    function VghLantern__Env2d__DimensionEditor__PositionInput(inputEl, textEl, hostEl, widthPx) {
        var textRect  =  textEl.getBoundingClientRect();
        var hostRect  =  hostEl.getBoundingClientRect();

        var layoutWidth  =  hostEl.offsetWidth || hostRect.width;
        var scaleFactor  =  layoutWidth > 0 ? (hostRect.width / layoutWidth) : 1;
        if (!scaleFactor || !isFinite(scaleFactor)) scaleFactor  =  1;

        var centreLeft  =  (textRect.left - hostRect.left + (textRect.width  / 2)) / scaleFactor;
        var centreTop   =  (textRect.top  - hostRect.top  + (textRect.height / 2)) / scaleFactor;

        inputEl.style.position  =  'absolute';
        inputEl.style.width     =  widthPx + 'px';
        inputEl.style.left      =  (centreLeft - (widthPx / 2)) + 'px';
        inputEl.style.top       =  (centreTop  - (INPUT_HEIGHT_PX / 2)) + 'px';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Input Element for a Dimension Descriptor
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__BuildInput(currentValue, descriptor) {
        var inputEl  =  document.createElement('input');

        inputEl.type       =  'number';
        inputEl.className  =  CSS_INPUT;
        inputEl.value      =  currentValue;
        inputEl.step       =  (descriptor && descriptor.Unit === 'deg') ? 0.5 : 1;

        // Mirroring the resolver bounds onto the input gives the browser's own
        // spinner and validation the same limits the resolver will enforce.
        if (descriptor && typeof descriptor.MinMm === 'number') inputEl.min  =  descriptor.MinMm;
        if (descriptor && typeof descriptor.MaxMm === 'number') inputEl.max  =  descriptor.MaxMm;

        inputEl.setAttribute('autocomplete',   'off');
        inputEl.setAttribute('aria-label',     descriptor ? descriptor.Label : 'Dimension');
        inputEl.setAttribute('data-vgh-dimension-input', 'true');

        return inputEl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open an Inline Edit Session on a Dimension Text Node
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__OpenSession(textEl, hostEl) {
        var config  =  VghLantern__Env2d__DimensionEditor__ReadConfig();
        if (!config.Enabled) return;

        VghLantern__Env2d__DimensionEditor__CloseSession();                   // <-- Never allow two open editors

        var dimensionKey  =  textEl.getAttribute(ATTR_KEY);
        var currentValue  =  textEl.getAttribute(ATTR_VALUE);

        var Resolver    =  window.VghLantern__Geometry__ConstraintResolver;
        var descriptor  =  Resolver ? Resolver.VghLantern__ConstraintResolver__GetDescriptor(dimensionKey) : null;
        if (!descriptor) return;

        var inputEl  =  VghLantern__Env2d__DimensionEditor__BuildInput(currentValue, descriptor);

        // The host must establish a positioning context for the absolute input.
        if (window.getComputedStyle(hostEl).position === 'static') {
            hostEl.style.position  =  'relative';
        }

        hostEl.appendChild(inputEl);
        VghLantern__Env2d__DimensionEditor__PositionInput(inputEl, textEl, hostEl, config.InputWidthPx);

        function onBlur() {
            if (config.CommitOnBlur) {
                VghLantern__Env2d__DimensionEditor__Commit();
            } else {
                VghLantern__Env2d__DimensionEditor__CloseSession();
            }
        }

        function onKeydown(ev) {
            if (ev.key === 'Enter' && config.CommitOnEnter) {
                ev.preventDefault();
                VghLantern__Env2d__DimensionEditor__Commit();
                return;
            }
            if (ev.key === 'Escape' && config.CancelOnEscape) {
                ev.preventDefault();
                VghLantern__Env2d__DimensionEditor__CloseSession();
                return;
            }
            // Arrow keys belong to the number spinner, not the viewport pan.
            ev.stopPropagation();
        }

        inputEl.addEventListener('blur',    onBlur);
        inputEl.addEventListener('keydown', onKeydown);

        VghLantern__DimensionEditor__ActiveSession  =  {
            DimensionKey : dimensionKey,
            TextEl       : textEl,
            Input        : inputEl,
            Config       : config,
            OnBlur       : onBlur,
            OnKeydown    : onKeydown
        };

        textEl.classList.add(CSS_TEXT_ACTIVE);

        inputEl.focus();
        if (config.SelectAllOnOpen) inputEl.select();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Binding
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Handle a Click on a Dimension Text Node
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionEditor__OnTextClick(ev) {
        ev.stopPropagation();                                                 // <-- Keep the click away from viewport pan

        var textEl  =  ev.currentTarget;
        var hostEl  =  textEl.ownerSVGElement
            ? (textEl.ownerSVGElement.parentElement || document.body)
            : document.body;

        VghLantern__Env2d__DimensionEditor__OpenSession(textEl, hostEl);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Every Editable Dimension in a Viewport Instance
    // ------------------------------------------------------------
    // Called after each render, because the dimension layer is rebuilt from
    // scratch every time the geometry changes. Listeners die with their nodes.
    function VghLantern__Env2d__DimensionEditor__Bind(instance) {
        if (!instance || !instance.Root) return;

        var config  =  VghLantern__Env2d__DimensionEditor__ReadConfig();
        if (!config.Enabled) return;

        var textNodes  =  instance.Root.querySelectorAll(SELECTOR_EDITABLE_TEXT);
        var i;

        for (i = 0; i < textNodes.length; i++) {
            textNodes[i].addEventListener('click', VghLantern__Env2d__DimensionEditor__OnTextClick);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Cancel Any Open Session
    // ------------------------------------------------------------
    // The render pipeline calls this before clearing layers, so a live input is
    // never left floating over geometry that no longer exists.
    function VghLantern__Env2d__DimensionEditor__Cancel() {
        VghLantern__Env2d__DimensionEditor__CloseSession();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__DimensionEditor__Bind    : VghLantern__Env2d__DimensionEditor__Bind,
        VghLantern__Env2d__DimensionEditor__Cancel  : VghLantern__Env2d__DimensionEditor__Cancel,
        VghLantern__Env2d__DimensionEditor__IsOpen  : function() { return VghLantern__DimensionEditor__ActiveSession !== null; }
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__DimensionEditor  =  VghLantern__Env2d__DimensionEditor;
