// =============================================================================
// VALEVISION3D - VIDEO STUDIO - VIDEO ENCODER
// =============================================================================
//
// FILE       : Na__VideoStudio__Export__VideoEncoder.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Video Encoder
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Drive the frame renderer and the WebCodecs H.264 encoder to
//              produce a downloadable MP4 of a saved camera path
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Orchestrates the whole export: build the timeline, open a frame render
//   session, walk the timeline one exact frame interval at a time, hand each
//   rendered frame to a hardware-accelerated VideoEncoder, and feed the
//   encoded chunks into the MP4 muxer.
// - WebCodecs VideoEncoder is the GPU path for video in a browser: encoding
//   runs on the platform's dedicated H.264 hardware encoder where one exists,
//   which is dramatically faster and higher quality than any canvas-scraping
//   JavaScript encoder, and leaves the WebGL render pipeline untouched.
// - Hardware acceleration is requested explicitly and falls back to the
//   browser's own choice if the preference cannot be satisfied.
//
// H.264 LEVEL SELECTION:
// - The codec string must declare a level that can actually carry the
//   requested resolution and frame rate, or the encoder rejects the config.
//   The minimum level is computed from macroblocks per second, then that
//   candidate and every higher one are probed with isConfigSupported until one
//   is accepted, so the export adapts to whatever the machine provides.
//
// PRESENTATION ORDER:
// - The muxer writes sample durations only, with no composition offset table,
//   which is correct exactly when presentation order matches decode order.
//   Every chunk timestamp is therefore checked as it arrives.  In practice the
//   browser encoders in use emit frames in order; if one ever does not, the
//   export fails loudly with an explanation rather than writing a file whose
//   frames would play back shuffled.
//
// DRAWING BUFFER DISCIPLINE:
// - preserveDrawingBuffer is off, so each frame is rendered and wrapped in a
//   VideoFrame inside one unbroken synchronous block.  Nothing may await
//   between the two.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// 01-Sep-2026 - Version 1.1.0
// - The export now opens a model layers session for the path being rendered,
//   so a boundary or foreground building switched off for that path stays out
//   of the video no matter what the Tools panel was showing.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__SampleAtTime,
        Na__VideoStudio__Camera__ApplyCameraState
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Frame Renderer
    // @delegate: ./Na__VideoStudio__Export__FrameRenderer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__FrameRenderer__BeginSession } from './Na__VideoStudio__Export__FrameRenderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | MP4 Muxer
    // @delegate: ./Na__VideoStudio__Export__Mp4Muxer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Mp4Muxer__Create } from './Na__VideoStudio__Export__Mp4Muxer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Accessors
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetExportOptions,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions,
        Na__VideoStudio__ProjectJson__GetModelLayerOptions
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Animations Session
    // @delegate: ./Na__VideoStudio__Playback__SceneAnimations.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__SceneAnimations__Begin,
        Na__VideoStudio__SceneAnimations__End
    } from './Na__VideoStudio__Playback__SceneAnimations.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Per-Path Model Layers Session
    // @delegate: ./Na__VideoStudio__Playback__ModelLayers.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ModelLayers__Begin,
        Na__VideoStudio__ModelLayers__End
    } from './Na__VideoStudio__Playback__ModelLayers.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextTick } from '../30__System__ImageExport/Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__StopActiveRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Encoder Behaviour
    // ------------------------------------------------------------
    const Na__VsEnc__MAX_QUEUE_DEPTH   = 8;      // <-- Frames allowed in flight before applying backpressure
    const Na__VsEnc__PAINT_EVERY_N     = 8;      // <-- Frames between guaranteed UI repaints
    const Na__VsEnc__GOP_SECONDS       = 2;      // <-- Forced keyframe interval, for seek responsiveness
    const Na__VsEnc__MAX_FRAME_COUNT   = 36000;  // <-- Hard ceiling: ten minutes at 60fps
    const Na__VsEnc__FLUSH_POLL_MS     = 30;     // <-- Poll interval while draining the encoder queue
    // ------------------------------------------------------------


    // MODULE CONSTANTS | H.264 High Profile Codec Strings by Level
    // ------------------------------------------------------------
    // Ordered ascending.  maxMbps and maxFrameMbs are the Annex A table limits
    // for macroblocks per second and macroblocks per frame.
    // ------------------------------------------------------------
    const Na__VsEnc__H264_LEVELS = [
        { codec: 'avc1.64001F', label: '3.1', maxFrameMbs: 3600,  maxMbps: 108000  },
        { codec: 'avc1.640020', label: '3.2', maxFrameMbs: 5120,  maxMbps: 216000  },
        { codec: 'avc1.640028', label: '4.0', maxFrameMbs: 8192,  maxMbps: 245760  },
        { codec: 'avc1.64002A', label: '4.2', maxFrameMbs: 8704,  maxMbps: 522240  },
        { codec: 'avc1.640032', label: '5.0', maxFrameMbs: 22080, maxMbps: 589824  },
        { codec: 'avc1.640033', label: '5.1', maxFrameMbs: 36864,  maxMbps: 983040   },
        { codec: 'avc1.640034', label: '5.2', maxFrameMbs: 36864,  maxMbps: 2073600  },
        { codec: 'avc1.64003C', label: '6.0', maxFrameMbs: 139264, maxMbps: 4177920  },
        { codec: 'avc1.64003D', label: '6.1', maxFrameMbs: 139264, maxMbps: 8355840  },
        { codec: 'avc1.64003E', label: '6.2', maxFrameMbs: 139264, maxMbps: 16711680 }
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Quality Stops Mapped to Bits Per Pixel
    // ------------------------------------------------------------
    // Bitrate is derived from resolution and frame rate rather than fixed, so
    // a 4K clip is not starved by a value that suited 720p.
    // ------------------------------------------------------------
    const Na__VideoStudio__Encoder__QUALITY_STOPS = [
        { index: 1, label: 'Draft',     bitsPerPixel: 0.06 },
        { index: 2, label: 'Good',      bitsPerPixel: 0.10 },
        { index: 3, label: 'High',      bitsPerPixel: 0.16 },
        { index: 4, label: 'Very High', bitsPerPixel: 0.24 },
        { index: 5, label: 'Maximum',   bitsPerPixel: 0.36 }
    ];
    const Na__VideoStudio__Encoder__DEFAULT_QUALITY_INDEX = 3;   // <-- 'High'
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capability Detection
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether This Browser Can Encode MP4 At All
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__IsSupported() {
        return (typeof window !== 'undefined')
            && (typeof window.VideoEncoder === 'function')
            && (typeof window.VideoFrame   === 'function');
    }
    // ------------------------------------------------------------


    // FUNCTION | Human-Readable Reason Why Export Is Unavailable
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__GetUnsupportedReason() {
        if (Na__VideoStudio__Encoder__IsSupported()) return null;
        return 'MP4 export needs the WebCodecs API. Use Chrome or Edge (Safari and Firefox do not expose VideoEncoder yet).';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute the Minimum H.264 Level Index for a Format
    // ------------------------------------------------------------
    function Na__VsEnc__MinimumLevelIndex(width, height, fps) {
        const frameMbs = Math.ceil(width / 16) * Math.ceil(height / 16);
        const mbps     = frameMbs * fps;

        for (let i = 0; i < Na__VsEnc__H264_LEVELS.length; i++) {
            const level = Na__VsEnc__H264_LEVELS[i];
            if (frameMbs <= level.maxFrameMbs && mbps <= level.maxMbps) return i;
        }
        return Na__VsEnc__H264_LEVELS.length - 1;                            // <-- Beyond the table; try the highest we know
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Probe Encoder Configurations Until One Is Accepted
    // ------------------------------------------------------------
    // Walks levels upward from the computed minimum, preferring hardware
    // acceleration and falling back to the browser's own choice.
    // Returns an accepted config object, or null.
    // ------------------------------------------------------------
    async function Na__VsEnc__ResolveEncoderConfig(width, height, fps, bitrateBps) {
        const startIndex   = Na__VsEnc__MinimumLevelIndex(width, height, fps);
        const accelerations = ['prefer-hardware', 'no-preference'];

        for (const acceleration of accelerations) {
            for (let i = startIndex; i < Na__VsEnc__H264_LEVELS.length; i++) {
                const level  = Na__VsEnc__H264_LEVELS[i];
                const config = {
                    codec               : level.codec,
                    width               : width,
                    height              : height,
                    bitrate             : bitrateBps,
                    framerate           : fps,
                    latencyMode         : 'quality',
                    hardwareAcceleration: acceleration,
                    avc                 : { format: 'avc' }                  // <-- Length-prefixed NALs plus an avcC record
                };

                try {
                    const support = await window.VideoEncoder.isConfigSupported(config);
                    if (support && support.supported) {
                        console.log(`[VideoStudio] Encoder: H.264 level ${level.label}, ${acceleration}.`);
                        return support.config || config;
                    }
                } catch (probeError) {
                    // Some builds throw rather than returning unsupported; keep walking.
                }
            }
        }

        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bitrate and Filename Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Compute a Target Bitrate in Mbps for a Quality Stop
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__ComputeBitrateMbps(width, height, fps, qualityIndex) {
        const stop = Na__VideoStudio__Encoder__QUALITY_STOPS.find(s => s.index === qualityIndex)
                  || Na__VideoStudio__Encoder__QUALITY_STOPS[Na__VideoStudio__Encoder__DEFAULT_QUALITY_INDEX - 1];

        const bitsPerSecond = width * height * fps * stop.bitsPerPixel;
        return Math.max(1, Math.round(bitsPerSecond / 1e6));                 // <-- Whole Mbps reads better in the panel
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Quality Stop Nearest a Stored Bitrate
    // ------------------------------------------------------------
    // Used when reloading a project so the slider lands where it was left.
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__ResolveQualityIndex(width, height, fps, bitrateMbps) {
        let bestIndex    = Na__VideoStudio__Encoder__DEFAULT_QUALITY_INDEX;
        let bestDistance = Infinity;

        Na__VideoStudio__Encoder__QUALITY_STOPS.forEach((stop) => {
            const candidate = Na__VideoStudio__Encoder__ComputeBitrateMbps(width, height, fps, stop.index);
            const distance  = Math.abs(candidate - bitrateMbps);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex    = stop.index;
            }
        });

        return bestIndex;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Rough Remaining Duration for the Status Line
    // ------------------------------------------------------------
    // Deliberately coarse: an ETA that ticks every second reads as precision
    // the estimate does not have.
    // ------------------------------------------------------------
    function Na__VsEnc__FormatDuration(ms) {
        const totalSeconds = Math.max(0, Math.round(ms / 1000));
        if (totalSeconds < 60) return `${Math.max(5, Math.round(totalSeconds / 5) * 5)} seconds`;

        const minutes = Math.round(totalSeconds / 60);
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Today's Date as DD-MMM-YYYY
    // ------------------------------------------------------------
    function Na__VsEnc__FormatDateStamp() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now    = new Date();

        const day   = String(now.getDate()).padStart(2, '0');
        const month = months[now.getMonth()];
        const year  = now.getFullYear();

        return `${day}-${month}-${year}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Download Filename for a Video
    // ------------------------------------------------------------
    // Produces ValeVision3D__{VideoName}__12-Aug-2026__.mp4 with the user's
    // video name reduced to filename-safe characters.
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__BuildFilename(videoName) {
        const safeName = String(videoName || 'Video')
            .trim()
            .replace(/[^A-Za-z0-9]+/g, '_')                                  // <-- Collapse runs of punctuation and spaces
            .replace(/^_+|_+$/g, '')                                         // <-- Trim leading and trailing underscores
            || 'Video';

        return `ValeVision3D__${safeName}__${Na__VsEnc__FormatDateStamp()}__.mp4`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Trigger a Browser Download for a Blob
    // ------------------------------------------------------------
    function Na__VideoStudio__Encoder__DownloadBlob(blob, filename) {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);                                            // <-- Free memory once the download has started
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Async Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Yield a Real Task Turn Without Waiting for a Paint
    // ------------------------------------------------------------
    // A MessageChannel turn is a true macrotask and is not throttled in
    // background tabs, so the encoder queue drains at full speed while the
    // panel still repaints on the periodic NextTick.
    // ------------------------------------------------------------
    function Na__VsEnc__YieldTask() {
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => {
                channel.port1.close();
                resolve();
            };
            channel.port2.postMessage(null);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait Until the Encoder Queue Drops Below the Threshold
    // ------------------------------------------------------------
    async function Na__VsEnc__AwaitQueueSpace(encoder, threshold) {
        let guard = 0;
        while (encoder.encodeQueueSize > threshold && encoder.state === 'configured') {
            await Na__VsEnc__YieldTask();
            guard++;
            if (guard > 10000) break;                                        // <-- Defensive: never spin forever
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait a Fixed Number of Milliseconds
    // ------------------------------------------------------------
    function Na__VsEnc__Delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Orchestration
// -----------------------------------------------------------------------------

    // FUNCTION | Render and Encode a Video to an MP4 Blob
    // ------------------------------------------------------------
    // options:
    //   video                  {object}   Video record from project.json
    //   renderer, scene, camera, controls
    //   getRenderPipelineState {Function}
    //   onProgress             {Function|null}  ({ percent, message }) => void
    //   shouldCancel           {Function|null}  () => boolean, polled per frame
    //
    // Returns { blob, filename, width, height, fps, frameCount, durationMs }.
    // Throws with a user-presentable message on any failure.
    // ------------------------------------------------------------
    async function Na__VideoStudio__Encoder__ExportVideo(options) {
        const {
            video, renderer, scene, camera, controls,
            getRenderPipelineState,
            onProgress   = null,
            shouldCancel = null
        } = options;

        const progress = (percent, message, detail) => {
            if (typeof onProgress === 'function') onProgress({ percent, message, detail });
        };
        const cancelled = () => (typeof shouldCancel === 'function') && shouldCancel();

        // GUARD | Browser capability
        // ------------------------------------------------------------
        const unsupportedReason = Na__VideoStudio__Encoder__GetUnsupportedReason();
        if (unsupportedReason) throw new Error(unsupportedReason);

        // TIMELINE | Build the path the frames will be sampled from
        // ------------------------------------------------------------
        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        if (!timeline) throw new Error('This video has no keyframes to render.');
        if (timeline.totalDurationMs <= 0) throw new Error('This video has zero duration.');

        const exportOptions   = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const playbackOptions = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const fps             = exportOptions.fps;
        const frameCount      = Math.max(1, Math.round((timeline.totalDurationMs / 1000) * fps));

        if (frameCount > Na__VsEnc__MAX_FRAME_COUNT) {
            throw new Error(`That is ${frameCount} frames, which is too long for a single export. Shorten the path or lower the frame rate.`);
        }

        progress(0, 'Preparing render session', 'Borrowing the renderer and resizing the effect chain');

        // RENDER SESSION | Borrow the live renderer at export resolution
        // ------------------------------------------------------------
        Na__RenderLoop__StopActiveRender('video-export');                    // <-- Stop the live loop fighting for the renderer

        // ANIMATIONS | Proximity doors are owned by Walk and Fly, so they have
        // to be switched on explicitly for the length of the export or every
        // door stays shut as the camera walks through it.
        const animationsEnabled = playbackOptions.animationsEnabled;
        const animationSession  = Na__VideoStudio__SceneAnimations__Begin(
            animationsEnabled,
            {
                doorOpenSeconds : playbackOptions.doorOpenSeconds,
                doorDistanceMm  : Number.isFinite(playbackOptions.doorDistanceM)
                    ? playbackOptions.doorDistanceM * 1000                    // <-- Metres in the UI, millimetres in the system
                    : null
            }
        );

        // MODEL LAYERS | The export borrows the live scene, so without this it
        // renders whatever the Tools panel happened to be showing. Apply this
        // path's own layer state instead, and put the viewport back afterwards.
        const layerOptions = Na__VideoStudio__ProjectJson__GetModelLayerOptions(video);
        const layerSession = Na__VideoStudio__ModelLayers__Begin(
            layerOptions.enabled,
            layerOptions.visibility
        );

        const session = Na__VideoStudio__FrameRenderer__BeginSession({
            renderer, scene, camera, controls,
            getRenderPipelineState,
            width  : exportOptions.width,
            height : exportOptions.height,
            animationsEnabled
        });

        const outW = session.width;
        const outH = session.height;

        // ENCODER | Probe for a supported configuration at this format
        // ------------------------------------------------------------
        let encoder    = null;
        let muxer      = null;
        let encodeError = null;
        let orderError  = false;
        let lastTimestamp = -Infinity;

        try {
            const bitrateBps    = Math.max(1, exportOptions.bitrateMbps) * 1e6;
            const encoderConfig = await Na__VsEnc__ResolveEncoderConfig(outW, outH, fps, bitrateBps);

            if (!encoderConfig) {
                throw new Error(`This machine cannot encode H.264 at ${outW}x${outH} @ ${fps}fps. Try a lower resolution or frame rate.`);
            }

            progress(1, 'Starting hardware encoder', `H.264 at ${outW} x ${outH}, ${fps}fps`);

            muxer = Na__VideoStudio__Mp4Muxer__Create({ width: outW, height: outH, fps });

            encoder = new window.VideoEncoder({
                output : (chunk, metadata) => {
                    if (metadata && metadata.decoderConfig && metadata.decoderConfig.description && !muxer.hasDescription()) {
                        muxer.setDescription(metadata.decoderConfig.description);   // <-- avcC arrives with the first chunk
                    }

                    if (chunk.timestamp < lastTimestamp) orderError = true;   // <-- See the presentation-order note in the header
                    lastTimestamp = chunk.timestamp;

                    const bytes = new Uint8Array(chunk.byteLength);
                    chunk.copyTo(bytes);
                    muxer.addChunk(bytes, chunk.type === 'key');
                },
                error  : (error) => {
                    encodeError = error;                                     // <-- Surfaced on the next frame boundary
                }
            });

            encoder.configure(encoderConfig);

            // FRAME LOOP | Exact timeline steps, one render and encode each
            // ------------------------------------------------------------
            const frameDurationMs = 1000 / fps;
            const frameDurationUs = Math.round(1e6 / fps);
            const gopSize         = Math.max(1, Math.round(fps * Na__VsEnc__GOP_SECONDS));
            const renderStartedAt = performance.now();                       // <-- Baseline for the ETA

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {

                if (encodeError) throw new Error(`Encoder failed: ${encodeError.message}`);
                if (cancelled())  throw new Error('Export cancelled.');

                // SYNCHRONOUS BLOCK | Nothing may await between the render and
                // the VideoFrame: preserveDrawingBuffer is off, so the pixels
                // are only guaranteed valid until this task yields.
                const timeMs = frameIndex * frameDurationMs;
                const state  = Na__VideoStudio__PathSampler__SampleAtTime(timeline, timeMs);
                if (!state) throw new Error('Path sampling failed partway through the export.');

                Na__VideoStudio__Camera__ApplyCameraState(camera, state);
                session.renderFrame(frameDurationMs);

                const frame = new window.VideoFrame(session.canvas, {
                    timestamp : frameIndex * frameDurationUs,
                    duration  : frameDurationUs
                });
                // END SYNCHRONOUS BLOCK

                try {
                    encoder.encode(frame, { keyFrame: (frameIndex % gopSize) === 0 });
                } finally {
                    frame.close();                                           // <-- Release the frame's backing memory promptly
                }

                await Na__VsEnc__AwaitQueueSpace(encoder, Na__VsEnc__MAX_QUEUE_DEPTH);

                if ((frameIndex % Na__VsEnc__PAINT_EVERY_N) === 0) {
                    const percent   = Math.round((frameIndex / frameCount) * 92); // <-- Reserve the tail for flush and mux
                    const megabytes = (muxer.getByteLength() / (1024 * 1024)).toFixed(1);

                    // ETA | Measured from real elapsed time rather than guessed
                    // from the frame count, because the first frames are slower
                    // while shaders compile and caches warm.
                    let eta = '';
                    if (frameIndex >= Na__VsEnc__PAINT_EVERY_N) {
                        const elapsedMs   = performance.now() - renderStartedAt;
                        const msPerFrame  = elapsedMs / frameIndex;
                        const remainingMs = msPerFrame * (frameCount - frameIndex);
                        eta = `, about ${Na__VsEnc__FormatDuration(remainingMs)} left`;
                    }

                    progress(
                        percent,
                        `Rendering frame ${frameIndex + 1} of ${frameCount}`,
                        `${megabytes} MB encoded${eta}`
                    );
                    await Na__ExportYield__NextTick();                       // <-- Let the panel repaint
                } else {
                    await Na__VsEnc__YieldTask();
                }
            }

            // FLUSH | Drain everything still in the encoder queue
            // ------------------------------------------------------------
            progress(94, 'Finishing encode', 'Draining frames still inside the encoder');
            await encoder.flush();

            let flushGuard = 0;
            while (muxer.getSampleCount() < frameCount && flushGuard < 200) {
                await Na__VsEnc__Delay(Na__VsEnc__FLUSH_POLL_MS);            // <-- Output callbacks may still be landing
                flushGuard++;
            }

            if (encodeError) throw new Error(`Encoder failed: ${encodeError.message}`);
            if (orderError) {
                throw new Error('The encoder returned frames out of presentation order, which this writer cannot represent. Try a lower frame rate.');
            }

            // MUX | Wrap the encoded stream in an MP4 container
            // ------------------------------------------------------------
            progress(97, 'Writing MP4 container', `${muxer.getSampleCount()} frames into the sample tables`);
            const blob     = muxer.finalize();
            const filename = Na__VideoStudio__Encoder__BuildFilename(video.VideoStudio__Video__Name);

            progress(100, 'Export complete', filename);

            return {
                blob,
                filename,
                width      : outW,
                height     : outH,
                fps        : fps,
                frameCount : muxer.getSampleCount(),
                durationMs : timeline.totalDurationMs
            };

        } finally {
            // TEARDOWN | Always release the encoder and restore the renderer
            // ------------------------------------------------------------
            if (encoder && encoder.state !== 'closed') {
                try { encoder.close(); } catch (closeError) { /* already torn down */ }
            }
            session.end();
            Na__VideoStudio__SceneAnimations__End(animationSession);          // <-- Doors back to orbit behaviour
            Na__VideoStudio__ModelLayers__End(layerSession);                  // <-- Hidden layers back on screen
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Video Encoder API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Encoder__QUALITY_STOPS,
        Na__VideoStudio__Encoder__DEFAULT_QUALITY_INDEX,
        Na__VideoStudio__Encoder__IsSupported,
        Na__VideoStudio__Encoder__GetUnsupportedReason,
        Na__VideoStudio__Encoder__ComputeBitrateMbps,
        Na__VideoStudio__Encoder__ResolveQualityIndex,
        Na__VideoStudio__Encoder__BuildFilename,
        Na__VideoStudio__Encoder__DownloadBlob,
        Na__VideoStudio__Encoder__ExportVideo
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
