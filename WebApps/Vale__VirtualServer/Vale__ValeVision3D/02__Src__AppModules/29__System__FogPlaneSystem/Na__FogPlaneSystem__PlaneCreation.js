// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - PLANE CREATION
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__PlaneCreation.js
// NAMESPACE  : Na__FogPlane
// MODULE     : PlaneCreation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : 3D plane mesh creation, face-click placement, and drag interaction
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Creates up to two blue semi-transparent fog planes placed via face-click
//   selection on model geometry (same raycast pattern as Elevation View).
// - Axis detection snaps the horizontal normal to the nearest cardinal axis
//   (X or Z) to determine which slot the plane occupies.
// - Planes are added to Three.js Layer 1 so they render in the overlay pass
//   and are never affected by the fog shader or profile lines.
// - Drag interaction moves the plane along its normal via screen-Y delta.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js and Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Scene References
    // ------------------------------------------------------------
    let Na__FogPlane__Scene      = null;                                         // <-- Main scene reference
    let Na__FogPlane__Camera     = null;                                         // <-- Perspective camera reference
    let Na__FogPlane__Renderer   = null;                                         // <-- WebGL renderer reference
    let Na__FogPlane__Controls   = null;                                         // <-- Orbit controls reference
    let Na__FogPlane__ModelRoot  = null;                                         // <-- Model root group for raycasting
    let Na__FogPlane__Config     = null;                                         // <-- Visual and interaction config
    // ------------------------------------------------------------

    // MODULE VARIABLES | Raycasting State
    // ------------------------------------------------------------
    const Na__FogPlane__Raycaster    = new THREE.Raycaster();
    const Na__FogPlane__PointerNDC   = new THREE.Vector2();
    let Na__FogPlane__PointerDownX   = 0;
    let Na__FogPlane__PointerDownY   = 0;
    let Na__FogPlane__SelectingSlot  = null;                                     // <-- 'A' or 'B' or null
    // ------------------------------------------------------------

    // MODULE VARIABLES | Plane State (A and B)
    // ------------------------------------------------------------
    const Na__FogPlane__Slots = {
        A: { active: false, group: null, handleMesh: null, normal: new THREE.Vector3(1, 0, 0), positionMm: 0, positionUnits: new THREE.Vector3(), anchorPoint: new THREE.Vector3() },
        B: { active: false, group: null, handleMesh: null, normal: new THREE.Vector3(0, 0, 1), positionMm: 0, positionUnits: new THREE.Vector3(), anchorPoint: new THREE.Vector3() }
    };
    // ------------------------------------------------------------

    // MODULE VARIABLES | Drag State
    // ------------------------------------------------------------
    let Na__FogPlane__IsDragging         = false;
    let Na__FogPlane__DragSlot           = null;
    let Na__FogPlane__DragStartPointerY  = 0;
    let Na__FogPlane__DragStartOffset    = 0;
    let Na__FogPlane__OnDragUpdate       = null;                                 // <-- Callback to notify system logic of position changes
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Layer Index for Overlay Rendering
    // ------------------------------------------------------------
    const NA__FOGPLANE__OVERLAY_LAYER = 1;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Accessors
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read Visual Config Values
    // ------------------------------------------------------------
    function Na__FogPlane__CfgPlaneColor()       { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__PlaneColor       ?? 3381759; }
    function Na__FogPlane__CfgPlaneOpacity()     { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__PlaneOpacity     ?? 0.18; }
    function Na__FogPlane__CfgEdgeColor()        { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__EdgeColor        ?? 2258175; }
    function Na__FogPlane__CfgHandleColor()      { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__HandleColor      ?? 4495359; }
    function Na__FogPlane__CfgHandleOpacity()    { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__HandleOpacity    ?? 0.35; }
    function Na__FogPlane__CfgPlaneSizeMm()      { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__PlaneSizeMm      ?? 60000; }
    function Na__FogPlane__CfgHandleSizeMm()     { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__HandleSizeMm     ?? 4000; }
    function Na__FogPlane__CfgHandleOffsetZ()    { return Na__FogPlane__Config?.FogPlane__Visual__Config?.FogPlane__Visual__Config__HandleOffsetZ    ?? 0.01; }
    function Na__FogPlane__CfgClickThreshold()   { return Na__FogPlane__Config?.FogPlane__Interaction__Config?.FogPlane__Interaction__Config__ClickThresholdPx ?? 4; }
    function Na__FogPlane__CfgDragScale()        { return Na__FogPlane__Config?.FogPlane__Interaction__Config?.FogPlane__Interaction__Config__DragScale ?? 0.02; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Mesh Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Fog Plane Group for a Given Slot
    // ------------------------------------------------------------
    function Na__FogPlane__BuildPlaneGroup(slotId) {
        const slot     = Na__FogPlane__Slots[slotId];
        const planeSize  = Na__Math__ConvertMmToUnits(Na__FogPlane__CfgPlaneSizeMm());
        const handleSize = Na__Math__ConvertMmToUnits(Na__FogPlane__CfgHandleSizeMm());
        const edgeColor  = Na__FogPlane__CfgEdgeColor();

        const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMat  = new THREE.MeshBasicMaterial({
            color       : Na__FogPlane__CfgPlaneColor(),
            opacity     : Na__FogPlane__CfgPlaneOpacity(),
            transparent : true,
            side        : THREE.DoubleSide,
            depthWrite  : false
        });
        const planeMesh = new THREE.Mesh(planeGeom, planeMat);
        planeMesh.name = `Na__FogPlane__Plane_${slotId}`;

        const outerEdgesGeom = new THREE.EdgesGeometry(planeGeom);
        const outerEdges     = new THREE.LineSegments(
            outerEdgesGeom,
            new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 })
        );

        const handleGeom = new THREE.PlaneGeometry(handleSize, handleSize);
        const handleMat  = new THREE.MeshBasicMaterial({
            color       : Na__FogPlane__CfgHandleColor(),
            opacity     : Na__FogPlane__CfgHandleOpacity(),
            transparent : true,
            side        : THREE.DoubleSide,
            depthWrite  : false
        });
        const handleMesh = new THREE.Mesh(handleGeom, handleMat);
        handleMesh.name     = `Na__FogPlane__Handle_${slotId}`;
        handleMesh.position.set(0, 0, Na__FogPlane__CfgHandleOffsetZ());

        const handleEdgesGeom = new THREE.EdgesGeometry(handleGeom);
        const handleEdges     = new THREE.LineSegments(
            handleEdgesGeom,
            new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 })
        );
        handleEdges.position.set(0, 0, Na__FogPlane__CfgHandleOffsetZ());

        const group = new THREE.Group();
        group.name = `Na__FogPlane__Group_${slotId}`;
        group.add(planeMesh);
        group.add(outerEdges);
        group.add(handleMesh);
        group.add(handleEdges);

        slot.group      = group;
        slot.handleMesh = handleMesh;

        return group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Transform
// -----------------------------------------------------------------------------

    // FUNCTION | Update Plane Group Position and Orientation
    // ------------------------------------------------------------
    function Na__FogPlane__UpdatePlaneTransform(slotId) {
        const slot = Na__FogPlane__Slots[slotId];
        if (!slot.group || !slot.anchorPoint) return;

        const position = slot.anchorPoint.clone();
        slot.group.position.copy(position);

        const lookTarget = position.clone().add(slot.normal);
        slot.group.up.set(0, 1, 0);
        slot.group.lookAt(lookTarget);

        slot.positionUnits.copy(position);
        slot.positionMm = Math.round(Na__Math__ConvertUnitsToMm(
            slot.anchorPoint.x * Math.abs(slot.normal.x) +
            slot.anchorPoint.z * Math.abs(slot.normal.z)
        ));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Axis Detection and Face Selection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Snap Normal to Nearest Cardinal Axis (X or Z)
    // ------------------------------------------------------------
    function Na__FogPlane__SnapToCardinalAxis(horizontalNormal) {
        if (Math.abs(horizontalNormal.x) >= Math.abs(horizontalNormal.z)) {
            return new THREE.Vector3(Math.sign(horizontalNormal.x) || 1, 0, 0);
        }
        return new THREE.Vector3(0, 0, Math.sign(horizontalNormal.z) || 1);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine Which Slot an Axis Belongs To
    // ------------------------------------------------------------
    function Na__FogPlane__ResolveSlotForAxis(cardinalNormal) {
        const isXAxis = Math.abs(cardinalNormal.x) > 0.5;

        if (Na__FogPlane__SelectingSlot) {
            return Na__FogPlane__SelectingSlot;
        }

        if (isXAxis) {
            if (!Na__FogPlane__Slots.A.active) return 'A';
            if (!Na__FogPlane__Slots.B.active) return 'B';
            return 'A';
        } else {
            if (!Na__FogPlane__Slots.A.active) return 'A';
            if (!Na__FogPlane__Slots.B.active) return 'B';
            return 'B';
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Process a Face Selection Hit for Fog Plane Placement
    // ------------------------------------------------------------
    function Na__FogPlane__ProcessFaceSelection(hitPoint, worldNormal) {
        const horizontalNormal = new THREE.Vector3(worldNormal.x, 0, worldNormal.z);
        if (horizontalNormal.lengthSq() < 0.001) {
            horizontalNormal.set(0, 0, 1);
        }
        horizontalNormal.normalize();

        const cardinalNormal = Na__FogPlane__SnapToCardinalAxis(horizontalNormal);
        const slotId         = Na__FogPlane__ResolveSlotForAxis(cardinalNormal);

        Na__FogPlane__RemovePlane(slotId);

        const slot    = Na__FogPlane__Slots[slotId];
        slot.active   = true;
        slot.normal.copy(cardinalNormal);
        slot.anchorPoint.copy(hitPoint);

        const group = Na__FogPlane__BuildPlaneGroup(slotId);
        Na__FogPlane__UpdatePlaneTransform(slotId);
        Na__FogPlane__Scene.add(group);

        Na__FogPlane__RemoveSelectionListeners();
        Na__FogPlane__SelectingSlot = null;
        document.body.classList.remove('na-fogplane-selecting');

        Na__FogPlane__AttachDragListeners();

        if (Na__FogPlane__OnDragUpdate) {
            Na__FogPlane__OnDragUpdate(slotId, slot);
        }

        window.dispatchEvent(new CustomEvent('na-fogplane-state-changed', { detail: { slot: slotId, active: true } }));
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Listeners (Click-to-Place)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Selection Pointer Down
    // ------------------------------------------------------------
    function Na__FogPlane__SelectionPointerDown(event) {
        if (event.button !== 0) return;
        Na__FogPlane__PointerDownX = event.clientX;
        Na__FogPlane__PointerDownY = event.clientY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Selection Pointer Up (Raycast on Click)
    // ------------------------------------------------------------
    function Na__FogPlane__SelectionPointerUp(event) {
        if (event.button !== 0) return;

        const threshold = Na__FogPlane__CfgClickThreshold();
        if (Math.abs(event.clientX - Na__FogPlane__PointerDownX) > threshold) return;
        if (Math.abs(event.clientY - Na__FogPlane__PointerDownY) > threshold) return;

        const rect = Na__FogPlane__Renderer.domElement.getBoundingClientRect();
        Na__FogPlane__PointerNDC.x = ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        Na__FogPlane__PointerNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        Na__FogPlane__Raycaster.setFromCamera(Na__FogPlane__PointerNDC, Na__FogPlane__Camera);

        const meshes = [];
        Na__FogPlane__ModelRoot.traverse(child => { if (child.isMesh) meshes.push(child); });
        if (meshes.length === 0) return;

        const hits = Na__FogPlane__Raycaster.intersectObjects(meshes, false);
        if (hits.length === 0) return;

        const hit       = hits[0];
        const faceNormal = hit.face.normal.clone();
        faceNormal.transformDirection(hit.object.matrixWorld);

        Na__FogPlane__ProcessFaceSelection(hit.point.clone(), faceNormal);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Attach Selection Event Listeners
    // ------------------------------------------------------------
    function Na__FogPlane__AttachSelectionListeners() {
        const el = Na__FogPlane__Renderer.domElement;
        el.addEventListener('pointerdown', Na__FogPlane__SelectionPointerDown);
        el.addEventListener('pointerup',   Na__FogPlane__SelectionPointerUp);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Selection Event Listeners
    // ------------------------------------------------------------
    function Na__FogPlane__RemoveSelectionListeners() {
        const el = Na__FogPlane__Renderer.domElement;
        el.removeEventListener('pointerdown', Na__FogPlane__SelectionPointerDown);
        el.removeEventListener('pointerup',   Na__FogPlane__SelectionPointerUp);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drag Interaction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Drag Pointer Down (Start Drag on Handle Hit)
    // ------------------------------------------------------------
    function Na__FogPlane__DragPointerDown(event) {
        if (event.button !== 0 || Na__FogPlane__IsDragging) return;

        const rect = Na__FogPlane__Renderer.domElement.getBoundingClientRect();
        Na__FogPlane__PointerNDC.x = ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        Na__FogPlane__PointerNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        Na__FogPlane__Raycaster.setFromCamera(Na__FogPlane__PointerNDC, Na__FogPlane__Camera);

        for (const id of ['A', 'B']) {
            const slot = Na__FogPlane__Slots[id];
            if (!slot.active || !slot.handleMesh || !slot.group || !slot.group.visible) continue;

            const hits = Na__FogPlane__Raycaster.intersectObject(slot.handleMesh, false);
            if (hits.length > 0) {
                Na__FogPlane__IsDragging        = true;
                Na__FogPlane__DragSlot          = id;
                Na__FogPlane__DragStartPointerY = event.clientY;

                const axisComponent = slot.anchorPoint.x * Math.abs(slot.normal.x)
                                    + slot.anchorPoint.z * Math.abs(slot.normal.z);
                Na__FogPlane__DragStartOffset = axisComponent;

                if (Na__FogPlane__Controls) Na__FogPlane__Controls.enabled = false;
                event.preventDefault();
                return;
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drag Pointer Move (Update Plane Position)
    // ------------------------------------------------------------
    function Na__FogPlane__DragPointerMove(event) {
        if (!Na__FogPlane__IsDragging || !Na__FogPlane__DragSlot) return;

        const slot          = Na__FogPlane__Slots[Na__FogPlane__DragSlot];
        const deltaY        = event.clientY - Na__FogPlane__DragStartPointerY;
        const offsetChange  = deltaY * Na__FogPlane__CfgDragScale();

        slot.anchorPoint.x = slot.normal.x !== 0 ? (Na__FogPlane__DragStartOffset + offsetChange * slot.normal.x) : slot.anchorPoint.x;
        slot.anchorPoint.z = slot.normal.z !== 0 ? (Na__FogPlane__DragStartOffset + offsetChange * slot.normal.z) : slot.anchorPoint.z;

        Na__FogPlane__UpdatePlaneTransform(Na__FogPlane__DragSlot);
        Na__RenderLoop__RequestRender();

        if (Na__FogPlane__OnDragUpdate) {
            Na__FogPlane__OnDragUpdate(Na__FogPlane__DragSlot, slot);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drag Pointer Up (End Drag)
    // ------------------------------------------------------------
    function Na__FogPlane__DragPointerUp() {
        if (!Na__FogPlane__IsDragging) return;

        Na__FogPlane__IsDragging = false;
        Na__FogPlane__DragSlot   = null;
        if (Na__FogPlane__Controls) Na__FogPlane__Controls.enabled = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Attach Drag Event Listeners
    // ------------------------------------------------------------
    function Na__FogPlane__AttachDragListeners() {
        Na__FogPlane__RemoveDragListeners();
        const el = Na__FogPlane__Renderer.domElement;
        el.addEventListener('pointerdown', Na__FogPlane__DragPointerDown);
        el.addEventListener('pointermove', Na__FogPlane__DragPointerMove);
        el.addEventListener('pointerup',   Na__FogPlane__DragPointerUp);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Drag Event Listeners
    // ------------------------------------------------------------
    function Na__FogPlane__RemoveDragListeners() {
        const el = Na__FogPlane__Renderer?.domElement;
        if (!el) return;
        el.removeEventListener('pointerdown', Na__FogPlane__DragPointerDown);
        el.removeEventListener('pointermove', Na__FogPlane__DragPointerMove);
        el.removeEventListener('pointerup',   Na__FogPlane__DragPointerUp);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Plane Creation Module
    // ------------------------------------------------------------
    function Na__FogPlane__InitializePlaneCreation(scene, camera, renderer, controls, modelRoot, config, onDragUpdate) {
        Na__FogPlane__Scene     = scene;
        Na__FogPlane__Camera    = camera;
        Na__FogPlane__Renderer  = renderer;
        Na__FogPlane__Controls  = controls;
        Na__FogPlane__ModelRoot = modelRoot;
        Na__FogPlane__Config    = config;
        Na__FogPlane__OnDragUpdate = onDragUpdate || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Face Selection Mode for a Slot
    // ------------------------------------------------------------
    function Na__FogPlane__StartFaceSelection(slotId) {
        Na__FogPlane__SelectingSlot = slotId || null;
        Na__FogPlane__RemoveDragListeners();
        Na__FogPlane__AttachSelectionListeners();
        document.body.classList.add('na-fogplane-selecting');
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Placed Plane
    // ------------------------------------------------------------
    function Na__FogPlane__RemovePlane(slotId) {
        const slot = Na__FogPlane__Slots[slotId];
        if (!slot) return;

        if (slot.group && Na__FogPlane__Scene) {
            Na__FogPlane__Scene.remove(slot.group);
            slot.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
        slot.group      = null;
        slot.handleMesh = null;
        slot.active     = false;

        window.dispatchEvent(new CustomEvent('na-fogplane-state-changed', { detail: { slot: slotId, active: false } }));
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Plane Mesh Visibility
    // ------------------------------------------------------------
    function Na__FogPlane__SetPlanesVisible(visible) {
        for (const id of ['A', 'B']) {
            const slot = Na__FogPlane__Slots[id];
            if (slot.group) slot.group.visible = visible;
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Plane State for a Slot
    // ------------------------------------------------------------
    function Na__FogPlane__GetPlaneState(slotId) {
        const slot = Na__FogPlane__Slots[slotId];
        if (!slot) return null;
        return {
            active       : slot.active,
            normal       : slot.normal.clone(),
            positionMm   : slot.positionMm,
            positionUnits: slot.positionUnits.clone(),
            anchorPoint  : slot.anchorPoint.clone()
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore Plane from Saved Data
    // ------------------------------------------------------------
    function Na__FogPlane__RestorePlaneFromData(slotId, savedData) {
        if (!savedData || !savedData.active) return;

        const slot = Na__FogPlane__Slots[slotId];
        slot.active = true;
        slot.normal.set(savedData.normalX || 0, 0, savedData.normalZ || 0).normalize();

        const positionMm = savedData.positionMm || 0;
        const posUnits   = Na__Math__ConvertMmToUnits(positionMm);
        slot.anchorPoint.set(
            slot.normal.x !== 0 ? posUnits : 0,
            0,
            slot.normal.z !== 0 ? posUnits : 0
        );

        const group = Na__FogPlane__BuildPlaneGroup(slotId);
        Na__FogPlane__UpdatePlaneTransform(slotId);
        Na__FogPlane__Scene.add(group);
        Na__FogPlane__AttachDragListeners();

        if (Na__FogPlane__OnDragUpdate) {
            Na__FogPlane__OnDragUpdate(slotId, slot);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Check if Any Plane is Active
    // ------------------------------------------------------------
    function Na__FogPlane__HasActivePlanes() {
        return Na__FogPlane__Slots.A.active || Na__FogPlane__Slots.B.active;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Plane Creation API
    // ------------------------------------------------------------
    export {
        Na__FogPlane__InitializePlaneCreation,
        Na__FogPlane__StartFaceSelection,
        Na__FogPlane__RemovePlane,
        Na__FogPlane__SetPlanesVisible,
        Na__FogPlane__GetPlaneState,
        Na__FogPlane__RestorePlaneFromData,
        Na__FogPlane__HasActivePlanes,
        NA__FOGPLANE__OVERLAY_LAYER
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
