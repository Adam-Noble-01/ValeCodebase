// =============================================================================
// VALEVISION3D - VIDEO STUDIO - EXPORT SUPERSAMPLER
// =============================================================================
//
// FILE       : Na__VideoStudio__Export__Supersampler.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Export Supersampler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Name the shared supersampler under the video studio's own export,
//              so the frame renderer keeps the import it has always had
// CREATED    : 11-Sep-2026
//
// DESCRIPTION:
// - THE IMPLEMENTATION MOVED. It is now
//   `05__RenderPipeline/Na__RenderEffect__Supersampler__.js`, because the still
//   image exporter and the Layout Editor viewport bakes need exactly the same
//   sub-pixel jitter table and exactly the same half-float accumulation, and a
//   jitter table that exists in two places is one that will eventually disagree
//   with itself. Every word of reasoning - why FXAA cannot reach a shallow
//   line, why the jitter goes into the projection rather than the scene pass,
//   why the 16-sample table has to be re-centred - lives in that file now.
// - This file stays because the frame renderer's import is a seam worth
//   keeping: the video studio asks for "the video studio's supersampler" and
//   does not need to know the render pipeline owns it.
//
// @delegate: ../05__RenderPipeline/Na__RenderEffect__Supersampler__.js
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Parity        : n/a (a re-export)
// - Round trip    : v1.0.0 of this file WAS the original implementation, written here on
//                   11-Sep-2026 for MP4 exports. TrueVision generalised it for two frame
//                   routes and two consumers and that version came back as the shared
//                   render-pipeline module on 12-Sep-2026; this file was reduced to a
//                   re-export in the same pass so only one of them can ever be edited.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Sep-2026 - Version 2.0.0
// - Reduced to a re-export; the implementation is now shared with the still
//   image exporter and the Layout Editor bakes.
//
// 11-Sep-2026 - Version 1.0.0
// - Initial implementation: 4x, 8x and 16x supersampled anti-aliasing for MP4
//   exports.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | The Shared Supersampler, Under the Video Studio's Name
    // ------------------------------------------------------------
    // Aliased rather than re-declared: an alias cannot drift, and a wrapper
    // function would be one more place for a default to be set differently on
    // one route than the other.
    // ------------------------------------------------------------
    export {
        Na__Supersampler__Create as Na__VideoStudio__Supersampler__Create,
        Na__Supersampler__ResolveSampleCount,
        Na__Supersampler__SAMPLE_COUNTS
    } from '../05__RenderPipeline/Na__RenderEffect__Supersampler__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
