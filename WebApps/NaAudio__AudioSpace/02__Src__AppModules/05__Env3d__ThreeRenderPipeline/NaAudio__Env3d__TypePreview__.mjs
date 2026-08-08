/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | TYPE PREVIEW
   =============================================================================

   FILE       : NaAudio__Env3d__TypePreview__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - TypePreview
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Photograph each module type once, for the palette
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Builds one real instance of a module type into an offscreen scene, renders it into
     an offscreen target through the MAIN renderer, reads the pixels back and hands out a
     data URL. Then throws the instance away.
   - One capture per type, on the first frame the palette is opened.

   ---------------------------------------------------------------------------

   WHY A REAL RENDER AND NOT A DRAWN ICON

   An icon is faster to make and wrong within a month. The palette's job is to answer
   'what am I about to place', and a hand-drawn glyph answers 'what did somebody think
   this looked like the day they drew it'. Every change to a module's geometry after that
   silently widens the gap, and nothing ever fails to make anybody go and redraw it.

   A photograph of the actual thing cannot drift, because there is nothing to keep in
   step - it is the same Build the space runs.

   ---------------------------------------------------------------------------

   WHY IT IS SAFE TO INSTANTIATE A MODULE FOR A PHOTOGRAPH

   Because of the output post. Since a module bus connects to nothing until a cable is
   patched into it, a module built outside the space is silent by construction - there is
   no route from it to the speakers and nothing to remember to mute. It is also never
   added to the registry, so nothing ever calls its Update or its Schedule.

   That is a rule paying for itself somewhere it was not designed for.

   ---------------------------------------------------------------------------

   THE MAIN RENDERER, NOT A SECOND ONE

   A second WebGLRenderer means a second GL context, a second copy of every shader it
   compiles and a real chance of hitting the browser's context limit in a tab that also
   has the space in it. Rendering into a WebGLRenderTarget and restoring the previous
   target costs none of that.

   readRenderTargetPixels stalls the GPU, which is why this happens once per type and on
   demand rather than at boot. Three stalls the first time somebody opens the palette is
   a cost nobody can perceive; three stalls during the boot sequence would be three
   stalls in the one place the application is already busiest.

   ============================================================================= */

import * as THREE from 'three';

import { SpatialNumber, NaAudio__ConfigAccess__ModuleTypeDefaults }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette          from './NaAudio__Env3d__PaletteLibrary__.mjs';
import {
    NaAudio__Env3d__SceneGroup,
    NaAudio__Env3d__SceneManager__DisposeSubtree
} from './NaAudio__Env3d__SceneManager__.mjs';
import * as ModuleBase       from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as AudioHost        from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';

// =============================================================================
// REGION | Type Preview
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Offscreen Rig, Built Once and Kept
    // ------------------------------------------------------------
    const CACHE  =  new Map();                                               // <-- TypeName -> data URL, or null if it failed

    let previewScene   =  null;
    let previewCamera  =  null;
    let renderTarget   =  null;
    let readBuffer     =  null;
    let flipCanvas     =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Offscreen Rig
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Scene, Camera, Lights and Target
    // ------------------------------------------------------------
    // Lit the same way the space is - a key from the same quarter and a soft fill - so a
    // thumbnail reads as the same object under the same light rather than as a differently
    // shaded copy of it.
    function NaAudio__TypePreview__EnsureRig(size) {
        if (previewScene) return;

        previewScene  =  new THREE.Scene();
        // The ISLAND tone, not the paper. A module's pad is a deep pigment chosen to read
        // against the ground it stands on, and photographed against bare paper it turns
        // into a hard dark diamond - the module looks like it is casting a hole. Against
        // the tone it actually stands on it reads the way it does in the space.
        previewScene.background  =  Palette.NaAudio__Palette__Ground('PaperDeep').clone();

        previewCamera  =  new THREE.PerspectiveCamera(34, 1, 0.1, 60);

        const key  =  new THREE.DirectionalLight(0xffffff, 1.25);
        key.position.set(3.2, 5.0, 4.2);
        previewScene.add(key);

        const fill  =  new THREE.HemisphereLight(0xffffff, 0x9a8f7d, 0.55);
        previewScene.add(fill);

        renderTarget  =  new THREE.WebGLRenderTarget(size, size, {
            minFilter : THREE.LinearFilter,
            magFilter : THREE.LinearFilter,
            format    : THREE.RGBAFormat
        });

        readBuffer  =  new Uint8Array(size * size * 4);

        flipCanvas         =  document.createElement('canvas');
        flipCanvas.width   =  size;
        flipCanvas.height  =  size;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Module Outside the Space
    // ------------------------------------------------------------
    // ModuleBase.Create is reused rather than reimplemented, by handing it a surface-like
    // object whose scene groups are the preview scene. Attach is deliberately NOT called:
    // it would register interaction handles, publish ModuleAdded, claim an island of
    // ground and subscribe to the mode - all of which belong to a module that is in the
    // space, and none of which belong to a photograph.
    //
    // The bus is made by hand for the same reason. It connects to nothing, so the module
    // is silent.
    function NaAudio__TypePreview__BuildInstance(typeName, implementation) {
        const surface  =  { Groups: {}, Scene: previewScene };
        surface.Groups[NaAudio__Env3d__SceneGroup.ModuleShells]  =  previewScene;
        surface.Groups[NaAudio__Env3d__SceneGroup.ModuleBodies]  =  previewScene;

        const module  =  ModuleBase.NaAudio__ModuleBase__Create(surface, {
            ModuleId    : 'PREVIEW_' + typeName,
            TypeName    : typeName,
            DisplayName : ' ',                                                // <-- A name plate would dominate a 168 pixel square
            Position    : { x: 0, z: 0 }
        }, implementation);

        module.Bus  =  AudioHost.NaAudio__AudioHost__CreateModuleBus(1.0);

        if (implementation && typeof implementation.Build === 'function') {
            implementation.Build(module);
        }

        if (module.Label) module.Label.visible  =  false;
        return module;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Frame the Camera on a Module's Declared Size
    // ------------------------------------------------------------
    function NaAudio__TypePreview__FrameCamera(typeName) {
        const defaults  =  NaAudio__ConfigAccess__ModuleTypeDefaults(typeName);
        const cage      =  defaults.CageSize;

        const extent   =  Math.max(cage.x, cage.y, cage.z);
        const distance =  extent * 2.15;

        previewCamera.position.set(distance * 0.62, distance * 0.60, distance * 0.72);
        previewCamera.lookAt(0, cage.y * 0.38, 0);
        previewCamera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capture
// -----------------------------------------------------------------------------

    // FUNCTION | The Thumbnail for a Type, Rendering It If Needed
    // ------------------------------------------------------------
    // Returns a data URL, or null if the type could not be built. Null is a real answer
    // and the palette draws a plain plate for it - a module type that throws while being
    // photographed should still be placeable.
    export function NaAudio__TypePreview__Capture(surface, typeName, implementation) {
        if (CACHE.has(typeName)) return CACHE.get(typeName);

        const size  =  Math.round(SpatialNumber('Placement', 'PreviewSizePx'));

        let module  =  null;
        let result  =  null;

        try {
            NaAudio__TypePreview__EnsureRig(size);
            module  =  NaAudio__TypePreview__BuildInstance(typeName, implementation);
            NaAudio__TypePreview__FrameCamera(typeName);

            const renderer       =  surface.Renderer;
            const previousTarget =  renderer.getRenderTarget();

            renderer.setRenderTarget(renderTarget);
            renderer.render(previewScene, previewCamera);
            renderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, readBuffer);
            renderer.setRenderTarget(previousTarget);

            result  =  NaAudio__TypePreview__BufferToDataUrl(size);

        } catch (error) {
            console.warn('[NaAudio TypePreview] Could not photograph "' + typeName + '", so the palette will show a plain plate for it. The type is still placeable. Reason:', error.message);
            result  =  null;

        } finally {
            if (module) NaAudio__TypePreview__DisposeInstance(module);
        }

        CACHE.set(typeName, result);
        return result;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Turn the Read Pixels Into an Image
    // ------------------------------------------------------------
    // Flipped on the way through. A render target's rows run bottom to top and a canvas's
    // run top to bottom, so a straight copy produces a module standing on its head - which
    // looks like a bug in the module rather than in the copy.
    function NaAudio__TypePreview__BufferToDataUrl(size) {
        const context  =  flipCanvas.getContext('2d');
        const image    =  context.createImageData(size, size);

        for (let y = 0; y < size; y++) {
            const source  =  (size - 1 - y) * size * 4;
            const target  =  y * size * 4;

            for (let x = 0; x < size * 4; x++) {
                image.data[target + x]  =  readBuffer[source + x];
            }
        }

        context.putImageData(image, 0, 0);
        return flipCanvas.toDataURL('image/png');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Throw the Photographed Instance Away
    // ------------------------------------------------------------
    function NaAudio__TypePreview__DisposeInstance(module) {
        try {
            if (module.Type && typeof module.Type.Dispose === 'function') module.Type.Dispose(module);
        } catch (error) { /* a half-built preview is still worth tearing down */ }

        try {
            if (module.Bus) { module.Bus.Output.disconnect(); module.Bus.Analyser.disconnect(); }
        } catch (error) { /* already gone */ }

        NaAudio__Env3d__SceneManager__DisposeSubtree(module.ShellGroup);
        NaAudio__Env3d__SceneManager__DisposeSubtree(module.BodyGroup);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
