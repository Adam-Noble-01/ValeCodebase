/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | HIGHLIGHT LAYER
   =============================================================================

   FILE       : VghLantern__Env3d__HighlightLayer__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - HighlightLayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Isolate one model object visually without hiding the rest
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The visual half of the hover inspector. Given a resolved pick, it reads the
     model down into three tiers so the object under the cursor is unmistakable
     while the lantern around it still reads as a lantern.
   - Three tiers, deliberately:
       instance   the single member under the cursor, full accent
       siblings   every other member of the same role, mid accent
       ghost      everything else, faded back but still drawn
   - Owns no geometry of its own beyond the instance overlay, which is sliced
     straight out of the merged buffer it sits on and lives in the surface's
     'highlight' group until the next hover change.

   ---------------------------------------------------------------------------

   WHY MATERIAL SWAPPING RATHER THAN A SECOND SCENE:
   Every model mesh already carries a shared library material. Swapping the
   reference and remembering the original is a pointer assignment per mesh, where
   a second scene or a render pass would mean duplicating geometry on every hover
   move. Restoring is exact because the originals are library-owned and never
   disposed between hovers.

   WHY THE INSTANCE IS A SLICE, NOT A RE-SWEEP:
   Re-sweeping the hovered member would need its profile outline, which is an
   async load. The merged buffer already holds the exact triangles, so copying
   that span is both synchronous and guaranteed to match what is on screen to the
   vertex.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__MaterialLibrary__Ghost,
    VghLantern__Env3d__MaterialLibrary__GhostGlazing,
    VghLantern__Env3d__MaterialLibrary__HighlightSibling,
    VghLantern__Env3d__MaterialLibrary__HighlightInstance,
    VghLantern__Env3d__MaterialLibrary__HighlightGlazing,
    VghLantern__Env3d__MaterialLibrary__HighlightLine
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import { VghLantern__Env3d__PickIndex__ModeSegment, VghLantern__Env3d__PickIndex__ModeWhole } from './VghLantern__Env3d__PickIndex__.mjs';
import {
    VghLantern__Env3d__SceneManager__ClearGroup,
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneGroup,
    VghLantern__Env3d__SceneGroupSet__Solid3d
} from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Highlight Layer Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Group Names and Overlay Identity
    // ------------------------------------------------------------
    const GROUP_HIGHLIGHT     =  VghLantern__Env3d__SceneGroup.Overlay__Highlight;   // <-- Holds the instance overlay only
    const GROUP_GLAZING       =  VghLantern__Env3d__SceneGroup.Solid3d__Glazing;     // <-- Ghosted with the translucent variant
    const TIER_GROUP_NAMES    =  VghLantern__Env3d__SceneGroupSet__Solid3d;          // <-- The solid model, in the order it is drawn

    const OVERLAY_NAME        =  'VghLantern__Env3d__HighlightInstance';
    const OVERLAY_RENDER_ORDER =  2;                                         // <-- Above the glazing pass at render order 1
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Buffer Span Arithmetic
    // ------------------------------------------------------------
    const FLOATS_PER_VERTEX   =  3;                                          // <-- Position and normal are both vec3
    const VERTICES_PER_FACE   =  3;                                          // <-- Merged buffers are non-indexed triangles
    const VERTICES_PER_LINE   =  2;                                          // <-- Line mode members are one segment each
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tier Assignment Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Node Is the Set Object or Sits Inside It
    // ------------------------------------------------------------
    // A GLB component is a Group of meshes, so its children must take the same
    // tier as the object the pick table is registered on.
    function VghLantern__Env3d__HighlightLayer__IsWithin(node, ancestor) {
        let cursor  =  node;

        while (cursor) {
            if (cursor === ancestor) return true;
            cursor  =  cursor.parent;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether an Object Can Take a Material Swap
    // ------------------------------------------------------------
    function VghLantern__Env3d__HighlightLayer__IsPaintable(node) {
        return !!(node && node.material && (node.isMesh || node.isLine || node.isPoints));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Swap an Object's Material, Remembering the Original
    // ------------------------------------------------------------
    function VghLantern__Env3d__HighlightLayer__Swap(state, node, material) {
        if (!VghLantern__Env3d__HighlightLayer__IsPaintable(node)) return;
        if (!material) return;

        state.Swapped.push({ Object3d : node, Material : node.material });
        node.material  =  material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Instance Overlay Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Copy a Span of a Float Attribute Into a New Array
    // ------------------------------------------------------------
    // Copied rather than referenced through subarray, so the overlay cannot be
    // left pointing into a buffer the next model rebuild has already disposed.
    function VghLantern__Env3d__HighlightLayer__CopySpan(attribute, vertexStart, vertexCount) {
        if (!attribute || !attribute.array) return null;

        const floatStart  =  vertexStart * FLOATS_PER_VERTEX;
        const floatCount  =  vertexCount * FLOATS_PER_VERTEX;
        if (floatStart + floatCount > attribute.array.length) return null;    // <-- Span outside the buffer, refuse rather than corrupt

        return new Float32Array(attribute.array.subarray(floatStart, floatStart + floatCount));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sit the Overlay Exactly Where Its Source Sits
    // ------------------------------------------------------------
    // The slice is in the source object's local space, and the highlight group is
    // an untransformed sibling at the scene root, so the overlay's local matrix is
    // the source's world matrix. In practice the merged member meshes are built in
    // world coordinates and this resolves to identity, but copying it means a
    // builder that later places a transformed mesh does not break the highlight.
    function VghLantern__Env3d__HighlightLayer__MatchSourceTransform(overlay, sourceObject) {
        sourceObject.updateWorldMatrix(true, false);                          // <-- May be the first frame since the rebuild

        overlay.matrixAutoUpdate  =  false;
        overlay.matrix.copy(sourceObject.matrixWorld);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Overlay Object for One Picked Instance
    // ------------------------------------------------------------
    // Returns null when the pick names a whole object, because in that case the
    // object itself has already been given the instance material and an overlay
    // would only double-draw it.
    function VghLantern__Env3d__HighlightLayer__BuildOverlay(pick, instanceMaterial) {
        const sourceGeometry  =  pick.Object3d ? pick.Object3d.geometry : null;
        if (!sourceGeometry || pick.SpanCount <= 0) return null;

        const isSegmentMode  =  pick.IndexMode === VghLantern__Env3d__PickIndex__ModeSegment;
        const perSpan        =  isSegmentMode ? VERTICES_PER_LINE : VERTICES_PER_FACE;
        const vertexStart    =  pick.SpanStart * perSpan;
        const vertexCount    =  pick.SpanCount * perSpan;

        const positions  =  VghLantern__Env3d__HighlightLayer__CopySpan(sourceGeometry.attributes.position, vertexStart, vertexCount);
        if (!positions) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, FLOATS_PER_VERTEX));

        if (isSegmentMode) {
            const lines  =  new THREE.LineSegments(geometry, VghLantern__Env3d__MaterialLibrary__HighlightLine());
            lines.name          =  OVERLAY_NAME;
            lines.renderOrder   =  OVERLAY_RENDER_ORDER;

            VghLantern__Env3d__HighlightLayer__MatchSourceTransform(lines, pick.Object3d);
            return lines;
        }

        const normals  =  VghLantern__Env3d__HighlightLayer__CopySpan(sourceGeometry.attributes.normal, vertexStart, vertexCount);
        if (normals) geometry.setAttribute('normal', new THREE.BufferAttribute(normals, FLOATS_PER_VERTEX));
        else         geometry.computeVertexNormals();                         // <-- Source had none, so derive them

        // The overlay is coincident with the mesh it was sliced from. The solid
        // instance material carries a polygon offset for exactly that reason -
        // without it the two surfaces z-fight and the highlight shimmers as the
        // camera moves. The glazing variant needs none: glass writes no depth.
        const mesh  =  new THREE.Mesh(geometry, instanceMaterial);
        mesh.name         =  OVERLAY_NAME;
        mesh.renderOrder  =  OVERLAY_RENDER_ORDER;

        VghLantern__Env3d__HighlightLayer__MatchSourceTransform(mesh, pick.Object3d);
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply and Clear
// -----------------------------------------------------------------------------

    // FUNCTION | Clear Every Highlight Effect From a Surface
    // ------------------------------------------------------------
    // Safe to call on a surface that was never highlighted, and safe to call twice.
    export function VghLantern__Env3d__HighlightLayer__Clear(surface) {
        if (!surface) return;

        const state  =  surface.HighlightState;
        if (state) {
            for (let i = state.Swapped.length - 1; i >= 0; i--) {
                state.Swapped[i].Object3d.material  =  state.Swapped[i].Material;
            }
            state.Swapped.length  =  0;
        }

        if (surface.Groups && surface.Groups[GROUP_HIGHLIGHT]) {
            VghLantern__Env3d__SceneManager__ClearGroup(surface, GROUP_HIGHLIGHT);
        }

        surface.HighlightState  =  null;
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Paint Every Model Object Into Its Tier
    // ------------------------------------------------------------
    function VghLantern__Env3d__HighlightLayer__PaintTiers(surface, pick, state, setMaterial) {
        const ghostSolid    =  VghLantern__Env3d__MaterialLibrary__Ghost();
        const ghostGlazing  =  VghLantern__Env3d__MaterialLibrary__GhostGlazing();

        for (let g = 0; g < TIER_GROUP_NAMES.length; g++) {
            const groupName  =  TIER_GROUP_NAMES[g];
            const group      =  surface.Groups[groupName];
            if (!group) continue;

            const ghostMaterial  =  (groupName === GROUP_GLAZING) ? ghostGlazing : ghostSolid;

            group.traverse(function(node) {
                if (!VghLantern__Env3d__HighlightLayer__IsPaintable(node)) return;

                const inSet  =  VghLantern__Env3d__HighlightLayer__IsWithin(node, pick.Object3d);
                VghLantern__Env3d__HighlightLayer__Swap(state, node, inSet ? setMaterial : ghostMaterial);
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Three Tier Highlight for a Resolved Pick
    // ------------------------------------------------------------
    // A set holding a single instance skips the sibling tier entirely: there are no
    // siblings, so the set object simply takes the instance material and no overlay
    // is built.
    export function VghLantern__Env3d__HighlightLayer__Apply(surface, pick) {
        VghLantern__Env3d__HighlightLayer__Clear(surface);
        if (!surface || !pick || !pick.Object3d) return;

        const state  =  { Swapped : [] };
        surface.HighlightState  =  state;

        const isGlazing   =  pick.CategoryKey === 'glazing';
        const isLoneItem  =  pick.EntryCount <= 1 || pick.IndexMode === VghLantern__Env3d__PickIndex__ModeWhole;

        const instanceMaterial  =  isGlazing
            ? VghLantern__Env3d__MaterialLibrary__HighlightGlazing()
            : VghLantern__Env3d__MaterialLibrary__HighlightInstance();

        // Glazing has no sibling tier. All four slopes live in one mesh, and tinting
        // that whole mesh would light up every pane at once, which is the opposite
        // of picking one out. The set recedes to ghost instead and the overlay alone
        // carries the accent.
        let setMaterial;
        if (isLoneItem)     setMaterial  =  instanceMaterial;
        else if (isGlazing) setMaterial  =  VghLantern__Env3d__MaterialLibrary__GhostGlazing();
        else                setMaterial  =  VghLantern__Env3d__MaterialLibrary__HighlightSibling();

        VghLantern__Env3d__HighlightLayer__PaintTiers(surface, pick, state, setMaterial);

        if (!isLoneItem) {
            const overlay  =  VghLantern__Env3d__HighlightLayer__BuildOverlay(pick, instanceMaterial);
            if (overlay && surface.Groups[GROUP_HIGHLIGHT]) surface.Groups[GROUP_HIGHLIGHT].add(overlay);
        }

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
