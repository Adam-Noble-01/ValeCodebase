// =============================================================================
// VALEVISION3D - VIDEO STUDIO - TIMELINE CONTROLS
// =============================================================================
//
// FILE       : Na__VideoStudio__Timeline__Controls.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Timeline Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Bottom-of-screen editing timeline for the active video path,
//              showing every keyframe as a thumbnail at the moment it happens
// CREATED    : 02-Sep-2026
//
// DESCRIPTION:
// - Replaces the Video Studio panel's old Play / Stop / scrubber row.  A bare
//   slider tells you where the playhead is and nothing else; this shows the
//   shots themselves, in order, at their real positions in time, which is what
//   composing a film actually needs.
// - Takes over the bottom of the screen from the Presentation Mode scene
//   carousel while it is up.  Two strips both calling themselves scenes is
//   confusing, so only one is ever on: opening the Video Studio panel hides the
//   carousel and remembers whether it was showing, and closing the panel puts
//   it back exactly as it was.
// - A keyframe tile carries the rendered shot, its number, its time, and its
//   hold if it has one.  A stem drops from the tile to the ruler so the tick
//   stays truthful even where two shots sit close enough for their tiles to
//   overlap.
//
// INTERACTION:
// - Single click a tile      : selects that waypoint, which highlights its
//                              marker in the viewport for dragging.
// - Double click a tile      : flies the camera to it, the same thing the
//                              panel's Go To button does.
// - Right click a tile       : opens the keyframe context menu on it, which
//                              edits travel, hold, lens, height and tilt in
//                              place and can delete the waypoint.
// - Click or drag the track  : scrubs the playhead.
// - Play / Pause / Stop      : the same transport the panel used to carry,
//                              and the same one the spacebar drives.
//
// SELECTION SYNC:
// - Selection is not owned here.  Na__VideoStudio__ProjectJson__SetActiveKeyframeId
//   announces every change, wherever it came from, so clicking a marker in the
//   viewport highlights the tile and clicking a tile highlights the marker,
//   with neither module knowing about the other.
//
// INTEGRATION:
// - Initialize once from index.html, after the renderer exists.
// - Na__VideoStudio__DevMenu__Controls drives SetActiveVideo when its panel
//   opens, closes, or changes which path is expanded, and calls Refresh after
//   any edit that moves the keyframes about.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Sep-2026 - Version 1.0.0
// - Initial implementation, replacing the in-panel transport slider.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__SELECTED_EVENT,
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetKeyframeLensMm,
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__GetActiveKeyframeId
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__GetKeyframeTimes,
        Na__VideoStudio__PathSampler__FormatDuration
    } from './Na__VideoStudio__Camera__PathSampler.js';
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
        Na__VideoStudio__Preview__GetState
    } from './Na__VideoStudio__Playback__PreviewController.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Viewport Path Visualizer
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__PathVisualizer__Rebuild } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Thumbnails
    // @delegate: ./Na__VideoStudio__Timeline__Thumbnails.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__Thumbnails__SyncVideo,
        Na__VideoStudio__Thumbnails__Get,
        Na__VideoStudio__Thumbnails__Invalidate
    } from './Na__VideoStudio__Timeline__Thumbnails.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Context Menu
    // @delegate: ./Na__VideoStudio__Timeline__ContextMenu.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__Timeline__ContextMenu__Open,
        Na__VideoStudio__Timeline__ContextMenu__Close
    } from './Na__VideoStudio__Timeline__ContextMenu.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Waypoint Drag Commits
    // @delegate: ./Na__VideoStudio__Viewport__KeyframeDragger.js
    // ------------------------------------------------------------
    import { Na__VsDrag__MOVED_EVENT } from './Na__VideoStudio__Viewport__KeyframeDragger.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Mode Carousel Handover
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__UI__ToggleSceneCarousel,
        Na__PresentationMode__UI__IsCarouselVisible
    } from '../21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element Ids and Body Class
    // ------------------------------------------------------------
    const Na__VsTl__ROOT_ID     = 'naVideoStudioTimeline';                   // <-- Container declared in index.html
    const Na__VsTl__BODY_CLASS  = 'na-video-studio-timeline-active';         // <-- Lets other CSS step out of the way
    const Na__VsTl__VIEWS_BTN_ID = 'naNavToolbarViewsBtn';                   // <-- Disabled while the timeline owns the bottom
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Ruler Tick Intervals in Seconds
    // ------------------------------------------------------------
    // The first interval that puts ticks at least MIN_TICK_GAP_PX apart wins,
    // so a five second path and a five minute one both read comfortably.
    // ------------------------------------------------------------
    const Na__VsTl__TICK_STEPS_S   = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const Na__VsTl__MIN_TICK_GAP_PX = 64;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Behaviour
    // ------------------------------------------------------------
    const Na__VsTl__THUMB_DEBOUNCE_MS = 260;    // <-- Settle time before a thumbnail burst runs
    const Na__VsTl__MIN_DURATION_MS   = 1;      // <-- Never divide by a zero-length timeline
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Lifecycle
    // ------------------------------------------------------------
    let Na__VsTl__IsInitialized = false;   // <-- Guard against a double wire-up
    let Na__VsTl__IsActive      = false;   // <-- True while the timeline owns the bottom of the screen
    let Na__VsTl__VideoId       = null;    // <-- Path currently being edited
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let Na__VsTl__Root       = null;   // <-- Container element
    let Na__VsTl__TitleEl    = null;   // <-- Path name in the header
    let Na__VsTl__TimeEl     = null;   // <-- Playhead / duration readout
    let Na__VsTl__PlayBtn    = null;   // <-- Play and Pause share one button
    let Na__VsTl__LaneEl     = null;   // <-- The 0% to 100% coordinate space everything is placed in
    let Na__VsTl__TilesEl    = null;   // <-- Absolute-positioned keyframe tiles
    let Na__VsTl__RulerEl    = null;   // <-- Tick marks and time labels
    let Na__VsTl__PlayheadEl = null;   // <-- Vertical line across track and ruler
    let Na__VsTl__StatusEl   = null;   // <-- Thumbnail progress note
    // ------------------------------------------------------------


    // MODULE VARIABLES | Derived Layout Cache
    // ------------------------------------------------------------
    // Rebuilt whenever the path changes; read on every playback tick, which is
    // why the tick handler never touches the video record itself.
    // ------------------------------------------------------------
    let Na__VsTl__DurationMs = 0;      // <-- Total length of the built timeline
    let Na__VsTl__TileByKey  = new Map();   // <-- keyframeId -> tile element
    // ------------------------------------------------------------


    // MODULE VARIABLES | Carousel Handover
    // ------------------------------------------------------------
    let Na__VsTl__CarouselWasVisible = false;   // <-- Restored when the timeline stands down
    // ------------------------------------------------------------


    // MODULE VARIABLES | Deferred Work
    // ------------------------------------------------------------
    let Na__VsTl__ThumbTimer  = null;   // <-- Debounce handle for the thumbnail burst
    let Na__VsTl__ResizeFrame = null;   // <-- rAF handle coalescing viewport resizes
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small DOM Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an Element with Class and Text
    // ------------------------------------------------------------
    function Na__VsTl__El(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null) element.textContent = text;
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Transport Button
    // ------------------------------------------------------------
    function Na__VsTl__Button(label, modifier, title) {
        const button = Na__VsTl__El('button', `na-vs-tl__btn${modifier ? ` na-vs-tl__btn--${modifier}` : ''}`, label);
        button.type = 'button';
        if (title) button.title = title;
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Time as m:ss.d for the Tile Captions
    // ------------------------------------------------------------
    // The header readout uses the shared m:ss formatter, which is right for a
    // running clock.  A tile caption is a label on a specific shot, and tenths
    // are what tell two waypoints a second apart from one another.
    // ------------------------------------------------------------
    function Na__VsTl__FormatPrecise(timeMs) {
        const totalTenths = Math.max(0, Math.round((timeMs || 0) / 100));
        const minutes     = Math.floor(totalTenths / 600);
        const seconds     = Math.floor((totalTenths % 600) / 10);
        const tenths      = totalTenths % 10;
        return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Video Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Video the Timeline Is Editing
    // ------------------------------------------------------------
    function Na__VsTl__GetVideo() {
        return Na__VsTl__VideoId
            ? Na__VideoStudio__ProjectJson__GetVideoById(Na__VsTl__VideoId)
            : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shell Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Fixed Parts of the Timeline Once
    // ------------------------------------------------------------
    // The header, track shell and ruler never change; only their contents do.
    // Building them once means a data edit rewrites tiles rather than throwing
    // away the element the user might currently be dragging on.
    // ------------------------------------------------------------
    function Na__VsTl__BuildShell() {
        const root = Na__VsTl__Root;
        root.textContent = '';

        // HEADER | Transport, path name, clock, thumbnail refresh
        const header = Na__VsTl__El('div', 'na-vs-tl__header');

        Na__VsTl__PlayBtn = Na__VsTl__Button('Play', 'primary',
            'Fly the path in the viewport. Spacebar does the same, in Orbit mode.');
        Na__VsTl__PlayBtn.addEventListener('click', Na__VsTl__HandlePlayClick);
        header.appendChild(Na__VsTl__PlayBtn);

        const stopButton = Na__VsTl__Button('Stop', null, 'Stop and return the camera to where it was');
        stopButton.addEventListener('click', () => {
            Na__VideoStudio__Preview__Stop();
            Na__VideoStudio__Timeline__SyncTransport();
        });
        header.appendChild(stopButton);

        Na__VsTl__TitleEl = Na__VsTl__El('span', 'na-vs-tl__title', '');
        header.appendChild(Na__VsTl__TitleEl);

        Na__VsTl__StatusEl = Na__VsTl__El('span', 'na-vs-tl__status', '');
        header.appendChild(Na__VsTl__StatusEl);

        Na__VsTl__TimeEl = Na__VsTl__El('span', 'na-vs-tl__clock', '0:00 / 0:00');
        header.appendChild(Na__VsTl__TimeEl);

        const refreshButton = Na__VsTl__Button('Refresh Stills', null,
            'Re-render every keyframe thumbnail from the current model state');
        refreshButton.addEventListener('click', () => {
            Na__VideoStudio__Thumbnails__Invalidate(null);
            Na__VsTl__ScheduleThumbnails(0);
        });
        header.appendChild(refreshButton);

        root.appendChild(header);

        // TRACK | Scrub surface, keyframe tiles and the playhead
        const track = Na__VsTl__El('div', 'na-vs-tl__track');
        track.setAttribute('role', 'slider');
        track.setAttribute('aria-label', 'Playhead position');
        track.title = 'Click or drag to scrub. Double click a shot to fly the camera to it.';

        // LANE | Inset from the track by half a tile at each end, and the space
        // every position in this module is a percentage of.  Without it the
        // first and last shots, at 0% and 100%, would hang half off the strip.
        // The track stays full width so a scrub that runs into the gutter still
        // registers, clamped to the ends.
        const lane = Na__VsTl__El('div', 'na-vs-tl__lane');

        Na__VsTl__TilesEl = Na__VsTl__El('div', 'na-vs-tl__tiles');
        lane.appendChild(Na__VsTl__TilesEl);

        Na__VsTl__RulerEl = Na__VsTl__El('div', 'na-vs-tl__ruler');
        lane.appendChild(Na__VsTl__RulerEl);

        Na__VsTl__PlayheadEl = Na__VsTl__El('div', 'na-vs-tl__playhead');
        lane.appendChild(Na__VsTl__PlayheadEl);

        track.appendChild(lane);
        Na__VsTl__AttachScrubbing(track);

        Na__VsTl__LaneEl = lane;                                             // <-- The scrub surface itself is never read back
        root.appendChild(track);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scrubbing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Pointer X Position to a Time on the Path
    // ------------------------------------------------------------
    function Na__VsTl__TimeFromPointer(clientX) {
        const bounds = Na__VsTl__LaneEl.getBoundingClientRect();             // <-- 0% and 100% are the lane's edges
        if (bounds.width <= 0) return 0;

        const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
        return fraction * Na__VsTl__DurationMs;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire Click and Drag Scrubbing onto the Track
    // ------------------------------------------------------------
    // Pointer capture rather than a document-level listener, so a drag that
    // leaves the strip keeps scrubbing and releasing anywhere ends it cleanly.
    // A press on a tile is left alone: that is a selection, not a scrub.
    // ------------------------------------------------------------
    function Na__VsTl__AttachScrubbing(track) {
        let isScrubbing = false;

        track.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            if (event.target.closest('.na-vs-tl__tile')) return;             // <-- Tiles handle their own clicks

            isScrubbing = true;
            track.setPointerCapture(event.pointerId);

            if (Na__VideoStudio__Preview__IsPlaying()) {
                Na__VideoStudio__Preview__Pause();                           // <-- Scrubbing takes the playhead over
                Na__VideoStudio__Timeline__SyncTransport();
            }

            Na__VsTl__SeekTo(Na__VsTl__TimeFromPointer(event.clientX));
            event.preventDefault();
        });

        track.addEventListener('pointermove', (event) => {
            if (!isScrubbing) return;
            Na__VsTl__SeekTo(Na__VsTl__TimeFromPointer(event.clientX));
        });

        const endScrub = (event) => {
            if (!isScrubbing) return;
            isScrubbing = false;
            if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        };

        track.addEventListener('pointerup',     endScrub);
        track.addEventListener('pointercancel', endScrub);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Playhead to an Absolute Time
    // ------------------------------------------------------------
    function Na__VsTl__SeekTo(timeMs) {
        const video = Na__VsTl__GetVideo();
        if (!video) return;

        Na__VideoStudio__Preview__Seek(video, timeMs);                       // <-- Dispatches a tick, which moves the playhead
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ruler Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Choose the Coarsest Tick Interval That Still Reads
    // ------------------------------------------------------------
    function Na__VsTl__ResolveTickStepS(durationMs, trackWidthPx) {
        const seconds = Math.max(0.001, durationMs / 1000);

        for (let i = 0; i < Na__VsTl__TICK_STEPS_S.length; i++) {
            const step   = Na__VsTl__TICK_STEPS_S[i];
            const gapPx  = (step / seconds) * trackWidthPx;
            if (gapPx >= Na__VsTl__MIN_TICK_GAP_PX) return step;
        }

        return Na__VsTl__TICK_STEPS_S[Na__VsTl__TICK_STEPS_S.length - 1];     // <-- Very long path; coarsest available
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rebuild the Ruler Ticks and Time Labels
    // ------------------------------------------------------------
    function Na__VsTl__BuildRuler() {
        const ruler = Na__VsTl__RulerEl;
        if (!ruler) return;

        ruler.textContent = '';

        const width = Na__VsTl__LaneEl ? Na__VsTl__LaneEl.clientWidth : 0;
        if (width <= 0 || Na__VsTl__DurationMs <= 0) return;                 // <-- Not laid out yet; the resize hook redraws

        const stepS   = Na__VsTl__ResolveTickStepS(Na__VsTl__DurationMs, width);
        const stepMs  = stepS * 1000;
        const lastMs  = Na__VsTl__DurationMs;

        for (let timeMs = 0; timeMs <= lastMs + 0.5; timeMs += stepMs) {
            const percent = (timeMs / Na__VsTl__DurationMs) * 100;

            const tick = Na__VsTl__El('div', 'na-vs-tl__tick');
            tick.style.left = `${Math.min(100, percent)}%`;

            const label = Na__VsTl__El('span', 'na-vs-tl__tick-label',
                Na__VideoStudio__PathSampler__FormatDuration(timeMs));
            tick.appendChild(label);

            // EDGE LABELS | The first and last would hang off the strip if they
            // stayed centred, so they tuck inward instead.
            if (percent < 2)       tick.classList.add('na-vs-tl__tick--first');
            else if (percent > 98) tick.classList.add('na-vs-tl__tick--last');

            ruler.appendChild(tick);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyframe Tile Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Keyframe Tile
    // ------------------------------------------------------------
    // A single click selects, which is what puts the red highlight on the
    // marker in the viewport so it can be grabbed and moved.  A double click
    // flies there, which is the panel's Go To by another route.  Both are on
    // the same element deliberately: selecting and inspecting are the two
    // things anyone does with a shot, and neither should need a second control.
    // ------------------------------------------------------------
    function Na__VsTl__BuildTile(keyframe, index, timeMs, isSelected) {
        const keyframeId = keyframe.VideoStudio__Keyframe__Id;

        const tile = Na__VsTl__El('button', `na-vs-tl__tile${isSelected ? ' na-vs-tl__tile--selected' : ''}`);
        tile.type  = 'button';
        tile.dataset.vsTlKey = keyframeId;
        tile.style.left      = `${(timeMs / Na__VsTl__DurationMs) * 100}%`;

        const holdMs  = Math.max(0, keyframe.VideoStudio__Keyframe__HoldMs || 0);
        const lensMm  = Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe);
        const label   = keyframe.VideoStudio__Keyframe__Label
                     || keyframe.VideoStudio__Keyframe__CapturedInMode
                     || 'Orbit';

        tile.title = `Shot ${index + 1} - ${label} - ${lensMm}mm at ${Na__VsTl__FormatPrecise(timeMs)}`
                   + (holdMs > 0 ? `, holds ${(holdMs / 1000).toFixed(1)}s` : '')
                   + '\nClick to select, double click to fly the camera here.';

        // FRAME | Rendered still, or a numbered placeholder until one exists
        const frame   = Na__VsTl__El('span', 'na-vs-tl__frame');
        const dataUrl = Na__VideoStudio__Thumbnails__Get(keyframeId);

        if (dataUrl) {
            const image = document.createElement('img');
            image.className = 'na-vs-tl__still';
            image.src       = dataUrl;
            image.alt       = '';
            image.draggable = false;
            frame.appendChild(image);
        } else {
            frame.classList.add('na-vs-tl__frame--pending');
        }

        frame.appendChild(Na__VsTl__El('span', 'na-vs-tl__badge', String(index + 1)));
        if (holdMs > 0) frame.appendChild(Na__VsTl__El('span', 'na-vs-tl__hold', `${(holdMs / 1000).toFixed(1)}s`));

        tile.appendChild(frame);
        tile.appendChild(Na__VsTl__El('span', 'na-vs-tl__caption', Na__VsTl__FormatPrecise(timeMs)));
        tile.appendChild(Na__VsTl__El('span', 'na-vs-tl__stem'));            // <-- Drops to the exact tick on the ruler

        tile.addEventListener('click', (event) => {
            event.stopPropagation();                                         // <-- A tile press is never a scrub
            if (event.detail > 1) return;                                    // <-- Second press of a double click; ignore
            Na__VsTl__SelectKeyframe(keyframeId);
        });

        tile.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            Na__VsTl__SelectKeyframe(keyframeId);
            Na__VideoStudio__Preview__JumpToKeyframe(keyframe);              // <-- Exactly what Go To does
        });

        // RIGHT CLICK | Selecting first is deliberate: the menu's Height and
        // Tilt fields preview live only on the waypoint the camera is sitting
        // at, and the marker you are about to edit should be the lit one.
        tile.addEventListener('contextmenu', (event) => {
            event.preventDefault();                                          // <-- Ours, not the browser's
            event.stopPropagation();

            Na__VsTl__SelectKeyframe(keyframeId);
            Na__VideoStudio__Timeline__ContextMenu__Open({
                videoId    : Na__VsTl__VideoId,
                keyframeId : keyframeId,
                clientX    : event.clientX,
                clientY    : event.clientY
            });
        });

        return tile;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Select a Waypoint and Light Up Its Viewport Marker
    // ------------------------------------------------------------
    function Na__VsTl__SelectKeyframe(keyframeId) {
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId(keyframeId);       // <-- Announces itself; the tile highlight follows
        Na__VideoStudio__PathVisualizer__Rebuild();                          // <-- Marker turns red in the viewport
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rebuild Every Tile from the Active Path
    // ------------------------------------------------------------
    function Na__VsTl__BuildTiles() {
        const tiles = Na__VsTl__TilesEl;
        if (!tiles) return;

        Na__VideoStudio__Timeline__ContextMenu__Close();                     // <-- Its tile is about to be replaced
        tiles.textContent = '';
        Na__VsTl__TileByKey = new Map();

        const video = Na__VsTl__GetVideo();
        if (!video) return;

        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        if (!timeline) {
            const total = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video).length;
            tiles.appendChild(Na__VsTl__El('div', 'na-vs-tl__empty', total === 0
                ? 'No keyframes yet. Fly to your first shot, then press K to capture it.'
                : 'This path has no usable keyframes.'));
            return;
        }

        const times      = Na__VideoStudio__PathSampler__GetKeyframeTimes(timeline);
        const selectedId = Na__VideoStudio__ProjectJson__GetActiveKeyframeId();

        timeline.keyframes.forEach((keyframe, index) => {
            const keyframeId = keyframe.VideoStudio__Keyframe__Id;
            const isSelected = keyframeId === selectedId;
            const tile       = Na__VsTl__BuildTile(keyframe, index, times[index] || 0, isSelected);

            tiles.appendChild(tile);
            Na__VsTl__TileByKey.set(keyframeId, tile);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Selected Highlight Without a Full Rebuild
    // ------------------------------------------------------------
    // Selection changes constantly while dragging waypoints about, and
    // rebuilding the strip on every one of them would flash the thumbnails.
    // ------------------------------------------------------------
    function Na__VsTl__ApplySelection(keyframeId) {
        Na__VsTl__TileByKey.forEach((tile, id) => {
            tile.classList.toggle('na-vs-tl__tile--selected', id === keyframeId);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Playhead and Transport
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Position the Playhead and Update the Clock
    // ------------------------------------------------------------
    function Na__VsTl__ApplyPlayhead(currentMs, durationMs) {
        const total = Math.max(Na__VsTl__MIN_DURATION_MS, durationMs || Na__VsTl__DurationMs);

        if (Na__VsTl__PlayheadEl) {
            const percent = Math.max(0, Math.min(100, (currentMs / total) * 100));
            Na__VsTl__PlayheadEl.style.left = `${percent}%`;
        }

        if (Na__VsTl__TimeEl) {
            Na__VsTl__TimeEl.textContent = `${Na__VideoStudio__PathSampler__FormatDuration(currentMs)}`
                                         + ` / ${Na__VideoStudio__PathSampler__FormatDuration(total)}`;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Play or Pause from the Transport Button
    // ------------------------------------------------------------
    function Na__VsTl__HandlePlayClick() {
        const video = Na__VsTl__GetVideo();
        if (!video) return;

        if (Na__VideoStudio__Preview__IsPlaying()) {
            Na__VideoStudio__Preview__Pause();
        } else {
            const error = Na__VideoStudio__Preview__Play(video);
            if (error) {
                Na__VsTl__ShowStatus(error, true);
                return;
            }
        }

        Na__VideoStudio__Timeline__SyncTransport();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show a Short Note in the Header
    // ------------------------------------------------------------
    function Na__VsTl__ShowStatus(text, isWarning) {
        if (!Na__VsTl__StatusEl) return;
        Na__VsTl__StatusEl.textContent = text || '';
        Na__VsTl__StatusEl.classList.toggle('na-vs-tl__status--warn', isWarning === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Thumbnail Scheduling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Run a Thumbnail Burst After Things Settle
    // ------------------------------------------------------------
    // Debounced because a waypoint drag fires a commit on every drop and a
    // travel-time edit fires on every keystroke.  Skipped outright during
    // playback: the burst borrows the camera, which playback owns.
    // ------------------------------------------------------------
    function Na__VsTl__ScheduleThumbnails(delayMs) {
        if (Na__VsTl__ThumbTimer) clearTimeout(Na__VsTl__ThumbTimer);

        Na__VsTl__ThumbTimer = setTimeout(() => {
            Na__VsTl__ThumbTimer = null;
            Na__VsTl__RunThumbnails();
        }, Number.isFinite(delayMs) ? delayMs : Na__VsTl__THUMB_DEBOUNCE_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Any Missing Thumbnails and Redraw the Tiles
    // ------------------------------------------------------------
    function Na__VsTl__RunThumbnails() {
        if (!Na__VsTl__IsActive) return;

        const video = Na__VsTl__GetVideo();
        if (!video) return;

        if (Na__VideoStudio__Preview__IsPlaying()) {
            Na__VsTl__ScheduleThumbnails(600);                               // <-- Wait for the camera to come free
            return;
        }

        const result = Na__VideoStudio__Thumbnails__SyncVideo(video);

        if (!result.ready) {
            // The model is still loading, or an export has the renderer. Both
            // end on their own, so keep asking rather than giving up.
            Na__VsTl__ShowStatus('Stills are waiting for the renderer', false);
            Na__VsTl__ScheduleThumbnails(900);
            return;
        }

        if (result.rendered > 0) Na__VsTl__BuildTiles();                     // <-- Swap placeholders for the new stills

        if (result.pending > 0) {
            Na__VsTl__ShowStatus(`Rendering stills, ${result.pending} to go`, false);
            Na__VsTl__ScheduleThumbnails(60);                                // <-- Next burst; the tab stays responsive between
        } else {
            Na__VsTl__ShowStatus('', false);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Carousel Handover
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Take the Bottom of the Screen from the Scene Carousel
    // ------------------------------------------------------------
    // Two strips of thumbnails at the bottom, both called scenes, is the
    // confusion this whole feature was asked to remove.  The carousel's own
    // visibility is remembered rather than assumed, so a project that shows it
    // by default still shows it again the moment the panel closes.
    // ------------------------------------------------------------
    function Na__VsTl__TakeOverCarousel(active) {
        const viewsButton = document.getElementById(Na__VsTl__VIEWS_BTN_ID);

        if (active) {
            Na__VsTl__CarouselWasVisible = Na__PresentationMode__UI__IsCarouselVisible();
            Na__PresentationMode__UI__ToggleSceneCarousel(false);

            if (viewsButton) {
                viewsButton.disabled = true;                                 // <-- Nothing to toggle while the timeline is up
                viewsButton.title    = 'Scene views are hidden while the Video Studio timeline is open';
            }
            return;
        }

        if (viewsButton) {
            viewsButton.disabled = false;
            viewsButton.title    = 'Toggle saved scene carousel';
        }

        Na__PresentationMode__UI__ToggleSceneCarousel(Na__VsTl__CarouselWasVisible === true);
        Na__VsTl__CarouselWasVisible = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Timeline for a Path, or Stand It Down
    // ------------------------------------------------------------
    // Pass a video id to open the timeline on that path, or null to close it.
    // Safe to call with the id already showing; it refreshes instead.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__SetActiveVideo(videoId) {
        if (!Na__VsTl__IsInitialized || !Na__VsTl__Root) return;

        const nextId = videoId || null;

        // CLOSE | No path selected
        if (!nextId) {
            if (!Na__VsTl__IsActive) return;

            Na__VsTl__IsActive = false;
            Na__VsTl__VideoId  = null;

            Na__VideoStudio__Timeline__ContextMenu__Close();                 // <-- Never leave one floating over the viewport
            if (Na__VsTl__ThumbTimer) { clearTimeout(Na__VsTl__ThumbTimer); Na__VsTl__ThumbTimer = null; }

            Na__VsTl__Root.classList.remove('na-vs-tl--visible');
            document.body.classList.remove(Na__VsTl__BODY_CLASS);
            Na__VsTl__TakeOverCarousel(false);
            return;
        }

        const isReopening = !Na__VsTl__IsActive;

        Na__VsTl__IsActive = true;
        Na__VsTl__VideoId  = nextId;

        if (isReopening) {
            Na__VsTl__Root.classList.add('na-vs-tl--visible');
            document.body.classList.add(Na__VsTl__BODY_CLASS);
            Na__VsTl__TakeOverCarousel(true);
        }

        Na__VideoStudio__Timeline__Refresh();
        Na__VsTl__ScheduleThumbnails(isReopening ? 120 : Na__VsTl__THUMB_DEBOUNCE_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Strip After the Path's Data Changed
    // ------------------------------------------------------------
    // Cheap enough to call on any edit: it rebuilds elements but reuses every
    // cached thumbnail, so nothing re-renders unless a shot actually moved.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__Refresh() {
        if (!Na__VsTl__IsActive) return;

        const video = Na__VsTl__GetVideo();
        if (!video) {
            Na__VideoStudio__Timeline__SetActiveVideo(null);                 // <-- The path was deleted underneath us
            return;
        }

        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        Na__VsTl__DurationMs = Math.max(
            Na__VsTl__MIN_DURATION_MS,
            timeline ? timeline.totalDurationMs : 0
        );

        if (Na__VsTl__TitleEl) Na__VsTl__TitleEl.textContent = video.VideoStudio__Video__Name || 'Video path';

        Na__VsTl__BuildTiles();
        Na__VsTl__BuildRuler();

        const state = Na__VideoStudio__Preview__GetState();
        const onThisPath = state.isLoaded && state.videoId === Na__VsTl__VideoId;
        Na__VsTl__ApplyPlayhead(onThisPath ? state.currentMs : 0, Na__VsTl__DurationMs);

        Na__VideoStudio__Timeline__SyncTransport();
        Na__VsTl__ScheduleThumbnails(Na__VsTl__THUMB_DEBOUNCE_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Match the Play Button to the Real Transport State
    // ------------------------------------------------------------
    // Called by the Dev menu after the spacebar hotkey, so the strip and the
    // hotkey can never disagree about whether the path is running.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__SyncTransport() {
        if (!Na__VsTl__PlayBtn) return;
        Na__VsTl__PlayBtn.textContent = Na__VideoStudio__Preview__IsPlaying() ? 'Pause' : 'Play';
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Timeline Owns the Bottom of the Screen
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__IsActive() {
        return Na__VsTl__IsActive;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Follow the Playhead During Playback and Scrubbing
    // ------------------------------------------------------------
    function Na__VsTl__HandlePreviewTick(event) {
        if (!Na__VsTl__IsActive) return;

        const detail = event.detail;
        if (!detail || detail.videoId !== Na__VsTl__VideoId) return;         // <-- Another path is playing; not our playhead

        Na__VsTl__ApplyPlayhead(detail.currentMs, detail.durationMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reset the Transport When Playback Finishes
    // ------------------------------------------------------------
    // The playhead is deliberately left alone.  Both routes to this event send
    // a final tick first, and they disagree about where the head belongs: Stop
    // rewinds to zero, running off the end parks on the last frame.  Honouring
    // the tick gets both right; forcing a position here would get one wrong.
    // ------------------------------------------------------------
    function Na__VsTl__HandlePreviewEnded() {
        if (!Na__VsTl__IsActive) return;
        Na__VideoStudio__Timeline__SyncTransport();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Redraw the Ruler After the Strip Changes Width
    // ------------------------------------------------------------
    // Tick spacing is chosen from the pixel width, so a resized window needs a
    // fresh choice.  Tiles are positioned as percentages and look after
    // themselves.
    // ------------------------------------------------------------
    function Na__VsTl__HandleResize() {
        if (!Na__VsTl__IsActive) return;
        if (Na__VsTl__ResizeFrame) return;

        Na__VsTl__ResizeFrame = requestAnimationFrame(() => {
            Na__VsTl__ResizeFrame = null;
            Na__VsTl__BuildRuler();
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Video Studio Timeline
    // ------------------------------------------------------------
    // Called once from index.html.  The strip stays hidden until the Dev menu
    // opens a path into it.
    // ------------------------------------------------------------
    function Na__VideoStudio__Timeline__Initialize() {
        if (Na__VsTl__IsInitialized) return;

        const root = document.getElementById(Na__VsTl__ROOT_ID);
        if (!root) return;                                                   // <-- Guard: DOM not ready

        Na__VsTl__Root = root;
        Na__VsTl__BuildShell();
        Na__VsTl__IsInitialized = true;

        // PLAYBACK | Playhead and transport follow the preview controller
        window.addEventListener(Na__VsPreview__TICK_EVENT,  Na__VsTl__HandlePreviewTick);
        window.addEventListener(Na__VsPreview__ENDED_EVENT, Na__VsTl__HandlePreviewEnded);

        // SELECTION | Announced by the data layer, so a click on a viewport
        // marker highlights the tile without either module knowing the other.
        window.addEventListener(Na__VideoStudio__SELECTED_EVENT, (event) => {
            if (!Na__VsTl__IsActive) return;
            Na__VsTl__ApplySelection((event.detail && event.detail.keyframeId) || null);
        });

        // WAYPOINT DRAGS | A drag rewrites a camera position, so both the tile
        // positions and that waypoint's still are now wrong.  Listened for
        // directly because the Dev menu handles a drag commit without going
        // through its own data-changed hook, so nothing else would tell us.
        //
        // Insertions are deliberately NOT listened for here: the Dev menu has
        // to rebuild its keyframe rows for those anyway, and its hook already
        // refreshes this strip on the way past.
        window.addEventListener(Na__VsDrag__MOVED_EVENT, () => {
            if (!Na__VsTl__IsActive) return;
            Na__VideoStudio__Timeline__Refresh();
        });

        window.addEventListener('resize', Na__VsTl__HandleResize);

        console.log('[ValeVision3D] Video Studio timeline initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Video Studio Timeline API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Timeline__Initialize,
        Na__VideoStudio__Timeline__SetActiveVideo,
        Na__VideoStudio__Timeline__Refresh,
        Na__VideoStudio__Timeline__SyncTransport,
        Na__VideoStudio__Timeline__IsActive
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
