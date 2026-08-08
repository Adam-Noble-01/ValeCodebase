/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | LABELS 3D
   =============================================================================

   FILE       : NaAudio__Env3d__Labels3d__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - Labels3d
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Name plates that float above modules and fade with distance
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Renders a short string to a 2D canvas, uploads it as a texture and hangs it in
     the scene as a sprite so it always faces the camera.
   - Deliberately not a DOM overlay. A DOM label has to be reprojected and
     repositioned every frame from the camera matrix, which means reading layout
     from JavaScript at frame rate and fighting the browser's own compositor. A
     sprite is part of the scene graph and costs one quad.

   ---------------------------------------------------------------------------

   LABELS FADE OUT, AND THAT IS THE POINT

   Beyond MaxRenderDistance a label fades to nothing. This is not an optimisation
   dressed up as a feature.

   The premise of the application is that the user navigates by spatial memory -
   the method of loci the manifest names directly. Twenty name plates legible
   across the horizon at once replaces that with reading, and reading a wall of
   text is exactly the cognitive load a 3D DAW is supposed to remove. Names are
   there to confirm what you already half-remember when you get close to it.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dString, Env3dBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Materials                           from './NaAudio__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Labels 3D
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Canvas Rendering
    // ------------------------------------------------------------
    const NAME_LABEL        =  'NaAudio__Env3d__Label';

    const FADE_START_FACTOR =  0.72;                                         // <-- Fade begins at this fraction of the max distance
    const MIN_OPACITY       =  0.0;

    const SCRATCH_CAMERA_POS  =  new THREE.Vector3();
    const SCRATCH_LABEL_POS   =  new THREE.Vector3();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Texture Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Render a String to a Canvas Texture
    // ------------------------------------------------------------
    // Canvas dimensions are powers-of-two-friendly multiples rather than exactly
    // the text width, because a non-power-of-two texture disables mipmapping on some
    // drivers and the label then aliases badly at distance.
    function NaAudio__Env3d__Labels3d__RenderTexture(text, subtitle) {
        const fontSize  =  Env3dNumber('Labels', 'FontSizePx');
        const padding   =  Env3dNumber('Labels', 'PaddingPx');
        const fontStack =  Env3dString('Labels', 'FontStack');

        const measureCanvas   =  document.createElement('canvas');
        const measureContext  =  measureCanvas.getContext('2d');
        measureContext.font   =  '600 ' + fontSize + 'px ' + fontStack;
        const titleWidth      =  measureContext.measureText(text).width;

        measureContext.font        =  '400 ' + (fontSize * 0.72) + 'px ' + fontStack;
        const subtitleWidth        =  subtitle ? measureContext.measureText(subtitle).width : 0;

        const contentWidth   =  Math.max(titleWidth, subtitleWidth);
        const lineHeight     =  fontSize * 1.18;
        const contentHeight  =  subtitle ? lineHeight * 1.78 : lineHeight;

        const canvasWidth   =  Math.ceil((contentWidth  + padding * 2) / 4) * 4;
        const canvasHeight  =  Math.ceil((contentHeight + padding * 2) / 4) * 4;

        const canvas   =  document.createElement('canvas');
        canvas.width   =  canvasWidth;
        canvas.height  =  canvasHeight;

        const context  =  canvas.getContext('2d');

        // BACKING PLATE - a soft paper card behind the text, so a label stays legible
        // over a dark pigment as well as over the pale floor.
        //
        // The colours here are the only hex literals in the 3D pipeline. Canvas 2D takes
        // CSS colour strings and cannot be handed a THREE.Color, so the palette cannot
        // reach this call. They mirror Cream, Ink and InkFaint in Na__Palette__Config.json
        // and must be changed with them.
        context.fillStyle     =  'rgba(247, 242, 231, 0.86)';
        context.strokeStyle   =  'rgba(43, 42, 40, 0.16)';
        context.lineWidth     =  2;
        NaAudio__Env3d__Labels3d__RoundedRect(context, 1, 1, canvasWidth - 2, canvasHeight - 2, 10);
        context.fill();
        context.stroke();

        context.textAlign     =  'center';
        context.textBaseline  =  'middle';

        const centreX  =  canvasWidth / 2;

        context.fillStyle  =  '#2B2A28';                                      // <-- Ink. Canvas 2D has no access to the palette's THREE.Color
        context.font       =  '600 ' + fontSize + 'px ' + fontStack;
        context.fillText(text, centreX, subtitle ? canvasHeight * 0.38 : canvasHeight / 2);

        if (subtitle) {
            context.fillStyle  =  '#8C857A';                                  // <-- InkFaint
            context.font       =  '400 ' + (fontSize * 0.72) + 'px ' + fontStack;
            context.fillText(subtitle, centreX, canvasHeight * 0.70);
        }

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.colorSpace     =  THREE.SRGBColorSpace;                       // <-- Canvas output is sRGB; without this the plate reads washed out
        texture.anisotropy     =  4;
        texture.needsUpdate    =  true;

        return { Texture: texture, Width: canvasWidth, Height: canvasHeight };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Trace a Rounded Rectangle Path
    // ------------------------------------------------------------
    function NaAudio__Env3d__Labels3d__RoundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Label Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Name Plate Sprite
    // ------------------------------------------------------------
    export function NaAudio__Env3d__Labels3d__Build(text, subtitle) {
        if (!Env3dBool('Labels', 'Enabled')) return null;

        const rendered  =  NaAudio__Env3d__Labels3d__RenderTexture(text, subtitle);
        const material  =  Materials.NaAudio__Materials__OwnedLabel(rendered.Texture);

        const sprite  =  new THREE.Sprite(material);
        sprite.name   =  NAME_LABEL;

        const pixelsPerUnit  =  Env3dNumber('Labels', 'PixelsPerWorldUnit');
        sprite.scale.set(rendered.Width / pixelsPerUnit, rendered.Height / pixelsPerUnit, 1);

        sprite.userData.NaAudio__Pickable  =  false;                          // <-- A name plate is never a control
        sprite.userData.NaAudio__IsLabel   =  true;                           // <-- Found by the per-frame fade sweep

        return sprite;
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace the Text on an Existing Label
    // ------------------------------------------------------------
    // Disposes the old texture. Without that, renaming a module twenty times leaks
    // twenty canvas textures, which is quietly enormous - each one is a full
    // uncompressed RGBA upload.
    export function NaAudio__Env3d__Labels3d__SetText(sprite, text, subtitle) {
        if (!sprite || !sprite.material) return;

        const previous  =  sprite.material.map;
        const rendered  =  NaAudio__Env3d__Labels3d__RenderTexture(text, subtitle);

        sprite.material.map  =  rendered.Texture;
        sprite.material.needsUpdate  =  true;
        if (previous && typeof previous.dispose === 'function') previous.dispose();

        const pixelsPerUnit  =  Env3dNumber('Labels', 'PixelsPerWorldUnit');
        sprite.scale.set(rendered.Width / pixelsPerUnit, rendered.Height / pixelsPerUnit, 1);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Distance Fade
// -----------------------------------------------------------------------------

    // FUNCTION | Fade Every Label in a Group by Its Distance From the Camera
    // ------------------------------------------------------------
    // Registered as one update hook by the 3D bootstrap and walks the shell group
    // once per frame. One sweep over a few dozen sprites is cheaper than each
    // module registering its own hook and each hook doing its own matrix read.
    export function NaAudio__Env3d__Labels3d__UpdateFade(camera, group) {
        if (!camera || !group) return;
        if (!Env3dBool('Labels', 'Enabled')) return;

        const maxDistance   =  Env3dNumber('Labels', 'MaxRenderDistance');
        const fadeStart     =  maxDistance * FADE_START_FACTOR;
        const fadeRange     =  Math.max(maxDistance - fadeStart, 0.001);

        camera.getWorldPosition(SCRATCH_CAMERA_POS);

        group.traverse(function (object3d) {
            if (!object3d.userData || object3d.userData.NaAudio__IsLabel !== true) return;

            object3d.getWorldPosition(SCRATCH_LABEL_POS);
            const distance  =  SCRATCH_CAMERA_POS.distanceTo(SCRATCH_LABEL_POS);

            if (distance >= maxDistance) {
                object3d.visible  =  false;
                return;
            }

            object3d.visible  =  true;

            if (distance <= fadeStart) {
                object3d.material.opacity  =  1.0;
                return;
            }

            const fade  =  1 - (distance - fadeStart) / fadeRange;
            object3d.material.opacity  =  Math.max(fade, MIN_OPACITY);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Configured Label Standoff Height
    // ------------------------------------------------------------
    // Exposed so the module shell can hang its plate above the cage without knowing
    // where the number lives.
    export function NaAudio__Env3d__Labels3d__HeightAboveModule() {
        return Env3dNumber('Labels', 'HeightAboveModule');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
