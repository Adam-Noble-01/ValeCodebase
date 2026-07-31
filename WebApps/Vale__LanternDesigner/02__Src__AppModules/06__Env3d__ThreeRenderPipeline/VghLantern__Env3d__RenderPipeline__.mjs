/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | RENDER PIPELINE
   =============================================================================

   FILE       : VghLantern__Env3d__RenderPipeline__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - RenderPipeline
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The single public entry point into the 3D environment
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Mirrors Env2d__RenderPipeline: mount, render, dispose, plus view control and
     snapshot export.
   - This is the ONLY Env3d module the rest of the application talks to, and it is
     published to window by Bootstrap__.mjs so classic scripts can reach it.
   - Consumes SolvedSkeleton and GlazeBarSet from the geometry brain. Computes no
     geometry of its own and never touches the SVG environment.

   ---------------------------------------------------------------------------

   SURFACE LIFECYCLE:
       Mount(hostElement)              create renderer, camera, lights
       Render(surface, skeleton, ...)   rebuild the model groups
       ApplyPreset(surface, key)        isometric / front / side / plan
       Snapshot(surface, options)       PNG data URL for the drawing sheet
       Dispose(surface)                 release the WebGL context

   Two surfaces can be alive at once - the Lantern Editor's toggleable 3D panel
   and the dedicated 3D View mode - each with its own camera state.

   ============================================================================= */

import {
    VghLantern__Env3d__SceneManager__Create,
    VghLantern__Env3d__SceneManager__Destroy,
    VghLantern__Env3d__SceneManager__Resize,
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneManager__GetGroup,
    VghLantern__Env3d__SceneManager__ClearModelGroups
} from './VghLantern__Env3d__SceneManager__.mjs';

import {
    VghLantern__Env3d__CameraRig__Attach,
    VghLantern__Env3d__CameraRig__FrameBounds,
    VghLantern__Env3d__CameraRig__ApplyPreset,
    VghLantern__Env3d__CameraRig__ListPresets
} from './VghLantern__Env3d__CameraRig__.mjs';

import { VghLantern__Env3d__LightingRig__Attach } from './VghLantern__Env3d__LightingRig__.mjs';
import { VghLantern__Env3d__MeshBuilder__Skeleton__Build, VghLantern__Env3d__MeshBuilder__Skeleton__ActiveMode } from './VghLantern__Env3d__MeshBuilder__Skeleton__.mjs';
import { VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build } from './VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__.mjs';
import { VghLantern__Env3d__MeshBuilder__Glazing__Build } from './VghLantern__Env3d__MeshBuilder__Glazing__.mjs';
import { VghLantern__Env3d__ComponentLoader__Glb__Build, VghLantern__Env3d__ComponentLoader__Glb__ClearCache } from './VghLantern__Env3d__ComponentLoader__Glb__.mjs';
import { VghLantern__Env3d__SnapshotExporter__Capture, VghLantern__Env3d__SnapshotExporter__CapturePreset } from './VghLantern__Env3d__SnapshotExporter__.mjs';
import { VghLantern__Env3d__MaterialLibrary__DisposeAll } from './VghLantern__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | 3D Render Pipeline Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Empty State Presentation
    // ------------------------------------------------------------
    const CSS_EMPTY_STATE   =  'VghLantern__Env3d__EmptyState';               // <-- Styled by Env3d Styles__Main__.css
    const MESSAGE_NO_MODEL  =  'No lantern selected';                         // <-- Nothing to build
    const MESSAGE_INVALID   =  'This roof form is not yet supported in 3D';    // <-- Solver returned a non-solvable form
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Surface Register
    // ------------------------------------------------------------
    let VghLantern__Env3d__RenderPipeline__Surfaces  =  [];                   // <-- Every mounted surface, for global teardown
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Empty State Handling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show or Clear the Host Empty State Message
    // ------------------------------------------------------------
    function VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, message) {
        if (!surface) return;

        const existing  =  surface.HostElement.querySelector('.' + CSS_EMPTY_STATE);

        if (!message) {
            if (existing) existing.parentNode.removeChild(existing);
            return;
        }

        if (existing) {
            existing.textContent  =  message;
            return;
        }

        const banner        =  document.createElement('div');
        banner.className    =  CSS_EMPTY_STATE;
        banner.textContent  =  message;
        surface.HostElement.appendChild(banner);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Mount a 3D Surface Inside a Host Element
    // ------------------------------------------------------------
    // options are passed straight to the scene builder. Drawing sheet viewports pass
    // { ShowGroundPlane : false } so the sheet's 3D view is built without the grid.
    export function VghLantern__Env3d__RenderPipeline__Mount(hostElement, options) {
        if (!hostElement) return null;

        const surface  =  VghLantern__Env3d__SceneManager__Create(hostElement, options);
        if (!surface) return null;

        VghLantern__Env3d__CameraRig__Attach(surface);
        VghLantern__Env3d__LightingRig__Attach(surface);

        surface.HasFramedOnce  =  false;                                      // <-- First render fits, later renders keep the user's view
        VghLantern__Env3d__RenderPipeline__Surfaces.push(surface);
        return surface;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose a Surface
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__Dispose(surface) {
        if (!surface) return;

        VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, null);
        VghLantern__Env3d__SceneManager__Destroy(surface);

        const index  =  VghLantern__Env3d__RenderPipeline__Surfaces.indexOf(surface);
        if (index !== -1) VghLantern__Env3d__RenderPipeline__Surfaces.splice(index, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Every Surface and Free Shared Resources
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__DisposeAll() {
        const surfaces  =  VghLantern__Env3d__RenderPipeline__Surfaces.slice();

        for (let i = 0; i < surfaces.length; i++) {
            VghLantern__Env3d__RenderPipeline__Dispose(surfaces[i]);
        }
        VghLantern__Env3d__MaterialLibrary__DisposeAll();
        VghLantern__Env3d__ComponentLoader__Glb__ClearCache();
    }
    // ------------------------------------------------------------


    // FUNCTION | Notify a Surface That Its Host Has Resized
    // ------------------------------------------------------------
    // The ResizeObserver covers most cases, but a panel becoming visible after
    // being display:none needs an explicit nudge.
    export function VghLantern__Env3d__RenderPipeline__Resize(surface) {
        VghLantern__Env3d__SceneManager__Resize(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Rebuild the Model From Solved Geometry
    // ------------------------------------------------------------
    export async function VghLantern__Env3d__RenderPipeline__Render(surface, skeleton, barSet, lantern) {
        if (!surface || surface.IsDestroyed) return;

        VghLantern__Env3d__SceneManager__ClearModelGroups(surface);

        if (!skeleton) {
            VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, MESSAGE_NO_MODEL);
            return;
        }
        if (skeleton.Meta && skeleton.Meta.IsValid === false) {
            VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, MESSAGE_INVALID);
            return;
        }
        VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, null);

        const skeletonGroup    =  VghLantern__Env3d__SceneManager__GetGroup(surface, 'skeleton');
        const glazingGroup     =  VghLantern__Env3d__SceneManager__GetGroup(surface, 'glazing');
        const componentsGroup  =  VghLantern__Env3d__SceneManager__GetGroup(surface, 'components');

        VghLantern__Env3d__MeshBuilder__Glazing__Build(glazingGroup, skeleton);
        VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build(skeletonGroup, skeleton, lantern);
        await VghLantern__Env3d__MeshBuilder__Skeleton__Build(skeletonGroup, skeleton, barSet, lantern);
        await VghLantern__Env3d__ComponentLoader__Glb__Build(componentsGroup, skeleton, lantern);

        // Frame on the first render only. Reframing on every dimension edit would
        // fight the user every time they nudge a value while zoomed in.
        if (!surface.HasFramedOnce) {
            VghLantern__Env3d__CameraRig__FrameBounds(surface, skeleton.Bounds);
            surface.HasFramedOnce  =  true;
        }

        surface.LastBounds  =  skeleton.Bounds || null;                        // <-- Kept so presets and Zoom Extents can reframe
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Reframe the Camera on the Current Model
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ZoomExtents(surface) {
        if (!surface) return;
        VghLantern__Env3d__CameraRig__FrameBounds(surface, surface.LastBounds);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Named Preset View
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ApplyPreset(surface, presetKey) {
        if (!surface) return;
        VghLantern__Env3d__CameraRig__ApplyPreset(surface, presetKey, surface.LastBounds);
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Available Preset Views
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ListPresets() {
        return VghLantern__Env3d__CameraRig__ListPresets();
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Camera Position and Orbit Target as Plain Data
    // ------------------------------------------------------------
    // Returned as plain objects so classic scripts can hold and replay a camera
    // without touching Three.js types. Used by the drawing sheet's camera edit.
    export function VghLantern__Env3d__RenderPipeline__GetCameraState(surface) {
        if (!surface || !surface.Camera) return null;

        return {
            Position : { x: surface.Camera.position.x, y: surface.Camera.position.y, z: surface.Camera.position.z },
            Target   : surface.Controls
                ? { x: surface.Controls.target.x, y: surface.Controls.target.y, z: surface.Controls.target.z }
                : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore a Previously Captured Camera State
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__SetCameraState(surface, state) {
        if (!surface || !surface.Camera || !state || !state.Position) return;

        surface.Camera.position.set(state.Position.x, state.Position.y, state.Position.z);
        if (surface.Controls && state.Target) {
            surface.Controls.target.set(state.Target.x, state.Target.y, state.Target.z);
        }
        if (surface.Controls) surface.Controls.update();
        surface.Camera.updateProjectionMatrix();

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Active Skeleton Sweep Mode
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ActiveSkeletonMode() {
        return VghLantern__Env3d__MeshBuilder__Skeleton__ActiveMode();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshot Export
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the Current View as a PNG Data URL
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__Snapshot(surface, options) {
        return VghLantern__Env3d__SnapshotExporter__Capture(surface, options);
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture a Preset View Without Disturbing the Live Camera
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__SnapshotPreset(surface, presetKey, options) {
        if (!surface) return null;

        return VghLantern__Env3d__SnapshotExporter__CapturePreset(
            surface, presetKey, surface.LastBounds, options,
            VghLantern__Env3d__CameraRig__ApplyPreset
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
