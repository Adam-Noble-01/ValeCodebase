// =============================================================================
// VALEVISION3D - CAMERA FOLLOW BILLBOARD COMPONENTS
// =============================================================================
//
// FILE       : 3dObjectInteraction__Animation__CameraFollowBillboards__.js
// NAMESPACE  : ValeVision3D
// MODULE     : 3D Object Interactions - Camera Follow Billboard Animation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Rotate 2D billboard vegetation to always face the camera
// CREATED    : 16-Jun-2026
//
// DESCRIPTION:
// - Scans loaded GLB scene graphs for nodes exported with CameraFollowBillboard extras.
// - Reads pivotLocal from baked glTF node extras (00__OriginPoint capture at export).
// - Applies yaw-only rotation around the pivot each rendered frame (PureEngine + MaxEngine).
// - Dual model support: rotates both mesh and linework roots simultaneously.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import * as THREE from 'three';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__CameraFollow__TYPE_BILLBOARD       = 'CameraFollowBillboard';      // <-- glTF extras.type token
    const Na__CameraFollow__Y_AXIS               = new THREE.Vector3(0, 1, 0);   // <-- Y-up rotation axis

    let Na__CameraFollow__Initialized           = false;                         // <-- Init flag
    let Na__CameraFollow__Enabled               = true;                          // <-- Feature enabled flag
    let Na__CameraFollow__ModelGroupsMesh       = [];                            // <-- Mesh category roots
    let Na__CameraFollow__ModelGroupsLinework   = [];                            // <-- Linework category roots

    const Na__CameraFollow__Registry            = new Map();                     // <-- Map<assemblyName, record>

    const Na__CameraFollow__ScratchPivotWorld   = new THREE.Vector3();           // <-- Reusable pivot vector
    const Na__CameraFollow__ScratchRotQuat     = new THREE.Quaternion();       // <-- Reusable rotation quat

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Graph Scanning
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check if Object is a Camera Follow Billboard Node
    // ------------------------------------------------------------
    function Na__CameraFollow__IsBillboardNode(object) {
        const userData = object.userData || {};
        return userData.type === Na__CameraFollow__TYPE_BILLBOARD
            || userData.cameraFollow === true;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Read Pivot Local Position from Node Extras
    // ------------------------------------------------------------
    function Na__CameraFollow__ReadPivotLocal(object) {
        const userData = object.userData || {};
        const pivotArray = userData.pivotLocal;

        if (Array.isArray(pivotArray) && pivotArray.length >= 3) {
            return new THREE.Vector3(pivotArray[0], pivotArray[1], pivotArray[2]);
        }

        return new THREE.Vector3(0, 0, 0);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build a Stable Location Key for Mesh/Linework Pairing
    // ------------------------------------------------------------
    // Multiple billboard instances share an identical node name, so name alone
    // cannot pair a mesh assembly with its linework counterpart. Each instance
    // does, however, occupy a unique world position, so we pair by name + the
    // node's world position (rounded to millimetre precision).
    function Na__CameraFollow__BuildLocationKey(object) {
        object.updateMatrixWorld(true);                                          // <-- Ensure world matrix current
        const worldPos = new THREE.Vector3();
        object.getWorldPosition(worldPos);                                       // <-- Node world position

        const rx = Math.round(worldPos.x * 1000) / 1000;                        // <-- Round X to mm
        const ry = Math.round(worldPos.y * 1000) / 1000;                        // <-- Round Y to mm
        const rz = Math.round(worldPos.z * 1000) / 1000;                        // <-- Round Z to mm

        return `${object.name}|${rx}|${ry}|${rz}`;                              // <-- Composite pairing key
    }
    // ------------------------------------------------------------

    // SUB HELPER FUNCTION | Compute Parent-Space Pivot from Local Pivot
    // ------------------------------------------------------------
    // pivotLocal (from extras) is expressed in the assembly node's own LOCAL
    // space. To rotate the node about that pivot we must express the pivot in
    // the node's PARENT space: pivotParent = position + quaternion * pivotLocal.
    function Na__CameraFollow__ComputePivotParent(object, pivotLocal) {
        const pivotParent = pivotLocal.clone();
        pivotParent.multiply(object.scale);                                      // <-- Apply node scale (component-wise)
        pivotParent.applyQuaternion(object.quaternion);                          // <-- Rotate local offset into parent frame
        pivotParent.add(object.position);                                        // <-- Offset by node translation
        return pivotParent;
    }
    // ------------------------------------------------------------

    // FUNCTION | Scan Scene Graph and Build Billboard Registry
    // ------------------------------------------------------------
    function Na__CameraFollow__ScanForBillboards() {
        Na__CameraFollow__Registry.clear();

        const locationIndex = new Map();                                         // <-- Map<locationKey, record> for pairing

        for (const meshGroup of Na__CameraFollow__ModelGroupsMesh) {
            meshGroup.traverse((object) => {
                if (!Na__CameraFollow__IsBillboardNode(object)) return;

                const pivotLocal = Na__CameraFollow__ReadPivotLocal(object);

                const record = {
                    assemblyName        : object.name,
                    rootObjectMesh      : object,
                    rootObjectLinework  : null,
                    pivotLocalPosition  : pivotLocal,
                    pivotParentPosition : Na__CameraFollow__ComputePivotParent(object, pivotLocal),
                    initialPosition     : object.position.clone(),
                    initialQuaternion   : object.quaternion.clone(),
                    initialReferenceYaw : 0
                };

                Na__CameraFollow__Registry.set(object.uuid, record);            // <-- Key by UUID (always unique)
                locationIndex.set(Na__CameraFollow__BuildLocationKey(object), record);
                console.log(`[CameraFollow] Registered billboard (mesh): "${object.name}"`);
            });
        }

        for (const lineworkGroup of Na__CameraFollow__ModelGroupsLinework) {
            lineworkGroup.traverse((object) => {
                if (!Na__CameraFollow__IsBillboardNode(object)) return;

                const locationKey = Na__CameraFollow__BuildLocationKey(object);
                const record      = locationIndex.get(locationKey);

                if (!record) {
                    console.warn(`[CameraFollow] Linework billboard "${object.name}" has no mesh counterpart at its location, skipping`);
                    return;
                }

                record.rootObjectLinework = object;
                console.log(`[CameraFollow] Linked linework for billboard: "${object.name}"`);
            });
        }

        console.log(`[CameraFollow] Scan complete. ${Na__CameraFollow__Registry.size} billboard(s) found.`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pivot Rotation and Per-Frame Update
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Yaw Rotation Around Pivot to Root Objects
    // ------------------------------------------------------------
    function Na__CameraFollow__ApplyPivotRotation(record, angleRad) {
        const pivot   = record.pivotParentPosition;                             // <-- Pivot in node parent space
        const targets = [record.rootObjectMesh, record.rootObjectLinework].filter(Boolean);

        Na__CameraFollow__ScratchRotQuat.setFromAxisAngle(Na__CameraFollow__Y_AXIS, angleRad);

        for (const rootObject of targets) {
            rootObject.position.copy(record.initialPosition);
            rootObject.quaternion.copy(record.initialQuaternion);

            rootObject.position.sub(pivot);
            rootObject.position.applyQuaternion(Na__CameraFollow__ScratchRotQuat);
            rootObject.position.add(pivot);

            rootObject.quaternion.premultiply(Na__CameraFollow__ScratchRotQuat);
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Compute Camera Yaw Relative to Initial Reference
    // ------------------------------------------------------------
    function Na__CameraFollow__ComputeCameraYawDelta(record, camera) {
        const rootObject = record.rootObjectMesh;
        if (!rootObject) return 0;

        rootObject.updateMatrixWorld(true);
        Na__CameraFollow__ScratchPivotWorld.copy(record.pivotLocalPosition);
        rootObject.localToWorld(Na__CameraFollow__ScratchPivotWorld);

        const dx = camera.position.x - Na__CameraFollow__ScratchPivotWorld.x;
        const dz = camera.position.z - Na__CameraFollow__ScratchPivotWorld.z;
        const cameraYaw = Math.atan2(dx, dz);

        return cameraYaw - record.initialReferenceYaw;
    }
    // ------------------------------------------------------------

    // FUNCTION | Update All Camera Follow Billboards (called per frame)
    // ------------------------------------------------------------
    function Na__CameraFollow__Update(camera) {
        if (!Na__CameraFollow__Initialized || !Na__CameraFollow__Enabled) return;
        if (!camera || Na__CameraFollow__Registry.size === 0) return;

        Na__CameraFollow__Registry.forEach((record) => {
            const angleRad = Na__CameraFollow__ComputeCameraYawDelta(record, camera);
            Na__CameraFollow__ApplyPivotRotation(record, angleRad);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Capture Initial Camera Yaw Reference for All Billboards
    // ------------------------------------------------------------
    function Na__CameraFollow__CaptureInitialReferenceYaw(camera) {
        Na__CameraFollow__Registry.forEach((record) => {
            record.initialReferenceYaw = Na__CameraFollow__ComputeCameraYawDelta(record, camera);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization and Exports
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Camera Follow Billboard System
    // ------------------------------------------------------------
    function Na__CameraFollow__Initialize(meshGroups, lineworkGroups, config, camera) {
        if (Na__CameraFollow__Initialized) {
            console.warn('[CameraFollow] Already initialized, re-scanning');
            Na__CameraFollow__ScanForBillboards();
            if (camera && Na__CameraFollow__Registry.size > 0) {
                Na__CameraFollow__CaptureInitialReferenceYaw(camera);
            }
            return Na__CameraFollow__Registry.size;
        }

        Na__CameraFollow__ModelGroupsMesh     = Array.isArray(meshGroups)     ? meshGroups     : (meshGroups     ? [meshGroups]     : []);
        Na__CameraFollow__ModelGroupsLinework = Array.isArray(lineworkGroups) ? lineworkGroups : (lineworkGroups ? [lineworkGroups] : []);

        if (config) {
            Na__CameraFollow__Enabled = config['3dObject__Interaction__CameraFollow__Enabled'] !== false;
        }

        Na__CameraFollow__ScanForBillboards();

        if (camera && Na__CameraFollow__Registry.size > 0) {
            Na__CameraFollow__CaptureInitialReferenceYaw(camera);
        }

        Na__CameraFollow__Initialized = true;
        console.log('[CameraFollow] Camera-follow billboard system initialized');
        return Na__CameraFollow__Registry.size;                                  // <-- Number of billboards registered
    }
    // ------------------------------------------------------------

    // FUNCTION | Check if Any Billboards Are Registered
    // ------------------------------------------------------------
    function Na__CameraFollow__HasActive() {
        return Na__CameraFollow__Initialized
            && Na__CameraFollow__Enabled
            && Na__CameraFollow__Registry.size > 0;
    }
    // ------------------------------------------------------------

    export {
        Na__CameraFollow__Initialize,
        Na__CameraFollow__Update,
        Na__CameraFollow__HasActive,
        Na__CameraFollow__ScanForBillboards,
        Na__CameraFollow__Registry
    };

// endregion -------------------------------------------------------------------
