/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - INTERIOR JOINERY ASSEMBLY
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__InteriorJoineryAssembly__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder InteriorJoineryAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Sweep interior cornice, packer and eaves trim around the eaves ring
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Interior joinery shares the eaves datum ring and mitred side sweep used by
     the base frame. Pitch handling for the eaves trim top edge is done upstream
     in VghLantern__Geometry__InteriorJoineryAssembly; this module only places
     and sweeps.
   - Cornice and eaves trim take the job's joinery paint finish (per-element
     advanced fields when set). The plywood packer is bare plywood.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__GlazeBarTrim,
    VghLantern__Env3d__MaterialLibrary__Plywood
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__PickIndex__RegisterWhole
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Interior Joinery Assembly Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Build Order and Guards
    // ------------------------------------------------------------
    const PART_BUILD_ORDER    =  ['cornicePacker', 'cornice', 'eavesTrim'];
    const MIN_SIDE_LENGTH_MM  =  1;
    const JOINERY_BLOCK       =  'Lantern__InteriorJoinery__Config';
    const FINISH_BLOCK        =  'Lantern__FinishAndGlazing__Config';
    const BARS_BLOCK          =  'Lantern__GlazingBars__Config';
    const DEFAULT_JOINERY_FINISH  =  'Farrow and Ball Ammonite';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Sweep Around the Datum Ring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cumulative Perimeter Distance at Every Section Vertex
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__PerimeterDistances(face) {
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
    function VghLantern__Env3d__InteriorJoinery__MitrePlaneAt(sides, cornerIndex) {
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
    function VghLantern__Env3d__InteriorJoinery__BuildMitredSideSolid(face, side, startPlane, endPlane, datumLevelMm, positions, indices, uvs) {
        const points  =  face.Points;
        const count   =  points.length;
        if (count < 3) return 0;

        const acrossX  =  -side.Outward.x;
        const acrossY  =  -side.Outward.y;
        const alongX   =  side.Direction.x;
        const alongY   =  side.Direction.y;

        const baseIx           =  positions.length / 3;
        const sideLengthWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(side.LengthMm);
        const perimeter        =  VghLantern__Env3d__InteriorJoinery__PerimeterDistances(face);

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


    // SUB FUNCTION | Sweep One Part Around All Four Sides
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__BuildPartMesh(partSection, ring, material, meshName) {
        const positions  =  [];
        const indices    =  [];
        const uvs        =  [];

        let s, f, side, startPlane, endPlane, built;
        built  =  0;

        for (s = 0; s < ring.Sides.length; s++) {
            side  =  ring.Sides[s];
            if (side.LengthMm < MIN_SIDE_LENGTH_MM) continue;

            startPlane  =  VghLantern__Env3d__InteriorJoinery__MitrePlaneAt(ring.Sides, s);
            endPlane    =  VghLantern__Env3d__InteriorJoinery__MitrePlaneAt(ring.Sides, (s + 1) % 4);

            for (f = 0; f < partSection.Faces.length; f++) {
                built  +=  VghLantern__Env3d__InteriorJoinery__BuildMitredSideSolid(
                    partSection.Faces[f], side, startPlane, endPlane,
                    ring.DatumLevelMm, positions, indices, uvs);
            }
        }

        if (built === 0 || indices.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName;
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finish and Material Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Nested Config String
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__ReadField(lantern, blockKey, fieldKey, fallback) {
        const block  =  lantern ? lantern[blockKey] : null;
        const value  =  block ? block[fieldKey] : null;
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Joinery Finish Names for This Lantern
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__FinishNames(lantern) {
        const macro  =  VghLantern__Env3d__InteriorJoinery__ReadField(
            lantern, FINISH_BLOCK, 'Lantern__FinishAndGlazing__Config__JoineryPaintFinish',
            VghLantern__Env3d__InteriorJoinery__ReadField(
                lantern, BARS_BLOCK, 'Lantern__GlazingBars__Config__TrimFinish', DEFAULT_JOINERY_FINISH));

        return {
            Macro   : macro,
            Cornice : VghLantern__Env3d__InteriorJoinery__ReadField(
                lantern, JOINERY_BLOCK, 'Lantern__InteriorJoinery__Config__CorniceFinish', macro),
            Eaves   : VghLantern__Env3d__InteriorJoinery__ReadField(
                lantern, JOINERY_BLOCK, 'Lantern__InteriorJoinery__Config__EavesTrimFinish', macro)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__MaterialForPart(partKey, finishes) {
        if (partKey === 'cornicePacker') return VghLantern__Env3d__MaterialLibrary__Plywood();
        if (partKey === 'cornice')       return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Cornice);
        if (partKey === 'eavesTrim')     return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Eaves);
        return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Macro);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    function VghLantern__Env3d__InteriorJoinery__StampUserData(mesh, part, finishName) {
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

    // FUNCTION | Build the Interior Joinery Assembly Around the Eaves Datum Ring
    // ------------------------------------------------------------
    export async function VghLantern__Env3d__MeshBuilder__InteriorJoineryAssembly__Build(targetGroup, skeleton, lantern) {
        const summary  =  { Parts : [], Warnings : [] };
        if (!targetGroup || !skeleton || !skeleton.Meta) return summary;
        if (skeleton.Meta.IsValid === false) return summary;

        const BaseAssembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        const Assembly      =  window.VghLantern__Geometry__InteriorJoineryAssembly;
        const Loader        =  window.VghLantern__AppData__InteriorJoinerySystemLoader;
        if (!BaseAssembly || !Assembly || !Loader) {
            summary.Warnings.push('Interior joinery assembly modules are not available - joinery not built.');
            return summary;
        }

        const ring  =  BaseAssembly.VghLantern__BaseFrameAssembly__DatumRing(skeleton);
        if (!ring) {
            summary.Warnings.push('No eaves datum ring could be resolved - interior joinery not built.');
            return summary;
        }

        let parts;
        try {
            parts  =  await Loader.VghLantern__InteriorJoinerySystemLoader__ResolveParts(lantern);
        } catch (error) {
            summary.Warnings.push('Interior joinery parts could not be resolved: ' + error.message);
            return summary;
        }
        if (!parts || parts.length === 0) {
            summary.Warnings.push('Interior joinery system resolved no parts.');
            return summary;
        }

        const sections  =  Assembly.VghLantern__InteriorJoineryAssembly__SectionsForPitch(parts, ring.PitchDegrees);
        const finishes  =  VghLantern__Env3d__InteriorJoinery__FinishNames(lantern);

        let p, key, section, material, mesh, i, finishName;

        for (p = 0; p < PART_BUILD_ORDER.length; p++) {
            key      =  PART_BUILD_ORDER[p];
            section  =  null;
            for (i = 0; i < sections.length; i++) {
                if (sections[i] && sections[i].PartKey === key) { section  =  sections[i]; break; }
            }
            if (!section || !section.Faces || section.Faces.length === 0) continue;

            material    =  VghLantern__Env3d__InteriorJoinery__MaterialForPart(key, finishes);
            finishName  =  key === 'cornicePacker' ? ''
                        :  (key === 'cornice' ? finishes.Cornice : finishes.Eaves);

            mesh  =  VghLantern__Env3d__InteriorJoinery__BuildPartMesh(
                section, ring, material, 'VghLantern__Env3d__InteriorJoinery__' + key);
            if (!mesh) continue;

            VghLantern__Env3d__InteriorJoinery__StampUserData(mesh, section, finishName);
            VghLantern__Env3d__PickIndex__RegisterWhole(mesh, 'interiorJoinery', key, {
                PartKey      : section.PartKey,
                PartName     : section.PartName,
                AssetId      : section.AssetId,
                SpecMaterial : section.SpecMaterial,
                PartFinish   : finishName,
                PerimeterMm  : ring.PerimeterMm
            });
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey         : section.PartKey,
                PartName        : section.PartName,
                AssetId         : section.AssetId,
                ElementType     : section.ElementType,
                SpecMaterial    : section.SpecMaterial,
                SectionAreaSqMm : section.SectionAreaSqMm,
                PartFinish      : finishName
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No interior joinery part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion ===================================================================
