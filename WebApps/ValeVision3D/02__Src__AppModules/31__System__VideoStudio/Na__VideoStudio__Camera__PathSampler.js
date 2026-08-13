// =============================================================================
// VALEVISION3D - VIDEO STUDIO - CAMERA PATH SAMPLER
// =============================================================================
//
// FILE       : Na__VideoStudio__Camera__PathSampler.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Camera Path Sampler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Convert a video's keyframes into a continuous, time-addressable
//              camera path and sample camera state at any moment on it
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Captures the live camera into the keyframe JSON shape, and applies a
//   keyframe back onto the live camera.
// - Builds a timeline object from a video record: a centripetal CatmullRom
//   position curve, a per-keyframe quaternion list, a per-keyframe FOV list,
//   and an ordered list of timeline events (holds and legs).
// - Samples position, orientation and FOV at any time in milliseconds.
// - Pure maths and Three.js value objects only.  Never touches the DOM, the
//   scene graph, the renderer, or project.json.
//
// WHY CATMULLROM AND NOT A TRUE B-SPLINE:
// - A uniform B-spline does not pass through its control points, so the camera
//   would miss every keyframe you set.  A centripetal CatmullRom curve is the
//   interpolating member of the same spline family: it passes through every
//   keyframe exactly, stays smooth across them, and cannot overshoot or form
//   cusps on tight turns the way the uniform variant does.  That is the right
//   curve for keyframed camera work and is what comparable tools use.
//
// LEGS AND HOLDS - WHY EASING IS NOT PER SEGMENT:
// - Easing each keyframe-to-keyframe segment independently makes the camera
//   decelerate to a dead stop at every keyframe, which reads as stop-and-go.
// - Instead the path is split into LEGS: a leg is a contiguous run of segments
//   bounded by keyframes that carry a hold (or by the ends of the path).  The
//   camera accelerates once at the start of the leg, travels through all its
//   intermediate keyframes without stopping, and decelerates once at the end.
// - A keyframe with a hold therefore genuinely stops the camera; one without
//   is passed through at speed.  Both behaviours fall out of the same model.
//
// VELOCITY PROFILE - WHY NOT A PLAIN EASE ACROSS THE LEG:
// - Stretching one ease curve across a whole leg has two bad consequences.
//   The authored travel times stop meaning anything: with 2s/3s/4s segments
//   and an ease-in-out cubic, the camera is only a fifth of the way to the
//   second keyframe when its 2 seconds are up.  And on a long leg the motion
//   reads badly - a slow crawl out, a sprint through the middle, a slow crawl
//   in - because the ease is spread over the entire run.
// - So the leg uses a trapezoidal velocity profile instead: accelerate over a
//   short ramp, hold a constant cruise speed, decelerate over a matching ramp.
//   Travel times stay close to what was authored (the ramps redistribute only
//   their own duration), the camera still starts and stops gracefully, and a
//   thirty second leg cruises at an even pace rather than surging.
// - The Easing setting chooses the SHAPE of those ramps.  Every shape has an
//   area of exactly one half under its normalised velocity curve, so the ramp
//   bookkeeping is identical whichever is picked.  'linear' means no ramp at
//   all, giving genuinely constant velocity end to end.
//
// SPEED MULTIPLIER:
// - Scales travel time only.  Hold times are absolute dwell durations and are
//   deliberately left alone, so speeding up a walkthrough hurries the corridor
//   without shortening the pause you set on the front elevation.
//
// INTEGRATION:
// - Consumed by Na__VideoStudio__Playback__PreviewController.js (live preview),
//   Na__VideoStudio__Export__VideoEncoder.js (frame-exact export) and
//   Na__VideoStudio__Viewport__PathVisualizer.js (path geometry).
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

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import {
        Na__Math__ConvertMmToUnits,
        Na__Math__ConvertUnitsToMm
    } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Accessors
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Curve and Timing Parameters
    // ------------------------------------------------------------
    const Na__VsPath__CURVE_TYPE        = 'centripetal';  // <-- No overshoot or cusps on tight turns
    const Na__VsPath__CURVE_TENSION     = 0.5;            // <-- Standard CatmullRom tension
    const Na__VsPath__SINGLE_KEY_MS     = 1000;           // <-- Duration of a one-keyframe static shot
    const Na__VsPath__MIN_CLOSED_KEYS   = 3;              // <-- Fewer than this cannot form a closed loop
    const Na__VsPath__SENSOR_FALLBACK_MM = 24;            // <-- Full-frame sensor height, used until config arrives
    const Na__VsPath__ARC_SAMPLES        = 24;            // <-- Sub-samples per segment for the arc-length table
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Sensor Height for Lens Conversion
    // ------------------------------------------------------------
    // The Tools menu Camera Focal Length slider converts between focal length
    // and FOV using cameraLens.sensorHeightMM from Na__AppConfig__Main.json.
    // Video Studio must convert with the SAME value or the two panels would
    // report different millimetres for one camera, so the loader pushes the
    // config value in here rather than this module carrying its own copy.
    // ------------------------------------------------------------
    let Na__VsPath__SensorHeightMm = Na__VsPath__SENSOR_FALLBACK_MM;
    // ------------------------------------------------------------


    // FUNCTION | Set the Sensor Height Used for Lens Conversion
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__SetSensorHeightMm(sensorHeightMm) {
        if (Number.isFinite(sensorHeightMm) && sensorHeightMm > 0) {
            Na__VsPath__SensorHeightMm = sensorHeightMm;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lens and FOV Conversion
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Vertical FOV Degrees to 35mm Focal Length
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__FovToFocalMm(fovDegrees) {
        if (!Number.isFinite(fovDegrees) || fovDegrees <= 0) return 45;
        const halfRadians = THREE.MathUtils.degToRad(fovDegrees) / 2;
        return (Na__VsPath__SensorHeightMm / 2) / Math.tan(halfRadians);
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert 35mm Focal Length to Vertical FOV Degrees
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__FocalMmToFov(focalMm) {
        if (!Number.isFinite(focalMm) || focalMm <= 0) return 30;
        const halfRadians = Math.atan((Na__VsPath__SensorHeightMm / 2) / focalMm);
        return THREE.MathUtils.radToDeg(halfRadians * 2);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera State Capture and Apply
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the Live Camera as a Keyframe Camera Block
    // ------------------------------------------------------------
    // Returns an object matching VideoStudio__Keyframe__CameraPosition, using
    // the same Camera__DefaultPos / Rotation / Misc field names every other
    // camera block in project.json uses.  Positions are integer millimetres.
    // ------------------------------------------------------------
    function Na__VideoStudio__Camera__CaptureCurrentCameraState(camera) {
        if (!camera) return null;

        return {
            Camera__DefaultPos      : {
                Camera__DefaultPos__PosX : Math.round(Na__Math__ConvertUnitsToMm(camera.position.x)),
                Camera__DefaultPos__PosY : Math.round(Na__Math__ConvertUnitsToMm(camera.position.y)),
                Camera__DefaultPos__PosZ : Math.round(Na__Math__ConvertUnitsToMm(camera.position.z))
            },
            Camera__DefaultRotation : {
                Camera__DefaultRotation__RotX : parseFloat(camera.rotation.x.toFixed(4)),  // <-- 4dp radians
                Camera__DefaultRotation__RotY : parseFloat(camera.rotation.y.toFixed(4)),
                Camera__DefaultRotation__RotZ : parseFloat(camera.rotation.z.toFixed(4))
            },
            Camera__DefaultMisc     : {
                Camera__DefaultMisc__Fov : parseFloat(camera.fov.toFixed(4))               // <-- 4dp degrees
            }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Keyframe Camera Block into Runtime Values
    // ------------------------------------------------------------
    // Returns { position (units), quaternion, fov } or null when malformed.
    // ------------------------------------------------------------
    function Na__VideoStudio__Camera__ParseKeyframeState(keyframe) {
        const cam = keyframe && keyframe.VideoStudio__Keyframe__CameraPosition;
        if (!cam || !cam.Camera__DefaultPos) return null;

        const pos = cam.Camera__DefaultPos;
        const rot = cam.Camera__DefaultRotation || {};
        const msc = cam.Camera__DefaultMisc     || {};

        const position = new THREE.Vector3(
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosX || 0),
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosY || 0),
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosZ || 0)
        );

        // EULER TO QUATERNION | Stored as XYZ Euler to match every other camera
        // block; interpolation needs a quaternion so rotations slerp cleanly
        // and never gimbal-lock partway through a turn.
        const euler = new THREE.Euler(
            rot.Camera__DefaultRotation__RotX || 0,
            rot.Camera__DefaultRotation__RotY || 0,
            rot.Camera__DefaultRotation__RotZ || 0,
            'XYZ'
        );
        const quaternion = new THREE.Quaternion().setFromEuler(euler);

        const fov = Number.isFinite(msc.Camera__DefaultMisc__Fov)
            ? msc.Camera__DefaultMisc__Fov
            : 30;

        return { position, quaternion, fov };
    }
    // ------------------------------------------------------------


    // FUNCTION | Snap the Live Camera to a Sampled Camera State
    // ------------------------------------------------------------
    // state is { position, quaternion, fov } as returned by SampleAtTime.
    // ------------------------------------------------------------
    function Na__VideoStudio__Camera__ApplyCameraState(camera, state) {
        if (!camera || !state) return false;

        camera.position.copy(state.position);
        camera.quaternion.copy(state.quaternion);

        if (Number.isFinite(state.fov) && Math.abs(camera.fov - state.fov) > 1e-4) {
            camera.fov = state.fov;
            camera.updateProjectionMatrix();                                 // <-- Only rebuild the matrix when FOV actually moved
        }

        camera.updateMatrixWorld(true);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Snap the Live Camera Directly to a Stored Keyframe
    // ------------------------------------------------------------
    function Na__VideoStudio__Camera__ApplyKeyframe(camera, keyframe) {
        const state = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);
        if (!state) return false;
        return Na__VideoStudio__Camera__ApplyCameraState(camera, state);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Velocity Ramp Shapes
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ramp Duration
    // ------------------------------------------------------------
    const Na__VsPath__RAMP_MS            = 900;   // <-- Acceleration and braking time at each end of a leg
    const Na__VsPath__RAMP_MAX_FRACTION  = 0.4;   // <-- Ramps may never exceed this share of a short leg
    // ------------------------------------------------------------


    // HELPER FUNCTION | Integrated Linear Velocity Ramp
    // ------------------------------------------------------------
    // Velocity rises as v = x, so displacement is x squared over two.
    // ------------------------------------------------------------
    function Na__VsPath__RampLinear(x) {
        return (x * x) / 2;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Integrated Cosine Velocity Ramp
    // ------------------------------------------------------------
    // Velocity rises as a raised cosine, the gentlest of the three: it starts
    // and ends with zero acceleration as well as zero jerk at the joins.
    // ------------------------------------------------------------
    function Na__VsPath__RampCosine(x) {
        return (x / 2) - (Math.sin(Math.PI * x) / (2 * Math.PI));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Integrated Smoothstep Velocity Ramp
    // ------------------------------------------------------------
    // Velocity rises as the smoothstep 3x^2 - 2x^3.
    // ------------------------------------------------------------
    function Na__VsPath__RampSmoothstep(x) {
        return (x * x * x) - ((x * x * x * x) / 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Velocity Ramp Integral by Easing Name
    // ------------------------------------------------------------
    // Every shape returns exactly 0.5 at x = 1, which is what lets the leg
    // normalisation below be a single expression regardless of the choice.
    // A null return means no ramp at all: constant velocity end to end.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__ResolveEasing(easingName) {
        switch (easingName) {
            case 'linear'         : return null;
            case 'easeInOutQuad'  : return Na__VsPath__RampLinear;
            case 'easeInOutSine'  : return Na__VsPath__RampCosine;
            case 'easeInOutCubic' : return Na__VsPath__RampSmoothstep;
            default               : return Na__VsPath__RampSmoothstep;       // <-- Sensible default for camera moves
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Map Elapsed Leg Time to Eased Leg Progress
    // ------------------------------------------------------------
    // Returns a progress time in leg-local milliseconds.  The profile is
    // accelerate / cruise / decelerate, normalised so that the full leg
    // duration still maps to the full leg progress.
    // ------------------------------------------------------------
    function Na__VsPath__WarpLegTime(elapsedMs, legDurationMs, rampIntegral) {
        if (legDurationMs <= 0) return 0;

        const t = Math.max(0, Math.min(legDurationMs, elapsedMs));
        if (!rampIntegral) return t;                                         // <-- 'linear': constant velocity

        const ramp = Math.min(Na__VsPath__RAMP_MS, legDurationMs * Na__VsPath__RAMP_MAX_FRACTION);
        if (ramp <= 0) return t;

        let displacement;
        if (t <= ramp) {
            displacement = ramp * rampIntegral(t / ramp);                    // <-- Accelerating
        } else if (t <= legDurationMs - ramp) {
            displacement = (ramp / 2) + (t - ramp);                          // <-- Cruising at constant speed
        } else {
            displacement = (legDurationMs - ramp)
                         - ramp * rampIntegral((legDurationMs - t) / ramp);  // <-- Braking, mirrored
        }

        // NORMALISE | The two half-area ramps cost exactly one ramp duration
        // of travel, so scaling by d / (d - ramp) puts the leg end back on the
        // leg's full progress without changing either ramp's shape.
        const scaled = displacement * (legDurationMs / (legDurationMs - ramp));
        return Math.max(0, Math.min(legDurationMs, scaled));
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Easing Options for the Dev Menu Dropdown
    // ------------------------------------------------------------
    const Na__VideoStudio__PathSampler__EASING_OPTIONS = [
        { value: 'easeInOutCubic', label: 'Smooth (default)' },
        { value: 'easeInOutSine',  label: 'Gentlest'         },
        { value: 'easeInOutQuad',  label: 'Snappy'           },
        { value: 'linear',         label: 'Constant speed'   }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Arc Length Correction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Normalised Arc-Length Table for One Segment
    // ------------------------------------------------------------
    // CatmullRomCurve3.getPoint spaces its parameter evenly in u, not in
    // distance, so walking u at a constant rate makes the camera surge on the
    // straights and dawdle round the corners.  Sampling each segment and
    // storing the cumulative chord length lets the sampler convert an even
    // share of TIME into an even share of DISTANCE, which is what removes the
    // wobble.  Returns a Float64Array of cumulative fractions, one per sample.
    // ------------------------------------------------------------
    function Na__VsPath__BuildSegmentArcTable(curve, segIndex, divisor) {
        const samples    = Na__VsPath__ARC_SAMPLES;
        const cumulative = new Float64Array(samples + 1);

        let previous = curve.getPoint(segIndex / divisor);
        let total    = 0;

        for (let i = 1; i <= samples; i++) {
            const point = curve.getPoint((segIndex + (i / samples)) / divisor);
            total += point.distanceTo(previous);
            cumulative[i] = total;
            previous = point;
        }

        if (total > 0) {
            for (let i = 1; i <= samples; i++) cumulative[i] /= total;       // <-- Normalise to 0..1
        } else {
            for (let i = 1; i <= samples; i++) cumulative[i] = i / samples;  // <-- Degenerate segment: fall back to even u
        }

        return cumulative;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert an Even Share of Time to an Even Share of Distance
    // ------------------------------------------------------------
    // Inverts the arc-length table: given how far through the segment we are in
    // time, returns the local u that sits that same fraction along by distance.
    // ------------------------------------------------------------
    function Na__VsPath__ArcLengthLocalU(table, localS) {
        if (!table) return localS;

        const samples = table.length - 1;
        const target  = Math.max(0, Math.min(1, localS));

        let low = 0;
        let high = samples;
        while (low < high) {                                                 // <-- Binary search for the bracketing samples
            const mid = (low + high) >> 1;
            if (table[mid] < target) low = mid + 1;
            else                     high = mid;
        }

        if (low === 0) return 0;

        const before = table[low - 1];
        const after  = table[low];
        const span   = after - before;
        const within = (span > 0) ? (target - before) / span : 0;            // <-- Interpolate inside the bracket

        return ((low - 1) + within) / samples;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Timeline Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Close an Open Leg and Push It onto the Event List
    // ------------------------------------------------------------
    // Returns the new cursor position in milliseconds.
    // ------------------------------------------------------------
    function Na__VsPath__FlushLeg(events, legSegments, cursorMs, easingName) {
        if (legSegments.length === 0) return cursorMs;                       // <-- Nothing accumulated

        const durationMs = legSegments.reduce((sum, s) => sum + s.durationMs, 0);

        events.push({
            type       : 'leg',
            startMs    : cursorMs,
            durationMs : durationMs,
            easing     : easingName,
            segments   : legSegments.slice()                                 // <-- Snapshot; caller reuses the array
        });

        legSegments.length = 0;                                              // <-- Reset the accumulator in place
        return cursorMs + durationMs;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Time-Addressable Timeline from a Video Record
    // ------------------------------------------------------------
    // Returns null when the video has no usable keyframes.  Otherwise:
    //   {
    //     keyframes, keyCount, closedLoop, totalDurationMs,
    //     curve, positions, quaternions, fovs, events
    //   }
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__BuildTimeline(video) {
        const keyframes = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        if (keyframes.length === 0) return null;                             // <-- Nothing to play

        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const speed    = playback.speedMultiplier > 0 ? playback.speedMultiplier : 1;

        // PARSE | Keyframe camera blocks into runtime value arrays
        // ------------------------------------------------------------
        const positions   = [];
        const quaternions = [];
        const fovs        = [];
        const usableKeys  = [];

        keyframes.forEach((keyframe) => {
            const state = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);
            if (!state) return;                                              // <-- Skip malformed entries silently
            positions.push(state.position);
            quaternions.push(state.quaternion);
            fovs.push(state.fov);
            usableKeys.push(keyframe);
        });

        const keyCount = positions.length;
        if (keyCount === 0) return null;

        // CLOSED LOOP | Needs at least three keyframes to describe a circuit
        // ------------------------------------------------------------
        const closedLoop = playback.closedLoop && keyCount >= Na__VsPath__MIN_CLOSED_KEYS;

        // SINGLE KEYFRAME | A static shot, not a path
        // ------------------------------------------------------------
        if (keyCount === 1) {
            const holdMs = Math.max(
                Na__VsPath__SINGLE_KEY_MS,
                usableKeys[0].VideoStudio__Keyframe__HoldMs || 0
            );
            return {
                keyframes       : usableKeys,
                keyCount        : 1,
                closedLoop      : false,
                totalDurationMs : holdMs,
                curve           : null,
                positions, quaternions, fovs,
                events          : [{ type: 'hold', keyIndex: 0, startMs: 0, durationMs: holdMs }]
            };
        }

        // CURVE | Centripetal CatmullRom through every keyframe position
        // ------------------------------------------------------------
        const curve = new THREE.CatmullRomCurve3(
            positions,
            closedLoop,
            Na__VsPath__CURVE_TYPE,
            Na__VsPath__CURVE_TENSION
        );

        // ARC LENGTH | One table per segment so time converts to distance
        // ------------------------------------------------------------
        const segmentCount = closedLoop ? keyCount : keyCount - 1;
        const divisor      = closedLoop ? keyCount : keyCount - 1;
        const arcTables    = [];

        for (let i = 0; i < segmentCount; i++) {
            arcTables.push(Na__VsPath__BuildSegmentArcTable(curve, i, divisor));
        }

        // EVENTS | Walk the keyframes accumulating legs, breaking on holds
        // ------------------------------------------------------------
        const events      = [];
        const legSegments = [];
        let   cursorMs    = 0;

        for (let i = 0; i < keyCount; i++) {
            const holdMs = Math.max(0, usableKeys[i].VideoStudio__Keyframe__HoldMs || 0);

            if (holdMs > 0) {
                // A hold terminates the leg that arrives here, then parks the camera.
                cursorMs = Na__VsPath__FlushLeg(events, legSegments, cursorMs, playback.easing);
                events.push({ type: 'hold', keyIndex: i, startMs: cursorMs, durationMs: holdMs });
                cursorMs += holdMs;
            }

            if (i < segmentCount) {
                const rawMs = usableKeys[i].VideoStudio__Keyframe__SegmentMs;
                legSegments.push({
                    segIndex   : i,
                    durationMs : Math.max(1, (Number.isFinite(rawMs) ? rawMs : playback.defaultSegmentMs) / speed)
                });
            }
        }

        cursorMs = Na__VsPath__FlushLeg(events, legSegments, cursorMs, playback.easing);

        return {
            keyframes       : usableKeys,
            keyCount        : keyCount,
            closedLoop      : closedLoop,
            totalDurationMs : cursorMs,
            curve           : curve,
            arcTables       : arcTables,
            positions, quaternions, fovs,
            events          : events
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Path Sampling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Camera State Snapped to One Keyframe Index
    // ------------------------------------------------------------
    function Na__VsPath__StateAtKeyIndex(timeline, keyIndex) {
        const index = Math.max(0, Math.min(timeline.keyCount - 1, keyIndex));

        return {
            position   : timeline.positions[index].clone(),
            quaternion : timeline.quaternions[index].clone(),
            fov        : timeline.fovs[index]
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Segment Index and Local Progress to Curve u
    // ------------------------------------------------------------
    // CatmullRomCurve3.getPoint maps u linearly across segments: for an open
    // curve of N points there are N-1 segments, for a closed curve N.  That
    // makes the segment-to-u mapping exact rather than approximate.
    // ------------------------------------------------------------
    function Na__VsPath__SegmentToCurveU(timeline, segIndex, localS) {
        const divisor = timeline.closedLoop ? timeline.keyCount : (timeline.keyCount - 1);
        if (divisor <= 0) return 0;
        return Math.max(0, Math.min(1, (segIndex + localS) / divisor));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sample a Leg Event at an Elapsed Time Within It
    // ------------------------------------------------------------
    function Na__VsPath__SampleLeg(timeline, leg, timeMs) {
        const rampIntegral = Na__VideoStudio__PathSampler__ResolveEasing(leg.easing);

        // WARP | Accelerate / cruise / decelerate across the leg as a whole, so
        // the camera never stops at an intermediate keyframe but authored
        // travel times still hold through the cruise.
        const target = Na__VsPath__WarpLegTime(timeMs - leg.startMs, leg.durationMs, rampIntegral);

        // DISTRIBUTE | Find which segment that effective time lands in, so each
        // segment still consumes exactly the travel time it was authored with.
        let accumulated = 0;
        let segment     = leg.segments[leg.segments.length - 1];
        let localS      = 1;

        for (let i = 0; i < leg.segments.length; i++) {
            const candidate = leg.segments[i];
            if (target <= accumulated + candidate.durationMs || i === leg.segments.length - 1) {
                segment = candidate;
                localS  = candidate.durationMs > 0
                    ? Math.max(0, Math.min(1, (target - accumulated) / candidate.durationMs))
                    : 1;
                break;
            }
            accumulated += candidate.durationMs;
        }

        const segIndex  = segment.segIndex;
        const nextIndex = timeline.closedLoop
            ? (segIndex + 1) % timeline.keyCount
            : Math.min(segIndex + 1, timeline.keyCount - 1);

        // POSITION | Arc-length corrected so an even share of the segment's
        // time covers an even share of its distance, not of its parameter.
        const arcS     = Na__VsPath__ArcLengthLocalU(timeline.arcTables[segIndex], localS);
        const u        = Na__VsPath__SegmentToCurveU(timeline, segIndex, arcS);
        const position = timeline.curve.getPoint(u);

        // ORIENTATION | Shortest-arc slerp between the bounding keyframes.
        // Driven by TIME rather than distance so the turn completes evenly over
        // the segment's authored duration; a shot that pivots on the spot has
        // almost no arc length to drive it and would otherwise snap.
        const quaternion = new THREE.Quaternion().slerpQuaternions(
            timeline.quaternions[segIndex],
            timeline.quaternions[nextIndex],
            localS
        );

        // FIELD OF VIEW | Linear across the segment so dolly zooms read evenly
        const fov = THREE.MathUtils.lerp(timeline.fovs[segIndex], timeline.fovs[nextIndex], localS);

        return { position, quaternion, fov };
    }
    // ------------------------------------------------------------


    // FUNCTION | Sample Camera State at a Time in Milliseconds
    // ------------------------------------------------------------
    // Returns { position (units), quaternion, fov }.  Times before zero clamp
    // to the start, times past the end clamp to the final frame, so callers
    // never have to special-case the boundaries.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__SampleAtTime(timeline, timeMs) {
        if (!timeline || !timeline.events || timeline.events.length === 0) return null;

        const t = Math.max(0, Math.min(timeline.totalDurationMs, timeMs));

        for (let i = 0; i < timeline.events.length; i++) {
            const event = timeline.events[i];
            const isLast = (i === timeline.events.length - 1);

            if (t > event.startMs + event.durationMs && !isLast) continue;   // <-- Not this event; keep walking

            if (event.type === 'hold') {
                return Na__VsPath__StateAtKeyIndex(timeline, event.keyIndex);
            }
            return Na__VsPath__SampleLeg(timeline, event, t);
        }

        return Na__VsPath__StateAtKeyIndex(timeline, timeline.keyCount - 1);  // <-- Defensive: park on the final keyframe
    }
    // ------------------------------------------------------------


    // FUNCTION | Sample Evenly Spaced Points Along the Whole Curve
    // ------------------------------------------------------------
    // Used by the viewport path visualiser to build the fat line geometry.
    // Returns an array of THREE.Vector3 in scene units, or an empty array.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__GetCurvePoints(timeline, divisions) {
        if (!timeline || !timeline.curve) return [];

        const count = Math.max(2, Math.floor(divisions) || 2);
        return timeline.curve.getPoints(count);                              // <-- Returns count + 1 points
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Duration in Milliseconds as m:ss
    // ------------------------------------------------------------
    function Na__VideoStudio__PathSampler__FormatDuration(durationMs) {
        const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
        const minutes      = Math.floor(totalSeconds / 60);
        const seconds      = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Camera Path Sampler API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__PathSampler__EASING_OPTIONS,
        Na__VideoStudio__PathSampler__SetSensorHeightMm,
        Na__VideoStudio__PathSampler__FovToFocalMm,
        Na__VideoStudio__PathSampler__FocalMmToFov,
        Na__VideoStudio__Camera__CaptureCurrentCameraState,
        Na__VideoStudio__Camera__ParseKeyframeState,
        Na__VideoStudio__Camera__ApplyCameraState,
        Na__VideoStudio__Camera__ApplyKeyframe,
        Na__VideoStudio__PathSampler__ResolveEasing,
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__SampleAtTime,
        Na__VideoStudio__PathSampler__GetCurvePoints,
        Na__VideoStudio__PathSampler__FormatDuration
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
