// =============================================================================
// VALEVISION3D - PRESENTATION MODE - CAMERA PATH VISUALIZER
// =============================================================================
//
// FILE       : Na__PresentationMode__DevTools__CameraPathVisualizer.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Camera Path Visualizer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only 3D overlay showing saved scene camera positions,
//              orbit targets and a smooth CatmullRom spline path through them
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Reads sorted scene data from the active PresentationMode config.
// - For each scene renders a small camera-frustum marker (LineSegments cone)
//   at the scene camera position and a small sphere at the orbit target.
// - Draws a smooth CatmullRomCurve3 spline tube through all scene camera
//   positions in order, plus a separate dashed line connecting orbit targets.
// - All markers are added to a dedicated THREE.Group inside the scene so they
//   can be toggled and disposed cleanly.
// - The toggle is called from the Dev menu 'Show Camera Path' checkbox.
// - Markers are excluded from any profile-lines normals pre-pass and the
//   image export render by setting a custom userData flag.
//
// INTEGRATION:
// - Receives the Three.js scene, camera, and renderer via Initialize.
// - Rebuilds on 'na-presentation-mode-scenes-loaded' and on manual rebuild.
// - ToggleCameraPathVisualizer(visible) is called from the Dev menu checkbox.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
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
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Helpers
    // @delegate: ./Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import { Na__PresentationMode__ProjectJson__GetSortedScenes } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Visualizer Style Parameters
    // ------------------------------------------------------------
    const Na__PmViz__GROUP_NAME            = 'Na__PresentationMode__PathVizGroup';  // <-- Scene group name
    const Na__PmViz__CAMERA_MARKER_COLOR   = 0xff6600;    // <-- Orange camera markers
    const Na__PmViz__TARGET_MARKER_COLOR   = 0x0077ff;    // <-- Blue orbit target markers
    const Na__PmViz__PATH_COLOR            = 0xff6600;    // <-- Orange spline path
    const Na__PmViz__TARGET_PATH_COLOR     = 0x0077ff;    // <-- Blue orbit target path
    const Na__PmViz__CAMERA_MARKER_SIZE    = 0.08;        // <-- Camera frustum half-size in units
    const Na__PmViz__TARGET_SPHERE_RADIUS  = 0.05;        // <-- Orbit target sphere radius in units
    const Na__PmViz__SPLINE_SEGMENTS       = 64;          // <-- CatmullRom spline resolution
    const Na__PmViz__TUBE_RADIUS           = 0.012;       // <-- Path tube radius in units
    const Na__PmViz__EXCLUDE_FLAG          = 'na_excludeFromExport'; // <-- userData flag for export exclusion
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Scene and Group References
    // ------------------------------------------------------------
    let Na__PmViz__Scene       = null;   // <-- Three.js scene reference
    let Na__PmViz__VizGroup    = null;   // <-- Dedicated group for all viz objects
    let Na__PmViz__IsVisible   = false;  // <-- Current toggle state
    let Na__PmViz__IsInitialized = false; // <-- Guard double init
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Marker Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Camera Frustum Marker (wireframe cone + cross)
    // ------------------------------------------------------------
    function Na__PmViz__BuildCameraMarker(position, sceneIndex) {
        const group    = new THREE.Group();
        group.position.copy(position);
        group.userData[Na__PmViz__EXCLUDE_FLAG] = true;                     // <-- Exclude from export render

        const mat      = new THREE.LineBasicMaterial({ color: Na__PmViz__CAMERA_MARKER_COLOR });
        const halfSize = Na__PmViz__CAMERA_MARKER_SIZE;

        // FRUSTUM CONE — 4 lines from apex to base corners
        const apexY    = halfSize * 0.5;
        const baseY    = -halfSize * 0.5;
        const baseX    = halfSize * 0.6;
        const baseZ    = halfSize * 0.4;

        const points   = [
            new THREE.Vector3(0,    apexY, 0), new THREE.Vector3( baseX, baseY,  baseZ),
            new THREE.Vector3(0,    apexY, 0), new THREE.Vector3(-baseX, baseY,  baseZ),
            new THREE.Vector3(0,    apexY, 0), new THREE.Vector3( baseX, baseY, -baseZ),
            new THREE.Vector3(0,    apexY, 0), new THREE.Vector3(-baseX, baseY, -baseZ),
            // BASE RECTANGLE
            new THREE.Vector3( baseX, baseY,  baseZ), new THREE.Vector3(-baseX, baseY,  baseZ),
            new THREE.Vector3(-baseX, baseY,  baseZ), new THREE.Vector3(-baseX, baseY, -baseZ),
            new THREE.Vector3(-baseX, baseY, -baseZ), new THREE.Vector3( baseX, baseY, -baseZ),
            new THREE.Vector3( baseX, baseY, -baseZ), new THREE.Vector3( baseX, baseY,  baseZ)
        ];

        const geo  = new THREE.BufferGeometry().setFromPoints(points);
        const cone = new THREE.LineSegments(geo, mat);
        group.add(cone);

        // SCENE INDEX LABEL (via visible axis cross marker)
        const labelMat  = new THREE.LineBasicMaterial({ color: Na__PmViz__CAMERA_MARKER_COLOR });
        const labelSize = halfSize * 0.3;
        const labelPts  = [
            new THREE.Vector3(-labelSize, apexY + halfSize, 0),
            new THREE.Vector3( labelSize, apexY + halfSize, 0),
            new THREE.Vector3(0, apexY + labelSize * 2, 0),
            new THREE.Vector3(0, apexY + halfSize * 2, 0)
        ];
        const labelGeo   = new THREE.BufferGeometry().setFromPoints(labelPts);
        const labelLines = new THREE.LineSegments(labelGeo, labelMat);
        group.add(labelLines);

        return group;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build an Orbit Target Sphere Marker
    // ------------------------------------------------------------
    function Na__PmViz__BuildTargetMarker(position) {
        const geo  = new THREE.SphereGeometry(Na__PmViz__TARGET_SPHERE_RADIUS, 8, 8);
        const mat  = new THREE.MeshBasicMaterial({ color: Na__PmViz__TARGET_MARKER_COLOR, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.userData[Na__PmViz__EXCLUDE_FLAG] = true;                      // <-- Exclude from export

        return mesh;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a CatmullRom Tube Spline Through Points
    // ------------------------------------------------------------
    function Na__PmViz__BuildSplineTube(points, color) {
        if (points.length < 2) return null;

        const curve   = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5); // <-- Smooth centripetal curve
        const tubeGeo = new THREE.TubeGeometry(curve, Na__PmViz__SPLINE_SEGMENTS, Na__PmViz__TUBE_RADIUS, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
        const tube    = new THREE.Mesh(tubeGeo, tubeMat);
        tube.userData[Na__PmViz__EXCLUDE_FLAG] = true;                      // <-- Exclude from export

        return tube;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Simple Line Through Points
    // ------------------------------------------------------------
    function Na__PmViz__BuildLine(points, color) {
        if (points.length < 2) return null;

        const geo  = new THREE.BufferGeometry().setFromPoints(points);
        const mat  = new THREE.LineDashedMaterial({ color, dashSize: 0.05, gapSize: 0.03 });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();                                         // <-- Required for LineDashedMaterial
        line.userData[Na__PmViz__EXCLUDE_FLAG] = true;

        return line;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visualizer Build and Destroy
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispose All Geometries and Materials in a Group
    // ------------------------------------------------------------
    function Na__PmViz__DisposeGroup(group) {
        if (!group) return;

        group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build (or Rebuild) the Visualizer Scene Objects
    // ------------------------------------------------------------
    function Na__PmViz__BuildVisualizer() {
        if (!Na__PmViz__Scene) return;

        // REMOVE EXISTING GROUP
        if (Na__PmViz__VizGroup) {
            Na__PmViz__DisposeGroup(Na__PmViz__VizGroup);
            Na__PmViz__Scene.remove(Na__PmViz__VizGroup);
            Na__PmViz__VizGroup = null;
        }

        const scenes = Na__PresentationMode__ProjectJson__GetSortedScenes();
        if (scenes.length === 0) return;

        const group = new THREE.Group();
        group.name  = Na__PmViz__GROUP_NAME;
        group.visible = Na__PmViz__IsVisible;

        const cameraPositions = [];
        const targetPositions = [];

        scenes.forEach((scene, index) => {
            const cam   = scene.PresentationMode__Scene__CameraPosition;
            const orbit = scene.PresentationMode__Scene__OrbitHelperCubePosition;
            if (!cam || !cam.Camera__DefaultPos) return;

            const camPos = new THREE.Vector3(
                Na__Math__ConvertMmToUnits(cam.Camera__DefaultPos.Camera__DefaultPos__PosX || 0),
                Na__Math__ConvertMmToUnits(cam.Camera__DefaultPos.Camera__DefaultPos__PosY || 0),
                Na__Math__ConvertMmToUnits(cam.Camera__DefaultPos.Camera__DefaultPos__PosZ || 0)
            );

            const camMarker = Na__PmViz__BuildCameraMarker(camPos, index + 1);
            group.add(camMarker);
            cameraPositions.push(camPos);

            if (orbit) {
                const targetPos = new THREE.Vector3(
                    Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosX || 0),
                    Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosY || 0),
                    Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosZ || 0)
                );
                const targetMarker = Na__PmViz__BuildTargetMarker(targetPos);
                group.add(targetMarker);
                targetPositions.push(targetPos);

                // PER-SCENE CONNECTOR LINE (camera → orbit target)
                const connector = Na__PmViz__BuildLine([camPos, targetPos], 0xcccccc);
                if (connector) group.add(connector);
            }
        });

        // CAMERA SPLINE PATH (CatmullRom through all camera positions)
        if (cameraPositions.length >= 2) {
            const camPath = Na__PmViz__BuildSplineTube(cameraPositions, Na__PmViz__PATH_COLOR);
            if (camPath) group.add(camPath);
        }

        // ORBIT TARGET PATH (dashed line through all orbit targets)
        if (targetPositions.length >= 2) {
            const targetPath = Na__PmViz__BuildLine(targetPositions, Na__PmViz__TARGET_PATH_COLOR);
            if (targetPath) group.add(targetPath);
        }

        Na__PmViz__Scene.add(group);
        Na__PmViz__VizGroup = group;

        Na__RenderLoop__RequestRender();                                     // <-- Show updated viz immediately
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Toggle and Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Camera Path Visualizer Visibility
    // ------------------------------------------------------------
    function Na__PresentationMode__DevTools__ToggleCameraPathVisualizer(visible) {
        const targetVisible = typeof visible === 'boolean' ? visible : !Na__PmViz__IsVisible;
        Na__PmViz__IsVisible = targetVisible;

        if (Na__PmViz__VizGroup) {
            Na__PmViz__VizGroup.visible = targetVisible;                    // <-- Show or hide the group
            Na__RenderLoop__RequestRender();
        } else if (targetVisible) {
            Na__PmViz__BuildVisualizer();                                   // <-- Build on first enable
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild Visualizer from Current Scene Data (after edit)
    // ------------------------------------------------------------
    function Na__PresentationMode__DevTools__RebuildCameraPathVisualizer() {
        if (!Na__PmViz__IsVisible) return;                                  // <-- No-op when hidden
        Na__PmViz__BuildVisualizer();
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Camera Path Visualizer
    // ------------------------------------------------------------
    function Na__PresentationMode__DevTools__InitializeCameraPathVisualizer(scene) {
        if (Na__PmViz__IsInitialized) return;
        Na__PmViz__IsInitialized = true;

        Na__PmViz__Scene = scene;

        // REBUILD WHEN SCENES LOAD OR CHANGE
        window.addEventListener('na-presentation-mode-scenes-loaded', () => {
            if (Na__PmViz__IsVisible) {
                Na__PmViz__BuildVisualizer();                               // <-- Refresh if currently visible
            }
        });

        console.log('[ValeVision3D] Presentation Mode camera path visualizer initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Camera Path Visualizer API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__DevTools__InitializeCameraPathVisualizer,
        Na__PresentationMode__DevTools__ToggleCameraPathVisualizer,
        Na__PresentationMode__DevTools__RebuildCameraPathVisualizer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
