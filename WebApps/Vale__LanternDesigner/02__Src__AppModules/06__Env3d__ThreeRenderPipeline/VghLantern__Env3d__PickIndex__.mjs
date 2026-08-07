/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | PICK INDEX
   =============================================================================

   FILE       : VghLantern__Env3d__PickIndex__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - PickIndex
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Map a raycast hit back to the single model object under the cursor
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The mesh builders merge every member of a role into ONE mesh, because that is
     what keeps a 60 bar lantern at one draw call rather than sixty. A raycast
     against that mesh therefore reports 'the glazing bars', not 'bar 7'.
   - This module closes that gap. Each builder registers a pick table describing
     which span of the merged buffer belongs to which source record, and this
     module binary searches that table to name the individual instance.
   - Registration is factual only. A pick table carries the solver record itself,
     never a label or a formatted number - naming and stats belong to InspectStats,
     which composes them at hover time from live config.

   ---------------------------------------------------------------------------

   SPAN UNITS BY INDEX MODE:
       triangle   merged swept sections and glazing, span measured in triangles,
                  probed with the raycast faceIndex
       segment    line mode fallback members, span measured in line segments,
                  probed with the raycast vertex index halved
       whole      the object is one instance in its own right - a base prism or a
                  placed GLB component - and needs no span at all

   WHY THE TABLE LIVES ON THE OBJECT:
   Held in userData rather than in a module-level registry, so a pick table dies
   with the mesh it describes. Clearing a model group cannot leave a stale index
   behind, because there is no index to go stale.

   WHY RESOLVE CHECKS VISIBILITY ITSELF:
   Three's raycaster tests geometry with no regard to .visible at any level - an
   element view or a display mode that hides a layer does not stop a ray finding
   it. Left unchecked, a reviewer could hover a member the viewport is not even
   drawing. Resolve is the one place every pick passes through, so it is the one
   place that needs to know.

   ============================================================================= */

import {
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import { VghLantern__Env3d__SceneGroupSet__Solid3d } from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Pick Index Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Table Key and Span Index Modes
    // ------------------------------------------------------------
    const PICK_TABLE_KEY     =  'VghLantern__PickTable';                     // <-- userData field holding a registered table
    const VERTICES_PER_LINE  =  2;                                           // <-- A LineSegments segment is two vertices

    export const VghLantern__Env3d__PickIndex__ModeTriangle  =  'triangle';  // <-- Probe with faceIndex
    export const VghLantern__Env3d__PickIndex__ModeSegment   =  'segment';   // <-- Probe with vertex index / 2
    export const VghLantern__Env3d__PickIndex__ModeWhole     =  'whole';     // <-- One object, one instance
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Category Keys and Their Config Gates
    // ------------------------------------------------------------
    // Each pickable class of object can be switched off independently in the
    // HoverInspector config block. A disabled category is never registered at all,
    // so it costs nothing at raycast time rather than being filtered later.
    const CATEGORY_ENABLE_FIELDS  =  {
        member           : 'PickMembers',                                    // <-- Swept or line-drawn structural members
        glazing          : 'PickGlazing',                                    // <-- Solved glazing faces
        base             : 'PickBase',                                       // <-- Builders upstand and base frame prisms
        component        : 'PickComponents',                                 // <-- Placed GLB finials, bases, cresting
        interiorJoinery  : 'PickInteriorJoinery'                             // <-- Cornice, packer and eaves trim ring
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether a Pickable Category Is Enabled by Config
    // ------------------------------------------------------------
    export function VghLantern__Env3d__PickIndex__IsCategoryEnabled(categoryKey) {
        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('HoverInspector', 'Enabled')) return false;

        const field  =  CATEGORY_ENABLE_FIELDS[categoryKey];
        if (!field) return false;                                            // <-- Unknown category is never pickable

        return VghLantern__Env3d__ConfigAccess__RequireBoolean('HoverInspector', field);
    }
    // ------------------------------------------------------------


    // FUNCTION | Register a Pick Table Onto a Built Object
    // ------------------------------------------------------------
    // entries are { Record, SpanStart, SpanCount } in ascending SpanStart order.
    // Whole-object registrations pass a single entry and may omit both spans.
    // Returns the object so a builder can register inline as it adds to a group.
    export function VghLantern__Env3d__PickIndex__Register(object3d, categoryKey, roleKey, entries, indexMode) {
        if (!object3d || !Array.isArray(entries) || entries.length === 0) return object3d;
        if (!VghLantern__Env3d__PickIndex__IsCategoryEnabled(categoryKey))   return object3d;

        object3d.userData[PICK_TABLE_KEY]  =  {
            CategoryKey : categoryKey,
            RoleKey     : roleKey || '',
            IndexMode   : indexMode || VghLantern__Env3d__PickIndex__ModeWhole,
            Entries     : entries
        };

        return object3d;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Pick Table Registered on an Object
    // ------------------------------------------------------------
    // The one published way to reach a table, so the userData key stays a private
    // detail of this module rather than a string repeated across the environment.
    export function VghLantern__Env3d__PickIndex__TableOf(object3d) {
        if (!object3d || !object3d.userData) return null;
        return object3d.userData[PICK_TABLE_KEY] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register a Single Whole Object as One Instance
    // ------------------------------------------------------------
    // The convenience form for base prisms and placed components, which are their
    // own object and need no span table.
    export function VghLantern__Env3d__PickIndex__RegisterWhole(object3d, categoryKey, roleKey, record) {
        return VghLantern__Env3d__PickIndex__Register(
            object3d, categoryKey, roleKey,
            [{ Record : record, SpanStart : 0, SpanCount : 1 }],
            VghLantern__Env3d__PickIndex__ModeWhole
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hit Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Whether an Object Sits Entirely Inside Visible Ancestors
    // ------------------------------------------------------------
    // The renderer skips a whole subtree the moment one ancestor is invisible, but
    // the raycaster does not - intersectObjects tests geometry with no regard to
    // .visible at any level. Element view and display mode both hide layers by
    // toggling .visible somewhere in the graph - one on the element mesh itself,
    // the other on the solid group above it - so one upward walk covers both
    // without this module needing to know either exists.
    export function VghLantern__Env3d__PickIndex__IsVisible(node) {
        let current  =  node;

        while (current) {
            if (current.visible === false) return false;
            current  =  current.parent;
        }
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Walk up From a Hit Object to the Nearest Pick Table
    // ------------------------------------------------------------
    // A GLB component arrives as a Group of meshes, so the ray hits a child while
    // the table sits on the placed instance above it.
    function VghLantern__Env3d__PickIndex__FindTableOwner(object3d) {
        let node  =  object3d;

        while (node) {
            if (node.userData && node.userData[PICK_TABLE_KEY]) return node;
            node  =  node.parent;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Raycast Hit Into a Span Probe Value
    // ------------------------------------------------------------
    function VghLantern__Env3d__PickIndex__ProbeValue(table, intersection) {
        if (table.IndexMode === VghLantern__Env3d__PickIndex__ModeWhole)   return 0;

        if (table.IndexMode === VghLantern__Env3d__PickIndex__ModeSegment) {
            const vertexIndex  =  Number(intersection.index);
            if (!isFinite(vertexIndex)) return -1;
            return Math.floor(vertexIndex / VERTICES_PER_LINE);
        }

        const faceIndex  =  Number(intersection.faceIndex);
        return isFinite(faceIndex) ? faceIndex : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Binary Search the Span Table for a Probe Value
    // ------------------------------------------------------------
    // Spans are contiguous and ascending by construction, which is what allows the
    // search rather than a scan. A 900 bar model resolves in ten comparisons.
    function VghLantern__Env3d__PickIndex__SearchSpans(entries, probe) {
        let low   =  0;
        let high  =  entries.length - 1;

        while (low <= high) {
            const mid    =  (low + high) >> 1;
            const entry  =  entries[mid];
            const start  =  Number(entry.SpanStart) || 0;
            const count  =  Number(entry.SpanCount) || 0;

            if (probe < start)              high  =  mid - 1;
            else if (probe >= start + count) low   =  mid + 1;
            else                             return mid;
        }
        return -1;                                                           // <-- Hit fell outside every registered span
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Raycast Intersection to a Single Model Instance
    // ------------------------------------------------------------
    // Returns null when the hit object carries no pick table, which is how the
    // ground grid and the highlight overlay stay unpickable without a filter list.
    export function VghLantern__Env3d__PickIndex__Resolve(intersection) {
        if (!intersection || !intersection.object) return null;
        if (!VghLantern__Env3d__PickIndex__IsVisible(intersection.object)) return null;

        const owner  =  VghLantern__Env3d__PickIndex__FindTableOwner(intersection.object);
        if (!owner) return null;

        const table  =  owner.userData[PICK_TABLE_KEY];
        const probe  =  VghLantern__Env3d__PickIndex__ProbeValue(table, intersection);
        if (probe < 0) return null;

        const entryIndex  =  (table.IndexMode === VghLantern__Env3d__PickIndex__ModeWhole)
            ? 0
            : VghLantern__Env3d__PickIndex__SearchSpans(table.Entries, probe);
        if (entryIndex === -1) return null;

        const entry  =  table.Entries[entryIndex];

        return {
            Object3d     : owner,                                            // <-- The object carrying the table
            HitObject    : intersection.object,                              // <-- The mesh the ray actually struck
            CategoryKey  : table.CategoryKey,
            RoleKey      : table.RoleKey,
            IndexMode    : table.IndexMode,
            EntryIndex   : entryIndex,
            EntryCount   : table.Entries.length,
            Record       : entry.Record,
            SpanStart    : Number(entry.SpanStart) || 0,
            SpanCount    : Number(entry.SpanCount) || 0
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Identity Keys and Raycast Roots
// -----------------------------------------------------------------------------

    // FUNCTION | Stable Key for the Set a Pick Belongs To
    // ------------------------------------------------------------
    export function VghLantern__Env3d__PickIndex__SetKey(pick) {
        if (!pick) return '';
        return pick.CategoryKey + ':' + pick.RoleKey + ':' + pick.Object3d.id;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stable Key for the Individual Instance a Pick Names
    // ------------------------------------------------------------
    // Compared frame to frame so the highlight and the panel only rebuild when the
    // cursor actually crosses onto a different member.
    export function VghLantern__Env3d__PickIndex__InstanceKey(pick) {
        if (!pick) return '';
        return VghLantern__Env3d__PickIndex__SetKey(pick) + '#' + pick.EntryIndex;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Groups a Surface Should Raycast Against
    // ------------------------------------------------------------
    // Deliberately excludes helpers, which holds the light rig and the ground grid,
    // and highlight, which holds this feature's own overlay meshes.
    export function VghLantern__Env3d__PickIndex__RaycastRoots(surface) {
        if (!surface || !surface.Groups) return [];

        const roots  =  [];

        for (let i = 0; i < VghLantern__Env3d__SceneGroupSet__Solid3d.length; i++) {
            const group  =  surface.Groups[VghLantern__Env3d__SceneGroupSet__Solid3d[i]];
            if (group) roots.push(group);
        }
        return roots;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
