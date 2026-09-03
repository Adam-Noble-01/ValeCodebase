// =============================================================================
// VALEVISION3D - VIDEO STUDIO - TIMELINE KEYFRAME CONTEXT MENU
// =============================================================================
//
// FILE       : Na__VideoStudio__Timeline__ContextMenu.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Timeline Keyframe Context Menu
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Right-click editor for one keyframe, opened from its tile on
//              the Video Studio timeline
// CREATED    : 02-Sep-2026
//
// DESCRIPTION:
// - Everything anyone actually does to a single shot, on the shot itself.
//   The Dev panel's keyframe list can still do all of this, but it makes you
//   find the right row in a scrolling column of near-identical rows first.
//   Right-clicking the picture of the shot you mean removes that step.
// - Travel, Hold and Lens are the three fields edited constantly, so they are
//   at the top with no disclosure in front of them. Height and Tilt sit under
//   a collapsed Advanced section because they are occasional corrections, not
//   part of the normal loop.
// - Every field commits on change and on Enter, writes through the data layer,
//   and records an undo entry, so Ctrl+Z steps back through menu edits exactly
//   as it steps back through a waypoint drag.
//
// CAMERA HEIGHT AND TILT:
// - Height is the waypoint's Y position in millimetres, the same number the
//   camera block stores, so it reads against the model's own datum.
// - Tilt is the elevation of the camera's aim: zero is level with the horizon,
//   positive looks up, negative looks down. It is read from the forward vector
//   rather than from the stored Euler, because an XYZ Euler's X term is only
//   the pitch when the heading happens to be zero. Writing it rebuilds the
//   orientation from heading and pitch with the roll set to zero, which is
//   what a camera on a tripod can physically do.
//
// DELETING:
// - Removal is recorded as a structural undo entry before it happens, exactly
//   as the Delete hotkey does, so Ctrl+Z puts the waypoint back in its place
//   in the running order. The confirm dialog says so, and says the plain truth
//   next to it: that history is cleared when the panel closes or another path
//   is opened, so it is a working-session safety net and not a permanent one.
//
// INTEGRATION:
// - Initialize once from Na__VideoStudio__DevMenu__Controls, which supplies the
//   live camera, the toast callback and the one refresh routine that knows
//   everything a keyframe edit has to update.
// - Na__VideoStudio__Timeline__Controls calls Open from a tile's contextmenu.
// - Styling lives in Na__VideoStudio__Timeline__Stylesheet__.css under the
//   .na-vs-menu__* regions, beside the strip this menu belongs to.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Sep-2026 - Version 1.0.0
// - Initial implementation for the Video Studio timeline.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__MIN_SEGMENT_MS,
        Na__VideoStudio__MAX_SEGMENT_MS,
        Na__VideoStudio__MIN_HOLD_MS,
        Na__VideoStudio__MAX_HOLD_MS,
        Na__VideoStudio__MIN_LENS_MM,
        Na__VideoStudio__MAX_LENS_MM,
        Na__VideoStudio__ClampSegmentMs,
        Na__VideoStudio__ClampHoldMs,
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions,
        Na__VideoStudio__ProjectJson__GetKeyframeLensMm,
        Na__VideoStudio__ProjectJson__SetKeyframeLens,
        Na__VideoStudio__ProjectJson__SetKeyframePosition,
        Na__VideoStudio__ProjectJson__SetKeyframeRotation,
        Na__VideoStudio__ProjectJson__GetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__DeleteKeyframe
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__FovToFocalMm,
        Na__VideoStudio__PathSampler__FocalMmToFov,
        Na__VideoStudio__Camera__ParseKeyframeState,
        Na__VideoStudio__Camera__CaptureCurrentCameraState,
        Na__VideoStudio__Camera__QuaternionToEulerBlock
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Waypoint Edit Undo History
    // @delegate: ./Na__VideoStudio__Edit__UndoHistory.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__UndoHistory__SnapshotKeyframe,
        Na__VideoStudio__UndoHistory__SnapshotKeyframes,
        Na__VideoStudio__UndoHistory__Record,
        Na__VideoStudio__UndoHistory__RecordStructure
    } from './Na__VideoStudio__Edit__UndoHistory.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Preview Controller
    // @delegate: ./Na__VideoStudio__Playback__PreviewController.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Preview__JumpToKeyframe } from './Na__VideoStudio__Playback__PreviewController.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Viewport Path Visualizer
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__PathVisualizer__Rebuild } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Mode Reporting
    // ------------------------------------------------------------
    import { Na__NavToolbar__GetActiveMode } from '../10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Placement
    // ------------------------------------------------------------
    const Na__VsMenu__EDGE_GAP_PX   = 10;   // <-- Never let the menu touch the window edge
    const Na__VsMenu__CURSOR_GAP_PX = 4;    // <-- Small offset so the menu does not open under the pointer
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Camera Field Bounds
    // ------------------------------------------------------------
    // Sanity rails rather than model bounds: they exist to stop a typo putting
    // a waypoint a kilometre underground, not to describe where a camera is
    // allowed to be. Tilt stops just short of straight up and straight down,
    // where heading stops being meaningful and the maths degenerates.
    // ------------------------------------------------------------
    const Na__VsMenu__MIN_HEIGHT_MM = -20000;    // <-- Basements and sunken courtyards
    const Na__VsMenu__MAX_HEIGHT_MM = 200000;    // <-- Aerial establishing shots
    const Na__VsMenu__MAX_TILT_DEG  = 89;        // <-- Symmetric; straight up and down are excluded
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__VsMenu__Camera    = null;    // <-- Live camera, for Match Current Camera
    let Na__VsMenu__ShowToast = null;    // <-- Toast callback
    let Na__VsMenu__OnChanged = null;    // <-- Supplied refresh: panel, overlay, timeline, preview
    // ------------------------------------------------------------


    // MODULE VARIABLES | Open Menu State
    // ------------------------------------------------------------
    let Na__VsMenu__Element    = null;    // <-- The open menu, or null
    let Na__VsMenu__VideoId    = null;    // <-- Path the open menu belongs to
    let Na__VsMenu__KeyframeId = null;    // <-- Waypoint the open menu edits
    // ------------------------------------------------------------


    // MODULE VARIABLES | Section Expansion
    // ------------------------------------------------------------
    // Survives closing and reopening the menu, so someone working through a
    // path adjusting heights does not have to unfold it at every waypoint.
    // ------------------------------------------------------------
    let Na__VsMenu__AdvancedOpen = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small DOM Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an Element with Class and Text
    // ------------------------------------------------------------
    function Na__VsMenu__El(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null) element.textContent = text;
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Field Row: Input, Unit, Label
    // ------------------------------------------------------------
    // The input leads and the label follows, which is the layout the request
    // asked for and which reads well here: the numbers line up down the left
    // edge so a column of them can be scanned without reading the words.
    //
    // commit(value) runs on change and on Enter, and returns the value that was
    // actually stored so the field can snap to it after a clamp.
    // ------------------------------------------------------------
    function Na__VsMenu__Field(options) {
        const { label, unit, value, min, max, step, title, disabled, commit } = options;

        const row = Na__VsMenu__El('div', 'na-vs-menu__field');

        const input = Na__VsMenu__El('input', 'na-vs-menu__input');
        input.type  = 'number';
        input.value = String(value);
        input.min   = String(min);
        input.max   = String(max);
        input.step  = String(step);
        if (title)    input.title    = title;
        if (disabled) input.disabled = true;

        const apply = () => {
            const raw = parseFloat(input.value);
            if (!Number.isFinite(raw)) {                                     // <-- Emptied or nonsense; put the old value back
                input.value = String(value);
                return;
            }
            const stored = commit(raw);
            if (stored !== null && stored !== undefined) input.value = String(stored);
        };

        input.addEventListener('change', apply);
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            apply();
            input.blur();
        });

        row.appendChild(input);
        if (unit) row.appendChild(Na__VsMenu__El('span', 'na-vs-menu__unit', unit));
        row.appendChild(Na__VsMenu__El('span', 'na-vs-menu__label', label));

        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Full-Width Action Button Row
    // ------------------------------------------------------------
    function Na__VsMenu__ActionRow(buttonLabel, description, modifier, onClick) {
        const row    = Na__VsMenu__El('div', 'na-vs-menu__field');
        const button = Na__VsMenu__El('button', `na-vs-menu__btn${modifier ? ` na-vs-menu__btn--${modifier}` : ''}`, buttonLabel);
        button.type  = 'button';
        button.addEventListener('click', onClick);

        row.appendChild(button);
        row.appendChild(Na__VsMenu__El('span', 'na-vs-menu__label', description));
        return row;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera Geometry Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Waypoint's Aim as an Elevation Angle
    // ------------------------------------------------------------
    // Zero is level, positive is looking up.  Derived from the forward vector
    // rather than from the stored Euler: with XYZ order the X term is only the
    // pitch when the heading is zero, so reading it directly would show a wrong
    // number on every waypoint that is not facing due north.
    // ------------------------------------------------------------
    function Na__VsMenu__ReadTiltDegrees(state) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.quaternion);
        const clamped = Math.max(-1, Math.min(1, forward.y));
        return THREE.MathUtils.radToDeg(Math.asin(clamped));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rebuild an Aim at a New Elevation, Heading Unchanged
    // ------------------------------------------------------------
    // Returns the XYZ Euler block to store.  The heading is recovered from the
    // existing forward vector and the roll is set to zero, so the result is an
    // orientation a camera on a tripod could actually hold.  Any roll a
    // previous edit left behind is therefore levelled out by setting a tilt,
    // which is what anyone reaching for this field wants.
    // ------------------------------------------------------------
    function Na__VsMenu__BuildAimAtTilt(state, tiltDegrees) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.quaternion);

        // HEADING | Angle about world Y. Taken from the flattened forward
        // vector, so it survives any pitch the waypoint already had.
        const heading = Math.atan2(-forward.x, -forward.z);
        const pitch   = THREE.MathUtils.degToRad(
            Math.max(-Na__VsMenu__MAX_TILT_DEG, Math.min(Na__VsMenu__MAX_TILT_DEG, tiltDegrees))
        );

        // YXZ | Yaw then pitch then roll is the order that describes a levelled
        // camera; building in XYZ here would reintroduce the very cross-term
        // this function exists to avoid.
        const euler      = new THREE.Euler(pitch, heading, 0, 'YXZ');
        const quaternion = new THREE.Quaternion().setFromEuler(euler);

        return Na__VideoStudio__Camera__QuaternionToEulerBlock(quaternion);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-Aim the Live Camera If It Is Sitting on This Waypoint
    // ------------------------------------------------------------
    // Editing height or tilt with the camera parked at that waypoint should
    // show the result immediately.  Editing one you are not looking through
    // must never yank the view somewhere else, which is the same rule the Dev
    // panel's lens field follows.
    // ------------------------------------------------------------
    function Na__VsMenu__PreviewIfCameraIsHere(keyframe) {
        if (!Na__VsMenu__Camera) return;
        if (Na__VideoStudio__ProjectJson__GetActiveKeyframeId() !== Na__VsMenu__KeyframeId) return;

        Na__VideoStudio__Preview__JumpToKeyframe(keyframe);                  // <-- Re-reads the block we just rewrote
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Edit Commits
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Run One Field Edit with Undo and Refresh Around It
    // ------------------------------------------------------------
    // Snapshot, mutate, record, refresh.  Every field goes through here so no
    // single one of them can forget a step, which is how a menu of six inputs
    // ends up with two that quietly do not appear in the undo history.
    //
    // mutate() returns false to abandon the edit without recording anything.
    // ------------------------------------------------------------
    function Na__VsMenu__CommitEdit(keyframe, label, mutate) {
        const before = Na__VideoStudio__UndoHistory__SnapshotKeyframe(keyframe);

        if (mutate() === false) return;

        Na__VideoStudio__UndoHistory__Record({
            videoId    : Na__VsMenu__VideoId,
            keyframeId : Na__VsMenu__KeyframeId,
            before,
            after      : Na__VideoStudio__UndoHistory__SnapshotKeyframe(keyframe),
            label
        });

        Na__VideoStudio__PathVisualizer__Rebuild();                          // <-- The marker may have moved or turned

        if (typeof Na__VsMenu__OnChanged === 'function') {
            Na__VsMenu__OnChanged(Na__VsMenu__VideoId);                      // <-- Panel, timeline and cached preview all follow
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Overwrite a Waypoint with the Live Camera
    // ------------------------------------------------------------
    // The same edit the Dev panel's Update button makes: position, aim, lens
    // and the mode it was captured in, all taken from the camera as it stands.
    // ------------------------------------------------------------
    function Na__VsMenu__MatchCurrentCamera(keyframe, index) {
        if (!Na__VsMenu__Camera) return;

        const captureFov = Na__VsMenu__Camera.fov;
        const cameraBlock = Na__VideoStudio__Camera__CaptureCurrentCameraState(Na__VsMenu__Camera, captureFov);
        if (!cameraBlock) {
            Na__VsMenu__Toast('Could not read the camera state.', true);
            return;
        }

        Na__VsMenu__CommitEdit(keyframe, `Update waypoint ${index + 1}`, () => {
            const activeMode = (typeof Na__NavToolbar__GetActiveMode === 'function')
                ? Na__NavToolbar__GetActiveMode()
                : 'orbit';

            keyframe.VideoStudio__Keyframe__CameraPosition = cameraBlock;
            keyframe.VideoStudio__Keyframe__LensMm         = Math.round(Na__VideoStudio__PathSampler__FovToFocalMm(captureFov));
            keyframe.VideoStudio__Keyframe__CapturedInMode = activeMode.charAt(0).toUpperCase() + activeMode.slice(1);
            return true;
        });

        Na__VsMenu__Toast(`Waypoint ${index + 1} updated to the current view.`);
        Na__VideoStudio__Timeline__ContextMenu__Close();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete a Waypoint Behind a Confirmation
    // ------------------------------------------------------------
    // Recorded as a structural undo entry before the removal, exactly as the
    // Delete hotkey does, so Ctrl+Z puts it back where it was in the running
    // order.  The dialog says that, and says the caveat with it: the history
    // is cleared when the panel closes or another path is opened, so it is a
    // safety net for the session you are in and nothing beyond it.
    // ------------------------------------------------------------
    async function Na__VsMenu__DeleteKeyframe(video, keyframe, index) {
        const videoId    = Na__VsMenu__VideoId;
        const keyframeId = Na__VsMenu__KeyframeId;

        Na__VideoStudio__Timeline__ContextMenu__Close();                     // <-- The dialog owns the screen from here

        const confirmed = await Na__AppUtils__ConfirmDialog__Show({
            title         : `Delete Keyframe ${index + 1}?`,
            message       : `Keyframe ${index + 1} will be removed from "${video.VideoStudio__Video__Name}", and the path `
                          + 'will re-flow through the waypoints that are left, which changes the shot either side of it.\n\n'
                          + 'Ctrl+Z will put it back, but only for as long as this editing session lasts: the history is '
                          + 'cleared when the Video Studio panel is closed or another path is opened. After that the '
                          + 'waypoint is gone and would have to be captured again.',
            confirmLabel  : 'Delete Keyframe',
            isDestructive : true
        });
        if (!confirmed) return;

        const before = Na__VideoStudio__UndoHistory__SnapshotKeyframes(video);

        if (!Na__VideoStudio__ProjectJson__DeleteKeyframe(videoId, keyframeId)) return;

        Na__VideoStudio__UndoHistory__RecordStructure({
            videoId,
            before,
            after : Na__VideoStudio__UndoHistory__SnapshotKeyframes(video),
            label : `Delete waypoint ${index + 1}`
        });

        Na__VideoStudio__PathVisualizer__Rebuild();

        if (typeof Na__VsMenu__OnChanged === 'function') Na__VsMenu__OnChanged(videoId);

        Na__VsMenu__Toast(`Waypoint ${index + 1} deleted. Ctrl+Z puts it back.`);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit a Toast, If One Was Wired
    // ------------------------------------------------------------
    function Na__VsMenu__Toast(message, isError) {
        if (typeof Na__VsMenu__ShowToast === 'function') Na__VsMenu__ShowToast(message, !!isError);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Timing Fields at the Top of the Menu
    // ------------------------------------------------------------
    function Na__VsMenu__BuildTimingSection(menu, video, keyframe, index, total) {
        // TRAVEL | Seconds from this waypoint to the next. The last waypoint of
        // an open path has nowhere to travel to, so its field is inert rather
        // than absent: a missing row would make the menu a different shape at
        // the end of every path.
        const isLast     = (index === total - 1);
        const openEnded  = isLast && !Na__VideoStudio__ProjectJson__GetPlaybackOptions(video).closedLoop;

        menu.appendChild(Na__VsMenu__Field({
            label    : 'Travel Time',
            unit     : 's',
            value    : (keyframe.VideoStudio__Keyframe__SegmentMs / 1000).toFixed(1),
            min      : Na__VideoStudio__MIN_SEGMENT_MS / 1000,
            max      : Na__VideoStudio__MAX_SEGMENT_MS / 1000,
            step     : 'any',
            disabled : openEnded,
            title    : openEnded
                ? 'The final keyframe has nowhere to travel to on an open path'
                : 'Seconds to fly from this keyframe to the next',
            commit   : (raw) => Na__VsMenu__CommitEditReturning(keyframe, `Travel time on waypoint ${index + 1}`, () => {
                keyframe.VideoStudio__Keyframe__SegmentMs = Na__VideoStudio__ClampSegmentMs(raw * 1000);
                return (keyframe.VideoStudio__Keyframe__SegmentMs / 1000).toFixed(1);
            })
        }));

        menu.appendChild(Na__VsMenu__Field({
            label  : 'Hold Time',
            unit   : 's',
            value  : (keyframe.VideoStudio__Keyframe__HoldMs / 1000).toFixed(1),
            min    : Na__VideoStudio__MIN_HOLD_MS / 1000,
            max    : Na__VideoStudio__MAX_HOLD_MS / 1000,
            step   : 0.1,
            title  : 'Seconds the camera sits still at this keyframe before moving on',
            commit : (raw) => Na__VsMenu__CommitEditReturning(keyframe, `Hold time on waypoint ${index + 1}`, () => {
                keyframe.VideoStudio__Keyframe__HoldMs = Na__VideoStudio__ClampHoldMs(raw * 1000);
                return (keyframe.VideoStudio__Keyframe__HoldMs / 1000).toFixed(1);
            })
        }));

        menu.appendChild(Na__VsMenu__ActionRow('Update', 'Match Current Camera', 'primary',
            () => Na__VsMenu__MatchCurrentCamera(keyframe, index)));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Commit an Edit and Hand Back the Stored Value
    // ------------------------------------------------------------
    // CommitEdit wraps a mutation in undo and refresh but throws the mutation's
    // return value away, because most callers have nothing to say.  A number
    // field does: it needs the clamped value back so it can snap to what was
    // actually stored rather than showing what was typed.
    // ------------------------------------------------------------
    function Na__VsMenu__CommitEditReturning(keyframe, label, mutate) {
        let stored = null;
        Na__VsMenu__CommitEdit(keyframe, label, () => {
            stored = mutate();
            return true;
        });
        return stored;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Camera Settings Section
    // ------------------------------------------------------------
    function Na__VsMenu__BuildCameraSection(menu, keyframe, index) {
        menu.appendChild(Na__VsMenu__El('div', 'na-vs-menu__divider'));
        menu.appendChild(Na__VsMenu__El('div', 'na-vs-menu__section-title', 'Camera Settings'));

        // LENS | Rewrites the stored field of view too, which is the value the
        // sampler interpolates, so two waypoints on different lenses give a
        // dolly zoom between them.
        menu.appendChild(Na__VsMenu__Field({
            label  : 'Camera Lens',
            unit   : 'mm',
            value  : Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe),
            min    : Na__VideoStudio__MIN_LENS_MM,
            max    : Na__VideoStudio__MAX_LENS_MM,
            step   : 1,
            title  : `Focal length for this shot, ${Na__VideoStudio__MIN_LENS_MM} to ${Na__VideoStudio__MAX_LENS_MM}mm on full frame. `
                   + 'Differing lenses between two keyframes produce a dolly zoom.',
            commit : (raw) => Na__VsMenu__CommitEditReturning(keyframe, `Lens on waypoint ${index + 1}`, () => {
                const clamped = Na__VideoStudio__ProjectJson__SetKeyframeLens(
                    Na__VsMenu__VideoId, Na__VsMenu__KeyframeId, raw, Na__VideoStudio__PathSampler__FocalMmToFov(raw)
                );
                if (clamped === null) return null;
                Na__VsMenu__PreviewIfCameraIsHere(keyframe);
                return clamped;
            })
        }));

        // ADVANCED | Collapsed by default. Height and tilt are corrections
        // rather than part of the normal loop, and putting them behind one
        // click keeps the menu short enough to read at a glance.
        const toggle = Na__VsMenu__El('button',
            `na-vs-menu__disclosure${Na__VsMenu__AdvancedOpen ? ' is-open' : ''}`,
            'Advanced Camera Settings');
        toggle.type = 'button';

        const advanced = Na__VsMenu__El('div',
            `na-vs-menu__advanced${Na__VsMenu__AdvancedOpen ? ' is-open' : ''}`);

        toggle.addEventListener('click', () => {
            Na__VsMenu__AdvancedOpen = !Na__VsMenu__AdvancedOpen;
            toggle.classList.toggle('is-open',   Na__VsMenu__AdvancedOpen);
            advanced.classList.toggle('is-open', Na__VsMenu__AdvancedOpen);
            Na__VsMenu__ClampToViewport();                                   // <-- Unfolding may push it off the bottom
        });

        const state = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);

        if (state) {
            // HEIGHT | The waypoint's Y in millimetres, the same number the
            // camera block stores, so it reads against the model's own datum.
            advanced.appendChild(Na__VsMenu__Field({
                label  : 'Camera Height',
                unit   : 'mm',
                value  : Math.round(Na__Math__ConvertUnitsToMm(state.position.y)),
                min    : Na__VsMenu__MIN_HEIGHT_MM,
                max    : Na__VsMenu__MAX_HEIGHT_MM,
                step   : 50,
                title  : 'Height of this shot above the model origin, in millimetres. Aim is unchanged, so raising a '
                       + 'waypoint looks at the same bearing from higher up.',
                commit : (raw) => Na__VsMenu__CommitEditReturning(keyframe, `Height on waypoint ${index + 1}`, () => {
                    const mm    = Math.round(Math.max(Na__VsMenu__MIN_HEIGHT_MM, Math.min(Na__VsMenu__MAX_HEIGHT_MM, raw)));
                    const fresh = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);   // <-- Not the build-time snapshot
                    if (!fresh) return null;

                    const moved = fresh.position.clone();
                    moved.y = Na__Math__ConvertMmToUnits(mm);

                    Na__VideoStudio__ProjectJson__SetKeyframePosition(Na__VsMenu__VideoId, Na__VsMenu__KeyframeId, moved);
                    Na__VsMenu__PreviewIfCameraIsHere(keyframe);
                    return mm;
                })
            }));

            // TILT | Elevation of the aim. Zero is level with the horizon.
            advanced.appendChild(Na__VsMenu__Field({
                label  : 'Camera Tilt',
                unit   : 'deg',
                value  : Na__VsMenu__ReadTiltDegrees(state).toFixed(1),
                min    : -Na__VsMenu__MAX_TILT_DEG,
                max    : Na__VsMenu__MAX_TILT_DEG,
                step   : 0.5,
                title  : 'Degrees above or below the horizon. Zero is level, positive looks up, negative looks down. '
                       + 'The bearing is kept and any roll is levelled out.',
                commit : (raw) => Na__VsMenu__CommitEditReturning(keyframe, `Tilt on waypoint ${index + 1}`, () => {
                    const degrees = Math.max(-Na__VsMenu__MAX_TILT_DEG, Math.min(Na__VsMenu__MAX_TILT_DEG, raw));
                    const fresh   = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);  // <-- Heading as it stands now
                    if (!fresh) return null;

                    const block = Na__VsMenu__BuildAimAtTilt(fresh, degrees);

                    Na__VideoStudio__ProjectJson__SetKeyframeRotation(Na__VsMenu__VideoId, Na__VsMenu__KeyframeId, {
                        x : block.Camera__DefaultRotation__RotX,
                        y : block.Camera__DefaultRotation__RotY,
                        z : block.Camera__DefaultRotation__RotZ
                    });
                    Na__VsMenu__PreviewIfCameraIsHere(keyframe);
                    return degrees.toFixed(1);
                })
            }));
        } else {
            advanced.appendChild(Na__VsMenu__El('div', 'na-vs-menu__note',
                'This keyframe has no readable camera block.'));
        }

        menu.appendChild(toggle);
        menu.appendChild(advanced);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Delete Section at the Foot of the Menu
    // ------------------------------------------------------------
    function Na__VsMenu__BuildDeleteSection(menu, video, keyframe, index) {
        menu.appendChild(Na__VsMenu__El('div', 'na-vs-menu__divider'));

        const button = Na__VsMenu__El('button', 'na-vs-menu__btn na-vs-menu__btn--danger na-vs-menu__btn--wide',
            'Delete Keyframe');
        button.type  = 'button';
        button.title = 'Remove this waypoint from the path. You will be asked to confirm.';
        button.addEventListener('click', () => Na__VsMenu__DeleteKeyframe(video, keyframe, index));

        menu.appendChild(button);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Keep the Open Menu Inside the Window
    // ------------------------------------------------------------
    // Called on open and again whenever the menu changes height, because
    // unfolding the Advanced section can push the foot of it off the screen
    // from a right-click near the bottom of the viewport, which is exactly
    // where a timeline tile is.
    // ------------------------------------------------------------
    function Na__VsMenu__ClampToViewport() {
        const menu = Na__VsMenu__Element;
        if (!menu) return;

        const bounds = menu.getBoundingClientRect();
        const maxX   = window.innerWidth  - bounds.width  - Na__VsMenu__EDGE_GAP_PX;
        const maxY   = window.innerHeight - bounds.height - Na__VsMenu__EDGE_GAP_PX;

        const wantedX = parseFloat(menu.dataset.vsMenuWantX) || 0;
        const wantedY = parseFloat(menu.dataset.vsMenuWantY) || 0;

        menu.style.left = `${Math.max(Na__VsMenu__EDGE_GAP_PX, Math.min(maxX, wantedX))}px`;
        menu.style.top  = `${Math.max(Na__VsMenu__EDGE_GAP_PX, Math.min(maxY, wantedY))}px`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dismiss on Anything That Should Dismiss It
    // ------------------------------------------------------------
    function Na__VsMenu__HandleDismiss(event) {
        if (!Na__VsMenu__Element) return;

        if (event.type === 'keydown') {
            if (event.key === 'Escape') Na__VideoStudio__Timeline__ContextMenu__Close();
            return;
        }

        if (Na__VsMenu__Element.contains(event.target)) return;              // <-- A press inside is an edit, not a dismiss
        Na__VideoStudio__Timeline__ContextMenu__Close();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Menu for One Keyframe
    // ------------------------------------------------------------
    // options: { videoId, keyframeId, clientX, clientY }
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__ContextMenu__Open(options) {
        const { videoId, keyframeId, clientX, clientY } = options || {};

        Na__VideoStudio__Timeline__ContextMenu__Close();                     // <-- Only ever one open

        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return;

        const keyframes = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        const index     = keyframes.findIndex(k => k.VideoStudio__Keyframe__Id === keyframeId);
        if (index === -1) return;

        const keyframe = keyframes[index];

        Na__VsMenu__VideoId    = videoId;
        Na__VsMenu__KeyframeId = keyframeId;

        const menu = Na__VsMenu__El('div', 'na-vs-menu');
        menu.setAttribute('role', 'menu');

        // TITLE | Zero-padded to match the tile badges and the panel rows, so
        // the number in front of you is the number everywhere else.
        menu.appendChild(Na__VsMenu__El('div', 'na-vs-menu__title',
            `Key Frame ${String(index + 1).padStart(2, '0')}`));

        Na__VsMenu__BuildTimingSection(menu, video, keyframe, index, keyframes.length);
        Na__VsMenu__BuildCameraSection(menu, keyframe, index);
        Na__VsMenu__BuildDeleteSection(menu, video, keyframe, index);

        menu.dataset.vsMenuWantX = String((clientX || 0) + Na__VsMenu__CURSOR_GAP_PX);
        menu.dataset.vsMenuWantY = String((clientY || 0) + Na__VsMenu__CURSOR_GAP_PX);

        document.body.appendChild(menu);
        Na__VsMenu__Element = menu;
        Na__VsMenu__ClampToViewport();

        // DISMISS | Captured on the way down so a press anywhere else closes
        // the menu before that press does whatever else it was going to do.
        window.addEventListener('pointerdown', Na__VsMenu__HandleDismiss, true);
        window.addEventListener('keydown',     Na__VsMenu__HandleDismiss, true);
        window.addEventListener('resize',      Na__VideoStudio__Timeline__ContextMenu__Close);
        window.addEventListener('wheel',       Na__VideoStudio__Timeline__ContextMenu__Close, { passive: true });
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Menu If One Is Open
    // ------------------------------------------------------------
    // Safe to call at any time, including when nothing is open.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__ContextMenu__Close() {
        if (!Na__VsMenu__Element) return;

        window.removeEventListener('pointerdown', Na__VsMenu__HandleDismiss, true);
        window.removeEventListener('keydown',     Na__VsMenu__HandleDismiss, true);
        window.removeEventListener('resize',      Na__VideoStudio__Timeline__ContextMenu__Close);
        window.removeEventListener('wheel',       Na__VideoStudio__Timeline__ContextMenu__Close);

        Na__VsMenu__Element.remove();
        Na__VsMenu__Element    = null;
        Na__VsMenu__VideoId    = null;
        Na__VsMenu__KeyframeId = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Live Camera, Toast and Refresh Callback
    // ------------------------------------------------------------
    // options: { camera, showToast, onChanged }
    //
    // onChanged(videoId) is called after every committed edit.  The Dev menu
    // supplies it, because the Dev menu is the one place that knows the full
    // list of things a keyframe edit has to update.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__ContextMenu__Initialize(options) {
        if (!options) return;

        Na__VsMenu__Camera    = options.camera    || null;
        Na__VsMenu__ShowToast = options.showToast || null;
        Na__VsMenu__OnChanged = options.onChanged || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Timeline Context Menu API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Timeline__ContextMenu__Initialize,
        Na__VideoStudio__Timeline__ContextMenu__Open,
        Na__VideoStudio__Timeline__ContextMenu__Close
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
