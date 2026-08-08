/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | LINE FACTORY
   =============================================================================

   FILE       : NaAudio__Env3d__LineFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - LineFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the linework - module cages, radial ticks and selection rings
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Thin dark linework is half of the Kandinsky reference, so it gets its own
     factory rather than being scattered through the modules that need it.
   - Three things live here:
       * The module cage - the six-sided bounding box that becomes visible when a
         module locks, straight from the design manifest.
       * Radial tick marks, for the circular sequencer's division ring.
       * The flat selection ring drawn on a module pad.

   ---------------------------------------------------------------------------

   WHY THESE ARE LineSegments AND NOT Line2

   Three's fat-line addon draws real width in screen space, which the vendored
   drop includes. It is the right tool where line weight carries meaning, as it
   does on an issued drawing.

   Here it does not. A cage wants to be a hairline that recedes with distance, and a
   fat line at a fixed pixel width does the opposite - it stays prominent as the
   camera pulls back until a distant locked module reads as a solid block. Plain
   LineBasicMaterial is also a fraction of the cost.

   ---------------------------------------------------------------------------

   PATCH CABLES USED TO LIVE HERE

   They were quadratic Beziers drawn as THREE.Line, and they are now swept tubes with
   moulded plugs and a sprung slack - see NaAudio__Env3d__CableFactory. The reasoning
   for the move is in that file's header. Nothing about a cable is a line any more, so
   nothing about a cable is in this file.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber }                            from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Materials                               from './NaAudio__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Line Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Object Names
    // ------------------------------------------------------------
    const NAME_CAGE   =  'NaAudio__Env3d__Cage';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Cage
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Six-Sided Module Cage
    // ------------------------------------------------------------
    // Twelve edges of a box, centred on the module origin at the given height. The
    // material is OWNED, not shared, because every module fades its own cage
    // independently as it locks - a shared material would fade all of them at once.
    export function NaAudio__Env3d__LineFactory__BuildCage(sizeVector, centreHeight) {
        const inset  =  SpatialNumber('Shell', 'CageEdgeInset');

        const width  =  sizeVector.x - inset * 2;
        const height =  sizeVector.y - inset * 2;
        const depth  =  sizeVector.z - inset * 2;

        const box       =  new THREE.BoxGeometry(width, height, depth);
        const geometry  =  new THREE.EdgesGeometry(box);
        box.dispose();                                                        // <-- The solid box was only scaffolding for the edge extraction

        const cage  =  new THREE.LineSegments(geometry, Materials.NaAudio__Materials__OwnedCage());
        cage.name            =  NAME_CAGE;
        cage.position.y      =  centreHeight;
        cage.userData.NaAudio__Pickable  =  false;                            // <-- Picking a module goes through its pad, never its cage

        return cage;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Cage's Opacity and Colour
    // ------------------------------------------------------------
    // Driven every frame by the module shell during a lock transition, so it does
    // no allocation and no material rebuild.
    export function NaAudio__Env3d__LineFactory__SetCageAppearance(cage, opacity, colour) {
        if (!cage || !cage.material) return;

        cage.material.opacity  =  opacity;
        cage.visible           =  opacity > 0.004;                            // <-- Below this it costs a draw call to render nothing
        if (colour) cage.material.color.copy(colour);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Radial Ticks
// -----------------------------------------------------------------------------

    // FUNCTION | Build Radial Tick Marks Around a Circle
    // ------------------------------------------------------------
    // One short radial line per division, lying flat in the XZ plane. The circular
    // sequencer uses these to make a free division count legible - without ticks,
    // seven steps around a ring is just seven objects at odd angles.
    export function NaAudio__Env3d__LineFactory__BuildRadialTicks(divisions, innerRadius, outerRadius, inkKey, opacity) {
        const points  =  [];

        for (let i = 0; i < divisions; i++) {
            const angle  =  (i / divisions) * Math.PI * 2 - Math.PI / 2;       // <-- Division zero at twelve o'clock
            const sin    =  Math.sin(angle);
            const cos    =  Math.cos(angle);

            points.push(cos * innerRadius, 0, sin * innerRadius);
            points.push(cos * outerRadius, 0, sin * outerRadius);
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

        const ticks  =  new THREE.LineSegments(geometry, Materials.NaAudio__Materials__Line(inkKey, opacity));
        ticks.userData.NaAudio__Pickable  =  false;

        return ticks;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Ring
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Flat Selection Ring for a Module Pad
    // ------------------------------------------------------------
    // A circle of line segments rather than an annulus mesh, so it never picks up
    // the key light and never casts into the shadow map. Selection feedback has to
    // be dead flat or it competes with the module it is marking.
    export function NaAudio__Env3d__LineFactory__BuildSelectionRing(radius, inkKey, opacity) {
        const segments  =  72;
        const points    =  [];

        for (let i = 0; i <= segments; i++) {
            const angle  =  (i / segments) * Math.PI * 2;
            points.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

        const ring  =  new THREE.Line(geometry, Materials.NaAudio__Materials__Line(inkKey, opacity));
        ring.userData.NaAudio__Pickable  =  false;
        ring.visible  =  false;                                               // <-- Shown only while the module is selected

        return ring;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
