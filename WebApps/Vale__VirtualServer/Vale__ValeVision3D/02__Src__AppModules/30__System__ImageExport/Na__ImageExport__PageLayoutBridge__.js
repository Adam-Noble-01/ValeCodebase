// =============================================================================
// VALEVISION3D - IMAGE EXPORT - PAGE LAYOUT BRIDGE
// =============================================================================
//
// FILE       : Na__ImageExport__PageLayoutBridge__.js
// NAMESPACE  : Na__PageLayoutBridge
// MODULE     : Image Export - Page Layout Bridge
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : ValeVision 3D's side of the Create Drawing page: re-render a layout's
//              picture at new quality settings from the view it was made from
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE PAGE CALLS THIS WINDOW. The Create Drawing page (LayoutVision 2D, the
//   Drawing Editor) is a page of this app since v2.76.0, in a frame
//   (Na__AppPages__DrawingPage__Host__), so it reaches this window through
//   window.parent - window.opener for a tab an older version opened - and finds
//   window.Na__PageLayout__RenderBridge: GetProjectId, GetRenderOptions, IsBusy
//   and Render. The render loop is held by the page as well while it is up, so
//   it stays paused after a Re-Render until the Model View comes back.
// - RENDER poses the layout's own view (Na__ImageExport__PageLayoutHandoff__),
//   sets the layout's three linework values, renders through RenderWithSettings
//   at the size, aspect, anti-aliasing and Enhance Whitecard asked for, encodes
//   a PNG, and puts everything back: camera, layers, lighting, vertical
//   correction and the viewer's own linework sliders. The render loop is held
//   for the length of it (the orbit controls would aim the posed camera back at
//   their target), and the app shows its spinner over everything (the Drawing
//   Editor included), so nothing can start a second render on top of it.
// - REFUSES, WITH THE REASON: a 3D picture while a 2D drawing is on screen, a
//   drawing's picture while no drawing is, a layout with no saved view, and a
//   second render while one runs.
// - SAVED DRAWINGS moved out (v2.76.1): the Drawings menu lists the job's saved
//   layouts itself (Na__AppPages__SavedDrawings__), as the Drawing Editor does.
//
// INTEGRATION:
// - index.html calls Na__PageLayoutBridge__Initialize({ controls }) once the
//   image export controls are built: the orbit controls' target is captured
//   and posed with the camera (the profile lines' weight follows it).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.2.0 (v2.76.1)
// - The Saved Drawings button is gone: the Drawings menu lists the saved layouts
//   (Na__AppPages__SavedDrawings__). The bridge is only the re-render now.
//
// 09-Oct-2026 - Version 1.1.0 (v2.76.0)
// - Saved Drawings opens the Drawing Editor page in this window
//   (Na__DrawingPage__OpenSaved), not a new tab; no pop-up to allow.
//
// 09-Oct-2026 - Version 1.0.0 (v2.75.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Export Itself
    // @delegate: ./Na__UiFeature__ImageExport__Controls.js
    // ------------------------------------------------------------
    import {
        Na__UiFeature__ImageExport__RenderWithSettings,
        Na__UiFeature__ImageExport__DescribeLiveSettings,
        Na__UiFeature__ImageExport__EncodePng
    } from './Na__UiFeature__ImageExport__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Source View, the Page's Address
    // @delegate: ./Na__ImageExport__PageLayoutHandoff__.js
    // ------------------------------------------------------------
    import {
        Na__PageLayoutHandoff__KIND_DRAWING,
        Na__PageLayoutHandoff__SetControls,
        Na__PageLayoutHandoff__ProjectId,
        Na__PageLayoutHandoff__DescribeRenderSettings,
        Na__PageLayoutHandoff__ApplySourceView,
        Na__PageLayoutHandoff__RestoreView
    } from './Na__ImageExport__PageLayoutHandoff__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Line Weights, Their Stops, Anti-Aliasing Counts
    // ------------------------------------------------------------
    import {
        Na__LineworkSettings__GetLineworkFactor,
        Na__LineworkSettings__SetLineworkFactor,
        Na__LineworkSettings__GetProfileLineFactor,
        Na__LineworkSettings__SetProfileLineFactor,
        Na__LineworkSettings__GetSillyAmplitude,
        Na__LineworkSettings__SetSillyAmplitude
    } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    import { Na__UiFeature__LineworkSettings__GetStops } from './Na__UiFeature__LineworkSettings__Controls.js';
    import { Na__Supersampler__SAMPLE_COUNTS, Na__Supersampler__ResolveSampleCount } from '../05__RenderPipeline/Na__RenderEffect__Supersampler__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Hold, Spinner, Hidden-Tab-Safe Yield
    // ------------------------------------------------------------
    import { Na__RenderLoop__Pause, Na__RenderLoop__Resume, Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import { Na__AppUtils__LoadingOverlay__Create } from '../03__AppUtils/Na__AppUtils__LoadingOverlay__.js';
    import { Na__ExportYield__NextPaint } from './Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Bridge
    // ------------------------------------------------------------
    const Na__PageLayoutBridge__WINDOW_KEY      = 'Na__PageLayout__RenderBridge';   // <-- What the page looks for on window.parent (window.opener for an older tab)
    const Na__PageLayoutBridge__VERSION         = '1.0.0';
    const Na__PageLayoutBridge__PAUSE_REASON    = 'page-layout-rerender';
    const Na__PageLayoutBridge__ASPECT_RX       = /^\d+(\.\d+)?:\d+(\.\d+)?$/;
    const Na__PageLayoutBridge__MIN_HEIGHT_PX   = 256;
    // ------------------------------------------------------------

    // MODULE VARIABLES | One Render at a Time
    // ------------------------------------------------------------
    let Na__PageLayoutBridge__Busy = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Status Line to the Page, Never Failing This Tab
    // ------------------------------------------------------------
    // The page may close mid-render; its callback then belongs to a window that
    // is gone, and calling it must not stop the render putting the view back.
    // ------------------------------------------------------------
    function Na__PageLayoutBridge__Tell(onStatus, text) {
        if (typeof onStatus !== 'function') return;
        try { onStatus(text); } catch (error) { /* the page has gone */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Settings Asked For, Made Safe (Anything Missing Takes This Tab's Own)
    // ------------------------------------------------------------
    function Na__PageLayoutBridge__ResolveSettings(asked, live) {
        const a          = asked || {};
        const maxHeight  = Math.max.apply(null, live.resolutions);
        const height     = Number.isFinite(a.Render__HeightPx) ? a.Render__HeightPx : live.heightPx;
        const positive   = (value, fallback) => (Number.isFinite(value) && value > 0) ? value : fallback;
        return {
            aspectRatio       : (typeof a.Render__AspectRatio === 'string' && Na__PageLayoutBridge__ASPECT_RX.test(a.Render__AspectRatio)) ? a.Render__AspectRatio : live.aspectRatio,
            heightPx          : Math.round(Math.min(maxHeight, Math.max(Na__PageLayoutBridge__MIN_HEIGHT_PX, height))),
            antiAliasSamples  : Na__Supersampler__ResolveSampleCount(Number.isFinite(a.Render__AntiAliasSamples) ? a.Render__AntiAliasSamples : live.antiAliasSamples),
            enhance           : (typeof a.Render__EnhanceWhitecard === 'boolean') ? a.Render__EnhanceWhitecard : live.isEnhanceEnabled,
            lineworkFactor    : positive(a.Render__LineworkFactor, 1),
            profileLineFactor : positive(a.Render__ProfileLineFactor, 1),
            sillyLinesPx      : (Number.isFinite(a.Render__SillyLinesPx) && a.Render__SillyLinesPx >= 0) ? a.Render__SillyLinesPx : 0
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What the Page Asks For
// -----------------------------------------------------------------------------

    // FUNCTION | The Choices the Page Offers, the Same as This Tab's Export Panel
    // ------------------------------------------------------------
    function Na__PageLayoutBridge__GetRenderOptions() {
        const live  = Na__UiFeature__ImageExport__DescribeLiveSettings();
        const stops = Na__UiFeature__LineworkSettings__GetStops();
        if (!live) return null;
        return {
            Version                 : Na__PageLayoutBridge__VERSION,
            ProjectId               : Na__PageLayoutHandoff__ProjectId(),
            Resolutions             : live.resolutions,
            AspectRatios            : live.aspectRatios,
            AntiAliasSamples        : Na__Supersampler__SAMPLE_COUNTS.slice(),
            DefaultAntiAliasSamples : live.antiAliasSamples,
            EnhanceDefault          : live.isEnhanceEnabled,
            LineworkStops           : stops.factorStops,
            LineworkDefaultIndex    : stops.factorDefaultIndex,
            SillyStops              : stops.sillyStops,
            IsDrawingView           : live.isDrawingView
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Render a Layout's Picture From Its Own View
    // ------------------------------------------------------------
    // request: { sourceView, renderSettings } as the layout stores them.
    // Resolves { blob, width, height, aspectRatio, wasClamped, renderSettings };
    // THROWS with the reason in words when it cannot or the render fails.
    // ------------------------------------------------------------
    async function Na__PageLayoutBridge__Render(request, onStatus) {
        const live = Na__UiFeature__ImageExport__DescribeLiveSettings();
        if (!live) throw new Error('ValeVision 3D has not finished loading. Try again in a moment.');
        if (Na__PageLayoutBridge__Busy) throw new Error('ValeVision 3D is already rendering. Try again when it has finished.');

        const view          = (request && request.sourceView) || null;
        const isDrawingPic  = !!view && view.View__Kind === Na__PageLayoutHandoff__KIND_DRAWING;
        if (!view || (!isDrawingPic && !view.View__Camera)) {
            throw new Error('This layout does not record the view its picture was made from, so it cannot be re-rendered.');
        }
        if (isDrawingPic && !live.isDrawingView) {
            throw new Error('This picture was made from a 2D drawing. Open that drawing in ValeVision 3D, then re-render.');
        }
        if (!isDrawingPic && live.isDrawingView) {
            throw new Error('ValeVision 3D is showing a 2D drawing. Return it to the 3D view, then re-render.');
        }

        const settings = Na__PageLayoutBridge__ResolveSettings(request.renderSettings, live);
        Na__PageLayoutBridge__Busy = true;

        const overlay = Na__AppUtils__LoadingOverlay__Create({});
        overlay.show('Re-Rendering for Your Drawing Layout...');
        const status  = (text) => { overlay.setStatus(text); Na__PageLayoutBridge__Tell(onStatus, text); };

        let posed  = null;
        let lines  = null;
        let paused = false;
        try {
            await Na__ExportYield__NextPaint();                               // <-- Let the spinner paint before the engine is held

            Na__RenderLoop__Pause(Na__PageLayoutBridge__PAUSE_REASON);
            paused = true;
            posed  = Na__PageLayoutHandoff__ApplySourceView(live.camera, view);
            lines  = {
                linework : Na__LineworkSettings__GetLineworkFactor(),
                profile  : Na__LineworkSettings__GetProfileLineFactor(),
                silly    : Na__LineworkSettings__GetSillyAmplitude()
            };
            Na__LineworkSettings__SetLineworkFactor(settings.lineworkFactor);
            Na__LineworkSettings__SetProfileLineFactor(settings.profileLineFactor);
            Na__LineworkSettings__SetSillyAmplitude(settings.sillyLinesPx);

            const result = await Na__UiFeature__ImageExport__RenderWithSettings({
                aspectRatio      : settings.aspectRatio,
                heightPx         : settings.heightPx,
                antiAliasSamples : settings.antiAliasSamples,
                enhance          : settings.enhance,
                drawingView      : isDrawingPic
            }, status);
            if (!result) throw new Error('The ValeVision 3D export panel is not ready.');

            const renderSettings = Na__PageLayoutHandoff__DescribeRenderSettings(result, true, settings.enhance, settings.antiAliasSamples); // <-- Read now, while the layout's line weights are set

            status('Encoding Image...');
            await Na__ExportYield__NextPaint();
            const blob = await Na__UiFeature__ImageExport__EncodePng(result.canvas);

            overlay.dismiss('Sent to Your Drawing Layout', false, 1500, null);
            return {
                blob           : blob,
                width          : result.width,
                height         : result.height,
                aspectRatio    : result.aspectRatio,
                wasClamped     : result.wasClamped === true,
                renderSettings : renderSettings
            };
        } catch (error) {
            const reason = (error && error.message) ? error.message : 'Unknown error';
            console.error('[ValeVision3D PageLayout] Re-render failed:', error);
            overlay.dismiss(`Re-Render Failed - ${reason}`, true, 4000, null);
            throw error;
        } finally {
            if (lines) {
                Na__LineworkSettings__SetLineworkFactor(lines.linework);      // <-- The viewer's own sliders, as they were
                Na__LineworkSettings__SetProfileLineFactor(lines.profile);
                Na__LineworkSettings__SetSillyAmplitude(lines.silly);
            }
            if (posed) Na__PageLayoutHandoff__RestoreView(live.camera, posed);
            if (paused) Na__RenderLoop__Resume(Na__PageLayoutBridge__PAUSE_REASON);
            Na__RenderLoop__RequestRender();
            Na__PageLayoutBridge__Busy = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Bridge Where the Page Looks for It
    // ------------------------------------------------------------
    // options.controls: the orbit controls (index.html's Na__Controls__Orbit).
    // The job's saved layouts in the Drawings menu are Na__AppPages__SavedDrawings__'s
    // (v2.76.1: the Saved Drawings button that lived here is gone).
    // ------------------------------------------------------------
    function Na__PageLayoutBridge__Initialize(options = {}) {
        Na__PageLayoutHandoff__SetControls(options.controls || null);
        window[Na__PageLayoutBridge__WINDOW_KEY] = Object.freeze({
            Version          : Na__PageLayoutBridge__VERSION,
            GetProjectId     : () => Na__PageLayoutHandoff__ProjectId(),
            GetRenderOptions : Na__PageLayoutBridge__GetRenderOptions,
            IsBusy           : () => Na__PageLayoutBridge__Busy,
            Render           : Na__PageLayoutBridge__Render
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Page Layout Bridge API
    // ------------------------------------------------------------
    export {
        Na__PageLayoutBridge__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
