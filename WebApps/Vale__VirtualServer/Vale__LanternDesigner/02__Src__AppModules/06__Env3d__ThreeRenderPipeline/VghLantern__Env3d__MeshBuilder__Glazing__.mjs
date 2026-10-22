/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - GLAZING
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__Glazing__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder Glazing
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the translucent glazing panels from the solved glazing panel layout
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds every glazing PANEL as a translucent slab: one sealed unit between
     its bars and hips, cut by VghLantern__Geometry__GlazingPanelLayout, which
     is the one place the glass is divided. This module lifts the outlines that
     layout hands it and adds nothing to them.
   - The slab is seated on the GLAZE BAR DATUM the way the real unit is. Its
     INNER face sits the bedding offset ABOVE the datum, which is the depth of
     the core's glazing leg and the setting tape the pane beds onto, and the
     unit's thickness is then measured outward from that bedding face. Both
     numbers come from the panel set's Meta, so the slab is lifted by exactly
     what the panel was cut for.
   - Where the top pane oversails the eaves extrusion upstand (the stepped edge
     Adam sketched on 20-Oct-2026), a second, thinner slab carries the top pane
     on to the cap ends. The unit and its lip are one panel to the inspector.
   - Until v0.9.0 this drew whole slopes rather than panels ("at review scale the
     bar meshes already delineate the panes"). That slab ran through every bar
     web and core, and the glazing schedule needs real panels, so it is kept
     only as the fallback for a lantern with no bar set to cut by.

   ---------------------------------------------------------------------------

   WHY THE GLASS HAS THICKNESS:
   A sealed unit is 28 mm over its two panes, the spacer and the seals, and that
   depth is doing visual work. A single plane has no edge to catch light where it
   meets a bar, and only one surface to reflect from, which is a large part of
   why flat-plane glass reads as a tinted sheet however well the material is
   tuned. The slab gives a visible edge at every junction and a second reflection
   off the back face.

   Extrusion runs OUTWARD from the bedding face, because that is the face the bar
   actually locates. The pane sits down on the core's glazing leg and everything
   above it is unit thickness, so changing the thickness moves the OUTER surface
   up under the cap and leaves the bedding face exactly where the bar put it -
   which is how a thicker unit behaves on the real roof.

   EVERY FACE IS GLASS:
   Outer cap, inner cap and edge band are all part of one buffer and so all wear
   the glazing material. This matters more than it sounds: an untextured reverse
   or edge face would read as flat grey wherever the frame does not cover it,
   which on a lantern is every eaves and ridge junction and the whole underside
   seen from indoors.

   TRIANGULATION AND WINDING:
   Solver faces are convex quads or triangles, and every panel the layout cuts
   is convex by construction (a convex slope clipped by half planes), so a fan
   from the first vertex is both correct and cheap - no general tessellator, no
   dependency. A slab does
   need its winding to be right, though, where a plane did not: computeVertexNormals
   derives normals from winding, so a reversed cap would light as though the sky
   were underneath the roof. The point ring is therefore normalised to an
   outward winding once, and every cap and wall is built consistently from it.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import { VghLantern__Env3d__MaterialLibrary__Glazing } from './VghLantern__Env3d__MaterialLibrary__.mjs';
import { VghLantern__Env3d__PickIndex__Register, VghLantern__Env3d__PickIndex__ModeTriangle } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Glazing Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Face Filtering and Geometry Guards
    // ------------------------------------------------------------
    const FACE_ROLE_GLAZING     =  'glazingFace';                            // <-- Only glazing faces get glass
    const MIN_FACE_POINTS       =  3;                                        // <-- A face needs at least a triangle
    const VERTICES_PER_TRIANGLE =  3;                                        // <-- The vertex sink is a flat triangle list
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The System Indexes the Panel Cut Reads
    // ------------------------------------------------------------
    // The panel layout reads the glass build-up, the core webs and the eaves glass
    // stop synchronously from these four. Init loads all four at boot; awaiting
    // them here as well (each load is memoised, so this is a resolved promise by
    // then) means a surface built before boot finished still cuts with the index
    // numbers rather than the layout's fallbacks.
    const PANEL_CUT_LOADERS  =  [
        { Global : 'VghLantern__AppData__GlazeBarSystemLoader',  Fn : 'VghLantern__GlazeBarSystemLoader__LoadIndex'  },
        { Global : 'VghLantern__AppData__RidgeSystemLoader',     Fn : 'VghLantern__RidgeSystemLoader__LoadIndex'     },
        { Global : 'VghLantern__AppData__HipSystemLoader',       Fn : 'VghLantern__HipSystemLoader__LoadIndex'       },
        { Global : 'VghLantern__AppData__BaseFrameSystemLoader', Fn : 'VghLantern__BaseFrameSystemLoader__LoadIndex' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Geometry Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute the Outward Normal of a Face
    // ------------------------------------------------------------
    // Derived from the first three vertices, then flipped if it points inward.
    // A roof slope always faces upward to some degree, so a downward normal means
    // the winding runs the other way for our purposes.
    function VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints) {
        const edgeA  =  new THREE.Vector3().subVectors(worldPoints[1], worldPoints[0]);
        const edgeB  =  new THREE.Vector3().subVectors(worldPoints[2], worldPoints[0]);
        const normal =  new THREE.Vector3().crossVectors(edgeA, edgeB).normalize();

        if (normal.y < 0) normal.negate();
        return normal;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extend a Face's Eaves Edge Down to the Cap Ends
    // ------------------------------------------------------------
    // The solved face stops on the eaves datum ring, but the real glass runs
    // down the slope past the datum with the bars, ending level with the glaze
    // bar cap ends (the cap extension along the pitch, from the base frame
    // system).
    //
    // HOW THE CORNERS MOVE - this is the part that keeps the hips closed.
    // Every eaves vertex slides along its OWN upslope boundary edge, extended:
    // for a corner that edge is the hip (or the pane's ridge-end edge), so the
    // pane's mitred side stays collinear with the hip line rather than
    // swinging sideways. The slide distance is scaled so the movement's
    // down-slope component is exactly the cap extension - the whole eaves edge
    // lands parallel to the datum, one extension down the pitch, at the cap
    // end level. On an equal-pitch hip the two adjacent panes extend along the
    // same 3D hip line by the same amount, so their extended corners COINCIDE
    // and no gap can open. Points above the eaves never move; the solved face
    // is not touched, so set-out and area takeoff keep the datum geometry.
    function VghLantern__Env3d__GlazingBuilder__ExtendPointsToCapEnds(face, skeleton) {
        const points    =  face.Points;
        const Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        const meta      =  skeleton.Meta || {};
        const eavesMm   =  Number(meta.EavesLevelMm);
        if (!Assembly || !isFinite(eavesMm)) return points;

        const extensionMm  =  Number(Assembly.VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarCapExtensionAlongPitchMm) || 0;
        if (extensionMm <= 0) return points;

        const count    =  points.length;
        const onEaves  =  points.map(function(pt) { return Math.abs(pt.z - eavesMm) <= 0.5; });
        const eavesPts =  points.filter(function(pt, i) { return onEaves[i]; });
        if (eavesPts.length < 2 || eavesPts.length >= count) return points;

        // In-plane down-slope unit for this face: horizontal outward normal of
        // the eaves edge (away from the centroid) pitched down by the face
        // pitch. Used to scale each vertex's slide and as the fallback
        // direction if a boundary edge ever degenerates.
        const pitchRad  =  (Number(face.PitchDegrees) || 0) * (Math.PI / 180);

        let cx = 0, cy = 0;
        for (let i = 0; i < count; i++) { cx += points[i].x; cy += points[i].y; }
        cx /= count; cy /= count;

        const ex  =  eavesPts[1].x - eavesPts[0].x;
        const ey  =  eavesPts[1].y - eavesPts[0].y;
        const el  =  Math.hypot(ex, ey);
        if (el <= 0) return points;

        let nx  =  ey / el;
        let ny  =  -ex / el;
        if (((eavesPts[0].x - cx) * nx) + ((eavesPts[0].y - cy) * ny) < 0) { nx = -nx; ny = -ny; }

        const slopeDir  =  {
            x : nx * Math.cos(pitchRad),
            y : ny * Math.cos(pitchRad),
            z : -Math.sin(pitchRad)
        };

        return points.map(function(pt, i) {
            if (!onEaves[i]) return pt;

            // The upslope neighbour on the polygon boundary - the hip end or
            // ridge end this vertex's side edge runs up to.
            const prev   =  points[(i + count - 1) % count];
            const next   =  points[(i + 1) % count];
            const upper  =  !onEaves[(i + count - 1) % count] ? prev
                         :  !onEaves[(i + 1) % count]         ? next
                         :  null;

            let dirX  =  slopeDir.x, dirY  =  slopeDir.y, dirZ  =  slopeDir.z;

            if (upper) {
                const ux   =  pt.x - upper.x;
                const uy   =  pt.y - upper.y;
                const uz   =  pt.z - upper.z;
                const ul   =  Math.hypot(ux, uy, uz);
                if (ul > 0) { dirX = ux / ul; dirY = uy / ul; dirZ = uz / ul; }
            }

            // Scale so the slide's down-slope component equals the extension.
            const denom  =  (dirX * slopeDir.x) + (dirY * slopeDir.y) + (dirZ * slopeDir.z);
            const slide  =  denom > 0.1 ? extensionMm / denom : extensionMm;

            return { x: pt.x + (dirX * slide), y: pt.y + (dirY * slide), z: pt.z + (dirZ * slide) };
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Face's Model Points to Offset World Points
    // ------------------------------------------------------------
    // The solved face plane IS the glaze bar datum - the same section zero the
    // composite bar is built about - so offsetWorld is measured from that datum
    // along the face's OUTWARD normal. Positive lifts the ring out through the
    // roof towards the cap, negative drops it inside towards the trim.
    //
    // The returned ring is wound so that a fan across it faces OUTWARD. A slab
    // has an inside and an outside, so unlike a single plane its winding has to
    // be right: computeVertexNormals reads winding, and a reversed cap would
    // light as though the sky were underneath the roof.
    function VghLantern__Env3d__GlazingBuilder__OffsetFacePoints(face, offsetWorld) {
        const worldPoints  =  [];

        for (let i = 0; i < face.Points.length; i++) {
            const pt  =  VghLantern__Env3d__ConfigAccess__PointToWorld(face.Points[i]);
            worldPoints.push(new THREE.Vector3(pt.x, pt.y, pt.z));
        }

        if (worldPoints.length < MIN_FACE_POINTS) return worldPoints;

        const outward  =  VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints);

        // FaceNormal may have flipped the raw winding normal to point up. When it
        // did, the point order itself is reversed relative to outward, so reverse
        // it once here and every cap and wall built from it is consistent.
        const edgeA  =  new THREE.Vector3().subVectors(worldPoints[1], worldPoints[0]);
        const edgeB  =  new THREE.Vector3().subVectors(worldPoints[2], worldPoints[0]);
        const raw    =  new THREE.Vector3().crossVectors(edgeA, edgeB);
        if (raw.dot(outward) < 0) worldPoints.reverse();

        if (offsetWorld !== 0) {
            for (let i = 0; i < worldPoints.length; i++) {
                worldPoints[i].addScaledVector(outward, offsetWorld);          // <-- Lift the ring clear of the bar datum
            }
        }
        return worldPoints;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fan Triangulate a Convex Ring Into a Vertex List
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazingBuilder__FanTriangles(ring, sink) {
        for (let i = 1; i < ring.length - 1; i++) {
            sink.push(ring[0], ring[i], ring[i + 1]);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fan Triangulate a Ring With Reversed Winding
    // ------------------------------------------------------------
    // The back face of the slab, wound so its normal points the other way.
    function VghLantern__Env3d__GlazingBuilder__FanTrianglesReversed(ring, sink) {
        for (let i = 1; i < ring.length - 1; i++) {
            sink.push(ring[0], ring[i + 1], ring[i]);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Glazing Slab From an Outward-Wound Ring
    // ------------------------------------------------------------
    // The ring handed in is the OUTER face of the unit and the body is built
    // back inward from it. The caller places that ring at the bedding offset
    // PLUS the thickness, so the inner ring lands exactly on the bedding face
    // above the bar datum whatever the thickness is set to.
    //
    // Emits the outer cap, the inner cap and the edge band. All three are part of
    // the same buffer and so wear the same glass material - a slab whose reverse
    // and edge faces were untextured would show as flat grey wherever the frame
    // does not cover it, which on a lantern is every eaves and ridge junction.
    function VghLantern__Env3d__GlazingBuilder__BuildSlab(outerRing, outward, thicknessWorld, sink) {
        if (thicknessWorld <= 0) {
            VghLantern__Env3d__GlazingBuilder__FanTriangles(outerRing, sink);
            return;
        }

        const innerRing  =  outerRing.map(function(point) {
            return point.clone().addScaledVector(outward, -thicknessWorld);
        });

        VghLantern__Env3d__GlazingBuilder__FanTriangles(outerRing, sink);           // <-- Outer face, normals outward
        VghLantern__Env3d__GlazingBuilder__FanTrianglesReversed(innerRing, sink);   // <-- Inner face, normals inward

        // EDGE BAND | One quad per ring edge, wound so its normal points away
        // from the slab body rather than into it.
        for (let i = 0; i < outerRing.length; i++) {
            const next   =  (i + 1) % outerRing.length;
            const outerA =  outerRing[i];
            const outerB =  outerRing[next];
            const innerA =  innerRing[i];
            const innerB =  innerRing[next];

            sink.push(outerA, innerA, innerB);
            sink.push(outerA, innerB, outerB);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glazing Assembly
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wait for the System Indexes the Panel Cut Reads
    // ------------------------------------------------------------
    // Each loader's LoadIndex is memoised and resolves null rather than throwing
    // when its index cannot load, so this never rejects; a missing loader is
    // skipped and the layout falls back to its documented numbers for it.
    async function VghLantern__Env3d__GlazingBuilder__AwaitSystemIndexes() {
        const pending  =  [];
        for (let i = 0; i < PANEL_CUT_LOADERS.length; i++) {
            const loader  =  window[PANEL_CUT_LOADERS[i].Global];
            const load    =  loader ? loader[PANEL_CUT_LOADERS[i].Fn] : null;
            if (typeof load === 'function') pending.push(load());
        }
        await Promise.all(pending);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cut the Lantern's Glass Into Panels
    // ------------------------------------------------------------
    // Null when there is nothing to cut by - no layout module, or no bar set -
    // which sends the build down the whole slope fallback rather than leaving the
    // roof with no glass at all.
    function VghLantern__Env3d__GlazingBuilder__PanelSet(skeleton, barSet, lantern) {
        const Layout  =  window.VghLantern__Geometry__GlazingPanelLayout;
        if (!Layout || !barSet) return null;

        const panelSet  =  Layout.VghLantern__GlazingPanelLayout__Layout(skeleton, barSet, lantern);
        if (!panelSet || !Array.isArray(panelSet.Panels) || panelSet.Panels.length === 0) return null;

        if (panelSet.Warnings.length > 0) {
            console.warn('[VghLantern__Env3d__MeshBuilder__Glazing] Panel layout warnings:', panelSet.Warnings);
        }
        return panelSet;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Every Glazing Panel Into the Vertex Sink
    // ------------------------------------------------------------
    // Each panel is its unit slab and, where the top pane oversails, the thinner
    // lip slab carrying it on to the cap ends. Both are pushed inside one span, so
    // the inspector names the panel - its code and its sizes - wherever on it the
    // cursor lands. The outlines lie ON the glaze bar datum; the unit's ring goes
    // in at its outer face and the slab closes back down onto the bedding face,
    // and the lip shares that outer face and closes down by the top pane only.
    function VghLantern__Env3d__GlazingBuilder__BuildPanels(panelSet, vertices, spans) {
        const meta            =  panelSet.Meta;
        const outerFaceWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(meta.BeddingOffsetMm + meta.UnitThicknessMm);
        const unitWorld       =  VghLantern__Env3d__ConfigAccess__MmToWorld(meta.UnitThicknessMm);
        const lipWorld        =  VghLantern__Env3d__ConfigAccess__MmToWorld(meta.OuterPaneThicknessMm);

        for (let i = 0; i < panelSet.Panels.length; i++) {
            const panel  =  panelSet.Panels[i];
            if (!Array.isArray(panel.Outline3d) || panel.Outline3d.length < MIN_FACE_POINTS) continue;

            const triangleStart  =  vertices.length / VERTICES_PER_TRIANGLE;

            const unitRing  =  VghLantern__Env3d__GlazingBuilder__OffsetFacePoints({ Points : panel.Outline3d }, outerFaceWorld);
            VghLantern__Env3d__GlazingBuilder__BuildSlab(unitRing, VghLantern__Env3d__GlazingBuilder__FaceNormal(unitRing), unitWorld, vertices);

            if (lipWorld > 0 && Array.isArray(panel.LipOutline3d) && panel.LipOutline3d.length >= MIN_FACE_POINTS) {
                const lipRing  =  VghLantern__Env3d__GlazingBuilder__OffsetFacePoints({ Points : panel.LipOutline3d }, outerFaceWorld);
                VghLantern__Env3d__GlazingBuilder__BuildSlab(lipRing, VghLantern__Env3d__GlazingBuilder__FaceNormal(lipRing), lipWorld, vertices);
            }

            spans.push({
                Record    : panel,
                SpanStart : triangleStart,
                SpanCount : (vertices.length / VERTICES_PER_TRIANGLE) - triangleStart
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Each Whole Slope as One Slab (the Fallback)
    // ------------------------------------------------------------
    // The pre-v0.9.0 glass: one slab per solved slope, run past the datum to the
    // cap ends. It passes through every bar web and core, so it is no longer the
    // model; it stays as the fallback for a lantern with no bar set to cut by, so
    // such a roof still shows glass. Lifted by the panel layout's build-up numbers
    // when that module is loaded, so the two paths never seat glass differently.
    // Do not delete it on the grounds that a normal lantern never reaches it.
    function VghLantern__Env3d__GlazingBuilder__BuildWholeSlopes(skeleton, vertices, spans) {
        const Layout          =  window.VghLantern__Geometry__GlazingPanelLayout;
        const numbers         =  Layout ? Layout.VghLantern__GlazingPanelLayout__Interface() : null;
        const innerFaceWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(numbers ? numbers.BeddingOffsetMm
                                     : VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingInnerFaceOffsetMm'));
        const thicknessWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(numbers ? numbers.UnitThicknessMm
                                     : VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingThicknessMm'));
        const outerFaceWorld  =  innerFaceWorld + thicknessWorld;             // <-- Ring goes in at the outer face; the slab closes back down onto the bedding face

        for (let i = 0; i < skeleton.Faces.length; i++) {
            const face  =  skeleton.Faces[i];
            if (!face || face.Role !== FACE_ROLE_GLAZING) continue;
            if (!Array.isArray(face.Points) || face.Points.length < MIN_FACE_POINTS) continue;

            // Recorded either side of the fan so each face knows which triangles of
            // the shared buffer are its own, which is what lets the hover inspector
            // name one slope out of a mesh holding all four.
            const triangleStart  =  vertices.length / VERTICES_PER_TRIANGLE;

            // The glass runs past the datum to the cap ends; the pick record
            // stays the solved face so the inspector reports datum geometry.
            const extendedFace  =  { Points : VghLantern__Env3d__GlazingBuilder__ExtendPointsToCapEnds(face, skeleton) };

            const worldPoints  =  VghLantern__Env3d__GlazingBuilder__OffsetFacePoints(extendedFace, outerFaceWorld);
            const outward      =  VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints);
            VghLantern__Env3d__GlazingBuilder__BuildSlab(worldPoints, outward, thicknessWorld, vertices);

            spans.push({
                Record    : face,
                SpanStart : triangleStart,
                SpanCount : (vertices.length / VERTICES_PER_TRIANGLE) - triangleStart
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Every Glazing Panel Into the Glazing Group
    // ------------------------------------------------------------
    // ASYNC since v0.9.0, because the panel cut reads four system indexes and a
    // surface can be built before boot has finished loading them. Both callers -
    // the render pipeline and the projected edges stage - await it in their own
    // build order, so the glass still lands first.
    export async function VghLantern__Env3d__MeshBuilder__Glazing__Build(targetGroup, skeleton, barSet, lantern) {
        if (!targetGroup || !skeleton || !Array.isArray(skeleton.Faces)) return;

        await VghLantern__Env3d__GlazingBuilder__AwaitSystemIndexes();

        const vertices  =  [];
        const spans     =  [];
        const panelSet  =  VghLantern__Env3d__GlazingBuilder__PanelSet(skeleton, barSet, lantern);

        if (panelSet) {
            VghLantern__Env3d__GlazingBuilder__BuildPanels(panelSet, vertices, spans);
        } else {
            VghLantern__Env3d__GlazingBuilder__BuildWholeSlopes(skeleton, vertices, spans);
        }

        if (vertices.length === 0) return;

        const positions  =  new Float32Array(vertices.length * 3);
        for (let i = 0; i < vertices.length; i++) {
            positions[i * 3]      =  vertices[i].x;
            positions[i * 3 + 1]  =  vertices[i].y;
            positions[i * 3 + 2]  =  vertices[i].z;
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const mesh      =  new THREE.Mesh(geometry, VghLantern__Env3d__MaterialLibrary__Glazing());
        mesh.name       =  'VghLantern__Env3d__Glazing';
        mesh.renderOrder =  1;                                                // <-- Transparent geometry draws after the frame

        // The element type is stamped on the MESH rather than left to the scene
        // group's default. In the live viewport the glass always lands in the
        // glazing group and the default is enough, but the projected edges stage
        // flattens every builder into one group, and a consumer there has no group
        // to read. Stating it here makes the mesh self-describing wherever it is
        // put - which is what lets the projection know this one pane of geometry
        // draws its own edges without hiding what is behind it.
        mesh.userData.VghLantern__ElementType  =  'Glazing';

        VghLantern__Env3d__PickIndex__Register(mesh, 'glazing', FACE_ROLE_GLAZING, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
        targetGroup.add(mesh);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
