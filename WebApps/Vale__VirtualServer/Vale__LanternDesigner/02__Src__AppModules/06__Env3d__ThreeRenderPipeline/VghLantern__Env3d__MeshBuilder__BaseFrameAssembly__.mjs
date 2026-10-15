/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - BASE FRAME ASSEMBLY
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__BaseFrameAssembly__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder BaseFrameAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Sweep the three part Vale base frame around the eaves datum ring
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - The Vale base frame is three parts sharing one section frame whose origin
     is the EAVES DATUM POINT:

         Head Beam          46_1001   Sapele, 125 x 96, seated atop the
                                      builders upstand; its underside is the
                                      +/-0000 benchmark
         Eaves Extrusion    46_1002   mill aluminium ring the glaze bar cores
                                      seat on and weld to, rotated to the roof
                                      pitch about the datum before sweeping
         Lead Flashing      46_1003   patination oiled cover flashing, rebated
                                      into the head beam and dressed down over
                                      the upstand

   - Every part is swept around the four sides of the eaves datum ring with
     true 45 degree plan mitres at the corners: each side's end vertex rings
     are slid along the side axis onto the corner's vertical mitre plane, so
     adjacent sides meet on coincident faces and the assembly stays watertight
     for the section-cut capping pass.
   - Pitch handling is done UPSTREAM in millimetre space by
     VghLantern__Geometry__BaseFrameAssembly.SectionsForPitch: the extrusion
     arrives rotated, the beam and flashing arrive with their weathered tops
     re-sloped. This module only places and sweeps.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__MillAluminium,
    VghLantern__Env3d__MaterialLibrary__LeadFlashing,
    VghLantern__Env3d__MaterialLibrary__SapeleHardwood
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__PickIndex__RegisterWhole
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Base Frame Assembly Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Build Order and Guards
    // ------------------------------------------------------------
    const PART_BUILD_ORDER  =  ['headBeam', 'eavesExtrusion', 'leadFlashing'];
    const MIN_SIDE_LENGTH_MM  =  1;                                          // <-- Below this a ring side is degenerate
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Sweep Around the Datum Ring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cumulative Perimeter Distance at Every Section Vertex
    // ------------------------------------------------------------
    // The texture U coordinate, in world units, restarting per ring - the same
    // convention the glaze bar composite uses, so the brushed grain on the
    // aluminium runs its die lines along the extrusion.
    function VghLantern__Env3d__BaseFrameAssembly__PerimeterDistances(face) {
        const points     =  face.Points;
        const distances  =  new Array(points.length).fill(0);
        let r, ring, k, index, previous, running, dx, dy;

        for (r = 0; r < face.Rings.length; r++) {
            ring     =  face.Rings[r];
            running  =  0;

            for (k = 0; k < ring.Count; k++) {
                index  =  ring.Start + k;

                if (k > 0) {
                    previous  =  ring.Start + k - 1;
                    dx  =  points[index].x - points[previous].x;
                    dy  =  points[index].y - points[previous].y;
                    running  +=  VghLantern__Env3d__ConfigAccess__MmToWorld(Math.sqrt((dx * dx) + (dy * dy)));
                }
                distances[index]  =  running;
            }
        }

        return distances;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Vertical Mitre Plane at One Ring Corner
    // ------------------------------------------------------------
    // The plane through the corner whose horizontal normal bisects the two
    // adjoining side directions. For a rectangle that is the 45 degree plan
    // mitre; the construction stays correct for any convex ring.
    function VghLantern__Env3d__BaseFrameAssembly__MitrePlaneAt(sides, cornerIndex) {
        const previous  =  sides[(cornerIndex + 3) % 4];
        const current   =  sides[cornerIndex];

        const nx   =  previous.Direction.x + current.Direction.x;
        const ny   =  previous.Direction.y + current.Direction.y;
        const len  =  Math.hypot(nx, ny);
        if (len <= 0) return null;

        return {
            Point  : current.Start,
            Normal : { x: nx / len, y: ny / len }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Sweep One Section Face Along One Ring Side, Mitred Both Ends
    // ------------------------------------------------------------
    // Model-space construction, converted to world per vertex at the end.
    // The side's local basis is right handed and matches the shared section
    // frame: Across = -Outward (section -x runs outboard), Up = +Z, Along =
    // the side direction. Each end ring is slid along the side axis onto the
    // corner's vertical mitre plane - vertices further outboard slide further,
    // which IS the mitre.
    //
    // Solid construction matches the glaze bar composite: two rings of section
    // vertices, walls quad per section edge, both ends capped over the same
    // vertices with the near cap reversed. Every edge shared by two triangles.
    function VghLantern__Env3d__BaseFrameAssembly__BuildMitredSideSolid(face, side, startPlane, endPlane, datumLevelMm, positions, indices, uvs) {
        const points  =  face.Points;
        const count   =  points.length;
        if (count < 3) return 0;

        const acrossX  =  -side.Outward.x;
        const acrossY  =  -side.Outward.y;
        const alongX   =  side.Direction.x;
        const alongY   =  side.Direction.y;

        const baseIx           =  positions.length / 3;
        const sideLengthWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(side.LengthMm);
        const perimeter        =  VghLantern__Env3d__BaseFrameAssembly__PerimeterDistances(face);

        const ends  =  [
            { Origin: side.Start, Plane: startPlane },
            { Origin: side.End,   Plane: endPlane   }
        ];

        let e, i, px, py, mx, my, mz, plane, denominator, slide, world;

        for (e = 0; e < ends.length; e++) {
            plane  =  ends[e].Plane;

            for (i = 0; i < count; i++) {
                px  =  points[i].x;
                py  =  points[i].y;

                mx  =  ends[e].Origin.x + (acrossX * px);
                my  =  ends[e].Origin.y + (acrossY * px);
                mz  =  datumLevelMm + py;

                // MITRE - slide the vertex along the side axis onto the corner
                // plane. The plane is vertical so height never enters into it.
                if (plane) {
                    denominator  =  (alongX * plane.Normal.x) + (alongY * plane.Normal.y);
                    if (Math.abs(denominator) > 1e-6) {
                        slide  =  (((plane.Point.x - mx) * plane.Normal.x)
                                +  ((plane.Point.y - my) * plane.Normal.y)) / denominator;
                        mx  +=  alongX * slide;
                        my  +=  alongY * slide;
                    }
                }

                world  =  VghLantern__Env3d__ConfigAccess__PointToWorld({ x: mx, y: my, z: mz });
                positions.push(world.x, world.y, world.z);
                uvs.push(perimeter[i], e === 0 ? 0 : sideLengthWorld);
            }
        }

        // WALLS - winding follows the section winding, which SectionLoopBuilder
        // has normalised (outer rings CCW, holes CW), so the same quad order
        // faces outward from the solid on both.
        let r, ring, k, currentIx, nextIx, near0, near1, far0, far1;

        for (r = 0; r < face.Rings.length; r++) {
            ring  =  face.Rings[r];

            for (k = 0; k < ring.Count; k++) {
                currentIx  =  ring.Start + k;
                nextIx     =  ring.Start + ((k + 1) % ring.Count);

                near0  =  baseIx + currentIx;
                near1  =  baseIx + nextIx;
                far0   =  near0  + count;
                far1   =  near1  + count;

                indices.push(near0, near1, far1);
                indices.push(near0, far1,  far0);
            }
        }

        // END CAPS - the far end as authored, the near end reversed so it faces
        // back along the side. Adjacent sides place these caps on the same
        // mitre plane, so the pair cancels in the section-cut capping pass.
        const triangles  =  face.Triangles;
        let t;

        for (t = 0; t < triangles.length; t += 3) {
            indices.push(
                baseIx + triangles[t + 2],
                baseIx + triangles[t + 1],
                baseIx + triangles[t]
            );
            indices.push(
                baseIx + count + triangles[t],
                baseIx + count + triangles[t + 1],
                baseIx + count + triangles[t + 2]
            );
        }

        return ((face.Rings.reduce(function(sum, span) { return sum + span.Count; }, 0)) * 2)
             + ((triangles.length / 3) * 2);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sweep One Part Around All Four Sides and Merge the Result
    // ------------------------------------------------------------
    function VghLantern__Env3d__BaseFrameAssembly__BuildPartMesh(partSection, ring, material, meshName) {
        const positions  =  [];
        const indices    =  [];
        const uvs        =  [];

        let s, f, side, startPlane, endPlane, built;
        built  =  0;

        for (s = 0; s < ring.Sides.length; s++) {
            side  =  ring.Sides[s];
            if (side.LengthMm < MIN_SIDE_LENGTH_MM) continue;

            startPlane  =  VghLantern__Env3d__BaseFrameAssembly__MitrePlaneAt(ring.Sides, s);
            endPlane    =  VghLantern__Env3d__BaseFrameAssembly__MitrePlaneAt(ring.Sides, (s + 1) % 4);

            for (f = 0; f < partSection.Faces.length; f++) {
                built  +=  VghLantern__Env3d__BaseFrameAssembly__BuildMitredSideSolid(
                    partSection.Faces[f], side, startPlane, endPlane,
                    ring.DatumLevelMm, positions, indices, uvs);
            }
        }

        if (built === 0 || indices.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();                                      // <-- Part materials shade flat, so arrises stay crisp
        geometry.computeBoundingSphere();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName;
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Materials and Identity
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    // The head beam is fixed Sapele hardwood, factory sealed - a role material
    // in its own right, the same way the mill aluminium core is, rather than
    // following the lantern's chosen paint finish. The extrusion is bare mill
    // aluminium, same as the glaze bar core. The flashing is patination oiled
    // lead - also a fixed role material.
    function VghLantern__Env3d__BaseFrameAssembly__MaterialForPart(partKey) {
        if (partKey === 'headBeam')     return VghLantern__Env3d__MaterialLibrary__SapeleHardwood();
        if (partKey === 'leadFlashing') return VghLantern__Env3d__MaterialLibrary__LeadFlashing();
        return VghLantern__Env3d__MaterialLibrary__MillAluminium();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    // The same stamp set the glaze bar composite writes, so the element filter,
    // hover inspector and takeoff read base frame parts with no special casing.
    function VghLantern__Env3d__BaseFrameAssembly__StampUserData(mesh, part, finishName) {
        mesh.userData.VghLantern__PartKey         =  part.PartKey;
        mesh.userData.VghLantern__PartName        =  part.PartName;
        mesh.userData.VghLantern__AssetId         =  part.AssetId;
        mesh.userData.VghLantern__ElementType     =  part.ElementType;
        mesh.userData.VghLantern__SpecMaterial    =  part.SpecMaterial;
        mesh.userData.VghLantern__SectionAreaSqMm =  part.SectionAreaSqMm;
        mesh.userData.VghLantern__PartFinish      =  finishName || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Base Frame Assembly Around the Eaves Datum Ring
    // ------------------------------------------------------------
    // Returns a summary rather than throwing: a lantern whose base frame data
    // has not arrived must still draw everything else.
    export async function VghLantern__Env3d__MeshBuilder__BaseFrameAssembly__Build(targetGroup, skeleton, lantern) {
        const summary  =  { Parts : [], Warnings : [] };
        if (!targetGroup || !skeleton || !skeleton.Meta) return summary;
        if (skeleton.Meta.IsValid === false) return summary;

        const Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        const Loader    =  window.VghLantern__AppData__BaseFrameSystemLoader;
        if (!Assembly || !Loader) {
            summary.Warnings.push('Base frame assembly modules are not available - base frame not built.');
            return summary;
        }

        const ring  =  Assembly.VghLantern__BaseFrameAssembly__DatumRing(skeleton);
        if (!ring) {
            summary.Warnings.push('No eaves datum ring could be resolved - base frame not built.');
            return summary;
        }

        let parts;
        try {
            parts  =  await Loader.VghLantern__BaseFrameSystemLoader__ResolveParts();
        } catch (error) {
            summary.Warnings.push('Base frame parts could not be resolved: ' + error.message);
            return summary;
        }
        if (!parts || parts.length === 0) {
            summary.Warnings.push('Base frame system resolved no parts.');
            return summary;
        }

        const sections  =  Assembly.VghLantern__BaseFrameAssembly__SectionsForPitch(parts, ring.PitchDegrees);

        let p, key, section, material, mesh, i;

        for (p = 0; p < PART_BUILD_ORDER.length; p++) {
            key      =  PART_BUILD_ORDER[p];
            section  =  null;
            for (i = 0; i < sections.length; i++) {
                if (sections[i] && sections[i].PartKey === key) { section  =  sections[i]; break; }
            }
            if (!section || !section.Faces || section.Faces.length === 0) continue;

            material  =  VghLantern__Env3d__BaseFrameAssembly__MaterialForPart(key);
            mesh      =  VghLantern__Env3d__BaseFrameAssembly__BuildPartMesh(
                section, ring, material, 'VghLantern__Env3d__BaseFrame__' + key);
            if (!mesh) continue;

            // No part here carries a chosen finish: the head beam is fixed
            // Sapele hardwood, the extrusion bare mill aluminium, the flashing
            // fixed patination oiled lead - the same reason the glaze bar core
            // stamps no PartFinish either.
            VghLantern__Env3d__BaseFrameAssembly__StampUserData(mesh, section, '');
            VghLantern__Env3d__PickIndex__RegisterWhole(mesh, 'base', key, {
                PartKey      : section.PartKey,
                PartName     : section.PartName,
                AssetId      : section.AssetId,
                SpecMaterial : section.SpecMaterial,
                PerimeterMm  : ring.PerimeterMm
            });
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey          : section.PartKey,
                PartName         : section.PartName,
                AssetId          : section.AssetId,
                ElementType      : section.ElementType,
                SpecMaterial     : section.SpecMaterial,
                SectionAreaSqMm  : section.SectionAreaSqMm,
                WasClamped       : section.WasClamped === true
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No base frame part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
