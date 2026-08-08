/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | PLACEMENT GHOST
   =============================================================================

   FILE       : NaAudio__Env3d__PlacementGhost__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - PlacementGhost
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Show where a module will land while it is still being dragged
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A translucent pad and cage at a module type's real footprint, following the pointer
     across the floor while something is dragged out of the palette.
   - Turns terracotta and refuses when the spot is taken.

   ---------------------------------------------------------------------------

   WHY THE GHOST IS THE REAL FOOTPRINT AND NOT A MARKER

   A dot under the cursor answers 'where', which is the easy half. The question that
   actually matters while placing an instrument is 'does it FIT' - the pads are between
   one and a half and three and a half metres across, the grid snap moves the drop by up
   to half a metre, and the space between two modules is often only about one module wide.

   So the ghost is the same rounded pad and the same wire cage the module will have, at
   the same size, snapped to the same grid the drop will use. What you are looking at
   before you let go is the thing you are about to get.

   ---------------------------------------------------------------------------

   IT REFUSES BEFORE THE DROP, NOT AFTER

   Blocked placements turn the ghost terracotta and the drop does nothing. The check runs
   every frame of the drag rather than once on release, because a refusal that only
   arrives after letting go teaches the user nothing about where it WOULD have worked -
   they have to drop, see it fail, and guess again.

   Dropping a module inside another is never what was meant, and it is unusually annoying
   to undo: the two overlap, so the one on top has to be found and dragged back out of the
   one underneath before either can be worked on.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, SpatialSection }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                       from './NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Shapes                        from './NaAudio__Env3d__ShapeFactory__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from './NaAudio__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | Placement Ghost
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Single Live Ghost
    // ------------------------------------------------------------
    // One at a time, by construction. Two things being placed at once is not a gesture
    // any pointer can make, and holding a single reference means a cancel can never leave
    // an orphan behind in the scene.
    let ghostGroup      =  null;
    let ghostSurface    =  null;
    let ghostPad        =  null;
    let ghostCage       =  null;
    let ghostMaterials  =  [];
    let isBlocked       =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Raise a Ghost at a Module Type's Footprint
    // ------------------------------------------------------------
    export function NaAudio__PlacementGhost__Show(surface, cageSize) {
        NaAudio__PlacementGhost__Hide();

        ghostSurface  =  surface;
        ghostGroup    =  new THREE.Group();
        ghostGroup.name  =  'NaAudio__Env3d__PlacementGhost';

        const inset   =  SpatialNumber('Shell', 'PadInset');
        const width   =  cageSize.x - inset * 2;
        const depth   =  cageSize.z - inset * 2;
        const opacity =  SpatialNumber('Placement', 'GhostOpacity');

        // THE PAD
        const padMaterial  =  new THREE.MeshBasicMaterial({
            color       : Palette.NaAudio__Palette__Pigment(SpatialSection('Placement').GhostPigment, 'Base').clone(),
            transparent : true,
            opacity     : opacity,
            depthWrite  : false,                                              // <-- Never occludes what it is being placed among
            side        : THREE.DoubleSide
        });

        ghostPad  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__RoundedPad(width, depth, Math.min(width, depth) * 0.18, SpatialNumber('Shell', 'PadCornerSegments')),
            padMaterial
        );
        ghostPad.position.y  =  0.012;
        ghostGroup.add(ghostPad);

        // THE CAGE
        // The full height of the module, so the ghost shows the volume it will occupy
        // rather than only the floor it will stand on - two modules can clear each other
        // on the ground and still read as crowded once they are standing up.
        const box       =  new THREE.BoxGeometry(cageSize.x, cageSize.y, cageSize.z);
        const cageGeometry  =  new THREE.EdgesGeometry(box);
        box.dispose();

        const cageMaterial  =  new THREE.LineBasicMaterial({
            color       : padMaterial.color.clone(),
            transparent : true,
            opacity     : Math.min(opacity * 1.7, 1)
        });

        ghostCage  =  new THREE.LineSegments(cageGeometry, cageMaterial);
        ghostCage.position.y  =  cageSize.y / 2;
        ghostGroup.add(ghostCage);

        ghostMaterials  =  [padMaterial, cageMaterial];

        surface.Groups[NaAudio__Env3d__SceneGroup.Overlay].add(ghostGroup);
        return ghostGroup;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Ghost and Set Whether the Spot Is Free
    // ------------------------------------------------------------
    export function NaAudio__PlacementGhost__MoveTo(x, z, isClear) {
        if (!ghostGroup) return;

        ghostGroup.position.set(x, 0, z);
        ghostGroup.visible  =  true;

        if (isBlocked === !isClear) return;                                   // <-- Colour only changes when the verdict does
        isBlocked  =  !isClear;

        const section  =  SpatialSection('Placement');
        const pigment  =  isBlocked ? section.GhostBlockedPigment : section.GhostPigment;
        const opacity  =  isBlocked
            ? SpatialNumber('Placement', 'GhostBlockedOpacity')
            : SpatialNumber('Placement', 'GhostOpacity');

        const colour  =  Palette.NaAudio__Palette__Pigment(pigment, 'Base');

        ghostMaterials[0].color.copy(colour);
        ghostMaterials[0].opacity  =  opacity;
        ghostMaterials[1].color.copy(colour);
        ghostMaterials[1].opacity  =  Math.min(opacity * 1.7, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Ghost While the Pointer Is Off the Space
    // ------------------------------------------------------------
    export function NaAudio__PlacementGhost__SetVisible(isVisible) {
        if (ghostGroup) ghostGroup.visible  =  isVisible === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Ghost Away
    // ------------------------------------------------------------
    export function NaAudio__PlacementGhost__Hide() {
        if (!ghostGroup) return;

        NaAudio__Env3d__SceneManager__DisposeSubtree(ghostGroup);

        ghostGroup      =  null;
        ghostSurface    =  null;
        ghostPad        =  null;
        ghostCage       =  null;
        ghostMaterials  =  [];
        isBlocked       =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Current Spot Is Refused
    // ------------------------------------------------------------
    export function NaAudio__PlacementGhost__IsBlocked() {
        return isBlocked;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
