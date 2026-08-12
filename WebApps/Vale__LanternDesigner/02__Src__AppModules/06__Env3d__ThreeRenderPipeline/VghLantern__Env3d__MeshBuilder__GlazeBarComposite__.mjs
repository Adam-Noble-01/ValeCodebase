/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - GLAZE BAR COMPOSITE
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__GlazeBarComposite__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder GlazeBarComposite
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the real Vale three-part glaze bar along every bar datum
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - A Vale roof glaze bar is not one section. It is three parts sharing one
     datum, and the model now says so:

         Glaze Bar Cap    45_1021   powder coated aluminium, the decorative
                                    outer capping seen from outside the roof
         Glaze Bar Core   45_1011   mill finish aluminium, the concealed
                                    structural extrusion carrying the glass
         Glaze Bar Trim   45_1031   Douglas fir, the internal decorative
                          /1032     moulding seen from inside the room, in
                          /1033     45, 70 or 90 mm depth

   - Each part is extruded from its own authored cross-section along every bar
     datum the GlazeBarLayout produced, and lands in its own merged mesh. Three
     meshes rather than one is the whole point: each part is separately
     pickable, separately isolatable by element type, and separately countable.
   - Cap and trim are separately FINISHED too, each from its own palette and each
     stored on the lantern's glazing bars block. They face opposite ways - the cap
     out at the garden, the trim in at the room - so they are never one decision.
     The core takes no finish because it is never seen once the other two are on.

   ---------------------------------------------------------------------------

   WHERE THE EXTRUDER LIVES

   The manifold solid construction this module was built around now lives in
   MeshBuilder__SectionSolid, because the ridge and the hip need the identical
   thing and a second copy of it would have been the start of three of them.
   What moved is the arithmetic and none of the reasoning: it still assembles a
   closed solid by hand rather than reaching for ExtrudeGeometry, still for the
   reason that these solids get cut and a boolean against an unwelded shell
   either fails outright or silently returns the wrong volume.

   ---------------------------------------------------------------------------

   SECTION FRAME AND THE DATUM

   All five assets are authored in one shared section frame, taken from the Top
   Plan view of a bar modelled running vertically:

       section +x  ->  across the bar
       section +y  ->  out through the roof: cap above, trim below
       section  0  ->  the glaze bar datum marked on the Vale anatomy drawing

   Because the frame is shared, the three parts assemble with no fitting: their
   solid areas do not overlap anywhere, which is checked rather than assumed.

   The datum is placed ON the skeleton polyline, so the cap stands proud of the
   setting-out line and the trim hangs inside it. SECTION_DATUM_OFFSET_MM shifts
   the whole composite along section +y if that convention ever has to move.

   ---------------------------------------------------------------------------

   EAVES END TREATMENTS (the Vale abutment detail)

   At the eaves end of every glazing bar the three parts terminate differently,
   driven by VghLantern__Geometry__BaseFrameAssembly and the base frame system
   index:

       core   extends 42.5mm ALONG THE PITCH past the eaves datum, square cut,
              landing on the eaves extrusion it is welded to
       cap    extends 170mm along the pitch past the datum, square cut, the
              visible overhang throwing water clear
       trim   stops SHORT of the datum with a clean vertical PLUMB CUT whose
              plane sits 18mm horizontally inboard of the datum point - the
              real joinery cut, so the cutting list lengths are honest

   The bar records carry the datum polyline; the adjustments are applied here
   per part at build time. Bars with no eaves end (transoms) are untouched.

   KNOWN LIMITATION - RIDGE AND HIP END CUTS

   The UPPER end of a bar is still extruded square across its own axis. Where a
   bar meets a hip or the ridge the true cut is a compound mitre; the shared
   extruder takes an arbitrary end plane per end, so adding those mitres is a
   matter of telling it which plane to use, not of rebuilding. The hip and ridge
   assemblies now publish exactly those planes for their own end cuts, which is
   half the answer already sitting there.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__MillAluminium,
    VghLantern__Env3d__MaterialLibrary__GlazeBarCap,
    VghLantern__Env3d__MaterialLibrary__GlazeBarTrim
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__SectionSolid__Build,
    VghLantern__Env3d__SectionSolid__PlaneToWorld
} from './VghLantern__Env3d__MeshBuilder__SectionSolid__.mjs';

import {
    VghLantern__Env3d__PickIndex__Register,
    VghLantern__Env3d__PickIndex__ModeTriangle
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Glaze Bar Composite Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Section Placement and Geometry Guards
    // ------------------------------------------------------------
    const SECTION_DATUM_OFFSET_MM  =  0;                                     // <-- Section y=0 sits on the skeleton polyline
    const MIN_MEMBER_LENGTH_MM     =  0.5;                                   // <-- Below this a bar is degenerate
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Element Type Vocabulary
    // ------------------------------------------------------------
    // Mirrors Na__Asset__ValeSpec__ElementType in the asset files. Stamped onto
    // every mesh's userData so the 3D isolation toggle and the downstream
    // specification tables classify from one shared vocabulary rather than each
    // keeping its own list of what counts as structure.
    export const VghLantern__Env3d__ElementType  =  {
        Structural : 'Structural',
        Trim       : 'Trim',
        ByOthers   : 'By Others',
        Flashing   : 'Flashing',
        Glazing    : 'Glazing'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Three Parts of a Bar
    // ------------------------------------------------------------
    // PartKey matches the slot names published by the GlazeBarSystemLoader.
    const PART_CORE  =  'core';
    const PART_CAP   =  'cap';
    const PART_TRIM  =  'trim';

    const PART_ORDER  =  [PART_CORE, PART_CAP, PART_TRIM];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifold Solid Construction
// -----------------------------------------------------------------------------

    // NOTE | The Extruder Moved to MeshBuilder__SectionSolid
    // ------------------------------------------------------------
    // MemberBasis, PerimeterDistances, BuildSolid and PlaneToWorld used to live
    // here. They are the same construction the ridge and the hip need, so they
    // now live in one shared module and this one imports them. The section frame
    // convention they rely on - +x across the member, +y out through the roof,
    // 0,0 on the datum polyline - is documented there and is shared by every
    // Vale section, which is exactly why one extruder can serve all of them.
    //
    // SECTION_DATUM_OFFSET_MM is passed through to that extruder unchanged, so
    // moving the glaze bar datum convention is still a one line edit here.
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Eaves End Treatment for One Bar of One Part
    // ------------------------------------------------------------
    // Answers { StartMm, EndMm, Planes } for the bar as the given part runs it:
    // core and cap get their datum foot pushed down the slope by the interface
    // extension (square cut), the trim keeps the datum polyline but takes the
    // vertical plumb plane at its eaves end. Bars with no eaves end - and any
    // build where the geometry module is absent - pass through untouched.
    function VghLantern__Env3d__GlazeBarComposite__EavesTreatment(partKey, bar) {
        const untouched  =  { StartMm : bar.Start, EndMm : bar.End, Planes : null };

        const Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        if (!Assembly) return untouched;
        if (bar.EavesEnd !== 'start' && bar.EavesEnd !== 'end') return untouched;

        if (partKey === PART_CORE || partKey === PART_CAP) {
            const iface      =  Assembly.VghLantern__BaseFrameAssembly__EavesInterface();
            const extension  =  partKey === PART_CORE
                ? iface.GlazeBarCoreExtensionAlongPitchMm
                : iface.GlazeBarCapExtensionAlongPitchMm;

            const extended  =  Assembly.VghLantern__BaseFrameAssembly__ExtendedEavesPoint(bar, undefined, extension);
            if (!extended) return untouched;

            return {
                StartMm : extended.EndKey === 'start' ? extended.Point : bar.Start,
                EndMm   : extended.EndKey === 'end'   ? extended.Point : bar.End,
                Planes  : null
            };
        }

        if (partKey === PART_TRIM) {
            const planeMm  =  Assembly.VghLantern__BaseFrameAssembly__TrimPlumbPlane(bar, undefined);
            if (!planeMm) return untouched;

            const planeWorld  =  VghLantern__Env3d__SectionSolid__PlaneToWorld(planeMm);
            return {
                StartMm : bar.Start,
                EndMm   : bar.End,
                Planes  : {
                    Start : bar.EavesEnd === 'start' ? planeWorld : null,
                    End   : bar.EavesEnd === 'end'   ? planeWorld : null
                }
            };
        }

        return untouched;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Extrude One Part Along Every Bar and Merge the Result
    // ------------------------------------------------------------
    // One buffer for the whole part rather than one mesh per bar. A divided
    // lantern carries dozens of bars and three parts each, so per-bar meshes
    // would put the draw call count into the hundreds for geometry that shares a
    // single material.
    //
    // memberSpansOut is filled with the triangle span each bar occupies, which is
    // what lets a raycast hit on the merged buffer still name the individual bar
    // it landed on.
    function VghLantern__Env3d__GlazeBarComposite__BuildPartMesh(partKey, faces, bars, material, meshName, memberSpansOut) {
        const positions  =  [];
        const indices    =  [];
        const uvs        =  [];
        const minLength  =  VghLantern__Env3d__ConfigAccess__MmToWorld(MIN_MEMBER_LENGTH_MM);

        let b, f, bar, treatment, startWorld, endWorld, startVec, endVec, triangleCursor, spanCount;
        triangleCursor  =  0;

        for (b = 0; b < bars.length; b++) {
            bar        =  bars[b];
            treatment  =  VghLantern__Env3d__GlazeBarComposite__EavesTreatment(partKey, bar);

            startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(treatment.StartMm);
            endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(treatment.EndMm);
            startVec    =  new THREE.Vector3(startWorld.x, startWorld.y, startWorld.z);
            endVec      =  new THREE.Vector3(endWorld.x,   endWorld.y,   endWorld.z);

            if (startVec.distanceTo(endVec) < minLength) continue;            // <-- Degenerate bar, absent from the buffer and from the spans

            spanCount  =  0;
            for (f = 0; f < faces.length; f++) {
                spanCount  +=  VghLantern__Env3d__SectionSolid__Build(faces[f], startVec, endVec, positions, indices, uvs, treatment.Planes, SECTION_DATUM_OFFSET_MM);
            }
            if (spanCount === 0) continue;

            if (Array.isArray(memberSpansOut)) {
                memberSpansOut.push({ Record : bar, SpanStart : triangleCursor, SpanCount : spanCount });
            }
            triangleCursor  +=  spanCount;
        }

        if (indices.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));       // <-- U across the section, V along the bar, both in world units
        geometry.setIndex(indices);
        geometry.computeVertexNormals();                                      // <-- Smooth normals; the part materials shade flat, so hard arrises survive
        geometry.computeBoundingSphere();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName;
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Definition and Materials
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    // Two of the three parts are finished, and they are finished separately,
    // because they face opposite ways. The cap is the external capping seen from
    // the garden and is powder coated; the trim is the internal moulding seen from
    // the room and is either bare douglas fir or painted joinery. The core between
    // them takes no finish at all, because once the other two are on it is never
    // seen and is left as bare mill extrusion.
    //
    // The cap does not follow the frame finish, which is what it used to do. The
    // frame is painted joinery and the outside of the roof is dressed in lead
    // flashing, so what the frame is painted says nothing about the capping.
    function VghLantern__Env3d__GlazeBarComposite__MaterialForPart(partKey, finishes) {
        if (partKey === PART_CAP)  return VghLantern__Env3d__MaterialLibrary__GlazeBarCap(finishes.Cap);
        if (partKey === PART_TRIM) return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Trim);
        return VghLantern__Env3d__MaterialLibrary__MillAluminium();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name the Finish a Part Was Built In
    // ------------------------------------------------------------
    // The same branch the material lookup takes, answered as a name so the hover
    // inspector can quote it. Empty for the core, which carries no finish.
    function VghLantern__Env3d__GlazeBarComposite__FinishForPart(partKey, finishes) {
        if (partKey === PART_CAP)  return finishes.Cap;
        if (partKey === PART_TRIM) return finishes.Trim;
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    // Everything downstream reads the part from here rather than parsing the mesh
    // name: the isolation toggle filters on ElementType, the hover inspector
    // labels from PartName, and a takeoff can total SectionAreaSqMm against bar
    // length without going back to the asset file.
    function VghLantern__Env3d__GlazeBarComposite__StampUserData(mesh, part, finishName) {
        mesh.userData.VghLantern__PartKey         =  part.PartKey;
        mesh.userData.VghLantern__PartName        =  part.PartName;
        mesh.userData.VghLantern__AssetId         =  part.AssetId;
        mesh.userData.VghLantern__ElementType     =  part.ElementType;
        mesh.userData.VghLantern__SpecMaterial    =  part.SpecMaterial;
        mesh.userData.VghLantern__SectionAreaSqMm =  part.SectionAreaSqMm;

        // The chosen finish, empty on the core because a concealed extrusion has
        // none. SpecMaterial says what the part is MADE of and this says how it is
        // finished, which on a painted trim are two different answers: douglas fir,
        // in Railings eggshell.
        mesh.userData.VghLantern__PartFinish      =  finishName || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build Every Glaze Bar in the Set as a Three Part Composite
    // ------------------------------------------------------------
    // Returns a summary the takeoff and the warning system can read without
    // touching the scene graph. A missing system index is reported and yields an
    // empty summary rather than throwing: a lantern that cannot draw its bars
    // must still draw everything else.
    export async function VghLantern__Env3d__MeshBuilder__GlazeBarComposite__Build(targetGroup, barSet, lantern) {
        const summary  =  { Parts : [], BarCount : 0, Warnings : [] };
        if (!targetGroup || !barSet || !Array.isArray(barSet.Bars) || barSet.Bars.length === 0) return summary;

        const Loader  =  window.VghLantern__AppData__GlazeBarSystemLoader;
        if (!Loader) {
            summary.Warnings.push('Glaze bar system loader is not available - no bars built.');
            return summary;
        }

        let parts;
        try {
            parts  =  await Loader.VghLantern__GlazeBarSystemLoader__ResolveParts(lantern);
        } catch (error) {
            summary.Warnings.push('Glaze bar parts could not be resolved: ' + error.message);
            return summary;
        }

        if (!parts || parts.length === 0) {
            summary.Warnings.push('Glaze bar system resolved no parts.');
            return summary;
        }

        const bars        =  barSet.Bars;
        const finishes    =  VghLantern__Env3d__GlazeBarComposite__BarFinishes(lantern);
        summary.BarCount  =  bars.length;

        let p, part, material, spans, mesh;

        for (p = 0; p < PART_ORDER.length; p++) {
            part  =  VghLantern__Env3d__GlazeBarComposite__FindPart(parts, PART_ORDER[p]);
            if (!part || !part.Faces || part.Faces.length === 0) continue;

            material  =  VghLantern__Env3d__GlazeBarComposite__MaterialForPart(part.PartKey, finishes);
            spans     =  [];
            mesh      =  VghLantern__Env3d__GlazeBarComposite__BuildPartMesh(
                part.PartKey, part.Faces, bars, material,
                'VghLantern__Env3d__GlazeBar__' + part.PartKey,
                spans
            );
            if (!mesh) continue;

            VghLantern__Env3d__GlazeBarComposite__StampUserData(mesh, part,
                VghLantern__Env3d__GlazeBarComposite__FinishForPart(part.PartKey, finishes));
            VghLantern__Env3d__PickIndex__Register(mesh, 'member', 'glazeBar__' + part.PartKey, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                SpecMaterial     : part.SpecMaterial,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                BuiltBarCount    : spans.length
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No glaze bar part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Resolved Part by Its Slot Key
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazeBarComposite__FindPart(parts, partKey) {
        let i;
        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Two Finishes the Bar Is Specified With
    // ------------------------------------------------------------
    // Both live in the glazing bars block alongside the trim depth, because they
    // are decisions about the bar rather than about the lantern around it.
    //
    // An empty name is passed straight through rather than substituted here. The
    // material library answers an unknown finish with its documented neutral
    // fallback, which deliberately matches no real product - so a project that
    // somehow reached the renderer without being normalised shows as wrong rather
    // than as a plausible bar in the wrong colour.
    function VghLantern__Env3d__GlazeBarComposite__BarFinishes(lantern) {
        const block  =  lantern ? lantern['Lantern__GlazingBars__Config'] : null;
        if (!block) return { Cap : '', Trim : '' };

        return {
            Cap  : block['Lantern__GlazingBars__Config__CapFinish']  || '',
            Trim : block['Lantern__GlazingBars__Config__TrimFinish'] || ''
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
