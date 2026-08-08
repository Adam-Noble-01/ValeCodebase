/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | LINE FACTORY
   =============================================================================

   FILE       : NaAudio__Env3d__LineFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - LineFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the linework - module cages, radial ticks and patch cables
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Thin dark linework is half of the Kandinsky reference, so it gets its own
     factory rather than being scattered through the modules that need it.
   - Three things live here:
       * The module cage - the six-sided bounding box that becomes visible when a
         module locks, straight from the design manifest.
       * Radial tick marks, for the circular sequencer's division ring.
       * Patch cables - the 3D noodles - as sagging quadratic curves.

   ---------------------------------------------------------------------------

   WHY THESE ARE LineSegments AND NOT Line2

   Three's fat-line addon draws real width in screen space, which the vendored
   drop includes. It is the right tool where line weight carries meaning, as it
   does on an issued drawing.

   Here it does not. The cage and the cables want to be hairlines that recede with
   distance, and a fat line at a fixed pixel width does the opposite - it stays
   prominent as the camera pulls back until a distant locked module reads as a
   solid block. Plain LineBasicMaterial is also a fraction of the cost, and a busy
   space can hold several dozen cables.

   ---------------------------------------------------------------------------

   CABLE SAG

   A cable is a quadratic Bezier from the source port to the destination port, with
   its control point pulled down by a fraction of the port-to-port distance. That
   fraction is CableSagFactor in config.

   At zero the cable is a straight line and the whole thing reads as an engineering
   schematic - which is precisely the 2D patch-bay diagram the manifest is trying to
   escape. Too high and long cables drag through the floor. The sag is proportional
   to distance rather than fixed, so a short hop between neighbours stays taut and a
   run across the space droops.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialBool }              from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Materials                               from './NaAudio__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Line Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Names and Scratch Vectors
    // ------------------------------------------------------------
    const NAME_CAGE   =  'NaAudio__Env3d__Cage';
    const NAME_CABLE  =  'NaAudio__Env3d__Cable';

    const SCRATCH_CONTROL  =  new THREE.Vector3();                           // <-- Cable rebuilds allocate nothing
    const SCRATCH_MID      =  new THREE.Vector3();
    const SCRATCH_POINT    =  new THREE.Vector3();
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
// REGION | Patch Cables
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute the Sagging Control Point Between Two Ports
    // ------------------------------------------------------------
    function NaAudio__Env3d__LineFactory__ControlPoint(fromPoint, toPoint, out) {
        SCRATCH_MID.addVectors(fromPoint, toPoint).multiplyScalar(0.5);

        const distance  =  fromPoint.distanceTo(toPoint);
        const sag       =  distance * SpatialNumber('PatchGraph', 'CableSagFactor');

        out.copy(SCRATCH_MID);
        out.y -= sag;
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Quadratic Bezier Into a Position Attribute
    // ------------------------------------------------------------
    // Evaluated by hand rather than through THREE.QuadraticBezierCurve3, which
    // allocates a Vector3 per sample point. A cable is rebuilt whenever either
    // module moves, and a drag rebuilds it every frame.
    function NaAudio__Env3d__LineFactory__WriteCurve(positions, fromPoint, controlPoint, toPoint, segments) {
        for (let i = 0; i <= segments; i++) {
            const t   =  i / segments;
            const inv =  1 - t;

            SCRATCH_POINT.set(
                inv * inv * fromPoint.x + 2 * inv * t * controlPoint.x + t * t * toPoint.x,
                inv * inv * fromPoint.y + 2 * inv * t * controlPoint.y + t * t * toPoint.y,
                inv * inv * fromPoint.z + 2 * inv * t * controlPoint.z + t * t * toPoint.z
            );

            positions[i * 3 + 0]  =  SCRATCH_POINT.x;
            positions[i * 3 + 1]  =  SCRATCH_POINT.y;
            positions[i * 3 + 2]  =  SCRATCH_POINT.z;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Patch Cable Between Two World Points
    // ------------------------------------------------------------
    export function NaAudio__Env3d__LineFactory__BuildCable(fromPoint, toPoint, signalType) {
        const segments  =  Math.round(SpatialNumber('PatchGraph', 'CableSegments'));

        const positions  =  new Float32Array((segments + 1) * 3);
        NaAudio__Env3d__LineFactory__ControlPoint(fromPoint, toPoint, SCRATCH_CONTROL);
        NaAudio__Env3d__LineFactory__WriteCurve(positions, fromPoint, SCRATCH_CONTROL, toPoint, segments);

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const cable  =  new THREE.Line(geometry, Materials.NaAudio__Materials__OwnedCable(signalType));
        cable.name   =  NAME_CABLE;
        cable.frustumCulled  =  false;                                        // <-- A long cable's bounding sphere leaves frame before the cable does
        cable.userData.NaAudio__Pickable  =  false;
        cable.userData.NaAudio__Segments  =  segments;

        return cable;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rewrite an Existing Cable's Curve In Place
    // ------------------------------------------------------------
    // Called whenever either end moves. Rewrites the existing buffer rather than
    // building a new geometry, so dragging a module across the space does not
    // allocate and discard a geometry per frame per cable.
    export function NaAudio__Env3d__LineFactory__UpdateCable(cable, fromPoint, toPoint) {
        if (!cable || !cable.geometry) return;

        const attribute  =  cable.geometry.getAttribute('position');
        const segments   =  cable.userData.NaAudio__Segments;

        NaAudio__Env3d__LineFactory__ControlPoint(fromPoint, toPoint, SCRATCH_CONTROL);
        NaAudio__Env3d__LineFactory__WriteCurve(attribute.array, fromPoint, SCRATCH_CONTROL, toPoint, segments);

        attribute.needsUpdate  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Cable's Signal Brightness
    // ------------------------------------------------------------
    // level is a normalised 0 to 1 meter reading from the source module. A silent
    // cable sits at its base colour and is visibly still, which is how a user finds
    // a dead patch without opening anything.
    export function NaAudio__Env3d__LineFactory__SetCableLevel(cable, level, flashColour) {
        if (!cable || !cable.material) return;
        if (!SpatialBool('PatchGraph', 'CableFlowEnabled')) return;

        const base  =  cable.material.userData.NaAudio__BaseColour;
        if (!base) return;

        cable.material.color.copy(base).lerp(flashColour, Math.min(level, 1) * 0.65);
        cable.material.opacity  =  0.72 + Math.min(level, 1) * 0.28;
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
