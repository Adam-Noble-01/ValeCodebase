/* =============================================================================
   VGHLANTERN - CROSS SECTION VIEW | SYSTEM LOGIC
   =============================================================================

   FILE       : VghLantern__CrossSection__SystemLogic__.mjs
   NAMESPACE  : VghLantern
   MODULE     : CrossSection - SystemLogic
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own which cut a surface is showing, and everything that follows
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The public face of the cross section system. Three states, one call to move
     between them, and no other module needs to know a plane exists.
   - Ported from ValeVision3D 41__System__CrossSectionView, reduced to the part a
     lantern actually needs: that tool places arbitrary planes by clicking faces
     and drags them live, because it sections whole buildings. A lantern is one
     symmetrical object, so the two cuts worth having are computed outright and
     there is nothing to drag.

   ---------------------------------------------------------------------------

   THE THREE STATES

       none           The finished model, uncut. The default, and the state a
                      snapshot is always taken in.

       lateral        Cut along the long way of the lantern, opening the full
                      length of the roof so the ridge, the transoms and the
                      internal trims read end to end.

       longitudinal   Cut across the short way, showing one bay in true section
                      with the hip and eaves details either side of it.

   ---------------------------------------------------------------------------

   WHY THE CLIP IS APPLIED AT THE RENDERER, NOT PER MATERIAL

   ValeVision assigns its plane list to every model material, which is correct
   there because that application draws one model in one scene. Here the finish
   materials are shared and cached by MaterialLibrary across every live surface,
   so writing a clipping plane onto one would cut the Lantern Editor's small 3D
   panel and every drawing sheet viewport at the same time - a cut set up for
   review would silently land on an issued drawing.

   renderer.clippingPlanes is per surface, so the cut stays exactly where it was
   asked for. The price is that it also takes the ground grid, which is why the
   grid is dropped for the duration of a cut, and that the fill and profile line
   must sit slightly behind the plane rather than proud of it - see the inset
   values in Na__CrossSection__Config.json.

   ============================================================================= */

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld
} from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneManager__ClearGroup,
    VghLantern__Env3d__SceneManager__GetGroup,
    VghLantern__Env3d__SceneManager__SetGroundGridSuppressed,
    VghLantern__Env3d__GroundGridSuppressReason,
    VghLantern__Env3d__SceneGroup,
    VghLantern__Env3d__SceneGroupSet__Solid3d
} from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SceneManager__.mjs';

import {
    VghLantern__CrossSection__ConfigAccess__RequireBoolean,
    VghLantern__CrossSection__ConfigAccess__RequireNumber
} from './VghLantern__CrossSection__ConfigAccess__.mjs';

import {
    VghLantern__CrossSection__PlaneSolver__Solve,
    VghLantern__CrossSection__PlaneSolver__Lateral,
    VghLantern__CrossSection__PlaneSolver__Longitudinal
} from './VghLantern__CrossSection__PlaneSolver__.mjs';

import {
    VghLantern__CrossSection__CapGeometry__Compute
} from './VghLantern__CrossSection__CapGeometry__.mjs';

import {
    VghLantern__CrossSection__CapFactory__BuildFill,
    VghLantern__CrossSection__CapFactory__BuildOutline,
    VghLantern__CrossSection__CapFactory__SeedResolution
} from './VghLantern__CrossSection__CapFactory__.mjs';

// =============================================================================
// REGION | Cross Section System Logic Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Three Cut States
    // ------------------------------------------------------------
    export const VghLantern__CrossSection__None          =  'none';
    export const VghLantern__CrossSection__Lateral       =  VghLantern__CrossSection__PlaneSolver__Lateral;
    export const VghLantern__CrossSection__Longitudinal  =  VghLantern__CrossSection__PlaneSolver__Longitudinal;

    export const VghLantern__CrossSection__Order  =  [
        VghLantern__CrossSection__None,
        VghLantern__CrossSection__Lateral,
        VghLantern__CrossSection__Longitudinal
    ];

    const MODE_LABELS  =  {
        none         : 'No Cut',
        lateral      : 'Lateral Section',
        longitudinal : 'Longitudinal Section'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Square Millimetres to Square World Units
    // ------------------------------------------------------------
    // Areas convert as the square of the length scale, which is not something
    // MmToWorld can be asked for directly, so the conversion is stated once here.
    function VghLantern__CrossSection__Mm2ToWorld2(squareMillimetres) {
        const oneMm  =  VghLantern__Env3d__ConfigAccess__MmToWorld(1);
        return squareMillimetres * oneMm * oneMm;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get or Create the Cut State a Surface Carries
    // ------------------------------------------------------------
    function VghLantern__CrossSection__State(surface) {
        if (!surface.CrossSectionState) {
            surface.CrossSectionState  =  { Mode : VghLantern__CrossSection__None, Plane : null };
        }
        return surface.CrossSectionState;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the Feature Is Switched On At All
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__IsEnabled() {
        return VghLantern__CrossSection__ConfigAccess__RequireBoolean('Feature', 'Enabled');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cut Application
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Put a Surface Back Into Its Uncut Condition
    // ------------------------------------------------------------
    // Deliberately does NOT touch the stored mode: it is also the first half of
    // every rebuild, and a rebuild must not forget what it is rebuilding.
    function VghLantern__CrossSection__ClearCut(surface) {
        VghLantern__Env3d__SceneManager__ClearGroup(surface, VghLantern__Env3d__SceneGroup.Overlay__Section);

        if (surface.Renderer) surface.Renderer.clippingPlanes  =  [];        // <-- Empty list is the zero-cost no-clipping path
        VghLantern__Env3d__SceneManager__SetGroundGridSuppressed(            // <-- Releases only the section's hold; a camera below ground keeps its own
            surface, VghLantern__Env3d__GroundGridSuppressReason.Section, false
        );

        VghLantern__CrossSection__State(surface).Plane  =  null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Compute and Draw the Cut Face for the Current Mode
    // ------------------------------------------------------------
    // The clip is committed before the cap is computed and independently of it. If
    // the cap computation aborts on a pathological model the reviewer still gets
    // the cut - it simply arrives without its painted face, which is a degraded
    // view rather than a broken one.
    //
    // It is not committed at all while the solid groups are empty. A cut chosen
    // before a lantern is loaded, or held across a project with none, must leave
    // nothing behind - a stale clip plane over an empty scene would take the ground
    // grid with it and leave the viewport looking broken rather than empty.
    function VghLantern__CrossSection__DrawCut(surface, modeKey) {
        const solved  =  VghLantern__CrossSection__PlaneSolver__Solve(surface, modeKey);
        if (!solved) return;                                                 // <-- No model on this surface yet

        const roots  =  [];
        let hasGeometry  =  false;
        for (let i = 0; i < VghLantern__Env3d__SceneGroupSet__Solid3d.length; i++) {
            const group  =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroupSet__Solid3d[i]);
            if (!group) continue;
            roots.push(group);
            if (group.children.length > 0) hasGeometry  =  true;
        }
        if (!hasGeometry) return;                                            // <-- Nothing built yet: stay uncut and wait for the rebuild

        const plane  =  solved.Plane;
        VghLantern__CrossSection__State(surface).Plane  =  plane;

        surface.Renderer.clippingPlanes  =  [plane];
        if (VghLantern__CrossSection__ConfigAccess__RequireBoolean('Feature', 'HideGroundGridWhenCut')) {
            VghLantern__Env3d__SceneManager__SetGroundGridSuppressed(
                surface, VghLantern__Env3d__GroundGridSuppressReason.Section, true
            );
        }

        // World matrices are refreshed explicitly because the cut is computed from
        // mesh world transforms and this runs straight after a rebuild, before the
        // renderer has had a frame in which to update them itself.
        surface.Scene.updateMatrixWorld(true);

        const result  =  VghLantern__CrossSection__CapGeometry__Compute(roots, plane, {
            WeldToleranceWorld : VghLantern__Env3d__ConfigAccess__MmToWorld(
                                     VghLantern__CrossSection__ConfigAccess__RequireNumber('Tuning', 'WeldToleranceMm')),
            MinLoopAreaWorld   : VghLantern__CrossSection__Mm2ToWorld2(
                                     VghLantern__CrossSection__ConfigAccess__RequireNumber('Tuning', 'MinLoopAreaMm2')),
            MaxSegments        : VghLantern__CrossSection__ConfigAccess__RequireNumber('Tuning', 'MaxCrossingSegments')
        });

        if (result.Aborted) {
            console.warn('[VghLantern CrossSection] Cap recompute abandoned - the model exceeds the live segment budget. The cut is still applied, without its painted face.');
            return;
        }

        const sectionGroup  =  VghLantern__Env3d__SceneManager__GetGroup(surface, VghLantern__Env3d__SceneGroup.Overlay__Section);
        if (!sectionGroup) return;

        const fillInset  =  VghLantern__Env3d__ConfigAccess__MmToWorld(
                                VghLantern__CrossSection__ConfigAccess__RequireNumber('Appearance', 'FillInsetMm'));
        const lineInset  =  VghLantern__Env3d__ConfigAccess__MmToWorld(
                                VghLantern__CrossSection__ConfigAccess__RequireNumber('Appearance', 'LineInsetMm'));

        const fill     =  VghLantern__CrossSection__CapFactory__BuildFill(result.FillPositions, plane.normal, fillInset);
        const outline  =  VghLantern__CrossSection__CapFactory__BuildOutline(result.OutlinePositions, plane.normal, lineInset);

        if (fill)    sectionGroup.add(fill);
        if (outline) sectionGroup.add(outline);

        VghLantern__CrossSection__CapFactory__SeedResolution(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Apply a Cut State to a Surface
    // ------------------------------------------------------------
    // Idempotent and safe to call on every render, which is what keeps a cut alive
    // across a rebuild without the caller having to remember it.
    export function VghLantern__CrossSection__Apply(surface, modeKey) {
        if (!surface || surface.IsDestroyed || !surface.Groups) return;

        const requested  =  (VghLantern__CrossSection__Order.indexOf(modeKey) !== -1)
            ? modeKey
            : VghLantern__CrossSection__None;

        const mode  =  VghLantern__CrossSection__IsEnabled()
            ? requested
            : VghLantern__CrossSection__None;                                // <-- Feature off means there is only one state

        const state  =  VghLantern__CrossSection__State(surface);
        state.Mode   =  mode;

        VghLantern__CrossSection__ClearCut(surface);                         // <-- Always rebuild from the uncut condition
        if (mode !== VghLantern__CrossSection__None) {
            VghLantern__CrossSection__DrawCut(surface, mode);
        }

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a World Point Has Been Cut Away on This Surface
    // ------------------------------------------------------------
    // Clipping happens in the shader, so nothing that reasons about the scene in
    // JavaScript knows a cut exists - a raycast still hits the half that was cut
    // off, and the hover inspector would happily name a member the reviewer cannot
    // see. This is the test that keeps the cursor honest.
    //
    // A point exactly on the plane counts as kept, matching the shader's own
    // comparison, so the cut face itself stays pickable.
    export function VghLantern__CrossSection__IsPointClipped(surface, worldPoint) {
        const state  =  surface ? surface.CrossSectionState : null;
        if (!state || !state.Plane || !worldPoint) return false;

        return state.Plane.distanceToPoint(worldPoint) < 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Cut State a Surface Is In
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__Current(surface) {
        if (surface && surface.CrossSectionState && surface.CrossSectionState.Mode) {
            return surface.CrossSectionState.Mode;
        }
        return VghLantern__CrossSection__None;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Cut After the Model Has Changed
    // ------------------------------------------------------------
    // The section group is cleared with the model on every solve, so the cut face
    // has to be recomputed against the geometry that replaced it. Cheap to call
    // unconditionally: an uncut surface does no work at all.
    export function VghLantern__CrossSection__Refresh(surface) {
        if (!surface || surface.IsDestroyed) return;
        if (VghLantern__CrossSection__Current(surface) === VghLantern__CrossSection__None) return;

        VghLantern__CrossSection__Apply(surface, VghLantern__CrossSection__Current(surface));
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance a Surface to the Next Cut State
    // ------------------------------------------------------------
    // Returns the state landed on, so a caller can update its own control without
    // asking a second time.
    export function VghLantern__CrossSection__Cycle(surface) {
        const current  =  VghLantern__CrossSection__Current(surface);
        const index    =  VghLantern__CrossSection__Order.indexOf(current);
        const next     =  VghLantern__CrossSection__Order[(index + 1) % VghLantern__CrossSection__Order.length];

        VghLantern__CrossSection__Apply(surface, next);
        return next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Human Readable Name for a Cut State
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__Label(modeKey) {
        return MODE_LABELS[modeKey] || modeKey;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Every Cut State With Its Label
    // ------------------------------------------------------------
    // Consumed by the 3D View overlay so its buttons are generated from this list
    // rather than hardcoded, exactly as the display mode buttons are. An empty list
    // is returned when the feature is off, which is what removes the cluster from
    // the overlay rather than leaving inert buttons on screen.
    export function VghLantern__CrossSection__List() {
        if (!VghLantern__CrossSection__IsEnabled()) return [];

        const list  =  [];
        for (let i = 0; i < VghLantern__CrossSection__Order.length; i++) {
            const key  =  VghLantern__CrossSection__Order[i];
            list.push({ Key : key, Label : MODE_LABELS[key] || key });
        }
        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
