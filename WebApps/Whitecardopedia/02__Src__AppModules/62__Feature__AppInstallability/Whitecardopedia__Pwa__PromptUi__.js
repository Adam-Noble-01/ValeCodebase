// =============================================================================
// WHITECARDOPEDIA - PWA PROMPT UI BANNER
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__PromptUi__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__PromptUi
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render a single platform-aware install prompt banner / sheet
// CREATED    : 2026
//
// DESCRIPTION:
// - Vanilla DOM implementation so it can mount before React boots.
// - Two layouts:
//     * Compact bottom bar (Chromium handler, primary install action)
//     * Instruction sheet (iOS / macOS Safari handlers, multi-step body)
// - Each handler supplies its own content via `show(config)` so the visuals
//   stay centralised and consistent across every install path.
// - Emits `onPrimary` and `onDismiss` callbacks so handlers stay agnostic of
//   DOM details.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Root Element Identifiers
    // ------------------------------------------------------------
    const PROMPT_UI_ROOT_ID                 = 'Whitecardopedia__Pwa__PromptUi__Root';                                               // <-- Top-level root element id
    const PROMPT_UI_VARIANT_BAR             = 'bar';                                                                                // <-- Compact install bar variant
    const PROMPT_UI_VARIANT_SHEET           = 'sheet';                                                                              // <-- Instruction sheet variant
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Class Names (matching CSS file)
    // ------------------------------------------------------------
    const PROMPT_UI_CLASS_ROOT              = 'wpwa-prompt';                                                                        // <-- Root container class
    const PROMPT_UI_CLASS_ROOT_VISIBLE      = 'wpwa-prompt--visible';                                                               // <-- Root visible state modifier
    const PROMPT_UI_CLASS_BAR               = 'wpwa-prompt__bar';                                                                   // <-- Compact bar layout
    const PROMPT_UI_CLASS_SHEET             = 'wpwa-prompt__sheet';                                                                 // <-- Instruction sheet layout
    const PROMPT_UI_CLASS_BACKDROP          = 'wpwa-prompt__backdrop';                                                              // <-- Backdrop for sheet variant
    const PROMPT_UI_CLASS_ICON              = 'wpwa-prompt__icon';                                                                  // <-- Application icon
    const PROMPT_UI_CLASS_TEXT_BLOCK        = 'wpwa-prompt__text';                                                                  // <-- Text container
    const PROMPT_UI_CLASS_TITLE             = 'wpwa-prompt__title';                                                                 // <-- Title text
    const PROMPT_UI_CLASS_BODY              = 'wpwa-prompt__body';                                                                  // <-- Body text
    const PROMPT_UI_CLASS_ACTIONS           = 'wpwa-prompt__actions';                                                               // <-- Action button container
    const PROMPT_UI_CLASS_PRIMARY_BUTTON    = 'wpwa-prompt__button wpwa-prompt__button--primary';                                   // <-- Primary action
    const PROMPT_UI_CLASS_SECONDARY_BUTTON  = 'wpwa-prompt__button wpwa-prompt__button--secondary';                                 // <-- Dismiss action
    const PROMPT_UI_CLASS_CLOSE_BUTTON      = 'wpwa-prompt__close';                                                                 // <-- Close icon for sheet variant
    const PROMPT_UI_CLASS_STEP_LIST         = 'wpwa-prompt__steps';                                                                 // <-- Steps list container
    const PROMPT_UI_CLASS_STEP_ITEM         = 'wpwa-prompt__step';                                                                  // <-- Single step item
    const PROMPT_UI_CLASS_STEP_NUMBER       = 'wpwa-prompt__step-number';                                                           // <-- Step ordinal
    const PROMPT_UI_CLASS_STEP_TEXT         = 'wpwa-prompt__step-text';                                                             // <-- Step instruction
    const PROMPT_UI_CLASS_ARROW             = 'wpwa-prompt__arrow';                                                                 // <-- Animated arrow indicator
    const PROMPT_UI_CLASS_ARROW_TOP         = 'wpwa-prompt__arrow--top';                                                            // <-- Arrow points up
    const PROMPT_UI_CLASS_ARROW_BOTTOM      = 'wpwa-prompt__arrow--bottom';                                                         // <-- Arrow points down
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Mount State
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__PromptUi__ActiveRootElement       = null;                                                             // <-- Active root element handle
    let Whitecardopedia__Pwa__PromptUi__ActiveConfigSnapshot    = null;                                                             // <-- Last config used
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Element with Class Names
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__CreateElement(tagName, classNames, textContent) {
        const elementInstance   = document.createElement(tagName);                                                                  // <-- Create element
        if (classNames) elementInstance.className = classNames;                                                                     // <-- Apply class names
        if (textContent !== undefined && textContent !== null) elementInstance.textContent = textContent;                           // <-- Apply text
        return elementInstance;                                                                                                     // <-- Return constructed element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Icon Element
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildIconElement(iconUrl) {
        if (!iconUrl) return null;                                                                                                  // <-- No icon configured
        const iconImage         = document.createElement('img');                                                                    // <-- Use img for crisp scaling
        iconImage.className     = PROMPT_UI_CLASS_ICON;                                                                             // <-- Apply class
        iconImage.alt           = 'ValeVision 3D';                                                                                  // <-- Accessible label
        iconImage.src           = iconUrl;                                                                                          // <-- Icon source URL
        iconImage.draggable     = false;                                                                                            // <-- Prevent drag artifacts
        return iconImage;                                                                                                           // <-- Return icon element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Title and Body Block
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildTextBlock(titleText, bodyText) {
        const textContainer     = Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_TEXT_BLOCK);                 // <-- Container
        if (titleText) textContainer.appendChild(Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_TITLE, titleText));    // <-- Title text
        if (bodyText)  textContainer.appendChild(Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BODY, bodyText));      // <-- Body text
        return textContainer;                                                                                                       // <-- Return text block
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Step List
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildStepList(stepEntries) {
        if (!Array.isArray(stepEntries) || stepEntries.length === 0) return null;                                                   // <-- No steps to render

        const listContainer     = Whitecardopedia__Pwa__PromptUi__CreateElement('ol', PROMPT_UI_CLASS_STEP_LIST);                   // <-- Ordered list container

        stepEntries.forEach((stepText, stepIndex) => {
            const stepItem      = Whitecardopedia__Pwa__PromptUi__CreateElement('li', PROMPT_UI_CLASS_STEP_ITEM);                   // <-- Step container
            stepItem.appendChild(Whitecardopedia__Pwa__PromptUi__CreateElement('span', PROMPT_UI_CLASS_STEP_NUMBER, String(stepIndex + 1))); // <-- Ordinal
            stepItem.appendChild(Whitecardopedia__Pwa__PromptUi__CreateElement('span', PROMPT_UI_CLASS_STEP_TEXT, stepText));       // <-- Instruction text
            listContainer.appendChild(stepItem);                                                                                    // <-- Append to list
        });

        return listContainer;                                                                                                       // <-- Return list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Optional Arrow Indicator
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildArrowIndicator(arrowDirection) {
        if (arrowDirection !== 'top' && arrowDirection !== 'bottom') return null;                                                   // <-- Only show if explicitly configured
        const directionModifier = arrowDirection === 'top' ? PROMPT_UI_CLASS_ARROW_TOP : PROMPT_UI_CLASS_ARROW_BOTTOM;               // <-- Pick modifier
        return Whitecardopedia__Pwa__PromptUi__CreateElement('div', `${PROMPT_UI_CLASS_ARROW} ${directionModifier}`);                // <-- Arrow element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Action Buttons
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback) {
        const actionsContainer  = Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_ACTIONS);                    // <-- Buttons container

        if (promptConfig.primaryActionLabel && typeof promptConfig.onPrimary === 'function') {
            const primaryButton = Whitecardopedia__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_PRIMARY_BUTTON, promptConfig.primaryActionLabel); // <-- Primary CTA
            primaryButton.setAttribute('type', 'button');                                                                           // <-- Prevent form submit
            primaryButton.addEventListener('click', () => {
                try { promptConfig.onPrimary(); }                                                                                   // <-- Invoke primary handler
                catch (error) { console.warn('Whitecardopedia PWA prompt primary action failed:', error); }                          // <-- Log non-blocking
            });
            actionsContainer.appendChild(primaryButton);                                                                            // <-- Append to actions
        }

        const secondaryLabel    = promptConfig.secondaryActionLabel || 'Not now';                                                   // <-- Default secondary label
        const secondaryButton   = Whitecardopedia__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_SECONDARY_BUTTON, secondaryLabel); // <-- Dismiss button
        secondaryButton.setAttribute('type', 'button');                                                                             // <-- Prevent form submit
        secondaryButton.addEventListener('click', dismissCallback);                                                                 // <-- Wire dismiss
        actionsContainer.appendChild(secondaryButton);                                                                              // <-- Append to actions

        return actionsContainer;                                                                                                    // <-- Return container
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Close Button (Sheet Variant)
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildCloseButton(dismissCallback) {
        const closeButton       = Whitecardopedia__Pwa__PromptUi__CreateElement('button', PROMPT_UI_CLASS_CLOSE_BUTTON, 'X');       // <-- Use simple ASCII glyph
        closeButton.setAttribute('type', 'button');                                                                                 // <-- Prevent form submit
        closeButton.setAttribute('aria-label', 'Dismiss install prompt');                                                           // <-- Accessibility label
        closeButton.addEventListener('click', dismissCallback);                                                                     // <-- Wire dismiss
        return closeButton;                                                                                                         // <-- Return button
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Variant Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Compact Bar Layout
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildBarLayout(promptConfig, dismissCallback) {
        const barContainer      = Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BAR);                        // <-- Bar layout container

        const iconElement       = Whitecardopedia__Pwa__PromptUi__BuildIconElement(promptConfig.iconUrl);                           // <-- Optional icon
        if (iconElement) barContainer.appendChild(iconElement);                                                                     // <-- Append when present

        barContainer.appendChild(Whitecardopedia__Pwa__PromptUi__BuildTextBlock(promptConfig.title, promptConfig.body));             // <-- Title + body
        barContainer.appendChild(Whitecardopedia__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback));                 // <-- Buttons

        return barContainer;                                                                                                        // <-- Return bar
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Instruction Sheet Layout
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__BuildSheetLayout(promptConfig, dismissCallback) {
        const sheetContainer    = Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_SHEET);                      // <-- Sheet container

        sheetContainer.appendChild(Whitecardopedia__Pwa__PromptUi__BuildCloseButton(dismissCallback));                              // <-- Close button (top right)

        const arrowTop          = promptConfig.arrowDirection === 'top'                                                             // <-- Arrow above content if pointing up
            ? Whitecardopedia__Pwa__PromptUi__BuildArrowIndicator('top')
            : null;
        if (arrowTop) sheetContainer.appendChild(arrowTop);

        const iconElement       = Whitecardopedia__Pwa__PromptUi__BuildIconElement(promptConfig.iconUrl);                           // <-- Icon
        if (iconElement) sheetContainer.appendChild(iconElement);                                                                   // <-- Append when present

        sheetContainer.appendChild(Whitecardopedia__Pwa__PromptUi__BuildTextBlock(promptConfig.title, promptConfig.body));           // <-- Title + body

        const stepList          = Whitecardopedia__Pwa__PromptUi__BuildStepList(promptConfig.steps);                                // <-- Steps
        if (stepList) sheetContainer.appendChild(stepList);                                                                         // <-- Append when present

        sheetContainer.appendChild(Whitecardopedia__Pwa__PromptUi__BuildActionButtons(promptConfig, dismissCallback));               // <-- Buttons row

        const arrowBottom       = promptConfig.arrowDirection === 'bottom'                                                          // <-- Arrow below content if pointing down
            ? Whitecardopedia__Pwa__PromptUi__BuildArrowIndicator('bottom')
            : null;
        if (arrowBottom) sheetContainer.appendChild(arrowBottom);

        return sheetContainer;                                                                                                      // <-- Return sheet
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show Prompt with Supplied Configuration
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__Show(promptConfig) {
        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts
        Whitecardopedia__Pwa__PromptUi__Hide();                                                                                     // <-- Tear down any existing prompt

        Whitecardopedia__Pwa__PromptUi__ActiveConfigSnapshot = promptConfig || {};                                                  // <-- Cache config for diagnostics

        const variant           = (promptConfig && promptConfig.variant) === PROMPT_UI_VARIANT_SHEET                                // <-- Resolve variant
            ? PROMPT_UI_VARIANT_SHEET
            : PROMPT_UI_VARIANT_BAR;

        const rootElement       = Whitecardopedia__Pwa__PromptUi__CreateElement('div', `${PROMPT_UI_CLASS_ROOT} ${PROMPT_UI_CLASS_ROOT}--${variant}`); // <-- Root wrapper
        rootElement.id          = PROMPT_UI_ROOT_ID;                                                                                // <-- Root id for de-dup
        rootElement.setAttribute('role', 'dialog');                                                                                 // <-- Accessibility role
        rootElement.setAttribute('aria-live', 'polite');                                                                            // <-- Polite announce

        const dismissCallback   = function Whitecardopedia__Pwa__PromptUi__OnDismissClick() {
            Whitecardopedia__Pwa__PromptUi__Hide();                                                                                 // <-- Tear down DOM
            if (promptConfig && typeof promptConfig.onDismiss === 'function') {
                try { promptConfig.onDismiss(); }                                                                                   // <-- Notify caller
                catch (error) { console.warn('Whitecardopedia PWA prompt dismiss callback failed:', error); }                       // <-- Log non-blocking
            }
        };

        if (variant === PROMPT_UI_VARIANT_SHEET) {                                                                                  // <-- Sheet variant flow
            const backdropElement = Whitecardopedia__Pwa__PromptUi__CreateElement('div', PROMPT_UI_CLASS_BACKDROP);                 // <-- Backdrop overlay
            backdropElement.addEventListener('click', dismissCallback);                                                             // <-- Click-out dismisses
            rootElement.appendChild(backdropElement);                                                                               // <-- Backdrop first
            rootElement.appendChild(Whitecardopedia__Pwa__PromptUi__BuildSheetLayout(promptConfig, dismissCallback));                // <-- Sheet body
        } else {
            rootElement.appendChild(Whitecardopedia__Pwa__PromptUi__BuildBarLayout(promptConfig, dismissCallback));                  // <-- Bar layout
        }

        document.body.appendChild(rootElement);                                                                                     // <-- Mount under body
        Whitecardopedia__Pwa__PromptUi__ActiveRootElement = rootElement;                                                            // <-- Track root reference

        requestAnimationFrame(() => rootElement.classList.add(PROMPT_UI_CLASS_ROOT_VISIBLE));                                       // <-- Trigger visible transition
    }
    // ---------------------------------------------------------------


    // FUNCTION | Hide Active Prompt
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__Hide() {
        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts
        const existingRoot      = document.getElementById(PROMPT_UI_ROOT_ID);                                                       // <-- Look up live root
        if (existingRoot && existingRoot.parentNode) {
            existingRoot.parentNode.removeChild(existingRoot);                                                                      // <-- Remove from DOM
        }
        Whitecardopedia__Pwa__PromptUi__ActiveRootElement = null;                                                                   // <-- Clear cached root
    }
    // ---------------------------------------------------------------


    // FUNCTION | Check if Prompt is Currently Visible
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__IsVisible() {
        if (typeof document === 'undefined') return false;                                                                          // <-- Guard non-DOM contexts
        return Boolean(document.getElementById(PROMPT_UI_ROOT_ID));                                                                 // <-- Presence check
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Prompt UI Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__PromptUi__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__PromptUi = {                                                                                   // <-- Public API surface
            show      : Whitecardopedia__Pwa__PromptUi__Show,
            hide      : Whitecardopedia__Pwa__PromptUi__Hide,
            isVisible : Whitecardopedia__Pwa__PromptUi__IsVisible,
            Variants  : {
                Bar   : PROMPT_UI_VARIANT_BAR,
                Sheet : PROMPT_UI_VARIANT_SHEET
            }
        };
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__PromptUi__InitializeGlobalNamespace();                                                                    // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
