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
    // sceneIndex   {number} - index used for ID and Order if not derivable from name
    // thumbUrl     {string} - resolved thumbnail URL (R2-first)
    // Returns a PresentationMode__SavedCameraScenes scene object or null.
    // ------------------------------------------------------------
    function Na__SketchUp__ConvertSceneData__ConvertScene(sceneEntry, sceneIndex, thumbUrl) {
        if (!sceneEntry || !sceneEntry.camera) return null;

        const cam        = sceneEntry.camera;
        const eyeSu      = cam.eye;
        const targetSu   = cam.target;

        if (!eyeSu || !targetSu) return null;

        const eyeThree    = na_axis_swap(eyeSu);
        const targetThree = na_axis_swap(targetSu);
        const euler       = na_euler_from_look(eyeThree, targetThree);
        const sceneId     = `${Na__SketchUp__Convert__SCENE_ID_PREFIX}${sceneIndex + 1}`;

        return {
            PresentationMode__Scene__Id        : sceneId,                    // <-- Auto-generated unique ID
            PresentationMode__Scene__Name      : sceneEntry.scene_name || `Scene ${sceneIndex + 1}`,
            PresentationMode__Scene__Order     : sceneIndex + 1,             // <-- Preserve SketchUp scene order
            PresentationMode__Scene__ThumbnailUrl : thumbUrl || '',          // <-- R2-first thumbnail
            PresentationMode__Scene__CameraPosition: {
                Camera__DefaultPos: {
                    Camera__DefaultPos__PosX  : na_round(eyeThree.x),
                    Camera__DefaultPos__PosY  : na_round(eyeThree.y),
                    Camera__DefaultPos__PosZ  : na_round(eyeThree.z)
                },
                Camera__DefaultTarget: {
                    Camera__DefaultTarget__TargetX : na_round(targetThree.x),
                    Camera__DefaultTarget__TargetY : na_round(targetThree.y),
                    Camera__DefaultTarget__TargetZ : na_round(targetThree.z)
                },
                Camera__DefaultRotation: {
                    Camera__DefaultRotation__RotX  : na_round(euler.pitch, 6),
                    Camera__DefaultRotation__RotY  : na_round(euler.yaw,   6),
                    Camera__DefaultRotation__RotZ  : 0
                }
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert An Entire SketchUp Camera Block Into a SavedCameraScenes Block
    // ------------------------------------------------------------
    // block          {object}   - ValeVison3D__SketchUpCameraData from projectData
    // resolvedUrls   {Array}    - output of Na__SketchUp__LoadSceneData__ResolveSceneUrls
    // Returns the full PresentationMode__SavedCameraScenes block or null.
    // ------------------------------------------------------------
    function Na__SketchUp__ConvertSceneData__ConvertBlock(block, resolvedUrls) {
        if (!block || !Array.isArray(block.scenes) || block.scenes.length === 0) return null;

        const urlMap = new Map(
            (resolvedUrls || []).map(entry => [entry.scene && entry.scene.scene_name, entry.thumbUrl])
        );

        const convertedScenes = block.scenes
            .map((entry, idx) => Na__SketchUp__ConvertSceneData__ConvertScene(
                entry,
                idx,
                urlMap.get(entry.scene_name) || ''
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
