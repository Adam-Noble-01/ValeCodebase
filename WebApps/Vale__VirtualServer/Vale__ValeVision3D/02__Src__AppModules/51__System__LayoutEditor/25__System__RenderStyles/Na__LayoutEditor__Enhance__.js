// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - ENHANCE WHITECARD
// =============================================================================
//
// FILE       : Na__LayoutEditor__Enhance__.js
// NAMESPACE  : Na__LeEnhance
// MODULE     : Layout Editor - Enhance Whitecard
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The levels and high-pass sharpen pass from the image export, tuned for sheet viewports so the whitecard greys print white
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - Runs on the rendered raster of a viewport (the 2D underlay or the 3D
//   snapshot) before it is stored or drawn, when the viewport's Enhance
//   Whitecard style is on.
// - Reuses the two strip-based effects the image export ships (levels
//   through a lookup table, high-pass sharpen through canvas filters) with
//   this module's own parameters: a white point low enough that the
//   shaded whitecard faces go to paper white, then a light sharpen so the
//   edges stay crisp at print size.
// - Those parameters are the FULL STRENGTH of the pass. A viewport's Enhance
//   Whitecard weight - a percent, 0 to 100 - says how far towards them to go.
//
// INTEGRATION:
// - Na__LayoutEditor__SnapshotRenderer__ calls Apply on the render canvas with
//   the viewport's strength; the cache keys carry the style flag AND the
//   strength, so both a toggle and a dial re-render.
//
// -----------------------------------------------------------------------------
//
// WHAT A STRENGTH BETWEEN THE ENDS ACTUALLY DOES
//
// Not a blend of two finished pictures - that would mean rendering the pass and
// then mixing it back, twice the pixel work for a result nobody could predict
// from the numbers. Each PARAMETER travels from the value that does nothing to
// the value the style has always used:
//
//   levels white   255 -> LevelsWhite   (205: where the whitecard greys clip to white)
//   levels black     0 -> LevelsBlack
//   levels gamma   1.0 -> LevelsGamma
//   sharpen opacity  0 -> SharpenOpacity
//
// At 100 every one of them is exactly where it was before this existed, so no
// baked sheet and no stored snapshot changes. At 0 the levels are the identity
// remap and the sharpen has nothing to contribute, so both passes are skipped
// outright and the render is handed back untouched - cheaper than running a pass
// that does nothing and, more to the point, provably identical to not running it.
//
// SHARPEN OPACITY IS NEVER PASSED AS ZERO. The export effect reads its opacity
// with `|| 1.0`, so a zero there would silently become a FULL strength sharpen -
// the exact opposite of what was asked for. That is why the pass is skipped
// rather than called with nothing to do.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5: the image export's
//                   levels and high-pass sharpen stack from 30__System__ImageExport/
//                   Na__ImageExport__PostProcessEffects__Pipeline.js, in a fixed two-effect order with the
//                   Layout Editor config's parameters); TrueVision3D took it verbatim as its 1.0.0 for its
//                   v2.21.0 re-alignment (10-Sep-2026) and authored 1.1.0 there; since ported back whole
//                   from TrueVision3D 1.1.0 (HEAD b2aa9151)
// - Source version: 1.1.0 (TrueVision3D v2.93.0, 20-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4, the whole file. This app's copy
//                   before it was its own 1.0.0. TrueVision's v2.93.0 entry says NOT signed off by
//                   Adam; it comes across under DR-01 (c) and is named so.
// - Parity        : verbatim (the code is TrueVision 1.1.0's; the banner, the console prefix and this
//                   note are the only differences)
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.1.0
// - Apply takes a strength percent, 0 to 100, and interpolates every parameter
//   from its no-op value to the configured one. 0 skips both passes; 100 and a
//   missing argument are the pass exactly as it was.
//
// 10-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config and the Export Effects
    // ------------------------------------------------------------
    import { Na__LeCfg__GetEnhanceSetup } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__PostProcess__ApplyLevels } from '../../30__System__ImageExport/Na__ImageExport__PostProcessEffects__Levels.js';
    import { Na__PostProcess__ApplyHighPassSharpen } from '../../30__System__ImageExport/Na__ImageExport__PostProcessEffects__HighPassSharpen.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Strength as a 0..1 Fraction
    // ------------------------------------------------------------
    // Anything that is not a number is full strength: a caller that has not been
    // taught about the dial yet, and every render made before it existed, must
    // go on producing the picture they always did.
    // ------------------------------------------------------------
    function Na__LeEnhance__Fraction(strengthPercent) {
        if (!Number.isFinite(strengthPercent)) return 1;
        return Math.min(1, Math.max(0, strengthPercent / 100));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Travel From the Value That Does Nothing to the Configured One
    // ------------------------------------------------------------
    function Na__LeEnhance__Lerp(idle, full, fraction) {
        return idle + ((full - idle) * fraction);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Pass to a Canvas in Place
    // ------------------------------------------------------------
    // strengthPercent is the viewport's Enhance Whitecard weight, 0 to 100.
    // Omitted, null or not a number means 100 - see Fraction above.
    //
    // Resolves to the same canvas. A canvas without a 2D context (or a
    // browser without canvas filters) comes back unchanged from the effects
    // themselves.
    // ------------------------------------------------------------
    async function Na__LeEnhance__Apply(canvas, strengthPercent) {
        if (!canvas) return canvas;
        const fraction = Na__LeEnhance__Fraction(strengthPercent);
        if (fraction <= 0) return canvas;                                     // <-- Nothing asked for: the render is handed back exactly as it came
        const setup = Na__LeCfg__GetEnhanceSetup();

        const levelsBlack    = Na__LeEnhance__Lerp(0,   setup.levelsBlack,    fraction);   // <-- 0 is the black point that moves nothing
        const levelsWhite    = Na__LeEnhance__Lerp(255, setup.levelsWhite,    fraction);   // <-- 255 is the white point that moves nothing
        const levelsGamma    = Na__LeEnhance__Lerp(1,   setup.levelsGamma,    fraction);   // <-- 1.0 is the gamma that moves nothing
        const sharpenOpacity = Na__LeEnhance__Lerp(0,   setup.sharpenOpacity, fraction);   // <-- 0 contributes no high-pass at all

        try {
            await Na__PostProcess__ApplyLevels(canvas, [ {
                ImageExport__PostProcessEffects__Levels__Parameter__Black : levelsBlack,
                ImageExport__PostProcessEffects__Levels__Parameter__White : levelsWhite,
                ImageExport__PostProcessEffects__Levels__Parameter__Gamma : levelsGamma
            } ]);
            // ZERO OPACITY IS SKIPPED, NOT PASSED. The export effect reads its
            // opacity with `|| 1.0`, so handing it 0 would apply the sharpen at
            // full strength instead of not at all.
            if (setup.sharpenEnabled && sharpenOpacity > 0) {
                await Na__PostProcess__ApplyHighPassSharpen(canvas, [ {
                    ImageExport__PostProcessEffects__HighPassSharpen__Parameter__Radius    : setup.sharpenRadius,
                    ImageExport__PostProcessEffects__HighPassSharpen__Parameter__BlendMode : setup.sharpenBlendMode,
                    ImageExport__PostProcessEffects__HighPassSharpen__Parameter__Opacity   : sharpenOpacity
                } ]);
            }
        } catch (error) {
            console.warn('[ValeVision3D LayoutEditor] Enhance Whitecard pass failed; the plain render is used:', error);
        }
        return canvas;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Enhance API
    // ------------------------------------------------------------
    export {
        Na__LeEnhance__Apply
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
