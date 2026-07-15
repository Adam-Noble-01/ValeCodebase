// =============================================================================
// VALEVISION3D - CROSS SECTION VIEW - SYSTEM LOGIC
// =============================================================================
//
// FILE       : Na__CrossSectionView__SystemLogic.js
// NAMESPACE  : Na__CrossSection
// MODULE     : Cross Section View - System Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : SketchUp-style live section cuts with boolean cap fills + clean profiles
// CREATED    : 14-Jul-2026
//
// DESCRIPTION:
// - Manages multiple simultaneous section planes cutting the loaded model via
//   per-material THREE clipping planes (renderer.localClippingEnabled).
// - Each section owns: a draggable plane gizmo, a solid cap fill mesh (real
//   triangulated geometry from Na__CrossSectionView__CapGeometry — behaves
//   like a true boolean cut in both engines, exports, AO and shadows), and a
//   fat-line profile outline (LineSegments2) around the cut islands with all
//   interior clutter lines removed.
// - Live dragging: the clip planes update every frame (GPU-free), while cap
//   geometry recomputes on a throttle and once more on drag end.
// - Cross-engine: model materials get clippingPlanes re-applied after the
//   na-render-engine-changed material swap; the profile-lines override
//   materials read the plane list from Na__RenderEffect__SectionClipping__State.
// - Caps of section A are clipped by every OTHER section plane (never their
//   own) so multiple cuts compose exactly like SketchUp.
// - Feature is gated per project: hidden until enabled from the Dev Tools
//   menu / project.json CrossSection__Config.
//
// INTEGRATION:
// - Na__UiFeature__CrossSectionView__Controls wires the Tools menu to this API.
// - Na__UiFeature__CrossSectionView__DevControls persists CrossSection__Config.
// - Dispatches 'na-crosssection-state-changed' after every state mutation.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Jul-2026 - Version 1.1.0
// - Face-click placement (Elevation-style) replaces Plan/X/Z spawn buttons.
// - Upright / Plan placement mode toggle.
// - Optional slice depth (metres): second parallel clip plane; default infinite.
//
// 14-Jul-2026 - Version 1.0.0
// - Initial implementation as part of the cross section tool.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core and Fat Lines
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
    import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop and Shared Clipping State
    // ------------------------------------------------------------
    import {
        Na__RenderLoop__RequestRender,
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import {
        Na__SectionClipping__SetPlanes,
        Na__SectionClipping__SetOverlayRenderer,
        Na__SectionClipping__SetExportModeHandler
    } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Math Utilities
    // ------------------------------------------------------------
    import {
        Na__Math__ConvertMmToUnits,
        Na__Math__ConvertUnitsToMm
    } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Sub-Modules
    // ------------------------------------------------------------
    import {
        Na__SectCap__ComputeSectionGeometry,
        Na__SectCap__BuildPlaneBasis
    } from './Na__CrossSectionView__CapGeometry.js';
    import {
        Na__SectGizmo__Create,
        Na__SectGizmo__Dispose
    } from './Na__CrossSectionView__PlaneGizmo.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Path and State Event
    // ------------------------------------------------------------
    const Na__Sect__CONFIG_PATH = './02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__Config.json';
    const Na__Sect__STATE_EVENT = 'na-crosssection-state-changed';
    // ------------------------------------------------------------


    // NOTE | Caps / outlines / gizmos live in a SEPARATE THREE.Scene (never
    // added to the main model scene) — see Na__Sect__OverlayScene below. The
    // EffectComposer's scene render (RenderPass, Sobel profile passes, fog,
    // SSAO) never traverses them, since they simply are not part of that
    // scene graph. A dedicated overlay pass draws them after composer.render()
    // straight onto the composited colour buffer (clearDepth only, colour
    // buffer left untouched) so the clipped model stays visible underneath.


    // MODULE CONSTANTS | Fallback Appearance (Config JSON Absent)
    // ------------------------------------------------------------
    const Na__Sect__FB_FILL_COLOR      = '#f0f0f0';    // <-- Section cut fill RGB 240,240,240
    const Na__Sect__FB_LINE_COLOR      = '#323232';    // <-- Section cut profile lines RGB 50,50,50
    const Na__Sect__FB_LINE_WIDTH_PX   = 2.0;
    const Na__Sect__FB_CAP_OFFSET_MM   = 0.6;
    const Na__Sect__FB_LINE_OFFSET_MM  = 1.4;
    const Na__Sect__FB_MARGIN_MM       = 2000;
    const Na__Sect__FB_HANDLE_W_MM     = 6000;
    const Na__Sect__FB_HANDLE_H_MM     = 3000;
    const Na__Sect__FB_ARROW_LEN_MM    = 2200;
    const Na__Sect__FB_THROTTLE_MS     = 90;
    const Na__Sect__FB_WELD_TOL_MM     = 0.25;
    const Na__Sect__FB_MIN_LOOP_M2     = 0.0004;
    const Na__Sect__FB_MAX_SEGMENTS    = 250000;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Placement Modes (Normal Points Toward KEPT Side)
    // ------------------------------------------------------------
    const Na__Sect__MODE_UPRIGHT = 'UPRIGHT';
    const Na__Sect__MODE_PLAN    = 'PLAN';
    const Na__Sect__MODE_LABELS  = {
        UPRIGHT : 'Upright Section',
        PLAN    : 'Plan Section'
    };
    const Na__Sect__CLICK_THRESHOLD_PX = 4;                        // <-- Ignore orbit drags during face pick
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Injected References
    // ------------------------------------------------------------
    let Na__Sect__Scene         = null;
    let Na__Sect__PerspCamera   = null;
    let Na__Sect__Renderer      = null;
    let Na__Sect__OrbitControls = null;
    let Na__Sect__PipelineRef   = null;
    let Na__Sect__ModelRoot     = null;
    let Na__Sect__Initialized   = false;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Feature and Section State
    // ------------------------------------------------------------
    let Na__Sect__Config          = null;                          // <-- Parsed Config.json (null until fetched)
    let Na__Sect__PendingProjectConfig = null;                     // <-- Project config that arrived before init
    let Na__Sect__FeatureEnabled  = false;
    let Na__Sect__Sections        = [];                            // <-- Live section records
    let Na__Sect__NextId          = 1;
    let Na__Sect__ModeCounters    = { UPRIGHT: 0, PLAN: 0 };       // <-- Per-mode naming counters
    let Na__Sect__GizmosVisible   = true;
    const Na__Sect__ActivePlanes  = [];                            // <-- Shared live plane array (assigned to model materials + clipping state)
    let Na__Sect__HelperRoot      = null;                          // <-- Group holding gizmos (lives in the overlay scene)
    let Na__Sect__CapRoot         = null;                          // <-- Group holding cap fills + outlines (overlay scene)
    let Na__Sect__OverlayScene    = null;                          // <-- Dedicated scene for caps/outlines/gizmos (composited post-composer)
    let Na__Sect__OrthoModeActive = false;                         // <-- True while the elevation ortho camera drives rendering
    let Na__Sect__PlacementMode   = Na__Sect__MODE_UPRIGHT;        // <-- Upright (default) or Plan
    let Na__Sect__SliceDepthM     = null;                          // <-- null / 0 = infinite (no back plane); else metres
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Appearance Settings
    // ------------------------------------------------------------
    let Na__Sect__FillColor   = Na__Sect__FB_FILL_COLOR;
    let Na__Sect__LineColor   = Na__Sect__FB_LINE_COLOR;
    let Na__Sect__LineWidthPx = Na__Sect__FB_LINE_WIDTH_PX;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Drag Interaction State
    // ------------------------------------------------------------
    let Na__Sect__DragSection      = null;                         // <-- Section being dragged (null when idle)
    let Na__Sect__DragStartParam   = 0;                            // <-- Axis parameter at pointer down
    let Na__Sect__DragStartPlanePos = 0;                           // <-- Plane position along normal at pointer down
    let Na__Sect__DragAxisOrigin   = new THREE.Vector3();          // <-- Gizmo centre at drag start
    let Na__Sect__DragAxisDir      = new THREE.Vector3();          // <-- Plane normal at drag start
    let Na__Sect__LastRecomputeMs  = 0;                            // <-- Throttle clock for live cap updates
    let Na__Sect__ListenersActive  = false;
    const Na__Sect__Raycaster      = new THREE.Raycaster();
    const Na__Sect__PointerNdc     = new THREE.Vector2();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Face Selection State (Elevation-Style Pick)
    // ------------------------------------------------------------
    let Na__Sect__IsSelecting      = false;                        // <-- True while waiting for a face click
    let Na__Sect__SelectPointerDown = false;
    let Na__Sect__SelectDownX      = 0;
    let Na__Sect__SelectDownY      = 0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loader and Resolvers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Cross Section Config JSON
    // ------------------------------------------------------------
    async function Na__Sect__FetchConfig() {
        try {
            const response = await fetch(Na__Sect__CONFIG_PATH);
            if (!response.ok) {
                console.warn(`[ValeVision3D] Cross section config fetch returned ${response.status}, using fallback defaults`);
                return null;
            }
            return await response.json();
        } catch (err) {
            console.warn('[ValeVision3D] Failed to load cross section config, using fallback defaults:', err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Config Value with Fallback
    // ------------------------------------------------------------
    function Na__Sect__CfgVal(section, key, fallback) {
        if (!Na__Sect__Config || !Na__Sect__Config[section]) return fallback;
        const val = Na__Sect__Config[section][key];
        return (val !== undefined && val !== null) ? val : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Tuning + Offset Values
    // ------------------------------------------------------------
    function Na__Sect__CapOffsetUnits()  { return Na__Math__ConvertMmToUnits(Na__Sect__CfgVal('CrossSectionView__Appearance__Config', 'CrossSectionView__Appearance__Config__CapOffsetMm',  Na__Sect__FB_CAP_OFFSET_MM)); }
    function Na__Sect__LineOffsetUnits() { return Na__Math__ConvertMmToUnits(Na__Sect__CfgVal('CrossSectionView__Appearance__Config', 'CrossSectionView__Appearance__Config__LineOffsetMm', Na__Sect__FB_LINE_OFFSET_MM)); }
    function Na__Sect__ThrottleMs()      { return Na__Sect__CfgVal('CrossSectionView__Update__Config', 'CrossSectionView__Update__Config__DragRecomputeMs',     Na__Sect__FB_THROTTLE_MS); }
    function Na__Sect__WeldTolUnits()    { return Na__Math__ConvertMmToUnits(Na__Sect__CfgVal('CrossSectionView__Update__Config', 'CrossSectionView__Update__Config__WeldToleranceMm', Na__Sect__FB_WELD_TOL_MM)); }
    function Na__Sect__MinLoopArea()     { return Na__Sect__CfgVal('CrossSectionView__Update__Config', 'CrossSectionView__Update__Config__MinLoopAreaM2',       Na__Sect__FB_MIN_LOOP_M2); }
    function Na__Sect__MaxSegments()     { return Na__Sect__CfgVal('CrossSectionView__Update__Config', 'CrossSectionView__Update__Config__MaxCrossingSegments', Na__Sect__FB_MAX_SEGMENTS); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Gizmo Style Block for the Gizmo Module
    // ------------------------------------------------------------
    function Na__Sect__ResolveGizmoStyle() {
        const g = 'CrossSectionView__Gizmo__Config';
        return {
            fillColor         : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__FillColor',         '#5a9e6f'),
            fillOpacity       : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__FillOpacity',       0.05),
            edgeColor         : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__EdgeColor',         '#2e7d4f'),
            handleFillColor   : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__HandleFillColor',   '#5a9e6f'),
            handleFillOpacity : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__HandleFillOpacity', 0.14),
            handleEdgeColor   : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__HandleEdgeColor',   '#2e7d4f'),
            handleWidthUnits  : Na__Math__ConvertMmToUnits(Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__HandleWidthByMm',  Na__Sect__FB_HANDLE_W_MM)),
            handleHeightUnits : Na__Math__ConvertMmToUnits(Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__HandleHeightByMm', Na__Sect__FB_HANDLE_H_MM)),
            labelText         : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__LabelText',         'Drag To Move Section'),
            labelColor        : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__LabelColor',        '#1f5c39'),
            labelOpacity      : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__LabelOpacity',      0.55),
            arrowLengthUnits  : Na__Math__ConvertMmToUnits(Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__ArrowLengthByMm', Na__Sect__FB_ARROW_LEN_MM)),
            arrowColor        : Na__Sect__CfgVal(g, 'CrossSectionView__Gizmo__Config__ArrowColor',        '#2e7d4f')
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Custom Event Dispatchers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispatch Cross Section State Changed Event
    // ------------------------------------------------------------
    function Na__Sect__DispatchStateChanged() {
        window.dispatchEvent(new CustomEvent(Na__Sect__STATE_EVENT, {
            detail: {
                featureEnabled : Na__Sect__FeatureEnabled,
                gizmosVisible  : Na__Sect__GizmosVisible,
                placementMode  : Na__Sect__PlacementMode,
                isSelecting    : Na__Sect__IsSelecting,
                sliceDepthM    : Na__Sect__SliceDepthM,
                appearance     : Na__CrossSection__GetAppearance(),
                sections       : Na__CrossSection__GetSections()
            }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clipping Plane Application
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Active Section Planes to Every Model Material
    // ------------------------------------------------------------
    // Assigns the SHARED live plane array so subsequent drag updates (which
    // mutate the plane constants in place) propagate with zero re-traversal.
    // Re-invoked after engine switches because the materials swap replaces
    // material instances wholesale.
    // ------------------------------------------------------------
    function Na__Sect__ApplyClippingToModel() {
        if (!Na__Sect__ModelRoot) return;
        const clipList = Na__Sect__ActivePlanes.length > 0 ? Na__Sect__ActivePlanes : null;

        Na__Sect__ModelRoot.traverse((obj) => {
            if (!obj.material) return;
            if (obj.userData && obj.userData.naCrossSectionHelper) return;      // <-- Defensive: never clip our own helpers
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (let i = 0; i < materials.length; i++) {
                materials[i].clippingPlanes = clipList;                          // <-- Live array reference (or null when no cuts)
                materials[i].clipShadows    = (clipList !== null);               // <-- Shadows follow the cut
            }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rebuild Per-Section "Other Planes" Clip Arrays
    // ------------------------------------------------------------
    // Cap fills and outlines of section A are clipped by every OTHER
    // *enabled* plane (never their own) so multiple simultaneous cuts compose
    // like SketchUp. Sections turned OFF via the eye toggle contribute no
    // planes at all — they neither cut the model nor clip anyone else's cap.
    // ------------------------------------------------------------
    function Na__Sect__RebuildSectionClipArrays() {
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            const section = Na__Sect__Sections[i];
            section.otherPlanes.length = 0;
            for (let j = 0; j < Na__Sect__Sections.length; j++) {
                const other = Na__Sect__Sections[j];
                if (other === section || !other.enabled) continue;
                section.otherPlanes.push(other.plane);
                if (other.backPlane) section.otherPlanes.push(other.backPlane);
            }
            const clipList = section.otherPlanes.length > 0 ? section.otherPlanes : null;
            section.capMesh.material.clippingPlanes     = clipList;
            section.outlineMesh.material.clippingPlanes = clipList;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync / Clear a Section's Optional Back (Slice) Plane
    // ------------------------------------------------------------
    // SketchUp section depth: second parallel plane with opposite normal,
    // offset along the kept-side normal by sliceDepthUnits. null/0 = none.
    // ------------------------------------------------------------
    function Na__Sect__UpdateBackPlane(section) {
        const depth = section.sliceDepthUnits;
        if (!Number.isFinite(depth) || depth <= 0) {
            section.backPlane = null;
            return;
        }
        if (!section.backPlane) section.backPlane = new THREE.Plane();
        const planePos = -section.plane.constant;                                // <-- Position of primary along its normal
        section.backPlane.normal.copy(section.plane.normal).negate();            // <-- Kept side of back faces toward primary
        section.backPlane.constant = planePos + depth;                           // <-- Back sits depth units into the kept volume
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sync Shared Plane Array + Downstream Consumers
    // ------------------------------------------------------------
    // Sections toggled OFF (section.enabled === false) are skipped entirely —
    // their plane(s) never reach the model, so they stop cutting until
    // switched back on, independent of gizmo visibility.
    // ------------------------------------------------------------
    function Na__Sect__SyncActivePlanes() {
        Na__Sect__ActivePlanes.length = 0;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            const section = Na__Sect__Sections[i];
            Na__Sect__UpdateBackPlane(section);
            if (!section.enabled) continue;
            Na__Sect__ActivePlanes.push(section.plane);
            if (section.backPlane) Na__Sect__ActivePlanes.push(section.backPlane);
        }
        Na__Sect__ApplyClippingToModel();
        Na__Sect__RebuildSectionClipArrays();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Invalidate the Profile Lines Scene Cache
    // ------------------------------------------------------------
    function Na__Sect__InvalidateProfileCache() {
        const pipeline = Na__Sect__PipelineRef && Na__Sect__PipelineRef.current;
        if (pipeline && pipeline.invalidateProfileLinesCache) {
            pipeline.invalidateProfileLinesCache();                              // <-- Cap meshes joined/left the scene
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Creation, Transforms and Cap Updates
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Section Overlay After the Composer Finishes
    // ------------------------------------------------------------
    // Called by the render loop each frame immediately after
    // composer.render(). Renders the dedicated overlay scene (caps, outlines,
    // gizmos) straight onto the already-composited colour buffer: autoClear is
    // off and the overlay scene has no background, so the colour buffer from
    // the clipped model render is preserved underneath — only the depth
    // buffer is reset first so the overlay geometry always draws on top.
    // Post-processing (fog / SSAO / Sobel) never touches these visuals
    // because they never exist in the main model scene it renders.
    // ------------------------------------------------------------
    function Na__Sect__RenderOverlay(activeCamera) {
        if (!Na__Sect__Renderer || !Na__Sect__OverlayScene || Na__Sect__Sections.length === 0) return;
        const camera = activeCamera || Na__Sect__PerspCamera;
        if (!camera) return;

        const savedAutoClear = Na__Sect__Renderer.autoClear;

        Na__Sect__Renderer.autoClear = false;
        Na__Sect__Renderer.setRenderTarget(null);                                // <-- Draw straight to the screen
        Na__Sect__Renderer.clearDepth();                                         // <-- Fresh depth: fills sit on the composited image
        Na__Sect__Renderer.render(Na__Sect__OverlayScene, camera);               // <-- Separate scene: colour buffer untouched, model stays visible

        Na__Sect__Renderer.autoClear = savedAutoClear;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ensure Overlay Scene + Helper/Cap Root Groups Exist
    // ------------------------------------------------------------
    function Na__Sect__EnsureRootGroups() {
        if (!Na__Sect__OverlayScene) {
            Na__Sect__OverlayScene = new THREE.Scene();                          // <-- No background/fog: composited colour buffer stays intact
            Na__Sect__OverlayScene.name = 'Na__CrossSectionView__OverlayScene';
        }
        if (!Na__Sect__HelperRoot) {
            Na__Sect__HelperRoot = new THREE.Group();
            Na__Sect__HelperRoot.name = 'Na__CrossSectionView__GizmoRoot';
            Na__Sect__HelperRoot.userData.naCrossSectionHelper = true;
            Na__Sect__OverlayScene.add(Na__Sect__HelperRoot);
        }
        if (!Na__Sect__CapRoot) {
            Na__Sect__CapRoot = new THREE.Group();
            Na__Sect__CapRoot.name = 'Na__CrossSectionView__CapRoot';
            Na__Sect__CapRoot.userData.naCrossSectionHelper = true;
            Na__Sect__OverlayScene.add(Na__Sect__CapRoot);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Gizmo / Cap / Outline Transforms From the Plane
    // ------------------------------------------------------------
    function Na__Sect__UpdateSectionTransforms(section) {
        const basis = Na__SectCap__BuildPlaneBasis(section.plane);
        const orientation = new THREE.Matrix4().makeBasis(basis.u, basis.v, basis.n);
        section.gizmoGroup.quaternion.setFromRotationMatrix(orientation);        // <-- Local +Z = kept-side normal

        const centreDist = section.plane.distanceToPoint(section.boxCentre);
        section.gizmoGroup.position.copy(section.boxCentre)
            .addScaledVector(section.plane.normal, -centreDist);                 // <-- Model centre projected onto the plane

        section.capMesh.position.copy(section.plane.normal)
            .multiplyScalar(-Na__Sect__CapOffsetUnits());                        // <-- Nudge fill into the removed half-space (kills z-fighting)
        section.outlineMesh.position.copy(section.plane.normal)
            .multiplyScalar(-Na__Sect__LineOffsetUnits());                       // <-- Profile lines sit just proud of the fill
    }
    // ------------------------------------------------------------


    // FUNCTION | Recompute Cap Fill + Profile Outline Geometry for a Section
    // ------------------------------------------------------------
    function Na__Sect__RecomputeSectionCaps(section) {
        if (!Na__Sect__ModelRoot) return;
        if (!section.enabled) return;                                           // <-- OFF sections cut nothing; stay hidden (no wasted work)

        const result = Na__SectCap__ComputeSectionGeometry(Na__Sect__ModelRoot, section.plane, {
            weldToleranceUnits : Na__Sect__WeldTolUnits(),
            minLoopAreaUnits2  : Na__Sect__MinLoopArea(),
            maxSegments        : Na__Sect__MaxSegments()
        });

        // CAP FILL | Swap in the freshly triangulated geometry
        const oldCapGeometry = section.capMesh.geometry;
        if (result.capPositions) {
            const capGeometry = new THREE.BufferGeometry();
            capGeometry.setAttribute('position', new THREE.BufferAttribute(result.capPositions, 3));
            capGeometry.computeVertexNormals();                                  // <-- Flat plane normals for the profile-lines normal pass
            section.capMesh.geometry = capGeometry;
            section.capMesh.visible  = true;
        } else {
            section.capMesh.geometry = new THREE.BufferGeometry();
            section.capMesh.visible  = false;                                    // <-- Plane outside the model: nothing to fill
        }
        if (oldCapGeometry) oldCapGeometry.dispose();

        // PROFILE OUTLINE | Fat line segments around every cut island
        const oldOutlineGeometry = section.outlineMesh.geometry;
        if (result.outlinePositions) {
            const outlineGeometry = new LineSegmentsGeometry();
            outlineGeometry.setPositions(result.outlinePositions);
            section.outlineMesh.geometry = outlineGeometry;
            section.outlineMesh.visible  = true;
        } else {
            section.outlineMesh.geometry = new LineSegmentsGeometry();
            section.outlineMesh.visible  = false;
        }
        if (oldOutlineGeometry) oldOutlineGeometry.dispose();

        if (result.aborted) {
            console.warn('[CrossSection] Cap recompute aborted — model exceeds live segment budget; clip planes remain active.');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Slice Depth in World Units From Metres
    // ------------------------------------------------------------
    function Na__Sect__SliceDepthUnitsFromM(depthM) {
        if (!Number.isFinite(depthM) || depthM <= 0) return null;
        return Na__Math__ConvertMmToUnits(depthM * 1000);                         // <-- Metres → mm → scene units
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Section From World Hit Point + Plane Normal
    // ------------------------------------------------------------
    function Na__CrossSection__AddSectionFromHit(hitPoint, planeNormal, modeKey) {
        if (!Na__Sect__Initialized || !Na__Sect__FeatureEnabled) return null;
        if (!hitPoint || !planeNormal) return null;

        const mode = (modeKey === Na__Sect__MODE_PLAN) ? Na__Sect__MODE_PLAN : Na__Sect__MODE_UPRIGHT;
        const box = new THREE.Box3().setFromObject(Na__Sect__ModelRoot);
        if (box.isEmpty()) {
            console.warn('[CrossSection] Cannot add section — model bounds are empty.');
            return null;
        }
        Na__Sect__EnsureRootGroups();
        Na__Sect__Renderer.localClippingEnabled = true;

        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const normal = planeNormal.clone().normalize();
        const plane  = new THREE.Plane(normal, -normal.dot(hitPoint));            // <-- Plane through the clicked face

        const basis  = Na__SectCap__BuildPlaneBasis(plane);
        const margin = Na__Math__ConvertMmToUnits(Na__Sect__CfgVal('CrossSectionView__Gizmo__Config', 'CrossSectionView__Gizmo__Config__MarginByMm', Na__Sect__FB_MARGIN_MM));
        const gizmoW = Math.abs(size.x * basis.u.x) + Math.abs(size.y * basis.u.y) + Math.abs(size.z * basis.u.z) + margin * 2;
        const gizmoH = Math.abs(size.x * basis.v.x) + Math.abs(size.y * basis.v.y) + Math.abs(size.z * basis.v.z) + margin * 2;

        const { group: gizmoGroup, handleMesh } = Na__SectGizmo__Create(Na__Sect__NextId, gizmoW, gizmoH, Na__Sect__ResolveGizmoStyle());

        const capMaterial = new THREE.MeshBasicMaterial({
            color : new THREE.Color(Na__Sect__FillColor),
            side  : THREE.DoubleSide,
            fog   : false
        });
        const capMesh = new THREE.Mesh(new THREE.BufferGeometry(), capMaterial);
        capMesh.name = `Na__CrossSectionView__CapFill__${Na__Sect__NextId}`;
        capMesh.userData.naCrossSectionHelper = true;
        capMesh.renderOrder = 1;

        const outlineMaterial = new LineMaterial({
            color      : new THREE.Color(Na__Sect__LineColor).getHex(),
            linewidth  : Na__Sect__LineWidthPx,
            worldUnits : false
        });
        outlineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        const outlineMesh = new LineSegments2(new LineSegmentsGeometry(), outlineMaterial);
        outlineMesh.name = `Na__CrossSectionView__CapOutline__${Na__Sect__NextId}`;
        outlineMesh.userData.naCrossSectionHelper = true;
        outlineMesh.renderOrder = 2;

        Na__Sect__ModeCounters[mode] += 1;
        const section = {
            id              : Na__Sect__NextId++,
            axis            : mode,                                              // <-- Kept as "axis" for UI row compatibility
            mode            : mode,
            name            : `${Na__Sect__MODE_LABELS[mode]} ${Na__Sect__ModeCounters[mode]}`,
            plane           : plane,
            backPlane       : null,
            sliceDepthUnits : Na__Sect__SliceDepthUnitsFromM(Na__Sect__SliceDepthM),
            boxCentre       : centre,
            boxMin          : 0,
            boxMax          : 0,
            gizmoGroup      : gizmoGroup,
            handleMesh      : handleMesh,
            capMesh         : capMesh,
            outlineMesh     : outlineMesh,
            otherPlanes     : [],
            gizmoVisible    : true,
            enabled         : true                                                // <-- Eye toggle: independent of gizmo visibility
        };
        Na__Sect__ComputeDragClampRange(section, box);

        Na__Sect__HelperRoot.add(gizmoGroup);
        Na__Sect__CapRoot.add(capMesh);
        Na__Sect__CapRoot.add(outlineMesh);
        Na__Sect__Sections.push(section);

        Na__Sect__SyncActivePlanes();
        Na__Sect__UpdateSectionTransforms(section);
        Na__Sect__ApplyGizmoVisibility(section);
        Na__Sect__ApplyEnabledVisibility(section);
        Na__Sect__RecomputeSectionCaps(section);
        Na__Sect__AttachInteractionListeners();
        Na__Sect__InvalidateProfileCache();
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();

        console.log(`[CrossSection] Section added: ${section.name}`);
        return section.id;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a New Section Plane (Legacy Axis Preset — Kept for Compat)
    // ------------------------------------------------------------
    function Na__CrossSection__AddSection(axisKey) {
        if (!Na__Sect__Initialized || !Na__Sect__FeatureEnabled) return null;

        const box = new THREE.Box3().setFromObject(Na__Sect__ModelRoot);
        if (box.isEmpty()) {
            console.warn('[CrossSection] Cannot add section — model bounds are empty.');
            return null;
        }
        const centre = box.getCenter(new THREE.Vector3());

        if (axisKey === 'PLAN' || axisKey === Na__Sect__MODE_PLAN) {
            return Na__CrossSection__AddSectionFromHit(centre, new THREE.Vector3(0, -1, 0), Na__Sect__MODE_PLAN);
        }
        // Legacy X/Z presets — upright cuts through model centre
        const normal = (axisKey === 'X')
            ? new THREE.Vector3(-1, 0, 0)
            : new THREE.Vector3(0, 0, -1);
        return Na__CrossSection__AddSectionFromHit(centre, normal, Na__Sect__MODE_UPRIGHT);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute Drag Clamp Range Along the Section Normal
    // ------------------------------------------------------------
    // Projects the model bounding box onto the plane normal so the plane can
    // never be dragged completely away from the model (plus a small margin).
    // ------------------------------------------------------------
    function Na__Sect__ComputeDragClampRange(section, box) {
        const n = section.plane.normal;
        let min = Infinity;
        let max = -Infinity;
        for (let cx = 0; cx < 2; cx++) {
            for (let cy = 0; cy < 2; cy++) {
                for (let cz = 0; cz < 2; cz++) {
                    const d = n.x * (cx ? box.max.x : box.min.x)
                            + n.y * (cy ? box.max.y : box.min.y)
                            + n.z * (cz ? box.max.z : box.min.z);
                    if (d < min) min = d;
                    if (d > max) max = d;
                }
            }
        }
        const clampMargin = 0.5;                                                // <-- Allow half a metre past the model bounds
        section.boxMin = min - clampMargin;
        section.boxMax = max + clampMargin;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Section by Id
    // ------------------------------------------------------------
    function Na__CrossSection__RemoveSection(sectionId) {
        const index = Na__Sect__Sections.findIndex((s) => s.id === sectionId);
        if (index === -1) return;
        const section = Na__Sect__Sections[index];

        Na__SectGizmo__Dispose(section.gizmoGroup);
        if (section.capMesh.geometry) section.capMesh.geometry.dispose();
        section.capMesh.material.dispose();
        Na__Sect__CapRoot.remove(section.capMesh);
        if (section.outlineMesh.geometry) section.outlineMesh.geometry.dispose();
        section.outlineMesh.material.dispose();
        Na__Sect__CapRoot.remove(section.outlineMesh);

        Na__Sect__Sections.splice(index, 1);
        Na__Sect__SyncActivePlanes();
        if (Na__Sect__Sections.length === 0) Na__Sect__DetachInteractionListeners();
        Na__Sect__InvalidateProfileCache();
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove All Sections
    // ------------------------------------------------------------
    function Na__CrossSection__RemoveAllSections() {
        const ids = Na__Sect__Sections.map((s) => s.id);
        for (let i = 0; i < ids.length; i++) Na__CrossSection__RemoveSection(ids[i]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Flip a Section's Cut Direction
    // ------------------------------------------------------------
    function Na__CrossSection__FlipSection(sectionId) {
        const section = Na__Sect__Sections.find((s) => s.id === sectionId);
        if (!section) return;

        section.plane.normal.negate();                                          // <-- Same plane, opposite kept side
        section.plane.constant = -section.plane.constant;

        const box = new THREE.Box3().setFromObject(Na__Sect__ModelRoot);
        if (!box.isEmpty()) Na__Sect__ComputeDragClampRange(section, box);       // <-- Clamp range flips with the normal

        Na__Sect__SyncActivePlanes();                                           // <-- Rebuild back plane after flip
        Na__Sect__UpdateSectionTransforms(section);
        Na__Sect__RecomputeSectionCaps(section);
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gizmo Visibility Control
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Combined Global + Per-Section Gizmo Visibility
    // ------------------------------------------------------------
    function Na__Sect__ApplyGizmoVisibility(section) {
        section.gizmoGroup.visible = Na__Sect__GizmosVisible && section.gizmoVisible;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Gizmo Visibility (All Section Planes)
    // ------------------------------------------------------------
    function Na__CrossSection__SetGizmosVisible(visible) {
        Na__Sect__GizmosVisible = Boolean(visible);
        for (let i = 0; i < Na__Sect__Sections.length; i++) Na__Sect__ApplyGizmoVisibility(Na__Sect__Sections[i]);
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Per-Section Gizmo Visibility
    // ------------------------------------------------------------
    function Na__CrossSection__SetSectionGizmoVisible(sectionId, visible) {
        const section = Na__Sect__Sections.find((s) => s.id === sectionId);
        if (!section) return;
        section.gizmoVisible = Boolean(visible);
        Na__Sect__ApplyGizmoVisibility(section);
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Section Enabled (Eye) Toggle — Independent ON/OFF Cutting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Enabled State to Cap Fill + Outline Visibility
    // ------------------------------------------------------------
    // OFF sections cut nothing (see Na__Sect__SyncActivePlanes), so their cap
    // fill / profile outline have nothing to show and are hidden. The gizmo
    // widget is untouched here — it follows Na__Sect__ApplyGizmoVisibility
    // instead, so a section can stay visible-but-inactive for repositioning.
    // ------------------------------------------------------------
    function Na__Sect__ApplyEnabledVisibility(section) {
        section.capMesh.visible     = section.enabled;
        section.outlineMesh.visible = section.enabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Whether a Section Actually Cuts the Model (Eye Icon)
    // ------------------------------------------------------------
    // Independent of gizmo visibility: turning a section OFF removes its
    // plane(s) from the shared clipping array (model + other sections' caps)
    // and hides its own cap/outline, without deleting the section or its
    // saved position — Flip / Drag / re-enable all keep working afterwards.
    // ------------------------------------------------------------
    function Na__CrossSection__SetSectionEnabled(sectionId, enabled) {
        const section = Na__Sect__Sections.find((s) => s.id === sectionId);
        if (!section) return;
        section.enabled = Boolean(enabled);

        Na__Sect__ApplyEnabledVisibility(section);
        Na__Sect__SyncActivePlanes();
        if (section.enabled) Na__Sect__RecomputeSectionCaps(section);            // <-- Refresh geometry in case the model changed while OFF
        Na__Sect__InvalidateProfileCache();
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Appearance Settings (Advanced Panel)
// -----------------------------------------------------------------------------

    // FUNCTION | Set Section Cut Fill Colour
    // ------------------------------------------------------------
    function Na__CrossSection__SetFillColor(hexColor) {
        Na__Sect__FillColor = hexColor;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            Na__Sect__Sections[i].capMesh.material.color.set(hexColor);
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Section Profile Line Colour
    // ------------------------------------------------------------
    function Na__CrossSection__SetLineColor(hexColor) {
        Na__Sect__LineColor = hexColor;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            Na__Sect__Sections[i].outlineMesh.material.color.set(hexColor);
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Section Profile Line Thickness (Pixels)
    // ------------------------------------------------------------
    function Na__CrossSection__SetLineWidth(widthPx) {
        const width = Math.max(0.5, Number(widthPx) || Na__Sect__FB_LINE_WIDTH_PX);
        Na__Sect__LineWidthPx = width;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            Na__Sect__Sections[i].outlineMesh.material.linewidth = width;
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Appearance Settings
    // ------------------------------------------------------------
    function Na__CrossSection__GetAppearance() {
        return {
            fillColor   : Na__Sect__FillColor,
            lineColor   : Na__Sect__LineColor,
            lineWidthPx : Na__Sect__LineWidthPx
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Reset Appearance to Config Defaults
    // ------------------------------------------------------------
    function Na__CrossSection__ResetAppearance() {
        const a = 'CrossSectionView__Appearance__Config';
        Na__CrossSection__SetFillColor(Na__Sect__CfgVal(a, 'CrossSectionView__Appearance__Config__FillColor',   Na__Sect__FB_FILL_COLOR));
        Na__CrossSection__SetLineColor(Na__Sect__CfgVal(a, 'CrossSectionView__Appearance__Config__LineColor',   Na__Sect__FB_LINE_COLOR));
        Na__CrossSection__SetLineWidth(Na__Sect__CfgVal(a, 'CrossSectionView__Appearance__Config__LineWidthPx', Na__Sect__FB_LINE_WIDTH_PX));
        Na__Sect__DispatchStateChanged();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plane Drag Interaction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update the Shared NDC Vector From a Pointer Event
    // ------------------------------------------------------------
    function Na__Sect__UpdatePointerNdc(event) {
        const rect = Na__Sect__Renderer.domElement.getBoundingClientRect();
        Na__Sect__PointerNdc.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Closest Parameter on the Drag Axis to the Pointer Ray
    // ------------------------------------------------------------
    // Solves the closest-points-between-two-lines problem for the section
    // normal axis vs the camera ray. Returns null when near-parallel.
    // ------------------------------------------------------------
    function Na__Sect__ClosestParamOnAxis(axisOrigin, axisDir, ray) {
        const w0x = axisOrigin.x - ray.origin.x;
        const w0y = axisOrigin.y - ray.origin.y;
        const w0z = axisOrigin.z - ray.origin.z;

        const b  = axisDir.dot(ray.direction);                                   // <-- Both directions are unit length
        const d_ = axisDir.x * w0x + axisDir.y * w0y + axisDir.z * w0z;
        const e  = ray.direction.x * w0x + ray.direction.y * w0y + ray.direction.z * w0z;

        const denom = 1 - b * b;
        if (Math.abs(denom) < 1e-6) return null;                                 // <-- Axis parallel to the view ray
        return (b * e - d_) / denom;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drag Pointer Down (Grip Raycast)
    // ------------------------------------------------------------
    function Na__Sect__DragPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;            // <-- Left button / primary touch only
        if (!Na__Sect__FeatureEnabled || Na__Sect__OrthoModeActive) return;
        if (Na__Sect__IsSelecting) return;                                       // <-- Face pick owns the pointer
        if (!Na__Sect__GizmosVisible || Na__Sect__Sections.length === 0) return;

        Na__Sect__UpdatePointerNdc(event);
        Na__Sect__Raycaster.setFromCamera(Na__Sect__PointerNdc, Na__Sect__PerspCamera);

        let hitSection = null;
        let hitDistance = Infinity;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            const section = Na__Sect__Sections[i];
            if (!section.gizmoGroup.visible) continue;
            section.gizmoGroup.updateMatrixWorld(true);                          // <-- Matrices may be stale before the next painted frame
            const hits = Na__Sect__Raycaster.intersectObject(section.handleMesh, false);
            if (hits.length > 0 && hits[0].distance < hitDistance) {
                hitSection  = section;
                hitDistance = hits[0].distance;
            }
        }
        if (!hitSection) return;

        // BEGIN DRAG | Record axis + starting parameters
        Na__Sect__DragSection = hitSection;
        Na__Sect__DragAxisOrigin.copy(hitSection.gizmoGroup.position);
        Na__Sect__DragAxisDir.copy(hitSection.plane.normal);
        Na__Sect__DragStartPlanePos = -hitSection.plane.constant;                // <-- Plane position along its normal
        const startParam = Na__Sect__ClosestParamOnAxis(Na__Sect__DragAxisOrigin, Na__Sect__DragAxisDir, Na__Sect__Raycaster.ray);
        Na__Sect__DragStartParam = (startParam !== null) ? startParam : 0;

        Na__Sect__OrbitControls.enabled = false;                                 // <-- Suppress orbit while dragging
        Na__Sect__Renderer.domElement.style.cursor = 'grabbing';
        Na__RenderLoop__RequestActiveRender('crosssection-drag');
        event.preventDefault();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drag Pointer Move (Live Plane Update)
    // ------------------------------------------------------------
    function Na__Sect__DragPointerMove(event) {
        if (!Na__Sect__DragSection) {
            Na__Sect__UpdateHoverCursor(event);                                  // <-- Idle: show grab cursor over grips
            return;
        }

        Na__Sect__UpdatePointerNdc(event);
        Na__Sect__Raycaster.setFromCamera(Na__Sect__PointerNdc, Na__Sect__PerspCamera);
        const param = Na__Sect__ClosestParamOnAxis(Na__Sect__DragAxisOrigin, Na__Sect__DragAxisDir, Na__Sect__Raycaster.ray);
        if (param === null) return;

        const section  = Na__Sect__DragSection;
        let newPlanePos = Na__Sect__DragStartPlanePos + (param - Na__Sect__DragStartParam);
        newPlanePos = Math.max(section.boxMin, Math.min(section.boxMax, newPlanePos));   // <-- Clamp to model extents
        section.plane.constant = -newPlanePos;                                   // <-- Shared plane instance: clips update everywhere
        Na__Sect__UpdateBackPlane(section);                                      // <-- Keep slice depth locked to the primary

        Na__Sect__UpdateSectionTransforms(section);

        // THROTTLED LIVE CAPS | Fill + outline follow the drag at a steady cadence
        const now = performance.now();
        if (now - Na__Sect__LastRecomputeMs >= Na__Sect__ThrottleMs()) {
            Na__Sect__LastRecomputeMs = now;
            Na__Sect__RecomputeSectionCaps(section);
        }
        Na__RenderLoop__RequestRender();
        event.preventDefault();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drag Pointer Up (Final Recompute)
    // ------------------------------------------------------------
    function Na__Sect__DragPointerUp() {
        if (!Na__Sect__DragSection) return;
        const section = Na__Sect__DragSection;
        Na__Sect__DragSection = null;

        Na__Sect__OrbitControls.enabled = true;
        Na__Sect__Renderer.domElement.style.cursor = '';
        Na__RenderLoop__StopActiveRender('crosssection-drag');

        Na__Sect__RecomputeSectionCaps(section);                                 // <-- Exact caps at the final resting position
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Hover Cursor Feedback Over Drag Grips
    // ------------------------------------------------------------
    function Na__Sect__UpdateHoverCursor(event) {
        if (!Na__Sect__FeatureEnabled || Na__Sect__OrthoModeActive) return;
        if (!Na__Sect__GizmosVisible || Na__Sect__Sections.length === 0) return;
        if (event.target !== Na__Sect__Renderer.domElement) return;

        Na__Sect__UpdatePointerNdc(event);
        Na__Sect__Raycaster.setFromCamera(Na__Sect__PointerNdc, Na__Sect__PerspCamera);

        let hovering = false;
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            const section = Na__Sect__Sections[i];
            if (!section.gizmoGroup.visible) continue;
            section.gizmoGroup.updateMatrixWorld(true);                          // <-- Matrices may be stale before the next painted frame
            if (Na__Sect__Raycaster.intersectObject(section.handleMesh, false).length > 0) {
                hovering = true;
                break;
            }
        }
        Na__Sect__Renderer.domElement.style.cursor = hovering ? 'grab' : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Clipping Diagnostics (Dev / Debug)
    // ------------------------------------------------------------
    // Counts how many model materials currently carry the section clipping
    // planes — verifies re-application after engine switches / material swaps.
    // ------------------------------------------------------------
    function Na__CrossSection__GetClippingDiagnostics() {
        let clipped = 0;
        let total   = 0;
        if (Na__Sect__ModelRoot) {
            Na__Sect__ModelRoot.traverse((obj) => {
                if (!obj.material) return;
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (let i = 0; i < materials.length; i++) {
                    total++;
                    if (materials[i].clippingPlanes === Na__Sect__ActivePlanes) clipped++;
                }
            });
        }
        return {
            activePlaneCount      : Na__Sect__ActivePlanes.length,
            modelMaterialsClipped : clipped,
            modelMaterialsTotal   : total,
            perSection            : Na__Sect__Sections.map((s) => ({
                name            : s.name,
                otherPlaneCount : s.otherPlanes.length,
                capFillHex      : '#' + s.capMesh.material.color.getHexString(),
                outlineHex      : '#' + s.outlineMesh.material.color.getHexString(),
                outlineWidthPx  : s.outlineMesh.material.linewidth
            }))
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Diagnostic Pick Test at Client Coordinates (Dev / Debug)
    // ------------------------------------------------------------
    // Mirrors the pointer-down guard chain and grip raycast, reporting which
    // stage rejects the pick. Used by localhost diagnostics.
    // ------------------------------------------------------------
    function Na__CrossSection__DebugPickAt(clientX, clientY) {
        const report = {
            listenersActive : Na__Sect__ListenersActive,
            featureEnabled  : Na__Sect__FeatureEnabled,
            orthoModeActive : Na__Sect__OrthoModeActive,
            gizmosVisible   : Na__Sect__GizmosVisible,
            sectionCount    : Na__Sect__Sections.length,
            hits            : []
        };
        Na__Sect__UpdatePointerNdc({ clientX, clientY });
        report.ndc = [Na__Sect__PointerNdc.x, Na__Sect__PointerNdc.y];
        Na__Sect__Raycaster.setFromCamera(Na__Sect__PointerNdc, Na__Sect__PerspCamera);
        report.cameraPos = Na__Sect__PerspCamera.position.toArray();
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            const section = Na__Sect__Sections[i];
            const handleWorldPos = section.handleMesh.getWorldPosition(new THREE.Vector3());
            const hits = Na__Sect__Raycaster.intersectObject(section.handleMesh, false);
            const recursiveHits = Na__Sect__Raycaster.intersectObject(section.gizmoGroup, true);

            // DIRECT RAY | Camera position straight at the handle centre (must hit if geometry/matrices are sound)
            const directRaycaster = new THREE.Raycaster(
                Na__Sect__PerspCamera.position.clone(),
                handleWorldPos.clone().sub(Na__Sect__PerspCamera.position).normalize()
            );
            const directHits = directRaycaster.intersectObject(section.handleMesh, false);

            report.hits.push({
                name              : section.name,
                gizmoVisible      : section.gizmoGroup.visible,
                hitCount          : hits.length,
                recursiveHitCount : recursiveHits.length,
                directHitCount    : directHits.length,
                handleWorldPos    : handleWorldPos.toArray()
            });
        }
        return report;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Attach Pointer Interaction Listeners
    // ------------------------------------------------------------
    function Na__Sect__AttachInteractionListeners() {
        if (Na__Sect__ListenersActive) return;
        Na__Sect__Renderer.domElement.addEventListener('pointerdown', Na__Sect__DragPointerDown);
        window.addEventListener('pointermove', Na__Sect__DragPointerMove);
        window.addEventListener('pointerup', Na__Sect__DragPointerUp);
        Na__Sect__ListenersActive = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detach Pointer Interaction Listeners
    // ------------------------------------------------------------
    function Na__Sect__DetachInteractionListeners() {
        if (!Na__Sect__ListenersActive) return;
        Na__Sect__Renderer.domElement.removeEventListener('pointerdown', Na__Sect__DragPointerDown);
        window.removeEventListener('pointermove', Na__Sect__DragPointerMove);
        window.removeEventListener('pointerup', Na__Sect__DragPointerUp);
        Na__Sect__ListenersActive = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Selection (Elevation-Style Placement)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Attach Face Selection Listeners
    // ------------------------------------------------------------
    function Na__Sect__AttachSelectionListeners() {
        Na__Sect__Renderer.domElement.addEventListener('pointerdown', Na__Sect__SelectionPointerDown);
        window.addEventListener('pointerup', Na__Sect__SelectionPointerUp);
        window.addEventListener('keydown', Na__Sect__SelectionKeyDown);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Face Selection Listeners
    // ------------------------------------------------------------
    function Na__Sect__RemoveSelectionListeners() {
        if (!Na__Sect__Renderer) return;
        Na__Sect__Renderer.domElement.removeEventListener('pointerdown', Na__Sect__SelectionPointerDown);
        window.removeEventListener('pointerup', Na__Sect__SelectionPointerUp);
        window.removeEventListener('keydown', Na__Sect__SelectionKeyDown);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Selection Pointer Down
    // ------------------------------------------------------------
    function Na__Sect__SelectionPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        Na__Sect__SelectDownX = event.clientX;
        Na__Sect__SelectDownY = event.clientY;
        Na__Sect__SelectPointerDown = true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Selection Key Down (Escape Cancels)
    // ------------------------------------------------------------
    function Na__Sect__SelectionKeyDown(event) {
        if (event.key === 'Escape') Na__CrossSection__CancelFaceSelection();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Selection Pointer Up — Raycast Face Hit
    // ------------------------------------------------------------
    function Na__Sect__SelectionPointerUp(event) {
        if (!Na__Sect__SelectPointerDown || !Na__Sect__IsSelecting) return;
        Na__Sect__SelectPointerDown = false;

        const deltaX = Math.abs(event.clientX - Na__Sect__SelectDownX);
        const deltaY = Math.abs(event.clientY - Na__Sect__SelectDownY);
        if (deltaX > Na__Sect__CLICK_THRESHOLD_PX || deltaY > Na__Sect__CLICK_THRESHOLD_PX) return;

        Na__Sect__UpdatePointerNdc(event);
        Na__Sect__Raycaster.setFromCamera(Na__Sect__PointerNdc, Na__Sect__PerspCamera);

        const meshes = [];
        Na__Sect__ModelRoot.traverse((child) => {
            if (!child.isMesh) return;
            if (child.userData && child.userData.naCrossSectionHelper) return;
            meshes.push(child);
        });
        if (meshes.length === 0) return;

        const intersections = Na__Sect__Raycaster.intersectObjects(meshes, false);
        if (intersections.length === 0) return;

        const hit = intersections[0];
        const faceNormal = hit.face.normal.clone();
        faceNormal.transformDirection(hit.object.matrixWorld);

        Na__Sect__ProcessFaceSelection(hit.point.clone(), faceNormal);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Plane Normal From Face Hit + Placement Mode
    // ------------------------------------------------------------
    // SketchUp behaviour: the clicked face's OUTER shell is discarded and the
    // interior (beyond the cut) is kept. Keep-side normal is derived purely
    // from the clicked face's own normal — never the camera position — so
    // orbiting the view never changes which side of the cut is kept.
    // ------------------------------------------------------------
    function Na__Sect__ProcessFaceSelection(hitPoint, worldNormal) {
        let planeNormal;

        if (Na__Sect__PlacementMode === Na__Sect__MODE_PLAN) {
            planeNormal = new THREE.Vector3(0, -1, 0);                          // <-- Horizontal cut; keeps below
        } else {
            // UPRIGHT | Project face normal to XZ, keep side into the model
            // (negate outward face normal so clicking an exterior face cuts in)
            planeNormal = new THREE.Vector3(worldNormal.x, 0, worldNormal.z);
            if (planeNormal.lengthSq() < 0.001) planeNormal.set(0, 0, 1);
            planeNormal.normalize().negate();
        }

        Na__CrossSection__CancelFaceSelection();
        Na__CrossSection__AddSectionFromHit(hitPoint, planeNormal, Na__Sect__PlacementMode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Start Face Selection for Current Placement Mode
    // ------------------------------------------------------------
    function Na__CrossSection__StartFaceSelection() {
        if (!Na__Sect__Initialized || !Na__Sect__FeatureEnabled) return;
        if (Na__Sect__OrthoModeActive) return;
        if (Na__Sect__IsSelecting) return;

        Na__Sect__IsSelecting = true;
        document.body.classList.add('na-crosssection-selecting');
        Na__Sect__AttachSelectionListeners();
        Na__Sect__DispatchStateChanged();
    }
    // ------------------------------------------------------------


    // FUNCTION | Cancel Face Selection
    // ------------------------------------------------------------
    function Na__CrossSection__CancelFaceSelection() {
        if (!Na__Sect__IsSelecting) return;
        Na__Sect__IsSelecting = false;
        Na__Sect__SelectPointerDown = false;
        document.body.classList.remove('na-crosssection-selecting');
        Na__Sect__RemoveSelectionListeners();
        Na__Sect__DispatchStateChanged();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Placement Mode Between Upright and Plan
    // ------------------------------------------------------------
    function Na__CrossSection__TogglePlacementMode() {
        Na__Sect__PlacementMode = (Na__Sect__PlacementMode === Na__Sect__MODE_PLAN)
            ? Na__Sect__MODE_UPRIGHT
            : Na__Sect__MODE_PLAN;
        Na__Sect__DispatchStateChanged();
        return Na__Sect__PlacementMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Placement Mode Explicitly
    // ------------------------------------------------------------
    function Na__CrossSection__SetPlacementMode(mode) {
        Na__Sect__PlacementMode = (mode === Na__Sect__MODE_PLAN) ? Na__Sect__MODE_PLAN : Na__Sect__MODE_UPRIGHT;
        Na__Sect__DispatchStateChanged();
        return Na__Sect__PlacementMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Placement Mode
    // ------------------------------------------------------------
    function Na__CrossSection__GetPlacementMode() {
        return Na__Sect__PlacementMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Slice Depth in Metres (null/0 = Infinite)
    // ------------------------------------------------------------
    function Na__CrossSection__SetSliceDepthM(depthM) {
        if (depthM === null || depthM === undefined || depthM === '' || Number(depthM) <= 0) {
            Na__Sect__SliceDepthM = null;
        } else {
            const parsed = Number(depthM);
            Na__Sect__SliceDepthM = Number.isFinite(parsed) ? parsed : null;
        }

        const depthUnits = Na__Sect__SliceDepthUnitsFromM(Na__Sect__SliceDepthM);
        for (let i = 0; i < Na__Sect__Sections.length; i++) {
            Na__Sect__Sections[i].sliceDepthUnits = depthUnits;
        }
        Na__Sect__SyncActivePlanes();
        Na__Sect__InvalidateProfileCache();
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Slice Depth in Metres (null = Infinite)
    // ------------------------------------------------------------
    function Na__CrossSection__GetSliceDepthM() {
        return Na__Sect__SliceDepthM;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Feature Gating and Project Config
// -----------------------------------------------------------------------------

    // FUNCTION | Enable / Disable the Cross Section Feature
    // ------------------------------------------------------------
    function Na__CrossSection__SetFeatureEnabled(enabled) {
        const next = Boolean(enabled);
        if (next === Na__Sect__FeatureEnabled) return;
        Na__Sect__FeatureEnabled = next;

        if (!next) {
            Na__CrossSection__CancelFaceSelection();
            Na__CrossSection__RemoveAllSections();                                // <-- Disabling clears every active cut
        }
        Na__Sect__DispatchStateChanged();
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Feature Enabled for This Project?
    // ------------------------------------------------------------
    function Na__CrossSection__IsFeatureEnabled() {
        return Na__Sect__FeatureEnabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Per-Project Config Block (project.json CrossSection__Config)
    // ------------------------------------------------------------
    function Na__CrossSection__ApplyProjectConfig(projectConfig) {
        if (!projectConfig) return;
        if (!Na__Sect__Initialized) {
            Na__Sect__PendingProjectConfig = projectConfig;                      // <-- Replay after Initialize
            return;
        }

        if (typeof projectConfig.CrossSection__FillColor === 'string')   Na__CrossSection__SetFillColor(projectConfig.CrossSection__FillColor);
        if (typeof projectConfig.CrossSection__LineColor === 'string')   Na__CrossSection__SetLineColor(projectConfig.CrossSection__LineColor);
        if (Number.isFinite(projectConfig.CrossSection__LineWidthPx))    Na__CrossSection__SetLineWidth(projectConfig.CrossSection__LineWidthPx);

        Na__CrossSection__SetFeatureEnabled(projectConfig.CrossSection__Enabled === true);
        Na__Sect__DispatchStateChanged();                                        // <-- Ensure UI syncs even when enabled state is unchanged
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Section Summaries for UI Rendering
    // ------------------------------------------------------------
    function Na__CrossSection__GetSections() {
        return Na__Sect__Sections.map((s) => ({
            id           : s.id,
            name         : s.name,
            axis         : s.axis,
            mode         : s.mode || s.axis,
            gizmoVisible : s.gizmoVisible,
            enabled      : s.enabled !== false
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Global Gizmo Visibility
    // ------------------------------------------------------------
    function Na__CrossSection__GetGizmosVisible() {
        return Na__Sect__GizmosVisible;
    }
    // ------------------------------------------------------------


    // FUNCTION | Serialize the Live Section State (JSON-Safe Snapshot)
    // ------------------------------------------------------------
    // Used by the per-scene bindings (Na__CrossSectionView__SceneData).
    // Positions follow the project convention: millimetres along the plane
    // normal. An empty sections array is a VALID snapshot ("no cuts").
    // Also includes the live fill/line appearance so localhost scene setup
    // can persist style per scene for web playback.
    // ------------------------------------------------------------
    function Na__CrossSection__SerializeSections() {
        const round6 = (v) => Math.round(v * 1e6) / 1e6;
        return {
            gizmosVisible : Na__Sect__GizmosVisible,
            sliceDepthM   : Na__Sect__SliceDepthM,
            fillColor     : Na__Sect__FillColor,
            lineColor     : Na__Sect__LineColor,
            lineWidthPx   : Na__Sect__LineWidthPx,
            sections      : Na__Sect__Sections.map((s) => ({
                name         : s.name,
                mode         : s.mode,
                normalXyz    : [round6(s.plane.normal.x), round6(s.plane.normal.y), round6(s.plane.normal.z)],
                positionMm   : Math.round(Na__Math__ConvertUnitsToMm(-s.plane.constant) * 100) / 100,   // <-- Plane position along its normal (mm)
                enabled      : s.enabled,
                gizmoVisible : s.gizmoVisible
            }))
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Serialized Snapshot (Exact Swap of All Sections)
    // ------------------------------------------------------------
    // Replaces every live section with the snapshot's set — a snapshot with
    // zero sections legitimately clears all cuts. Appearance fields
    // (fillColor / lineColor / lineWidthPx) are applied only when present,
    // so Clear + SketchUp snapshots and older bindings without style leave
    // the current colours unchanged. No-ops when the feature is disabled
    // for the project or the system is not yet initialized.
    // ------------------------------------------------------------
    function Na__CrossSection__ApplySerializedSections(snapshot) {
        if (!Na__Sect__Initialized || !Na__Sect__FeatureEnabled || !snapshot) return false;

        Na__CrossSection__CancelFaceSelection();
        Na__CrossSection__RemoveAllSections();
        Na__CrossSection__SetSliceDepthM(Number.isFinite(snapshot.sliceDepthM) ? snapshot.sliceDepthM : null);

        // APPEARANCE | Optional — only apply when the snapshot carries style
        if (typeof snapshot.fillColor === 'string')   Na__CrossSection__SetFillColor(snapshot.fillColor);
        if (typeof snapshot.lineColor === 'string')   Na__CrossSection__SetLineColor(snapshot.lineColor);
        if (Number.isFinite(snapshot.lineWidthPx))    Na__CrossSection__SetLineWidth(snapshot.lineWidthPx);

        const items = Array.isArray(snapshot.sections) ? snapshot.sections : [];
        for (let i = 0; i < items.length; i++) {
            const item   = items[i];
            const rawXyz = Array.isArray(item.normalXyz) ? item.normalXyz : [0, -1, 0];
            const normal = new THREE.Vector3(Number(rawXyz[0]) || 0, Number(rawXyz[1]) || 0, Number(rawXyz[2]) || 0);
            if (normal.lengthSq() < 1e-9) continue;                            // <-- Degenerate entry: skip defensively
            normal.normalize();

            const positionUnits = Na__Math__ConvertMmToUnits(Number(item.positionMm) || 0);
            const planePoint    = normal.clone().multiplyScalar(positionUnits);  // <-- Plane passes through position·normal

            const sectionId = Na__CrossSection__AddSectionFromHit(planePoint, normal, item.mode);
            if (sectionId === null) continue;

            const record = Na__Sect__Sections.find((s) => s.id === sectionId);
            if (!record) continue;
            if (typeof item.name === 'string' && item.name !== '') record.name = item.name;  // <-- Keep the saved display name
            if (item.gizmoVisible === false) {
                record.gizmoVisible = false;
                Na__Sect__ApplyGizmoVisibility(record);
            }
            if (item.enabled === false) Na__CrossSection__SetSectionEnabled(sectionId, false);
        }

        Na__CrossSection__SetGizmosVisible(snapshot.gizmosVisible !== false);
        Na__Sect__DispatchStateChanged();
        Na__RenderLoop__RequestRender();
        console.log(`[CrossSection] Applied scene snapshot: ${items.length} section(s)`);
        return true;
    }
    // ------------------------------------------------------------


    // MODULE VARIABLES | Image Export Mode State
    // ------------------------------------------------------------
    let Na__Sect__ExportModeActive       = false;
    let Na__Sect__ExportSavedRootVisible = true;
    // ------------------------------------------------------------


    // FUNCTION | Enter / Leave Image Export Mode
    // ------------------------------------------------------------
    // Called by the tiled exporter around the tile loop:
    // - Gizmo plane widgets are ALWAYS hidden in exports (caps + profile
    //   lines only), regardless of the viewport toggle.
    // - Outline fat-line widths get the standard linework export scale
    //   (outputH / tile framebuffer height) so exported line weights match
    //   the viewport look; restored to the live width on exit.
    // ------------------------------------------------------------
    function Na__CrossSection__SetExportMode(active, lineWidthScale) {
        if (active) {
            if (Na__Sect__ExportModeActive) return;
            Na__Sect__ExportModeActive = true;

            if (Na__Sect__HelperRoot) {
                Na__Sect__ExportSavedRootVisible = Na__Sect__HelperRoot.visible;
                Na__Sect__HelperRoot.visible = false;                          // <-- Plane widgets never appear in exports
            }
            const scale = (Number.isFinite(lineWidthScale) && lineWidthScale > 0) ? lineWidthScale : 1.0;
            for (let i = 0; i < Na__Sect__Sections.length; i++) {
                Na__Sect__Sections[i].outlineMesh.material.linewidth = Na__Sect__LineWidthPx * scale;
            }
        } else {
            if (!Na__Sect__ExportModeActive) return;
            Na__Sect__ExportModeActive = false;

            if (Na__Sect__HelperRoot) Na__Sect__HelperRoot.visible = Na__Sect__ExportSavedRootVisible;
            for (let i = 0; i < Na__Sect__Sections.length; i++) {
                Na__Sect__Sections[i].outlineMesh.material.linewidth = Na__Sect__LineWidthPx;
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Diagnostic Info for Every Active Section (Dev / Debug)
    // ------------------------------------------------------------
    // Exposes cap/outline sizes, plane constants, and the gizmo grip position
    // in NDC screen space — used by localhost diagnostics and automated checks.
    // ------------------------------------------------------------
    function Na__CrossSection__GetDebugInfo() {
        return Na__Sect__Sections.map((s) => {
            const gripNdc = s.gizmoGroup.position.clone().project(Na__Sect__PerspCamera);
            return {
                id                  : s.id,
                name                : s.name,
                planeNormal         : s.plane.normal.toArray(),
                planeConstant       : s.plane.constant,
                capVertexCount      : s.capMesh.geometry.attributes.position ? s.capMesh.geometry.attributes.position.count : 0,
                outlineSegmentCount : s.outlineMesh.geometry.attributes.instanceStart ? s.outlineMesh.geometry.attributes.instanceStart.count : 0,
                capVisible          : s.capMesh.visible,
                gizmoVisible        : s.gizmoGroup.visible,
                capLayerMask        : s.capMesh.layers.mask,
                outlineLayerMask    : s.outlineMesh.layers.mask,
                handleLayerMask     : s.handleMesh.layers.mask,
                gripNdc             : [gripNdc.x, gripNdc.y]
            };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Cross Section View System
    // ------------------------------------------------------------
    function Na__CrossSection__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot) {
        Na__Sect__Scene         = scene;
        Na__Sect__PerspCamera   = camera;
        Na__Sect__Renderer      = renderer;
        Na__Sect__OrbitControls = controls;
        Na__Sect__PipelineRef   = pipelineRef;
        Na__Sect__ModelRoot     = modelRoot;
        Na__Sect__Initialized   = true;

        Na__Sect__Renderer.localClippingEnabled = true;                          // <-- Zero-cost until planes exist

        // SHARED CLIPPING STATE | Profile-line override passes follow this array
        Na__SectionClipping__SetPlanes(Na__Sect__ActivePlanes);

        // OVERLAY RENDERER | Register the after-composer draw callback so the
        // render loop paints section visuals free of fog / SSAO / Sobel
        Na__SectionClipping__SetOverlayRenderer(Na__Sect__RenderOverlay);

        // EXPORT MODE HANDLER | Lets the tiled image exporter hide gizmos and
        // scale outline widths without importing this module directly
        Na__SectionClipping__SetExportModeHandler(Na__CrossSection__SetExportMode);

        // CONFIG | Async fetch; fallbacks cover the gap
        Na__Sect__FetchConfig().then((config) => {
            Na__Sect__Config = config;
            Na__Sect__FillColor   = Na__Sect__CfgVal('CrossSectionView__Appearance__Config', 'CrossSectionView__Appearance__Config__FillColor',   Na__Sect__FillColor);
            Na__Sect__LineColor   = Na__Sect__CfgVal('CrossSectionView__Appearance__Config', 'CrossSectionView__Appearance__Config__LineColor',   Na__Sect__LineColor);
            Na__Sect__LineWidthPx = Na__Sect__CfgVal('CrossSectionView__Appearance__Config', 'CrossSectionView__Appearance__Config__LineWidthPx', Na__Sect__LineWidthPx);
            Na__Sect__DispatchStateChanged();                                    // <-- Sync Advanced panel inputs with config defaults
        });

        // ENGINE SWITCH | Materials are replaced wholesale — re-apply clipping
        window.addEventListener('na-render-engine-changed', () => {
            if (Na__Sect__ActivePlanes.length > 0) {
                Na__Sect__ApplyClippingToModel();
                Na__Sect__InvalidateProfileCache();
                Na__RenderLoop__RequestRender();
            }
        });

        // ELEVATION MODE | Drag interaction pauses while the ortho camera drives
        window.addEventListener('na-elevation-camera-changed', (event) => {
            Na__Sect__OrthoModeActive = !!(event.detail && event.detail.isOrtho);
        });

        // RESIZE | Fat line materials need the viewport resolution
        window.addEventListener('resize', () => {
            for (let i = 0; i < Na__Sect__Sections.length; i++) {
                Na__Sect__Sections[i].outlineMesh.material.resolution.set(window.innerWidth, window.innerHeight);
            }
        });

        // PENDING PROJECT CONFIG | Replay a config that arrived before init
        if (Na__Sect__PendingProjectConfig) {
            const pending = Na__Sect__PendingProjectConfig;
            Na__Sect__PendingProjectConfig = null;
            Na__CrossSection__ApplyProjectConfig(pending);
        }

        console.log('[ValeVision3D] Cross Section View system initialized');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Cross Section View API
    // ------------------------------------------------------------
    export {
        Na__CrossSection__Initialize,
        Na__CrossSection__SetFeatureEnabled,
        Na__CrossSection__IsFeatureEnabled,
        Na__CrossSection__ApplyProjectConfig,
        Na__CrossSection__AddSection,
        Na__CrossSection__AddSectionFromHit,
        Na__CrossSection__StartFaceSelection,
        Na__CrossSection__CancelFaceSelection,
        Na__CrossSection__TogglePlacementMode,
        Na__CrossSection__SetPlacementMode,
        Na__CrossSection__GetPlacementMode,
        Na__CrossSection__SetSliceDepthM,
        Na__CrossSection__GetSliceDepthM,
        Na__CrossSection__RemoveSection,
        Na__CrossSection__RemoveAllSections,
        Na__CrossSection__FlipSection,
        Na__CrossSection__SetGizmosVisible,
        Na__CrossSection__GetGizmosVisible,
        Na__CrossSection__SetSectionGizmoVisible,
        Na__CrossSection__SetSectionEnabled,
        Na__CrossSection__SetFillColor,
        Na__CrossSection__SetLineColor,
        Na__CrossSection__SetLineWidth,
        Na__CrossSection__GetAppearance,
        Na__CrossSection__ResetAppearance,
        Na__CrossSection__GetSections,
        Na__CrossSection__SerializeSections,
        Na__CrossSection__ApplySerializedSections,
        Na__CrossSection__SetExportMode,
        Na__CrossSection__GetDebugInfo,
        Na__CrossSection__DebugPickAt,
        Na__CrossSection__GetClippingDiagnostics
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
