/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | SCENE MANAGER
   =============================================================================

   FILE       : VghLantern__Env3d__SceneManager__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - SceneManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the renderer, scene graph and draw loop for one 3D surface
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Factory module. Each call to Create returns an independent 3D surface, so the
     Lantern Editor 3D panel and the dedicated 3D View mode can both be alive
     without sharing a renderer or fighting over the canvas.
   - Owns the fixed group stack (skeleton / glazing / components / helpers) so
     every mesh builder writes into a known, clearable group rather than adding
     loose objects to the scene root.
   - Draws on demand only. Nothing renders until something calls Invalidate,
     which keeps an idle 3D panel at zero GPU cost.

   ---------------------------------------------------------------------------

   GROUP STACK (drawn in scene-graph order, cleared independently):
       helpers      ground plane, grid, debug aids
       skeleton     swept or line-drawn structural members
       glazing      translucent glass faces
       components   loaded GLB finials, bases, cresting, vents

   ---------------------------------------------------------------------------

   RESOURCE OWNERSHIP:
   Geometries and materials created by the mesh builders are disposed here when a
   group is cleared. Materials owned by MaterialLibrary are shared and are NOT
   disposed on clear - only on surface Destroy.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__Value,
    VghLantern__Env3d__ConfigAccess__MmToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | 3D Scene Manager Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Group Names and Canvas Classes
    // ------------------------------------------------------------
    const GROUP_ORDER      =  ['helpers', 'skeleton', 'glazing', 'components']; // <-- Fixed stack, created once per surface
    const CSS_CANVAS       =  'VghLantern__Env3d__Canvas';                   // <-- Styled by Env3d Styles__Main__.css
    const CSS_HOST_ACTIVE  =  'VghLantern__Env3d__Host--active';             // <-- Marks a host that owns a live surface
    const MIN_CANVAS_PX    =  2;                                             // <-- Below this the host is not laid out yet
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resource Disposal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispose a Single Object's Owned Resources
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__DisposeObject(object3d) {
        if (object3d.geometry && typeof object3d.geometry.dispose === 'function') {
            object3d.geometry.dispose();                                      // <-- Geometry is always builder-owned
        }

        if (!object3d.material) return;

        const materials  =  Array.isArray(object3d.material) ? object3d.material : [object3d.material];
        for (let i = 0; i < materials.length; i++) {
            const material  =  materials[i];
            if (!material) continue;
            if (material.userData && material.userData.VghLantern__Shared === true) continue; // <-- Library-owned, shared
            if (typeof material.dispose === 'function') material.dispose();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively Empty a Group and Free Its Resources
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__EmptyGroup(group) {
        if (!group) return;

        for (let i = group.children.length - 1; i >= 0; i--) {
            const child  =  group.children[i];
            child.traverse(VghLantern__Env3d__SceneManager__DisposeObject);
            group.remove(child);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ground Plane and Grid
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Ground Grid Helper
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__BuildGroundGrid() {
        const config  =  VghLantern__Env3d__ConfigAccess__Section('GroundPlane');
        if (config.Enabled !== true || config.ShowGrid !== true) return null;

        const extentMm   =  Number(config.GridExtentMm)  || 12000;
        const spacingMm  =  Number(config.GridSpacingMm) || 500;
        const divisions  =  Math.max(2, Math.round(extentMm / spacingMm));
        const sizeWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(extentMm);
        const colour     =  new THREE.Color(config.GridColour || '#c4cace');

        const grid  =  new THREE.GridHelper(sizeWorld, divisions, colour, colour);
        grid.name                =  'VghLantern__Env3d__GroundGrid';
        grid.material.opacity    =  0.5;
        grid.material.transparent =  true;
        grid.material.depthWrite =  false;                                    // <-- Keeps the grid from biting into the model
        return grid;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create an Independent 3D Surface Inside a Host Element
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__Create(hostElement) {
        if (!hostElement) return null;

        const rendererConfig  =  VghLantern__Env3d__ConfigAccess__Section('Renderer');

        // RENDERER
        const renderer  =  new THREE.WebGLRenderer({
            antialias             : rendererConfig.Antialias !== false,
            preserveDrawingBuffer : rendererConfig.PreserveDrawingBuffer !== false,
            alpha                 : true
        });
        renderer.domElement.className  =  CSS_CANVAS;
        renderer.setClearColor(new THREE.Color(rendererConfig.ClearColorFallback || '#dfe3e6'), 1);
        renderer.toneMappingExposure   =  Number(rendererConfig.ToneMappingExposure) || 1.0;
        hostElement.appendChild(renderer.domElement);
        hostElement.classList.add(CSS_HOST_ACTIVE);

        // SCENE AND GROUP STACK
        const scene   =  new THREE.Scene();
        const groups  =  {};
        for (let i = 0; i < GROUP_ORDER.length; i++) {
            const group  =  new THREE.Group();
            group.name   =  'VghLantern__Env3d__Group__' + GROUP_ORDER[i];
            scene.add(group);
            groups[GROUP_ORDER[i]]  =  group;
        }

        const surface  =  {
            HostElement  : hostElement,
            Renderer     : renderer,
            Scene        : scene,
            Groups       : groups,
            Camera       : null,                                              // <-- Assigned by CameraRig
            Controls     : null,                                              // <-- Assigned by CameraRig
            NeedsDraw    : true,
            IsDestroyed  : false,
            FrameHandle  : 0,
            ResizeObs    : null,
            OnBeforeDraw : null                                               // <-- Optional hook, used by CameraRig damping
        };

        VghLantern__Env3d__SceneManager__AttachGroundPlane(surface);
        VghLantern__Env3d__SceneManager__AttachResizeObserver(surface);
        VghLantern__Env3d__SceneManager__Resize(surface);
        VghLantern__Env3d__SceneManager__StartLoop(surface);

        return surface;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Attach the Ground Grid to the Helpers Group
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__AttachGroundPlane(surface) {
        const grid  =  VghLantern__Env3d__SceneManager__BuildGroundGrid();
        if (grid) surface.Groups.helpers.add(grid);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sizing and Draw Loop
// -----------------------------------------------------------------------------

    // FUNCTION | Match Renderer and Camera to the Host Element Size
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__Resize(surface) {
        if (!surface || surface.IsDestroyed) return;

        const widthPx   =  surface.HostElement.clientWidth;
        const heightPx  =  surface.HostElement.clientHeight;
        if (widthPx < MIN_CANVAS_PX || heightPx < MIN_CANVAS_PX) return;      // <-- Host is hidden or not laid out yet

        const maxRatio  =  Number(VghLantern__Env3d__ConfigAccess__Value('Renderer', 'MaxPixelRatio', 2)) || 2;
        const ratio     =  Math.min(window.devicePixelRatio || 1, maxRatio);

        surface.Renderer.setPixelRatio(ratio);
        surface.Renderer.setSize(widthPx, heightPx, false);

        if (surface.Camera && surface.Camera.isPerspectiveCamera) {
            surface.Camera.aspect  =  widthPx / heightPx;
            surface.Camera.updateProjectionMatrix();
        }

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Observe Host Resizes
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__AttachResizeObserver(surface) {
        if (typeof ResizeObserver !== 'function') return;                     // <-- Older browser: caller may resize manually

        surface.ResizeObs  =  new ResizeObserver(function() {
            VghLantern__Env3d__SceneManager__Resize(surface);
        });
        surface.ResizeObs.observe(surface.HostElement);
    }
    // ------------------------------------------------------------


    // FUNCTION | Request a Redraw on the Next Frame
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__Invalidate(surface) {
        if (surface && !surface.IsDestroyed) surface.NeedsDraw  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Run the On-Demand Draw Loop
    // ------------------------------------------------------------
    function VghLantern__Env3d__SceneManager__StartLoop(surface) {
        const onDemand  =  VghLantern__Env3d__ConfigAccess__Value('Renderer', 'OnDemandRendering', true) !== false;

        function VghLantern__Env3d__SceneManager__Frame() {
            if (surface.IsDestroyed) return;
            surface.FrameHandle  =  requestAnimationFrame(VghLantern__Env3d__SceneManager__Frame);

            if (typeof surface.OnBeforeDraw === 'function') {
                surface.OnBeforeDraw(surface);                                 // <-- Controls damping may set NeedsDraw
            }

            if (onDemand && !surface.NeedsDraw) return;                        // <-- Idle: skip the draw entirely
            if (!surface.Camera) return;

            surface.NeedsDraw  =  false;
            surface.Renderer.render(surface.Scene, surface.Camera);
        }

        surface.FrameHandle  =  requestAnimationFrame(VghLantern__Env3d__SceneManager__Frame);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Group Access and Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Named Group From the Fixed Stack
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__GetGroup(surface, groupName) {
        if (!surface || !surface.Groups) return null;
        return surface.Groups[groupName] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear a Named Group and Free Its Owned Resources
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__ClearGroup(surface, groupName) {
        const group  =  VghLantern__Env3d__SceneManager__GetGroup(surface, groupName);
        VghLantern__Env3d__SceneManager__EmptyGroup(group);
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Every Model Group, Leaving Helpers Intact
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__ClearModelGroups(surface) {
        VghLantern__Env3d__SceneManager__ClearGroup(surface, 'skeleton');
        VghLantern__Env3d__SceneManager__ClearGroup(surface, 'glazing');
        VghLantern__Env3d__SceneManager__ClearGroup(surface, 'components');
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy a Surface and Release the WebGL Context
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SceneManager__Destroy(surface) {
        if (!surface || surface.IsDestroyed) return;
        surface.IsDestroyed  =  true;

        if (surface.FrameHandle) cancelAnimationFrame(surface.FrameHandle);
        if (surface.ResizeObs)   surface.ResizeObs.disconnect();
        if (surface.Controls && typeof surface.Controls.dispose === 'function') surface.Controls.dispose();

        for (let i = 0; i < GROUP_ORDER.length; i++) {
            VghLantern__Env3d__SceneManager__EmptyGroup(surface.Groups[GROUP_ORDER[i]]);
        }

        surface.Renderer.dispose();
        if (surface.Renderer.domElement.parentNode) {
            surface.Renderer.domElement.parentNode.removeChild(surface.Renderer.domElement);
        }
        surface.HostElement.classList.remove(CSS_HOST_ACTIVE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
