/* =============================================================================
   VGHLANTERN - PWA PROMPT UI
   =============================================================================

   FILE       : VghLantern__Pwa__PromptUi__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__PromptUi
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render a single platform-aware install prompt banner or sheet
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Vanilla DOM implementation so it can mount before the app finishes booting.
   - Two layouts:
       * Compact bottom bar   (Chromium handler, primary install action)
       * Instruction sheet    (iOS and macOS Safari handlers, multi-step body)
   - Each handler supplies its own content through show(config), so the visuals
     stay centralised and consistent across every install path.
   - Emits onPrimary and onDismiss callbacks so handlers stay agnostic of the DOM.
   - Class names mirror VghLantern__UiFeature__Styles__PwaInstallability__.css.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Root Element Identifiers
    // ------------------------------------------------------------
    var PROMPT_UI_ROOT_ID                   = 'VghLantern__Pwa__PromptUi__Root';                                  // <-- Top-level root element id
    var PROMPT_UI_VARIANT_BAR               = 'bar';                                                              // <-- Compact install bar variant
    var PROMPT_UI_VARIANT_SHEET             = 'sheet';                                                            // <-- Instruction sheet variant
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Class Names Matching the Stylesheet
    // ------------------------------------------------------------
    var PROMPT_UI_CLASS_ROOT                = 'vghpwa-prompt';                                                    // <-- Root container class
    var PROMPT_UI_CLASS_ROOT_VISIBLE        = 'vghpwa-prompt--visible';                                           // <-- Root visible state modifier
    var PROMPT_UI_CLASS_BAR                 = 'vghpwa-prompt__bar';                                               // <-- Compact bar layout
    var PROMPT_UI_CLASS_SHEET               = 'vghpwa-prompt__sheet';                                             // <-- Instruction sheet layout
    var PROMPT_UI_CLASS_BACKDROP            = 'vghpwa-prompt__backdrop';                                          // <-- Backdrop for the sheet variant
    var PROMPT_UI_CLASS_ICON                = 'vghpwa-prompt__icon';                                              // <-- Application icon
    var PROMPT_UI_CLASS_TEXT_BLOCK          = 'vghpwa-prompt__text';                                              // <-- Text container
    var PROMPT_UI_CLASS_TITLE               = 'vghpwa-prompt__title';                                             // <-- Title text
    var PROMPT_UI_CLASS_BODY                = 'vghpwa-prompt__body';                                              // <-- Body text
    var PROMPT_UI_CLASS_ACTIONS             = 'vghpwa-prompt__actions';                                           // <-- Action button container
    var PROMPT_UI_CLASS_PRIMARY_BUTTON      = 'vghpwa-prompt__button vghpwa-prompt__button--primary';             // <-- Primary action
    var PROMPT_UI_CLASS_SECONDARY_BUTTON    = 'vghpwa-prompt__button vghpwa-prompt__button--secondary';           // <-- Dismiss action
    var PROMPT_UI_CLASS_CLOSE_BUTTON        = 'vghpwa-prompt__close';                                             // <-- Close control for the sheet variant
    var PROMPT_UI_CLASS_STEP_LIST           = 'vghpwa-prompt__steps';                                             // <-- Steps list container
    var PROMPT_UI_CLASS_STEP_ITEM           = 'vghpwa-prompt__step';                                              // <-- Single step item
    var PROMPT_UI_CLASS_STEP_NUMBER         = 'vghpwa-prompt__step-number';                                       // <-- Step ordinal
    var PROMPT_UI_CLASS_STEP_TEXT           = 'vghpwa-prompt__step-text';                                         // <-- Step instruction
    var PROMPT_UI_CLASS_ARROW               = 'vghpwa-prompt__arrow';                                             // <-- Animated arrow indicator
    var PROMPT_UI_CLASS_ARROW_TOP           = 'vghpwa-prompt__arrow--top';                                        // <-- Arrow points up
    var PROMPT_UI_CLASS_ARROW_BOTTOM        = 'vghpwa-prompt__arrow--bottom';                                     // <-- Arrow points down
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Mount State
    // ------------------------------------------------------------
    var VghLantern__Pwa__PromptUi__ActiveRootElement    = null;                                                   // <-- Active root element handle
    var VghLantern__Pwa__PromptUi__ActiveConfigSnapshot = null;                                                   // <-- Last configuration used
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Element with Class Names
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__CreateElement(tagName, classNames, textContent) {
        var elementInstance = document.createElement(tagName);                                                    // <-- Create the element
        if (classNames) elementInstance.className = classNames;                                                   // <-- Apply class names
        if (textContent !== undefined && textContent !== null) elementInstance.textContent = textContent;         // <-- Apply text
        return elementInstance;                                                                                    // <-- Return the constructed element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Icon Element
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildIconElement(iconUrl) {
        if (!iconUrl) return null;                                                                                 // <-- No icon configured
        var iconImage       = document.createElement('img');                                                       // <-- Use img for crisp scaling
        iconImage.className = PROMPT_UI_CLASS_ICON;                                                                // <-- Apply class
        iconImage.alt       = 'Lantern Designer';                                                                  // <-- Accessible label
        iconImage.src       = iconUrl;                                                                             // <-- Icon source URL
        iconImage.draggable = false;                                                                               // <-- Prevent drag artifacts
        return iconImage;                                                                                          // <-- Return the icon element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Title and Body Block
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildTextBlock(titleText, bodyText) {
        var textContainer   = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_TEXT_BLOCK);        // <-- Container
        if (titleText) textContainer.appendChild(VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_TITLE, titleText)); // <-- Title text
        if (bodyText)  textContainer.appendChild(VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BODY, bodyText));   // <-- Body text
        return textContainer;                                                                                      // <-- Return the text block
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Step List
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildStepList(stepEntries) {
        if (!Array.isArray(stepEntries) || stepEntries.length === 0) return null;                                 // <-- No steps to render

        var listContainer   = VghLantern__Pwa__PromptUi__CreateElement('ol', PROMPT_UI_CLASS_STEP_LIST);          // <-- Ordered list container

        stepEntries.forEach(function (stepText, stepIndex) {
            var stepItem    = VghLantern__Pwa__PromptUi__CreateElement('li', PROMPT_UI_CLASS_STEP_ITEM);          // <-- Step container
            stepItem.appendChild(VghLantern__Pwa__PromptUi__CreateElement('span', PROMPT_UI_CLASS_STEP_NUMBER, String(stepIndex + 1))); // <-- Ordinal
            stepItem.appendChild(VghLantern__Pwa__PromptUi__CreateElement('span', PROMPT_UI_CLASS_STEP_TEXT, stepText));                // <-- Instruction text
            listContainer.appendChild(stepItem);                                                                   // <-- Append to the list
        });

        return listContainer;                                                                                      // <-- Return the list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Optional Arrow Indicator
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildArrowIndicator(arrowDirection) {
        if (arrowDirection !== 'top' && arrowDirection !== 'bottom') return null;                                 // <-- Only shown when explicitly configured
        var directionModifier = arrowDirection === 'top' ? PROMPT_UI_CLASS_ARROW_TOP : PROMPT_UI_CLASS_ARROW_BOTTOM; // <-- Pick the modifier
        return VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_ARROW + ' ' + directionModifier);  // <-- Arrow element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Action Buttons
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback) {
        var actionsContainer = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_ACTIONS);          // <-- Buttons container

        if (promptConfig.primaryActionLabel && typeof promptConfig.onPrimary === 'function') {
            var primaryButton = VghLantern__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_PRIMARY_BUTTON, promptConfig.primaryActionLabel); // <-- Primary action
            primaryButton.setAttribute('type', 'button');                                                          // <-- Prevent form submission
            primaryButton.addEventListener('click', function () {
                try { promptConfig.onPrimary(); }                                                                  // <-- Invoke the primary handler
                catch (primaryError) { console.warn('VghLantern PWA prompt primary action failed:', primaryError); } // <-- Log non-blocking
            });
            actionsContainer.appendChild(primaryButton);                                                           // <-- Append to actions
        }

        var secondaryLabel   = promptConfig.secondaryActionLabel || 'Not now';                                    // <-- Default secondary label
        var secondaryButton  = VghLantern__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_SECONDARY_BUTTON, secondaryLabel); // <-- Dismiss button
        secondaryButton.setAttribute('type', 'button');                                                            // <-- Prevent form submission
        secondaryButton.addEventListener('click', dismissCallback);                                                // <-- Wire dismissal
        actionsContainer.appendChild(secondaryButton);                                                             // <-- Append to actions

        return actionsContainer;                                                                                   // <-- Return the container
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Close Button for the Sheet Variant
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildCloseButton(dismissCallback) {
        var closeButton     = VghLantern__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_CLOSE_BUTTON, 'X'); // <-- Simple ASCII glyph
        closeButton.setAttribute('type', 'button');                                                                // <-- Prevent form submission
        closeButton.setAttribute('aria-label', 'Dismiss install prompt');                                          // <-- Accessibility label
        closeButton.addEventListener('click', dismissCallback);                                                    // <-- Wire dismissal
        return closeButton;                                                                                        // <-- Return the button
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Variant Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Compact Bar Layout
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildBarLayout(promptConfig, dismissCallback) {
        var barContainer    = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BAR);               // <-- Bar layout container

        var iconElement     = VghLantern__Pwa__PromptUi__BuildIconElement(promptConfig.iconUrl);                  // <-- Optional icon
        if (iconElement) barContainer.appendChild(iconElement);                                                   // <-- Append when present

        barContainer.appendChild(VghLantern__Pwa__PromptUi__BuildTextBlock(promptConfig.title, promptConfig.body)); // <-- Title and body
        barContainer.appendChild(VghLantern__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback));     // <-- Buttons

        return barContainer;                                                                                       // <-- Return the bar
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Instruction Sheet Layout
    // ---------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__BuildSheetLayout(promptConfig, dismissCallback) {
        var sheetContainer  = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_SHEET);             // <-- Sheet container

        sheetContainer.appendChild(VghLantern__Pwa__PromptUi__BuildCloseButton(dismissCallback));                 // <-- Close button, top right

        var arrowTop        = promptConfig.arrowDirection === 'top'                                               // <-- Arrow above content when pointing up
            ? VghLantern__Pwa__PromptUi__BuildArrowIndicator('top')
            : null;
        if (arrowTop) sheetContainer.appendChild(arrowTop);

        var iconElement     = VghLantern__Pwa__PromptUi__BuildIconElement(promptConfig.iconUrl);                  // <-- Icon
        if (iconElement) sheetContainer.appendChild(iconElement);                                                 // <-- Append when present

        sheetContainer.appendChild(VghLantern__Pwa__PromptUi__BuildTextBlock(promptConfig.title, promptConfig.body)); // <-- Title and body

        var stepList        = VghLantern__Pwa__PromptUi__BuildStepList(promptConfig.steps);                       // <-- Steps
        if (stepList) sheetContainer.appendChild(stepList);                                                       // <-- Append when present

        sheetContainer.appendChild(VghLantern__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback));  // <-- Buttons row

        var arrowBottom     = promptConfig.arrowDirection === 'bottom'                                            // <-- Arrow below content when pointing down
            ? VghLantern__Pwa__PromptUi__BuildArrowIndicator('bottom')
            : null;
        if (arrowBottom) sheetContainer.appendChild(arrowBottom);

        return sheetContainer;                                                                                     // <-- Return the sheet
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show Prompt with the Supplied Configuration
    // ------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__Show(promptConfig) {
        if (typeof document === 'undefined') return;                                                               // <-- Guard non-DOM contexts
        VghLantern__Pwa__PromptUi__Hide();                                                                         // <-- Tear down any existing prompt

        VghLantern__Pwa__PromptUi__ActiveConfigSnapshot = promptConfig || {};                                      // <-- Cache config for diagnostics

        var variant         = (promptConfig && promptConfig.variant) === PROMPT_UI_VARIANT_SHEET                   // <-- Resolve the variant
            ? PROMPT_UI_VARIANT_SHEET
            : PROMPT_UI_VARIANT_BAR;

        var rootElement     = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_ROOT + ' ' + PROMPT_UI_CLASS_ROOT + '--' + variant); // <-- Root wrapper
        rootElement.id      = PROMPT_UI_ROOT_ID;                                                                   // <-- Root id for de-duplication
        rootElement.setAttribute('role', 'dialog');                                                                // <-- Accessibility role
        rootElement.setAttribute('aria-live', 'polite');                                                           // <-- Polite announcement

        var dismissCallback = function VghLantern__Pwa__PromptUi__OnDismissClick() {
            VghLantern__Pwa__PromptUi__Hide();                                                                     // <-- Tear down the DOM
            if (promptConfig && typeof promptConfig.onDismiss === 'function') {
                try { promptConfig.onDismiss(); }                                                                  // <-- Notify the caller
                catch (dismissError) { console.warn('VghLantern PWA prompt dismiss callback failed:', dismissError); } // <-- Log non-blocking
            }
        };

        if (variant === PROMPT_UI_VARIANT_SHEET) {                                                                 // <-- Sheet variant flow
            var backdropElement = VghLantern__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BACKDROP);      // <-- Backdrop overlay
            backdropElement.addEventListener('click', dismissCallback);                                            // <-- Click-out dismisses
            rootElement.appendChild(backdropElement);                                                              // <-- Backdrop first
            rootElement.appendChild(VghLantern__Pwa__PromptUi__BuildSheetLayout(promptConfig, dismissCallback));   // <-- Sheet body
        } else {
            rootElement.appendChild(VghLantern__Pwa__PromptUi__BuildBarLayout(promptConfig, dismissCallback));     // <-- Bar layout
        }

        document.body.appendChild(rootElement);                                                                    // <-- Mount under body
        VghLantern__Pwa__PromptUi__ActiveRootElement = rootElement;                                                // <-- Track the root reference

        requestAnimationFrame(function () { rootElement.classList.add(PROMPT_UI_CLASS_ROOT_VISIBLE); });           // <-- Trigger the visible transition
    }
    // ---------------------------------------------------------------


    // FUNCTION | Hide the Active Prompt
    // ------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__Hide() {
        if (typeof document === 'undefined') return;                                                               // <-- Guard non-DOM contexts
        var existingRoot    = document.getElementById(PROMPT_UI_ROOT_ID);                                          // <-- Look up the live root
        if (existingRoot && existingRoot.parentNode) {
            existingRoot.parentNode.removeChild(existingRoot);                                                     // <-- Remove from the DOM
        }
        VghLantern__Pwa__PromptUi__ActiveRootElement = null;                                                       // <-- Clear the cached root
    }
    // ---------------------------------------------------------------


    // FUNCTION | Report Whether a Prompt Is Currently Visible
    // ------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__IsVisible() {
        if (typeof document === 'undefined') return false;                                                         // <-- Guard non-DOM contexts
        return Boolean(document.getElementById(PROMPT_UI_ROOT_ID));                                                // <-- Presence check
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Prompt UI Namespace
    // ------------------------------------------------------------
    function VghLantern__Pwa__PromptUi__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                 // <-- Guard non-window contexts

        window.VghLantern__Pwa__PromptUi = {                                                                       // <-- Public API surface
            show      : VghLantern__Pwa__PromptUi__Show,
            hide      : VghLantern__Pwa__PromptUi__Hide,
            isVisible : VghLantern__Pwa__PromptUi__IsVisible,
            Variants  : {
                Bar   : PROMPT_UI_VARIANT_BAR,
                Sheet : PROMPT_UI_VARIANT_SHEET
            }
        };
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__PromptUi__InitializeGlobalNamespace();                                                        // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
