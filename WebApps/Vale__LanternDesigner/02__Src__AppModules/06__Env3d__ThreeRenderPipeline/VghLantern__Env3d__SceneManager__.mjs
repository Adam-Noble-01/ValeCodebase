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
   - Owns the fixed group stack, and publishes its vocabulary, so every builder
     writes into a known, clearable group rather than adding loose objects to the
     scene root - and so no consumer has to spell a group name as a literal.
   - Draws on demand only. Nothing renders until something calls Invalidate,
     which keeps an idle 3D panel at zero GPU cost.

   ---------------------------------------------------------------------------

   GROUP STACK (drawn in scene-graph order, cleared independently):
       Helpers             ground plane, grid, debug aids
       Solid3d__Frame      swept or line-drawn structural members, and the base
                           prisms. SOLID GEOMETRY - what the user sees and what a
                           snapshot captures.
       Solid3d__Glazing    translucent glass faces
       Solid3d__Components loaded GLB finials, bases, cresting, vents
       SetOut__Lines       datum and construction linework, the setting-out view
       Overlay__Highlight  hover inspector instance overlay, transient

   ---------------------------------------------------------------------------

   WHY THE GROUP NAMES ARE EXPORTED RATHER THAN WRITTEN AS LITERALS

   Four separate lists used to name these groups as bare strings - the stack here,
   the rebuild clear, the hover picker's raycast roots and the highlight layer's
   ghosting sweep. Adding a group meant editing all four, and forgetting any one
   of them failed silently: a group that is never cleared leaks geometry, one that
   is never raycast is invisible to the cursor, one that is never ghosted stays
   bright while the model recedes around it.

   The names and the meaningful SETS of them are now published from this module,
   so there is one place to add a group and nowhere to forget it. The old name
   'skeleton' is gone deliberately: it held every solid mesh in the model and read
   as though it held setting-out linework, which is the exact confusion the
   SetOut__Lines group now resolves.

   ---------------------------------------------------------------------------

   RESOURCE OWNERSHIP:
   Geometries and materials created by the mesh builders are disposed here when a
   group is cleared. Materials owned by MaterialLibrary and by the setting-out
   LineFactory are shared and are NOT disposed on clear - only on surface Destroy.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireString,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | 3D Scene Manager Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Scene Group Vocabulary
    // ------------------------------------------------------------
    // Two stage names: the geometry CLASS, then the part. Solid3d is mesh geometry
    // the user sees and a snapshot captures. SetOut is setting-out linework, which
    // is neither manufactured nor issued. Overlay is transient interaction state.
    export const VghLantern__Env3d__SceneGroup  =  {
        Helpers             : 'helpers',
        Solid3d__Frame      : 'solid3d__frame',
        Solid3d__Glazing    : 'solid3d__glazing',
        Solid3d__Components : 'solid3d__components',
        SetOut__Lines       : 'setOut__lines',
        Overlay__Highlight  : 'overlay__highlight'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Meaningful Sets of Groups
    // ------------------------------------------------------------
    // Every consumer that needs "the solid model" or "everything a rebuild
    // replaces" takes it from here rather than writing its own list.
    export const VghLantern__Env3d__SceneGroupOrder  =  [                    // <-- Creation and draw order
        VghLantern__Env3d__SceneGroup.Helpers,
        VghLantern__Env3d__SceneGroup.Solid3d__Frame,
        VghLantern__Env3d__SceneGroup.Solid3d__Glazing,
        VghLantern__Env3d__SceneGroup.Solid3d__Components,
        VghLantern__Env3d__SceneGroup.SetOut__Lines,
        VghLantern__Env3d__SceneGroup.Overlay__Highlight
    ];

    export const VghLantern__Env3d__SceneGroupSet__Solid3d  =  [             // <-- The visible solid model
        VghLantern__Env3d__SceneGroup.Solid3d__Frame,
        VghLantern__Env3d__SceneGroup.Solid3d__Glazing,
        VghLantern__Env3d__SceneGroup.Solid3d__Components
    ];

    export const VghLantern__Env3d__SceneGroupSet__Rebuilt  =  [             // <-- Cleared and rebuilt on every solve
        VghLantern__Env3d__SceneGroup.Overlay__Highlight,                    // <-- First: its geometry slices the buffers below
        VghLantern__Env3d__SceneGroup.Solid3d__Frame,
        VghLantern__Env3d__SceneGroup.Solid3d__Glazing,
        VghLantern__Env3d__SceneGroup.Solid3d__Components,
        VghLantern__Env3d__SceneGroup.SetOut__Lines
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Canvas Classes and Guards
    // ------------------------------------------------------------
    const CSS_CANVAS       =  'VghLantern__Env3d__Canvas';                   // <-- Styled by Env3d Styles__Main__.css
    const CSS_HOST_ACTIVE  =  'VghLantern__Env3d__Host--active';             // <-- Marks a host that owns a live surface
    const MIN_CANVAS_PX    =  2;                                             // <-- Below this the host is not laid out yet

    const GROUND_GRID_NAME =  'VghLantern__Env3d__GroundGrid';               // <-- The helpers group also holds the light rig, so the grid is addressed by name
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
        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('GroundPlane', 'Enabled')) return null;
        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('GroundPlane', 'ShowGrid')) return null;

        const extentMm   =  VghLantern__Env3d__ConfigAccess__RequireNumber('GroundPlane', 'GridExtentMm');
        const spacingMm  =  VghLantern__Env3d__ConfigAccess__RequireNumber('GroundPlane', 'GridSpacingMm');
        const divisions  =  Math.max(2, Math.round(extentMm / spacingMm));
        const sizeWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(extentMm);
        const colour     =  new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('GroundPlane', 'GridColour'));

        const grid  =  new THREE.GridHelper(sizeWorld, divisions, colour, colour);
        grid.name                =  GROUND_GRID_NAME;
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
    // options.ShowGroundPlane set to false builds the surface without the ground
    // grid at all. Drawing sheet viewports use it: the grid is a modelling aid, and
    // on an issued drawing it reads as construction linework that is not part of the
    // lantern. Suppressed at build time rather than hidden at capture time, because
    // the light rig shares the helpers group and hiding that group would render the
    // lantern as an unlit black silhouette.
    export function VghLantern__Env3d__SceneManager__Create(hostElement, options) {
        if (!hostElement) return null;

        const surfaceOptions  =  options || {};

        // RENDERER
        const renderer  =  new THREE.WebGLRenderer({
            antialias             : VghLantern__Env3d__ConfigAccess__RequireBoolean('Renderer', 'Antialias'),
            preserveDrawingBuffer : VghLantern__Env3d__ConfigAccess__RequireBoolean('Renderer', 'PreserveDrawingBuffer'),
            alpha                 : true
        });
        renderer.domElement.className  =  CSS_CANVAS;
        renderer.setClearColor(new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('Renderer', 'ClearColorFallback')), 1);
        renderer.toneMappingExposure   =  VghLantern__Env3d__ConfigAccess__RequireNumber('Renderer', 'ToneMappingExposure');
        hostElement.appendChild(renderer.domElement);
        hostElement.classList.add(CSS_HOST_ACTIVE);

        // SCENE AND GROUP STACK
        const scene   =  new THREE.Scene();
        const groups  =  {};
        for (let i = 0; i < VghLantern__Env3d__SceneGroupOrder.length; i++) {
            const group  =  new THREE.Group();
            group.name   =  'VghLantern__Env3d__Group__' + VghLantern__Env3d__SceneGroupOrder[i];
            scene.add(group);
            groups[VghLantern__Env3d__SceneGroupOrder[i]]  =  group;
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

        if (surfaceOptions.ShowGroundPlane !== false) {
            VghLantern__Env3d__SceneManager__AttachGroundPlane(surface);
        }
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
        if (grid) surface.Groups[VghLantern__Env3d__SceneGroup.Helpers].add(grid);
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

        const maxRatio  =  VghLantern__Env3d__ConfigAccess__RequireNumber('Renderer', 'MaxPixelRatio');
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
        const onDemand  =  VghLantern__Env3d__ConfigAccess__RequireBoolean('Renderer', 'OnDemandRendering');

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
    // The highlight group is cleared with the model, not after it. Its contents are
    // slices of the very buffers about to be disposed, so leaving them a frame
    // longer would leave the overlay pointing at freed geometry.
    export function VghLantern__Env3d__SceneManager__ClearModelGroups(surface) {
        for (let i = 0; i < VghLantern__Env3d__SceneGroupSet__Rebuilt.length; i++) {
            VghLantern__Env3d__SceneManager__ClearGroup(surface, VghLantern__Env3d__SceneGroupSet__Rebuilt[i]);
        }
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

        for (let i = 0; i < VghLantern__Env3d__SceneGroupOrder.length; i++) {
            VghLantern__Env3d__SceneManager__EmptyGroup(surface.Groups[VghLantern__Env3d__SceneGroupOrder[i]]);
        }

        surface.Renderer.dispose();
        if (typeof surface.Renderer.forceContextLoss === 'function') {
            surface.Renderer.forceContextLoss();                              // <-- Free the GL context now, not at GC - repeated mode entries would otherwise stack contexts toward the browser's hard cap
        }
        if (surface.Renderer.domElement.parentNode) {
            surface.Renderer.domElement.parentNode.removeChild(surface.Renderer.domElement);
        }
        surface.HostElement.classList.remove(CSS_HOST_ACTIVE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
