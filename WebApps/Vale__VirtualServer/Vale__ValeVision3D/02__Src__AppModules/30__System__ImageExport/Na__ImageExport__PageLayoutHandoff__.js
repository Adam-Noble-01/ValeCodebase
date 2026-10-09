// =============================================================================
// VALEVISION3D - IMAGE EXPORT - PAGE LAYOUT HANDOFF
// =============================================================================
//
// FILE       : Na__ImageExport__PageLayoutHandoff__.js
// NAMESPACE  : Na__PageLayoutHandoff
// MODULE     : Image Export - Page Layout Handoff
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What ValeVision 3D hands the Create Drawing page (LayoutVision 2D)
//              with a picture: the view it was rendered from, the settings it was
//              rendered at, and the page's address for this project
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE SOURCE VIEW is everything that decides the picture apart from the
//   quality settings: the camera's exact pose (position in mm to 0.01, its
//   quaternion and up, field of view, zoom), the orbit target (the profile
//   lines' weight follows the camera's distance to it), the Model Layers, the
//   lighting and the vertical perspective correction. It is saved with a
//   layout, so a re-render a week later draws the same picture (Adam, 09-Oct-2026).
// - APPLY AND RESTORE come in pairs: ApplySourceView poses the view for one
//   render and returns everything it changed; RestoreView puts the viewer's own
//   view back. Layers are set silently, as the Layout Editor's renders set
//   them, so a render never makes the drawings re-read the model.
// - A 2D DRAWING'S PICTURE (an elevation or plan open when Create Drawing was
//   pressed) keeps its kind: its camera is the drawing's own, so only the
//   layers are posed; the bridge re-renders it only while that drawing is open.
// - THE RENDER SETTINGS name what the picture was made at: its size, aspect,
//   anti-aliasing, Enhance Whitecard and the three linework sliders.
//
// INTEGRATION:
// - Na__UiFeature__ImageExport__Controls.js captures the view and the settings
//   when Create Drawing is pressed and opens the page at LayoutPageUrl.
// - Na__ImageExport__PageLayoutBridge__.js poses and restores the view around a
//   re-render the page asks for.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.0.0 (v2.75.0)
// - Initial build for the Create Drawing page's saved layouts and re-render.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Units, the Project, Layers, Lighting, Vertical Correction, Line Weights
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    import { Na__AppUtils__GetProjectCodeFromUrl, Na__AppUtils__GetProjectFolderFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__ModelToggle__CaptureVisibilityMap, Na__ModelToggle__SetCategoryVisibility } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    import { Na__SceneLighting__GetLive, Na__SceneLighting__Apply } from '../06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js';
    import { Na__VerticalCorrection__IsEnabled, Na__VerticalCorrection__SetEnabled } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    import {
        Na__LineworkSettings__GetLineworkFactor,
        Na__LineworkSettings__GetProfileLineFactor,
        Na__LineworkSettings__GetSillyAmplitude
    } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Kinds
    // ------------------------------------------------------------
    const Na__PageLayoutHandoff__KIND_3D      = '3d';                       // <-- The perspective camera
    const Na__PageLayoutHandoff__KIND_DRAWING = 'drawing';                  // <-- A 2D elevation or plan's own camera
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Page, Relative to the App Folder
    // ------------------------------------------------------------
    // This file is <app>/02__Src__AppModules/30__System__ImageExport/, so two
    // folders up is the app folder whichever page imported it.
    // ------------------------------------------------------------
    const Na__PageLayoutHandoff__PAGE_URL = new URL('../35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html', import.meta.url);
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Orbit Controls (Their Target Sets the Profile Lines' Weight)
    // ------------------------------------------------------------
    let Na__PageLayoutHandoff__Controls = null;                              // <-- Set by the bridge from index.html
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Round to a Number of Decimals
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__Round(value, places) {
        const scale = Math.pow(10, places);
        return Math.round(value * scale) / scale;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Greatest Common Divisor (for an aspect like 2880:1406 -> 1440:703)
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__Gcd(a, b) {
        let x = Math.abs(Math.round(a));
        let y = Math.abs(Math.round(b));
        while (y) { const t = y; y = x % y; x = t; }
        return x || 1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Number From a Stored Block, or the Fallback
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__Num(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Orbit Controls
// -----------------------------------------------------------------------------

    // FUNCTION | Hand Over the Orbit Controls (Their Target Is Captured and Posed With the Camera)
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__SetControls(controls) {
        Na__PageLayoutHandoff__Controls = (controls && controls.target) ? controls : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Project and the Page
// -----------------------------------------------------------------------------

    // FUNCTION | This Page's Project Id ("64135__Holt"), or the Raw ?project= Token, or ''
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__ProjectId() {
        return Na__AppUtils__GetProjectFolderFromUrl() || Na__AppUtils__GetProjectCodeFromUrl() || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Create Drawing Page's Address for This Project
    // ------------------------------------------------------------
    // params: extra query values, e.g. { open: 'saved' } for the saved list.
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__LayoutPageUrl(params) {
        const url       = new URL(Na__PageLayoutHandoff__PAGE_URL.href);
        const projectId = Na__PageLayoutHandoff__ProjectId();
        if (projectId) url.searchParams.set('project', projectId);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
        });
        return url.href;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capture
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the View a Picture Is Rendered From
    // ------------------------------------------------------------
    // isDrawingView: true when a 2D drawing's export overrides are live (the
    // picture is the drawing's, not this camera's).
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__CaptureSourceView(camera, isDrawingView) {
        const kind   = isDrawingView ? Na__PageLayoutHandoff__KIND_DRAWING : Na__PageLayoutHandoff__KIND_3D;
        const r2     = (v) => Na__PageLayoutHandoff__Round(v, 2);
        const r8     = (v) => Na__PageLayoutHandoff__Round(v, 8);
        const target = Na__PageLayoutHandoff__Controls ? Na__PageLayoutHandoff__Controls.target : null;

        return {
            View__Kind               : kind,
            View__CapturedIso        : new Date().toISOString(),
            View__Camera             : camera ? {
                Camera__PosXMm       : r2(Na__Math__ConvertUnitsToMm(camera.position.x)),
                Camera__PosYMm       : r2(Na__Math__ConvertUnitsToMm(camera.position.y)),
                Camera__PosZMm       : r2(Na__Math__ConvertUnitsToMm(camera.position.z)),
                Camera__QuatX        : r8(camera.quaternion.x),
                Camera__QuatY        : r8(camera.quaternion.y),
                Camera__QuatZ        : r8(camera.quaternion.z),
                Camera__QuatW        : r8(camera.quaternion.w),
                Camera__UpX          : r8(camera.up.x),
                Camera__UpY          : r8(camera.up.y),
                Camera__UpZ          : r8(camera.up.z),
                Camera__Fov          : Na__PageLayoutHandoff__Round(camera.fov, 6),
                Camera__Zoom         : Na__PageLayoutHandoff__Round(camera.zoom, 6),
                Camera__TargetXMm    : target ? r2(Na__Math__ConvertUnitsToMm(target.x)) : null,
                Camera__TargetYMm    : target ? r2(Na__Math__ConvertUnitsToMm(target.y)) : null,
                Camera__TargetZMm    : target ? r2(Na__Math__ConvertUnitsToMm(target.z)) : null
            } : null,
            View__ModelLayers        : Na__ModelToggle__CaptureVisibilityMap(),
            View__Lighting           : Na__SceneLighting__GetLive(),
            View__VerticalCorrection : Na__VerticalCorrection__IsEnabled()
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Settings a Picture Was Rendered At
    // ------------------------------------------------------------
    // result: the export's { width, height, aspectRatio }. A viewport capture
    // has no aspect of its own, so its pixels give it (2880 x 1406 -> 1440:703),
    // and it was never supersampled (one sample).
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__DescribeRenderSettings(result, isCustomEnabled, isEnhanceEnabled, antiAliasSamples) {
        const width  = result ? result.width  : 0;
        const height = result ? result.height : 0;
        const gcd    = Na__PageLayoutHandoff__Gcd(width, height);
        return {
            Render__WidthPx          : width,
            Render__HeightPx         : height,
            Render__AspectRatio      : (result && result.aspectRatio) ? String(result.aspectRatio) : `${Math.round(width / gcd)}:${Math.round(height / gcd)}`,
            Render__AntiAliasSamples : isCustomEnabled ? Na__PageLayoutHandoff__Num(antiAliasSamples, 1) : 1,
            Render__EnhanceWhitecard : isEnhanceEnabled === true,
            Render__LineworkFactor   : Na__LineworkSettings__GetLineworkFactor(),
            Render__ProfileLineFactor: Na__LineworkSettings__GetProfileLineFactor(),
            Render__SillyLinesPx     : Na__LineworkSettings__GetSillyAmplitude(),
            Render__Route            : isCustomEnabled ? 'custom' : 'viewport'
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply and Restore
// -----------------------------------------------------------------------------

    // FUNCTION | Pose a Saved View for One Render; Returns What to Put Back
    // ------------------------------------------------------------
    // The caller holds the render loop paused from before this until after
    // RestoreView, or the orbit controls would aim the posed camera back at
    // their target on the next frame.
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__ApplySourceView(camera, view) {
        const controls = Na__PageLayoutHandoff__Controls;
        const saved = {
            position   : camera ? camera.position.clone()   : null,
            quaternion : camera ? camera.quaternion.clone() : null,
            up         : camera ? camera.up.clone()         : null,
            fov        : camera ? camera.fov                : null,
            zoom       : camera ? camera.zoom               : null,
            target     : controls ? controls.target.clone() : null,
            layers     : {},
            lighting   : null,
            vertical   : null
        };
        if (!view) return saved;

        const is3d = view.View__Kind !== Na__PageLayoutHandoff__KIND_DRAWING;
        const cam  = view.View__Camera;

        // CAMERA | 3D pictures only; a drawing's camera is the drawing's own
        // ------------------------------------------------------------
        if (camera && is3d && cam) {
            camera.position.set(
                Na__Math__ConvertMmToUnits(Na__PageLayoutHandoff__Num(cam.Camera__PosXMm, 0)),
                Na__Math__ConvertMmToUnits(Na__PageLayoutHandoff__Num(cam.Camera__PosYMm, 0)),
                Na__Math__ConvertMmToUnits(Na__PageLayoutHandoff__Num(cam.Camera__PosZMm, 0))
            );
            camera.quaternion.set(
                Na__PageLayoutHandoff__Num(cam.Camera__QuatX, 0),
                Na__PageLayoutHandoff__Num(cam.Camera__QuatY, 0),
                Na__PageLayoutHandoff__Num(cam.Camera__QuatZ, 0),
                Na__PageLayoutHandoff__Num(cam.Camera__QuatW, 1)
            ).normalize();                                                    // <-- Rotation follows the quaternion by itself
            camera.up.set(
                Na__PageLayoutHandoff__Num(cam.Camera__UpX, 0),
                Na__PageLayoutHandoff__Num(cam.Camera__UpY, 1),
                Na__PageLayoutHandoff__Num(cam.Camera__UpZ, 0)
            );
            camera.fov  = Na__PageLayoutHandoff__Num(cam.Camera__Fov, camera.fov);
            camera.zoom = Na__PageLayoutHandoff__Num(cam.Camera__Zoom, camera.zoom);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);

            // ORBIT TARGET | The profile lines' weight follows the camera's distance to it.
            // Set, never updated through the controls: the loop is held, so nothing re-aims.
            // ------------------------------------------------------------
            if (controls && [cam.Camera__TargetXMm, cam.Camera__TargetYMm, cam.Camera__TargetZMm].every(Number.isFinite)) {
                controls.target.set(
                    Na__Math__ConvertMmToUnits(cam.Camera__TargetXMm),
                    Na__Math__ConvertMmToUnits(cam.Camera__TargetYMm),
                    Na__Math__ConvertMmToUnits(cam.Camera__TargetZMm)
                );
            }
        }

        // LAYERS | Silently, only the ones that differ (both kinds)
        // ------------------------------------------------------------
        const layers = view.View__ModelLayers;
        if (layers && typeof layers === 'object') {
            const live = Na__ModelToggle__CaptureVisibilityMap();
            Object.entries(layers).forEach(([key, visible]) => {
                if (!(key in live) || live[key] === Boolean(visible)) return;  // <-- Not loaded here, or already right
                saved.layers[key] = live[key];
                Na__ModelToggle__SetCategoryVisibility(key, Boolean(visible), true);
            });
        }

        // LIGHTING AND VERTICAL CORRECTION | 3D pictures only
        // ------------------------------------------------------------
        if (is3d && view.View__Lighting && typeof view.View__Lighting === 'object') {
            saved.lighting = Na__SceneLighting__GetLive();
            Na__SceneLighting__Apply(view.View__Lighting, { requestRender : false });
        }
        if (is3d && typeof view.View__VerticalCorrection === 'boolean' && view.View__VerticalCorrection !== Na__VerticalCorrection__IsEnabled()) {
            saved.vertical = Na__VerticalCorrection__IsEnabled();
            Na__VerticalCorrection__SetEnabled(view.View__VerticalCorrection);
        }

        return saved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Viewer's Own View Back
    // ------------------------------------------------------------
    function Na__PageLayoutHandoff__RestoreView(camera, saved) {
        if (!saved) return;

        if (typeof saved.vertical === 'boolean') Na__VerticalCorrection__SetEnabled(saved.vertical);
        if (saved.lighting) Na__SceneLighting__Apply(saved.lighting, { requestRender : false });
        Object.entries(saved.layers || {}).forEach(([key, visible]) => {
            Na__ModelToggle__SetCategoryVisibility(key, visible, true);       // <-- Silent, as it was set
        });

        if (camera && saved.position) {
            camera.position.copy(saved.position);
            camera.quaternion.copy(saved.quaternion);
            camera.up.copy(saved.up);
            camera.fov  = saved.fov;
            camera.zoom = saved.zoom;
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
        }
        if (saved.target && Na__PageLayoutHandoff__Controls) {
            Na__PageLayoutHandoff__Controls.target.copy(saved.target);       // <-- The viewer's own orbit point, untouched otherwise
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Page Layout Handoff API
    // ------------------------------------------------------------
    export {
        Na__PageLayoutHandoff__KIND_3D,
        Na__PageLayoutHandoff__KIND_DRAWING,
        Na__PageLayoutHandoff__SetControls,
        Na__PageLayoutHandoff__ProjectId,
        Na__PageLayoutHandoff__LayoutPageUrl,
        Na__PageLayoutHandoff__CaptureSourceView,
        Na__PageLayoutHandoff__DescribeRenderSettings,
        Na__PageLayoutHandoff__ApplySourceView,
        Na__PageLayoutHandoff__RestoreView
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
