// =============================================================================
// VALEVISION3D - GRID LINE SYSTEM - GRID CREATION LOGIC
// =============================================================================
//
// FILE       : Na__GridLineSysem__GridCreationLogic.js
// NAMESPACE  : Na__GridLine
// MODULE     : GridLine System - Creation Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build and update Three.js grid line geometry on the XZ plane
// CREATED    : 13-Mar-2026
//
// DESCRIPTION:
// - Creates a THREE.Group containing fat lines (Line2 / LineMaterial) that
//   form a rectangular grid on the XZ plane at a configurable Y height.
// - Uses Three.js addons Line2 for proper GPU-rendered line width control
//   (WebGL LineBasicMaterial linewidth is capped at 1px on most hardware).
// - Supports Solid, Dashed and Dotted line types via LineMaterial dashing.
// - Optionally renders a red X origin marker (localhost dev aid).
// - All dimension inputs are millimeters, converted to Three.js units
//   (metres) via Na__Math__ConvertMmToUnits.
// - Exposes Initialize, Update, Dispose and GetGridGroup for the UI module.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Three.js Addons - Fat Lines
    // ------------------------------------------------------------
    import { Line2 } from 'three/addons/lines/Line2.js';
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
    import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
    import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Scene and Group References
    // ------------------------------------------------------------
    let Na__GridLine__SceneRef  = null;                                      // <-- Cached scene reference
    let Na__GridLine__Group     = null;                                      // <-- THREE.Group holding all grid geometry
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grid Geometry Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispose All Children in a Group
    // ------------------------------------------------------------
    function Na__GridLine__DisposeChildren(group) {
        while (group.children.length > 0) {
            const child = group.children[0];
            if (child.geometry)  child.geometry.dispose();
            if (child.material)  child.material.dispose();
            group.remove(child);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Grid Line Position Pairs for LineSegmentsGeometry
    // ------------------------------------------------------------
    function Na__GridLine__BuildPositionPairs(sizeUnits, lineCount, offsetX, offsetZ) {
        const halfExtent = sizeUnits * lineCount;                            // <-- Total half-extent from origin
        const pairs = [];

        for (let i = -lineCount; i <= lineCount; i++) {
            const pos = i * sizeUnits;

            // X-parallel line (runs along X axis at Z = pos)
            pairs.push(
                -halfExtent + offsetX, 0, pos + offsetZ,
                 halfExtent + offsetX, 0, pos + offsetZ
            );

            // Z-parallel line (runs along Z axis at X = pos)
            pairs.push(
                pos + offsetX, 0, -halfExtent + offsetZ,
                pos + offsetX, 0,  halfExtent + offsetZ
            );
        }

        return pairs;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create Fat Line Material (LineMaterial)
    // ------------------------------------------------------------
    function Na__GridLine__CreateFatMaterial(lineType, colorHex, lineWidthPx, opacity, gapScale, sizeUnits) {
        const color = new THREE.Color(colorHex);
        const isDashed = (lineType === 'Dashed' || lineType === 'Dotted');

        const baseDash = sizeUnits * 0.05;                                  // <-- 5% of cell size as base dash unit
        let dashSize   = baseDash;
        let gapSize    = baseDash * gapScale;

        if (lineType === 'Dotted') {
            dashSize = baseDash * 0.15;                                      // <-- Tiny dash to simulate dot
            gapSize  = baseDash * 0.5 * gapScale;
        }

        const mat = new LineMaterial({
            color       : color,
            linewidth   : lineWidthPx,                                       // <-- Actual pixel width on screen
            worldUnits  : false,                                             // <-- Size in screen pixels, not world units
            transparent : true,
            opacity     : opacity,
            depthWrite  : false,
            dashed      : isDashed,
            dashSize    : isDashed ? dashSize : undefined,
            gapSize     : isDashed ? gapSize  : undefined
        });

        mat.resolution.set(window.innerWidth, window.innerHeight);           // <-- Required for LineMaterial
        return mat;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Origin Marker (Red X) for Localhost Dev
    // ------------------------------------------------------------
    function Na__GridLine__BuildOriginMarker(offsetX, heightUnits, offsetZ, markerSizeUnits) {
        const half = markerSizeUnits * 0.5;

        const positions = [
            offsetX - half, heightUnits, offsetZ - half,
            offsetX + half, heightUnits, offsetZ + half,
            offsetX - half, heightUnits, offsetZ + half,
            offsetX + half, heightUnits, offsetZ - half
        ];

        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(positions);

        const material = new LineMaterial({
            color       : 0xff0000,
            linewidth   : 3,                                                 // <-- 3px bold red marker
            worldUnits  : false,
            transparent : true,
            opacity     : 0.85,
            depthWrite  : false
        });
        material.resolution.set(window.innerWidth, window.innerHeight);

        const marker = new LineSegments2(geometry, material);
        marker.name = 'Na__GridLineOriginMarker';
        return marker;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Grid Line System
    // ------------------------------------------------------------
    function Na__GridLine__Initialize(scene) {
        Na__GridLine__SceneRef = scene;
        Na__GridLine__Group    = new THREE.Group();
        Na__GridLine__Group.name = 'Na__GridLineGroup';
        Na__GridLine__Group.renderOrder = -1;                                // <-- Render behind scene objects
        scene.add(Na__GridLine__Group);

        window.addEventListener('resize', Na__GridLine__OnResize);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update LineMaterial Resolution on Window Resize
    // ------------------------------------------------------------
    function Na__GridLine__OnResize() {
        if (!Na__GridLine__Group) return;
        Na__GridLine__Group.traverse((child) => {
            if (child.material && child.material.resolution) {
                child.material.resolution.set(window.innerWidth, window.innerHeight);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Update Grid Lines From Parameters
    // ------------------------------------------------------------
    function Na__GridLine__Update(params) {
        if (!Na__GridLine__Group) return;

        const sizeMm      = params.sizeMm         || 1000;
        const heightMm    = params.heightMm        ?? 0;
        const lineWidth   = params.lineWidth       || 1.0;
        const lineType    = params.lineType        || 'Solid';
        const colorHex    = params.colorHex        || '#141414';
        const opacity     = params.opacity         ?? 0.5;
        const gapScale    = params.gapScale        ?? 1.0;
        const posXMm      = params.positionXMm     ?? 0;
        const posZMm      = params.positionZMm     ?? 0;
        const lineCount   = params.lineCount       || 50;
        const showOrigin  = params.showOriginMarker || false;
        const originSizeMm = params.originMarkerSizeMm || 500;

        Na__GridLine__DisposeChildren(Na__GridLine__Group);

        const sizeUnits   = Na__Math__ConvertMmToUnits(sizeMm);
        const heightUnits = Na__Math__ConvertMmToUnits(heightMm);
        const offsetX     = Na__Math__ConvertMmToUnits(posXMm);
        const offsetZ     = -Na__Math__ConvertMmToUnits(posZMm);              // <-- Negate: config +Z maps to Three.js -Z

        // Build grid geometry
        const positionPairs = Na__GridLine__BuildPositionPairs(sizeUnits, lineCount, offsetX, offsetZ);
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(positionPairs);

        const material = Na__GridLine__CreateFatMaterial(lineType, colorHex, lineWidth, opacity, gapScale, sizeUnits);

        const linesMesh = new LineSegments2(geometry, material);
        linesMesh.computeLineDistances();                                    // <-- Required for dashed/dotted
        linesMesh.position.y = heightUnits;
        linesMesh.name = 'Na__GridLineSegments';
        Na__GridLine__Group.add(linesMesh);

        // Origin marker (localhost dev only)
        if (showOrigin) {
            const markerSizeUnits = Na__Math__ConvertMmToUnits(originSizeMm);
            const marker = Na__GridLine__BuildOriginMarker(offsetX, heightUnits, offsetZ, markerSizeUnits);
            Na__GridLine__Group.add(marker);
        }

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Grid Line System
    // ------------------------------------------------------------
    function Na__GridLine__Dispose() {
        if (!Na__GridLine__Group) return;
        Na__GridLine__DisposeChildren(Na__GridLine__Group);
        if (Na__GridLine__SceneRef) {
            Na__GridLine__SceneRef.remove(Na__GridLine__Group);
        }
        window.removeEventListener('resize', Na__GridLine__OnResize);
        Na__GridLine__Group    = null;
        Na__GridLine__SceneRef = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Grid Group Reference
    // ------------------------------------------------------------
    function Na__GridLine__GetGridGroup() {
        return Na__GridLine__Group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Grid Line System API
    // ------------------------------------------------------------
    export {
        Na__GridLine__Initialize,
        Na__GridLine__Update,
        Na__GridLine__Dispose,
        Na__GridLine__GetGridGroup
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
