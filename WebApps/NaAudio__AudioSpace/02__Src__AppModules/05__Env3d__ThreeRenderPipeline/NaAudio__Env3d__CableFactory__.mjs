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
     leads run ALONG THE GROUND between instruments and route AROUND them.
   - Its lead-out points are sprung, so dragging a module whips its leads and they settle.

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

   LEADS RUN ALONG THE GROUND, ON A PATH SOMEBODY ELSE CHOSE

   This file no longer decides where a lead goes. It is handed a polyline - socket,
   lead-out, however many waypoints the route needed, lead-in, socket - and sweeps a tube
   along a centripetal Catmull-Rom through it. NaAudio__Spatial__CableRouter does the
   choosing, because avoiding the instruments means knowing where the instruments are, and
   that is spatial knowledge rather than render knowledge.

   Centripetal rather than uniform Catmull-Rom, and that is not a detail. A uniform spline
   through unevenly spaced points overshoots between them, and every waypoint on this path
   exists precisely because something must not be overshot into. Centripetal
   parameterisation is the variant with the guarantee against cusps and self-intersection,
   which is the guarantee the router is relying on when it places a point just outside an
   obstacle.

   The first and last points are the sockets themselves, so a lead always starts and ends
   exactly where its plug is, whatever the route did in between.

   ---------------------------------------------------------------------------

   WHY THE TUBE IS WRITTEN BY HAND

   THREE.TubeGeometry builds a new geometry per call and allocates a Vector3 per sample
   point. A cable is rebuilt every frame while either end moves, and a dragged module
   with three leads would produce a few hundred throwaway geometries a second.

   So the ring positions are written straight into a preallocated buffer using a
   parallel-transport frame carried along the curve. The index buffer is built once and
   never touched. Nothing here allocates after construction.

   Parallel transport rather than a Frenet frame on purpose: a Frenet frame flips its
   normal through an inflection point, and a routed lead has one at every waypoint - which
   would show up as the tube visibly twisting each time it rounded an instrument.

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

    const REST_EPSILON     =  0.000004;                                      // <-- Squared speed below which a lead-out spring has stopped

    const PLUG_FORWARD     =  new THREE.Vector3(0, 1, 0);                    // <-- A cylinder's own axis in three is +Y
    const FALLBACK_UP      =  new THREE.Vector3(0, 1, 0);
    const FALLBACK_SIDE    =  new THREE.Vector3(1, 0, 0);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Curve Evaluation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Point the Cable Curve Through the Current Path
    // ------------------------------------------------------------
    // The curve's points array is REPLACED with a slice of the cable's own path vectors
    // rather than being rebuilt from copies. CatmullRomCurve3 only ever reads them, and a
    // route can change length every frame while a module is dragged - copying would mean
    // a fresh array and a fresh set of vectors per cable per frame.
    function NaAudio__Env3d__CableFactory__PointCurve(state) {
        state.CurvePoints.length  =  0;
        for (let i = 0; i < state.PathCount; i++) state.CurvePoints.push(state.Path[i]);

        state.Curve.points  =  state.CurvePoints;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Advance One Lead-Out Point's Spring by a Frame
    // ------------------------------------------------------------
    // A damped spring. delta is clamped before it reaches the integrator: a tab returning
    // from the background delivers one enormous frame, and an unclamped spring integrated
    // across it goes unstable and flings the lead off into the distance - permanently,
    // because nothing pulls it back.
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
    function NaAudio__Env3d__CableFactory__WriteTube(state) {
        const positions       =  state.PositionAttribute.array;
        const normals         =  state.NormalAttribute.array;
        const lengthSegments  =  state.LengthSegments;
        const radialSegments  =  state.RadialSegments;
        const radius          =  state.Radius;

        const curve  =  state.Curve;

        // Seed the frame with any vector not parallel to the first tangent.
        curve.getPoint(0,    SCRATCH_PREVIOUS);
        curve.getPoint(0.01, SCRATCH_TANGENT);
        SCRATCH_TANGENT.sub(SCRATCH_PREVIOUS).normalize();

        SCRATCH_NORMAL.copy(Math.abs(SCRATCH_TANGENT.y) > 0.9 ? FALLBACK_SIDE : FALLBACK_UP);
        SCRATCH_NORMAL.cross(SCRATCH_TANGENT).normalize();
        if (SCRATCH_NORMAL.lengthSq() < 0.0001) SCRATCH_NORMAL.copy(FALLBACK_SIDE);

        let cursor  =  0;

        for (let i = 0; i <= lengthSegments; i++) {
            const t  =  i / lengthSegments;

            curve.getPoint(t, SCRATCH_POINT);

            // The tangent is a forward difference, except at the last sample where it
            // has to be a backward one - there is nothing in front of the end of a curve.
            const step  =  1 / lengthSegments;
            if (i < lengthSegments) {
                curve.getPoint(t + step * 0.5, SCRATCH_TANGENT);
                SCRATCH_TANGENT.sub(SCRATCH_POINT);
            } else {
                curve.getPoint(t - step * 0.5, SCRATCH_TANGENT);
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


    // FUNCTION | Build a Patch Cable Along a Routed Path
    // ------------------------------------------------------------
    // path is an array of Vector3 and pathCount says how many of them are live. The
    // caller owns that array and reuses it for every cable it draws, so the points are
    // COPIED in rather than referenced - a cable holding a reference into a shared
    // scratch array would redraw itself as whichever lead was routed most recently.
    export function NaAudio__Env3d__CableFactory__Build(path, pathCount, signalType, maxPathPoints) {
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
            Path              : [],                                           // <-- The live path the tube is swept along
            PathCount         : 0,
            CurvePoints       : [],
            Curve             : new THREE.CatmullRomCurve3([], false, 'centripetal', 0.5),
            LeadOutFrom       : new THREE.Vector3(),                          // <-- Sprung; lags the route while a module is dragged
            LeadOutTo         : new THREE.Vector3(),
            LeadOutFromVel    : new THREE.Vector3(),
            LeadOutToVel      : new THREE.Vector3(),
            HasSettled        : false,
            IsAtRest          : false,                                        // <-- Read by the patch graph to skip an idle cable entirely
            StartTangent      : new THREE.Vector3(0, 1, 0),
            EndTangent        : new THREE.Vector3(0, 1, 0)
        };

        for (let i = 0; i < maxPathPoints; i++) state.Path.push(new THREE.Vector3());

        group.userData.NaAudio__CableState  =  state;

        // Settled on construction rather than sprung into place. A space that loads with
        // every lead whipping across the floor looks like a physics demo, not like a
        // patch somebody left.
        NaAudio__Env3d__CableFactory__Update(group, path, pathCount, 0);

        return group;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rewrite a Cable's Geometry Along a Freshly Routed Path
    // ------------------------------------------------------------
    // delta of 0 snaps the lead-outs to the route rather than springing them there, which
    // is what construction wants.
    //
    // Only the two LEAD-OUT points are sprung. The waypoints in between come from the
    // router and are taken exactly, because they exist to clear an obstacle by a measured
    // margin and a sprung one would swing through the thing it was placed to avoid. The
    // whip therefore lives at the ends, next to the module being dragged, which is where
    // it was always visible anyway.
    export function NaAudio__Env3d__CableFactory__Update(cableGroup, path, pathCount, delta) {
        const state  =  cableGroup && cableGroup.userData.NaAudio__CableState;
        if (!state || pathCount < 2) return;

        const limit  =  Math.min(pathCount, state.Path.length);

        for (let i = 0; i < limit; i++) state.Path[i].copy(path[i]);
        state.PathCount  =  limit;

        // THE SPRING, on the lead-outs only.
        if (limit >= 4) {
            if (delta > 0 && state.HasSettled) {
                NaAudio__Env3d__CableFactory__AdvanceSpring(state.LeadOutFrom, state.LeadOutFromVel, path[1], delta);
                NaAudio__Env3d__CableFactory__AdvanceSpring(state.LeadOutTo,   state.LeadOutToVel,   path[limit - 2], delta);
            } else {
                state.LeadOutFrom.copy(path[1]);
                state.LeadOutTo.copy(path[limit - 2]);
                state.HasSettled  =  true;
                state.LeadOutFromVel.set(0, 0, 0);
                state.LeadOutToVel.set(0, 0, 0);
            }

            // AT REST once the springs have stopped meaning anything. The patch graph
            // uses this to skip a cable whose layout has not changed, which is what keeps
            // a space with thirty leads in it from re-routing thirty paths a frame to
            // arrive at exactly the geometry it already had.
            state.IsAtRest  =  state.LeadOutFromVel.lengthSq() < REST_EPSILON
                            && state.LeadOutToVel.lengthSq()   < REST_EPSILON;

            state.Path[1].copy(state.LeadOutFrom);
            state.Path[limit - 2].copy(state.LeadOutTo);
        }

        NaAudio__Env3d__CableFactory__PointCurve(state);
        NaAudio__Env3d__CableFactory__WriteTube(state);

        // THE PLUGS
        // Seated slightly INSIDE the socket rather than flush against it, so the barrel
        // reads as inserted. A plug sitting exactly on the port face looks like a bead
        // threaded onto the cable.
        const inset  =  SpatialNumber('PatchGraph', 'PlugLength') * 0.35;

        NaAudio__Env3d__CableFactory__SeatPlug(state.FromPlug, state.Path[0],         state.StartTangent, -inset);
        NaAudio__Env3d__CableFactory__SeatPlug(state.ToPlug,   state.Path[limit - 1], state.EndTangent,    inset);
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
