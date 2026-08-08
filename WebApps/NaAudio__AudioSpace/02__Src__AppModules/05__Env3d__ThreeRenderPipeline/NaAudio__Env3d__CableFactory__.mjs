/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | CABLE FACTORY
   =============================================================================

   FILE       : NaAudio__Env3d__CableFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - CableFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build patch leads that behave like leads rather than like diagram arrows
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A cable is a swept tube along a cubic Bezier, with a moulded plug at each end.
   - It leaves each socket along the socket's own axis and then drops to the floor, so
     leads run ALONG THE GROUND between instruments rather than arcing over them.
   - Its control points are sprung, so dragging a module whips its leads and they settle.

   ---------------------------------------------------------------------------

   WHY THIS REPLACED THE LINE

   The first build drew cables as a THREE.Line along a quadratic curve. It was cheap and
   correct and it read as a schematic - a hairline that got thinner with distance and had
   no ends, so at any real orbit distance the patch looked like annotation over the space
   rather than objects in it.

   That matters more here than it would elsewhere. The manifest's entire argument for
   spatial routing is that a cable is a THING you can follow with your eye and reach for.
   A hairline is not a thing.

   ---------------------------------------------------------------------------

   LEADS RUN ALONG THE GROUND

       p0  the output port, low on the rim of a module's pad
       c0  p0 pushed out along the port's own normal, and DROPPED to ground height
       c1  p1 pushed out along its port's normal, and dropped to ground height
       p1  the input port

   Both control points sit at CableGroundHeight, so a lead leaves its socket, meets the
   floor, and runs across it. It does not arc.

   The first version sagged from the straight port-to-port line instead, which drew a
   catenary through the AIR between two sockets. With the sockets up at chest height that
   put every lead in a great swooping curve over the middle of the space - a cat's cradle
   strung between the instruments rather than a patch bay you look down on. Worse, the
   leads crossed the airspace above other modules, so a busy space became unreadable from
   any angle that was not directly overhead.

   Dropping to the floor fixes both. Leads go AROUND the space at ankle height, they read
   as one continuous ground plan of the signal, and nothing is ever hidden behind one.

   The lead-out along the socket normal is what still sells the connection. Without it a
   cable emerges sideways from the socket face, which no physical lead does, and the plug
   at that end has to point somewhere arbitrary. With it the plug points straight out of
   the socket and the curve does the bending down to the floor.

   ---------------------------------------------------------------------------

   THE CONTROL POINTS ARE SPRUNG, AND IT IS NOT DECORATION

   The two control points are not placed directly. Each chases its target through a damped
   spring, so when a module is dragged its lead lags behind, overshoots and settles - a
   whip along the floor rather than a curve simply redrawn each frame.

   The settle is a half-second of motion after a drag ends that says the patch is still
   connected and still yours, which a rigid curve snapping to its new shape does not.

   ---------------------------------------------------------------------------

   WHY THE TUBE IS WRITTEN BY HAND

   THREE.TubeGeometry builds a new geometry per call and allocates a Vector3 per sample
   point. A cable is rebuilt every frame while either end moves, and a dragged module
   with three leads would produce a few hundred throwaway geometries a second.

   So the ring positions are written straight into a preallocated buffer using a
   parallel-transport frame carried along the curve. The index buffer is built once and
   never touched. Nothing here allocates after construction.

   Parallel transport rather than a Frenet frame on purpose: a Frenet frame flips its
   normal through an inflection point, and a lead that drops to the floor and rises again
   has two of them - which shows up as the tube visibly twisting as it is dragged.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                    from './NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials                  from './NaAudio__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Cable Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Scratch
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Names and Reusable Vectors
    // ------------------------------------------------------------
    const NAME_CABLE  =  'NaAudio__Env3d__Cable';
    const NAME_TUBE   =  'NaAudio__Env3d__CableTube';
    const NAME_PLUG   =  'NaAudio__Env3d__CablePlug';

    const SCRATCH_POINT    =  new THREE.Vector3();
    const SCRATCH_PREVIOUS =  new THREE.Vector3();
    const SCRATCH_TANGENT  =  new THREE.Vector3();
    const SCRATCH_NORMAL   =  new THREE.Vector3();
    const SCRATCH_BINORMAL =  new THREE.Vector3();
    const SCRATCH_AXIS     =  new THREE.Vector3();
    const SCRATCH_QUAT     =  new THREE.Quaternion();

    const PLUG_FORWARD     =  new THREE.Vector3(0, 1, 0);                    // <-- A cylinder's own axis in three is +Y
    const FALLBACK_UP      =  new THREE.Vector3(0, 1, 0);
    const FALLBACK_SIDE    =  new THREE.Vector3(1, 0, 0);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Curve Evaluation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Evaluate a Cubic Bezier at t
    // ------------------------------------------------------------
    // By hand rather than through THREE.CubicBezierCurve3, which allocates a Vector3 per
    // evaluation and is called thirty times per cable per frame.
    function NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, t, out) {
        const inverse  =  1 - t;
        const a  =  inverse * inverse * inverse;
        const b  =  3 * inverse * inverse * t;
        const c  =  3 * inverse * t * t;
        const d  =  t * t * t;

        return out.set(
            a * p0.x + b * c0.x + c * c1.x + d * p1.x,
            a * p0.y + b * c0.y + c * c1.y + d * p1.y,
            a * p0.z + b * c0.z + c * c1.z + d * p1.z
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Two Control Points Want to Be
    // ------------------------------------------------------------
    // Out along each socket's own normal, then down to the height leads run at. The
    // lead-out is capped at a third of the span so a short hop between neighbouring
    // modules does not overshoot and loop back on itself.
    function NaAudio__Env3d__CableFactory__ControlTargets(state, fromPoint, toPoint) {
        const distance  =  fromPoint.distanceTo(toPoint);
        const lead      =  Math.min(distance * 0.34, SpatialNumber('PatchGraph', 'CableLeadOut'));
        const ground    =  SpatialNumber('PatchGraph', 'CableGroundHeight');

        state.C0Target.copy(state.FromNormal).multiplyScalar(lead).add(fromPoint);
        state.C1Target.copy(state.ToNormal).multiplyScalar(lead).add(toPoint);

        state.C0Target.y  =  ground;
        state.C1Target.y  =  ground;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Advance One Control Point's Spring by a Frame
    // ------------------------------------------------------------
    // A damped spring per control point. delta is clamped before it reaches the
    // integrator: a tab returning from the background delivers one enormous frame, and an
    // unclamped spring integrated across it goes unstable and flings the lead off into
    // the distance - permanently, because nothing pulls it back.
    function NaAudio__Env3d__CableFactory__AdvanceSpring(current, velocity, target, delta) {
        const stiffness  =  SpatialNumber('PatchGraph', 'CableSpringStiffness');
        const damping    =  SpatialNumber('PatchGraph', 'CableSpringDamping');
        const step       =  Math.min(delta, 0.05);

        velocity.x += (target.x - current.x) * stiffness * step;
        velocity.y += (target.y - current.y) * stiffness * step;
        velocity.z += (target.z - current.z) * stiffness * step;

        velocity.multiplyScalar(Math.max(0, 1 - damping * step));
        current.addScaledVector(velocity, step);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tube Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Index and UV Buffers for a Tube
    // ------------------------------------------------------------
    // Built once at construction. The topology of a swept tube never changes - only
    // where its vertices are - so this is the half of the geometry that can be static.
    function NaAudio__Env3d__CableFactory__BuildTopology(geometry, lengthSegments, radialSegments) {
        const indices  =  [];
        const uvs      =  [];

        const ring  =  radialSegments + 1;

        for (let i = 0; i <= lengthSegments; i++) {
            for (let j = 0; j <= radialSegments; j++) {
                uvs.push(i / lengthSegments, j / radialSegments);
            }
        }

        for (let i = 0; i < lengthSegments; i++) {
            for (let j = 0; j < radialSegments; j++) {
                const a  =  i * ring + j;
                const b  =  (i + 1) * ring + j;
                const c  =  (i + 1) * ring + j + 1;
                const d  =  i * ring + j + 1;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sweep a Ring of Vertices Along the Curve
    // ------------------------------------------------------------
    // The parallel-transport frame. The normal is carried forward from the previous
    // sample and re-orthogonalised against the new tangent rather than being recomputed
    // from scratch, which is what stops the tube twisting through the sag's inflection.
    function NaAudio__Env3d__CableFactory__WriteTube(state, p0, c0, c1, p1) {
        const positions       =  state.PositionAttribute.array;
        const normals         =  state.NormalAttribute.array;
        const lengthSegments  =  state.LengthSegments;
        const radialSegments  =  state.RadialSegments;
        const radius          =  state.Radius;

        // Seed the frame with any vector not parallel to the first tangent.
        NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, 0, SCRATCH_PREVIOUS);
        NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, 0.01, SCRATCH_TANGENT);
        SCRATCH_TANGENT.sub(SCRATCH_PREVIOUS).normalize();

        SCRATCH_NORMAL.copy(Math.abs(SCRATCH_TANGENT.y) > 0.9 ? FALLBACK_SIDE : FALLBACK_UP);
        SCRATCH_NORMAL.cross(SCRATCH_TANGENT).normalize();
        if (SCRATCH_NORMAL.lengthSq() < 0.0001) SCRATCH_NORMAL.copy(FALLBACK_SIDE);

        let cursor  =  0;

        for (let i = 0; i <= lengthSegments; i++) {
            const t  =  i / lengthSegments;

            NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, t, SCRATCH_POINT);

            // The tangent is a forward difference, except at the last sample where it
            // has to be a backward one - there is nothing in front of the end of a curve.
            const step  =  1 / lengthSegments;
            if (i < lengthSegments) {
                NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, t + step * 0.5, SCRATCH_TANGENT);
                SCRATCH_TANGENT.sub(SCRATCH_POINT);
            } else {
                NaAudio__Env3d__CableFactory__Evaluate(p0, c0, c1, p1, t - step * 0.5, SCRATCH_TANGENT);
                SCRATCH_TANGENT.subVectors(SCRATCH_POINT, SCRATCH_TANGENT);
            }
            SCRATCH_TANGENT.normalize();

            // Carry the frame: project the previous normal onto the plane of the new
            // tangent and renormalise.
            SCRATCH_NORMAL.addScaledVector(SCRATCH_TANGENT, -SCRATCH_NORMAL.dot(SCRATCH_TANGENT));
            if (SCRATCH_NORMAL.lengthSq() < 0.000001) {
                SCRATCH_NORMAL.copy(Math.abs(SCRATCH_TANGENT.y) > 0.9 ? FALLBACK_SIDE : FALLBACK_UP)
                              .cross(SCRATCH_TANGENT);
            }
            SCRATCH_NORMAL.normalize();
            SCRATCH_BINORMAL.crossVectors(SCRATCH_TANGENT, SCRATCH_NORMAL).normalize();

            if (i === 0)               state.StartTangent.copy(SCRATCH_TANGENT);
            if (i === lengthSegments)  state.EndTangent.copy(SCRATCH_TANGENT);

            for (let j = 0; j <= radialSegments; j++) {
                const angle  =  (j / radialSegments) * Math.PI * 2;
                const sin    =  Math.sin(angle);
                const cos    =  Math.cos(angle);

                const nx  =  cos * SCRATCH_NORMAL.x + sin * SCRATCH_BINORMAL.x;
                const ny  =  cos * SCRATCH_NORMAL.y + sin * SCRATCH_BINORMAL.y;
                const nz  =  cos * SCRATCH_NORMAL.z + sin * SCRATCH_BINORMAL.z;

                positions[cursor + 0]  =  SCRATCH_POINT.x + nx * radius;
                positions[cursor + 1]  =  SCRATCH_POINT.y + ny * radius;
                positions[cursor + 2]  =  SCRATCH_POINT.z + nz * radius;

                normals[cursor + 0]  =  nx;
                normals[cursor + 1]  =  ny;
                normals[cursor + 2]  =  nz;

                cursor += 3;
            }
        }

        state.PositionAttribute.needsUpdate  =  true;
        state.NormalAttribute.needsUpdate    =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cable Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Moulded Plug
    // ------------------------------------------------------------
    function NaAudio__Env3d__CableFactory__BuildPlug(material) {
        const radius  =  SpatialNumber('PatchGraph', 'PlugRadius');
        const length  =  SpatialNumber('PatchGraph', 'PlugLength');

        const geometry  =  new THREE.CylinderGeometry(radius, radius * 0.82, length, 10, 1, false);

        const plug  =  new THREE.Mesh(geometry, material);
        plug.name  =  NAME_PLUG;
        plug.userData.NaAudio__Pickable  =  false;                            // <-- The tube is the click target; the plug is trim

        return plug;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Patch Cable Between Two Ports
    // ------------------------------------------------------------
    // fromNormal and toNormal are the directions the two sockets face. They are copied,
    // not held by reference: a port's facing never changes over the life of a cable, and
    // holding a reference into module geometry from here would be a quiet lifetime bug.
    export function NaAudio__Env3d__CableFactory__Build(fromPoint, toPoint, fromNormal, toNormal, signalType) {
        const lengthSegments  =  Math.round(SpatialNumber('PatchGraph', 'CableSegments'));
        const radialSegments  =  Math.round(SpatialNumber('PatchGraph', 'CableRadialSegments'));

        const vertexCount  =  (lengthSegments + 1) * (radialSegments + 1);

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
        geometry.setAttribute('normal',   new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
        NaAudio__Env3d__CableFactory__BuildTopology(geometry, lengthSegments, radialSegments);

        const material  =  Materials.NaAudio__Materials__OwnedCable(signalType);
        const plugMaterial  =  Materials.NaAudio__Materials__OwnedPlug();

        const tube  =  new THREE.Mesh(geometry, material);
        tube.name           =  NAME_TUBE;
        tube.castShadow     =  false;                                         // <-- A cable's shadow is noise; the modules cast, the leads do not
        tube.receiveShadow  =  false;
        tube.frustumCulled  =  false;                                         // <-- The bounding sphere is never recomputed as the ends move

        const group  =  new THREE.Group();
        group.name  =  NAME_CABLE;
        group.add(tube);

        const fromPlug  =  NaAudio__Env3d__CableFactory__BuildPlug(plugMaterial);
        const toPlug    =  NaAudio__Env3d__CableFactory__BuildPlug(plugMaterial);
        group.add(fromPlug);
        group.add(toPlug);

        const state  =  {
            Tube              : tube,
            FromPlug          : fromPlug,
            ToPlug            : toPlug,
            Material          : material,
            PlugMaterial      : plugMaterial,
            PositionAttribute : geometry.getAttribute('position'),
            NormalAttribute   : geometry.getAttribute('normal'),
            LengthSegments    : lengthSegments,
            RadialSegments    : radialSegments,
            Radius            : SpatialNumber('PatchGraph', 'CableRadius'),
            FromNormal        : new THREE.Vector3().copy(fromNormal || FALLBACK_UP).normalize(),
            ToNormal          : new THREE.Vector3().copy(toNormal   || FALLBACK_UP).normalize(),
            C0                : new THREE.Vector3(),
            C1                : new THREE.Vector3(),
            C0Target          : new THREE.Vector3(),
            C1Target          : new THREE.Vector3(),
            C0Velocity        : new THREE.Vector3(),
            C1Velocity        : new THREE.Vector3(),
            StartTangent      : new THREE.Vector3(0, 1, 0),
            EndTangent        : new THREE.Vector3(0, 1, 0)
        };

        group.userData.NaAudio__CableState  =  state;

        // Settled on construction rather than sprung into place. A space that loads with
        // every lead whipping across the floor looks like a physics demo, not like a
        // patch somebody left.
        NaAudio__Env3d__CableFactory__ControlTargets(state, fromPoint, toPoint);
        state.C0.copy(state.C0Target);
        state.C1.copy(state.C1Target);
        NaAudio__Env3d__CableFactory__Update(group, fromPoint, toPoint, 0);

        return group;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rewrite a Cable's Geometry for New Endpoints
    // ------------------------------------------------------------
    // delta of 0 skips the spring and places the cable at its rest shape immediately,
    // which is what construction and a mode change want.
    export function NaAudio__Env3d__CableFactory__Update(cableGroup, fromPoint, toPoint, delta) {
        const state  =  cableGroup && cableGroup.userData.NaAudio__CableState;
        if (!state) return;

        NaAudio__Env3d__CableFactory__ControlTargets(state, fromPoint, toPoint);

        if (delta > 0) {
            NaAudio__Env3d__CableFactory__AdvanceSpring(state.C0, state.C0Velocity, state.C0Target, delta);
            NaAudio__Env3d__CableFactory__AdvanceSpring(state.C1, state.C1Velocity, state.C1Target, delta);
        } else {
            state.C0.copy(state.C0Target);
            state.C1.copy(state.C1Target);
        }

        NaAudio__Env3d__CableFactory__WriteTube(state, fromPoint, state.C0, state.C1, toPoint);

        // THE PLUGS
        // Seated slightly INSIDE the socket rather than flush against it, so the barrel
        // reads as inserted. A plug sitting exactly on the port face looks like a bead
        // threaded onto the cable.
        const inset  =  SpatialNumber('PatchGraph', 'PlugLength') * 0.35;

        NaAudio__Env3d__CableFactory__SeatPlug(state.FromPlug, fromPoint, state.StartTangent, -inset);
        NaAudio__Env3d__CableFactory__SeatPlug(state.ToPlug,   toPoint,   state.EndTangent,    inset);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place and Aim One Plug Along the Curve Tangent
    // ------------------------------------------------------------
    function NaAudio__Env3d__CableFactory__SeatPlug(plug, point, tangent, offset) {
        SCRATCH_AXIS.copy(tangent).normalize();

        plug.position.copy(point).addScaledVector(SCRATCH_AXIS, offset);
        plug.quaternion.copy(SCRATCH_QUAT.setFromUnitVectors(PLUG_FORWARD, SCRATCH_AXIS));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Appearance
// -----------------------------------------------------------------------------

    // FUNCTION | Set a Cable's Signal Brightness
    // ------------------------------------------------------------
    // level is a normalised 0 to 1 meter reading from the source module. A silent cable
    // sits at its base colour and is visibly still, which is how a user finds a dead
    // patch without opening anything.
    export function NaAudio__Env3d__CableFactory__SetLevel(cableGroup, level, flashColour) {
        const state  =  cableGroup && cableGroup.userData.NaAudio__CableState;
        if (!state) return;
        if (!SpatialBool('PatchGraph', 'CableFlowEnabled')) return;

        const base  =  state.Material.userData.NaAudio__BaseColour;
        if (!base) return;

        state.Material.color.copy(base).lerp(flashColour, Math.min(level, 1) * 0.45);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark a Cable as Hovered
    // ------------------------------------------------------------
    // Wiring mode only. Emissive rather than a colour change, because a cable that
    // changes hue on hover stops reporting its own signal type at the moment the user is
    // deciding whether to unplug it.
    export function NaAudio__Env3d__CableFactory__SetHovered(cableGroup, isHovered) {
        const state  =  cableGroup && cableGroup.userData.NaAudio__CableState;
        if (!state) return;

        const strength  =  isHovered ? SpatialNumber('PatchGraph', 'CableHoverEmissive') : 0;
        state.Material.emissive.copy(Palette.NaAudio__Palette__Ground('Cream')).multiplyScalar(strength);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tube Mesh, for Registering as an Interaction Handle
    // ------------------------------------------------------------
    export function NaAudio__Env3d__CableFactory__TubeMesh(cableGroup) {
        const state  =  cableGroup && cableGroup.userData.NaAudio__CableState;
        return state ? state.Tube : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
