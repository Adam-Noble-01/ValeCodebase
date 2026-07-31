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
     to draw a slider, a toggle, a select and an expandable group, and nothing
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
   session and resets on reload, which is the behaviour staff expect.

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
    const CSS_GROUP           =  'VghLantern__ControlPanel__Group';
    const CSS_GROUP_BODY      =  'VghLantern__ControlPanel__GroupBody';
    const CSS_SUBHEADING      =  'VghLantern__ControlPanel__SubHeading';
    const CSS_EMPTY           =  'VghLantern__ControlPanel__EmptyState';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attribute Names
    // ------------------------------------------------------------
    const ATTR_SECTION  =  'data-vgh-section';                               // <-- Section key on headers
    const ATTR_CONTROL  =  'data-vgh-control';                               // <-- Descriptor key on inputs
    const ATTR_ROLE     =  'data-vgh-role';                                  // <-- slider | numeric | toggle | select
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel State
    // ------------------------------------------------------------
    let VghLantern__ControlPanel__RootEl        =  null;                     // <-- Panel container element
    let VghLantern__ControlPanel__Sections      =  [];                       // <-- Last built section list
    let VghLantern__ControlPanel__DescriptorMap =  {};                       // <-- Descriptor key -> normalised descriptor
    let VghLantern__ControlPanel__OpenKeys      =  null;                     // <-- Set of open section keys, null until first build
    let VghLantern__ControlPanel__IsBound       =  false;                    // <-- Delegated listeners attached once
    let VghLantern__ControlPanel__RedrawTimer   =  null;                     // <-- Coalesces redraws during a slider drag
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
    function VghLantern__ControlPanel__BuildSlider(descriptor, currentValue) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};
        var showNumeric  =  behaviour.ShowNumericEntryBeside !== false;
        var showUnit     =  behaviour.ShowUnitSuffix !== false && !!descriptor.Unit;

        var displayValue  =  VghLantern__ControlPanel__FormatNumber(currentValue, descriptor.Decimals);
        var keyAttr       =  VghLantern__ControlPanel__Escape(descriptor.Key);

        var html  =  '<div class="' + CSS_CONTROL_ROW + '">';

        html  +=      '<input type="range" class="' + CSS_SLIDER + '"'
                   +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                   +      ' ' + ATTR_ROLE + '="slider"'
                   +      ' min="'   + descriptor.Min  + '"'
                   +      ' max="'   + descriptor.Max  + '"'
                   +      ' step="'  + descriptor.Step + '"'
                   +      ' value="' + VghLantern__ControlPanel__Escape(displayValue) + '">';

        if (showNumeric) {
            html  +=  '<input type="number" class="' + CSS_NUMERIC + '"'
                   +      ' ' + ATTR_CONTROL + '="' + keyAttr + '"'
                   +      ' ' + ATTR_ROLE + '="numeric"'
                   +      ' min="'   + descriptor.Min  + '"'
                   +      ' max="'   + descriptor.Max  + '"'
                   +      ' step="'  + descriptor.Step + '"'
                   +      ' value="' + VghLantern__ControlPanel__Escape(displayValue) + '">';
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

        var options    =  Descriptors.VghLantern__ControlDescriptors__ResolveOptions(descriptor);
        var behaviour  =  Descriptors.VghLantern__ControlDescriptors__Behaviour();
        var emptyLabel =  behaviour.EmptyOptionLabel || '- none selected -';
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


    // HELPER FUNCTION | Test Whether an Option List Contains a Value
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OptionsContain(options, value) {
        for (var i = 0; i < options.length; i++) {
            if (String(options[i].Value) === value) return true;
        }
        return false;
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

        VghLantern__ControlPanel__DescriptorMap[descriptor.Key]  =  descriptor;

        var currentValue  =  Descriptors.VghLantern__ControlDescriptors__ReadValue(lantern, descriptor);

        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeExpandable) {
            return VghLantern__ControlPanel__BuildExpandable(descriptor, lantern, currentValue);
        }

        var inputHtml  =  '';
        if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeToggle) {
            inputHtml  =  VghLantern__ControlPanel__BuildToggle(descriptor, currentValue);
        } else if (descriptor.Type === Descriptors.VghLantern__ControlDescriptors__TypeSelect) {
            inputHtml  =  VghLantern__ControlPanel__BuildSelect(descriptor, currentValue);
        } else {
            inputHtml  =  VghLantern__ControlPanel__BuildSlider(descriptor, currentValue);
        }

        var html  =  '<div class="' + CSS_CONTROL + ' ' + CSS_CONTROL + '--' + descriptor.Type + '">';
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

        var html  =  '<div class="' + CSS_GROUP + (isOn ? ' ' + CSS_GROUP + '--open' : '') + '">';
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
            host.className  =  CSS_PANEL;
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

        host.className  =  CSS_PANEL;
        host.innerHTML  =  html || '<p class="' + CSS_EMPTY + '">No controls available.</p>';

        VghLantern__ControlPanel__BindDelegated(host);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Schedule a Coalesced Panel Redraw
    // ------------------------------------------------------------
    // Only needed when a write changes which controls are visible. Debouncing
    // stops a slider drag from rebuilding the DOM on every pointer move.
    function VghLantern__ControlPanel__ScheduleRedraw() {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};
        var delayMs      =  (typeof behaviour.SliderDebounceMs === 'number') ? behaviour.SliderDebounceMs : 40;

        if (VghLantern__ControlPanel__RedrawTimer) clearTimeout(VghLantern__ControlPanel__RedrawTimer);

        VghLantern__ControlPanel__RedrawTimer  =  setTimeout(function() {
            VghLantern__ControlPanel__RedrawTimer  =  null;
            VghLantern__ControlPanel__Render(VghLantern__ControlPanel__RootEl);
        }, delayMs);
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
        // keep the pointer grab intact.
        var isStructural  =  descriptor.Type !== Descriptors.VghLantern__ControlDescriptors__TypeSlider;
        if (isStructural) VghLantern__ControlPanel__ScheduleRedraw();
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

        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        var behaviour    =  Descriptors ? Descriptors.VghLantern__ControlDescriptors__Behaviour() : {};

        // Live dragging is opt-out. When off, the value lands on 'change' only.
        if (role === 'slider' && behaviour.LiveUpdateWhileDragging === false) {
            VghLantern__ControlPanel__MirrorPair(controlKey, role, target.value);
            return;
        }

        if (role === 'toggle') return;                                       // <-- Checkboxes commit on change, not input

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

        var rawValue  =  (role === 'toggle') ? target.checked : target.value;
        VghLantern__ControlPanel__CommitValue(controlKey, rawValue, role === 'toggle' ? null : role);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Delegated Click for Section Headers
    // ------------------------------------------------------------
    function VghLantern__ControlPanel__OnClick(e) {
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

        hostElement.addEventListener('input',  VghLantern__ControlPanel__OnInput);
        hostElement.addEventListener('change', VghLantern__ControlPanel__OnChange);
        hostElement.addEventListener('click',  VghLantern__ControlPanel__OnClick);

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
        VghLantern__ControlPanel__ToggleSection  : VghLantern__ControlPanel__ToggleSection
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__ControlPanel  =  VghLantern__LanternEditor__ControlPanel;
