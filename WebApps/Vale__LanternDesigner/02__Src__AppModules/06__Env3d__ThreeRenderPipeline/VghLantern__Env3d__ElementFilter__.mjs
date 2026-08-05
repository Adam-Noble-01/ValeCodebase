/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | ELEMENT FILTER
   =============================================================================

   FILE       : VghLantern__Env3d__ElementFilter__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ElementFilter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Show the finished lantern, or only the structure inside it
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Owns which ELEMENT TYPES a surface is currently showing. Nothing else.
   - Builds no geometry and computes nothing. Every mesh is already in the scene
     graph carrying its element type, and this module decides what is visible, so
     switching is instant and allocation free.

   ---------------------------------------------------------------------------

   THE TWO VIEWS

       full         The finished lantern. Everything visible: cap, core, trim,
                    glass, finials, kerb. This is the default, and the view a
                    client-facing snapshot must be taken in.

       structural   The carcass alone. Only elements typed Structural survive -
                    the glaze bar cores and the frame. The decorative capping,
                    the internal timber trim, the glass and the finials all
                    disappear, leaving what actually carries the roof.

   ---------------------------------------------------------------------------

   WHY THIS IS NOT PART OF DisplayMode

   DisplayMode answers "solid model, setting out, or both" - which CLASS of
   geometry to draw. This answers "which elements within the solid model" - a
   question that is orthogonal to it. A reviewer can want the structure with its
   setting out over it, and folding the two into one list of modes would need an
   entry for every combination and would grow multiplicatively the moment a third
   axis appeared.

   ---------------------------------------------------------------------------

   WHY UNTYPED MESHES ARE CLASSIFIED BY GROUP RATHER THAN LEFT OUT

   Only the glaze bar composite stamps an element type on itself today, because
   only its parts come from asset files carrying the field. The frame, the kerb,
   the glass and the loaded components predate it.

   Rather than stamp every one of those builders - a wide edit for a field most
   of them have exactly one possible value for - the group a mesh sits in
   supplies the default. A mesh that DOES declare its type always wins, so as the
   other builders start declaring theirs, they take over from the default one at
   a time with no change needed here.

   ============================================================================= */

import {
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneGroup,
    VghLantern__Env3d__SceneGroupSet__Solid3d
} from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Element Filter Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Element Type Vocabulary
    // ------------------------------------------------------------
    // Mirrors Na__Asset__ValeSpec__ElementType in the asset schema. One list,
    // read by the 3D filter and by the specification tables alike.
    export const VghLantern__Env3d__ElementFilter__Type  =  {
        Structural : 'Structural',
        Trim       : 'Trim',
        ByOthers   : 'By Others',
        Flashing   : 'Flashing',
        Glazing    : 'Glazing'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Two Views and What Each Admits
    // ------------------------------------------------------------
    export const VghLantern__Env3d__ElementFilter__Full        =  'full';
    export const VghLantern__Env3d__ElementFilter__Structural  =  'structural';

    export const VghLantern__Env3d__ElementFilter__Order  =  [
        VghLantern__Env3d__ElementFilter__Full,
        VghLantern__Env3d__ElementFilter__Structural
    ];

    const VIEW_LABELS  =  {
        full       : 'Full Lantern',
        structural : 'Structure Only'
    };

    // A null admitted set means everything. Listing the types the structural view
    // keeps, rather than the ones it hides, means a type added later is hidden by
    // default - which is the safe direction: a new decorative element appearing
    // in a structural view is a wrong drawing, a new structural element missing
    // from it is a visible omission somebody reports.
    const VIEW_ADMITS  =  {
        full       : null,
        structural : [VghLantern__Env3d__ElementFilter__Type.Structural]
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Element Type per Scene Group
    // ------------------------------------------------------------
    // Used only where a mesh has not declared its own type. The kerb is the
    // interesting one: a builders upstand is exactly what "By Others" means, so
    // it correctly drops out of a Vale structural view.
    const GROUP_DEFAULT_TYPE  =  {};
    GROUP_DEFAULT_TYPE[VghLantern__Env3d__SceneGroup.Solid3d__Frame]       =  VghLantern__Env3d__ElementFilter__Type.Structural;
    GROUP_DEFAULT_TYPE[VghLantern__Env3d__SceneGroup.Solid3d__GlazeBars]   =  VghLantern__Env3d__ElementFilter__Type.Structural;
    GROUP_DEFAULT_TYPE[VghLantern__Env3d__SceneGroup.Solid3d__Glazing]     =  VghLantern__Env3d__ElementFilter__Type.Glazing;
    GROUP_DEFAULT_TYPE[VghLantern__Env3d__SceneGroup.Solid3d__Components]  =  VghLantern__Env3d__ElementFilter__Type.Trim;

    const USERDATA_ELEMENT_TYPE  =  'VghLantern__ElementType';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Element Type Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Element Type an Object Should Be Judged By
    // ------------------------------------------------------------
    // Walks up to the nearest ancestor that declares a type, so a loaded GLB
    // whose internal meshes carry nothing still inherits the type stamped on the
    // node the loader placed. Falls back to the group default and, failing that,
    // to Structural - because a mesh of unknown purpose is better left standing
    // in a structural view than silently deleted from one.
    function VghLantern__Env3d__ElementFilter__TypeOf(node, groupName) {
        let current  =  node;

        while (current) {
            if (current.userData && current.userData[USERDATA_ELEMENT_TYPE]) {
                return current.userData[USERDATA_ELEMENT_TYPE];
            }
            current  =  current.parent;
        }

        return GROUP_DEFAULT_TYPE[groupName] || VghLantern__Env3d__ElementFilter__Type.Structural;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a View Admits an Element Type
    // ------------------------------------------------------------
    function VghLantern__Env3d__ElementFilter__Admits(viewKey, elementType) {
        const admitted  =  VIEW_ADMITS[viewKey];
        if (!admitted) return true;                                           // <-- Full view admits everything
        return admitted.indexOf(elementType) !== -1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Application
// -----------------------------------------------------------------------------

    // FUNCTION | Apply an Element View to a Surface
    // ------------------------------------------------------------
    // Idempotent and safe to call on every render, which is what makes the view
    // survive a rebuild without the caller having to remember it.
    //
    // Only the immediate children of each solid group are switched. Visibility in
    // Three is inherited, so hiding a top-level part mesh hides everything under
    // it, and touching every descendant would cost a full traverse to achieve the
    // same thing.
    export function VghLantern__Env3d__ElementFilter__Apply(surface, viewKey) {
        if (!surface || !surface.Groups) return;

        if (!surface.ElementFilterState) surface.ElementFilterState  =  { View : '' };

        const view  =  (VghLantern__Env3d__ElementFilter__Order.indexOf(viewKey) !== -1)
            ? viewKey
            : VghLantern__Env3d__ElementFilter__Full;

        let g, groupName, group, i, child, elementType;

        for (g = 0; g < VghLantern__Env3d__SceneGroupSet__Solid3d.length; g++) {
            groupName  =  VghLantern__Env3d__SceneGroupSet__Solid3d[g];
            group      =  surface.Groups[groupName];
            if (!group) continue;

            for (i = 0; i < group.children.length; i++) {
                child        =  group.children[i];
                elementType  =  VghLantern__Env3d__ElementFilter__TypeOf(child, groupName);

                child.visible  =  VghLantern__Env3d__ElementFilter__Admits(view, elementType);
            }
        }

        surface.ElementFilterState.View  =  view;
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Element View a Surface Is In
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ElementFilter__Current(surface) {
        if (surface && surface.ElementFilterState && surface.ElementFilterState.View) {
            return surface.ElementFilterState.View;
        }
        return VghLantern__Env3d__ElementFilter__Full;
    }
    // ------------------------------------------------------------


    // FUNCTION | Human Readable Name for an Element View
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ElementFilter__Label(viewKey) {
        return VIEW_LABELS[viewKey] || viewKey;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Every Element View With Its Label
    // ------------------------------------------------------------
    // Consumed by the 3D overlay so its buttons are generated from this list
    // rather than hardcoded, exactly as the display mode buttons are.
    export function VghLantern__Env3d__ElementFilter__List() {
        const list  =  [];
        let i, key;

        for (i = 0; i < VghLantern__Env3d__ElementFilter__Order.length; i++) {
            key  =  VghLantern__Env3d__ElementFilter__Order[i];
            list.push({ Key : key, Label : VIEW_LABELS[key] || key });
        }
        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
