// =============================================================================
// VALEVISION3D - SKETCHUP TO VALEVISION - CONVERT SCENE DATA
// =============================================================================
//
// FILE       : Na__SketchUp__ConvertSceneData__.js
// NAMESPACE  : Na__SketchUp
// MODULE     : ConvertSceneData
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Convert SketchUp Z-up mm camera data into the
//              PresentationMode__SavedCameraScenes scene schema (Y-up, mm)
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - SketchUp stores camera data in Z-up orientation. Three.js uses Y-up.
// - Axis swap for position / target point vectors (already in mm from Ruby):
//     Three.X = SketchUp.x
//     Three.Y = SketchUp.z
//     Three.Z = -SketchUp.y
// - Euler angles (radians, XYZ order) are derived from the converted look
//   direction using the standard pitch/yaw formula:
//     look_three = normalize(target_three - eye_three)
//     pitch  = asin(look_three.Y)
//     yaw    = atan2(-look_three.X, -look_three.Z)
//     roll   = 0  (no roll for standard cameras)
// - FOV is passed through as-is from SketchUp (degrees, vertical).
// - The resulting scene object matches the PresentationMode__SavedCameraScenes
//   schema validated by Na__PresentationMode__ProjectJson__SceneData.js.
//
// AXIS-SWAP SIGN NOTE:
// The sign (x, z, -y) was confirmed against the Clough reference model where
// the exported GLBs are rotated -90° around X by the GLB exporter to convert
// SketchUp Z-up to Y-up. One full round-trip test confirmed correct framing
// before this module was finalised.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 25-Jun-2026 - Version 1.0.0
// - Initial axis-swap + Euler derivation scaffolding.
//
// 25-Jun-2026 - Version 1.0.1
// - Emits PresentationMode__Scene__OrbitHelperCubePosition (the actual orbit
//   target the SceneTransition runtime feeds OrbitControls) instead of the
//   deprecated Camera__DefaultTarget key that the runtime ignores.
// - Adds vertical-FOV resolution (horizontal->vertical via aspect ratio) and
//   derives stable scene Id/Order from the IMG## number.
// - Stores the RELATIVE 524p thumbnail filename so the carousel handles the
//   R2-first + GH-fallback resolution.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Conversion Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Axis Swap and Euler Derivation
    // ------------------------------------------------------------
    const Na__SketchUp__Convert__SCENE_ID_PREFIX  = 'su_scene_';  // <-- Auto-generated scene ID prefix
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Convert One SketchUp Scene Into a PresentationMode Scene Object
    // ------------------------------------------------------------
    // sceneEntry   {object} - one item from ValeVison3D__SketchUpCameraData.scenes
    // sceneIndex   {number} - fallback index for ID and Order if not derivable from name
    // thumbName    {string} - RELATIVE 524p thumbnail filename (carousel resolves R2-first)
    // Returns a PresentationMode__SavedCameraScenes scene object or null.
    // ------------------------------------------------------------
    function Na__SketchUp__ConvertSceneData__ConvertScene(sceneEntry, sceneIndex, thumbName) {
        if (!sceneEntry || !sceneEntry.camera) return null;

        const cam        = sceneEntry.camera;
        const eyeSu      = cam.eye;
        const targetSu   = cam.target;

        if (!eyeSu || !targetSu) return null;

        const eyeThree    = na_axis_swap(eyeSu);
        const targetThree = na_axis_swap(targetSu);
        const euler       = na_euler_from_look(eyeThree, targetThree);
        const fovVertical = na_vertical_fov(cam);
        const sceneNumber = na_scene_number_from_name(sceneEntry.scene_name, sceneIndex); // <-- IMG## number or index+1
        const sceneId     = `${Na__SketchUp__Convert__SCENE_ID_PREFIX}${sceneNumber}`;

        // NOTE: Under OrbitControls the camera framing is driven by the orbit
        // target (PresentationMode__Scene__OrbitHelperCubePosition), which the
        // SceneTransition runtime feeds into controls.target.  The Euler rotation
        // is retained for the instant-apply path; Camera__DefaultTarget is NOT
        // part of the runtime schema and is intentionally omitted.
        return {
            PresentationMode__Scene__Id        : sceneId,                    // <-- Stable ID keyed off IMG## number
            PresentationMode__Scene__Name      : sceneEntry.scene_name || `Scene ${sceneNumber}`,
            PresentationMode__Scene__Order     : sceneNumber,                // <-- Preserve SketchUp IMG## order
            PresentationMode__Scene__ThumbnailUrl : thumbName || '',         // <-- Relative 524p thumbnail filename
            PresentationMode__Scene__CameraPosition: {
                Camera__DefaultPos: {
                    Camera__DefaultPos__PosX  : na_round(eyeThree.x, 0),     // <-- Integer mm (matches canonical save)
                    Camera__DefaultPos__PosY  : na_round(eyeThree.y, 0),
                    Camera__DefaultPos__PosZ  : na_round(eyeThree.z, 0)
                },
                Camera__DefaultRotation: {
                    Camera__DefaultRotation__RotX  : na_round(euler.pitch, 4),
                    Camera__DefaultRotation__RotY  : na_round(euler.yaw,   4),
                    Camera__DefaultRotation__RotZ  : 0
                },
                Camera__DefaultMisc: {
                    Camera__DefaultMisc__Fov  : na_round(fovVertical, 4)     // <-- Vertical FOV (Three.js convention)
                }
            },
            PresentationMode__Scene__OrbitHelperCubePosition: {
                OrbitHelperCube__Position__Description : 'Scene orbit target position derived from SketchUp camera.target. Values are integer millimetres; convert to 3D units in code.',
                OrbitHelperCube__Position__PosX        : na_round(targetThree.x, 0),
                OrbitHelperCube__Position__PosY        : na_round(targetThree.y, 0),
                OrbitHelperCube__Position__PosZ        : na_round(targetThree.z, 0)
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert An Entire SketchUp Camera Block Into a SavedCameraScenes Block
    // ------------------------------------------------------------
    // block        {object} - ValeVison3D__SketchUpCameraData from projectData
    // sceneFiles   {Array}  - output of Na__SketchUp__LoadSceneData__ResolveSceneFiles
    //                         ({ scene_name, imageName, thumbName })
    // Returns the full PresentationMode__SavedCameraScenes block or null.
    // ------------------------------------------------------------
    function Na__SketchUp__ConvertSceneData__ConvertBlock(block, sceneFiles) {
        if (!block || !Array.isArray(block.scenes) || block.scenes.length === 0) return null;

        const thumbMap = new Map(
            (sceneFiles || []).map(entry => [entry.scene_name, entry.thumbName])
        );

        const convertedScenes = block.scenes
            .map((entry, idx) => Na__SketchUp__ConvertSceneData__ConvertScene(
                entry,
                idx,
                thumbMap.get(entry.scene_name) || ''
            ))
            .filter(Boolean);                                                // <-- Discard any null entries

        if (convertedScenes.length === 0) return null;

        return {
            PresentationMode__SavedCameraScenes__Enabled        : true,
            PresentationMode__SavedCameraScenes__Source         : 'SketchUpCameraData', // <-- Provenance marker
            PresentationMode__SavedCameraScenes__DefaultSceneId : convertedScenes[0].PresentationMode__Scene__Id,
            PresentationMode__SavedCameraScenes__Scenes         : convertedScenes
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Axis Swap and Euler Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Derive Scene Number From IMG## Scene Name
    // ------------------------------------------------------------
    // "IMG02__3dView__..." -> 2.  Falls back to sceneIndex + 1 when the scene
    // name has no IMG## token, keeping IDs and ordering stable and predictable.
    // ------------------------------------------------------------
    function na_scene_number_from_name(sceneName, sceneIndex) {
        const match = typeof sceneName === 'string' ? sceneName.match(/^IMG(\d{2,3})/i) : null;
        if (match) {
            const parsed = parseInt(match[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) return parsed;        // <-- Use the IMG## number
        }
        return sceneIndex + 1;                                               // <-- Fallback to capture order
    }

    // HELPER FUNCTION | Apply SketchUp Z-up -> Three.js Y-up Axis Swap
    // ------------------------------------------------------------
    // Swap: Three = (su.x, su.z, -su.y)
    // This matches the -90° X rotation baked into exported GLBs by GlbBuilderUtility.
    // ------------------------------------------------------------
    function na_axis_swap(suPoint) {
        return {
            x:  suPoint.x,
            y:  suPoint.z,
            z: -suPoint.y
        };
    }

    // HELPER FUNCTION | Derive Euler Pitch and Yaw From Look Direction (Y-up)
    // ------------------------------------------------------------
    // look_three = normalize(target - eye) in Y-up Three.js coordinates
    // pitch  = asin(look_three.y)                    — rotation around X
    // yaw    = atan2(-look_three.x, -look_three.z)   — rotation around Y
    // roll   = 0                                     — no roll
    // ------------------------------------------------------------
    function na_euler_from_look(eyeThree, targetThree) {
        const dx = targetThree.x - eyeThree.x;
        const dy = targetThree.y - eyeThree.y;
        const dz = targetThree.z - eyeThree.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (len < 0.0001) return { pitch: 0, yaw: 0 };                      // <-- Degenerate case: eye === target

        const nx = dx / len;
        const ny = dy / len;
        const nz = dz / len;

        const pitch = Math.asin(Math.max(-1, Math.min(1, ny)));             // <-- Clamp to [-1, 1] for asin stability
        const yaw   = Math.atan2(-nx, -nz);

        return { pitch, yaw };
    }

    // HELPER FUNCTION | Resolve Vertical FOV (Three.js Convention) From SketchUp Camera
    // ------------------------------------------------------------
    // SketchUp reports fov_degrees with fov_is_height indicating orientation:
    //   fov_is_height === true  -> vertical FOV   -> pass through unchanged.
    //   fov_is_height === false -> horizontal FOV -> convert to vertical using
    //                              aspect_ratio:  vFov = 2·atan(tan(hFov/2) / aspect).
    // Three.js PerspectiveCamera.fov is always vertical, so we normalise here.
    // Falls back to pass-through when aspect_ratio is missing or non-positive
    // (0.0 means "match the View" in the SketchUp API — unknown at capture time).
    // ------------------------------------------------------------
    function na_vertical_fov(cam) {
        const fov = Number.isFinite(cam.fov_degrees) ? cam.fov_degrees : 30;  // <-- Sensible default
        if (cam.fov_is_height === true) return fov;                           // <-- Already vertical

        const aspect = Number.isFinite(cam.aspect_ratio) ? cam.aspect_ratio : 0;
        if (aspect <= 0) return fov;                                          // <-- Cannot convert; keep as-is

        const hRad   = (fov * Math.PI) / 180;
        const vRad   = 2 * Math.atan(Math.tan(hRad / 2) / aspect);            // <-- Horizontal -> vertical
        return (vRad * 180) / Math.PI;
    }

    // HELPER FUNCTION | Round a Number to N Decimal Places
    // ------------------------------------------------------------
    function na_round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Convert Scene Data API
    // ------------------------------------------------------------
    export {
        Na__SketchUp__ConvertSceneData__ConvertScene,
        Na__SketchUp__ConvertSceneData__ConvertBlock
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
