/* =============================================================================
   NAAUDIO - HUD OVERLAY | MODULE PALETTE
   =============================================================================

   FILE       : NaAudio__Hud__ModulePalette__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - ModulePalette
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drag a new instrument out of the side menu and onto the floor
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A panel down the left edge listing every registered module type, each with a real
     rendered thumbnail of itself.
   - Drag one onto the space to place it. A ghost of the module's own footprint follows
     the pointer and refuses spots that are taken.
   - Build mode only.

   ---------------------------------------------------------------------------

   WHY IT IS BUILD MODE ONLY

   Placing a module is the same class of act as moving one: it changes the arrangement
   rather than the sound. Putting it in Play would mean a panel that adds instruments
   sitting open beside a set of live controls, which is the collision the modes exist to
   remove - and the palette is a large target down one whole edge of the screen.

   ---------------------------------------------------------------------------

   WHY THE DRAG IS POINTER EVENTS AND NOT HTML5 DRAG AND DROP

   The drop target is a WebGL canvas, and the thing that has to follow the pointer is a
   3D object inside it. Native drag and drop gives a drag image the browser owns, fires
   dragover at its own rate, and hides the pointer position behind a protected model that
   deliberately makes reading coordinates awkward mid-drag. Every one of those fights the
   only thing this gesture needs: the exact ground position, every frame, so the ghost is
   where the module will be.

   Pointer events give that directly, and the same code then works for touch.

   ---------------------------------------------------------------------------

   A PLACED MODULE IS PATCHED FOR YOU

   Nothing reaches the speakers except through a cable, and that rule stays. But a user
   who drags in a second drum machine and hears nothing has been given a puzzle rather
   than an instrument, so a newly placed module gets a real cable into the nearest Output
   Post - visible, followable and unpluggable like any other.

   Making the first connection is not the same as making connections invisible. Turn it
   off with AutoPatchOnAdd if a space is meant to be wired entirely by hand.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialBool, SpatialNumber }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import { NaAudio__ConfigAccess__ModuleTypeDefaults }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';
import { NaAudio__ModeManager__IsBuild }  from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import {
    NaAudio__Env3d__Interaction__GroundPointFromEvent,
    NaAudio__Env3d__Interaction__IsOverViewport,
    NaAudio__Env3d__Interaction__SnapToGrid
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import * as PlacementGhost  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PlacementGhost__.mjs';
import * as TypePreview     from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__TypePreview__.mjs';
import {
    NaAudio__ModuleRegistry__TypeList,
    NaAudio__ModuleRegistry__Type,
    NaAudio__ModuleRegistry__Add,
    NaAudio__ModuleRegistry__NextId,
    NaAudio__ModuleRegistry__IsPositionClear,
    NaAudio__ModuleRegistry__Select
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleRegistry__.mjs';
import {
    NaAudio__PatchGraph__AutoPatchToOutput
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__PatchGraph__.mjs';

// =============================================================================
// REGION | Module Palette
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Panel and Drag State
    // ------------------------------------------------------------
    const SCRATCH_GROUND  =  new THREE.Vector3();

    let panelElement     =  null;
    let listElement      =  null;
    let attachedSurface  =  null;
    let hasPhotographed  =  false;

    let activeDrag       =  null;                                            // <-- { TypeName, CageSize, Footprint }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Palette Panel
    // ------------------------------------------------------------
    export function NaAudio__ModulePalette__Build(mountElement, surface) {
        attachedSurface  =  surface;

        panelElement  =  document.createElement('aside');
        panelElement.className  =  'NaAudio__Palette';

        const heading  =  document.createElement('h2');
        heading.className    =  'NaAudio__Palette__Heading';
        heading.textContent  =  'Add a module';
        panelElement.appendChild(heading);

        const hint  =  document.createElement('p');
        hint.className    =  'NaAudio__Palette__Hint';
        hint.textContent  =  'Drag onto the floor.';
        panelElement.appendChild(hint);

        listElement  =  document.createElement('div');
        listElement.className  =  'NaAudio__Palette__List';
        panelElement.appendChild(listElement);

        NaAudio__ModulePalette__BuildEntries();
        mountElement.appendChild(panelElement);

        NaAudio__EventBus__Subscribe(NaAudio__Event.ModeChanged, NaAudio__ModulePalette__ApplyMode);
        NaAudio__ModulePalette__ApplyMode();

        return panelElement;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Entry Per Registered Type
    // ------------------------------------------------------------
    // Driven off the registry rather than a list here, so a module type registered in the
    // boot sequence appears in the palette without this file being touched.
    function NaAudio__ModulePalette__BuildEntries() {
        const types  =  NaAudio__ModuleRegistry__TypeList();

        for (let i = 0; i < types.length; i++) {
            const type      =  types[i];
            const defaults  =  NaAudio__ConfigAccess__ModuleTypeDefaults(type.TypeName);

            // An output post is placeable in principle - a space can have an A and a B
            // path - but it is not an instrument, and offering it beside the instruments
            // in a palette headed 'Add a module' invites somebody to place a second
            // speaker output while looking for a second drum machine.
            if (defaults.IsMasterOutput === true) continue;

            const entry  =  document.createElement('button');
            entry.className  =  'NaAudio__Palette__Entry';
            entry.type       =  'button';
            entry.title      =  type.Note || type.Label;
            entry.dataset.naaudioType  =  type.TypeName;

            const figure  =  document.createElement('span');
            figure.className  =  'NaAudio__Palette__Preview';
            entry.appendChild(figure);

            const caption  =  document.createElement('span');
            caption.className  =  'NaAudio__Palette__Caption';
            caption.textContent  =  type.Label;
            entry.appendChild(caption);

            entry.addEventListener('pointerdown', function (event) {
                NaAudio__ModulePalette__BeginDrag(event, type.TypeName);
            });

            listElement.appendChild(entry);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Photograph Every Type, Once
    // ------------------------------------------------------------
    // Deferred until the palette is first shown. The capture stalls the GPU reading
    // pixels back, and doing that during boot would put three stalls in the busiest part
    // of the application's life to fill a panel nobody has asked to see yet.
    function NaAudio__ModulePalette__EnsurePreviews() {
        if (hasPhotographed || !attachedSurface) return;
        hasPhotographed  =  true;

        const entries  =  listElement.querySelectorAll('.NaAudio__Palette__Entry');

        for (let i = 0; i < entries.length; i++) {
            const entry     =  entries[i];
            const typeName  =  entry.dataset.naaudioType;

            const dataUrl  =  TypePreview.NaAudio__TypePreview__Capture(
                attachedSurface, typeName, NaAudio__ModuleRegistry__Type(typeName)
            );

            if (!dataUrl) continue;

            const figure  =  entry.querySelector('.NaAudio__Palette__Preview');
            figure.style.backgroundImage  =  'url(' + dataUrl + ')';
            figure.classList.add('NaAudio__Palette__Preview--photographed');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement Drag
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Take a Type Out of the Palette
    // ------------------------------------------------------------
    function NaAudio__ModulePalette__BeginDrag(event, typeName) {
        if (!NaAudio__ModeManager__IsBuild()) return;
        if (event.button !== 0 && event.pointerType === 'mouse') return;

        event.preventDefault();

        const defaults  =  NaAudio__ConfigAccess__ModuleTypeDefaults(typeName);
        const cage      =  defaults.CageSize;

        activeDrag  =  {
            TypeName   : typeName,
            CageSize   : new THREE.Vector3(cage.x, cage.y, cage.z),
            Footprint  : Math.max(cage.x, cage.z),
            Ground     : new THREE.Vector3(),                                 // <-- The last position the ghost was actually shown at
            HasGround  : false,
            IsClear    : false
        };

        PlacementGhost.NaAudio__PlacementGhost__Show(attachedSurface, activeDrag.CageSize);
        PlacementGhost.NaAudio__PlacementGhost__SetVisible(false);

        panelElement.classList.add('NaAudio__Palette--dragging');

        window.addEventListener('pointermove', NaAudio__ModulePalette__OnPointerMove);
        window.addEventListener('pointerup',   NaAudio__ModulePalette__OnPointerUp);
        window.addEventListener('keydown',     NaAudio__ModulePalette__OnKeyDown);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Follow the Pointer Across the Floor
    // ------------------------------------------------------------
    function NaAudio__ModulePalette__OnPointerMove(event) {
        if (!activeDrag) return;

        if (!NaAudio__Env3d__Interaction__IsOverViewport(event.clientX, event.clientY)) {
            activeDrag.HasGround  =  false;
            PlacementGhost.NaAudio__PlacementGhost__SetVisible(false);
            return;
        }

        const ground  =  NaAudio__Env3d__Interaction__GroundPointFromEvent(event, SCRATCH_GROUND);
        if (!ground) {
            activeDrag.HasGround  =  false;
            PlacementGhost.NaAudio__PlacementGhost__SetVisible(false);
            return;
        }

        // The SAME snap a dragged module uses, so a module placed from the palette lands
        // on the same lattice as everything already in the space.
        NaAudio__Env3d__Interaction__SnapToGrid(ground);

        const isClear  =  NaAudio__ModuleRegistry__IsPositionClear(ground.x, ground.z, activeDrag.Footprint, null);
        PlacementGhost.NaAudio__PlacementGhost__MoveTo(ground.x, ground.z, isClear);

        // REMEMBERED, not recomputed on release. The ghost is the promise the interface
        // is making, so the drop has to honour exactly it - and a pointerup does not
        // always carry a usable position to re-derive one from, which showed up as a
        // gesture that tracked perfectly and then quietly placed nothing.
        activeDrag.Ground.copy(ground);
        activeDrag.HasGround  =  true;
        activeDrag.IsClear    =  isClear;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drop It, or Do Not
    // ------------------------------------------------------------
    function NaAudio__ModulePalette__OnPointerUp() {
        if (!activeDrag) return;

        // Everything the drop needs was decided while the ghost was being shown.
        const type     =  activeDrag.TypeName;
        const canPlace =  activeDrag.HasGround && activeDrag.IsClear;

        SCRATCH_GROUND.copy(activeDrag.Ground);
        NaAudio__ModulePalette__EndDrag();

        if (!canPlace) return;
        NaAudio__ModulePalette__Place(type, SCRATCH_GROUND);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Abandon the Drag
    // ------------------------------------------------------------
    function NaAudio__ModulePalette__OnKeyDown(event) {
        if (event.code === 'Escape') NaAudio__ModulePalette__EndDrag();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Tear the Drag Down
    // ------------------------------------------------------------
    // Every listener added by BeginDrag is removed here, and this is the ONLY place they
    // are removed. A window-level pointermove left behind by one abandoned drag is a
    // handler that runs for the rest of the session and starts placing modules the next
    // time anything else uses the pointer.
    function NaAudio__ModulePalette__EndDrag() {
        activeDrag  =  null;

        PlacementGhost.NaAudio__PlacementGhost__Hide();
        if (panelElement) panelElement.classList.remove('NaAudio__Palette--dragging');

        window.removeEventListener('pointermove', NaAudio__ModulePalette__OnPointerMove);
        window.removeEventListener('pointerup',   NaAudio__ModulePalette__OnPointerUp);
        window.removeEventListener('keydown',     NaAudio__ModulePalette__OnKeyDown);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Put a New Module in the Space
    // ------------------------------------------------------------
    export function NaAudio__ModulePalette__Place(typeName, position) {
        const module  =  NaAudio__ModuleRegistry__Add({
            ModuleId : NaAudio__ModuleRegistry__NextId(typeName),
            TypeName : typeName,
            Position : { x: position.x, z: position.z },
            IsLocked : false,
            Settings : {}
        });

        if (!module) return null;

        if (SpatialBool('Placement', 'AutoPatchOnAdd')) {
            NaAudio__PatchGraph__AutoPatchToOutput(module.ModuleId);
        }

        // Selected on arrival, so the inspector names the thing that just appeared and
        // the user can see which of two identical drum machines they are now holding.
        NaAudio__ModuleRegistry__Select(module.ModuleId);
        return module;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Show in Build, Hide Everywhere Else
    // ------------------------------------------------------------
    function NaAudio__ModulePalette__ApplyMode() {
        if (!panelElement) return;

        const isBuild  =  NaAudio__ModeManager__IsBuild();
        panelElement.classList.toggle('NaAudio__Palette--visible', isBuild);

        if (isBuild) NaAudio__ModulePalette__EnsurePreviews();
        else if (activeDrag) NaAudio__ModulePalette__EndDrag();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
