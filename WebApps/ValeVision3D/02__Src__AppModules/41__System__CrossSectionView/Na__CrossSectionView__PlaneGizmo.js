// =============================================================================
// VALEVISION3D - CROSS SECTION VIEW - PLANE GIZMO
// =============================================================================
//
// FILE       : Na__CrossSectionView__PlaneGizmo.js
// NAMESPACE  : Na__SectGizmo
// MODULE     : Cross Section View - Plane Gizmo
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the draggable in-scene section plane widget (SketchUp style)
// CREATED    : 14-Jul-2026
//
// DESCRIPTION:
// - Creates a translucent rectangle spanning the model extents with a border,
//   a labelled central drag grip, and corner arrows indicating the cut-away
//   direction — mirroring the elevation-plane gizmo pattern.
// - Every object is tagged userData.naCrossSectionHelper = true so the cap
//   geometry engine and other scene passes can exclude the widget cleanly.
// - Gizmo materials are never assigned clipping planes: the widget must stay
//   visible and grabbable regardless of how many section cuts are active.
// - Pure creation/disposal module — positioning, orientation and drag logic
//   live in Na__CrossSectionView__SystemLogic.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Jul-2026 - Version 1.0.0
// - Initial implementation as part of the cross section tool.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Canvas Texture Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Canvas Texture for the Central Drag Grip
    // ------------------------------------------------------------
    function Na__SectGizmo__CreateGripTexture(gripW, gripH, style) {
        const canvasW = 512;
        const canvasH = Math.max(64, Math.round(canvasW * (gripH / gripW)));
        const canvas  = document.createElement('canvas');
        canvas.width  = canvasW;
        canvas.height = canvasH;
        const ctx     = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvasW, canvasH);

        ctx.globalAlpha = style.handleFillOpacity;
        ctx.fillStyle   = style.handleFillColor;
        ctx.fillRect(0, 0, canvasW, canvasH);                                   // <-- Semi-transparent grip fill

        const fontSize   = Math.round(canvasH * 0.22);
        ctx.globalAlpha  = style.labelOpacity;
        ctx.fillStyle    = style.labelColor;
        ctx.font         = `${fontSize}px Arial, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.labelText, canvasW * 0.5, canvasH * 0.5);            // <-- Centred grip label

        ctx.globalAlpha = 1.0;

        const texture       = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gizmo Creation and Disposal
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Section Plane Gizmo Group
    // ------------------------------------------------------------
    // Parameters:
    //   sectionId   – numeric id (used in object names)
    //   widthUnits  – in-plane width (local X) in world units
    //   heightUnits – in-plane height (local Y) in world units
    //   style       – resolved appearance values (see SystemLogic resolver)
    // Returns { group, handleMesh }. Local +Z is the KEPT-side normal; the
    // corner arrows point along local +Z toward the geometry that remains.
    // ------------------------------------------------------------
    function Na__SectGizmo__Create(sectionId, widthUnits, heightUnits, style) {
        const group = new THREE.Group();
        group.name = `Na__CrossSectionView__Gizmo__${sectionId}`;
        group.userData.naCrossSectionHelper = true;                             // <-- Excluded from cap compute + raycast filters

        // OUTER PLANE | Translucent full-extent rectangle (passive)
        const planeGeometry = new THREE.PlaneGeometry(widthUnits, heightUnits);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color       : style.fillColor,
            opacity     : style.fillOpacity,
            transparent : true,
            side        : THREE.DoubleSide,
            depthWrite  : false
        });
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.name = `Na__CrossSectionView__GizmoPlane__${sectionId}`;
        planeMesh.userData.naCrossSectionHelper = true;
        group.add(planeMesh);

        // BORDER | Edge lines around the full rectangle
        const borderEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(planeGeometry),
            new THREE.LineBasicMaterial({ color: style.edgeColor })
        );
        borderEdges.userData.naCrossSectionHelper = true;
        group.add(borderEdges);

        // CENTRAL GRIP | Labelled drag target quad
        const gripW = Math.min(style.handleWidthUnits,  widthUnits  * 0.8);     // <-- Never larger than the plane itself
        const gripH = Math.min(style.handleHeightUnits, heightUnits * 0.8);
        const gripGeometry = new THREE.PlaneGeometry(gripW, gripH);
        const gripMaterial = new THREE.MeshBasicMaterial({
            map         : Na__SectGizmo__CreateGripTexture(gripW, gripH, style),
            transparent : true,
            side        : THREE.DoubleSide,
            depthWrite  : false
        });
        const handleMesh = new THREE.Mesh(gripGeometry, gripMaterial);
        handleMesh.name = `Na__CrossSectionView__GizmoHandle__${sectionId}`;
        handleMesh.userData.naCrossSectionHelper = true;
        handleMesh.position.set(0, 0, 0.01);                                    // <-- Slightly proud of the outer plane
        group.add(handleMesh);

        // GRIP BORDER
        const gripEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(gripGeometry),
            new THREE.LineBasicMaterial({ color: style.handleEdgeColor })
        );
        gripEdges.userData.naCrossSectionHelper = true;
        gripEdges.position.set(0, 0, 0.01);
        group.add(gripEdges);

        // CORNER ARROWS | Point along local +Z = the KEPT side (SketchUp convention:
        // arrows indicate the side of the model that remains visible)
        const arrowDir = new THREE.Vector3(0, 0, 1);
        const arrowHex = new THREE.Color(style.arrowColor).getHex();
        const inset    = 0.92;                                                  // <-- Pull arrows slightly inside the corners
        const corners = [
            new THREE.Vector3(-widthUnits / 2 * inset,  heightUnits / 2 * inset, 0),
            new THREE.Vector3( widthUnits / 2 * inset,  heightUnits / 2 * inset, 0),
            new THREE.Vector3(-widthUnits / 2 * inset, -heightUnits / 2 * inset, 0),
            new THREE.Vector3( widthUnits / 2 * inset, -heightUnits / 2 * inset, 0)
        ];
        for (let i = 0; i < corners.length; i++) {
            const arrow = new THREE.ArrowHelper(
                arrowDir, corners[i], style.arrowLengthUnits, arrowHex,
                style.arrowLengthUnits * 0.35, style.arrowLengthUnits * 0.18
            );
            arrow.traverse((child) => { child.userData.naCrossSectionHelper = true; });
            group.add(arrow);
        }

        return { group, handleMesh };
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose a Gizmo Group and All GPU Resources
    // ------------------------------------------------------------
    function Na__SectGizmo__Dispose(group) {
        if (!group) return;
        group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();           // <-- Canvas grip texture
                child.material.dispose();
            }
        });
        if (group.parent) group.parent.remove(group);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Plane Gizmo API
    // ------------------------------------------------------------
    export {
        Na__SectGizmo__Create,
        Na__SectGizmo__Dispose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
