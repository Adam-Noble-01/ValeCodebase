// =============================================================================
// VALEVISION3D - RENDER EFFECT - LINEWORK SETTINGS STATE
// =============================================================================
//
// FILE       : Na__RenderEffect__LineworkSettings__State.js
// NAMESPACE  : Na__LineworkSettings
// MODULE     : Linework Settings State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Session-scoped runtime thickness factors for model linework and
//              profile lines, plus the "Silly Lines" wave amplitude. Shared by
//              the live viewport render pipeline and the static image exports.
// CREATED    : 08-Jul-2026
//
// DESCRIPTION:
// - Holds three session-scoped values (no persistence by design - every new
//   session initialises to 1.00x factors and straight lines):
//     - Linework thickness factor ..... multiplies LineMaterial.linewidth on
//       every fat line inside a linework-tagged GLB root (grid lines excluded).
//     - Profile line thickness factor . multiplies the per-frame dynamic edge
//       width computed inside the profile lines effect (read via getter).
//     - Silly Lines amplitude ......... sine-wave px amplitude applied to the
//       profile lines edge sampling (0 = straight).
// - Base LineMaterial widths are stashed on material.userData on first touch
//   so repeated factor changes never compound.
// - Silly uniforms are re-applied automatically after a render engine switch
//   (the composer and profile lines pass are rebuilt by the switch).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.0.0
// - Initial release alongside the Advanced Linework Settings export panel UI.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from './Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Silly Lines Wave Geometry
    // ------------------------------------------------------------
    const Na__LineworkSettings__SILLY_WAVELENGTH_PX = 120;   // <-- Fixed sine wavelength in pixels (amplitude is the user control)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Session-Scoped Settings (No Persistence by Design)
    // ------------------------------------------------------------
    let Na__LineworkSettings__LineworkFactor   = 1.0;   // <-- Fat-line width multiplier (model linework GLBs)
    let Na__LineworkSettings__ProfileFactor    = 1.0;   // <-- Profile line edge width multiplier
    let Na__LineworkSettings__SillyAmplitudePx = 0.0;   // <-- Sine amplitude in px (0 = straight lines)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Export Line Scales (Static Export Renderer Only)
    // ------------------------------------------------------------
    // Pixel-based line widths mean different RELATIVE sizes at export
    // resolutions than in the viewport. The tiled export renderer sets
    // these resolution-compensation scales for the duration of an export
    // (and resets them to 1.0 in its finally) so 1.00x on the user sliders
    // always means "exactly what the viewport shows". Profile lines and
    // fat linework need DIFFERENT scales because profile widths are
    // physical-viewport-px based while LineMaterial widths are resolved
    // against each material's load-time resolution uniform.
    // ------------------------------------------------------------
    let Na__LineworkSettings__ProfileExportScale  = 1.0; // <-- Multiplies u_edgeWidth during exports (1.0 = live viewport)
    let Na__LineworkSettings__LineworkExportScale = 1.0; // <-- Multiplies LineMaterial.linewidth during exports (1.0 = live viewport)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Wired References
    // ------------------------------------------------------------
    let Na__LineworkSettings__Scene            = null;  // <-- Scene root for linework traversal
    let Na__LineworkSettings__GetPipelineState = null;  // <-- Pipeline state getter (profile lines pass access)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Walk Parent Chain to Detect Linework GLB Root
    // ------------------------------------------------------------
    // Mirrors the model loader tag: linework GLB roots carry
    // userData.Na__ModelType === 'linework'. Grid lines and other fat-line
    // systems are untagged and therefore excluded from the thickness factor.
    // ------------------------------------------------------------
    function Na__LineworkSettings__IsInsideLineworkGroup(object) {
        let current = object;                                                 // <-- Start at the object itself
        while (current) {
            if (current.userData && current.userData.Na__ModelType === 'linework') {
                return true;                                                  // <-- Found linework root in ancestor chain
            }
            current = current.parent;                                         // <-- Walk up scene graph
        }
        return false;                                                         // <-- No linework ancestor found
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Active Profile Lines Pass
    // ------------------------------------------------------------
    function Na__LineworkSettings__ResolveProfileLinesPass() {
        const state = (typeof Na__LineworkSettings__GetPipelineState === 'function')
            ? Na__LineworkSettings__GetPipelineState()
            : null;
        return (state && state.profileLinesPassRef) ? state.profileLinesPassRef : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Silly Lines Uniforms to a Profile Lines Pass
    // ------------------------------------------------------------
    function Na__LineworkSettings__ApplySillyUniforms(pass) {
        if (!pass || !pass.material || !pass.material.uniforms) return;
        const uniforms = pass.material.uniforms;
        if (uniforms.u_sillyAmplitudePx)  uniforms.u_sillyAmplitudePx.value  = Na__LineworkSettings__SillyAmplitudePx;
        if (uniforms.u_sillyWavelengthPx) uniforms.u_sillyWavelengthPx.value = Na__LineworkSettings__SILLY_WAVELENGTH_PX;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Linework Settings State
    // ------------------------------------------------------------
    // Params:
    //   scene            {THREE.Scene}  Scene root for linework traversal
    //   getPipelineState {Function}     Returns the active render pipeline state
    // ------------------------------------------------------------
    function Na__LineworkSettings__Initialize(scene, getPipelineState) {
        Na__LineworkSettings__Scene            = scene || null;
        Na__LineworkSettings__GetPipelineState = getPipelineState || null;

        // ENGINE SWITCH | Rebuilt composer means a fresh profile lines pass
        // ------------------------------------------------------------
        window.addEventListener('na-render-engine-changed', () => {
            Na__LineworkSettings__ApplySillyUniforms(Na__LineworkSettings__ResolveProfileLinesPass()); // <-- Re-apply silly wave to the new pass
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Setters and Getters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Combined Width to All Linework Materials
    // ------------------------------------------------------------
    // Single applier shared by the user factor setter and the export
    // scale setter so the two multipliers always compose off the stashed
    // base width and never compound.
    // ------------------------------------------------------------
    function Na__LineworkSettings__ApplyLineworkWidths() {
        if (!Na__LineworkSettings__Scene) return;

        const combined = Na__LineworkSettings__LineworkFactor * Na__LineworkSettings__LineworkExportScale; // <-- User factor x export compensation

        Na__LineworkSettings__Scene.traverse((object) => {
            if (!object.isLine2 && !object.isLineSegments2)          return;  // <-- Fat lines only
            if (!Na__LineworkSettings__IsInsideLineworkGroup(object)) return; // <-- Model linework only (skip grid and helper lines)

            const material = object.material;
            if (!material || !Number.isFinite(material.linewidth)) return;

            if (!Number.isFinite(material.userData.Na__LineworkSettings__BaseWidth)) {
                material.userData.Na__LineworkSettings__BaseWidth = material.linewidth; // <-- Stash base once so factors never compound
            }
            material.linewidth = material.userData.Na__LineworkSettings__BaseWidth * combined; // <-- Apply combined width
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Linework Thickness Factor (Model Fat Lines)
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetLineworkFactor(factor) {
        if (!Number.isFinite(factor) || factor <= 0) return;
        Na__LineworkSettings__LineworkFactor = factor;
        Na__LineworkSettings__ApplyLineworkWidths();                          // <-- Re-apply combined widths
        Na__RenderLoop__RequestRender();                                      // <-- Redraw viewport with new widths
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Export Line Scales (Called by the Static Export Renderer)
    // ------------------------------------------------------------
    // Set both compensation scales at export start; reset with (1, 1) in
    // the export renderer's finally. No render request - the export tile
    // loop owns the frame while these are active.
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetExportScales(profileScale, lineworkScale) {
        Na__LineworkSettings__ProfileExportScale  = (Number.isFinite(profileScale)  && profileScale  > 0) ? profileScale  : 1.0;
        Na__LineworkSettings__LineworkExportScale = (Number.isFinite(lineworkScale) && lineworkScale > 0) ? lineworkScale : 1.0;
        Na__LineworkSettings__ApplyLineworkWidths();                          // <-- Push combined widths to linework materials
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Profile Export Scale (Read Per Frame by Profile Lines)
    // ------------------------------------------------------------
    function Na__LineworkSettings__GetProfileExportScale() {
        return Na__LineworkSettings__ProfileExportScale;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Profile Line Thickness Factor
    // ------------------------------------------------------------
    // The profile lines effect recomputes its dynamic edge width every
    // frame and multiplies by this factor (read via the getter below),
    // so a render request is all that is needed here.
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetProfileLineFactor(factor) {
        if (!Number.isFinite(factor) || factor <= 0) return;
        Na__LineworkSettings__ProfileFactor = factor;
        Na__RenderLoop__RequestRender();                                      // <-- Next frame picks up the new factor
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Profile Line Thickness Factor (Read Per Frame)
    // ------------------------------------------------------------
    function Na__LineworkSettings__GetProfileLineFactor() {
        return Na__LineworkSettings__ProfileFactor;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Silly Lines Wave Amplitude in Pixels
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetSillyAmplitude(amplitudePx) {
        if (!Number.isFinite(amplitudePx) || amplitudePx < 0) return;
        Na__LineworkSettings__SillyAmplitudePx = amplitudePx;
        Na__LineworkSettings__ApplySillyUniforms(Na__LineworkSettings__ResolveProfileLinesPass()); // <-- Push to the live pass
        Na__RenderLoop__RequestRender();                                      // <-- Redraw viewport with new waviness
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Linework Settings API
    // ------------------------------------------------------------
    export {
        Na__LineworkSettings__Initialize,
        Na__LineworkSettings__SetLineworkFactor,
        Na__LineworkSettings__SetProfileLineFactor,
        Na__LineworkSettings__GetProfileLineFactor,
        Na__LineworkSettings__SetSillyAmplitude,
        Na__LineworkSettings__SetExportScales,
        Na__LineworkSettings__GetProfileExportScale
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
