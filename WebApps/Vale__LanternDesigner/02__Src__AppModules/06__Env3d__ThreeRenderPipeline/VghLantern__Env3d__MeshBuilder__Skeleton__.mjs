/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - SKELETON
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__Skeleton__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder Skeleton
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn solved skeleton members and glazing bars into 3D meshes
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Consumes the SolvedSkeleton and GlazeBarSet from the geometry brain, groups
     members by role, resolves the profile assigned to each role, and sweeps it.
   - Two modes, chosen by config and by data availability:
       profileSweep  the real authored section, extruded along each centreline
       lines         centrelines only, used as the fallback when a role has no
                     profile assigned yet or the member budget is exceeded
   - Never computes geometry. Every coordinate originates in the SkeletonSolver.

   ---------------------------------------------------------------------------

   ROLE TO PROFILE MAPPING:
   Which lantern config field names the profile for each role is defined once, in
   ProfileIndexLoader. Both this module and Env2d's ProfileTraceRenderer resolve
   through that shared table, so swapping a profile updates the SVG views and the
   3D model from a single edit.

   ROLES THIS MODULE DOES NOT BUILD:
   The base assembly - builders upstand, builders upstand posts, and frame - is a pair of solid
   prisms, not swept sections, so MeshBuilder__BuildersUpstandBox owns it and this module
   skips those roles. 'buildersUpstandReveal' is skipped by every builder: it is the hole
   through the base and exists only as 2D setting-out linework.

   Glazing bars and transoms are skipped too, and for a more interesting reason:
   a Vale glaze bar is not a section at all but an assembly of three of them, so
   it cannot be expressed as one outline swept along a role. MeshBuilder
   GlazeBarComposite owns those two roles entirely.

   The eaves ring is skipped because it is not a part. It is the line where the
   roof plane meets the upstand, and the metal there belongs to the upstand and
   frame below it. It remains in the solved skeleton as the datum everything else
   is set out from, but nothing sweeps it.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__PointToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireString,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__MaterialLibrary__Frame, VghLantern__Env3d__MaterialLibrary__BuildersUpstand, VghLantern__Env3d__MaterialLibrary__SkeletonLine } from './VghLantern__Env3d__MaterialLibrary__.mjs';
import { VghLantern__Env3d__ProfileSweep__BuildMergedMesh, VghLantern__Env3d__ProfileSweep__FallbackOutline } from './VghLantern__Env3d__MeshBuilder__ProfileSweep__.mjs';
import { VghLantern__Env3d__PickIndex__Register, VghLantern__Env3d__PickIndex__ModeTriangle, VghLantern__Env3d__PickIndex__ModeSegment } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Skeleton Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Sweep Modes and Role Grouping
    // ------------------------------------------------------------
    const MODE_LINES            =  'lines';                                  // <-- Centreline only
    const MODE_PROFILE_SWEEP    =  'profileSweep';                           // <-- Real authored section

    const ROLE_BUILDERS_UPSTAND_SET         =  ['buildersUpstand', 'buildersUpstandPost'];                     // <-- Roles that take the builders upstand material

    // The base assembly is extruded as solid prisms by MeshBuilder__BuildersUpstandBox, so
    // its members are construction linework here and must not also be swept -
    // doing both would put a section inside the solid it describes. 'buildersUpstandReveal'
    // is skipped outright: it is the hole through the base, not a member.
    const ROLE_BASE_SOLID_SET   =  ['buildersUpstand', 'buildersUpstandPost', 'frame'];
    const ROLE_ANNOTATION_SET   =  ['buildersUpstandReveal'];

    // Glazing bars and transoms are no longer one swept section. They are the
    // three part Vale glaze bar - cap, core and trim - and MeshBuilder
    // GlazeBarComposite owns them entirely. Sweeping them here as well would put
    // a second section inside the first, and the duplicate would be invisible on
    // screen while doubling every bar in a takeoff.
    const ROLE_GLAZE_BAR_SET    =  ['glazingBar', 'transom'];

    // The eaves ring is not a Vale part. It is where the roof plane meets the
    // upstand, and the metal along that line belongs to the upstand and the
    // frame below it rather than to a section of its own. It was being swept as
    // a member, which put a length of extrusion round the roof that nothing is
    // ordered for and that no drawing shows.
    //
    // The ring stays in the SOLVED SKELETON, because it is the datum every hip,
    // every slope and the whole glaze bar set-out is measured from, and the
    // setting-out view draws it. It is simply never given a section.
    const ROLE_NOT_BUILT_SET    =  ['eaves'];

    const FINISH_BLOCK          =  'Lantern__FinishAndGlazing__Config';      // <-- Frame finish lives here
    const FINISH_FIELD          =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Grouping and Profile Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Role Is Built Elsewhere or Not Built at All
    // ------------------------------------------------------------
    // buildsBaseAsSolid is false only when the base has been left to this module,
    // in which case the builders upstand and frame rings fall through to the normal path.
    function VghLantern__Env3d__SkeletonBuilder__IsExcludedRole(roleKey, buildsBaseAsSolid) {
        if (ROLE_ANNOTATION_SET.indexOf(roleKey) !== -1) return true;
        if (ROLE_GLAZE_BAR_SET.indexOf(roleKey) !== -1) return true;
        if (ROLE_NOT_BUILT_SET.indexOf(roleKey) !== -1) return true;
        return buildsBaseAsSolid && ROLE_BASE_SOLID_SET.indexOf(roleKey) !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Group Members by Their Role
    // ------------------------------------------------------------
    function VghLantern__Env3d__SkeletonBuilder__GroupByRole(memberList, buildsBaseAsSolid) {
        const grouped  =  {};
        if (!Array.isArray(memberList)) return grouped;

        for (let i = 0; i < memberList.length; i++) {
            const member  =  memberList[i];
            if (!member || !member.Role) continue;
            if (VghLantern__Env3d__SkeletonBuilder__IsExcludedRole(member.Role, buildsBaseAsSolid)) continue;
            if (!grouped[member.Role]) grouped[member.Role]  =  [];
            grouped[member.Role].push(member);
        }
        return grouped;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch the Outline Points a Role's Profile Provides
    // ------------------------------------------------------------
    async function VghLantern__Env3d__SkeletonBuilder__OutlineForRole(lantern, roleKey) {
        const ProfileLoader  =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!ProfileLoader) return null;

        try {
            return await ProfileLoader.VghLantern__ProfileIndexLoader__GetOutlineForRole(lantern, roleKey);
        } catch (err) {
            console.warn('[VghLantern Env3d] Profile outline unavailable for role:', roleKey, err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Select the Material for a Role
    // ------------------------------------------------------------
    function VghLantern__Env3d__SkeletonBuilder__MaterialForRole(roleKey, finishName) {
        if (ROLE_BUILDERS_UPSTAND_SET.indexOf(roleKey) !== -1) {
            return VghLantern__Env3d__MaterialLibrary__BuildersUpstand();
        }
        return VghLantern__Env3d__MaterialLibrary__Frame(finishName);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Lantern's Chosen Frame Finish
    // ------------------------------------------------------------
    function VghLantern__Env3d__SkeletonBuilder__FinishName(lantern) {
        if (!lantern) return '';

        const block  =  lantern[FINISH_BLOCK];
        return block ? (block[FINISH_FIELD] || '') : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Line Mode Fallback
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build a Line Segments Object for a Set of Members
    // ------------------------------------------------------------
    // Every member contributes exactly one segment whether or not it is degenerate,
    // so segment ordinal and member index stay in step and the pick spans below are
    // a straight one to one.
    function VghLantern__Env3d__SkeletonBuilder__BuildLines(memberList, roleKey, objectName) {
        if (!Array.isArray(memberList) || memberList.length === 0) return null;

        const positions  =  new Float32Array(memberList.length * 6);
        const spans      =  [];
        let cursor       =  0;

        for (let i = 0; i < memberList.length; i++) {
            const startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(memberList[i].Start);
            const endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(memberList[i].End);

            positions[cursor++]  =  startWorld.x;
            positions[cursor++]  =  startWorld.y;
            positions[cursor++]  =  startWorld.z;
            positions[cursor++]  =  endWorld.x;
            positions[cursor++]  =  endWorld.y;
            positions[cursor++]  =  endWorld.z;

            spans.push({ Record : memberList[i], SpanStart : i, SpanCount : 1 });
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const lines  =  new THREE.LineSegments(geometry, VghLantern__Env3d__MaterialLibrary__SkeletonLine());
        lines.name   =  objectName || 'VghLantern__Env3d__SkeletonLines';

        VghLantern__Env3d__PickIndex__Register(lines, 'member', roleKey, spans, VghLantern__Env3d__PickIndex__ModeSegment);
        return lines;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Skeleton Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Objects for One Role Group
    // ------------------------------------------------------------
    async function VghLantern__Env3d__SkeletonBuilder__BuildRole(roleKey, memberList, lantern) {
        const wantsSweep  =  VghLantern__Env3d__ConfigAccess__RequireString('MeshBuilders', 'SkeletonMode') !== MODE_LINES;
        const budget      =  VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'MaxSweptMembers');
        const withinBudget =  memberList.length <= budget;

        if (wantsSweep && withinBudget) {
            let outline  =  await VghLantern__Env3d__SkeletonBuilder__OutlineForRole(lantern, roleKey);

            // No authored profile yet: sweep a plain rectangular section so the
            // member still reads as solid rather than vanishing from the model.
            if (!outline && VghLantern__Env3d__ConfigAccess__RequireBoolean('MeshBuilders', 'PlaceholderSectionOnMissingProfile')) {
                outline  =  VghLantern__Env3d__ProfileSweep__FallbackOutline(null, null);
            }

            if (outline) {
                const material  =  VghLantern__Env3d__SkeletonBuilder__MaterialForRole(roleKey, VghLantern__Env3d__SkeletonBuilder__FinishName(lantern));
                const spans     =  [];
                const mesh      =  VghLantern__Env3d__ProfileSweep__BuildMergedMesh(
                    outline, memberList, material,
                    'VghLantern__Env3d__Members__' + roleKey,
                    spans                                                     // <-- Filled with one triangle span per built member
                );
                if (mesh) {
                    VghLantern__Env3d__PickIndex__Register(mesh, 'member', roleKey, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
                    return mesh;
                }
            }
        }

        return VghLantern__Env3d__SkeletonBuilder__BuildLines(memberList, roleKey, 'VghLantern__Env3d__MemberLines__' + roleKey);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extend Hip Members Down to the Glaze Bar Cap Ends
    // ------------------------------------------------------------
    // The solved hip stops on the eaves datum corner, but the glaze bar caps
    // beside it run the cap extension along the pitch past the datum - so an
    // unextended hip nose floats short of the roof edge. Each hip's lower end
    // is slid down its own axis until it reaches the LEVEL of the cap ends
    // (datum minus extension x sin(pitch)), which by the roof plane geometry
    // also lands it on the extended eaves line. Solved members are not
    // mutated; extended copies are swept. Set-out and takeoff keep the datum
    // hip lengths.
    function VghLantern__Env3d__SkeletonBuilder__ExtendHips(members, skeleton) {
        const Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        const meta      =  skeleton.Meta || {};
        const pitchDeg  =  Number(meta.PitchDegrees);
        if (!Assembly || !isFinite(pitchDeg)) return members;

        const extensionMm  =  Number(Assembly.VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarCapExtensionAlongPitchMm) || 0;
        if (extensionMm <= 0) return members;

        const targetDropMm  =  extensionMm * Math.sin(pitchDeg * (Math.PI / 180));

        return members.map(function(member) {
            if (!member || member.Role !== 'hip') return member;

            const lowKey  =  member.Start.z <= member.End.z ? 'Start' : 'End';
            const low     =  member[lowKey];
            const high    =  lowKey === 'Start' ? member.End : member.Start;
            const dropMm  =  Math.abs(high.z - low.z);
            const length  =  Number(member.LengthMm) || 0;
            if (dropMm <= 0 || length <= 0) return member;

            const scale     =  (targetDropMm * (length / dropMm)) / length;   // <-- Along-hip extension as a fraction of the member
            const extended  =  {
                Id       : member.Id,
                Role     : member.Role,
                LengthMm : length * (1 + scale),
                Start    : member.Start,
                End      : member.End
            };
            extended[lowKey]  =  {
                x : low.x + ((low.x - high.x) * scale),
                y : low.y + ((low.y - high.y) * scale),
                z : low.z + ((low.z - high.z) * scale)
            };
            return extended;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Every Structural Member Into the Skeleton Group
    // ------------------------------------------------------------
    export async function VghLantern__Env3d__MeshBuilder__Skeleton__Build(targetGroup, skeleton, barSet, lantern) {
        if (!targetGroup || !skeleton) return;

        const members  =  VghLantern__Env3d__SkeletonBuilder__ExtendHips((skeleton.Members || []).slice(), skeleton);

        // Glazing bars and transoms are members for meshing purposes, even though
        // the geometry brain solves them in a separate pass.
        if (barSet && Array.isArray(barSet.Bars)) {
            for (let i = 0; i < barSet.Bars.length; i++) members.push(barSet.Bars[i]);
        }

        const buildBaseAsSolid  =  VghLantern__Env3d__ConfigAccess__RequireBoolean('MeshBuilders', 'BuildBaseAsSolid');
        const grouped  =  VghLantern__Env3d__SkeletonBuilder__GroupByRole(members, buildBaseAsSolid);
        const roles    =  Object.keys(grouped);

        for (let i = 0; i < roles.length; i++) {
            const object3d  =  await VghLantern__Env3d__SkeletonBuilder__BuildRole(roles[i], grouped[roles[i]], lantern);
            if (object3d) targetGroup.add(object3d);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Sweep Mode That Would Be Used
    // ------------------------------------------------------------
    // Surfaced by the 3D controls so the user can see whether they are looking at
    // real sections or the line fallback.
    export function VghLantern__Env3d__MeshBuilder__Skeleton__ActiveMode() {
        return VghLantern__Env3d__ConfigAccess__RequireString('MeshBuilders', 'SkeletonMode') === MODE_LINES
            ? MODE_LINES
            : MODE_PROFILE_SWEEP;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
