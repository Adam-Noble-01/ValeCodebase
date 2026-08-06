/* =============================================================================
   VGHLANTERN - CREATION WIZARD | OVERLAY
   =============================================================================

   FILE       : VghLantern__CreationWizard__Overlay__.js
   NAMESPACE  : VghLantern
   MODULE     : System - CreationWizard - Overlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build and animate the wizard's modal surface and raise its events
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The view layer of the Lantern Creation Wizard: a body-level overlay that
     sits above every mode, holding the step sections, the indicator lamps, the
     progress bar and the live preview pane.
   - Deliberately stateless about the wizard's meaning: every decision (what a
     value means, when a step is complete, what happens on Create) is raised to
     the Controller through the handler bag given to Open. This module only
     builds DOM, applies state classes and forwards events.
   - The step sections are built once per Open and never rebuilt while the
     wizard is up, so the caret and typed-but-unconfirmed text survive every
     expand, collapse and reopen. State changes are class flips, not re-renders.
   - All keydown events are stopped at the overlay so the editor's view hotkeys
     stay asleep while the wizard is open; Enter confirms the focused step and
     Escape cancels. Focus is trapped inside the panel.
   - Section expand/collapse animates via the grid-template-rows 0fr/1fr
     technique; the duration is stamped onto the root as a CSS variable from
     config, so JSON stays the single source of the timing.

   ============================================================================= */

// =============================================================================
// REGION | Creation Wizard Overlay Module
// =============================================================================

const VghLantern__CreationWizard__Overlay = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Root Identity and Data Attributes
    // ------------------------------------------------------------
    const ROOT_ID        =  'VghLantern__CreationWizard__Root';
    const ATTR_ACTION    =  'data-vghwizard-action';
    const ATTR_STEP      =  'data-vghwizard-step';
    const ATTR_VALUE     =  'data-vghwizard-value';
    const ATTR_INPUT     =  'data-vghwizard-input';
    const ATTR_REF       =  'data-vghwizard-ref';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_PREFIX          =  'VghLantern__CreationWizard__';
    const CSS_OVERLAY_VISIBLE =  CSS_PREFIX + 'Overlay--visible';
    const CSS_SECTION         =  CSS_PREFIX + 'Section';
    const CSS_ACTIVE          =  CSS_PREFIX + 'Section--active';
    const CSS_COMPLETE        =  CSS_PREFIX + 'Section--complete';
    const CSS_LOCKED          =  CSS_PREFIX + 'Section--locked';
    const CSS_CARD_SELECTED   =  CSS_PREFIX + 'Card--selected';
    const CSS_MSG_VISIBLE     =  CSS_PREFIX + 'StepMessage--visible';
    const CSS_HINT_VISIBLE    =  CSS_PREFIX + 'AllCompleteHint--visible';
    const CSS_CREATE_ARMED    =  CSS_PREFIX + 'BtnCreate--armed';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Live References and Session Wiring
    // ------------------------------------------------------------
    let VghLantern__CreationWizard__Overlay__Handlers      =  null;          // <-- Handler bag supplied by the Controller
    let VghLantern__CreationWizard__Overlay__StepRefs      =  {};            // <-- Per-step element references
    let VghLantern__CreationWizard__Overlay__PanelRefs     =  {};            // <-- Progress, preview and footer references
    let VghLantern__CreationWizard__Overlay__TransitionMs  =  0;             // <-- From config, stamped as a CSS variable
    let VghLantern__CreationWizard__Overlay__FocusDelayMs  =  0;             // <-- From config, delays caret landing
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Numeric Value for an Input's Value Attribute
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__FormatInput(step, value) {
        var numeric  =  Number(value);
        if (!isFinite(numeric)) return '';
        return step.Decimals > 0 ? numeric.toFixed(step.Decimals) : String(Math.round(numeric));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Assembly - Step Sections
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build the Numeric Entry Area for a Dimension Step
    // ------------------------------------------------------------
    // A large typed entry synced to a slider beneath it: type-and-Enter for the
    // keyboard flow the wizard is built around, drag for the visual one.
    function VghLantern__CreationWizard__Overlay__BuildDimensionArea(step, value) {
        var E       =  VghLantern__CreationWizard__Overlay__Escape;
        var bounds  =  step.Bounds || { Min : 0, Max : 10000, Step : 1 };
        var text    =  VghLantern__CreationWizard__Overlay__FormatInput(step, value);

        var html  =  '<div class="' + CSS_PREFIX + 'InputRow">'
                  +      '<input type="number" class="' + CSS_PREFIX + 'NumberInput"'
                  +          ' ' + ATTR_INPUT + '="number" ' + ATTR_STEP + '="' + E(step.Key) + '"'
                  +          ' min="' + bounds.Min + '" max="' + bounds.Max + '" step="' + bounds.Step + '"'
                  +          ' value="' + E(text) + '" autocomplete="off" data-vghlantern-noautofill="true">'
                  +      '<span class="' + CSS_PREFIX + 'UnitTag">' + E(step.Unit) + '</span>'
                  +  '</div>'
                  +  '<input type="range" class="' + CSS_PREFIX + 'Slider"'
                  +      ' ' + ATTR_INPUT + '="slider" ' + ATTR_STEP + '="' + E(step.Key) + '"'
                  +      ' min="' + bounds.Min + '" max="' + bounds.Max + '" step="' + bounds.Step + '"'
                  +      ' value="' + E(text) + '" aria-label="' + E(step.Title) + '">'
                  +  '<div class="' + CSS_PREFIX + 'BoundsRow">'
                  +      '<span>' + bounds.Min + ' ' + E(step.Unit) + '</span>'
                  +      '<span>' + bounds.Max + ' ' + E(step.Unit) + '</span>'
                  +  '</div>';

        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build One Selectable Finial Card
    // ------------------------------------------------------------
    // Same picture-first presentation as the editor's Finials section: the
    // preview is the component's baked front elevation, drawn inline for free.
    function VghLantern__CreationWizard__Overlay__BuildCard(stepKey, option, isSelected) {
        var E        =  VghLantern__CreationWizard__Overlay__Escape;
        var preview  =  option.Preview2d;
        var previewSvg;

        if (preview && preview.PathData) {
            previewSvg  =  '<svg class="' + CSS_PREFIX + 'CardPreview"'
                        +      ' viewBox="' + E(preview.ViewBox) + '"'
                        +      ' preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
                        +      '<path d="' + E(preview.PathData) + '" fill="none" vector-effect="non-scaling-stroke"></path>'
                        +  '</svg>';
        } else {
            previewSvg  =  '<span class="' + CSS_PREFIX + 'CardPreview ' + CSS_PREFIX + 'CardPreviewEmpty">No preview</span>';
        }

        return '<button type="button" class="' + CSS_PREFIX + 'Card' + (isSelected ? ' ' + CSS_CARD_SELECTED : '') + '"'
             +     ' ' + ATTR_ACTION + '="card" ' + ATTR_STEP + '="' + E(stepKey) + '"'
             +     ' ' + ATTR_VALUE + '="' + E(option.Value) + '"'
             +     ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"'
             +     ' title="' + E(option.Label) + '">'
             +     previewSvg
             +     '<span class="' + CSS_PREFIX + 'CardName">' + E(option.Label) + '</span>'
             + '</button>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build the Finial Card Grid for the Cards Step
    // ------------------------------------------------------------
    // The No Finials card leads the grid so the clean-ridge choice is as
    // deliberate and as visual as picking a component.
    function VghLantern__CreationWizard__Overlay__BuildCardsArea(step, value, view) {
        var E             =  VghLantern__CreationWizard__Overlay__Escape;
        var options       =  view.FinialOptions || [];
        var noneSelected  =  value === '';

        var html  =  '<div class="' + CSS_PREFIX + 'CardGrid" role="radiogroup" ' + ATTR_REF + '="cards">'
                  +      '<button type="button" class="' + CSS_PREFIX + 'Card ' + CSS_PREFIX + 'Card--none'
                  +          (noneSelected ? ' ' + CSS_CARD_SELECTED : '') + '"'
                  +          ' ' + ATTR_ACTION + '="card" ' + ATTR_STEP + '="' + E(step.Key) + '"'
                  +          ' ' + ATTR_VALUE + '=""'
                  +          ' aria-pressed="' + (noneSelected ? 'true' : 'false') + '">'
                  +          '<span class="' + CSS_PREFIX + 'CardPreview ' + CSS_PREFIX + 'CardPreviewEmpty">'
                  +              E(view.Strings.NoFinialsPreviewText) + '</span>'
                  +          '<span class="' + CSS_PREFIX + 'CardName">' + E(view.Strings.NoFinialsLabel) + '</span>'
                  +      '</button>';

        for (var i = 0; i < options.length; i++) {
            html  +=  VghLantern__CreationWizard__Overlay__BuildCard(step.Key, options[i], String(options[i].Value) === String(value));
        }

        html  +=  '</div>';

        if (options.length === 0) {
            html  +=  '<p class="' + CSS_PREFIX + 'HintLine">' + E(view.Strings.NoComponentsMessage) + '</p>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build the Text Entry Area for the Name Step
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__BuildTextArea(step, value) {
        var E  =  VghLantern__CreationWizard__Overlay__Escape;
        return '<div class="' + CSS_PREFIX + 'InputRow">'
             +     '<input type="text" class="' + CSS_PREFIX + 'TextInput"'
             +         ' ' + ATTR_INPUT + '="text" ' + ATTR_STEP + '="' + E(step.Key) + '"'
             +         ' value="' + E(value) + '" placeholder="' + E(step.Placeholder) + '"'
             +         (step.MaxLength > 0 ? ' maxlength="' + step.MaxLength + '"' : '')
             +         ' autocomplete="off" data-vghlantern-noautofill="true">'
             + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Complete Step Section
    // ------------------------------------------------------------
    // The lamp, the collapsed summary and the expandable body are all present
    // from the start; every later state change is a class flip on the section.
    function VghLantern__CreationWizard__Overlay__BuildSection(step, value, view) {
        var E  =  VghLantern__CreationWizard__Overlay__Escape;

        var areaHtml  =  '';
        if (step.Kind === 'dimension')  areaHtml  =  VghLantern__CreationWizard__Overlay__BuildDimensionArea(step, value);
        if (step.Kind === 'cards')      areaHtml  =  VghLantern__CreationWizard__Overlay__BuildCardsArea(step, value, view);
        if (step.Kind === 'text')       areaHtml  =  VghLantern__CreationWizard__Overlay__BuildTextArea(step, value);

        var nextDisabled  =  step.Kind === 'cards' && (value === null || value === undefined);

        var html  =  '<section class="' + CSS_SECTION + ' ' + CSS_LOCKED + '" ' + ATTR_STEP + '="' + E(step.Key) + '">'
                  +      '<button type="button" class="' + CSS_PREFIX + 'SectionHeader"'
                  +          ' ' + ATTR_ACTION + '="reopen" ' + ATTR_STEP + '="' + E(step.Key) + '" aria-expanded="false">'
                  +          '<span class="' + CSS_PREFIX + 'Lamp" aria-hidden="true">'
                  +              '<svg viewBox="0 0 12 12" class="' + CSS_PREFIX + 'LampTick">'
                  +                  '<path d="M2.5 6.4 L5 8.8 L9.5 3.4"></path>'
                  +              '</svg>'
                  +          '</span>'
                  +          '<span class="' + CSS_PREFIX + 'SectionTitle">' + E(step.Title) + '</span>'
                  +          '<span class="' + CSS_PREFIX + 'SectionValue" ' + ATTR_REF + '="value"></span>'
                  +          '<span class="' + CSS_PREFIX + 'Chevron" aria-hidden="true"></span>'
                  +      '</button>'
                  +      '<div class="' + CSS_PREFIX + 'SectionBody">'
                  +          '<div class="' + CSS_PREFIX + 'SectionInner">'
                  +              '<p class="' + CSS_PREFIX + 'Prompt">' + E(step.Prompt) + '</p>'
                  +              areaHtml
                  +              '<p class="' + CSS_PREFIX + 'StepMessage" ' + ATTR_REF + '="message"></p>'
                  +              '<p class="' + CSS_PREFIX + 'HintLine">' + E(step.Hint) + '</p>'
                  +              '<div class="' + CSS_PREFIX + 'StepActions">'
                  +                  '<button type="button" class="' + CSS_PREFIX + 'BtnNext"'
                  +                      ' ' + ATTR_ACTION + '="confirm" ' + ATTR_STEP + '="' + E(step.Key) + '"'
                  +                      (nextDisabled ? ' disabled' : '') + '>'
                  +                      E(view.Strings.NextButtonLabel)
                  +                  '</button>'
                  +              '</div>'
                  +          '</div>'
                  +      '</div>'
                  +  '</section>';

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Assembly - Panel Shell
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Full Panel Markup for a Wizard Session
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__BuildPanel(view) {
        var E     =  VghLantern__CreationWizard__Overlay__Escape;
        var html  =  '';

        html  +=  '<div class="' + CSS_PREFIX + 'Panel" role="dialog" aria-modal="true" tabindex="-1"'
              +      ' aria-label="' + E(view.Title) + '">';

        html  +=      '<header class="' + CSS_PREFIX + 'Header">'
              +          '<div class="' + CSS_PREFIX + 'HeaderText">'
              +              '<h2 class="' + CSS_PREFIX + 'Title">' + E(view.Title) + '</h2>'
              +              '<p class="' + CSS_PREFIX + 'Subtitle">' + E(view.Subtitle) + '</p>'
              +          '</div>'
              +          '<div class="' + CSS_PREFIX + 'ProgressBlock">'
              +              '<span class="' + CSS_PREFIX + 'ProgressCounter" ' + ATTR_REF + '="progressCounter"></span>'
              +              '<div class="' + CSS_PREFIX + 'ProgressTrack">'
              +                  '<div class="' + CSS_PREFIX + 'ProgressFill" ' + ATTR_REF + '="progressFill"></div>'
              +              '</div>'
              +          '</div>'
              +      '</header>';

        html  +=      '<div class="' + CSS_PREFIX + 'Columns">'
              +          '<div class="' + CSS_PREFIX + 'StepsColumn" ' + ATTR_REF + '="stepsColumn">';

        for (var i = 0; i < view.Steps.length; i++) {
            var step  =  view.Steps[i];
            html     +=  VghLantern__CreationWizard__Overlay__BuildSection(step, view.Values[step.Key], view);
        }

        html  +=              '<p class="' + CSS_PREFIX + 'AllCompleteHint" ' + ATTR_REF + '="allCompleteHint">'
              +                  E(view.Strings.AllCompleteHint) + '</p>'
              +          '</div>'
              +          '<aside class="' + CSS_PREFIX + 'PreviewColumn">'
              +              '<p class="' + CSS_PREFIX + 'PaneTitle">' + E(view.Strings.PaneTitle) + '</p>'
              +              '<div class="' + CSS_PREFIX + 'PreviewCard" ' + ATTR_REF + '="previewHost"></div>'
              +              '<p class="' + CSS_PREFIX + 'PreviewCaption" ' + ATTR_REF + '="previewCaption"></p>'
              +              '<p class="' + CSS_PREFIX + 'PreviewCaptionSub" ' + ATTR_REF + '="previewCaptionSub"></p>'
              +          '</aside>'
              +      '</div>';

        html  +=      '<footer class="' + CSS_PREFIX + 'Footer">'
              +          '<button type="button" class="' + CSS_PREFIX + 'BtnCancel" ' + ATTR_ACTION + '="cancel">'
              +              E(view.Strings.CancelButtonLabel) + '</button>'
              +          '<span class="' + CSS_PREFIX + 'EnterHint">' + E(view.Strings.EnterKeyHint) + '</span>'
              +          '<button type="button" class="' + CSS_PREFIX + 'BtnCreate" ' + ATTR_ACTION + '="create" disabled>'
              +              E(view.Strings.CreateButtonLabel) + '</button>'
              +      '</footer>';

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect Element References After a Panel Build
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__CollectRefs(rootEl, steps) {
        var panelEl  =  rootEl.querySelector('.' + CSS_PREFIX + 'Panel');

        VghLantern__CreationWizard__Overlay__PanelRefs  =  {
            Panel           : panelEl,
            ProgressCounter : rootEl.querySelector('[' + ATTR_REF + '="progressCounter"]'),
            ProgressFill    : rootEl.querySelector('[' + ATTR_REF + '="progressFill"]'),
            StepsColumn     : rootEl.querySelector('[' + ATTR_REF + '="stepsColumn"]'),
            AllCompleteHint : rootEl.querySelector('[' + ATTR_REF + '="allCompleteHint"]'),
            PreviewHost     : rootEl.querySelector('[' + ATTR_REF + '="previewHost"]'),
            PreviewCaption  : rootEl.querySelector('[' + ATTR_REF + '="previewCaption"]'),
            PreviewCaptionSub : rootEl.querySelector('[' + ATTR_REF + '="previewCaptionSub"]'),
            CreateBtn       : rootEl.querySelector('[' + ATTR_ACTION + '="create"]')
        };

        VghLantern__CreationWizard__Overlay__StepRefs  =  {};
        for (var i = 0; i < steps.length; i++) {
            var key        =  steps[i].Key;
            var sectionEl  =  rootEl.querySelector('section[' + ATTR_STEP + '="' + key + '"]');
            if (!sectionEl) continue;

            VghLantern__CreationWizard__Overlay__StepRefs[key]  =  {
                Section  : sectionEl,
                Header   : sectionEl.querySelector('[' + ATTR_ACTION + '="reopen"]'),
                Value    : sectionEl.querySelector('[' + ATTR_REF + '="value"]'),
                Message  : sectionEl.querySelector('[' + ATTR_REF + '="message"]'),
                Number   : sectionEl.querySelector('[' + ATTR_INPUT + '="number"]'),
                Slider   : sectionEl.querySelector('[' + ATTR_INPUT + '="slider"]'),
                Text     : sectionEl.querySelector('[' + ATTR_INPUT + '="text"]'),
                Cards    : sectionEl.querySelector('[' + ATTR_REF + '="cards"]'),
                NextBtn  : sectionEl.querySelector('[' + ATTR_ACTION + '="confirm"]')
            };
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Read the Committed Raw Value of a Step's Input
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__ReadInput(stepKey) {
        var refs  =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
        if (!refs) return null;
        if (refs.Number) return refs.Number.value;
        if (refs.Text)   return refs.Text.value;
        return null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Click Anywhere in the Overlay
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__OnClick(ev) {
        var handlers  =  VghLantern__CreationWizard__Overlay__Handlers;
        if (!handlers) return;

        // A backdrop click keeps focus inside the dialog rather than letting
        // keystrokes fall through to the editor's document-level hotkeys.
        if (ev.target && ev.target.id === ROOT_ID) {
            if (VghLantern__CreationWizard__Overlay__PanelRefs.Panel) VghLantern__CreationWizard__Overlay__PanelRefs.Panel.focus();
            return;
        }

        var actionEl  =  ev.target.closest('[' + ATTR_ACTION + ']');
        if (!actionEl) return;

        var action   =  actionEl.getAttribute(ATTR_ACTION);
        var stepKey  =  actionEl.getAttribute(ATTR_STEP);

        if (action === 'cancel')  { handlers.OnCancel(); return; }
        if (action === 'create')  { if (!actionEl.disabled) handlers.OnCreate(); return; }
        if (action === 'confirm') { if (!actionEl.disabled) handlers.OnConfirmStep(stepKey, VghLantern__CreationWizard__Overlay__ReadInput(stepKey)); return; }
        if (action === 'card')    { handlers.OnCardSelect(stepKey, actionEl.getAttribute(ATTR_VALUE)); return; }

        if (action === 'reopen') {
            var refs  =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
            if (refs && refs.Section.classList.contains(CSS_COMPLETE) && !refs.Section.classList.contains(CSS_ACTIVE)) {
                handlers.OnReopen(stepKey);
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Input Event from Any Wizard Control
    // ------------------------------------------------------------
    // Keeps the number entry and its slider in step with each other, clears any
    // validation message, and streams the draft value out for the live preview.
    function VghLantern__CreationWizard__Overlay__OnInput(ev) {
        var handlers  =  VghLantern__CreationWizard__Overlay__Handlers;
        var inputEl   =  ev.target.closest ? ev.target.closest('[' + ATTR_INPUT + ']') : null;
        if (!handlers || !inputEl) return;

        var role     =  inputEl.getAttribute(ATTR_INPUT);
        var stepKey  =  inputEl.getAttribute(ATTR_STEP);
        var refs     =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
        if (!refs) return;

        if (role === 'slider' && refs.Number)  refs.Number.value  =  inputEl.value;
        if (role === 'number' && refs.Slider)  refs.Slider.value  =  inputEl.value;

        if (refs.Message) {
            refs.Message.textContent  =  '';
            refs.Message.classList.remove(CSS_MSG_VISIBLE);
        }

        handlers.OnLiveInput(stepKey, inputEl.value);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Wrap Tab Focus Inside the Panel
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__TrapFocus(ev) {
        var panelEl  =  VghLantern__CreationWizard__Overlay__PanelRefs.Panel;
        if (!panelEl) return;

        var focusables  =  panelEl.querySelectorAll('button:not([disabled]), input, [tabindex="-1"]');
        if (focusables.length === 0) return;

        var first  =  focusables[0];
        var last   =  focusables[focusables.length - 1];

        if (ev.shiftKey && document.activeElement === first)       { last.focus();  ev.preventDefault(); }
        else if (!ev.shiftKey && document.activeElement === last)  { first.focus(); ev.preventDefault(); }
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Cycle and Confirm the Finial Cards from the Keyboard
    // ------------------------------------------------------------
    // Arrow keys walk the card strip (wrapping at either end) and select as
    // they go, so the preview grows each finial as it is passed over; Enter
    // takes the card under focus and moves the flow on in one stroke.
    function VghLantern__CreationWizard__Overlay__OnCardKeydown(ev, cardEl) {
        var handlers  =  VghLantern__CreationWizard__Overlay__Handlers;
        var stepKey   =  cardEl.getAttribute(ATTR_STEP);
        var refs      =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];

        var isNext  =  ev.key === 'ArrowRight' || ev.key === 'ArrowDown';
        var isPrev  =  ev.key === 'ArrowLeft'  || ev.key === 'ArrowUp';

        if ((isNext || isPrev) && refs && refs.Cards) {
            ev.preventDefault();
            var cards   =  Array.prototype.slice.call(refs.Cards.querySelectorAll('[' + ATTR_ACTION + '="card"]'));
            var index   =  cards.indexOf(cardEl);
            if (index === -1) return true;
            var target  =  cards[(index + (isNext ? 1 : -1) + cards.length) % cards.length];
            if (target) {
                target.focus();
                handlers.OnCardSelect(stepKey, target.getAttribute(ATTR_VALUE));
            }
            return true;
        }

        if (ev.key === 'Enter') {
            ev.preventDefault();                                             // <-- Stop the native click, which would only reselect
            handlers.OnCardSelect(stepKey, cardEl.getAttribute(ATTR_VALUE));
            handlers.OnConfirmStep(stepKey, null);
            return true;
        }

        return false;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Keydown While the Wizard Is Open
    // ------------------------------------------------------------
    // Every key stops here so the editor's single-letter hotkeys sleep while
    // the wizard is up. Enter confirms the step the caret is sitting in; a
    // bare Enter with everything complete fires Create; Escape cancels.
    function VghLantern__CreationWizard__Overlay__OnKeydown(ev) {
        var handlers  =  VghLantern__CreationWizard__Overlay__Handlers;
        if (!handlers) return;

        ev.stopPropagation();

        if (ev.key === 'Escape') { handlers.OnCancel(); return; }
        if (ev.key === 'Tab')    { VghLantern__CreationWizard__Overlay__TrapFocus(ev); return; }

        var cardEl  =  ev.target.closest ? ev.target.closest('[' + ATTR_ACTION + '="card"]') : null;
        if (cardEl && VghLantern__CreationWizard__Overlay__OnCardKeydown(ev, cardEl)) return;

        if (ev.key !== 'Enter')  return;

        var inputEl  =  ev.target.closest ? ev.target.closest('[' + ATTR_INPUT + ']') : null;
        if (inputEl) {
            ev.preventDefault();
            handlers.OnConfirmStep(inputEl.getAttribute(ATTR_STEP), inputEl.value);
            return;
        }

        // Buttons handle their own Enter as a native click; only a bare Enter
        // elsewhere is treated as the final Create shortcut.
        var isButton   =  ev.target && ev.target.tagName === 'BUTTON';
        var createBtn  =  VghLantern__CreationWizard__Overlay__PanelRefs.CreateBtn;
        if (!isButton && createBtn && !createBtn.disabled) handlers.OnCreate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Create the Overlay Root and Bind Its Delegated Events Once
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__EnsureRoot() {
        var rootEl  =  document.getElementById(ROOT_ID);
        if (rootEl) return rootEl;

        rootEl            =  document.createElement('div');
        rootEl.id         =  ROOT_ID;
        rootEl.className  =  CSS_PREFIX + 'Overlay';
        document.body.appendChild(rootEl);

        rootEl.addEventListener('click',   VghLantern__CreationWizard__Overlay__OnClick);
        rootEl.addEventListener('input',   VghLantern__CreationWizard__Overlay__OnInput);
        rootEl.addEventListener('keydown', VghLantern__CreationWizard__Overlay__OnKeydown);

        return rootEl;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State Application API
// -----------------------------------------------------------------------------

    // FUNCTION | Expand One Step Section and Collapse the Rest
    // ------------------------------------------------------------
    // Completed sections keep their green lamp while collapsed; everything not
    // yet confirmed sits locked and dimmed until the flow reaches it.
    function VghLantern__CreationWizard__Overlay__SetActiveStep(stepKey) {
        var allRefs  =  VghLantern__CreationWizard__Overlay__StepRefs;

        for (var key in allRefs) {
            if (!Object.prototype.hasOwnProperty.call(allRefs, key)) continue;
            var refs      =  allRefs[key];
            var isActive  =  key === stepKey;

            refs.Section.classList.toggle(CSS_ACTIVE, isActive);
            if (isActive) refs.Section.classList.remove(CSS_LOCKED);
            else if (!refs.Section.classList.contains(CSS_COMPLETE)) refs.Section.classList.add(CSS_LOCKED);

            if (refs.Header) refs.Header.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }

        if (VghLantern__CreationWizard__Overlay__PanelRefs.AllCompleteHint) {
            VghLantern__CreationWizard__Overlay__PanelRefs.AllCompleteHint.classList.remove(CSS_HINT_VISIBLE);
        }

        var activeRefs  =  allRefs[stepKey];
        if (!activeRefs) return;

        // Caret lands once the section is mostly open, so the browser's
        // focus-scroll never fights the expand animation.
        setTimeout(function() {
            if (!activeRefs.Section.classList.contains(CSS_ACTIVE)) return;
            if (activeRefs.Number)      { activeRefs.Number.focus(); activeRefs.Number.select(); }
            else if (activeRefs.Text)   { activeRefs.Text.focus();   activeRefs.Text.select(); }
            else if (activeRefs.Cards)  {
                var target  =  activeRefs.Cards.querySelector('.' + CSS_CARD_SELECTED) || activeRefs.Cards.querySelector('button');
                if (target) target.focus();
            }
        }, VghLantern__CreationWizard__Overlay__FocusDelayMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark a Step Complete and Show Its Collapsed Summary
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__MarkStepComplete(stepKey, summaryText) {
        var refs  =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
        if (!refs) return;

        refs.Section.classList.add(CSS_COMPLETE);
        refs.Section.classList.remove(CSS_LOCKED);
        if (refs.Value) refs.Value.textContent  =  summaryText;
    }
    // ------------------------------------------------------------


    // FUNCTION | Update the Progress Bar Fill and Step Counter Text
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__SetProgress(percent, counterText) {
        var panelRefs  =  VghLantern__CreationWizard__Overlay__PanelRefs;
        if (panelRefs.ProgressFill)    panelRefs.ProgressFill.style.width      =  Math.max(0, Math.min(100, percent)) + '%';
        if (panelRefs.ProgressCounter) panelRefs.ProgressCounter.textContent   =  counterText;
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter the All-Steps-Complete State and Arm the Create Button
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__SetAllComplete() {
        var allRefs    =  VghLantern__CreationWizard__Overlay__StepRefs;
        var panelRefs  =  VghLantern__CreationWizard__Overlay__PanelRefs;

        for (var key in allRefs) {
            if (!Object.prototype.hasOwnProperty.call(allRefs, key)) continue;
            allRefs[key].Section.classList.remove(CSS_ACTIVE);
            if (allRefs[key].Header) allRefs[key].Header.setAttribute('aria-expanded', 'false');
        }

        if (panelRefs.AllCompleteHint) panelRefs.AllCompleteHint.classList.add(CSS_HINT_VISIBLE);
        if (panelRefs.CreateBtn) {
            panelRefs.CreateBtn.disabled  =  false;
            panelRefs.CreateBtn.classList.add(CSS_CREATE_ARMED);
            panelRefs.CreateBtn.focus();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Chosen Card and Arm Its Next Button
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__SelectCard(stepKey, value) {
        var refs  =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
        if (!refs || !refs.Cards) return;

        var cards  =  refs.Cards.querySelectorAll('[' + ATTR_ACTION + '="card"]');
        for (var i = 0; i < cards.length; i++) {
            var isSelected  =  cards[i].getAttribute(ATTR_VALUE) === String(value);
            cards[i].classList.toggle(CSS_CARD_SELECTED, isSelected);
            cards[i].setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        }

        if (refs.NextBtn) refs.NextBtn.disabled  =  false;

        // A choose-a-finial nudge no longer applies the moment a card is picked
        if (refs.Message) {
            refs.Message.textContent  =  '';
            refs.Message.classList.remove(CSS_MSG_VISIBLE);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Show an Inline Validation Message Under a Step's Input
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__ShowStepMessage(stepKey, messageText) {
        var refs  =  VghLantern__CreationWizard__Overlay__StepRefs[stepKey];
        if (!refs || !refs.Message) return;
        refs.Message.textContent  =  messageText;
        refs.Message.classList.add(CSS_MSG_VISIBLE);
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace the Preview Sketch and Its Caption Lines
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__UpdatePreview(sketchSvg, captionLine, captionSubLine) {
        var panelRefs  =  VghLantern__CreationWizard__Overlay__PanelRefs;
        if (panelRefs.PreviewHost)       panelRefs.PreviewHost.innerHTML          =  sketchSvg;
        if (panelRefs.PreviewCaption)    panelRefs.PreviewCaption.textContent     =  captionLine;
        if (panelRefs.PreviewCaptionSub) panelRefs.PreviewCaptionSub.textContent  =  captionSubLine;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Open and Close
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Panel for a Session and Animate the Overlay In
    // ------------------------------------------------------------
    // view : { Title, Subtitle, Steps, Values, FinialOptions, Strings,
    //          TransitionMs, FocusDelayMs, Handlers }
    function VghLantern__CreationWizard__Overlay__Open(view) {
        var rootEl  =  VghLantern__CreationWizard__Overlay__EnsureRoot();

        VghLantern__CreationWizard__Overlay__Handlers      =  view.Handlers;
        VghLantern__CreationWizard__Overlay__TransitionMs  =  view.TransitionMs;
        VghLantern__CreationWizard__Overlay__FocusDelayMs  =  view.FocusDelayMs;

        rootEl.style.setProperty('--VghWizard_TransitionMs', view.TransitionMs + 'ms');  // <-- Config stays the SSOT for the CSS timing
        rootEl.innerHTML  =  VghLantern__CreationWizard__Overlay__BuildPanel(view);
        VghLantern__CreationWizard__Overlay__CollectRefs(rootEl, view.Steps);

        // Two frames apart so the entrance transition runs on first paint
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                rootEl.classList.add(CSS_OVERLAY_VISIBLE);
                if (VghLantern__CreationWizard__Overlay__PanelRefs.Panel) VghLantern__CreationWizard__Overlay__PanelRefs.Panel.focus();
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Animate the Overlay Out and Release the Session Wiring
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__Close() {
        var rootEl  =  document.getElementById(ROOT_ID);
        if (rootEl) rootEl.classList.remove(CSS_OVERLAY_VISIBLE);

        VghLantern__CreationWizard__Overlay__Handlers  =  null;

        // Content is cleared only after the exit fade so the panel does not
        // blank while still visible; the next Open rebuilds it regardless.
        setTimeout(function() {
            var staleRoot  =  document.getElementById(ROOT_ID);
            if (staleRoot && !staleRoot.classList.contains(CSS_OVERLAY_VISIBLE)) staleRoot.innerHTML  =  '';
        }, VghLantern__CreationWizard__Overlay__TransitionMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Overlay Is Currently Open
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Overlay__IsOpen() {
        var rootEl  =  document.getElementById(ROOT_ID);
        return !!(rootEl && rootEl.classList.contains(CSS_OVERLAY_VISIBLE));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__CreationWizard__Overlay__Open              : VghLantern__CreationWizard__Overlay__Open,
        VghLantern__CreationWizard__Overlay__Close             : VghLantern__CreationWizard__Overlay__Close,
        VghLantern__CreationWizard__Overlay__IsOpen            : VghLantern__CreationWizard__Overlay__IsOpen,
        VghLantern__CreationWizard__Overlay__SetActiveStep     : VghLantern__CreationWizard__Overlay__SetActiveStep,
        VghLantern__CreationWizard__Overlay__MarkStepComplete  : VghLantern__CreationWizard__Overlay__MarkStepComplete,
        VghLantern__CreationWizard__Overlay__SetProgress       : VghLantern__CreationWizard__Overlay__SetProgress,
        VghLantern__CreationWizard__Overlay__SetAllComplete    : VghLantern__CreationWizard__Overlay__SetAllComplete,
        VghLantern__CreationWizard__Overlay__SelectCard        : VghLantern__CreationWizard__Overlay__SelectCard,
        VghLantern__CreationWizard__Overlay__ShowStepMessage   : VghLantern__CreationWizard__Overlay__ShowStepMessage,
        VghLantern__CreationWizard__Overlay__UpdatePreview     : VghLantern__CreationWizard__Overlay__UpdatePreview
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__CreationWizard__Overlay  =  VghLantern__CreationWizard__Overlay;
