/* =============================================================================
   NAAUDIO - SPATIAL MODULE | OUTPUT POST
   =============================================================================

   FILE       : NaAudio__Module__OutputPost__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Module - OutputPost
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The one way out of the space, and the only thing you can actually hear
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A tapered post standing at the centre of the space, with a single input socket and
     no output. Whatever is patched into it goes to the speakers.
   - It carries a level column that rises with the master meter, so the post is also the
     master meter.

   ---------------------------------------------------------------------------

   WHY THE OUTPUT IS AN OBJECT IN THE SPACE

   Before this, every module connected itself to the master bus on creation. That is the
   sane default for a prototype and it makes the signal flow completely unreadable: the
   cables you can see describe some of the routing, and an invisible rule describes the
   rest. A user following a lead with their eye learns nothing, because the thing they
   were trying to understand was never drawn.

   Now there is exactly one exit and it has a position. Everything audible has a
   traceable path to this post; everything with no path is silent. That converts the
   patch from decoration into the actual answer to 'why does this sound like this', which
   is the entire argument for spatial routing in the first place.

   It also makes series and parallel mean something. Two modules into the post is
   parallel and both are heard dry. One into an effect and the effect into the post is
   series, and only the processed version is heard. Nothing enforces either arrangement -
   they are just what happens - and that is what the manifest's routing is meant to feel
   like.

   ---------------------------------------------------------------------------

   AudioInput RETURNS THE MASTER BUS ITSELF

   Not a gain node feeding the master - the master input node, directly. There is nothing
   for an intermediate node to do here except add a place for a level to be wrong.

   Which means the post has no bus of its own worth metering. Its column reads the MASTER
   meter rather than its own, and its own module bus sits idle. That is the one place this
   module type departs from the shell's assumptions, and it is deliberate: the post is not
   a source, so a source's plumbing would only ever read zero.

   ---------------------------------------------------------------------------

   IT IS A MODULE, NOT A PIECE OF ENVIRONMENT

   Tempting to build it into the ground stage - it is fixed, central and singular. Making
   it a module type instead means it gets a shell, a pad, a name plate, a socket, an
   island of ground, a place in the registry and a line in the space file for free, and
   every one of those is behaviour the wiring system needs it to have.

   The space file may also declare more than one, which is not a mistake to design out:
   two posts is a perfectly sensible way to build a space with an A and a B path.

   ============================================================================= */

import * as THREE from 'three';

import { NaAudio__ConfigAccess__ModuleTypeDefaults }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Materials    from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as ModuleBase   from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as AudioHost    from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';

// =============================================================================
// REGION | Output Post
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Type Name and Geometry Proportions
    // ------------------------------------------------------------
    export const NaAudio__OutputPost__TypeName  =  'OutputPost';

    const COLUMN_SEGMENTS  =  20;
    const CAP_SEGMENTS     =  20;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Post, Its Collar and Its Level Column
    // ------------------------------------------------------------
    // Tapered rather than a plain cylinder. A parallel post at this scale reads as a
    // bollard; the taper reads as something that goes somewhere, which is exactly what
    // it is - the mouth of the tunnel to the speakers.
    function NaAudio__OutputPost__BuildBody(module) {
        const defaults  =  NaAudio__ConfigAccess__ModuleTypeDefaults(NaAudio__OutputPost__TypeName);

        const height       =  defaults.PostHeight;
        const baseRadius   =  defaults.PostBaseRadius;
        const topRadius    =  defaults.PostTopRadius;

        const postMaterial  =  Materials.NaAudio__Materials__OwnedBody('Bone', 'Deep');
        const postGeometry  =  new THREE.CylinderGeometry(topRadius, baseRadius, height, COLUMN_SEGMENTS, 1, false);

        const post  =  new THREE.Mesh(postGeometry, postMaterial);
        post.position.y     =  height / 2;
        post.castShadow     =  true;
        post.receiveShadow  =  true;
        module.BodyGroup.add(post);
        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, postMaterial);

        // THE LEVEL COLUMN
        // Scaled on Y from its own base rather than moved, so it grows out of the post
        // instead of sliding up it. The pivot is put at the bottom by offsetting the
        // geometry, which is cheaper and more readable than nesting a group to fake it.
        const columnMaterial  =  Materials.NaAudio__Materials__OwnedBody('ClayOrange', 'Base');
        const columnGeometry  =  new THREE.CylinderGeometry(topRadius * 0.72, topRadius * 0.72, defaults.ColumnHeight, CAP_SEGMENTS, 1, false);
        columnGeometry.translate(0, defaults.ColumnHeight / 2, 0);

        const column  =  new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.y  =  height;
        column.scale.y     =  0.001;                                          // <-- Silent at rest; zero would collapse the normals
        column.castShadow  =  false;
        module.BodyGroup.add(column);
        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, columnMaterial);

        // THE COLLAR
        // A flat ring on the floor, marking the post's footprint as a place rather than
        // an object standing in one. Its material is OWNED because OnSelected writes its
        // opacity, and the shared flat-marker material is handed to every other mark on
        // the floor - selecting the post would have brightened all of them.
        const collarMaterial  =  Materials.NaAudio__Materials__OwnedFlatMarker('InkFaint', 0.5);
        const collarGeometry  =  new THREE.RingGeometry(baseRadius * 1.9, baseRadius * 2.15, 48);
        collarGeometry.rotateX(-Math.PI / 2);

        const collar  =  new THREE.Mesh(collarGeometry, collarMaterial);
        collar.position.y  =  0.006;
        module.BodyGroup.add(collar);

        return {
            Post   : post,
            Column : column,
            Collar : collar,
            Height : height
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Implementation
// -----------------------------------------------------------------------------

    // MODULE OBJECT | The Output Post Module Type
    // ------------------------------------------------------------
    export const NaAudio__Module__OutputPost  =  {

        // BUILD
        Build : function (module) {
            module.Settings.Runtime  =  NaAudio__OutputPost__BuildBody(module);
        },


        // AUDIO INPUT
        // The master bus itself. Every cable arriving here connects straight into the
        // node that feeds the limiter, the master analyser and the destination - which is
        // what makes 'patched into the post' and 'audible' the same statement.
        AudioInput : function () {
            return AudioHost.NaAudio__AudioHost__MasterInput();
        },


        // UPDATE
        // The column follows the MASTER meter, not this module's bus. Nothing is ever
        // connected to a post's own output, so its bus reads silence forever and a
        // column driven from it would never move.
        Update : function (module) {
            const runtime  =  module.Settings.Runtime;
            if (!runtime) return;

            const level  =  AudioHost.NaAudio__AudioHost__MasterLevel();

            // Eased upward fast and downward slowly, which is what a meter has to do to
            // be readable - a column tracking RMS exactly is a blur at any real tempo.
            const target   =  Math.max(level, 0.001);
            const current  =  runtime.Column.scale.y;
            const rate     =  (target > current) ? 0.45 : 0.08;

            runtime.Column.scale.y  =  current + (target - current) * rate;
        },


        // SELECTION
        OnSelected : function (module, isSelected) {
            const runtime  =  module.Settings.Runtime;
            if (!runtime) return;

            runtime.Collar.material.opacity  =  isSelected ? 0.9 : 0.5;
        },


        // DISPOSE
        // Nothing to release. The post holds no audio nodes of its own - it borrows the
        // master bus - and its geometry and materials are owned by the meshes, which the
        // scene manager disposes with the body group.
        Dispose : function () {}
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
