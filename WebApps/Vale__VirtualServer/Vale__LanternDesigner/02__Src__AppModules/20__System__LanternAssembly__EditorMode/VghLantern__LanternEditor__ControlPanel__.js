/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | CONTROL PANEL
   =============================================================================

   FILE       : VghLantern__LanternEditor__ControlPanel__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - ControlPanel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render and bind the collapsible descriptor-driven control panel
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The generic renderer for the editor's right-hand control column. It knows how
     to draw a slider, a toggle, a select, an expandable or collapsible group and
     a strip of cards, and nothing
     whatsoever about lanterns, pitches or finials.
   - Reads descriptors from ControlDescriptors and values from the active lantern
     through that same module, so this file never touches a lantern block key.
   - Writes back through ControlDescriptors then notifies StateManager once, which
     triggers exactly one solve and one redraw per edit.
   - Uses a single delegated listener set on the panel root, so a full redraw
     never leaks handlers and never needs unbinding.

   -----------------------------------------------------------------------------

   WHY DELEGATION RATHER THAN PER-CONTROL LISTENERS:
   The panel is rebuilt whenever visibility rules change - switching pitch drive
   mode swaps two sliders, enabling finials reveals three controls. Rebuilding
   innerHTML with per-control listeners attached would either leak them or force
   a teardown pass. Delegating on the root means the markup is disposable.

   OPEN SECTION STATE:
   Which accordions are open is UI state, not project data, so it lives here in a
   module-level set rather than in the project file. It survives redraws within a
   session and resets on reload, which is the behaviour staff expect. Collapsible
   groups inside a section (20-Oct-2026, the Roof Form) keep theirs the same way,
   in a second set, and start closed.

   VALUES THAT CHANGE UNDER THE PANEL (20-Oct-2026):
   A slider drag never rebuilds the panel, so a value moved by something else -
   the exterior Length worked out from an eaves datum length being dragged, or a
   width typed on the drawing - used to sit stale on its slider until the next
   rebuild. Every lanternUpdated now walks the sliders and writes their stored
   values back into the inputs in place: no rebuild, no event, and never into
   the input under the user's hand.

   REVEAL (20-Oct-2026):
   RevealControl opens a section, scrolls a control into view and pulses it,
   which is how the locked dimension notice says "Hey, look here". When the
   panel is hidden (another mode is showing) the request is held and the next
   render consumes it, so a caller can ask before switching modes.

   ============================================================================= */

// =============================================================================
// REGION | Control Panel Module
// =============================================================================

const VghLantern__LanternEditor__ControlPanel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_PANEL           =  'VghLantern__ControlPanel';
    const CSS_SECTION         =  'VghLantern__ControlPanel__Section';
    const CSS_SECTION_OPEN    =  'VghLantern__ControlPanel__Section--open';
    const CSS_SECTION_HEAD    =  'VghLantern__ControlPanel__SectionHeader';
    const CSS_SECTION_BODY    =  'VghLantern__ControlPanel__SectionBody';
    const CSS_SECTION_CHEVRON =  'VghLantern__ControlPanel__SectionChevron';
    const CSS_CONTROL         =  'VghLantern__ControlPanel__Control';
    const CSS_CONTROL_LABEL   =  'VghLantern__ControlPanel__ControlLabel';
    const CSS_CONTROL_ROW     =  'VghLantern__ControlPanel__ControlRow';
    const CSS_CONTROL_HINT    =  'VghLantern__ControlPanel__ControlHint';
    const CSS_SLIDER          =  'VghLantern__ControlPanel__Slider';
    const CSS_NUMERIC         =  'VghLantern__ControlPanel__Numeric';
    const CSS_UNIT            =  'VghLantern__ControlPanel__Unit';
    const CSS_TOGGLE          =  'VghLantern__ControlPanel__Toggle';
    const CSS_TOGGLE_TRACK    =  'VghLantern__ControlPanel__ToggleTrack';
    const CSS_SELECT          =  'VghLantern__ControlPanel__Select';
    const CSS_TEXT_INPUT      =  'VghLantern__ControlPanel__TextInput';
    const CSS_TEXTAREA        =  'VghLantern__ControlPanel__TextArea';
    const CSS_BUTTON          =  'VghLantern__ControlPanel__Button';
    const CSS_GROUP           =  'VghLantern__ControlPanel__Group';
    const CSS_GROUP_BODY      =  'VghLantern__ControlPanel__GroupBody';
    const CSS_COLLAPSIBLE          =  'VghLantern__ControlPanel__Collapsible';
    const CSS_COLLAPSIBLE_OPEN     =  'VghLantern__ControlPanel__Collapsible--open';
    const CSS_COLLAPSIBLE_HEAD     =  'VghLantern__ControlPanel__CollapsibleHeader';
    const CSS_COLLAPSIBLE_LABEL    =  'VghLantern__ControlPanel__CollapsibleLabel';
    const CSS_COLLAPSIBLE_SUMMARY  =  'VghLantern__ControlPanel__CollapsibleSummary';
    const CSS_COLLAPSIBLE_CHEVRON  =  'VghLantern__ControlPanel__CollapsibleChevron';
    const CSS_COLLAPSIBLE_BODY     =  'VghLantern__ControlPanel__CollapsibleBody';
    const CSS_SUBHEADING      =  'VghLantern__ControlPanel__SubHeading';
    const CSS_DIVIDER         =  'VghLantern__ControlPanel__Divider';
    const CSS_EMPTY           =  'VghLantern__ControlPanel__EmptyState';

    const CSS_CARD_GRID       =  'VghLantern__ControlPanel__CardGrid';
    const CSS_CARD            =  'VghLantern__ControlPanel__Card';
    const CSS_CARD_SELECTED   =  'VghLantern__ControlPanel__Card--selected';
    const CSS_CARD_PREVIEW    =  'VghLantern__ControlPanel__CardPreview';
    const CSS_CARD_NAME       =  'VghLantern__ControlPanel__CardName';
    const CSS_CARD_EMPTY      =  'VghLantern__ControlPanel__CardEmpty';
    const CSS_CARD_SWATCH     =  'VghLantern__ControlPanel__Card--swatch';
    const CSS_CARD_DIAGRAM    =  'VghLantern__ControlPanel__Card--diagram';
    const CSS_DIAGRAM_GRID    =  'VghLantern__ControlPanel__CardGrid--diagram';
    const CSS_SWATCH_GRID     =  'VghLantern__ControlPanel__SwatchGrid';
    const CSS_SWATCH          =  'VghLantern__ControlPanel__Swatch';
    const CSS_SWATCH_TIMBER   =  'VghLantern__ControlPanel__Swatch--timber';

    const CSS_TICKED_GRID     =  'VghLantern__ControlPanel__CardGrid--ticked';
    const CSS_CARD_TICK       =  'VghLantern__ControlPanel__CardTick';
    const CSS_CARD_WRAP       =  'VghLantern__ControlPanel__CardWrap';
    const CSS_CARD_INFO       =  'VghLantern__ControlPanel__CardInfo';
    const CSS_READ_ONLY       =  'VghLantern__ControlPanel__Control--readOnly';
    const CSS_ATTENTION       =  'VghLantern__ControlPanel__Attention';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attribute Names
    // ------------------------------------------------------------
    const ATTR_SECTION  =  'data-vgh-section';                               // <-- Section key on headers
    const ATTR_CONTROL  =  'data-vgh-control';                               // <-- Descriptor key on inputs
    const ATTR_ROLE     =  'data-vgh-role';                                  // <-- slider | numeric | toggle | select | text | button | card
    const ATTR_VALUE    =  'data-vgh-value';                                 // <-- Option value carried by a card
    const ATTR_BLOCK    =  'data-vgh-control-block';                         // <-- Descriptor key on a control's whole block, for RevealControl
    const ATTR_COLLAPSIBLE  =  'data-vgh-collapsible';                       // <-- Collapsible group key on its header button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Context Label
    // ------------------------------------------------------------
    const BEHAVIOUR_CONFIG_LABEL  =  'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__ControlBehaviour';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Selected Card Tick
    // ------------------------------------------------------------
    // A tick in a circle, drawn as an svg rather than a character so it is the
    // same shape on every machine and takes its colour from the stylesheet (Vale
    // blue, Adam's call on 20-Oct-2026), never from a font or an emoji.
    const CARD_TICK_MARKUP  =  '<span class="' + CSS_CARD_TICK + '" aria-hidden="true">'
                            +      '<svg viewBox="0 0 20 20" focusable="false">'
                            +          '<circle cx="10" cy="10" r="8.75"></circle>'
                            +          '<path d="M5.9 10.3 L8.7 13.1 L14.2 7.3"></path>'
                            +      '</svg>'
                            +  '</span>';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel State
    // ------------------------------------------------------------
    let VghLantern__ControlPanel__RootEl        =  null;                     // <-- Panel container element
    let VghLantern__ControlPanel__Sections      =  [];                       // <-- Last built section list
    let VghLantern__ControlPanel__DescriptorMap =  {};                       // <-- Descriptor key -> normalised descriptor
    let VghLantern__ControlPanel__OpenKeys      =  null;                     // <-- Set of open section keys, null until first build
    let VghLantern__ControlPanel__OpenGroupKeys =  new Set();                // <-- Open collapsible groups: panel state for the session, never stored in a design
    let VghLantern__ControlPanel__IsBound       =  false;                    // <-- Delegated listeners attached once
    let VghLantern__ControlPanel__RedrawTimer   =  null;                     // <-- Coalesces redraws during a slider drag
    let VghLantern__ControlPanel__TextCommitTimer    =  null;                // <-- Coalesces keystrokes into one write
    let VghLantern__ControlPanel__PendingTextCommit  =  null;                // <-- { ControlKey, RawValue } awaiting the timer, or null
    let VghLantern__ControlPanel__PendingReveal      =  null;                // <-- { SectionKey, ControlKey } waiting for a visible render, or null
    let VghLantern__ControlPanel__Attention          =  null;                // <-- { ControlKey, StartedMs, DurationMs } while a pulse is playing
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Active Lantern
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__ActiveLantern() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;
        return StateManager.VghLantern__StateManager__GetCurrentLantern();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Numeric Value for Display
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__FormatNumber(value, decimals) {
        var numeric  =  parseFloat(value);
        if (!isFinite(numeric)) return '';
        return decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Control Markup Builders
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build a Slider Control
    // ------------------------------------------------------------
    // isReadOnly disables both inputs. A disabled input fires no input or change
    // event, so the slider shows its value and can be updated in place, but no
    // gesture on it can ever reach the commit path.
    function VghLantern__ControlPanel__BuildSlider(descriptor, currentValue, isReadOnly) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};
        var showNumeric  =  ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviour, 'ShowNumericEntryBeside', BEHAVIOUR_CONFIG_LABEL);
        var showUnit     =  ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviour, 'ShowUnitSuffix', BEHAVIOUR_CONFIG_LABEL) && !!descriptor.Unit;

        var displayValue  =  VghLantern__ControlPanel__FormatNumber(currentValue, descriptor.Decimals);
        var keyAttr       =  VghLantern__ControlPanel__Escape(descriptor.Key);
        var disabledAttr  =  isReadOnly ? ' disabled' : '';

        var html  =  '<div class="' + CSS_CONTROL_ROW + '">';

        html  +=      '<input type="range" class="' + CSS_SLIDER + '"'
                   +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                   +      ' ' + ATTR_ROLE + '="slider"'
                   +      ' min="'   + descriptor.Min  + '"'
                   +      ' max="'   + descriptor.Max  + '"'
                   +      ' step="'  + descriptor.Step + '"'
                   +      ' value="' + VghLantern__ControlPanel__Escape(displayValue) + '"'
                   +      disabledAttr + '>';

        if (showNumeric) {
            html  +=  '<input type="number" class="' + CSS_NUMERIC + '"'
                   +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                   +      ' ' + ATTR_ROLE + '="numeric"'
                   +      ' min="'   + descriptor.Min  + '"'
                   +      ' max="'   + descriptor.Max  + '"'
                   +      ' step="'  + descriptor.Step + '"'
                   +      ' value="' + VghLantern__ControlPanel__Escape(displayValue) + '"'
                   +      disabledAttr + '>';
        }

        if (showUnit) {
            html  +=  '<span class="' + CSS_UNIT + '">' + VghLantern__ControlPanel__Escape(descriptor.Unit) + '</span>';
        }

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Toggle Control
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildToggle(descriptor, currentValue) {
        var isOn     =  currentValue === true;
        var keyAttr  =  VghLantern__ControlPanel__Escape(descriptor.Key);

        var html  =  '<label class="' + CSS_TOGGLE + '">';
        html     +=      '<input type="checkbox"'
                      +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                      +      ' ' + ATTR_ROLE + '="toggle"'
                      +      (isOn ? ' checked' : '') + '>';
        html     +=      '<span class="' + CSS_TOGGLE_TRACK + '"></span>';
        html     +=  '</label>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Select Control
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildSelect(descriptor, currentValue) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var options    =  Descriptors.VghLantern__ControlDescriptors__ResolveOptions(descriptor);
        var behaviour  =  Descriptors.VghLantern__ControlDescriptors__Behaviour();
        var emptyLabel =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            behaviour, 'EmptyOptionLabel', 'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__ControlBehaviour');
        var selected   =  String(currentValue === null || currentValue === undefined ? '' : currentValue);

        var html  =  '<select class="' + CSS_SELECT + '"'
                  +      ' ' + ATTR_CONTROL + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '"'
                  +      ' ' + ATTR_ROLE + '="select">';

        if (descriptor.AllowEmpty) {
            html  +=  '<option value=""' + (selected === '' ? ' selected' : '') + '>'
                   +      VghLantern__ControlPanel__Escape(emptyLabel) + '</option>';
        }

        for (var i = 0; i < options.length; i++) {
            var option  =  options[i];
            html  +=  '<option value="' + VghLantern__ControlPanel__Escape(option.Value) + '"'
                   +      (option.Disabled ? ' disabled' : '')
                   +      (String(option.Value) === selected ? ' selected' : '') + '>'
                   +      VghLantern__ControlPanel__Escape(option.Label) + '</option>';
        }

        html  +=  '</select>';

        // A select whose stored value is no longer in the library needs saying so,
        // otherwise the control silently reads as "none selected" and the user
        // assumes nothing was ever chosen.
        if (selected !== '' && !VghLantern__ControlPanel__OptionsContain(options, selected)) {
            html  +=  '<p class="' + CSS_CONTROL_HINT + '">Stored value "'
                   +      VghLantern__ControlPanel__Escape(selected) + '" is not in the current library.</p>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build One Selectable Preview Card
    // ------------------------------------------------------------
    // The preview is inline SVG drawn from the outline the build utility baked
    // into the component index, so a strip of cards costs no network traffic and
    // the picture is the component's real front elevation rather than a stock
    // icon that has to be maintained separately.
    //
    // An option may instead carry PreviewMarkup: a whole SVG element authored by
    // an app data module, for a card whose picture is an explanatory diagram
    // rather than one product outline. That markup is inserted UNESCAPED, which is
    // safe and deliberate - it is written in this codebase, never derived from a
    // project file, a component index or anything else a user can put text into.
    // Escaping it would print the tags on the card instead of drawing them.
    //
    // An option may also carry InfoTip, a key in Na__InfoTooltip__Config.json
    // (20-Oct-2026). The card then gets the Vale "i" bubble in its top left corner
    // and loses the browser's title tooltip, which ran the explanation in one long
    // grey line. The bubble sits BESIDE the card button inside a wrapper, never
    // inside it: a control nested in a button is not valid markup, and a tap on
    // the "i" must read the tip without choosing the card.
    function VghLantern__ControlPanel__BuildCard(descriptor, option, isSelected, extraCardClass, showTick) {
        var preview     =  option.Preview2d;
        var previewSvg  =  '';

        if (option.PreviewMarkup) {
            previewSvg  =  option.PreviewMarkup;
        } else if (preview && preview.PathData) {
            previewSvg  =  '<svg class="' + CSS_CARD_PREVIEW + '"'
                        +      ' viewBox="' + VghLantern__ControlPanel__Escape(preview.ViewBox) + '"'
                        +      ' preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
                        +      '<path d="' + VghLantern__ControlPanel__Escape(preview.PathData) + '"'
                        +          ' fill="none" vector-effect="non-scaling-stroke"></path>'
                        +  '</svg>';
        } else {
            previewSvg  =  '<div class="' + CSS_CARD_PREVIEW + ' ' + CSS_CARD_EMPTY + '">No preview</div>';
        }

        var cardClass  =  CSS_CARD
                       +  (extraCardClass ? ' ' + extraCardClass : '')
                       +  (isSelected ? ' ' + CSS_CARD_SELECTED : '');

        var InfoTooltip  =  window.VghLantern__AppCore__InfoTooltip;
        var hasInfo      =  !!(option.InfoTip && InfoTooltip);
        var titleAttr    =  hasInfo
            ? ''
            : ' title="' + VghLantern__ControlPanel__Escape(option.Summary || option.Label) + '"';

        var html  =  '<button type="button"'
                  +      ' class="' + cardClass + '"'
                  +      ' ' + ATTR_CONTROL + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '"'
                  +      ' ' + ATTR_ROLE + '="card"'
                  +      ' ' + ATTR_VALUE + '="' + VghLantern__ControlPanel__Escape(option.Value) + '"'
                  +      ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"'
                  +      titleAttr + '>';
        html     +=      previewSvg;
        html     +=      '<span class="' + CSS_CARD_NAME + '">' + VghLantern__ControlPanel__Escape(option.Label) + '</span>';
        if (showTick && isSelected) html  +=  CARD_TICK_MARKUP;
        html     +=  '</button>';

        if (!hasInfo) return html;

        return '<div class="' + CSS_CARD_WRAP + (isSelected ? ' ' + CSS_CARD_WRAP + '--selected' : '') + '">'
             +      html
             +      InfoTooltip.VghLantern__InfoTooltip__IconMarkup(option.InfoTip, option.Label, CSS_CARD_INFO)
             +  '</div>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Card Strip Control
    // ------------------------------------------------------------
    // The same value and the same option source as a select, shown as pictures.
    // Choosing a finial is a visual decision, and a dropdown of product names
    // asks the user to hold a shape in their head that the app already knows.
    function VghLantern__ControlPanel__BuildCards(descriptor, currentValue) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return '';

        var options   =  Descriptors.VghLantern__ControlDescriptors__ResolveOptions(descriptor);
        var selected  =  String(currentValue === null || currentValue === undefined ? '' : currentValue);

        if (options.length === 0) {
            return '<p class="' + CSS_CONTROL_HINT + '">No components available for this role.</p>';
        }

        // A diagram strip is two wide landscape cards rather than a reflowing grid
        // of square product tiles, because a plan sketch has nothing to say once
        // it is squeezed into a 120px square beside three of its neighbours.
        var isDiagram   =  descriptor.CardLayout === 'diagram';
        var gridClass   =  CSS_CARD_GRID + (isDiagram ? ' ' + CSS_DIAGRAM_GRID : '')
                        +  (descriptor.SelectedTick ? ' ' + CSS_TICKED_GRID : '');
        var cardExtra   =  isDiagram ? CSS_CARD_DIAGRAM : '';

        var html  =  '<div class="' + gridClass + '" role="radiogroup">';

        if (descriptor.AllowEmpty) {
            var noneSelected  =  selected === '';
            var noneLabel     =  descriptor.EmptyOptionLabel || 'None';
            html  +=  '<button type="button"'
                   +      ' class="' + CSS_CARD + (noneSelected ? ' ' + CSS_CARD_SELECTED : '') + '"'
                   +      ' ' + ATTR_CONTROL + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '"'
                   +      ' ' + ATTR_ROLE + '="card"'
                   +      ' ' + ATTR_VALUE + '=""'
                   +      ' aria-pressed="' + (noneSelected ? 'true' : 'false') + '"'
                   +      ' title="' + VghLantern__ControlPanel__Escape(noneLabel) + '">'
                   +      '<div class="' + CSS_CARD_PREVIEW + ' ' + CSS_CARD_EMPTY + '">'
                   +          VghLantern__ControlPanel__Escape(noneLabel) + '</div>'
                   +      '<span class="' + CSS_CARD_NAME + '">'
                   +          VghLantern__ControlPanel__Escape(noneLabel) + '</span>'
                   +  '</button>';
        }

        for (var i = 0; i < options.length; i++) {
            html  +=  VghLantern__ControlPanel__BuildCard(
                descriptor, options[i], String(options[i].Value) === selected, cardExtra, descriptor.SelectedTick);
        }

        html  +=  '</div>';

        // Same contract as the select: a stored value the library no longer
        // holds must say so, otherwise the strip just reads as "nothing chosen".
        if (selected !== '' && !VghLantern__ControlPanel__OptionsContain(options, selected)) {
            html  +=  '<p class="' + CSS_CONTROL_HINT + '">Stored value "'
                   +      VghLantern__ControlPanel__Escape(selected) + '" is not in the current library.</p>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build One Finish Swatch Card
    // ------------------------------------------------------------
    // Colour / material chips for finish palettes: no SVG product outline, just
    // the HexColor (or a timber hatch placeholder when UsesMaterial is Timber).
    function VghLantern__ControlPanel__BuildSwatchCard(descriptor, option, isSelected) {
        var swatchStyle  =  '';
        var swatchClass  =  CSS_SWATCH;

        if (option.HexColor) {
            swatchStyle  =  ' style="background-color:' + VghLantern__ControlPanel__Escape(option.HexColor) + ';"';
        } else if (option.UsesMaterial === 'Timber') {
            swatchClass  +=  ' ' + CSS_SWATCH_TIMBER;
        } else {
            swatchClass  +=  ' ' + CSS_CARD_EMPTY;
        }

        var html  =  '<button type="button"'
                  +      ' class="' + CSS_CARD + ' ' + CSS_CARD_SWATCH + (isSelected ? ' ' + CSS_CARD_SELECTED : '') + '"'
                  +      ' ' + ATTR_CONTROL + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '"'
                  +      ' ' + ATTR_ROLE + '="card"'
                  +      ' ' + ATTR_VALUE + '="' + VghLantern__ControlPanel__Escape(option.Value) + '"'
                  +      ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"'
                  +      ' title="' + VghLantern__ControlPanel__Escape(option.Label) + '">';
        html     +=      '<div class="' + swatchClass + '"' + swatchStyle + '></div>';
        html     +=      '<span class="' + CSS_CARD_NAME + '">' + VghLantern__ControlPanel__Escape(option.Label) + '</span>';
        html     +=  '</button>';

        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Finish Swatch Card Strip
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildSwatchCards(descriptor, currentValue) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return '';

        var options   =  Descriptors.VghLantern__ControlDescriptors__ResolveOptions(descriptor);
        var selected  =  String(currentValue === null || currentValue === undefined ? '' : currentValue);

        if (options.length === 0) {
            return '<p class="' + CSS_CONTROL_HINT + '">No finishes available.</p>';
        }

        var html  =  '<div class="' + CSS_CARD_GRID + ' ' + CSS_SWATCH_GRID + '" role="radiogroup">';
        var i;

        for (i = 0; i < options.length; i++) {
            html  +=  VghLantern__ControlPanel__BuildSwatchCard(descriptor, options[i], String(options[i].Value) === selected);
        }

        html  +=  '</div>';

        if (selected !== '' && !VghLantern__ControlPanel__OptionsContain(options, selected)) {
            html  +=  '<p class="' + CSS_CONTROL_HINT + '">Stored value "'
                   +      VghLantern__ControlPanel__Escape(selected) + '" is not in the current palette.</p>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Test Whether an Option List Contains a Value
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OptionsContain(options, value) {
        for (var i = 0; i < options.length; i++) {
            if (String(options[i].Value) === value) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Text or Textarea Control
    // ------------------------------------------------------------
    // Both share the same 'text' role attribute so the input/change/focusout
    // handlers never need to branch between the two - only Multiline decides
    // which element renders.
    function VghLantern__ControlPanel__BuildTextField(descriptor, currentValue) {
        var keyAttr    =  VghLantern__ControlPanel__Escape(descriptor.Key);
        var textValue  =  String(currentValue === null || currentValue === undefined ? '' : currentValue);
        var maxAttr    =  descriptor.MaxLength > 0 ? ' maxlength="' + descriptor.MaxLength + '"' : '';

        if (descriptor.Multiline) {
            return '<textarea class="' + CSS_TEXTAREA + '"'
                +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                +      ' ' + ATTR_ROLE + '="text"'
                +      ' rows="' + descriptor.Rows + '"'
                +      maxAttr + '>' + VghLantern__ControlPanel__Escape(textValue) + '</textarea>';
        }

        return '<input type="text" class="' + CSS_TEXT_INPUT + '"'
            +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
            +      ' ' + ATTR_ROLE + '="text"'
            +      maxAttr
            +      ' value="' + VghLantern__ControlPanel__Escape(textValue) + '">';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build a Button Control
    // ------------------------------------------------------------
    // A button holds no value, so BuildControl returns this directly rather
    // than wrapping it in the usual label-plus-input control shell.
    function VghLantern__ControlPanel__BuildButtonBlock(descriptor) {
        var keyAttr        =  VghLantern__ControlPanel__Escape(descriptor.Key);
        var variantClass   =  descriptor.Variant ? ' ' + CSS_BUTTON + '--' + descriptor.Variant : '';

        var html  =  '<div class="' + CSS_CONTROL + ' ' + CSS_CONTROL + '--button">';
        html     +=      '<button type="button" class="' + CSS_BUTTON + variantClass + '"'
                      +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                      +      ' ' + ATTR_ROLE + '="button">'
                      +      VghLantern__ControlPanel__Escape(descriptor.Label) + '</button>';

        if (descriptor.Hint) {
            html  +=     '<p class="' + CSS_CONTROL_HINT + '">' + VghLantern__ControlPanel__Escape(descriptor.Hint) + '</p>';
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Single Control Block
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildControl(descriptor, lantern) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return '';
        if (!Descriptors.VghLantern__ControlDescriptors__IsVisible(descriptor, lantern)) return '';

        // A heading is pure labelling: no value to read, nothing to commit, and
        // deliberately not registered in the descriptor map so a stray input
        // event can never resolve to it.
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeHeading) {
            return '<h4 class="' + CSS_SUBHEADING + '">' + VghLantern__ControlPanel__Escape(descriptor.Label) + '</h4>';
        }

        // A divider is a heading with the words taken out: same job of parting two
        // groups of controls, no value, no key, nothing to commit. Kept out of the
        // descriptor map for the same reason a heading is.
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeDivider) {
            return '<hr class="' + CSS_DIVIDER + '">';
        }

        // A collapsible group holds no value of its own: it is panel state only,
        // so it stays out of the descriptor map, and its children register
        // themselves as they are built.
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeCollapsible) {
            return VghLantern__ControlPanel__BuildCollapsible(descriptor, lantern);
        }

        // A button holds no Block/Field either, but it does need to be resolvable
        // by key when it is clicked, so it registers in the map and returns early.
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeButton) {
            VghLantern__ControlPanel__DescriptorMap[descriptor.Key]  =  descriptor;
            return VghLantern__ControlPanel__BuildButtonBlock(descriptor);
        }

        VghLantern__ControlPanel__DescriptorMap[descriptor.Key]  =  descriptor;

        var currentValue  =  Descriptors.VghLantern__ControlDescriptors__ReadValue(lantern, descriptor);

        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeExpandable) {
            return VghLantern__ControlPanel__BuildExpandable(descriptor, lantern, currentValue);
        }

        // Read only is honoured by sliders, the one type anything has needed it for.
        var isReadOnly  =  descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeSlider
                        && Descriptors.VghLantern__ControlDescriptors__IsReadOnly(descriptor, lantern);

        var inputHtml  =  '';
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeToggle) {
            inputHtml  =  VghLantern__ControlPanel__BuildToggle(descriptor, currentValue);
        } else if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeSelect) {
            inputHtml  =  VghLantern__ControlPanel__BuildSelect(descriptor, currentValue);
        } else if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeCards) {
            inputHtml  =  VghLantern__ControlPanel__BuildCards(descriptor, currentValue);
        } else if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeSwatchCards) {
            inputHtml  =  VghLantern__ControlPanel__BuildSwatchCards(descriptor, currentValue);
        } else if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeText
                || descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeTextarea) {
            inputHtml  =  VghLantern__ControlPanel__BuildTextField(descriptor, currentValue);
        } else {
            inputHtml  =  VghLantern__ControlPanel__BuildSlider(descriptor, currentValue, isReadOnly);
        }

        var html  =  '<div class="' + CSS_CONTROL + ' ' + CSS_CONTROL + '--' + descriptor.Type + (isReadOnly ? ' ' + CSS_READ_ONLY : '') + '"'
                  +      ' ' + ATTR_BLOCK + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '">';
        html     +=      '<span class="' + CSS_CONTROL_LABEL + '">' + VghLantern__ControlPanel__Escape(descriptor.Label) + '</span>';
        html     +=      inputHtml;
        if (descriptor.Hint) {
            html  +=     '<p class="' + CSS_CONTROL_HINT + '">' + VghLantern__ControlPanel__Escape(descriptor.Hint) + '</p>';
        }
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build an Expandable Group Gated by Its Own Toggle
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildExpandable(descriptor, lantern, currentValue) {
        var isOn  =  currentValue === true;

        var html  =  '<div class="' + CSS_GROUP + (isOn ? ' ' + CSS_GROUP + '--open' : '') + '"'
                  +      ' ' + ATTR_BLOCK + '="' + VghLantern__ControlPanel__Escape(descriptor.Key) + '">';
        html     +=      '<div class="' + CSS_CONTROL + ' ' + CSS_CONTROL + '--toggle">';
        html     +=          '<span class="' + CSS_CONTROL_LABEL + '">' + VghLantern__ControlPanel__Escape(descriptor.Label) + '</span>';
        html     +=          VghLantern__ControlPanel__BuildToggle(descriptor, currentValue);
        html     +=      '</div>';

        if (descriptor.Hint) {
            html  +=     '<p class="' + CSS_CONTROL_HINT + '">' + VghLantern__ControlPanel__Escape(descriptor.Hint) + '</p>';
        }

        if (isOn && descriptor.Children.length > 0) {
            html  +=     '<div class="' + CSS_GROUP_BODY + '">';
            for (var i = 0; i < descriptor.Children.length; i++) {
                html  +=     VghLantern__ControlPanel__BuildControl(descriptor.Children[i], lantern);
            }
            html  +=     '</div>';
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | The Value a Closed Collapsible Group Shows
    // ------------------------------------------------------------
    // The current value of the child named by SummaryFrom, as the user would see
    // it in that control: an option's label for a select or card strip, the
    // number and its unit otherwise. Empty when there is nothing to show.
    function VghLantern__ControlPanel__CollapsibleSummary(descriptor, lantern) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors || !descriptor.SummaryFrom) return '';

        var child  =  null;
        for (var i = 0; i < descriptor.Children.length; i++) {
            if (descriptor.Children[i].Key === descriptor.SummaryFrom) child  =  descriptor.Children[i];
        }
        if (!child) return '';

        var value  =  Descriptors.VghLantern__ControlDescriptors__ReadValue(lantern, child);
        if (value === null || value === undefined || value === '') return '';

        if (child.OptionsSource || child.Options) {
            var options  =  Descriptors.VghLantern__ControlDescriptors__ResolveOptions(child);
            for (var j = 0; j < options.length; j++) {
                if (String(options[j].Value) === String(value)) return String(options[j].Label);
            }
        }
        return String(value) + (child.Unit ? ' ' + child.Unit : '');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Collapsible Group, Opened and Closed in the Panel Only
    // ------------------------------------------------------------
    // Starts closed and stays as the user leaves it for the session. Closed, the
    // header names the group and shows its current value, so the choice reads
    // without opening it. A RevealControl aimed at one of its children opens it,
    // or the pulse would land on nothing.
    function VghLantern__ControlPanel__BuildCollapsible(descriptor, lantern) {
        var pending  =  VghLantern__ControlPanel__PendingReveal;
        if (pending) {
            for (var r = 0; r < descriptor.Children.length; r++) {
                if (descriptor.Children[r].Key === pending.ControlKey) VghLantern__ControlPanel__OpenGroupKeys.add(descriptor.Key);
            }
        }

        var isOpen   =  VghLantern__ControlPanel__OpenGroupKeys.has(descriptor.Key);
        var summary  =  isOpen ? '' : VghLantern__ControlPanel__CollapsibleSummary(descriptor, lantern);
        var E        =  VghLantern__ControlPanel__Escape;

        var html  =  '<div class="' + CSS_COLLAPSIBLE + (isOpen ? ' ' + CSS_COLLAPSIBLE_OPEN : '') + '"'
                  +      ' ' + ATTR_BLOCK + '="' + E(descriptor.Key) + '">';
        html     +=      '<button type="button" class="' + CSS_COLLAPSIBLE_HEAD + '"'
                  +          ' ' + ATTR_COLLAPSIBLE + '="' + E(descriptor.Key) + '"'
                  +          ' aria-expanded="' + (isOpen ? 'true' : 'false') + '">';
        html     +=          '<span class="' + CSS_COLLAPSIBLE_LABEL + '">' + E(descriptor.Label) + '</span>';
        html     +=          '<span class="' + CSS_COLLAPSIBLE_SUMMARY + '">' + E(summary) + '</span>';
        html     +=          '<span class="' + CSS_COLLAPSIBLE_CHEVRON + '" aria-hidden="true"></span>';
        html     +=      '</button>';

        // A lone control named like its group ("Roof Form" in "Roof Form") would
        // print its name twice, so the body drops the child's own label.
        var isBare  =  descriptor.Children.length === 1 && descriptor.Children[0].Label === descriptor.Label;

        if (isOpen) {
            html  +=     '<div class="' + CSS_COLLAPSIBLE_BODY + (isBare ? ' ' + CSS_COLLAPSIBLE_BODY + '--bare' : '') + '">';
            for (var i = 0; i < descriptor.Children.length; i++) {
                html  +=     VghLantern__ControlPanel__BuildControl(descriptor.Children[i], lantern);
            }
            html  +=     '</div>';
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Collapsible Section
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BuildSection(section, lantern) {
        var isOpen  =  VghLantern__ControlPanel__OpenKeys.has(section.Key);

        var html  =  '<section class="' + CSS_SECTION + (isOpen ? ' ' + CSS_SECTION_OPEN : '') + '">';
        html     +=      '<button type="button" class="' + CSS_SECTION_HEAD + '"'
                      +      ' ' + ATTR_SECTION + '="' + VghLantern__ControlPanel__Escape(section.Key) + '">';
        html     +=          '<span>' + VghLantern__ControlPanel__Escape(section.Label) + '</span>';
        html     +=          '<span class="' + CSS_SECTION_CHEVRON + '"></span>';
        html     +=      '</button>';

        html     +=      '<div class="' + CSS_SECTION_BODY + '">';
        if (isOpen) {
            for (var i = 0; i < section.Controls.length; i++) {
                html  +=     VghLantern__ControlPanel__BuildControl(section.Controls[i], lantern);
            }
        }
        html     +=      '</div>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Seed the Open Section Set from Config on First Build
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__SeedOpenKeys(sections) {
        if (VghLantern__ControlPanel__OpenKeys) return;

        VghLantern__ControlPanel__OpenKeys  =  new Set();
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].IsOpen) VghLantern__ControlPanel__OpenKeys.add(sections[i].Key);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Control Panel into a Host Element
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__Render(hostElement) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var host         =  hostElement || VghLantern__ControlPanel__RootEl;
        if (!host || !Descriptors) return;

        VghLantern__ControlPanel__RootEl        =  host;
        VghLantern__ControlPanel__DescriptorMap =  {};

        var lantern  =  VghLantern__ControlPanel__ActiveLantern();

        if (!lantern) {
            host.classList.add(CSS_PANEL);
            host.innerHTML  =  '<p class="' + CSS_EMPTY + '">No lantern selected.</p>';
            return;
        }

        var sections  =  Descriptors.VghLantern__ControlDescriptors__BuildSections(lantern);
        VghLantern__ControlPanel__Sections  =  sections;
        VghLantern__ControlPanel__SeedOpenKeys(sections);

        var html  =  '';
        for (var i = 0; i < sections.length; i++) {
            html  +=  VghLantern__ControlPanel__BuildSection(sections[i], lantern);
        }

        host.classList.add(CSS_PANEL);
        host.innerHTML  =  html || '<p class="' + CSS_EMPTY + '">No controls available.</p>';

        VghLantern__ControlPanel__BindDelegated(host);

        // A rebuild replaces every element, a pulse included, so one still playing
        // is put back on the new element before a waiting reveal is taken up.
        VghLantern__ControlPanel__ResumeAttention(host);
        VghLantern__ControlPanel__ConsumePendingReveal(host);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Schedule a Coalesced Panel Redraw
    // ------------------------------------------------------------
    // Only needed when a write changes which controls are visible. Debouncing
    // stops a slider drag from rebuilding the DOM on every pointer move.
    function VghLantern__ControlPanel__ScheduleRedraw() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};
        var delayMs      =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            behaviour, 'SliderDebounceMs', 'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__ControlBehaviour');

        if (VghLantern__ControlPanel__RedrawTimer) clearTimeout(VghLantern__ControlPanel__RedrawTimer);

        VghLantern__ControlPanel__RedrawTimer  =  setTimeout(function() {
            VghLantern__ControlPanel__RedrawTimer  =  null;
            VghLantern__ControlPanel__Render(VghLantern__ControlPanel__RootEl);
        }, delayMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write Stored Values Back Into the Sliders Without a Rebuild
    // ------------------------------------------------------------
    // Run on every lanternUpdated. A slider edit, a typed drawing dimension or a
    // plan size sync can each move a value whose slider is on screen, and none of
    // them rebuilds the panel (a rebuild mid drag would drop the pointer grab).
    // Setting .value fires no event, so this can never loop back into a commit.
    //
    // The input with focus is skipped: it is the one under the user's hand, and
    // its own value is already the one being committed.
    function VghLantern__ControlPanel__RefreshValuesInPlace() {
        var root         =  VghLantern__ControlPanel__RootEl;
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!root || !Descriptors) return;

        var lantern  =  VghLantern__ControlPanel__ActiveLantern();
        if (!lantern) return;

        var key, descriptor, display, inputs, i;

        for (key in VghLantern__ControlPanel__DescriptorMap) {
            if (!Object.prototype.hasOwnProperty.call(VghLantern__ControlPanel__DescriptorMap, key)) continue;

            descriptor  =  VghLantern__ControlPanel__DescriptorMap[key];
            if (descriptor.Type !== Descriptors.VghLantern__ControlDescriptors__TypeSlider) continue;

            display  =  VghLantern__ControlPanel__FormatNumber(
                Descriptors.VghLantern__ControlDescriptors__ReadValue(lantern, descriptor), descriptor.Decimals);
            if (display === '') continue;

            inputs  =  root.querySelectorAll('[' + ATTR_CONTROL + '="' + key + '"]');
            for (i = 0; i < inputs.length; i++) {
                if (inputs[i] === document.activeElement) continue;
                if (inputs[i].value !== display) inputs[i].value  =  display;
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reveal and Attention
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test Whether the Panel Is Actually on Screen
    // ------------------------------------------------------------
    // An element inside a hidden mode panel has no client rects. Scrolling to or
    // pulsing something nobody can see would spend the reveal for nothing.
    function VghLantern__ControlPanel__IsShowing(host) {
        return !!(host && host.isConnected && host.getClientRects().length > 0);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Pulse Timing From Config
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__AttentionTiming() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Descriptors   =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour     =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};

        var pulseMs     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, 'RevealPulseMs',    BEHAVIOUR_CONFIG_LABEL);
        var pulseCount  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, 'RevealPulseCount', BEHAVIOUR_CONFIG_LABEL);

        return { PulseMs : pulseMs, PulseCount : pulseCount, DurationMs : pulseMs * pulseCount };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Find the Element a Reveal Should Land On
    // ------------------------------------------------------------
    // The control's own block when it is drawn; otherwise its section, so a
    // reveal of a control hidden by a rule still shows the user where to look.
    function VghLantern__ControlPanel__RevealTarget(host, sectionKey, controlKey) {
        var target  =  controlKey ? host.querySelector('[' + ATTR_BLOCK + '="' + controlKey + '"]') : null;
        if (target) return target;

        var header  =  sectionKey ? host.querySelector('[' + ATTR_SECTION + '="' + sectionKey + '"]') : null;
        return header ? (header.closest('.' + CSS_SECTION) || header) : null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Put the Pulse Class on an Element, Part Way Through If Need Be
    // ------------------------------------------------------------
    // The timing travels as custom properties, so the keyframes in the stylesheet
    // read the JSON's numbers rather than a second copy of them. elapsedMs starts
    // a resumed pulse where the old element left off rather than from the top.
    function VghLantern__ControlPanel__ApplyAttention(element, timing, elapsedMs) {
        element.style.setProperty('--VghLantern_RevealPulseMs',    timing.PulseMs + 'ms');
        element.style.setProperty('--VghLantern_RevealPulseCount', String(timing.PulseCount));
        element.style.animationDelay  =  elapsedMs > 0 ? ('-' + Math.round(elapsedMs) + 'ms') : '';

        element.classList.remove(CSS_ATTENTION);
        void element.offsetWidth;                                             // <-- Restart the animation if the class was already on
        element.classList.add(CSS_ATTENTION);

        element.addEventListener('animationend', function onEnd(ev) {
            if (ev.target !== element) return;                                // <-- A child's own animation ending is not ours
            element.removeEventListener('animationend', onEnd);
            element.classList.remove(CSS_ATTENTION);
            element.style.animationDelay  =  '';
            VghLantern__ControlPanel__Attention  =  null;
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Put a Pulse Still Playing Back After a Rebuild
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__ResumeAttention(host) {
        var attention  =  VghLantern__ControlPanel__Attention;
        if (!attention || !VghLantern__ControlPanel__IsShowing(host)) return;

        var elapsedMs  =  Date.now() - attention.StartedMs;
        if (elapsedMs >= attention.DurationMs) {
            VghLantern__ControlPanel__Attention  =  null;
            return;
        }

        var element  =  host.querySelector('[' + ATTR_BLOCK + '="' + attention.ControlKey + '"]');
        if (element) VghLantern__ControlPanel__ApplyAttention(element, VghLantern__ControlPanel__AttentionTiming(), elapsedMs);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Take Up a Waiting Reveal Once the Panel Is Showing
    // ------------------------------------------------------------
    // Deferred a frame so the scroll measures the layout the browser has just
    // laid out, not the one it is about to replace: on a mode switch the panel
    // has only now become visible.
    function VghLantern__ControlPanel__ConsumePendingReveal(host) {
        var pending  =  VghLantern__ControlPanel__PendingReveal;
        if (!pending || !VghLantern__ControlPanel__IsShowing(host)) return;

        VghLantern__ControlPanel__PendingReveal  =  null;

        var target  =  VghLantern__ControlPanel__RevealTarget(host, pending.SectionKey, pending.ControlKey);
        if (!target) return;

        var timing  =  VghLantern__ControlPanel__AttentionTiming();

        window.requestAnimationFrame(function() {
            // A rebuild inside that one frame replaced the element: find its
            // successor rather than pulse something no longer on the page.
            var live  =  target.isConnected
                ? target
                : VghLantern__ControlPanel__RevealTarget(VghLantern__ControlPanel__RootEl, pending.SectionKey, pending.ControlKey);
            if (!live) return;

            live.scrollIntoView({ behavior : 'smooth', block : 'center' });

            VghLantern__ControlPanel__Attention  =  {
                ControlKey : live.getAttribute(ATTR_BLOCK) || '',
                StartedMs  : Date.now(),
                DurationMs : timing.DurationMs
            };
            VghLantern__ControlPanel__ApplyAttention(live, timing, 0);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Section, Bring a Control Into View and Pulse It
    // ------------------------------------------------------------
    // Safe to call while another mode is showing: the request waits for the next
    // render of a visible panel, which is the one the mode switch triggers. So a
    // caller asks first and switches mode second, and the order never matters.
    function VghLantern__ControlPanel__RevealControl(sectionKey, controlKey) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};

        VghLantern__ControlPanel__PendingReveal  =  { SectionKey : sectionKey, ControlKey : controlKey };

        if (!VghLantern__ControlPanel__OpenKeys) VghLantern__ControlPanel__OpenKeys  =  new Set();
        if (sectionKey && !VghLantern__ControlPanel__OpenKeys.has(sectionKey)) {
            if (behaviour.CollapseOthersOnOpen === true) VghLantern__ControlPanel__OpenKeys.clear();
            VghLantern__ControlPanel__OpenKeys.add(sectionKey);
        }

        if (VghLantern__ControlPanel__IsShowing(VghLantern__ControlPanel__RootEl)) {
            VghLantern__ControlPanel__Render(VghLantern__ControlPanel__RootEl);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding and Value Commit
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Mirror a Slider Value into Its Paired Numeric Field
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__MirrorPair(controlKey, sourceRole, value) {
        if (!VghLantern__ControlPanel__RootEl) return;

        var targetRole  =  (sourceRole === 'slider') ? 'numeric' : 'slider';
        var selector    =  '[' + ATTR_CONTROL + '="' + controlKey + '"][' + ATTR_ROLE + '="' + targetRole + '"]';
        var target      =  VghLantern__ControlPanel__RootEl.querySelector(selector);

        if (target) target.value  =  value;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Commit a Control Value to the Active Lantern
    // ------------------------------------------------------------
    // The one write path in the editor. Everything downstream - the solve, both
    // viewports, the warnings, the autosave - hangs off the single
    // UpdateCurrentLantern call at the end of this function.
    function VghLantern__ControlPanel__CommitValue(controlKey, rawValue, sourceRole) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var StateManager =  window.VghLantern__AppCore__StateManager;
        if (!Descriptors || !StateManager) return;

        var descriptor  =  VghLantern__ControlPanel__DescriptorMap[controlKey];
        if (!descriptor) return;

        var lantern  =  VghLantern__ControlPanel__ActiveLantern();
        if (!lantern) return;

        var result  =  Descriptors.VghLantern__ControlDescriptors__WriteValue(lantern, descriptor, rawValue);
        if (!result.DidChange) return;

        if (sourceRole) VghLantern__ControlPanel__MirrorPair(controlKey, sourceRole, result.Value);

        StateManager.VghLantern__StateManager__UpdateCurrentLantern(lantern);

        // Toggles and selects can change which controls apply, so the panel needs
        // rebuilding. Slider drags never do, so they skip the redraw entirely and
        // keep the pointer grab intact. Text and textarea are excluded for the
        // same reason a slider is: rebuilding the DOM mid-sentence would drop the
        // text cursor, and neither type ever changes which controls are visible.
        var isStructural  =  descriptor.Type !== Descriptors.VghLantern__ControlDescriptors__TypeSlider
                           && descriptor.Type !== Descriptors.VghLantern__ControlDescriptors__TypeText
                           && descriptor.Type !== Descriptors.VghLantern__ControlDescriptors__TypeTextarea;
        if (isStructural) VghLantern__ControlPanel__ScheduleRedraw();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Commit for a Text or Textarea Field
    // ------------------------------------------------------------
    // Typing fires an input event per keystroke; committing on every one of them
    // would walk WriteValue -> UpdateCurrentLantern -> solve on every letter.
    // This coalesces those into one write, the same way ScheduleRedraw coalesces
    // a slider drag into one redraw.
    function VghLantern__ControlPanel__QueueTextCommit(controlKey, rawValue) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Descriptors   =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour     =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};
        var delayMs       =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            behaviour, 'TextCommitDebounceMs', 'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__ControlBehaviour');

        VghLantern__ControlPanel__PendingTextCommit  =  { ControlKey: controlKey, RawValue: rawValue };

        if (VghLantern__ControlPanel__TextCommitTimer) clearTimeout(VghLantern__ControlPanel__TextCommitTimer);

        VghLantern__ControlPanel__TextCommitTimer  =  setTimeout(function() {
            VghLantern__ControlPanel__TextCommitTimer  =  null;
            VghLantern__ControlPanel__FlushTextCommit();
        }, delayMs);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Flush Any Pending Debounced Text Commit Immediately
    // ------------------------------------------------------------
    // Called on focusout so leaving the field is an explicit end of editing,
    // not a wait for the timer - the same contract JobNotes uses.
    function VghLantern__ControlPanel__FlushTextCommit() {
        if (VghLantern__ControlPanel__TextCommitTimer) {
            clearTimeout(VghLantern__ControlPanel__TextCommitTimer);
            VghLantern__ControlPanel__TextCommitTimer  =  null;
        }

        var pending  =  VghLantern__ControlPanel__PendingTextCommit;
        if (!pending) return;

        VghLantern__ControlPanel__PendingTextCommit  =  null;
        VghLantern__ControlPanel__CommitValue(pending.ControlKey, pending.RawValue, null);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle a Section Open or Closed
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__ToggleSection(sectionKey) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};

        if (!VghLantern__ControlPanel__OpenKeys) VghLantern__ControlPanel__OpenKeys  =  new Set();

        if (VghLantern__ControlPanel__OpenKeys.has(sectionKey)) {
            VghLantern__ControlPanel__OpenKeys.delete(sectionKey);
        } else {
            if (behaviour.CollapseOthersOnOpen === true) VghLantern__ControlPanel__OpenKeys.clear();
            VghLantern__ControlPanel__OpenKeys.add(sectionKey);
        }

        VghLantern__ControlPanel__Render(VghLantern__ControlPanel__RootEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Input Event
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OnInput(e) {
        var target  =  e.target;
        if (!target || !target.getAttribute) return;

        var controlKey  =  target.getAttribute(ATTR_CONTROL);
        var role        =  target.getAttribute(ATTR_ROLE);
        if (!controlKey || !role) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};

        // Live dragging is opt-out. When off, the value lands on 'change' only.
        if (role === 'slider' && !ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviour, 'LiveUpdateWhileDragging', BEHAVIOUR_CONFIG_LABEL)) {
            VghLantern__ControlPanel__MirrorPair(controlKey, role, target.value);
            return;
        }

        if (role === 'toggle') return;                                       // <-- Checkboxes commit on change, not input

        // Text and textarea route through the debounce queue rather than
        // committing straight away, so a keystroke never triggers a solve.
        if (role === 'text') {
            VghLantern__ControlPanel__QueueTextCommit(controlKey, target.value);
            return;
        }

        VghLantern__ControlPanel__CommitValue(controlKey, target.value, role);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Change Event
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OnChange(e) {
        var target  =  e.target;
        if (!target || !target.getAttribute) return;

        var controlKey  =  target.getAttribute(ATTR_CONTROL);
        var role        =  target.getAttribute(ATTR_ROLE);
        if (!controlKey || !role) return;

        if (role === 'text') return;                                         // <-- Handled by input debounce + focusout flush only

        var rawValue  =  (role === 'toggle') ? target.checked : target.value;
        VghLantern__ControlPanel__CommitValue(controlKey, rawValue, role === 'toggle' ? null : role);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Focusout Event
    // ------------------------------------------------------------
    // Leaving a text field is treated as an explicit end of editing, so any
    // debounced keystroke still waiting on the timer is written immediately
    // rather than left to fire after focus has already moved on.
    function VghLantern__ControlPanel__OnFocusOut(e) {
        var target  =  e.target;
        if (!target || !target.getAttribute) return;

        var role  =  target.getAttribute(ATTR_ROLE);
        if (role === 'text') VghLantern__ControlPanel__FlushTextCommit();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Click on an Action Button Control
    // ------------------------------------------------------------
    // Confirm is optional: most Action buttons fire straight away, but a
    // destructive one (e.g. Delete Lantern) supplies a Confirm block so this
    // routes through the shared ConfirmModal before calling Action.
    function VghLantern__ControlPanel__OnActionButtonClick(controlKey) {
        var descriptor  =  VghLantern__ControlPanel__DescriptorMap[controlKey];
        if (!descriptor || typeof descriptor.Action !== 'function') return;

        var lantern  =  VghLantern__ControlPanel__ActiveLantern();
        if (!lantern) return;

        if (!descriptor.Confirm) {
            descriptor.Action(lantern);
            return;
        }

        var ConfirmModal  =  window.VghLantern__AppCore__ConfirmModal;
        if (!ConfirmModal) {
            descriptor.Action(lantern);                                      // <-- Fail open rather than silently drop the action
            return;
        }

        ConfirmModal.VghLantern__ConfirmModal__Show({
            Title        : descriptor.Confirm.Title,
            Message      : descriptor.Confirm.Message,
            ConfirmLabel : descriptor.Confirm.ConfirmLabel,
            Danger       : true,
            OnConfirm    : function() { descriptor.Action(lantern); }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Click for Section Headers and Buttons
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OnClick(e) {
        // Cards are buttons too, so they are tested first - otherwise the action
        // button branch would claim the click and try to fire an Action that a
        // card descriptor does not have.
        var card  =  e.target.closest ? e.target.closest('[' + ATTR_ROLE + '="card"]') : null;
        if (card) {
            var cardKey  =  card.getAttribute(ATTR_CONTROL);
            if (cardKey) VghLantern__ControlPanel__CommitValue(cardKey, card.getAttribute(ATTR_VALUE) || '', null);
            return;
        }

        var actionButton  =  e.target.closest ? e.target.closest('[' + ATTR_ROLE + '="button"]') : null;
        if (actionButton) {
            var controlKey  =  actionButton.getAttribute(ATTR_CONTROL);
            if (controlKey) VghLantern__ControlPanel__OnActionButtonClick(controlKey);
            return;
        }

        var groupHead  =  e.target.closest ? e.target.closest('[' + ATTR_COLLAPSIBLE + ']') : null;
        if (groupHead) {
            var groupKey  =  groupHead.getAttribute(ATTR_COLLAPSIBLE);
            if (VghLantern__ControlPanel__OpenGroupKeys.has(groupKey)) VghLantern__ControlPanel__OpenGroupKeys.delete(groupKey);
            else                                                       VghLantern__ControlPanel__OpenGroupKeys.add(groupKey);
            VghLantern__ControlPanel__Render(VghLantern__ControlPanel__RootEl);
            return;
        }

        var header  =  e.target.closest ? e.target.closest('[' + ATTR_SECTION + ']') : null;
        if (!header) return;

        var sectionKey  =  header.getAttribute(ATTR_SECTION);
        if (sectionKey) VghLantern__ControlPanel__ToggleSection(sectionKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Attach the Delegated Listener Set Once
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__BindDelegated(hostElement) {
        if (VghLantern__ControlPanel__IsBound || !hostElement) return;

        hostElement.addEventListener('input',     VghLantern__ControlPanel__OnInput);
        hostElement.addEventListener('change',    VghLantern__ControlPanel__OnChange);
        hostElement.addEventListener('click',     VghLantern__ControlPanel__OnClick);
        hostElement.addEventListener('focusout',  VghLantern__ControlPanel__OnFocusOut);

        // Bound here, once, for the same reason the DOM listeners are: this runs
        // exactly once per page, so the subscription can never stack.
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) {
            StateManager.VghLantern__StateManager__On('lanternUpdated', VghLantern__ControlPanel__RefreshValuesInPlace);
        }

        VghLantern__ControlPanel__IsBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ControlPanel__Render         : VghLantern__ControlPanel__Render,
        VghLantern__ControlPanel__ToggleSection  : VghLantern__ControlPanel__ToggleSection,
        VghLantern__ControlPanel__RevealControl  : VghLantern__ControlPanel__RevealControl
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__ControlPanel  =  VghLantern__LanternEditor__ControlPanel;
