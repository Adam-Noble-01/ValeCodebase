// =============================================================================
// VALEVISION3D - NAVIGATION HELP PANEL CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__NavigationHelpPanel__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Navigation Help Panel Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Floating help panel explaining how to navigate the 3D model
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Manages the navigation help pop-up panel triggered by the Help button
//   on the floating navigation toolbar.
// - The panel markup lives in index.html (#naNavHelpPanel) following the
//   established stable-element-ID pattern; this module owns its behaviour.
// - Closes via the close button, clicking the backdrop, or pressing Escape.
// - Walk and Fly instruction sections show only when those modes are
//   enabled for the current model (project.json Navmode__EnabledModes),
//   keeping the instructions relevant to what the user can actually do.
// - Keyboard Shortcuts section is populated dynamically from
//   Na__ValeVision__HotkeysDictionary__.json so the panel stays in sync
//   with the dictionary without any manual HTML edits.
// - Entries with Na__Hotkey__Advanced: true go into a collapsed
//   "Advanced Hotkeys" sub-dropdown under Keyboard Shortcuts.
// - Each mode section contains PC / Touchscreen sub-dropdowns
//   (data-nav-help-device="pc"|"touch"); the one matching the active device
//   unfolds by default and the other folds shut, both stay clickable.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeNavigationHelpPanel({ isTouchDevice })
//   from index.html, passing the Na__Device__UseTouchControls flag.
// - Pass Na__UiFeature__OpenNavigationHelpPanel as the toolbar's openHelp
//   callback.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Jul-2026 - Version 1.4.0
// - Advanced Hotkeys collapsible sub-section under Keyboard Shortcuts;
//   dictionary entries flagged Na__Hotkey__Advanced: true render there.
//
// 28-Jul-2026 - Version 1.3.0
// - PC / Touchscreen device sub-dropdowns: instructions per mode are now
//   split per input device, auto-unfolded to match the detected device.
//
// 25-Jun-2026 - Version 1.2.0
// - Keyboard Shortcuts section added; rows populated from the hotkey
//   dictionary JSON so the panel stays in sync automatically.
//
// 10-Jun-2026 - Version 1.1.0
// - Collapsible sections: each mode section now has a fold/unfold toggle.
// - Section headers display matching toolbar icons (Orbit/Walk/Fly/ResetView).
// - Modal scaled 25% larger for improved readability.
//
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation as part of the floating navigation toolbar.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__NavHelp__PanelId               = 'naNavHelpPanel';                  // <-- Modal overlay container
    const Na__NavHelp__BackdropId            = 'naNavHelpBackdrop';               // <-- Click-outside-to-close backdrop
    const Na__NavHelp__CloseBtnId            = 'naNavHelpCloseBtn';               // <-- Close (X) button
    const Na__NavHelp__WalkSectionId         = 'naNavHelpWalkSection';            // <-- Walk instructions section
    const Na__NavHelp__FlySectionId          = 'naNavHelpFlySection';             // <-- Fly instructions section
    const Na__NavHelp__HotkeyListId          = 'naNavHelpHotkeysList';            // <-- Standard keyboard shortcut rows
    const Na__NavHelp__AdvancedSectionId     = 'naNavHelpAdvancedHotkeysSection'; // <-- Advanced hotkeys fold-out
    const Na__NavHelp__AdvancedHotkeyListId  = 'naNavHelpAdvancedHotkeysList';    // <-- Advanced keyboard shortcut rows
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Hotkey Dictionary Path
    // ------------------------------------------------------------
    const Na__NavHelp__HotkeyDictPath = '02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json'; // <-- Source JSON for keyboard shortcut rows
    // ------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes
    // ------------------------------------------------------------
    const Na__NavHelp__OpenClass         = 'na-nav-help--open';        // <-- Visible state class
    const Na__NavHelp__CollapsedClass    = 'na-nav-help__section--collapsed';     // <-- Folded section state
    const Na__NavHelp__SubCollapsedClass = 'na-nav-help__subsection--collapsed';  // <-- Folded device sub-dropdown state
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Open and Close Behaviour
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Navigation Help Panel
    // ------------------------------------------------------------
    function Na__UiFeature__OpenNavigationHelpPanel() {
        const panel = document.getElementById(Na__NavHelp__PanelId);
        if (!panel) return;
        panel.classList.add(Na__NavHelp__OpenClass);                         // <-- Reveal modal overlay
        panel.setAttribute('aria-hidden', 'false');
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Navigation Help Panel
    // ------------------------------------------------------------
    function Na__UiFeature__CloseNavigationHelpPanel() {
        const panel = document.getElementById(Na__NavHelp__PanelId);
        if (!panel) return;
        panel.classList.remove(Na__NavHelp__OpenClass);                      // <-- Hide modal overlay
        panel.setAttribute('aria-hidden', 'true');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Help Panel Currently Open?
    // ------------------------------------------------------------
    function Na__NavHelp__IsOpen() {
        const panel = document.getElementById(Na__NavHelp__PanelId);
        return Boolean(panel && panel.classList.contains(Na__NavHelp__OpenClass));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Fold / Unfold
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Toggle One Section Between Open and Collapsed
    // ------------------------------------------------------------
    function Na__NavHelp__ToggleSection(sectionEl) {
        const isCollapsed = sectionEl.classList.contains(Na__NavHelp__CollapsedClass);
        const headerBtn   = sectionEl.querySelector('[data-nav-help-section]');

        sectionEl.classList.toggle(Na__NavHelp__CollapsedClass, !isCollapsed);         // <-- Flip collapsed state
        if (headerBtn) headerBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle One Device Sub-Dropdown Between Open and Collapsed
    // ------------------------------------------------------------
    function Na__NavHelp__ToggleSubsection(subsectionEl) {
        const isCollapsed = subsectionEl.classList.contains(Na__NavHelp__SubCollapsedClass);
        const headerBtn   = subsectionEl.querySelector('[data-nav-help-subsection]');

        subsectionEl.classList.toggle(Na__NavHelp__SubCollapsedClass, !isCollapsed);   // <-- Flip collapsed state
        if (headerBtn) headerBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Click Handlers onto All Collapsible Section Headers
    // ------------------------------------------------------------
    function Na__NavHelp__InitializeSectionToggles() {
        const content = document.getElementById(Na__NavHelp__PanelId);
        if (!content) return;

        const headers = content.querySelectorAll('[data-nav-help-section]');
        headers.forEach((header) => {
            header.addEventListener('click', () => {
                const section = header.closest('.na-nav-help__section');    // <-- Get parent section element
                if (section) Na__NavHelp__ToggleSection(section);
            });
        });

        const subHeaders = content.querySelectorAll('[data-nav-help-subsection]');
        subHeaders.forEach((header) => {
            header.addEventListener('click', (event) => {
                event.stopPropagation();                                    // <-- Keep parent section header untouched
                const subsection = header.closest('.na-nav-help__subsection'); // <-- Get parent sub-dropdown element
                if (subsection) Na__NavHelp__ToggleSubsection(subsection);
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Fold Device Sub-Dropdowns to Match the Active Device
    // ------------------------------------------------------------
    // PC users see the mouse/keyboard instructions unfolded and the touch
    // instructions folded away; touch users get the reverse. Both remain
    // clickable so either set can still be read on any device.
    function Na__NavHelp__ApplyDeviceDefaults(isTouchDevice) {
        const content = document.getElementById(Na__NavHelp__PanelId);
        if (!content) return;

        const activeDevice = isTouchDevice ? 'touch' : 'pc';
        const subsections  = content.querySelectorAll('[data-nav-help-device]');

        subsections.forEach((subsection) => {
            const matchesDevice = subsection.getAttribute('data-nav-help-device') === activeDevice;
            const headerBtn     = subsection.querySelector('[data-nav-help-subsection]');

            subsection.classList.toggle(Na__NavHelp__SubCollapsedClass, !matchesDevice);   // <-- Fold the other device's list
            if (headerBtn) headerBtn.setAttribute('aria-expanded', matchesDevice ? 'true' : 'false');
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Section Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Show or Hide Walk and Fly Instruction Sections
    // ------------------------------------------------------------
    function Na__NavHelp__RevealModeSections(walkEnabled, flyEnabled) {
        const walkSection = document.getElementById(Na__NavHelp__WalkSectionId);
        const flySection  = document.getElementById(Na__NavHelp__FlySectionId);

        if (walkSection) walkSection.style.display = walkEnabled ? '' : 'none';   // <-- Walk instructions only when relevant
        if (flySection)  flySection.style.display  = flyEnabled  ? '' : 'none';   // <-- Fly instructions only when relevant
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyboard Shortcuts Section - Dynamic Population
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format a Key Binding Object Into a Display Label
    // ------------------------------------------------------------
    function Na__NavHelp__FormatKeyLabel(binding) {
        const parts = [];
        if (binding.Na__Hotkey__CtrlKey)  parts.push('Ctrl');    // <-- Ctrl modifier
        if (binding.Na__Hotkey__AltKey)   parts.push('Alt');     // <-- Alt modifier
        if (binding.Na__Hotkey__ShiftKey) parts.push('Shift');   // <-- Shift modifier

        const keyName = binding.Na__Hotkey__Key
            .replace('PageUp',   'Page Up')                      // <-- Pretty-print browser key names
            .replace('PageDown', 'Page Down')
            .replace('ArrowUp',    '↑')
            .replace('ArrowDown',  '↓')
            .replace('ArrowLeft',  '←')
            .replace('ArrowRight', '→');

        parts.push(keyName);
        return parts.join(' + ');                                 // <-- e.g. "Alt + Shift + W" or "Page Up"
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Single Row Element for a Hotkey Binding
    // ------------------------------------------------------------
    function Na__NavHelp__BuildHotkeyRow(binding) {
        const row   = document.createElement('div');
        const key   = document.createElement('span');
        const desc  = document.createElement('span');

        row.className  = 'na-nav-help__row';
        key.className  = 'na-nav-help__key';
        desc.className = 'na-nav-help__desc';

        key.textContent  = Na__NavHelp__FormatKeyLabel(binding);          // <-- Formatted key combo
        desc.textContent = binding.Na__Hotkey__Description;               // <-- Description from dictionary

        row.appendChild(key);
        row.appendChild(desc);
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch Dictionary and Inject Keyboard Shortcut Rows
    // ------------------------------------------------------------
    function Na__NavHelp__PopulateHotkeySection() {
        const standardContainer = document.getElementById(Na__NavHelp__HotkeyListId);
        const advancedContainer = document.getElementById(Na__NavHelp__AdvancedHotkeyListId);
        const advancedSection   = document.getElementById(Na__NavHelp__AdvancedSectionId);
        if (!standardContainer) return;                                          // <-- Guard: section not in DOM

        fetch(Na__NavHelp__HotkeyDictPath)
            .then(response => {
                if (!response.ok) throw new Error(`NavHelp: Failed to load hotkey dictionary (${response.status})`); // <-- HTTP guard
                return response.json();
            })
            .then(data => {
                const bindings         = data.Na__ValeVision__HotkeysDictionary || [];
                const standardBindings = bindings.filter(binding => binding.Na__Hotkey__Advanced !== true); // <-- Everyday shortcuts
                const advancedBindings = bindings.filter(binding => binding.Na__Hotkey__Advanced === true);  // <-- Advanced fold-out

                standardBindings.forEach(binding => {
                    standardContainer.appendChild(Na__NavHelp__BuildHotkeyRow(binding)); // <-- Standard list
                });

                if (advancedContainer && advancedSection && advancedBindings.length > 0) {
                    advancedBindings.forEach(binding => {
                        advancedContainer.appendChild(Na__NavHelp__BuildHotkeyRow(binding)); // <-- Advanced list
                    });
                    advancedSection.style.display = '';                          // <-- Reveal fold-out when entries exist
                }
            })
            .catch(err => {
                console.warn('[ValeVision3D] NavHelpPanel: Could not load hotkey dictionary -', err); // <-- Graceful failure
            });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Navigation Help Panel
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeNavigationHelpPanel(options) {
        const closeBtn      = document.getElementById(Na__NavHelp__CloseBtnId);
        const backdrop      = document.getElementById(Na__NavHelp__BackdropId);
        const isTouchDevice = Boolean(options && options.isTouchDevice);             // <-- Device flag from index.html detection

        if (closeBtn) closeBtn.addEventListener('click', Na__UiFeature__CloseNavigationHelpPanel);   // <-- Close (X) button
        if (backdrop) backdrop.addEventListener('click', Na__UiFeature__CloseNavigationHelpPanel);   // <-- Click outside to close

        Na__NavHelp__InitializeSectionToggles();                                     // <-- Wire fold/unfold on all section + subsection headers
        Na__NavHelp__ApplyDeviceDefaults(isTouchDevice);                             // <-- Unfold the sub-dropdowns matching this device
        Na__NavHelp__PopulateHotkeySection();                                        // <-- Inject keyboard shortcut rows from dictionary JSON

        // CLOSE ON ESCAPE KEY (only while open — leaves other Escape handlers untouched)
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && Na__NavHelp__IsOpen()) {
                Na__UiFeature__CloseNavigationHelpPanel();
            }
        });

        // SHOW WALK/FLY SECTIONS ONCE PROJECT MODES ARE KNOWN (async load)
        window.addEventListener('na-navigation-modes-loaded', (event) => {
            const modes = event.detail && event.detail.enabledModes;
            if (!modes) return;
            Na__NavHelp__RevealModeSections(
                Boolean(modes.Navmode__EnabledModes__Walk),                  // <-- Walk enabled for this model
                Boolean(modes.Navmode__EnabledModes__Fly)                    // <-- Fly enabled for this model
            );
        }, { once: true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Navigation Help Panel API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeNavigationHelpPanel,
        Na__UiFeature__OpenNavigationHelpPanel,
        Na__UiFeature__CloseNavigationHelpPanel
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
