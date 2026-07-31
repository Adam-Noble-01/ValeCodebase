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
       Render(surface, skeleton, ...)   rebuild the solid model AND the setting out
       ApplyPreset(surface, key)        isometric / front / side / plan
       SetDisplayMode(surface, key)     solid3d / both / setOut
       AttachInspector(surface, cb)     hover and pin model inspection
       Snapshot(surface, options)       PNG data URL for the drawing sheet
       Dispose(surface)                 release the WebGL context

   ---------------------------------------------------------------------------

   TWO CLASSES OF GEOMETRY, BOTH ALWAYS BUILT

   A render builds the SOLID model and the SETTING OUT linework together, and the
   display mode then decides which is visible. Building both every time costs a
   few hundred line segments and makes switching instant; more importantly it
   means the setting out on screen can never be stale relative to the metal
   beside it, which is the whole basis of trusting it as a check.

   Setting out is never captured into a snapshot. See BeginCapture.

   Two surfaces can be alive at once - the Lantern Editor's toggleable 3D panel
   and the dedicated 3D View mode - each with its own camera state.

   ============================================================================= */

import {
    VghLantern__Env3d__SceneManager__Create,
    VghLantern__Env3d__SceneManager__Destroy,
    VghLantern__Env3d__SceneManager__Resize,
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneManager__GetGroup,
    VghLantern__Env3d__SceneManager__ClearModelGroups,
    VghLantern__Env3d__SceneGroup
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

import { VghLantern__Env3d__SetOut__Builder__Build } from './VghLantern__Env3d__SetOut__Builder__.mjs';
import { VghLantern__Env3d__SetOut__LineFactory__DisposeMaterials, VghLantern__Env3d__SetOut__LineFactory__SeedResolution } from './VghLantern__Env3d__SetOut__LineFactory__.mjs';

import {
    VghLantern__Env3d__DisplayMode__Apply,
    VghLantern__Env3d__DisplayMode__Current,
    VghLantern__Env3d__DisplayMode__Cycle,
    VghLantern__Env3d__DisplayMode__List,
    VghLantern__Env3d__DisplayMode__Label,
    VghLantern__Env3d__DisplayMode__Solid3d
} from './VghLantern__Env3d__DisplayMode__.mjs';

import {
    VghLantern__Env3d__HoverInspector__Attach,
    VghLantern__Env3d__HoverInspector__Detach,
    VghLantern__Env3d__HoverInspector__Clear,
    VghLantern__Env3d__HoverInspector__IsAttached
} from './VghLantern__Env3d__HoverInspector__.mjs';

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

        VghLantern__Env3d__HoverInspector__Detach(surface);                   // <-- Listeners outlive the canvas otherwise
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
        VghLantern__Env3d__SetOut__LineFactory__DisposeMaterials();
        VghLantern__Env3d__ComponentLoader__Glb__ClearCache();
    }
    // ------------------------------------------------------------


    // FUNCTION | Notify a Surface That Its Host Has Resized
    // ------------------------------------------------------------
    // The ResizeObserver covers most cases, but a panel becoming visible after
    // being display:none needs an explicit nudge.
    export function VghLantern__Env3d__RenderPipeline__Resize(surface) {
        VghLantern__Env3d__SceneManager__Resize(surface);
        VghLantern__Env3d__SetOut__LineFactory__SeedResolution(surface);      // <-- Fat line width is driven by viewport size
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

        // Any highlight in flight refers to meshes that are about to be disposed,
        // and any pinned target to a member index the rebuild may renumber.
        VghLantern__Env3d__HoverInspector__Clear(surface);
        VghLantern__Env3d__SceneManager__ClearModelGroups(surface);

        // Held so the inspector can name what it picks without re-reading the
        // application state, which matters for a surface showing a lantern other
        // than the one currently selected.
        surface.LastSkeleton  =  skeleton || null;
        surface.LastLantern   =  lantern  || null;

        if (!skeleton) {
            VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, MESSAGE_NO_MODEL);
            return;
        }
        if (skeleton.Meta && skeleton.Meta.IsValid === false) {
            VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, MESSAGE_INVALID);
            return;
        }
        VghLantern__Env3d__RenderPipeline__SetEmptyState(surface, null);

        const solidFrameGroup       =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroup.Solid3d__Frame);
        const solidGlazingGroup     =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroup.Solid3d__Glazing);
        const solidComponentsGroup  =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroup.Solid3d__Components);

        // SOLID GEOMETRY | The finished model
        VghLantern__Env3d__MeshBuilder__Glazing__Build(solidGlazingGroup, skeleton);
        VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build(solidFrameGroup, skeleton, lantern);
        await VghLantern__Env3d__MeshBuilder__Skeleton__Build(solidFrameGroup, skeleton, barSet, lantern);
        await VghLantern__Env3d__ComponentLoader__Glb__Build(solidComponentsGroup, skeleton, lantern);

        // SETTING OUT GEOMETRY | The datums and construction triangles behind it
        VghLantern__Env3d__RenderPipeline__BuildSetOut(surface, skeleton, barSet, lantern);

        // Frame on the first render only. Reframing on every dimension edit would
        // fight the user every time they nudge a value while zoomed in.
        if (!surface.HasFramedOnce) {
            VghLantern__Env3d__CameraRig__FrameBounds(surface, skeleton.Bounds);
            surface.HasFramedOnce  =  true;
        }

        surface.LastBounds  =  skeleton.Bounds || null;                        // <-- Kept so presets and Zoom Extents can reframe

        // The display mode is a property of the surface, not of a build, so it is
        // re-applied after every rebuild. Without this a reviewer inspecting the
        // setting out would be thrown back to the solid model by any edit.
        VghLantern__Env3d__DisplayMode__Apply(surface, VghLantern__Env3d__DisplayMode__Current(surface));
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Setting Out Model and Draw It
    // ------------------------------------------------------------
    // The model is built by the geometry layer, not here, so the lines drawn and
    // the numbers checked come from one derivation. A missing SettingOutModel
    // module leaves the setting-out group empty rather than failing the render -
    // the solid model must never be held hostage to an inspection aid.
    function VghLantern__Env3d__RenderPipeline__BuildSetOut(surface, skeleton, barSet, lantern) {
        surface.SetOutModel     =  null;
        surface.SetOutManifest  =  [];

        const SettingOutModel  =  window.VghLantern__Geometry__SettingOutModel;
        if (!SettingOutModel) {
            console.warn('[VghLantern Env3d] SettingOutModel is not loaded, so no setting-out linework was built.');
            return;
        }

        const setOutGroup  =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroup.SetOut__Lines);
        if (!setOutGroup) return;

        surface.SetOutModel     =  SettingOutModel.VghLantern__SettingOutModel__Build(skeleton, barSet, lantern);
        surface.SetOutManifest  =  VghLantern__Env3d__SetOut__Builder__Build(setOutGroup, surface.SetOutModel, surface);
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
// REGION | Display Mode and Setting Out
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Display Mode on a Surface
    // ------------------------------------------------------------
    // 'solid3d' the finished model, 'both' the model ghosted under the setting out,
    // 'setOut' the setting out alone.
    export function VghLantern__Env3d__RenderPipeline__SetDisplayMode(surface, modeKey) {
        VghLantern__Env3d__DisplayMode__Apply(surface, modeKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Display Mode a Surface Is In
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__GetDisplayMode(surface) {
        return VghLantern__Env3d__DisplayMode__Current(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance a Surface to the Next Display Mode
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__CycleDisplayMode(surface) {
        return VghLantern__Env3d__DisplayMode__Cycle(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Available Display Modes
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ListDisplayModes() {
        return VghLantern__Env3d__DisplayMode__List();
    }
    // ------------------------------------------------------------


    // FUNCTION | Human Readable Name for a Display Mode
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__DisplayModeLabel(modeKey) {
        return VghLantern__Env3d__DisplayMode__Label(modeKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Setting Out Model a Surface Last Built
    // ------------------------------------------------------------
    // Plain data - datums, construction triangles, centrelines and the results of
    // every measured-against-reported check. Surfaced so the 3D overlay can list
    // the checks without recomputing any of them.
    export function VghLantern__Env3d__RenderPipeline__GetSetOutModel(surface) {
        return (surface && surface.SetOutModel) ? surface.SetOutModel : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read What the Setting Out View Actually Drew
    // ------------------------------------------------------------
    // One entry per line class on screen, carrying its label, colour and line type.
    // The overlay legend is built from this rather than from a hardcoded list, so
    // it can never claim to show something that was not drawn.
    export function VghLantern__Env3d__RenderPipeline__GetSetOutLegend(surface) {
        return (surface && surface.SetOutManifest) ? surface.SetOutManifest : [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hover Inspector
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Hover Inspector to a Surface
    // ------------------------------------------------------------
    // onTargetChanged receives a composed payload, or null when nothing is under
    // the cursor:
    //     { Pick, Description : { CategoryLabel, TypeLabel, InstanceLabel,
    //                             InstanceCount, Facts : [{ Label, Value }] },
    //       IsPinned, PointerX, PointerY }
    // Returns false when the feature is switched off in config, so a caller can
    // skip building its own panel rather than binding to something inert.
    export function VghLantern__Env3d__RenderPipeline__AttachInspector(surface, onTargetChanged) {
        return VghLantern__Env3d__HoverInspector__Attach(surface, onTargetChanged);
    }
    // ------------------------------------------------------------


    // FUNCTION | Detach the Hover Inspector From a Surface
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__DetachInspector(surface) {
        VghLantern__Env3d__HoverInspector__Detach(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop the Active Inspector Target Without Detaching
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__ClearInspector(surface) {
        VghLantern__Env3d__HoverInspector__Clear(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Surface Currently Has an Inspector Attached
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__HasInspector(surface) {
        return VghLantern__Env3d__HoverInspector__IsAttached(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshot Export
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Put a Surface Into Issue Condition for a Capture
    // ------------------------------------------------------------
    // A sheet drawing shows the manufactured article, never the setting out that
    // derived it, and never a reviewer's leftover hover highlight. Both are
    // therefore forced off for the duration of a capture and restored after, which
    // matters because the Drawing Editor prefers the live 3D View surface for its
    // sheet viewports rather than mounting one of its own.
    function VghLantern__Env3d__RenderPipeline__BeginCapture(surface) {
        VghLantern__Env3d__HoverInspector__Clear(surface);

        const restoreMode  =  VghLantern__Env3d__DisplayMode__Current(surface);
        VghLantern__Env3d__DisplayMode__Apply(surface, VghLantern__Env3d__DisplayMode__Solid3d);

        return restoreMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Current View as a PNG Data URL
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__Snapshot(surface, options) {
        const restoreMode  =  VghLantern__Env3d__RenderPipeline__BeginCapture(surface);

        try {
            return VghLantern__Env3d__SnapshotExporter__Capture(surface, options);
        } finally {
            VghLantern__Env3d__DisplayMode__Apply(surface, restoreMode);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture a Preset View Without Disturbing the Live Camera
    // ------------------------------------------------------------
    export function VghLantern__Env3d__RenderPipeline__SnapshotPreset(surface, presetKey, options) {
        if (!surface) return null;

        const restoreMode  =  VghLantern__Env3d__RenderPipeline__BeginCapture(surface);

        try {
            return VghLantern__Env3d__SnapshotExporter__CapturePreset(
                surface, presetKey, surface.LastBounds, options,
                VghLantern__Env3d__CameraRig__ApplyPreset
            );
        } finally {
            VghLantern__Env3d__DisplayMode__Apply(surface, restoreMode);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
