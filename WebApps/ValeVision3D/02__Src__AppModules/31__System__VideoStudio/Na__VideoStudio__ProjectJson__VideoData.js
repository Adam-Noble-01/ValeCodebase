// =============================================================================
// VALEVISION3D - VIDEO STUDIO - PROJECT JSON VIDEO DATA
// =============================================================================
//
// FILE       : Na__VideoStudio__ProjectJson__VideoData.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Project JSON Video Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, validate, normalise and mutate the per-project
//              VideoStudio__Config block that stores camera walkthrough videos
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Pure data layer for the Video Studio system.  Owns the shape of the
//   VideoStudio__Config block in project.json and every read/write against it.
// - Holds module-level state for the currently active project's video config
//   so the Dev menu, path visualiser, preview player and exporter all read
//   from one source of truth.
// - Provides CRUD helpers for videos and keyframes, unique id generation,
//   ordering, and defaulted factory builders for new records.
// - Does not touch the DOM, the Three.js scene, or the network.
//
// JSON SHAPE:
//   VideoStudio__Config
//     VideoStudio__Config__Enabled       {boolean}
//     VideoStudio__Config__Description   {string}
//     VideoStudio__Config__Videos        {array}
//       VideoStudio__Video__Id           {string}   'Video_001'
//       VideoStudio__Video__Name         {string}
//       VideoStudio__Video__Order        {number}
//       VideoStudio__Video__Export       {object}   width/height/fps/bitrate
//       VideoStudio__Video__Playback     {object}   speed/defaults/easing/loop
//       VideoStudio__Video__Keyframes    {array}
//         VideoStudio__Keyframe__Id             {string}  'Key_001'
//         VideoStudio__Keyframe__Order          {number}
//         VideoStudio__Keyframe__CapturedInMode {string}  'Orbit'|'Walk'|'Fly'
//         VideoStudio__Keyframe__LensMm         {number}
//         VideoStudio__Keyframe__SegmentMs      {number}  travel time to next
//         VideoStudio__Keyframe__HoldMs         {number}  dwell time at this key
//         VideoStudio__Keyframe__CameraPosition {object}  Camera__DefaultPos etc
//
// UNITS:
// - All stored positions are integer millimetres, matching every other camera
//   block in project.json.  Convert with Na__Math__ConvertMmToUnits in code.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js calls SetActiveConfig after projectData
//   is fetched (via the Dev menu controller on localhost).
// - Consumed by Na__VideoStudio__DevMenu__Controls.js,
//   Na__VideoStudio__Camera__PathSampler.js and
//   Na__VideoStudio__Viewport__PathVisualizer.js.
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

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    // Stored positions are integer millimetres. The only conversion this layer
    // performs is on the way in from a dragged world position; everything else
    // stays in the JSON's own units.
    // ------------------------------------------------------------
    import { Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | JSON Section and Record Key Names
    // ------------------------------------------------------------
    const Na__VideoStudio__SECTION_KEY     = 'VideoStudio__Config';                // <-- Root block key in project.json
    const Na__VideoStudio__ENABLED_KEY     = 'VideoStudio__Config__Enabled';       // <-- Enabled flag key
    const Na__VideoStudio__DESCRIPTION_KEY = 'VideoStudio__Config__Description';   // <-- Human-readable block note
    const Na__VideoStudio__VIDEOS_KEY      = 'VideoStudio__Config__Videos';        // <-- Videos array key
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Block Description Text
    // ------------------------------------------------------------
    const Na__VideoStudio__BLOCK_DESCRIPTION =
        'Per-project camera walkthrough videos. Positions are integer millimetres; convert to 3D units in code.';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Defaults for a Newly Created Video
    // ------------------------------------------------------------
    // EXPORT SIZING MODEL:
    // Height is the standard (720p, 1080p, 1440p, 2160p, 4320p) and the aspect
    // ratio picks the width. Height and aspect are the source of truth; width
    // is derived from them and rewritten whenever either changes, so the two can
    // never drift apart in the saved file.
    //
    // Because a Three.js camera's fov is the VERTICAL field of view, holding the
    // height standard constant means every aspect renders the same vertical
    // extent and simply shows more or less to the sides. Nothing is ever
    // stretched to fit; a narrower aspect crops the frame.
    // ------------------------------------------------------------
    const Na__VideoStudio__DEFAULT_HEIGHT       = 2160;   // <-- 4K height standard
    const Na__VideoStudio__DEFAULT_ASPECT       = '3:2';  // <-- Vale house style
    const Na__VideoStudio__DEFAULT_FPS          = 30;     // <-- Default frame rate
    const Na__VideoStudio__DEFAULT_BITRATE_MBPS = 34;     // <-- 3240x2160 at 30fps on the High quality stop
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Playback Defaults for a Newly Created Video
    // ------------------------------------------------------------
    const Na__VideoStudio__DEFAULT_SPEED       = 1.0;              // <-- Global speed multiplier
    const Na__VideoStudio__DEFAULT_SEGMENT_MS  = 5000;             // <-- Travel time between keyframes
    const Na__VideoStudio__DEFAULT_HOLD_MS     = 0;                // <-- Dwell time at a keyframe
    const Na__VideoStudio__DEFAULT_EASING      = 'easeInOutCubic'; // <-- Applied per leg, not per segment
    const Na__VideoStudio__DEFAULT_CLOSED_LOOP = false;            // <-- Open path by default
    const Na__VideoStudio__DEFAULT_ANIMATIONS  = true;             // <-- Doors open as the camera approaches

    // DOOR TIMING | Expressed as the seconds a standard single-leaf door takes
    // to swing, because that is a thing you can picture, unlike a multiplier
    // against an authored duration you never see. A bifold takes this times the
    // bifold multiplier. Doors are authored at 0.6s to suit clicking one open
    // by hand, which is too quick when a camera walks through the opening.
    const Na__VideoStudio__DEFAULT_DOOR_SECONDS = 1.2;             // <-- Twice the interactive swing time
    const Na__VideoStudio__MIN_DOOR_SECONDS     = 0.3;             // <-- Faster than the interactive default
    const Na__VideoStudio__MAX_DOOR_SECONDS     = 6.0;             // <-- Very slow, for long approach shots

    // DOOR DETECTION | How close the camera gets before a door starts opening.
    // Null means defer to the Walk and Fly DoorProximityThresholdMm from the
    // app config, so a project that never touches this follows the app.
    const Na__VideoStudio__MIN_DOOR_DISTANCE_M  = 1.0;             // <-- Practically on the threshold
    const Na__VideoStudio__MAX_DOOR_DISTANCE_M  = 25.0;            // <-- Opens well before the camera arrives
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Aspect Ratios and Height Standards
    // ------------------------------------------------------------
    const Na__VideoStudio__ASPECT_RATIOS = [
        { value: '3:2',  width: 3,  height: 2, label: '3:2 (default)' },
        { value: '4:3',  width: 4,  height: 3, label: '4:3'           },
        { value: '16:9', width: 16, height: 9, label: '16:9'          },
        { value: '1:1',  width: 1,  height: 1, label: '1:1 (square)'  }
    ];

    const Na__VideoStudio__HEIGHT_STANDARDS = [
        {  height:  720, label: '720p'          },
        {  height: 1080, label: '1080p'         },
        {  height: 1440, label: '1440p'         },
        {  height: 2160, label: '2160p (4K)'    },
        {  height: 4320, label: '4320p (8K)'    }
    ];
    // ------------------------------------------------------------
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Guard Rails
    // ------------------------------------------------------------
    const Na__VideoStudio__MIN_SEGMENT_MS = 100;    // <-- Shortest permitted travel time
    const Na__VideoStudio__MAX_SEGMENT_MS = 60000;  // <-- Longest permitted travel time
    const Na__VideoStudio__MIN_HOLD_MS    = 0;      // <-- No hold
    const Na__VideoStudio__MAX_HOLD_MS    = 30000;  // <-- Longest permitted dwell
    const Na__VideoStudio__MIN_SPEED      = 0.25;   // <-- Slowest speed multiplier
    const Na__VideoStudio__MAX_SPEED      = 4.0;    // <-- Fastest speed multiplier
    const Na__VideoStudio__MIN_LENS_MM    = 14;     // <-- Ultra-wide, for tight interiors
    const Na__VideoStudio__MAX_LENS_MM    = 200;    // <-- Long tele, for compressed exterior shots
    const Na__VideoStudio__DEFAULT_LENS_MM = 45;    // <-- Fallback when a keyframe carries no lens
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Project Video Config and Selection
    // ------------------------------------------------------------
    let Na__VideoStudio__ActiveConfig      = null;   // <-- Full VideoStudio__Config block for current project
    let Na__VideoStudio__ActiveProjectCode = null;   // <-- Project code for the loaded config
    let Na__VideoStudio__ActiveVideoId     = null;   // <-- Video currently selected in the Dev menu
    let Na__VideoStudio__ActiveKeyframeId  = null;   // <-- Keyframe currently highlighted in the viewport
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Numeric Clamping Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clamp a Number Into a Range with a Fallback
    // ------------------------------------------------------------
    function Na__VideoStudio__Clamp(value, min, max, fallback) {
        if (!Number.isFinite(value)) return fallback;                        // <-- Non-numeric input falls back
        return Math.min(max, Math.max(min, value));                          // <-- Clamp into the permitted range
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Segment Travel Time to the Permitted Range
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampSegmentMs(value) {
        return Math.round(Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_SEGMENT_MS,
            Na__VideoStudio__MAX_SEGMENT_MS,
            Na__VideoStudio__DEFAULT_SEGMENT_MS
        ));
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Keyframe Hold Time to the Permitted Range
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampHoldMs(value) {
        return Math.round(Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_HOLD_MS,
            Na__VideoStudio__MAX_HOLD_MS,
            Na__VideoStudio__DEFAULT_HOLD_MS
        ));
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Global Speed Multiplier to the Permitted Range
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampSpeed(value) {
        return Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_SPEED,
            Na__VideoStudio__MAX_SPEED,
            Na__VideoStudio__DEFAULT_SPEED
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Door Swing Time in Seconds
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampDoorSeconds(value) {
        return Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_DOOR_SECONDS,
            Na__VideoStudio__MAX_DOOR_SECONDS,
            Na__VideoStudio__DEFAULT_DOOR_SECONDS
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Door Swing Seconds, Migrating the Old Speed Multiplier
    // ------------------------------------------------------------
    // The setting shipped first as VideoStudio__Playback__DoorSpeedScale, a
    // multiplier against the authored 0.6s swing. Seconds replaced it because a
    // duration is something you can picture. A project written under the old
    // key is converted on read, so nothing loses the pace it was given.
    // ------------------------------------------------------------
    function Na__VideoStudio__ResolveDoorSeconds(raw) {
        if (Number.isFinite(raw.VideoStudio__Playback__DoorOpenSeconds)) {
            return Na__VideoStudio__ClampDoorSeconds(raw.VideoStudio__Playback__DoorOpenSeconds);
        }

        const legacyScale = raw.VideoStudio__Playback__DoorSpeedScale;
        if (Number.isFinite(legacyScale) && legacyScale > 0) {
            // The old multiplier assumed the shipped 0.6s base; a project saved
            // under it was authored against that, so convert with that number
            // rather than whatever the config says today.
            return Na__VideoStudio__ClampDoorSeconds(0.6 / legacyScale);
        }

        return Na__VideoStudio__DEFAULT_DOOR_SECONDS;
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Door Detection Distance in Metres
    // ------------------------------------------------------------
    // Returns null unchanged, which means defer to the app config threshold.
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampDoorDistanceM(value) {
        if (!Number.isFinite(value)) return null;
        return Math.round(Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_DOOR_DISTANCE_M,
            Na__VideoStudio__MAX_DOOR_DISTANCE_M,
            Na__VideoStudio__MIN_DOOR_DISTANCE_M
        ) * 10) / 10;                                                        // <-- One decimal place
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp a Lens Focal Length to the Permitted Range
    // ------------------------------------------------------------
    function Na__VideoStudio__ClampLensMm(value) {
        return Math.round(Na__VideoStudio__Clamp(
            value,
            Na__VideoStudio__MIN_LENS_MM,
            Na__VideoStudio__MAX_LENS_MM,
            Na__VideoStudio__DEFAULT_LENS_MM
        ));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Validate a Single Keyframe Has Minimum Required Fields
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__IsValidKeyframe(keyframe) {
        if (!keyframe || typeof keyframe !== 'object') return false;

        const id  = keyframe.VideoStudio__Keyframe__Id;
        const cam = keyframe.VideoStudio__Keyframe__CameraPosition;

        if (!id || typeof id !== 'string')   return false;                   // <-- Id must exist
        if (!cam || typeof cam !== 'object') return false;                   // <-- Camera block must exist

        const pos = cam.Camera__DefaultPos;
        if (!pos) return false;

        return Number.isFinite(pos.Camera__DefaultPos__PosX)
            && Number.isFinite(pos.Camera__DefaultPos__PosY)
            && Number.isFinite(pos.Camera__DefaultPos__PosZ);                // <-- Position values must be numeric
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate a Single Video Record
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__IsValidVideo(video) {
        if (!video || typeof video !== 'object') return false;

        const id   = video.VideoStudio__Video__Id;
        const name = video.VideoStudio__Video__Name;

        if (!id || typeof id !== 'string')     return false;                 // <-- Id must exist
        if (!name || typeof name !== 'string') return false;                 // <-- Name must exist

        return Array.isArray(video.VideoStudio__Video__Keyframes);           // <-- Keyframes must at least be an array
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Filter a Raw Videos Array to Valid Records Only
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__FilterValidVideos(videos) {
        if (!Array.isArray(videos)) return [];
        return videos.filter(Na__VideoStudio__ProjectJson__IsValidVideo);     // <-- Discard malformed entries
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Valid Keyframes for a Video, Sorted by Order
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetSortedKeyframes(video) {
        if (!video || !Array.isArray(video.VideoStudio__Video__Keyframes)) return [];

        const valid = video.VideoStudio__Video__Keyframes
            .filter(Na__VideoStudio__ProjectJson__IsValidKeyframe);

        return [...valid].sort((a, b) => {
            const orderA = Number.isFinite(a.VideoStudio__Keyframe__Order) ? a.VideoStudio__Keyframe__Order : 999;
            const orderB = Number.isFinite(b.VideoStudio__Keyframe__Order) ? b.VideoStudio__Keyframe__Order : 999;
            return orderA - orderB;                                          // <-- Ascending order
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Valid Videos from a Config Block, Sorted by Order
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetSortedVideos(config) {
        const source = config || Na__VideoStudio__ActiveConfig;
        if (!source) return [];

        const valid = Na__VideoStudio__ProjectJson__FilterValidVideos(source[Na__VideoStudio__VIDEOS_KEY]);

        return [...valid].sort((a, b) => {
            const orderA = Number.isFinite(a.VideoStudio__Video__Order) ? a.VideoStudio__Video__Order : 999;
            const orderB = Number.isFinite(b.VideoStudio__Video__Order) ? b.VideoStudio__Video__Order : 999;
            return orderA - orderB;                                          // <-- Ascending order
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Factory Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Build an Empty VideoStudio__Config Block
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__BuildEmptyConfig() {
        return {
            [Na__VideoStudio__ENABLED_KEY]     : true,
            [Na__VideoStudio__DESCRIPTION_KEY] : Na__VideoStudio__BLOCK_DESCRIPTION,
            [Na__VideoStudio__VIDEOS_KEY]      : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve an Aspect Ratio String to Its Numeric Value
    // ------------------------------------------------------------
    // Falls back to the default ratio rather than throwing, so an unrecognised
    // string in a hand-edited project file still renders something sensible.
    // ------------------------------------------------------------
    function Na__VideoStudio__ResolveAspectValue(aspectString) {
        const match = Na__VideoStudio__ASPECT_RATIOS.find(r => r.value === aspectString);
        const ratio = match || Na__VideoStudio__ASPECT_RATIOS.find(r => r.value === Na__VideoStudio__DEFAULT_ASPECT);
        return ratio.width / ratio.height;
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive an Export Width from a Height and an Aspect Ratio
    // ------------------------------------------------------------
    // Forced even because H.264 encodes 4:2:0 chroma, which cannot represent an
    // odd dimension on either axis.
    // ------------------------------------------------------------
    function Na__VideoStudio__DeriveExportWidth(height, aspectString) {
        const width = Math.round(height * Na__VideoStudio__ResolveAspectValue(aspectString));
        return width - (width % 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | Infer an Aspect Ratio Name from Stored Pixel Dimensions
    // ------------------------------------------------------------
    // Used only to read videos written before the aspect key existed.  Returns
    // null when the stored shape does not match any offered ratio, so the
    // caller can fall back rather than guess wrongly.
    // ------------------------------------------------------------
    function Na__VideoStudio__InferAspectFromSize(width, height) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) return null;

        const stored = width / height;
        const match  = Na__VideoStudio__ASPECT_RATIOS.find(
            r => Math.abs((r.width / r.height) - stored) < 0.01                  // <-- Tolerant of even-pixel rounding
        );

        return match ? match.value : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Default Export Options Block
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__BuildDefaultExport() {
        return {
            VideoStudio__Export__AspectRatio : Na__VideoStudio__DEFAULT_ASPECT,
            VideoStudio__Export__Height      : Na__VideoStudio__DEFAULT_HEIGHT,
            VideoStudio__Export__Width       : Na__VideoStudio__DeriveExportWidth(
                                                   Na__VideoStudio__DEFAULT_HEIGHT,
                                                   Na__VideoStudio__DEFAULT_ASPECT
                                               ),
            VideoStudio__Export__Fps         : Na__VideoStudio__DEFAULT_FPS,
            VideoStudio__Export__BitrateMbps : Na__VideoStudio__DEFAULT_BITRATE_MBPS
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Default Playback Options Block
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__BuildDefaultPlayback() {
        return {
            VideoStudio__Playback__SpeedMultiplier   : Na__VideoStudio__DEFAULT_SPEED,
            VideoStudio__Playback__DefaultSegmentMs  : Na__VideoStudio__DEFAULT_SEGMENT_MS,
            VideoStudio__Playback__DefaultHoldMs     : Na__VideoStudio__DEFAULT_HOLD_MS,
            VideoStudio__Playback__Easing            : Na__VideoStudio__DEFAULT_EASING,
            VideoStudio__Playback__ClosedLoop        : Na__VideoStudio__DEFAULT_CLOSED_LOOP,
            VideoStudio__Playback__AnimationsEnabled : Na__VideoStudio__DEFAULT_ANIMATIONS,
            VideoStudio__Playback__DoorOpenSeconds   : Na__VideoStudio__DEFAULT_DOOR_SECONDS,
            VideoStudio__Playback__DoorDistanceM     : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a New Empty Video Record
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__BuildNewVideo(videoId, videoName, order) {
        return {
            VideoStudio__Video__Id        : videoId,
            VideoStudio__Video__Name      : videoName,
            VideoStudio__Video__Order     : order,
            VideoStudio__Video__Export    : Na__VideoStudio__ProjectJson__BuildDefaultExport(),
            VideoStudio__Video__Playback  : Na__VideoStudio__ProjectJson__BuildDefaultPlayback(),
            VideoStudio__Video__Keyframes : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a New Keyframe Record from a Captured Camera Block
    // ------------------------------------------------------------
    // cameraPosition is the Camera__DefaultPos / Rotation / Misc block produced
    // by Na__VideoStudio__Camera__CaptureCurrentCameraState.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__BuildNewKeyframe(options) {
        const {
            keyframeId,
            order,
            cameraPosition,
            lensMm         = 45,
            capturedInMode = 'Orbit',
            segmentMs      = Na__VideoStudio__DEFAULT_SEGMENT_MS,
            holdMs         = Na__VideoStudio__DEFAULT_HOLD_MS
        } = options || {};

        return {
            VideoStudio__Keyframe__Id             : keyframeId,
            VideoStudio__Keyframe__Order          : order,
            VideoStudio__Keyframe__CapturedInMode : capturedInMode,
            VideoStudio__Keyframe__LensMm         : Math.round(lensMm),
            VideoStudio__Keyframe__SegmentMs      : Na__VideoStudio__ClampSegmentMs(segmentMs),
            VideoStudio__Keyframe__HoldMs         : Na__VideoStudio__ClampHoldMs(holdMs),
            VideoStudio__Keyframe__CameraPosition : cameraPosition
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Unique Id Generation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Generate the Next Free Sequential Id
    // ------------------------------------------------------------
    function Na__VideoStudio__NextSequentialId(usedIds, prefix) {
        const taken = new Set(usedIds);
        let n = 1;
        let candidate = `${prefix}_${String(n).padStart(3, '0')}`;

        while (taken.has(candidate)) {                                       // <-- Avoid collisions after deletes
            n++;
            candidate = `${prefix}_${String(n).padStart(3, '0')}`;
        }
        return candidate;
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate the Next Free Video Id
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetNextVideoId(videos) {
        const ids = (videos || []).map(v => v.VideoStudio__Video__Id);
        return Na__VideoStudio__NextSequentialId(ids, 'Video');              // <-- Video_001, Video_002 ...
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate the Next Free Keyframe Id Within a Video
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetNextKeyframeId(video) {
        const keys = (video && video.VideoStudio__Video__Keyframes) || [];
        const ids  = keys.map(k => k.VideoStudio__Keyframe__Id);
        return Na__VideoStudio__NextSequentialId(ids, 'Key');                // <-- Key_001, Key_002 ...
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Accessors
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Raw VideoStudio Block from projectData
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetConfigBlock(projectData) {
        if (!projectData || typeof projectData !== 'object') return null;
        return projectData[Na__VideoStudio__SECTION_KEY] || null;            // <-- Return the block or null if absent
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Whether projectData Contains Valid Videos
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__HasValidVideos(projectData) {
        const config = Na__VideoStudio__ProjectJson__GetConfigBlock(projectData);
        if (!config) return false;                                           // <-- No section at all
        if (config[Na__VideoStudio__ENABLED_KEY] !== true) return false;     // <-- Explicitly disabled

        return Na__VideoStudio__ProjectJson__FilterValidVideos(config[Na__VideoStudio__VIDEOS_KEY]).length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Video by Id from the Active Config
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetVideoById(videoId) {
        if (!Na__VideoStudio__ActiveConfig || !videoId) return null;

        const videos = Na__VideoStudio__ActiveConfig[Na__VideoStudio__VIDEOS_KEY];
        if (!Array.isArray(videos)) return null;

        return videos.find(v => v.VideoStudio__Video__Id === videoId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Keyframe by Id Within a Video
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetKeyframeById(video, keyframeId) {
        if (!video || !keyframeId) return null;

        const keys = video.VideoStudio__Video__Keyframes;
        if (!Array.isArray(keys)) return null;

        return keys.find(k => k.VideoStudio__Keyframe__Id === keyframeId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Export Options for a Video, Defaulted
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetExportOptions(video) {
        const raw = (video && video.VideoStudio__Video__Export) || {};

        const height = Number.isFinite(raw.VideoStudio__Export__Height)
            ? raw.VideoStudio__Export__Height
            : Na__VideoStudio__DEFAULT_HEIGHT;

        // ASPECT | Videos saved before aspect ratios existed carry only a width
        // and a height, so their shape is inferred from those rather than being
        // silently reshaped to the new default. Only a video with neither key
        // falls back to the house 3:2.
        const aspect = raw.VideoStudio__Export__AspectRatio
            || Na__VideoStudio__InferAspectFromSize(raw.VideoStudio__Export__Width, height)
            || Na__VideoStudio__DEFAULT_ASPECT;

        return {
            aspect      : aspect,
            height      : height,

            // WIDTH | Always recomputed rather than trusted. A project saved
            // before aspect ratios existed carries a 16:9 width that no longer
            // matches its aspect key, and deriving keeps the pair honest.
            width       : Na__VideoStudio__DeriveExportWidth(height, aspect),

            fps         : Number.isFinite(raw.VideoStudio__Export__Fps)         ? raw.VideoStudio__Export__Fps         : Na__VideoStudio__DEFAULT_FPS,
            bitrateMbps : Number.isFinite(raw.VideoStudio__Export__BitrateMbps) ? raw.VideoStudio__Export__BitrateMbps : Na__VideoStudio__DEFAULT_BITRATE_MBPS
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Export Height or Aspect and Rewrite the Derived Width
    // ------------------------------------------------------------
    // The one place either is changed, so the stored width can never disagree
    // with the height and aspect it is supposed to follow.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetExportFraming(videoId, { height, aspect }) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return null;

        if (!video.VideoStudio__Video__Export) {
            video.VideoStudio__Video__Export = Na__VideoStudio__ProjectJson__BuildDefaultExport();
        }
        const block = video.VideoStudio__Video__Export;

        if (Number.isFinite(height)) block.VideoStudio__Export__Height      = height;
        if (aspect)                  block.VideoStudio__Export__AspectRatio = aspect;

        const finalHeight = block.VideoStudio__Export__Height;
        const finalAspect = block.VideoStudio__Export__AspectRatio;
        block.VideoStudio__Export__Width = Na__VideoStudio__DeriveExportWidth(finalHeight, finalAspect);

        return { width: block.VideoStudio__Export__Width, height: finalHeight, aspect: finalAspect };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Playback Options for a Video, Defaulted
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetPlaybackOptions(video) {
        const raw = (video && video.VideoStudio__Video__Playback) || {};

        return {
            speedMultiplier  : Na__VideoStudio__ClampSpeed(raw.VideoStudio__Playback__SpeedMultiplier),
            defaultSegmentMs : Na__VideoStudio__ClampSegmentMs(raw.VideoStudio__Playback__DefaultSegmentMs),
            defaultHoldMs    : Na__VideoStudio__ClampHoldMs(raw.VideoStudio__Playback__DefaultHoldMs),
            easing           : raw.VideoStudio__Playback__Easing || Na__VideoStudio__DEFAULT_EASING,
            closedLoop       : raw.VideoStudio__Playback__ClosedLoop === true,

            // ANIMATIONS | Absent means enabled. Videos authored before this
            // setting existed should still open doors, so only an explicit
            // false switches it off.
            animationsEnabled: raw.VideoStudio__Playback__AnimationsEnabled !== false,

            // DOOR TIMING | Seconds is the current shape. A video saved while
            // this was a speed multiplier is read through that key instead, so
            // an existing project keeps the pace it was given rather than
            // silently reverting to the default.
            doorOpenSeconds  : Na__VideoStudio__ResolveDoorSeconds(raw),

            // DOOR DETECTION | Null means follow the app config threshold
            doorDistanceM    : Na__VideoStudio__ClampDoorDistanceM(raw.VideoStudio__Playback__DoorDistanceM)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mutation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ensure the Active Config Exists, Creating It if Needed
    // ------------------------------------------------------------
    function Na__VideoStudio__EnsureActiveConfig() {
        if (!Na__VideoStudio__ActiveConfig) {
            Na__VideoStudio__ActiveConfig = Na__VideoStudio__ProjectJson__BuildEmptyConfig();
        }
        if (!Array.isArray(Na__VideoStudio__ActiveConfig[Na__VideoStudio__VIDEOS_KEY])) {
            Na__VideoStudio__ActiveConfig[Na__VideoStudio__VIDEOS_KEY] = [];  // <-- Repair a malformed videos key
        }
        return Na__VideoStudio__ActiveConfig;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a New Video to the Active Config
    // ------------------------------------------------------------
    // Returns the newly created video record.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__AddVideo(videoName) {
        const config = Na__VideoStudio__EnsureActiveConfig();
        const videos = config[Na__VideoStudio__VIDEOS_KEY];

        const videoId  = Na__VideoStudio__ProjectJson__GetNextVideoId(videos);
        const maxOrder = videos.reduce((max, v) => Math.max(max, v.VideoStudio__Video__Order || 0), 0);
        const name     = (videoName && String(videoName).trim()) || `Video ${videos.length + 1}`;

        const newVideo = Na__VideoStudio__ProjectJson__BuildNewVideo(videoId, name, maxOrder + 1);
        videos.push(newVideo);

        return newVideo;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Video from the Active Config
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__DeleteVideo(videoId) {
        if (!Na__VideoStudio__ActiveConfig) return false;

        const videos = Na__VideoStudio__ActiveConfig[Na__VideoStudio__VIDEOS_KEY];
        if (!Array.isArray(videos)) return false;

        const index = videos.findIndex(v => v.VideoStudio__Video__Id === videoId);
        if (index === -1) return false;

        videos.splice(index, 1);
        Na__VideoStudio__ProjectJson__ReindexVideoOrders();                  // <-- Close the gap in Order values

        if (Na__VideoStudio__ActiveVideoId === videoId) {
            Na__VideoStudio__ActiveVideoId    = null;                        // <-- Clear selection pointing at a dead record
            Na__VideoStudio__ActiveKeyframeId = null;
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Reindex Video Order Values to a Contiguous 1..N Sequence
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__ReindexVideoOrders() {
        if (!Na__VideoStudio__ActiveConfig) return;

        const sorted = Na__VideoStudio__ProjectJson__GetSortedVideos(Na__VideoStudio__ActiveConfig);
        sorted.forEach((video, index) => {
            video.VideoStudio__Video__Order = index + 1;                     // <-- 1-based contiguous ordering
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Append a Keyframe to a Video
    // ------------------------------------------------------------
    // Returns the newly created keyframe record, or null when the video is
    // missing.  New keyframes inherit the video's playback defaults.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__AddKeyframe(videoId, cameraPosition, extras) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video || !cameraPosition) return null;

        if (!Array.isArray(video.VideoStudio__Video__Keyframes)) {
            video.VideoStudio__Video__Keyframes = [];                        // <-- Repair a malformed keyframes key
        }

        const keys     = video.VideoStudio__Video__Keyframes;
        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const maxOrder = keys.reduce((max, k) => Math.max(max, k.VideoStudio__Keyframe__Order || 0), 0);

        const newKeyframe = Na__VideoStudio__ProjectJson__BuildNewKeyframe({
            keyframeId     : Na__VideoStudio__ProjectJson__GetNextKeyframeId(video),
            order          : maxOrder + 1,
            cameraPosition : cameraPosition,
            lensMm         : (extras && extras.lensMm)         || 45,
            capturedInMode : (extras && extras.capturedInMode) || 'Orbit',
            segmentMs      : playback.defaultSegmentMs,                      // <-- Inherit the panel default
            holdMs         : playback.defaultHoldMs                          // <-- Inherit the panel default
        });

        keys.push(newKeyframe);
        return newKeyframe;
    }
    // ------------------------------------------------------------


    // FUNCTION | Insert a Keyframe Between Two Existing Ones
    // ------------------------------------------------------------
    // afterIndex is the position in the sorted running order that the new
    // waypoint follows, so inserting on the leg between waypoints 2 and 3 means
    // afterIndex 1.
    //
    // localS is how far along that leg the insertion falls, 0 to 1. The leg's
    // travel time is split at the same fraction, so the clip's total duration
    // and the pacing either side of the new waypoint are both unchanged: a
    // waypoint dropped halfway along a 6 second leg gives two 3 second legs.
    //
    // Returns the new keyframe record, or null.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__InsertKeyframeAfter(videoId, afterIndex, cameraPosition, extras) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video || !cameraPosition) return null;

        const sorted = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        const before = sorted[afterIndex];
        if (!before) return null;

        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const localS   = Math.max(0.01, Math.min(0.99, (extras && extras.localS) || 0.5));

        // SPLIT | The leg's travel time is shared between the two new legs
        const legMs   = Number.isFinite(before.VideoStudio__Keyframe__SegmentMs)
            ? before.VideoStudio__Keyframe__SegmentMs
            : playback.defaultSegmentMs;

        const firstMs = Na__VideoStudio__ClampSegmentMs(legMs * localS);
        const restMs  = Na__VideoStudio__ClampSegmentMs(legMs * (1 - localS));

        const newKeyframe = Na__VideoStudio__ProjectJson__BuildNewKeyframe({
            keyframeId     : Na__VideoStudio__ProjectJson__GetNextKeyframeId(video),
            order          : 0,                                              // <-- Set properly by the reindex below
            cameraPosition : cameraPosition,
            lensMm         : (extras && extras.lensMm)         || 45,
            capturedInMode : (extras && extras.capturedInMode) || 'Inserted',
            segmentMs      : restMs,
            holdMs         : playback.defaultHoldMs
        });

        if (extras && extras.label) {
            newKeyframe.VideoStudio__Keyframe__Label = extras.label;
        }

        before.VideoStudio__Keyframe__SegmentMs = firstMs;                   // <-- Leading leg keeps its share

        // ORDER | Rebuild the sorted run with the new record spliced in, then
        // renumber, so Order values stay contiguous whatever they were before.
        const rebuilt = sorted.slice();
        rebuilt.splice(afterIndex + 1, 0, newKeyframe);
        rebuilt.forEach((keyframe, index) => {
            keyframe.VideoStudio__Keyframe__Order = index + 1;
        });

        video.VideoStudio__Video__Keyframes = rebuilt;
        return newKeyframe;
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate the Next Free Inserted Waypoint Label
    // ------------------------------------------------------------
    // Numbered by how many insertions the video already carries rather than by
    // running order, so the name stays put when waypoints either side of it are
    // added or removed.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetNextInsertedLabel(video) {
        const keys = (video && video.VideoStudio__Video__Keyframes) || [];
        const used = new Set(keys.map(k => k.VideoStudio__Keyframe__Label).filter(Boolean));

        let n = 1;
        while (used.has(`Inserted Frame ${n}`)) n++;
        return `Inserted Frame ${n}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Keyframe from a Video
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__DeleteKeyframe(videoId, keyframeId) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video || !Array.isArray(video.VideoStudio__Video__Keyframes)) return false;

        const keys  = video.VideoStudio__Video__Keyframes;
        const index = keys.findIndex(k => k.VideoStudio__Keyframe__Id === keyframeId);
        if (index === -1) return false;

        keys.splice(index, 1);
        Na__VideoStudio__ProjectJson__ReindexKeyframeOrders(video);          // <-- Close the gap in Order values

        if (Na__VideoStudio__ActiveKeyframeId === keyframeId) {
            Na__VideoStudio__ActiveKeyframeId = null;                        // <-- Clear selection pointing at a dead record
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Reindex Keyframe Order Values to a Contiguous 1..N Sequence
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__ReindexKeyframeOrders(video) {
        const sorted = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        sorted.forEach((keyframe, index) => {
            keyframe.VideoStudio__Keyframe__Order = index + 1;               // <-- 1-based contiguous ordering
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Keyframe One Slot Up or Down the Running Order
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__MoveKeyframe(videoId, keyframeId, direction) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return false;

        const sorted = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        const index  = sorted.findIndex(k => k.VideoStudio__Keyframe__Id === keyframeId);
        if (index === -1) return false;

        const target = index + (direction < 0 ? -1 : 1);
        if (target < 0 || target >= sorted.length) return false;             // <-- Already at an end of the run

        const swapOrder = sorted[target].VideoStudio__Keyframe__Order;
        sorted[target].VideoStudio__Keyframe__Order = sorted[index].VideoStudio__Keyframe__Order;
        sorted[index].VideoStudio__Keyframe__Order  = swapOrder;             // <-- Swap the two Order values

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Keyframe's Lens Focal Length
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetKeyframeLensMm(keyframe) {
        if (!keyframe) return Na__VideoStudio__DEFAULT_LENS_MM;
        return Na__VideoStudio__ClampLensMm(keyframe.VideoStudio__Keyframe__LensMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Keyframe's Lens, Keeping Its Stored FOV in Step
    // ------------------------------------------------------------
    // LensMm is the value the panel shows and the value a human reasons about;
    // Camera__DefaultMisc__Fov is what the sampler actually interpolates.  They
    // describe the same thing, so they must never drift apart.  This is the one
    // place both are written, and it takes the already-converted FOV from the
    // caller rather than importing the lens maths, which would make this pure
    // data layer depend on the path sampler that depends on it.
    //
    // Returns the clamped lens in millimetres, or null when the keyframe is
    // missing.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetKeyframeLens(videoId, keyframeId, lensMm, fovDegrees) {
        const video    = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        const keyframe = Na__VideoStudio__ProjectJson__GetKeyframeById(video, keyframeId);
        if (!keyframe) return null;

        const clampedLens = Na__VideoStudio__ClampLensMm(lensMm);
        keyframe.VideoStudio__Keyframe__LensMm = clampedLens;

        if (Number.isFinite(fovDegrees)) {
            const camera = keyframe.VideoStudio__Keyframe__CameraPosition;
            if (camera) {
                if (!camera.Camera__DefaultMisc) camera.Camera__DefaultMisc = {};
                camera.Camera__DefaultMisc.Camera__DefaultMisc__Fov = parseFloat(fovDegrees.toFixed(4));
            }
        }

        return clampedLens;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Keyframe to a New World Position
    // ------------------------------------------------------------
    // positionUnits is a THREE.Vector3 in scene units. Stored as integer
    // millimetres like every other camera position in project.json.
    // Orientation, lens and timings are untouched: dragging a waypoint moves
    // where the shot is taken from, not where it looks.
    //
    // Returns true when the keyframe was found and moved.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetKeyframePosition(videoId, keyframeId, positionUnits) {
        const video    = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        const keyframe = Na__VideoStudio__ProjectJson__GetKeyframeById(video, keyframeId);
        if (!keyframe || !positionUnits) return false;

        const camera = keyframe.VideoStudio__Keyframe__CameraPosition;
        if (!camera) return false;

        camera.Camera__DefaultPos = {
            Camera__DefaultPos__PosX : Math.round(Na__Math__ConvertUnitsToMm(positionUnits.x)),
            Camera__DefaultPos__PosY : Math.round(Na__Math__ConvertUnitsToMm(positionUnits.y)),
            Camera__DefaultPos__PosZ : Math.round(Na__Math__ConvertUnitsToMm(positionUnits.z))
        };

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Aim a Keyframe to a New Orientation
    // ------------------------------------------------------------
    // eulerXYZ is a plain { x, y, z } in radians, already in the XYZ order the
    // Camera__DefaultRotation block uses across the whole app.  Position, lens
    // and timings are untouched: rotating a waypoint changes where the shot
    // looks, not where it is taken from.
    //
    // Returns true when the keyframe was found and re-aimed.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetKeyframeRotation(videoId, keyframeId, eulerXYZ) {
        const video    = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        const keyframe = Na__VideoStudio__ProjectJson__GetKeyframeById(video, keyframeId);
        if (!keyframe || !eulerXYZ) return false;

        const camera = keyframe.VideoStudio__Keyframe__CameraPosition;
        if (!camera) return false;

        camera.Camera__DefaultRotation = {
            Camera__DefaultRotation__RotX : parseFloat(eulerXYZ.x.toFixed(4)),   // <-- 4dp radians, as everywhere else
            Camera__DefaultRotation__RotY : parseFloat(eulerXYZ.y.toFixed(4)),
            Camera__DefaultRotation__RotZ : parseFloat(eulerXYZ.z.toFixed(4))
        };

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write an Export Option Field on a Video
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetExportOption(videoId, fieldKey, value) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return false;

        if (!video.VideoStudio__Video__Export) {
            video.VideoStudio__Video__Export = Na__VideoStudio__ProjectJson__BuildDefaultExport();
        }
        video.VideoStudio__Video__Export[fieldKey] = value;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Playback Option Field on a Video
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetPlaybackOption(videoId, fieldKey, value) {
        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return false;

        if (!video.VideoStudio__Video__Playback) {
            video.VideoStudio__Video__Playback = Na__VideoStudio__ProjectJson__BuildDefaultPlayback();
        }
        video.VideoStudio__Video__Playback[fieldKey] = value;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Management
// -----------------------------------------------------------------------------

    // FUNCTION | Store the Active Project Video Config
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetActiveConfig(config, projectCode) {
        Na__VideoStudio__ActiveConfig      = config || null;                 // <-- Persist config for this session
        Na__VideoStudio__ActiveProjectCode = projectCode || null;            // <-- Persist project code for saves
        Na__VideoStudio__ActiveVideoId     = null;                           // <-- Reset selection on new project load
        Na__VideoStudio__ActiveKeyframeId  = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Stored Active Config
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetActiveConfig() {
        return Na__VideoStudio__ActiveConfig;                                // <-- May be null before first video is created
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Project Code
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetActiveProjectCode() {
        return Na__VideoStudio__ActiveProjectCode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Currently Selected Video Id
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetActiveVideoId(videoId) {
        Na__VideoStudio__ActiveVideoId = videoId || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Currently Selected Video Id
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetActiveVideoId() {
        return Na__VideoStudio__ActiveVideoId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Currently Highlighted Keyframe Id
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__SetActiveKeyframeId(keyframeId) {
        Na__VideoStudio__ActiveKeyframeId = keyframeId || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Currently Highlighted Keyframe Id
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__GetActiveKeyframeId() {
        return Na__VideoStudio__ActiveKeyframeId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge the Active Config into a projectData Object for Saving
    // ------------------------------------------------------------
    // Reindexes orders, stamps the description, and writes the block onto the
    // supplied projectData ready for the R2-first two-phase save.
    // ------------------------------------------------------------
    function Na__VideoStudio__ProjectJson__MergeIntoProjectData(projectData) {
        if (!projectData) return projectData;

        if (!Na__VideoStudio__ActiveConfig) {
            delete projectData[Na__VideoStudio__SECTION_KEY];                // <-- Nothing authored; leave project.json clean
            return projectData;
        }

        Na__VideoStudio__ProjectJson__ReindexVideoOrders();
        Na__VideoStudio__ProjectJson__GetSortedVideos(Na__VideoStudio__ActiveConfig)
            .forEach(Na__VideoStudio__ProjectJson__ReindexKeyframeOrders);

        Na__VideoStudio__ActiveConfig[Na__VideoStudio__DESCRIPTION_KEY] = Na__VideoStudio__BLOCK_DESCRIPTION;
        Na__VideoStudio__ActiveConfig[Na__VideoStudio__ENABLED_KEY]     = true;

        projectData[Na__VideoStudio__SECTION_KEY] = Na__VideoStudio__ActiveConfig;
        return projectData;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Video Studio Project JSON Data API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__SECTION_KEY,
        Na__VideoStudio__MIN_SEGMENT_MS,
        Na__VideoStudio__MAX_SEGMENT_MS,
        Na__VideoStudio__MIN_HOLD_MS,
        Na__VideoStudio__MAX_HOLD_MS,
        Na__VideoStudio__MIN_SPEED,
        Na__VideoStudio__MAX_SPEED,
        Na__VideoStudio__MIN_LENS_MM,
        Na__VideoStudio__MAX_LENS_MM,
        Na__VideoStudio__DEFAULT_LENS_MM,
        Na__VideoStudio__MIN_DOOR_SECONDS,
        Na__VideoStudio__MAX_DOOR_SECONDS,
        Na__VideoStudio__DEFAULT_DOOR_SECONDS,
        Na__VideoStudio__MIN_DOOR_DISTANCE_M,
        Na__VideoStudio__MAX_DOOR_DISTANCE_M,
        Na__VideoStudio__ClampDoorSeconds,
        Na__VideoStudio__ClampDoorDistanceM,
        Na__VideoStudio__ASPECT_RATIOS,
        Na__VideoStudio__HEIGHT_STANDARDS,
        Na__VideoStudio__ResolveAspectValue,
        Na__VideoStudio__DeriveExportWidth,
        Na__VideoStudio__ProjectJson__SetExportFraming,
        Na__VideoStudio__ClampSegmentMs,
        Na__VideoStudio__ClampHoldMs,
        Na__VideoStudio__ClampSpeed,
        Na__VideoStudio__ClampLensMm,
        Na__VideoStudio__ProjectJson__GetConfigBlock,
        Na__VideoStudio__ProjectJson__HasValidVideos,
        Na__VideoStudio__ProjectJson__BuildEmptyConfig,
        Na__VideoStudio__ProjectJson__GetSortedVideos,
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetKeyframeById,
        Na__VideoStudio__ProjectJson__GetExportOptions,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions,
        Na__VideoStudio__ProjectJson__AddVideo,
        Na__VideoStudio__ProjectJson__DeleteVideo,
        Na__VideoStudio__ProjectJson__AddKeyframe,
        Na__VideoStudio__ProjectJson__InsertKeyframeAfter,
        Na__VideoStudio__ProjectJson__GetNextInsertedLabel,
        Na__VideoStudio__ProjectJson__DeleteKeyframe,
        Na__VideoStudio__ProjectJson__MoveKeyframe,
        Na__VideoStudio__ProjectJson__GetKeyframeLensMm,
        Na__VideoStudio__ProjectJson__SetKeyframeLens,
        Na__VideoStudio__ProjectJson__SetKeyframePosition,
        Na__VideoStudio__ProjectJson__SetKeyframeRotation,
        Na__VideoStudio__ProjectJson__SetExportOption,
        Na__VideoStudio__ProjectJson__SetPlaybackOption,
        Na__VideoStudio__ProjectJson__SetActiveConfig,
        Na__VideoStudio__ProjectJson__GetActiveConfig,
        Na__VideoStudio__ProjectJson__GetActiveProjectCode,
        Na__VideoStudio__ProjectJson__SetActiveVideoId,
        Na__VideoStudio__ProjectJson__GetActiveVideoId,
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__GetActiveKeyframeId,
        Na__VideoStudio__ProjectJson__MergeIntoProjectData
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
