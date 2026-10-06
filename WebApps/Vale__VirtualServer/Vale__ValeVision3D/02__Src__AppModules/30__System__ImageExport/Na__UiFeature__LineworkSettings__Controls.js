// =============================================================================
// VALEVISION3D - UI FEATURE - ADVANCED LINEWORK SETTINGS CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__LineworkSettings__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Linework Settings Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wires the "Advanced Linework Settings" dropdown in the Export
//              Image panel - Linework Thickness, Profile Line Thickness, and
//              Silly Lines sliders.
// CREATED    : 08-Jul-2026
//
// DESCRIPTION:
// - Three sliders living in a <details> block (closed by default) under the
//   export Resolution slider. All three affect the LIVE viewport and every
//   export equally - the export pipeline renders through the same materials
//   and profile lines pass.
// - Thickness sliders snap to fixed factor stops (0.5x - 3.00x, default 1.00x).
// - Silly Lines snaps to named waviness stops (Straight -> Absurd) mapping to
//   sine amplitudes in pixels applied to the profile lines edge sampling.
// - Session-scoped by design: no persistence, every load starts at 1.00x and
//   Straight. State lives in Na__RenderEffect__LineworkSettings__State.js.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.0.0
// - Initial release.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Linework Settings Runtime State
    // ------------------------------------------------------------
    import {
        Na__LineworkSettings__SetLineworkFactor,
        Na__LineworkSettings__SetProfileLineFactor,
        Na__LineworkSettings__SetSillyAmplitude
    } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Thickness Factor Stops (Shared by Both Thickness Sliders)
    // ------------------------------------------------------------
    const Na__LineworkSettings__FACTOR_STOPS        = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];  // <-- Crude percentage factor options
    const Na__LineworkSettings__FACTOR_DEFAULT_INDEX = 2;                                      // <-- 1.00x default each session
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Silly Lines Stops (Amplitude in Pixels + Labels)
    // ------------------------------------------------------------
    const Na__LineworkSettings__SILLY_STOPS = [
        { label: 'Straight',  amplitudePx: 0.0 },   // <-- Default: no wave
        { label: 'Subtle',    amplitudePx: 0.75 },
        { label: 'Gentle',    amplitudePx: 1.5 },
        { label: 'Wavy',      amplitudePx: 2.5 },
        { label: 'Very Wavy', amplitudePx: 4.0 },
        { label: 'Silly',     amplitudePx: 6.0 },
        { label: 'Absurd',    amplitudePx: 9.0 }
    ];
    // ------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__LineworkSettings__LineworkSliderId = 'naLineworkThicknessSlider';   // <-- Linework Thickness range input
    const Na__LineworkSettings__LineworkValueId  = 'naLineworkThicknessValue';    // <-- Linework Thickness value label
    const Na__LineworkSettings__ProfileSliderId  = 'naProfileThicknessSlider';    // <-- Profile Line Thickness range input
    const Na__LineworkSettings__ProfileValueId   = 'naProfileThicknessValue';     // <-- Profile Line Thickness value label
    const Na__LineworkSettings__SillySliderId    = 'naSillyLinesSlider';          // <-- Silly Lines range input
    const Na__LineworkSettings__SillyValueId     = 'naSillyLinesValue';           // <-- Silly Lines value label
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format a Factor Stop as a Display Label
    // ------------------------------------------------------------
    function Na__LineworkSettings__FormatFactorLabel(factor) {
        return `${factor.toFixed(2)}x`;                                       // <-- e.g. "1.00x", "0.75x", "3.00x"
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire a Snapping Factor Slider to a Setter
    // ------------------------------------------------------------
    function Na__LineworkSettings__WireFactorSlider(sliderId, valueId, applyFactor) {
        const slider = document.getElementById(sliderId);
        const value  = document.getElementById(valueId);
        if (!slider || !value) return;

        slider.min   = 0;
        slider.max   = Na__LineworkSettings__FACTOR_STOPS.length - 1;
        slider.step  = 1;
        slider.value = Na__LineworkSettings__FACTOR_DEFAULT_INDEX;           // <-- Every session starts at 1.00x
        value.textContent = Na__LineworkSettings__FormatFactorLabel(
            Na__LineworkSettings__FACTOR_STOPS[Na__LineworkSettings__FACTOR_DEFAULT_INDEX]
        );

        slider.addEventListener('input', (event) => {
            const index  = parseInt(event.target.value, 10);
            const factor = Na__LineworkSettings__FACTOR_STOPS[index];
            value.textContent = Na__LineworkSettings__FormatFactorLabel(factor); // <-- Sync label
            applyFactor(factor);                                                  // <-- Push to runtime state (viewport + exports)
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire the Silly Lines Slider
    // ------------------------------------------------------------
    function Na__LineworkSettings__WireSillySlider() {
        const slider = document.getElementById(Na__LineworkSettings__SillySliderId);
        const value  = document.getElementById(Na__LineworkSettings__SillyValueId);
        if (!slider || !value) return;

        slider.min   = 0;
        slider.max   = Na__LineworkSettings__SILLY_STOPS.length - 1;
        slider.step  = 1;
        slider.value = 0;                                                     // <-- Every session starts Straight
        value.textContent = Na__LineworkSettings__SILLY_STOPS[0].label;

        slider.addEventListener('input', (event) => {
            const stop = Na__LineworkSettings__SILLY_STOPS[parseInt(event.target.value, 10)];
            value.textContent = stop.label;                                   // <-- Sync label
            Na__LineworkSettings__SetSillyAmplitude(stop.amplitudePx);        // <-- Push wave amplitude to the profile lines pass
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Advanced Linework Settings Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeLineworkSettingsControls() {
        Na__LineworkSettings__WireFactorSlider(
            Na__LineworkSettings__LineworkSliderId,
            Na__LineworkSettings__LineworkValueId,
            Na__LineworkSettings__SetLineworkFactor                           // <-- Fat-line width factor (model linework)
        );

        Na__LineworkSettings__WireFactorSlider(
            Na__LineworkSettings__ProfileSliderId,
            Na__LineworkSettings__ProfileValueId,
            Na__LineworkSettings__SetProfileLineFactor                        // <-- Profile line edge width factor
        );

        Na__LineworkSettings__WireSillySlider();                              // <-- Straight-to-wavy sine amplitude
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Linework Settings Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeLineworkSettingsControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
