// =============================================================================
// VALEVISION3D - VIDEO STUDIO - KEYFRAME AND PRESENTATION SCENE CONVERSIONS
// =============================================================================
//
// FILE       : Na__VideoStudio__Convert__PresentationScenes.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Keyframe <-> Presentation Scene Conversions
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Make a new Presentation scene from a Video Studio keyframe, and
//              a new keyframe from a Presentation scene
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Keyframes and Presentation scenes are both a framed shot of the model,
//   kept in two places for two jobs: one is a waypoint on a film, the other a
//   card in the Views carousel. A good shot found in either is wanted in the
//   other, and until now the only way across was to stand the camera there
//   again by hand and capture it a second time.
// - Each direction makes a NEW record from a copy of the other. Nothing links
//   them afterwards and nothing is kept in step: changing or deleting either
//   leaves the other exactly as it was made.
// - Keyframe To Presentation Scene is the last item on a timeline tile's
//   right-click menu. Presentation Scene To Keyframe is the last button on an
//   open row of the Presentation Scenes panel, and adds the keyframe to the
//   end of the path open in the Video Studio.
//
// WHAT GOES ACROSS:
// - The camera block (position, aim, field of view) is the same format on
//   both sides and is copied. The lens follows the field of view.
// - Navigation mode: a keyframe's 'Orbit' | 'Fly' | 'Walk' and a scene's
//   'fly' | 'walk' (orbit being the absent key).
// - Timing: a keyframe's travel time and a scene's move time are both "how
//   long the camera flies". A value left at its own side's default becomes
//   the other side's default, because the two defaults suit two different
//   jobs (a five second leg of film, a 1.8 second hop between cards); a value
//   someone set is carried, clamped to what the other side allows.
// - Keyframe to scene only: the path's model layers (over the live layers,
//   as the Video Studio renders them), the live lighting the keyframe renders
//   in, the path's easing when the carousel offers it, and a thumbnail
//   rendered at the keyframe's pose. The scene is saved at once, as Add Scene
//   From Camera saves.
// - Scene to keyframe only: an orbit scene's aim is taken from its orbit
//   target, because that is what the carousel frames it by. Model layers,
//   lighting and easing are set per path in the Video Studio, not per
//   keyframe, so they stay with the scene. The keyframe joins the path in
//   memory like a K capture, one Ctrl+Z step, kept by Save Video Settings.
// - Neither side has a home for a keyframe's hold or door animation, or a
//   scene's group, so those are not carried.
//
// INTEGRATION:
// - Na__VideoStudio__DevMenu__Controls calls Initialize, which registers the
//   scene-to-keyframe handler with the Presentation Scenes editor.
// - Na__VideoStudio__Timeline__ContextMenu calls KeyframeToPresentationScene.
// - The Presentation Scenes editor files the new scene through its own
//   AddSceneFromRecord, so it is numbered, grouped and saved exactly as a
//   scene added from the camera is.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0 (v2.74.0)
// - Initial implementation.
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
        Na__VideoStudio__ClampSegmentMs,
        Na__VideoStudio__ClampLensMm,
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetSortedKeyframes,
        Na__VideoStudio__ProjectJson__GetPlaybackOptions,
        Na__VideoStudio__ProjectJson__GetModelLayerOptions,
        Na__VideoStudio__ProjectJson__AddKeyframe,
        Na__VideoStudio__ProjectJson__SetActiveKeyframeId
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Camera State and Lens Maths
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__FovToFocalMm,
        Na__VideoStudio__Camera__ParseKeyframeState,
        Na__VideoStudio__Camera__QuaternionToEulerBlock
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Waypoint Edit Undo History
    // @delegate: ./Na__VideoStudio__Edit__UndoHistory.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__UndoHistory__SnapshotKeyframes,
        Na__VideoStudio__UndoHistory__RecordStructure
    } from './Na__VideoStudio__Edit__UndoHistory.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Keyframe Still for the New Scene's Thumbnail
    // @delegate: ./Na__VideoStudio__Timeline__Thumbnails.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__Thumbnails__RenderKeyframeStill } from './Na__VideoStudio__Timeline__Thumbnails.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Scenes Editor (filing a scene, receiving one)
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__AddSceneFromRecord,
        Na__PresentationMode__DevMenu__SetSceneToKeyframeHandler
    } from '../21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Scene Fields (lens, move time bounds, easing names)
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__DevMenu__FovToFocalMm,
        Na__PresentationMode__DevMenu__FocalMmToFov,
        Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS,
        Na__PresentationMode__DevMenu__TRANSITION_MIN_MS,
        Na__PresentationMode__DevMenu__TRANSITION_MAX_MS,
        Na__PresentationMode__DevMenu__EASING_OPTIONS
    } from '../21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js';
    import {
        Na__PresentationMode__KEY__NAVIGATION_MODE,
        Na__PresentationMode__Camera__ResolveSceneNavigationMode
    } from '../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Modes
    // @delegate: ../10__NavigationAndCameras/Na__NavigationModes__Switcher.js
    // ------------------------------------------------------------
    import {
        Na__NavigationModes__NormaliseMode,
        Na__NavigationModes__IsFreeLookMode,
        Na__NavigationModes__GetModeLabel,
        Na__NavigationModes__PlaceLookAheadTarget
    } from '../10__NavigationAndCameras/Na__NavigationModes__Switcher.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Live Model Layers and Lighting (what the keyframe renders in)
    // ------------------------------------------------------------
    import { Na__ModelToggle__CaptureVisibilityMap } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    import { Na__SceneLighting__CaptureIntoScene }   from '../06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Broker (is a 2D drawing on screen?)
    // ------------------------------------------------------------
    import { Na__DrawView__IsActive } from '../40__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | New Scene Thumbnail
    // ------------------------------------------------------------
    const Na__VsConvert__THUMB_WIDTH_PX = 480;     // <-- The Presentation Scenes editor's own thumbnail width
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Orbit Target for a Scene Made From an Orbit Keyframe
    // ------------------------------------------------------------
    // A keyframe has no orbit target; a scene needs one, because the carousel
    // aims the camera at it. Placed along the keyframe's own line of sight so
    // the aim is unchanged, at the distance the preview parks the orbit
    // target when it has nothing better to go on. A walk or fly scene takes
    // the navigation system's own look-ahead instead, as Add Scene From Camera
    // stores it.
    // ------------------------------------------------------------
    const Na__VsConvert__ORBIT_TARGET_UNITS = 8;   // <-- Metres ahead (Na__VsPreview__FALLBACK_ORBIT_DIST)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Scene Easing When the Path's Is Not One the Carousel Offers
    // ------------------------------------------------------------
    const Na__VsConvert__DEFAULT_SCENE_EASING = 'easeInOutCubic';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Wiring from the Dev Menu
    // ------------------------------------------------------------
    let Na__VsConvert__ShowToast      = null;   // <-- Toast callback
    let Na__VsConvert__OnChanged      = null;   // <-- The Dev menu's keyframe refresh: panel, overlay, timeline, preview
    let Na__VsConvert__GetOpenVideoId = null;   // <-- The path open in the Video Studio panel, or null
    // ------------------------------------------------------------


    // MODULE VARIABLES | One Conversion at a Time
    // ------------------------------------------------------------
    // Making a scene renders, uploads and saves, which takes a moment; a
    // second press in that moment would file the same keyframe twice.
    // ------------------------------------------------------------
    let Na__VsConvert__IsBusy = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Emit a Toast, If One Was Wired
    // ------------------------------------------------------------
    function Na__VsConvert__Toast(message, isError) {
        if (typeof Na__VsConvert__ShowToast === 'function') Na__VsConvert__ShowToast(message, !!isError);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deep Copy a Plain JSON Value
    // ------------------------------------------------------------
    function Na__VsConvert__Copy(value) {
        return JSON.parse(JSON.stringify(value));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Number Into a Range
    // ------------------------------------------------------------
    function Na__VsConvert__Clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyframe -> Presentation Scene Record
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Scene's Move Time From a Keyframe's Travel Time
    // ------------------------------------------------------------
    // A travel time left at the path's default becomes the carousel's
    // default; one someone set is carried, inside the Move box's bounds.
    // ------------------------------------------------------------
    function Na__VsConvert__SceneMoveMs(keyframe, playback) {
        const travelMs = keyframe.VideoStudio__Keyframe__SegmentMs;
        if (!Number.isFinite(travelMs) || travelMs === playback.defaultSegmentMs) {
            return Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS;
        }
        return Math.round(Na__VsConvert__Clamp(travelMs,
            Na__PresentationMode__DevMenu__TRANSITION_MIN_MS,
            Na__PresentationMode__DevMenu__TRANSITION_MAX_MS));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Model Layers a Keyframe Is Seen With
    // ------------------------------------------------------------
    // What the Video Studio renders: the live layers, with the path's own
    // layer state laid over them when it has one. Returns null before any
    // layers have loaded, and the scene then carries no map, as a scene
    // added from the camera would not.
    // ------------------------------------------------------------
    function Na__VsConvert__KeyframeLayerMap(video) {
        const map    = { ...(Na__ModelToggle__CaptureVisibilityMap() || {}) };
        const layers = Na__VideoStudio__ProjectJson__GetModelLayerOptions(video);
        if (layers.enabled) Object.assign(map, layers.visibility);

        return Object.keys(map).length > 0 ? map : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Presentation Scene Record From a Keyframe
    // ------------------------------------------------------------
    // Everything but the id, the group and the thumbnail, which the scene
    // editor gives every new scene. The field of view is the one the Video
    // Studio actually renders, read through the same parser it uses, so the
    // scene frames exactly what the keyframe's tile shows.
    //
    // Returns null when the keyframe has no readable camera block.
    // ------------------------------------------------------------
    function Na__VideoStudio__Convert__BuildSceneRecord(video, keyframe, index) {
        const state = Na__VideoStudio__Camera__ParseKeyframeState(keyframe);
        if (!state) return null;

        // CAMERA | Same block on both sides; the FOV made explicit
        const fov    = parseFloat(state.fov.toFixed(4));
        const camera = Na__VsConvert__Copy(keyframe.VideoStudio__Keyframe__CameraPosition);
        camera.Camera__DefaultMisc = { ...(camera.Camera__DefaultMisc || {}), Camera__DefaultMisc__Fov : fov };

        // MODE | Stored raw, as the keyframe holds it, so a fly shot stays a
        // fly scene even on a model that has fly switched off today
        const mode     = Na__NavigationModes__NormaliseMode(keyframe.VideoStudio__Keyframe__CapturedInMode) || 'orbit';
        const freeLook = Na__NavigationModes__IsFreeLookMode(mode);

        // ORBIT TARGET | Along the keyframe's own line of sight
        const target = Na__NavigationModes__PlaceLookAheadTarget(
            state.position, state.quaternion, new THREE.Vector3(),
            freeLook ? undefined : Na__VsConvert__ORBIT_TARGET_UNITS
        );

        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        const easing   = Na__PresentationMode__DevMenu__EASING_OPTIONS.includes(playback.easing)
            ? playback.easing
            : Na__VsConvert__DEFAULT_SCENE_EASING;

        const videoName = video.VideoStudio__Video__Name || 'Video';

        const record = {
            PresentationMode__Scene__Name                        : `${videoName} - Key Frame ${String(index + 1).padStart(2, '0')}`,
            PresentationMode__Scene__LensMm                      : Math.round(Na__PresentationMode__DevMenu__FovToFocalMm(fov)),
            PresentationMode__Scene__TransitionTimeToNextSceneMs : Na__VsConvert__SceneMoveMs(keyframe, playback),
            PresentationMode__Scene__TransitionEasing            : easing,
            PresentationMode__Scene__CameraPosition              : camera,
            PresentationMode__Scene__OrbitHelperCubePosition     : {
                OrbitHelperCube__Position__Description : 'Scene orbit target position. Values are integer millimetres; convert to 3D units in code.',
                OrbitHelperCube__Position__PosX        : Math.round(Na__Math__ConvertUnitsToMm(target.x)),
                OrbitHelperCube__Position__PosY        : Math.round(Na__Math__ConvertUnitsToMm(target.y)),
                OrbitHelperCube__Position__PosZ        : Math.round(Na__Math__ConvertUnitsToMm(target.z))
            }
        };

        if (freeLook) record[Na__PresentationMode__KEY__NAVIGATION_MODE] = mode;   // <-- Orbit is the absent key

        const layerMap = Na__VsConvert__KeyframeLayerMap(video);
        if (layerMap) record.PresentationMode__Scene__ModelLayerVisibility = layerMap;

        Na__SceneLighting__CaptureIntoScene(record);                         // <-- The light the keyframe renders in; no block when it is the default

        return record;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Presentation Scene -> Keyframe Fields
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Keyframe's Travel Time From a Scene's Move Time
    // ------------------------------------------------------------
    // The mirror of SceneMoveMs: a move time at the carousel's default, or
    // none, becomes the path's default; one someone set is carried.
    // ------------------------------------------------------------
    function Na__VsConvert__KeyframeTravelMs(scene, playback) {
        const moveMs = scene.PresentationMode__Scene__TransitionTimeToNextSceneMs;
        if (!Number.isFinite(moveMs) || moveMs === Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS) {
            return playback.defaultSegmentMs;
        }
        return Na__VideoStudio__ClampSegmentMs(moveMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Aim a Scene Is Actually Shown With
    // ------------------------------------------------------------
    // An orbit scene is framed by its target: the carousel's orbit controls
    // turn the camera to look at it on every update, whatever rotation is
    // stored. So that is the aim the keyframe takes, levelled as a camera on
    // a tripod is. A walk or fly scene is framed along its stored rotation,
    // and so is an orbit scene with no usable target.
    //
    // Returns the Camera__DefaultRotation block to store.
    // ------------------------------------------------------------
    function Na__VsConvert__SceneAim(scene, position) {
        const camera = scene.PresentationMode__Scene__CameraPosition;
        const stored = Na__VsConvert__Copy(camera.Camera__DefaultRotation || {
            Camera__DefaultRotation__RotX : 0,
            Camera__DefaultRotation__RotY : 0,
            Camera__DefaultRotation__RotZ : 0
        });

        const framedBy = Na__PresentationMode__Camera__ResolveSceneNavigationMode(scene);
        const orbit    = scene.PresentationMode__Scene__OrbitHelperCubePosition;
        if (Na__NavigationModes__IsFreeLookMode(framedBy) || !orbit) return stored;

        const target = new THREE.Vector3(
            Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosX || 0),
            Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosY || 0),
            Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosZ || 0)
        );
        if (target.distanceToSquared(position) < 1e-8) return stored;      // <-- Target on the lens: no direction to read

        // LOOK AT | A camera's lookAt matrix, world up, exactly what the
        // orbit controls' update() builds
        const matrix     = new THREE.Matrix4().lookAt(position, target, THREE.Object3D.DEFAULT_UP);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);

        return Na__VideoStudio__Camera__QuaternionToEulerBlock(quaternion);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Keyframe's Camera, Lens, Mode and Travel From a Scene
    // ------------------------------------------------------------
    // Returns { cameraPosition, lensMm, capturedInMode, segmentMs }, or null
    // when the scene has no readable camera position.
    // ------------------------------------------------------------
    function Na__VideoStudio__Convert__BuildKeyframeFields(scene, video) {
        const camera = scene && scene.PresentationMode__Scene__CameraPosition;
        const pos    = camera && camera.Camera__DefaultPos;
        if (!pos) return null;

        const position = new THREE.Vector3(
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosX || 0),
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosY || 0),
            Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosZ || 0)
        );

        // FIELD OF VIEW | The authoritative value. A scene without one shows
        // whatever lens the camera already had, which a keyframe cannot, so
        // its stored lens stands in, and failing that the scene default.
        const storedFov = camera.Camera__DefaultMisc && camera.Camera__DefaultMisc.Camera__DefaultMisc__Fov;
        const fov = Number.isFinite(storedFov)
            ? storedFov
            : Na__PresentationMode__DevMenu__FocalMmToFov(scene.PresentationMode__Scene__LensMm || 45);

        const cameraPosition = {
            Camera__DefaultPos      : Na__VsConvert__Copy(pos),
            Camera__DefaultRotation : Na__VsConvert__SceneAim(scene, position),
            Camera__DefaultMisc     : { Camera__DefaultMisc__Fov : parseFloat(fov.toFixed(4)) }
        };

        // MODE | The scene's own, stored raw: absent reads Orbit
        const rawMode = Na__NavigationModes__NormaliseMode(scene[Na__PresentationMode__KEY__NAVIGATION_MODE]) || 'orbit';

        return {
            cameraPosition,
            lensMm         : Na__VideoStudio__ClampLensMm(Na__VideoStudio__PathSampler__FovToFocalMm(fov)),
            capturedInMode : Na__NavigationModes__GetModeLabel(rawMode),
            segmentMs      : Na__VsConvert__KeyframeTravelMs(scene, Na__VideoStudio__ProjectJson__GetPlaybackOptions(video))
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Conversions
// -----------------------------------------------------------------------------

    // FUNCTION | Make a New Presentation Scene From a Keyframe
    // ------------------------------------------------------------
    // The timeline menu's Keyframe To Presentation Scene. The thumbnail is
    // rendered at the keyframe's pose with the path's layers, invisibly, and
    // the scene is filed and saved by the Presentation Scenes editor into the
    // group the carousel was last showing. The camera does not move.
    //
    // Returns true when a scene was added.
    // ------------------------------------------------------------
    async function Na__VideoStudio__Convert__KeyframeToPresentationScene(videoId, keyframeId) {
        if (Na__VsConvert__IsBusy) return false;

        // A DRAWING OWNS THE RENDERER while it is on screen, so the still
        // would be a picture of the drawing rather than of the shot.
        if (Na__DrawView__IsActive()) {
            Na__VsConvert__Toast('Leave the drawing first, so the keyframe can be photographed for its scene.', true);
            return false;
        }

        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return false;

        const keyframes = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video);
        const index     = keyframes.findIndex(k => k.VideoStudio__Keyframe__Id === keyframeId);
        if (index === -1) return false;

        const keyframe = keyframes[index];
        const record   = Na__VideoStudio__Convert__BuildSceneRecord(video, keyframe, index);
        if (!record) {
            Na__VsConvert__Toast(`Keyframe ${index + 1} has no readable camera, so there is no shot to make a scene from.`, true);
            return false;
        }

        Na__VsConvert__IsBusy = true;

        try {
            const thumbnailBlob = await Na__VideoStudio__Thumbnails__RenderKeyframeStill(video, keyframe, Na__VsConvert__THUMB_WIDTH_PX);
            const filed = await Na__PresentationMode__DevMenu__AddSceneFromRecord(record, { thumbnailBlob });

            if (!filed.scene) {
                Na__VsConvert__Toast('The Presentation scene could not be made. See the console.', true);
                return false;
            }

            const sceneName = filed.scene.PresentationMode__Scene__Name;
            if (!filed.saved) {
                Na__VsConvert__Toast(`Presentation scene "${sceneName}" was added but not saved. Save All in Presentation Scenes will keep it.`, true);
            } else if (!thumbnailBlob) {
                Na__VsConvert__Toast(`Keyframe ${index + 1} is now Presentation scene "${sceneName}", saved. The renderer was busy, `
                    + 'so it has no thumbnail yet: Update All Thumbnails in Presentation Scenes will make one.');
            } else {
                Na__VsConvert__Toast(`Keyframe ${index + 1} is now Presentation scene "${sceneName}", saved to the project.`);
            }
            return true;

        } catch (error) {
            console.error('[VideoStudio] Keyframe To Presentation Scene failed:', error);
            Na__VsConvert__Toast('Keyframe To Presentation Scene failed. See the console.', true);
            return false;

        } finally {
            Na__VsConvert__IsBusy = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a New Keyframe From a Presentation Scene
    // ------------------------------------------------------------
    // The Presentation Scenes panel's Presentation Scene To Keyframe, handed
    // a copy of the row's scene. The keyframe joins the END of the path open
    // in the Video Studio, as K does, and is selected so its tile and marker
    // light up. Recorded as one structural undo step, so Ctrl+Z takes it off
    // again, and held in memory like every other keyframe edit until Save
    // Video Settings. The camera does not move.
    //
    // Returns true when a keyframe was added.
    // ------------------------------------------------------------
    function Na__VideoStudio__Convert__PresentationSceneToKeyframe(scene) {
        const videoId = (typeof Na__VsConvert__GetOpenVideoId === 'function') ? Na__VsConvert__GetOpenVideoId() : null;
        const video   = Na__VideoStudio__ProjectJson__GetVideoById(videoId);

        if (!video) {
            Na__VsConvert__Toast('Open a path in the Video Studio first: the scene joins the end of the path that is open.', true);
            return false;
        }

        const sceneName = (scene && (scene.PresentationMode__Scene__Name || scene.PresentationMode__Scene__Id)) || 'scene';
        const fields    = Na__VideoStudio__Convert__BuildKeyframeFields(scene, video);
        if (!fields) {
            Na__VsConvert__Toast(`"${sceneName}" has no readable camera, so there is no shot to make a keyframe from.`, true);
            return false;
        }

        const before   = Na__VideoStudio__UndoHistory__SnapshotKeyframes(video);
        const keyframe = Na__VideoStudio__ProjectJson__AddKeyframe(videoId, fields.cameraPosition, {
            lensMm         : fields.lensMm,
            capturedInMode : fields.capturedInMode
        });
        if (!keyframe) return false;

        keyframe.VideoStudio__Keyframe__SegmentMs = fields.segmentMs;        // <-- AddKeyframe gave it the path default

        Na__VideoStudio__UndoHistory__RecordStructure({
            videoId,
            before : before || [],
            after  : Na__VideoStudio__UndoHistory__SnapshotKeyframes(video),
            label  : `Keyframe from scene "${sceneName}"`
        });

        Na__VideoStudio__ProjectJson__SetActiveKeyframeId(keyframe.VideoStudio__Keyframe__Id);
        if (typeof Na__VsConvert__OnChanged === 'function') Na__VsConvert__OnChanged(videoId);

        const total = Na__VideoStudio__ProjectJson__GetSortedKeyframes(video).length;
        Na__VsConvert__Toast(`"${sceneName}" is now keyframe ${total} of "${video.VideoStudio__Video__Name}". `
            + 'Save Video Settings to keep it; Ctrl+Z takes it off.');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Conversions to the Dev Menu
    // ------------------------------------------------------------
    // options: { showToast, onChanged, getOpenVideoId }
    //
    // onChanged(videoId) is the Dev menu's keyframe refresh, the same one the
    // timeline menu is given. getOpenVideoId() names the path open in the
    // Video Studio panel, or null. Registering with the Presentation Scenes
    // editor is what puts Presentation Scene To Keyframe on its rows.
    // ------------------------------------------------------------
    function Na__VideoStudio__Convert__Initialize(options) {
        const opts = options || {};

        Na__VsConvert__ShowToast      = opts.showToast      || null;
        Na__VsConvert__OnChanged      = opts.onChanged      || null;
        Na__VsConvert__GetOpenVideoId = opts.getOpenVideoId || null;

        Na__PresentationMode__DevMenu__SetSceneToKeyframeHandler(Na__VideoStudio__Convert__PresentationSceneToKeyframe);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Keyframe <-> Presentation Scene Conversion API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Convert__Initialize,
        Na__VideoStudio__Convert__KeyframeToPresentationScene,
        Na__VideoStudio__Convert__PresentationSceneToKeyframe,
        Na__VideoStudio__Convert__BuildSceneRecord,
        Na__VideoStudio__Convert__BuildKeyframeFields
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
