// =============================================================================
// VALEVISION3D - VIDEO STUDIO - DEV MENU CONTROLS
// =============================================================================
//
// FILE       : Na__VideoStudio__DevMenu__Controls.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Dev Menu Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only Dev Tools panel for authoring, previewing,
//              exporting and saving camera walkthrough videos
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Builds the whole Video Studio panel into the Dev Tools menu at runtime.
// - Create New Video Path adds a video; each video gets its own collapsible
//   block holding its keyframe list, playback settings, export settings and
//   its own Export MP4 button.
// - Expanding a video block makes it the active video: the viewport overlay
//   draws that path, and Capture Keyframe appends to it.  Only one path is
//   ever shown at a time, which keeps a project with several walkthroughs
//   readable in the viewport.
// - Capture Keyframe records the live camera wherever you are, in Orbit, Walk
//   or Fly mode, so the natural workflow is to fly the route and stamp
//   waypoints as you go.  Press K for the same thing without reaching for the
//   menu.
// - Save Video Settings writes the VideoStudio__Config block into project.json
//   through the shared R2-first two-phase save, exactly as every other Dev
//   menu save does.
//
// PANEL REBUILD STRATEGY:
// - Structural changes (add, delete, reorder) rebuild the panel.  Value edits
//   (sliders, number fields, dropdowns) mutate the data and refresh only the
//   readouts, so typing into a field never loses focus mid-edit.
//
// INTEGRATION:
// - Call Na__VideoStudio__DevMenu__Initialize after the loading sequence has
//   started, passing the renderer, scene, camera, controls, pipeline getter
//   and the toast callback.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__IsRunningOnLocalhost
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | R2-First Save Utility
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Loading Overlay + Paint Yield
    // @delegate: ../03__AppUtils/Na__AppUtils__LoadingOverlay__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__LoadingOverlay__Create } from '../03__AppUtils/Na__AppUtils__LoadingOverlay__.js';
    import { Na__ExportYield__NextPaint } from '../30__System__ImageExport/Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__SECTION_KEY,
        Na__VideoStudio__MIN_SEGMENT_MS,
        Na__VideoStudio__MAX_SEGMENT_MS,
        Na__VideoStudio__MIN_HOLD_MS,
        Na__VideoStudio__MAX_HOLD_MS,
        Na__VideoStudio__MIN_SPEED,
        Na__VideoStudio__MAX_SPEED,
        Na__VideoStudio__MIN_LENS_MM,
        Na__VideoStudio__MAX_LENS_MM,
        Na__VideoStudio__MIN_DOOR_SECONDS,
        Na__VideoStudio__MAX_DOOR_SECONDS,
        Na__VideoStudio__MIN_DOOR_DISTANCE_M,
        Na__VideoStudio__MAX_DOOR_DISTANCE_M,
        Na__VideoStudio__ASPECT_RATIOS,
        Na__VideoStudio__HEIGHT_STANDARDS,
        Na__VideoStudio__ProjectJson__SetExportFraming,
        Na__VideoStudio__ClampDoorSeconds,
        Na__VideoStudio__ClampDoorDistanceM,
        Na__VideoStudio__ClampSegmentMs,
        Na__VideoStudio__ClampHoldMs,
        Na__VideoStudio__ClampSpeed,
        Na__VideoStudio__ProjectJson__GetConfigBlock,
        Na__VideoStudio__ProjectJson__GetSortedVideos,
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetExportOptions,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions,
        Na__VideoStudio__ProjectJson__AddVideo,
        Na__VideoStudio__ProjectJson__DeleteVideo,
        Na__VideoStudio__ProjectJson__AddKeyframe,
        Na__VideoStudio__ProjectJson__DeleteKeyframe,
        Na__VideoStudio__ProjectJson__MoveKeyframe,
        Na__VideoStudio__ProjectJson__GetKeyframeLensMm,
        Na__VideoStudio__ProjectJson__SetKeyframeLens,
        Na__VideoStudio__ProjectJson__SetExportOption,
        Na__VideoStudio__ProjectJson__SetPlaybackOption,
        Na__VideoStudio__ProjectJson__SetActiveConfig,
        Na__VideoStudio__ProjectJson__GetActiveConfig,
        Na__VideoStudio__ProjectJson__SetActiveVideoId,
        Na__VideoStudio__ProjectJson__GetActiveVideoId,
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__GetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__MergeIntoProjectData
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__EASING_OPTIONS,
        Na__VideoStudio__PathSampler__SetSensorHeightMm,
        Na__VideoStudio__PathSampler__FovToFocalMm,
        Na__VideoStudio__PathSampler__FocalMmToFov,
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__FormatDuration,
        Na__VideoStudio__Camera__CaptureCurrentCameraState
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Dragger
    // @delegate: ./Na__VideoStudio__Viewport__KeyframeDragger.js
    // ------------------------------------------------------------
    import { Na__VsDrag__MOVED_EVENT } from './Na__VideoStudio__Viewport__KeyframeDragger.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Animations Session
    // @delegate: ./Na__VideoStudio__Playback__SceneAnimations.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__SceneAnimations__SetConfig,
        Na__VideoStudio__SceneAnimations__GetThresholdMm
    } from './Na__VideoStudio__Playback__SceneAnimations.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Viewport Framing Overlays
    // @delegate: ../30__System__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js
    // ------------------------------------------------------------
    import {
        Na__UiFeature__UpdateViewportOverlays,
        Na__UiFeature__SetViewportOverlayThirds
    } from '../30__System__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Viewport Path Visualizer
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathVisualizer__Toggle,
        Na__VideoStudio__PathVisualizer__IsVisible,
        Na__VideoStudio__PathVisualizer__Rebuild
    } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Preview Controller
    // @delegate: ./Na__VideoStudio__Playback__PreviewController.js
    // ------------------------------------------------------------
    import {
        Na__VsPreview__TICK_EVENT,
        Na__VsPreview__ENDED_EVENT,
        Na__VideoStudio__Preview__Play,
        Na__VideoStudio__Preview__Pause,
        Na__VideoStudio__Preview__Stop,
        Na__VideoStudio__Preview__Seek,
        Na__VideoStudio__Preview__JumpToKeyframe,
        Na__VideoStudio__Preview__IsPlaying,
        Na__VideoStudio__Preview__InvalidateTimeline
    } from './Na__VideoStudio__Playback__PreviewController.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Encoder
    // @delegate: ./Na__VideoStudio__Export__VideoEncoder.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__Encoder__QUALITY_STOPS,
        Na__VideoStudio__Encoder__IsSupported,
        Na__VideoStudio__Encoder__GetUnsupportedReason,
        Na__VideoStudio__Encoder__ComputeBitrateMbps,
        Na__VideoStudio__Encoder__ResolveQualityIndex,
        Na__VideoStudio__Encoder__DownloadBlob,
        Na__VideoStudio__Encoder__ExportVideo
    } from './Na__VideoStudio__Export__VideoEncoder.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Mode Reporting
    // ------------------------------------------------------------
    import { Na__NavToolbar__GetActiveMode } from '../10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__VsDev__ItemId   = 'naVideoStudioItem';     // <-- Dev menu list item container
    const Na__VsDev__ToggleId = 'naVideoStudioToggle';   // <-- Submenu open/close button
    const Na__VsDev__PanelId  = 'naVideoStudioPanel';    // <-- Collapsible submenu panel
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Resolution Presets
    // ------------------------------------------------------------
    // MODULE CONSTANTS | Heavy Export Threshold
    // ------------------------------------------------------------
    // Above 4K the effect chain's render targets get large enough to be worth
    // warning about before someone commits to a long render.
    // ------------------------------------------------------------
    const Na__VsDev__HEAVY_EXPORT_PIXELS = 3840 * 2160;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Frame Rate Presets
    // ------------------------------------------------------------
    const Na__VsDev__FRAME_RATES = [24, 25, 30, 60];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Capture Keyframe Hotkey
    // ------------------------------------------------------------
    // Both hotkeys are active only while the Video Studio panel is open.
    // Space additionally requires Orbit mode: Fly binds Space to Ascend, and
    // flying around with the panel open to stamp waypoints is the core
    // workflow, so stealing it there would break the main use of the tool.
    const Na__VsDev__CAPTURE_HOTKEY = 'k';   // <-- Capture keyframe (with or without Shift)
    const Na__VsDev__PLAY_HOTKEY    = ' ';   // <-- Play / pause preview, Orbit only
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__VsDev__Renderer      = null;   // <-- Live WebGLRenderer
    let Na__VsDev__Scene         = null;   // <-- Three.js scene
    let Na__VsDev__Camera        = null;   // <-- Live perspective camera
    let Na__VsDev__Controls      = null;   // <-- OrbitControls instance
    let Na__VsDev__GetPipeline   = null;   // <-- Render pipeline state getter
    let Na__VsDev__ShowToast     = null;   // <-- Toast callback
    let Na__VsDev__ProjectCode   = null;   // <-- Project code resolved from the URL
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel State
    // ------------------------------------------------------------
    let Na__VsDev__PanelElement    = null;    // <-- Panel container being rendered into
    let Na__VsDev__ExpandedVideoId = null;    // <-- Video block currently expanded
    let Na__VsDev__IsExporting     = false;   // <-- Export in flight, locks conflicting controls
    let Na__VsDev__CancelRequested = false;   // <-- Cancel button pressed during an export
    // ------------------------------------------------------------


    // MODULE VARIABLES | Framing Overlay State
    // ------------------------------------------------------------
    // Viewing aids, not video data, so they live for the session rather than
    // being written into project.json.
    // ------------------------------------------------------------
    // Both default on: the export aspect is narrower than the viewport, so
    // without the mask you would be composing against a frame wider than the
    // video you are actually making.
    let Na__VsDev__SafeFrameOn = true;    // <-- Mask to the export aspect ratio
    let Na__VsDev__ThirdsOn    = true;    // <-- Rule of thirds grid inside the safe frame
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sub-Section Expansion
    // ------------------------------------------------------------
    let Na__VsDev__AdvancedAnimOpen = false;   // <-- Survives panel rebuilds
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small DOM Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an Element with Class, Text and Attributes
    // ------------------------------------------------------------
    function Na__VsDev__El(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null) element.textContent = text;
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Labelled Row Wrapper
    // ------------------------------------------------------------
    function Na__VsDev__Row(labelText) {
        const row = Na__VsDev__El('div', 'na-vs-dev__row');
        if (labelText) row.appendChild(Na__VsDev__El('span', 'na-vs-dev__label', labelText));
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Select Input from Option Descriptors
    // ------------------------------------------------------------
    function Na__VsDev__Select(options, selectedValue) {
        const select = Na__VsDev__El('select', 'na-vs-dev__select');

        options.forEach((option) => {
            const element   = Na__VsDev__El('option', null, option.label);
            element.value   = String(option.value);
            if (String(option.value) === String(selectedValue)) element.selected = true;
            select.appendChild(element);
        });

        return select;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Range Slider
    // ------------------------------------------------------------
    function Na__VsDev__Slider(min, max, step, value) {
        const slider = Na__VsDev__El('input', 'na-vs-dev__slider');
        slider.type  = 'range';
        slider.min   = String(min);
        slider.max   = String(max);
        slider.step  = String(step);
        slider.value = String(value);
        return slider;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Number Input
    // ------------------------------------------------------------
    function Na__VsDev__NumberInput(value, min, max, step) {
        const input = Na__VsDev__El('input', 'na-vs-dev__input na-vs-dev__input--short');
        input.type  = 'number';
        input.min   = String(min);
        input.max   = String(max);
        input.step  = String(step);
        input.value = String(value);
        return input;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Button
    // ------------------------------------------------------------
    function Na__VsDev__Button(label, modifier, title) {
        const button = Na__VsDev__El('button', `na-vs-dev__btn${modifier ? ` na-vs-dev__btn--${modifier}` : ''}`, label);
        button.type  = 'button';
        if (title) button.title = title;
        return button;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Derived Readout Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Summarise a Video's Duration, Frames and File Size
    // ------------------------------------------------------------
    function Na__VsDev__BuildVideoSummary(video) {
        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        const keyCount = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video).length;

        if (!timeline) {
            return { keyCount, durationMs: 0, frameCount: 0, megabytes: 0, text: `${keyCount} keyframes` };
        }

        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const frameCount    = Math.max(1, Math.round((timeline.totalDurationMs / 1000) * exportOptions.fps));
        const seconds       = timeline.totalDurationMs / 1000;
        const megabytes     = (seconds * exportOptions.bitrateMbps) / 8;

        return {
            keyCount,
            durationMs : timeline.totalDurationMs,
            frameCount,
            megabytes,
            text : `${keyCount} keyframes  |  ${Na__VideoStudio__PathSampler__FormatDuration(timeline.totalDurationMs)}  |  ${frameCount} frames  |  ~${megabytes.toFixed(0)} MB`
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh Every Summary Line Currently on Screen
    // ------------------------------------------------------------
    // Called after a value edit so the readouts stay honest without a full
    // panel rebuild stealing focus from the field being typed into.
    // ------------------------------------------------------------
    function Na__VsDev__RefreshSummaries() {
        if (!Na__VsDev__PanelElement) return;

        Na__VsDev__PanelElement.querySelectorAll('[data-vs-summary-for]').forEach((element) => {
            const video = Na__VideoStudio__ProjectJson__GetVideoById(element.dataset.vsSummaryFor);
            if (video) element.textContent = Na__VsDev__BuildVideoSummary(video).text;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply the Framing Overlays for a Video
    // ------------------------------------------------------------
    // Reuses the Image Export safe frame and thirds grid rather than drawing a
    // second one, so the framing you judge in Video Studio is the same overlay
    // the still export uses.  The aspect string is passed as raw pixel
    // dimensions, e.g. '3840:2160', because the overlay only ever divides the
    // two numbers and that keeps the ratio exact for any resolution.
    // ------------------------------------------------------------
    function Na__VsDev__ApplyFramingOverlays(video) {
        if (!Na__VsDev__SafeFrameOn) {
            Na__UiFeature__UpdateViewportOverlays(null, false);
            return;
        }

        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        Na__UiFeature__UpdateViewportOverlays(`${exportOptions.width}:${exportOptions.height}`, true);
        Na__UiFeature__SetViewportOverlayThirds(Na__VsDev__ThirdsOn);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh the Overlay for the Currently Expanded Video
    // ------------------------------------------------------------
    // Called after a resolution change so the bars follow the new aspect.
    // ------------------------------------------------------------
    function Na__VsDev__RefreshFramingOverlays() {
        if (!Na__VsDev__SafeFrameOn) return;

        const video = Na__VideoStudio__ProjectJson__GetVideoById(
            Na__VideoStudio__ProjectJson__GetActiveVideoId()
        );
        if (video) Na__VsDev__ApplyFramingOverlays(video);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Toast, When One Is Wired
    // ------------------------------------------------------------
    function Na__VsDev__Toast(message, isError) {
        if (typeof Na__VsDev__ShowToast === 'function') Na__VsDev__ShowToast(message, !!isError);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the Data Dirty and Refresh Dependent Views
    // ------------------------------------------------------------
    function Na__VsDev__OnDataChanged(videoId) {
        Na__VideoStudio__Preview__InvalidateTimeline(videoId || null);        // <-- Cached timeline is now stale
        Na__VideoStudio__PathVisualizer__Rebuild();
        Na__VsDev__RefreshSummaries();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyframe Row Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Keyframe Row
    // ------------------------------------------------------------
    function Na__VsDev__BuildKeyframeRow(video, keyframe, index, total) {
        const videoId    = video.VideoStudio__Video__Id;
        const keyframeId = keyframe.VideoStudio__Keyframe__Id;

        const row = Na__VsDev__El('div', 'na-vs-dev__key-row');

        // HEADER | Index badge, captured mode, and row actions
        const header = Na__VsDev__El('div', 'na-vs-dev__key-header');
        header.appendChild(Na__VsDev__El('span', 'na-vs-dev__key-index', String(index + 1)));
        header.appendChild(Na__VsDev__El('span', 'na-vs-dev__key-mode',
            keyframe.VideoStudio__Keyframe__CapturedInMode || 'Orbit'));

        const goButton = Na__VsDev__Button('Go To', null, 'Snap the camera to this keyframe');
        goButton.addEventListener('click', () => {
            Na__VideoStudio__ProjectJson__SetActiveKeyframeId(keyframeId);
            Na__VideoStudio__Preview__JumpToKeyframe(keyframe);
            Na__VideoStudio__PathVisualizer__Rebuild();                      // <-- Highlight moves to this marker
        });
        header.appendChild(goButton);

        const upButton = Na__VsDev__Button('▲', null, 'Move earlier');
        upButton.disabled = (index === 0);
        upButton.addEventListener('click', () => {
            if (Na__VideoStudio__ProjectJson__MoveKeyframe(videoId, keyframeId, -1)) {
                Na__VsDev__OnDataChanged(videoId);
                Na__VsDev__RenderPanel();
            }
        });
        header.appendChild(upButton);

        const downButton = Na__VsDev__Button('▼', null, 'Move later');
        downButton.disabled = (index === total - 1);
        downButton.addEventListener('click', () => {
            if (Na__VideoStudio__ProjectJson__MoveKeyframe(videoId, keyframeId, 1)) {
                Na__VsDev__OnDataChanged(videoId);
                Na__VsDev__RenderPanel();
            }
        });
        header.appendChild(downButton);

        const deleteButton = Na__VsDev__Button('Delete', 'danger', 'Remove this keyframe');
        deleteButton.addEventListener('click', async () => {
            const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                title         : 'Delete Keyframe?',
                message       : `Keyframe ${index + 1} will be removed from "${video.VideoStudio__Video__Name}".`,
                confirmLabel  : 'Delete',
                isDestructive : true
            });
            if (!confirmed) return;

            Na__VideoStudio__ProjectJson__DeleteKeyframe(videoId, keyframeId);
            Na__VsDev__OnDataChanged(videoId);
            Na__VsDev__RenderPanel();
        });
        header.appendChild(deleteButton);

        row.appendChild(header);

        // TRAVEL TIME | Seconds spent flying from this keyframe to the next
        const isLast     = (index === total - 1);
        const travelRow  = Na__VsDev__Row('Travel');
        const travelInput = Na__VsDev__NumberInput(
            (keyframe.VideoStudio__Keyframe__SegmentMs / 1000).toFixed(1),
            Na__VideoStudio__MIN_SEGMENT_MS / 1000,
            Na__VideoStudio__MAX_SEGMENT_MS / 1000,
            0.1
        );
        travelInput.disabled = isLast && !Na__VideoStudio__ProjectJson__GetPlaybackOptions(video).closedLoop;
        travelInput.title    = travelInput.disabled
            ? 'The final keyframe has nowhere to travel to on an open path'
            : 'Seconds to fly from this keyframe to the next';
        travelInput.addEventListener('change', () => {
            keyframe.VideoStudio__Keyframe__SegmentMs = Na__VideoStudio__ClampSegmentMs(parseFloat(travelInput.value) * 1000);
            travelInput.value = (keyframe.VideoStudio__Keyframe__SegmentMs / 1000).toFixed(1);
            Na__VsDev__OnDataChanged(videoId);
        });
        travelRow.appendChild(travelInput);
        travelRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__unit', 's'));

        // HOLD TIME | Seconds parked at this keyframe before moving on
        travelRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__label', 'Hold'));
        const holdInput = Na__VsDev__NumberInput(
            (keyframe.VideoStudio__Keyframe__HoldMs / 1000).toFixed(1),
            Na__VideoStudio__MIN_HOLD_MS / 1000,
            Na__VideoStudio__MAX_HOLD_MS / 1000,
            0.1
        );
        holdInput.title = 'Seconds the camera sits still at this keyframe';
        holdInput.addEventListener('change', () => {
            keyframe.VideoStudio__Keyframe__HoldMs = Na__VideoStudio__ClampHoldMs(parseFloat(holdInput.value) * 1000);
            holdInput.value = (keyframe.VideoStudio__Keyframe__HoldMs / 1000).toFixed(1);
            Na__VsDev__OnDataChanged(videoId);
        });
        travelRow.appendChild(holdInput);
        travelRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__unit', 's'));

        row.appendChild(travelRow);

        // LENS | Per-shot focal length. Editing it rewrites the keyframe's
        // stored FOV too, which is what the sampler interpolates, so a pair of
        // keyframes with different lenses gives a dolly zoom for free.
        const lensRow   = Na__VsDev__Row('Lens');
        const lensInput = Na__VsDev__NumberInput(
            Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe),
            Na__VideoStudio__MIN_LENS_MM,
            Na__VideoStudio__MAX_LENS_MM,
            1
        );
        lensInput.title = `Focal length for this shot, ${Na__VideoStudio__MIN_LENS_MM} to ${Na__VideoStudio__MAX_LENS_MM}mm on full frame. `
                        + 'Differing lenses between two keyframes produce a dolly zoom.';

        const lensSlider = Na__VsDev__Slider(
            Na__VideoStudio__MIN_LENS_MM,
            Na__VideoStudio__MAX_LENS_MM,
            1,
            Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe)
        );
        lensSlider.title = lensInput.title;

        // HELPER | Commit a new lens and mirror it into both controls
        const applyLens = (rawValue, isLivePreview) => {
            const fov     = Na__VideoStudio__PathSampler__FocalMmToFov(rawValue);
            const clamped = Na__VideoStudio__ProjectJson__SetKeyframeLens(videoId, keyframeId, rawValue, fov);
            if (clamped === null) return;

            lensInput.value  = String(clamped);
            lensSlider.value = String(clamped);

            // LIVE PREVIEW | Only when the camera is actually sitting on this
            // keyframe, so dragging a slider never yanks the view somewhere else.
            if (isLivePreview
                && Na__VsDev__Camera
                && Na__VideoStudio__ProjectJson__GetActiveKeyframeId() === keyframeId) {
                Na__VsDev__Camera.fov = Na__VideoStudio__PathSampler__FocalMmToFov(clamped);
                Na__VsDev__Camera.updateProjectionMatrix();
                Na__RenderLoop__RequestRender();
            }

            Na__VsDev__OnDataChanged(videoId);
        };

        lensSlider.addEventListener('input',  () => applyLens(Number(lensSlider.value), true));
        lensInput.addEventListener('change', () => applyLens(parseFloat(lensInput.value), true));

        lensRow.appendChild(lensInput);
        lensRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__unit', 'mm'));
        lensRow.appendChild(lensSlider);
        row.appendChild(lensRow);

        return row;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Playback and Export Section Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Playback Settings Section for a Video
    // ------------------------------------------------------------
    function Na__VsDev__BuildPlaybackSection(video) {
        const videoId  = video.VideoStudio__Video__Id;
        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const section  = Na__VsDev__El('div', 'na-vs-dev__section');

        section.appendChild(Na__VsDev__El('div', 'na-vs-dev__section-title', 'Playback'));

        // TRAVEL SPEED | Scales travel time only; holds stay as authored
        const speedRow    = Na__VsDev__Row('Speed');
        const speedSlider = Na__VsDev__Slider(Na__VideoStudio__MIN_SPEED, Na__VideoStudio__MAX_SPEED, 0.05, playback.speedMultiplier);
        const speedValue  = Na__VsDev__El('span', 'na-vs-dev__value', `${playback.speedMultiplier.toFixed(2)}x`);
        speedSlider.title = 'Scales travel time between keyframes. Hold times are absolute and are not affected.';

        speedSlider.addEventListener('input', () => {
            const speed = Na__VideoStudio__ClampSpeed(parseFloat(speedSlider.value));
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__SpeedMultiplier', speed);
            speedValue.textContent = `${speed.toFixed(2)}x`;
            Na__VsDev__OnDataChanged(videoId);
        });
        speedRow.appendChild(speedSlider);
        speedRow.appendChild(speedValue);
        section.appendChild(speedRow);

        // DEFAULTS | Applied to newly captured keyframes
        const defaultsRow = Na__VsDev__Row('New key');

        const defaultTravel = Na__VsDev__NumberInput(
            (playback.defaultSegmentMs / 1000).toFixed(1),
            Na__VideoStudio__MIN_SEGMENT_MS / 1000, Na__VideoStudio__MAX_SEGMENT_MS / 1000, 0.1
        );
        defaultTravel.title = 'Default travel time given to each newly captured keyframe';
        defaultTravel.addEventListener('change', () => {
            const value = Na__VideoStudio__ClampSegmentMs(parseFloat(defaultTravel.value) * 1000);
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__DefaultSegmentMs', value);
            defaultTravel.value = (value / 1000).toFixed(1);
        });
        defaultsRow.appendChild(defaultTravel);
        defaultsRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__unit', 's travel'));

        const defaultHold = Na__VsDev__NumberInput(
            (playback.defaultHoldMs / 1000).toFixed(1),
            Na__VideoStudio__MIN_HOLD_MS / 1000, Na__VideoStudio__MAX_HOLD_MS / 1000, 0.1
        );
        defaultHold.title = 'Default hold time given to each newly captured keyframe';
        defaultHold.addEventListener('change', () => {
            const value = Na__VideoStudio__ClampHoldMs(parseFloat(defaultHold.value) * 1000);
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__DefaultHoldMs', value);
            defaultHold.value = (value / 1000).toFixed(1);
        });
        defaultsRow.appendChild(defaultHold);
        defaultsRow.appendChild(Na__VsDev__El('span', 'na-vs-dev__unit', 's hold'));

        section.appendChild(defaultsRow);

        // EASING | Applied across each leg, not each segment
        const easingRow    = Na__VsDev__Row('Easing');
        const easingSelect = Na__VsDev__Select(
            Na__VideoStudio__PathSampler__EASING_OPTIONS.map(o => ({ value: o.value, label: o.label })),
            playback.easing
        );
        easingSelect.title = 'Applied once across each run of keyframes between holds, so the camera does not stop at every waypoint';
        easingSelect.addEventListener('change', () => {
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__Easing', easingSelect.value);
            Na__VsDev__OnDataChanged(videoId);
        });
        easingRow.appendChild(easingSelect);
        section.appendChild(easingRow);

        // CLOSED LOOP | Return to the first keyframe at the end
        const loopRow      = Na__VsDev__Row('Closed loop');
        const loopCheckbox = Na__VsDev__El('input', 'na-vs-dev__checkbox');
        loopCheckbox.type    = 'checkbox';
        loopCheckbox.checked = playback.closedLoop;
        loopCheckbox.title   = 'Fly back to the first keyframe at the end. Needs at least three keyframes.';
        loopCheckbox.addEventListener('change', () => {
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__ClosedLoop', loopCheckbox.checked);
            Na__VsDev__OnDataChanged(videoId);
            Na__VsDev__RenderPanel();                                        // <-- The last row's travel field enables or disables
        });
        loopRow.appendChild(loopCheckbox);
        section.appendChild(loopRow);

        return section;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Animations Section for a Video
    // ------------------------------------------------------------
    // Whole-video settings, not per keyframe. Proximity doors are owned by Walk
    // and Fly, so Video Studio has to switch them on for the run; this section
    // decides whether it does, and at what pace.
    // ------------------------------------------------------------
    function Na__VsDev__BuildAnimationsSection(video) {
        const videoId  = video.VideoStudio__Video__Id;
        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const section  = Na__VsDev__El('div', 'na-vs-dev__section');

        section.appendChild(Na__VsDev__El('div', 'na-vs-dev__section-title', 'Animations'));

        // ENABLED | Master switch for the whole video
        const animRow      = Na__VsDev__Row('Enabled');
        const animCheckbox = Na__VsDev__El('input', 'na-vs-dev__checkbox');
        animCheckbox.type    = 'checkbox';
        animCheckbox.checked = playback.animationsEnabled;
        animCheckbox.title   = 'Open doors as the camera approaches them, the same way Walk and Fly modes do. '
                             + 'Applies to preview and export.';
        animCheckbox.addEventListener('change', () => {
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__AnimationsEnabled', animCheckbox.checked);
            Na__VideoStudio__Preview__InvalidateTimeline(videoId);            // <-- Reload so preview picks the new setting up
        });
        animRow.appendChild(animCheckbox);
        section.appendChild(animRow);

        // ADVANCED | Collapsible, so the common case stays a single checkbox
        const advancedToggle = Na__VsDev__Button(
            `${Na__VsDev__AdvancedAnimOpen ? '▾' : '▸'}  Advanced Animation Settings`,
            null,
            'Fine control over how scene animations play during a video'
        );
        advancedToggle.classList.add('na-vs-dev__subsection-toggle');

        const advancedPanel = Na__VsDev__El('div', 'na-vs-dev__subsection');
        advancedPanel.style.display = Na__VsDev__AdvancedAnimOpen ? '' : 'none';

        advancedToggle.addEventListener('click', () => {
            Na__VsDev__AdvancedAnimOpen = !Na__VsDev__AdvancedAnimOpen;       // <-- Survives panel rebuilds
            advancedPanel.style.display = Na__VsDev__AdvancedAnimOpen ? '' : 'none';
            advancedToggle.textContent  = `${Na__VsDev__AdvancedAnimOpen ? '▾' : '▸'}  Advanced Animation Settings`;
        });

        section.appendChild(advancedToggle);

        // DOOR OPEN TIME | Seconds for a standard single-leaf door to swing.
        // Scales the animation clock, so every door slows together and a bifold
        // keeps its three-to-one relationship with a single leaf.
        const timeRow    = Na__VsDev__Row('Door time');
        const timeSlider = Na__VsDev__Slider(
            Na__VideoStudio__MIN_DOOR_SECONDS,
            Na__VideoStudio__MAX_DOOR_SECONDS,
            0.1,
            playback.doorOpenSeconds
        );
        const timeValue = Na__VsDev__El('span', 'na-vs-dev__value', `${playback.doorOpenSeconds.toFixed(1)}s`);
        timeSlider.title = 'Seconds for a single-leaf door to swing fully open. Double and bifold doors take '
                         + 'proportionally longer. Interactive Walk and Fly are unaffected.';

        timeSlider.addEventListener('input', () => {
            const seconds = Na__VideoStudio__ClampDoorSeconds(parseFloat(timeSlider.value));
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__DoorOpenSeconds', seconds);
            timeValue.textContent = `${seconds.toFixed(1)}s`;
            Na__VideoStudio__Preview__InvalidateTimeline(videoId);            // <-- Next preview uses the new pace
        });

        timeRow.appendChild(timeSlider);
        timeRow.appendChild(timeValue);
        advancedPanel.appendChild(timeRow);

        // DETECTION DISTANCE | How close the camera gets before a door starts
        // opening. Wider means the door is already moving as you approach,
        // which reads better on a slow dolly than a door snapping open on top
        // of the camera.
        const configuredMm  = Na__VideoStudio__SceneAnimations__GetThresholdMm();
        const startDistance = Number.isFinite(playback.doorDistanceM)
            ? playback.doorDistanceM
            : Math.round((configuredMm / 1000) * 10) / 10;                    // <-- Falls back to the app config value

        const distRow    = Na__VsDev__Row('Detection');
        const distSlider = Na__VsDev__Slider(
            Na__VideoStudio__MIN_DOOR_DISTANCE_M,
            Na__VideoStudio__MAX_DOOR_DISTANCE_M,
            0.5,
            startDistance
        );
        const distValue = Na__VsDev__El('span', 'na-vs-dev__value', `${startDistance.toFixed(1)}m`);
        distSlider.title = 'How close the camera comes before a door begins to open. Untouched, this follows the '
                         + 'same distance Walk and Fly use.';

        distSlider.addEventListener('input', () => {
            const metres = Na__VideoStudio__ClampDoorDistanceM(parseFloat(distSlider.value));
            Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, 'VideoStudio__Playback__DoorDistanceM', metres);
            distValue.textContent = `${metres.toFixed(1)}m`;
            Na__VideoStudio__Preview__InvalidateTimeline(videoId);            // <-- Next preview uses the new distance
        });

        distRow.appendChild(distSlider);
        distRow.appendChild(distValue);
        advancedPanel.appendChild(distRow);

        advancedPanel.appendChild(Na__VsDev__El('div', 'na-vs-dev__note',
            'Doors are authored at 0.6s to suit clicking one open by hand, which is quick when a camera '
          + 'walks through. Opening earlier and slower reads better on a moving shot.'));

        section.appendChild(advancedPanel);
        return section;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Export Settings Section for a Video
    // ------------------------------------------------------------
    function Na__VsDev__BuildExportSection(video) {
        const videoId       = video.VideoStudio__Video__Id;
        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const section       = Na__VsDev__El('div', 'na-vs-dev__section');

        section.appendChild(Na__VsDev__El('div', 'na-vs-dev__section-title', 'Export'));

        // QUALITY READOUT | Shared by the resolution, frame rate and quality controls
        const qualityValue = Na__VsDev__El('span', 'na-vs-dev__value');

        // HELPER | Recompute and store the bitrate for the current selections
        const applyQuality = (qualityIndex) => {
            const current = Na__VideoStudio__ProjectJson__GetExportOptions(video);
            const mbps    = Na__VideoStudio__Encoder__ComputeBitrateMbps(current.width, current.height, current.fps, qualityIndex);
            const stop    = Na__VideoStudio__Encoder__QUALITY_STOPS.find(s => s.index === qualityIndex);

            Na__VideoStudio__ProjectJson__SetExportOption(videoId, 'VideoStudio__Export__BitrateMbps', mbps);
            qualityValue.textContent = `${stop ? stop.label : 'High'} (${mbps} Mbps)`;
            Na__VsDev__RefreshSummaries();
        };

        // PIXEL READOUT | Shared by the aspect and height dropdowns
        const pixelValue = Na__VsDev__El('span', 'na-vs-dev__note');

        // HELPER | Push a framing change through and refresh everything it feeds
        const applyFraming = (change) => {
            const result = Na__VideoStudio__ProjectJson__SetExportFraming(videoId, change);
            if (!result) return;

            pixelValue.textContent = `Output ${result.width} x ${result.height} pixels`;
            applyQuality(Number(qualitySlider.value));                       // <-- Bitrate follows the pixel count
            Na__VsDev__RefreshFramingOverlays();                             // <-- Safe frame follows the new aspect
        };

        // ASPECT RATIO | Height stays put and the width follows, so switching
        // ratio crops the sides rather than squashing the picture.
        const aspectRow    = Na__VsDev__Row('Aspect ratio');
        const aspectSelect = Na__VsDev__Select(
            Na__VideoStudio__ASPECT_RATIOS.map(r => ({ value: r.value, label: r.label })),
            exportOptions.aspect
        );
        aspectSelect.title = 'Vertical framing is identical across every ratio. A narrower ratio shows less to '
                           + 'the left and right; nothing is ever stretched to fit.';
        aspectSelect.addEventListener('change', () => applyFraming({ aspect: aspectSelect.value }));
        aspectRow.appendChild(aspectSelect);
        section.appendChild(aspectRow);

        // RESOLUTION | A height standard; the aspect above supplies the width
        const heightRow    = Na__VsDev__Row('Resolution');
        const heightSelect = Na__VsDev__Select(
            Na__VideoStudio__HEIGHT_STANDARDS.map(h => ({ value: h.height, label: h.label })),
            exportOptions.height
        );
        heightSelect.title = 'Vertical resolution. The width comes from the aspect ratio.';
        heightSelect.addEventListener('change', () => applyFraming({ height: Number(heightSelect.value) }));
        heightRow.appendChild(heightSelect);
        section.appendChild(heightRow);

        // FRAME RATE
        const fpsRow    = Na__VsDev__Row('Frame rate');
        const fpsSelect = Na__VsDev__Select(
            Na__VsDev__FRAME_RATES.map(f => ({ value: f, label: `${f} fps` })),
            exportOptions.fps
        );
        fpsSelect.addEventListener('change', () => {
            Na__VideoStudio__ProjectJson__SetExportOption(videoId, 'VideoStudio__Export__Fps', Number(fpsSelect.value));
            applyQuality(Number(qualitySlider.value));                       // <-- Bitrate is frame-rate-relative
        });
        fpsRow.appendChild(fpsSelect);
        section.appendChild(fpsRow);

        // QUALITY
        const startingQuality = Na__VideoStudio__Encoder__ResolveQualityIndex(
            exportOptions.width, exportOptions.height, exportOptions.fps, exportOptions.bitrateMbps
        );
        const qualityRow    = Na__VsDev__Row('Quality');
        const qualitySlider = Na__VsDev__Slider(1, Na__VideoStudio__Encoder__QUALITY_STOPS.length, 1, startingQuality);
        qualitySlider.addEventListener('input', () => applyQuality(Number(qualitySlider.value)));
        qualityRow.appendChild(qualitySlider);
        qualityRow.appendChild(qualityValue);
        section.appendChild(qualityRow);

        const startingStop = Na__VideoStudio__Encoder__QUALITY_STOPS.find(s => s.index === startingQuality);
        qualityValue.textContent = `${startingStop ? startingStop.label : 'High'} (${exportOptions.bitrateMbps} Mbps)`;

        pixelValue.textContent = `Output ${exportOptions.width} x ${exportOptions.height} pixels`;
        section.appendChild(pixelValue);

        // FRAMING AIDS | Letterbox the viewport to the export aspect so shots
        // are composed against the frame the video will actually have.
        const safeFrameRow      = Na__VsDev__Row('Safe frame');
        const safeFrameCheckbox = Na__VsDev__El('input', 'na-vs-dev__checkbox');
        safeFrameCheckbox.type    = 'checkbox';
        safeFrameCheckbox.checked = Na__VsDev__SafeFrameOn;
        safeFrameCheckbox.title   = 'Mask the viewport down to the export aspect ratio, so what you frame is what gets rendered.';
        safeFrameCheckbox.addEventListener('change', () => {
            Na__VsDev__SafeFrameOn = safeFrameCheckbox.checked;
            Na__VsDev__ApplyFramingOverlays(video);
            thirdsCheckbox.disabled = !Na__VsDev__SafeFrameOn;               // <-- Grid lives inside the frame
        });
        safeFrameRow.appendChild(safeFrameCheckbox);
        section.appendChild(safeFrameRow);

        const thirdsRow      = Na__VsDev__Row('Rule of thirds');
        const thirdsCheckbox = Na__VsDev__El('input', 'na-vs-dev__checkbox');
        thirdsCheckbox.type     = 'checkbox';
        thirdsCheckbox.checked  = Na__VsDev__ThirdsOn;
        thirdsCheckbox.disabled = !Na__VsDev__SafeFrameOn;
        thirdsCheckbox.title    = 'Composition grid drawn inside the safe frame. Needs the safe frame switched on.';
        thirdsCheckbox.addEventListener('change', () => {
            Na__VsDev__ThirdsOn = thirdsCheckbox.checked;
            Na__UiFeature__SetViewportOverlayThirds(Na__VsDev__ThirdsOn);
        });
        thirdsRow.appendChild(thirdsCheckbox);
        section.appendChild(thirdsRow);

        // EXPORT ACTION | Progress line, button, cancel
        const progressLine = Na__VsDev__El('div', 'na-vs-dev__progress', '');
        progressLine.style.display = 'none';

        const exportButton = Na__VsDev__Button('Export MP4', 'primary');
        const cancelButton = Na__VsDev__Button('Cancel', 'danger');
        cancelButton.style.display = 'none';

        const supportReason = Na__VideoStudio__Encoder__GetUnsupportedReason();
        if (supportReason) {
            exportButton.disabled = true;
            exportButton.title    = supportReason;
        }

        exportButton.addEventListener('click', () => {
            Na__VsDev__RunExport(video, exportButton, cancelButton, progressLine);
        });
        cancelButton.addEventListener('click', () => {
            Na__VsDev__CancelRequested = true;
            cancelButton.disabled      = true;
            progressLine.textContent   = 'Cancelling...';
        });

        const actions = Na__VsDev__El('div', 'na-vs-dev__actions');
        actions.appendChild(exportButton);
        actions.appendChild(cancelButton);
        section.appendChild(actions);
        section.appendChild(progressLine);

        if (supportReason) {
            section.appendChild(Na__VsDev__El('div', 'na-vs-dev__warning', supportReason));
        }

        return section;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Execution
// -----------------------------------------------------------------------------

    // FUNCTION | Run an Export End to End with Progress and Cancellation
    // ------------------------------------------------------------
    async function Na__VsDev__RunExport(video, exportButton, cancelButton, progressLine) {
        if (Na__VsDev__IsExporting) return;                                  // <-- One export at a time

        if (Na__VideoStudio__Preview__IsPlaying()) {
            Na__VideoStudio__Preview__Stop();                                // <-- Preview must not fight for the camera
        }

        const summary = Na__VsDev__BuildVideoSummary(video);
        if (summary.keyCount < 1) {
            Na__VsDev__Toast('Capture at least one keyframe before exporting.', true);
            return;
        }

        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const isHeavy       = (exportOptions.width * exportOptions.height) > Na__VsDev__HEAVY_EXPORT_PIXELS;

        const confirmed = await Na__AppUtils__ConfirmDialog__Show({
            title         : 'Export MP4?',
            message       : `"${video.VideoStudio__Video__Name}" is ${Na__VideoStudio__PathSampler__FormatDuration(summary.durationMs)} `
                          + `and ${summary.frameCount} frames at ${exportOptions.width} x ${exportOptions.height}. `
                          + 'Rendering runs frame by frame, so it will take longer than the clip itself.'
                          + (isHeavy
                              ? ' At this resolution the render targets are large and not every machine has an H.264 encoder '
                                + 'that goes above 4K, so drop to 4K if the export refuses to start.'
                              : ''),
            confirmLabel  : 'Export',
            isDestructive : false
        });
        if (!confirmed) return;

        Na__VsDev__IsExporting     = true;
        Na__VsDev__CancelRequested = false;

        exportButton.disabled      = true;
        cancelButton.disabled      = false;
        cancelButton.style.display = '';
        progressLine.style.display = '';
        progressLine.textContent   = 'Rendering. Watch the overlay for progress.';

        // OVERLAY | The same spinner the image export uses, in opaque mode. The
        // renderer is about to be resized and driven hundreds of times, which is
        // not something worth watching, so the viewport is covered for the
        // duration and every step is reported under the spinner instead.
        const overlay = Na__AppUtils__LoadingOverlay__Create({
            actionButton : exportButton,
            opaque       : true
        });
        overlay.show('Preparing export...');

        await Na__ExportYield__NextPaint();                                  // <-- Let the overlay paint before the heavy work

        try {
            const result = await Na__VideoStudio__Encoder__ExportVideo({
                video,
                renderer : Na__VsDev__Renderer,
                scene    : Na__VsDev__Scene,
                camera   : Na__VsDev__Camera,
                controls : Na__VsDev__Controls,
                getRenderPipelineState : Na__VsDev__GetPipeline,
                onProgress   : ({ percent, message, detail }) => {
                    overlay.setStatus(detail ? `${message}\n${detail}` : `${message}`);
                    progressLine.textContent = `${percent}%  ${message}`;
                },
                shouldCancel : () => Na__VsDev__CancelRequested
            });

            Na__VideoStudio__Encoder__DownloadBlob(result.blob, result.filename);

            const megabytes = (result.blob.size / (1024 * 1024)).toFixed(1);
            progressLine.textContent = `Saved ${result.filename} (${megabytes} MB)`;
            overlay.dismiss(`Saved ${result.filename}\n${megabytes} MB`, false, 2500, null);
            Na__VsDev__Toast(`Exported ${result.filename} (${megabytes} MB).`);

        } catch (error) {
            const wasCancelled = /cancelled/i.test(error.message || '');
            const summary      = wasCancelled ? 'Export cancelled.' : `Export failed: ${error.message}`;

            progressLine.textContent = summary;
            overlay.dismiss(summary, !wasCancelled, wasCancelled ? 1200 : 4000, null);
            Na__VsDev__Toast(summary, !wasCancelled);
            if (!wasCancelled) console.error('[VideoStudio] Export failed:', error);

        } finally {
            Na__VsDev__IsExporting     = false;
            Na__VsDev__CancelRequested = false;
            exportButton.disabled      = !!Na__VideoStudio__Encoder__GetUnsupportedReason();
            cancelButton.style.display = 'none';
            cancelButton.disabled      = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Video Block Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Preview Transport for a Video
    // ------------------------------------------------------------
    function Na__VsDev__BuildTransport(video) {
        const videoId  = video.VideoStudio__Video__Id;
        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        const duration = timeline ? timeline.totalDurationMs : 0;

        const transport = Na__VsDev__El('div', 'na-vs-dev__transport');

        const playButton = Na__VsDev__Button('Play', 'primary',
            'Fly the path in the viewport at normal speed. Spacebar does the same, in Orbit mode.');
        const stopButton = Na__VsDev__Button('Stop', null, 'Stop and return the camera to where it was');

        const scrubber = Na__VsDev__Slider(0, Math.max(1, duration), 10, 0);
        scrubber.classList.add('na-vs-dev__scrubber');
        scrubber.dataset.vsScrubberFor = videoId;
        scrubber.title = 'Scrub the playhead';

        const timeLabel = Na__VsDev__El('span', 'na-vs-dev__value',
            `0:00 / ${Na__VideoStudio__PathSampler__FormatDuration(duration)}`);
        timeLabel.dataset.vsTimeFor = videoId;

        playButton.addEventListener('click', () => {
            if (Na__VideoStudio__Preview__IsPlaying()) {
                Na__VideoStudio__Preview__Pause();
                playButton.textContent = 'Play';
                return;
            }
            const error = Na__VideoStudio__Preview__Play(video);
            if (error) {
                Na__VsDev__Toast(error, true);
                return;
            }
            playButton.textContent = 'Pause';
        });

        stopButton.addEventListener('click', () => {
            Na__VideoStudio__Preview__Stop();
            playButton.textContent = 'Play';
        });

        scrubber.addEventListener('input', () => {
            if (Na__VideoStudio__Preview__IsPlaying()) {
                Na__VideoStudio__Preview__Pause();
                playButton.textContent = 'Play';
            }
            Na__VideoStudio__Preview__Seek(video, Number(scrubber.value));
        });

        transport.appendChild(playButton);
        transport.appendChild(stopButton);
        transport.appendChild(scrubber);
        transport.appendChild(timeLabel);

        return transport;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Collapsible Video Block
    // ------------------------------------------------------------
    function Na__VsDev__BuildVideoBlock(video) {
        const videoId    = video.VideoStudio__Video__Id;
        const isExpanded = (Na__VsDev__ExpandedVideoId === videoId);

        const block = Na__VsDev__El('div', `na-vs-dev__video${isExpanded ? ' is-expanded' : ''}`);

        // HEADER | Expand toggle, name field, delete
        const header = Na__VsDev__El('div', 'na-vs-dev__video-header');

        const expandButton = Na__VsDev__Button(isExpanded ? '▾' : '▸', null, 'Show this video\'s controls');
        expandButton.classList.add('na-vs-dev__expand');
        expandButton.addEventListener('click', () => {
            Na__VsDev__ExpandedVideoId = isExpanded ? null : videoId;
            Na__VideoStudio__ProjectJson__SetActiveVideoId(Na__VsDev__ExpandedVideoId);
            Na__VideoStudio__ProjectJson__SetActiveKeyframeId(null);
            Na__VideoStudio__PathVisualizer__Rebuild();                      // <-- Overlay follows the expanded video
            Na__VsDev__RefreshFramingOverlays();                             // <-- Safe frame follows its aspect too
            Na__VsDev__RenderPanel();
        });
        header.appendChild(expandButton);

        const nameInput = Na__VsDev__El('input', 'na-vs-dev__input');
        nameInput.type  = 'text';
        nameInput.value = video.VideoStudio__Video__Name;
        nameInput.title = 'Used in the exported filename';
        nameInput.addEventListener('change', () => {
            video.VideoStudio__Video__Name = nameInput.value.trim() || video.VideoStudio__Video__Name;
            nameInput.value = video.VideoStudio__Video__Name;
        });
        header.appendChild(nameInput);

        const deleteButton = Na__VsDev__Button('Delete', 'danger', 'Delete this video path');
        deleteButton.addEventListener('click', async () => {
            const confirmed = await Na__AppUtils__ConfirmDialog__Show({
                title         : 'Delete Video Path?',
                message       : `"${video.VideoStudio__Video__Name}" and all of its keyframes will be removed. `
                              + 'Nothing is written to project.json until you press Save Video Settings.',
                confirmLabel  : 'Delete',
                isDestructive : true
            });
            if (!confirmed) return;

            if (Na__VsDev__ExpandedVideoId === videoId) Na__VsDev__ExpandedVideoId = null;
            Na__VideoStudio__ProjectJson__DeleteVideo(videoId);
            Na__VsDev__OnDataChanged(videoId);
            Na__VsDev__RenderPanel();
        });
        header.appendChild(deleteButton);

        block.appendChild(header);

        // SUMMARY | Keyframe count, duration, frame count, estimated size
        const summary = Na__VsDev__El('div', 'na-vs-dev__summary', Na__VsDev__BuildVideoSummary(video).text);
        summary.dataset.vsSummaryFor = videoId;
        block.appendChild(summary);

        if (!isExpanded) return block;

        // BODY | Everything below only exists while the block is expanded
        block.appendChild(Na__VsDev__BuildTransport(video));

        const captureButton = Na__VsDev__Button('Capture Keyframe  (K or Shift+K)', 'primary',
            'Record the current camera position and orientation as the next keyframe');
        captureButton.addEventListener('click', () => Na__VsDev__CaptureKeyframe());

        const captureRow = Na__VsDev__El('div', 'na-vs-dev__actions');
        captureRow.appendChild(captureButton);
        block.appendChild(captureRow);

        // KEYFRAME LIST
        const keyframes = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        const listTitle = Na__VsDev__El('div', 'na-vs-dev__section-title', `Keyframes (${keyframes.length})`);
        block.appendChild(listTitle);

        if (keyframes.length === 0) {
            block.appendChild(Na__VsDev__El('div', 'na-vs-dev__empty',
                'Fly or walk to your first shot, then press Capture Keyframe.'));
        } else {
            const list = Na__VsDev__El('div', 'na-vs-dev__key-list');
            keyframes.forEach((keyframe, index) => {
                list.appendChild(Na__VsDev__BuildKeyframeRow(video, keyframe, index, keyframes.length));
            });
            block.appendChild(list);
        }

        block.appendChild(Na__VsDev__BuildPlaybackSection(video));
        block.appendChild(Na__VsDev__BuildAnimationsSection(video));
        block.appendChild(Na__VsDev__BuildExportSection(video));

        return block;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Rebuild the Entire Video Studio Panel
    // ------------------------------------------------------------
    function Na__VsDev__RenderPanel() {
        const panel = Na__VsDev__PanelElement;
        if (!panel) return;

        panel.textContent = '';                                              // <-- Clear previous render

        // GLOBAL ACTIONS | Create a path, toggle the viewport overlay
        const topActions = Na__VsDev__El('div', 'na-vs-dev__actions');

        const createButton = Na__VsDev__Button('Create New Video Path', 'primary');
        createButton.addEventListener('click', () => {
            const video = Na__VideoStudio__ProjectJson__AddVideo(null);
            Na__VsDev__ExpandedVideoId = video.VideoStudio__Video__Id;
            Na__VideoStudio__ProjectJson__SetActiveVideoId(video.VideoStudio__Video__Id);
            Na__VideoStudio__PathVisualizer__Rebuild();
            Na__VsDev__RenderPanel();
        });
        topActions.appendChild(createButton);
        panel.appendChild(topActions);

        const overlayRow      = Na__VsDev__Row('Show paths + keyframes');
        const overlayCheckbox = Na__VsDev__El('input', 'na-vs-dev__checkbox');
        overlayCheckbox.type    = 'checkbox';
        overlayCheckbox.checked = Na__VideoStudio__PathVisualizer__IsVisible();
        overlayCheckbox.title   = 'Draw the active path and its keyframe markers into the viewport. '
                                + 'Waypoints can only be dragged while this is on.';
        overlayCheckbox.addEventListener('change', () => {
            Na__VideoStudio__PathVisualizer__Toggle(overlayCheckbox.checked);
        });
        overlayRow.appendChild(overlayCheckbox);
        panel.appendChild(overlayRow);

        const dragHint = Na__VsDev__El('div', 'na-vs-dev__hint',
            'Drag a waypoint to move it. Shift: up/down. Ctrl: lock to one axis. '
          + 'Ctrl+Shift: turn it. Escape cancels. K captures, Space plays.');
        panel.appendChild(dragHint);

        // VIDEO BLOCKS
        const videos = Na__VideoStudio__ProjectJson__GetSortedVideos(null);

        if (videos.length === 0) {
            panel.appendChild(Na__VsDev__El('div', 'na-vs-dev__empty',
                'No video paths yet. Create one, then fly the route and capture keyframes as you go.'));
        } else {
            videos.forEach((video) => panel.appendChild(Na__VsDev__BuildVideoBlock(video)));
        }

        // SAVE | Write the whole block to project.json via the R2-first save
        const saveActions = Na__VsDev__El('div', 'na-vs-dev__global-actions');

        const saveButton = Na__VsDev__Button('Save Video Settings', 'primary',
            'Write VideoStudio__Config into project.json (R2 first, then the local mirror)');
        saveButton.disabled = (videos.length === 0 && !Na__VideoStudio__ProjectJson__GetActiveConfig());
        saveButton.addEventListener('click', () => Na__VsDev__SaveToProject(saveButton));
        saveActions.appendChild(saveButton);

        panel.appendChild(saveActions);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyframe Capture
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the Live Camera as a Keyframe on the Active Video
    // ------------------------------------------------------------
    function Na__VsDev__CaptureKeyframe() {
        const videoId = Na__VideoStudio__ProjectJson__GetActiveVideoId();
        const video   = Na__VideoStudio__ProjectJson__GetVideoById(videoId);

        if (!video) {
            Na__VsDev__Toast('Open a video path first, then capture keyframes into it.', true);
            return;
        }
        if (!Na__VsDev__Camera) return;

        const cameraPosition = Na__VideoStudio__Camera__CaptureCurrentCameraState(Na__VsDev__Camera);
        if (!cameraPosition) {
            Na__VsDev__Toast('Could not read the camera state.', true);
            return;
        }

        const activeMode = (typeof Na__NavToolbar__GetActiveMode === 'function')
            ? Na__NavToolbar__GetActiveMode()
            : 'orbit';

        const keyframe = Na__VideoStudio__ProjectJson__AddKeyframe(videoId, cameraPosition, {
            lensMm         : Math.round(Na__VideoStudio__PathSampler__FovToFocalMm(Na__VsDev__Camera.fov)),
            capturedInMode : activeMode.charAt(0).toUpperCase() + activeMode.slice(1)
        });
        if (!keyframe) return;

        Na__VideoStudio__ProjectJson__SetActiveKeyframeId(keyframe.VideoStudio__Keyframe__Id);
        Na__VsDev__OnDataChanged(videoId);
        Na__VsDev__RenderPanel();

        const total = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video).length;
        Na__VsDev__Toast(`Keyframe ${total} captured for "${video.VideoStudio__Video__Name}".`);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Video Studio Panel Currently Open?
    // ------------------------------------------------------------
    // Read from the DOM rather than a tracked flag: a flag can fall out of step
    // with the panel if anything else ever opens or closes it, and a hotkey
    // that silently stops working is a miserable thing to debug.
    // ------------------------------------------------------------
    function Na__VsDev__IsPanelOpen() {
        return !!(Na__VsDev__PanelElement && Na__VsDev__PanelElement.classList.contains('is-open'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle the Capture Hotkey While the Panel Is Open
    // ------------------------------------------------------------
    // Both K and Shift+K capture, so the chord works whether or not Shift is
    // already down from another interaction.  Alt, Ctrl and Meta are excluded
    // so browser and OS shortcuts are never shadowed.
    // ------------------------------------------------------------
    function Na__VsDev__HandleHotkey(event) {
        if (!Na__VsDev__IsPanelOpen()) return;                               // <-- Only while the Video Studio panel is open
        if (Na__VsDev__IsExporting)    return;                               // <-- Never mid-export
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.repeat) return;                                            // <-- Holding K must not spray keyframes

        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            return;                                                          // <-- Do not steal K while typing a video name
        }

        if (!event.key) return;

        // SPACE | Play or pause the preview. Blocked outside Orbit because Fly
        // uses Space to ascend, and a button that already has focus will be
        // activated by the browser, which would otherwise toggle twice.
        if (event.key === Na__VsDev__PLAY_HOTKEY) {
            if (target && target.tagName === 'BUTTON') return;
            if (typeof Na__NavToolbar__GetActiveMode === 'function'
                && Na__NavToolbar__GetActiveMode() !== 'orbit') return;

            event.preventDefault();
            Na__VsDev__TogglePreviewPlayback();
            return;
        }

        if (event.key.toLowerCase() !== Na__VsDev__CAPTURE_HOTKEY) return;

        event.preventDefault();
        Na__VsDev__CaptureKeyframe();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Preview Playback for the Active Video
    // ------------------------------------------------------------
    // Drives the same path the Play button does, then syncs the button label so
    // the panel and the hotkey never disagree about the transport state.
    // ------------------------------------------------------------
    function Na__VsDev__TogglePreviewPlayback() {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(
            Na__VideoStudio__ProjectJson__GetActiveVideoId()
        );
        if (!video) {
            Na__VsDev__Toast('Open a video path first.', true);
            return;
        }

        if (Na__VideoStudio__Preview__IsPlaying()) {
            Na__VideoStudio__Preview__Pause();
        } else {
            const error = Na__VideoStudio__Preview__Play(video);
            if (error) {
                Na__VsDev__Toast(error, true);
                return;
            }
        }

        Na__VsDev__SyncTransportButtons();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync Play Button Labels to the Transport State
    // ------------------------------------------------------------
    function Na__VsDev__SyncTransportButtons() {
        if (!Na__VsDev__PanelElement) return;

        const label = Na__VideoStudio__Preview__IsPlaying() ? 'Pause' : 'Play';
        Na__VsDev__PanelElement.querySelectorAll('.na-vs-dev__transport .na-vs-dev__btn--primary')
            .forEach((button) => { button.textContent = label; });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Logic
// -----------------------------------------------------------------------------

    // FUNCTION | Save the VideoStudio Block to project.json — R2-First
    // ------------------------------------------------------------
    async function Na__VsDev__SaveToProject(saveButton) {
        const projectCode = Na__VsDev__ProjectCode || Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) {
            Na__VsDev__Toast('No project loaded, so there is nothing to save to.', true);
            return;
        }

        const originalLabel = saveButton.textContent;
        saveButton.disabled    = true;
        saveButton.textContent = 'Saving...';

        try {
            // FETCH EXISTING PROJECT DATA FOR MERGE
            const response = await fetch(`${window.location.origin}/api/projects/${projectCode}`);
            if (!response.ok) throw new Error(`Failed to fetch project: ${response.status}`);
            const projectData = await response.json();

            // MERGE VIDEO STUDIO CONFIG
            Na__VideoStudio__ProjectJson__MergeIntoProjectData(projectData);

            // TWO-PHASE R2-FIRST SAVE
            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, Na__VsDev__ShowToast);

            const videoCount = Na__VideoStudio__ProjectJson__GetSortedVideos(null).length;
            console.log(`[VideoStudio] Saved ${videoCount} video path(s) to ${projectCode}.`);
            Na__VsDev__Toast(`Saved ${videoCount} video path${videoCount === 1 ? '' : 's'} to ${projectCode}.`);

        } catch (error) {
            console.error('[VideoStudio] Save failed:', error);
            Na__VsDev__Toast(`Save failed: ${error.message}`, true);

        } finally {
            saveButton.disabled    = false;
            saveButton.textContent = originalLabel;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Transport Sync
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update the Scrubber and Time Readout from a Preview Tick
    // ------------------------------------------------------------
    function Na__VsDev__HandlePreviewTick(event) {
        const detail = event.detail;
        if (!detail || !Na__VsDev__PanelElement) return;

        const scrubber = Na__VsDev__PanelElement.querySelector(`[data-vs-scrubber-for="${detail.videoId}"]`);
        if (scrubber && document.activeElement !== scrubber) {
            scrubber.max   = String(Math.max(1, detail.durationMs));
            scrubber.value = String(detail.currentMs);                       // <-- Never fight a drag in progress
        }

        const timeLabel = Na__VsDev__PanelElement.querySelector(`[data-vs-time-for="${detail.videoId}"]`);
        if (timeLabel) {
            timeLabel.textContent = `${Na__VideoStudio__PathSampler__FormatDuration(detail.currentMs)}`
                                  + ` / ${Na__VideoStudio__PathSampler__FormatDuration(detail.durationMs)}`;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reset Play Buttons When Playback Ends
    // ------------------------------------------------------------
    function Na__VsDev__HandlePreviewEnded() {
        if (!Na__VsDev__PanelElement) return;

        Na__VsDev__PanelElement.querySelectorAll('.na-vs-dev__transport .na-vs-dev__btn--primary')
            .forEach((button) => { button.textContent = 'Play'; });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Load the VideoStudio Block from Fetched Project Data
    // ------------------------------------------------------------
    // Called by the loading sequence, or internally on first panel open.
    // ------------------------------------------------------------
    function Na__VideoStudio__DevMenu__LoadFromProjectData(projectData, projectCode) {
        const block = Na__VideoStudio__ProjectJson__GetConfigBlock(projectData);
        Na__VideoStudio__ProjectJson__SetActiveConfig(block, projectCode);
        Na__VsDev__ProjectCode = projectCode || Na__VsDev__ProjectCode;

        if (Na__VsDev__PanelElement) Na__VsDev__RenderPanel();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch the Project's Existing Video Block on First Open
    // ------------------------------------------------------------
    async function Na__VsDev__LoadExistingConfig() {
        if (Na__VideoStudio__ProjectJson__GetActiveConfig()) return;         // <-- Already loaded

        const projectCode = Na__VsDev__ProjectCode || Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectCode) return;

        try {
            const response = await fetch(`${window.location.origin}/api/projects/${projectCode}`);
            if (!response.ok) return;

            const projectData = await response.json();
            const block       = projectData[Na__VideoStudio__SECTION_KEY];
            if (!block) return;                                              // <-- Nothing authored for this project yet

            Na__VideoStudio__ProjectJson__SetActiveConfig(block, projectCode);
            Na__VsDev__RenderPanel();

        } catch (error) {
            console.warn('[VideoStudio] Could not load existing video config:', error.message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Localhost-Only Video Studio Dev Controls
    // ------------------------------------------------------------
    // options: { renderer, scene, camera, controls, getRenderPipelineState,
    //            showToast, cameraLensConfig, navmodeSettings }
    // ------------------------------------------------------------
    function Na__VideoStudio__DevMenu__Initialize(options) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                   // <-- Dev menu only on localhost

        const menuItem  = document.getElementById(Na__VsDev__ItemId);
        const toggleBtn = document.getElementById(Na__VsDev__ToggleId);
        const panel     = document.getElementById(Na__VsDev__PanelId);

        if (!menuItem || !panel) return;                                     // <-- Guard: DOM not ready

        Na__VsDev__Renderer    = options.renderer;
        Na__VsDev__Scene       = options.scene;
        Na__VsDev__Camera      = options.camera;
        Na__VsDev__Controls    = options.controls;
        Na__VsDev__GetPipeline = options.getRenderPipelineState;
        Na__VsDev__ShowToast   = options.showToast;
        Na__VsDev__ProjectCode = Na__AppUtils__GetProjectCodeFromUrl();
        Na__VsDev__PanelElement = panel;

        // LENS CONVERSION | Share the Tools menu's sensor height so the focal
        // lengths shown here and there can never disagree for one camera.
        if (options.cameraLensConfig && Number.isFinite(options.cameraLensConfig.sensorHeightMM)) {
            Na__VideoStudio__PathSampler__SetSensorHeightMm(options.cameraLensConfig.sensorHeightMM);
        }

        // ANIMATIONS | Reuse the Walk and Fly door proximity threshold
        if (options.navmodeSettings) {
            Na__VideoStudio__SceneAnimations__SetConfig(options.navmodeSettings);
        }

        menuItem.style.display = '';                                         // <-- Reveal the dev section

        // WIRE SUBMENU OPEN/CLOSE TOGGLE
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));    // <-- The hotkey reads the class, not a flag

                if (!isOpen) Na__VsDev__LoadExistingConfig();                // <-- Pull saved videos on first open
            });
        }

        // WIRE PREVIEW TRANSPORT SYNC
        window.addEventListener(Na__VsPreview__TICK_EVENT,  Na__VsDev__HandlePreviewTick);
        window.addEventListener(Na__VsPreview__ENDED_EVENT, Na__VsDev__HandlePreviewEnded);

        // WIRE WAYPOINT DRAG COMMITS | A drag rewrites a keyframe position, so
        // the panel's duration and frame count readouts need refreshing.
        window.addEventListener(Na__VsDrag__MOVED_EVENT, (event) => {
            const videoId = event.detail && event.detail.videoId;
            Na__VideoStudio__Preview__InvalidateTimeline(videoId || null);
            Na__VsDev__RefreshSummaries();
        });

        // WIRE CAPTURE HOTKEY
        window.addEventListener('keydown', Na__VsDev__HandleHotkey);

        if (!Na__VideoStudio__Encoder__IsSupported()) {
            console.warn('[VideoStudio] WebCodecs VideoEncoder unavailable — authoring works, MP4 export does not.');
        }

        Na__VsDev__RenderPanel();

        console.log('[ValeVision3D] Video Studio dev controls initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Video Studio Dev Menu API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__DevMenu__Initialize,
        Na__VideoStudio__DevMenu__LoadFromProjectData
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
