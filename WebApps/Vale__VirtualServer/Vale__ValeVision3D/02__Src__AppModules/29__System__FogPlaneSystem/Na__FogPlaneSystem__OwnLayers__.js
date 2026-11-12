// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - LAYERS FOGGED BY THEIR OWN DISTANCE
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__OwnLayers__.js
// NAMESPACE  : Na__FogLayers
// MODULE     : System - Fog Plane System
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw the plants and people on their own just before the fog, so
//              the fog can fog them by their own distance and the model behind
//              them by its own
// CREATED    : 12-Nov-2026
//
// DESCRIPTION:
// - WHY (Adam, 12-Nov-2026: "Why is vegatation INFRONT of Fog being blocked by
//   it?", Corrett 64610). The fog works out each pixel's distance from the depth
//   the profile line normal pass leaves, on both engines. Fat lines are never in
//   that pass, and a plant's or figure's fill leaves it from the see-through
//   share (50%) so the wall's edges show through. So the fog measured whatever
//   was behind them: a hedge against the sky beyond a fog plane was painted out,
//   and even an opaque plant lost the sky side of its outline.
// - THE TEMPTING FIXES BRING BACK WHAT THEY FIXED. Back in that pass, a
//   see-through plant hides the wall's profile edges again, and under MaxEngine
//   the SSAO, which reads the same depth, turns a bush into a bunch of grapes. A
//   depth of their own and no more puts their distance on all that is seen
//   through them: a far line lost in the fog would show through a hedge and
//   nowhere else.
// - SO THE FOG DRAWS THEM AGAIN, ALONE. Every root directly in the scene whose
//   userData carries Na__FogPlane__IsOwnLayer is drawn by itself, with its own
//   materials and transparency, onto a clear ground, through the camera the fog
//   was handed for this picture. That gives, at each pixel, the layer's colour
//   already multiplied by its share (Pm), the share (A) and the layer's own
//   depth. The picture so far is C = Pm + (1 - A) B, B being what is behind, so
//   the fog shader lays the two together exactly:
//     out = Pm (1 - fP) + A fP fog + (1 - fB) (C - Pm) + (1 - A) fB fog
//   fP being the fog at the layer's depth and fB at the model's. Where the layer
//   is at the model's own depth (an opaque fill in the normal pass), fP = fB and
//   this is the old fog exactly.
// - INSIDE THE FOG PASS, SO EVERY PICTURE HAS IT. The live view, stills and
//   their tiles, thumbnails and video frames each run the composer, and each
//   hands the fog its camera first (Na__FogPlane__UpdateFogPassPerFrame). No
//   chain changes (note 10, trap T4).
// - NOTHING HAPPENS WITHOUT FOG. Fog off, no plane active, or no marked root
//   with anything to draw: no draw, no memory, and the shader takes the old
//   route. Entourage and Vegetation are on for every project, so an empty root
//   is the usual case and must cost nothing.
// - THE SAME SAMPLES AS THE COMPOSER, so the layer's edges are the picture's:
//   four under PureEngine, none under MaxEngine (FXAA does its edges there).
//   The colour is 8 bit: the sum takes it back out of a half float picture, and
//   an 8 bit step is far under what shows.
// - LIGHTS STAY ON. Everything else directly in the scene is hidden for the
//   draw, but not the lights: a plant's fill takes its tone from them before
//   each render (note 10, trap T31), and a proxy is lit. Hiding and showing
//   happen inside the one call, as the sheet layer's renderDrawingLayer does.
//
// INTEGRATION:
// - Called by Na__FogPlaneSystem__FogShaderEffect.js from inside the fog pass's
//   own render, before the shader runs; Release when the fog is switched off.
// - Roots marked by Na__Vegetation__SceneLayer__.js and
//   Na__Entourage__SceneLayer__.js.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Nov-2026 - Version 1.0.0 (ValeVision3D v2.98.1)
// - Initial build: plants and people in front of a fog plane are no longer
//   fogged by what is behind them.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and Variables
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Mark a Layer Root Carries
    // ------------------------------------------------------------
    const Na__FogLayers__MARK = 'Na__FogPlane__IsOwnLayer';                // <-- root.userData[MARK] === true, on a direct child of the scene
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Target and Reused Lists
    // ------------------------------------------------------------
    let   Na__FogLayers__Target      = null;                               // <-- Made on first need, resized to the composer's buffers
    const Na__FogLayers__Roots       = [];                                 // <-- This picture's marked roots
    const Na__FogLayers__Hidden      = [];                                 // <-- What this draw hid, to show again
    const Na__FogLayers__ClearColour = new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Has a Root Anything to Draw (Counts, Not Objects)
    // ------------------------------------------------------------
    // The layers empty their counts to hide (a fat line must never be hidden with
    // .visible), so an empty root still holds all its objects.
    // ------------------------------------------------------------
    function Na__FogLayers__HasSomethingToDraw(root) {
        let found = false;
        root.traverseVisible((object) => {
            if (found || !object.geometry) return;
            const geometry = object.geometry;
            if (geometry.isInstancedBufferGeometry && geometry.instanceCount === 0) return;   // <-- Fat lines and the instanced fill
            if (geometry.drawRange.count === 0) return;
            const position = geometry.getAttribute('position');
            if (!position || position.count === 0) return;
            found = true;
        });
        return found;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Target, the Composer's Size and Samples
    // ------------------------------------------------------------
    function Na__FogLayers__EnsureTarget(width, height, samples) {
        let target = Na__FogLayers__Target;
        if (target && target.samples !== samples) {
            target.dispose();
            target = null;
        }
        if (!target) {
            target = new THREE.WebGLRenderTarget(width, height, {
                type         : THREE.UnsignedByteType,
                format       : THREE.RGBAFormat,
                samples      : samples,
                depthTexture : new THREE.DepthTexture(width, height, THREE.FloatType)   // <-- Read back as the layer's own depth
            });
            target.texture.name = 'FogPlane_OwnLayers';
            Na__FogLayers__Target = target;
        } else if (target.width !== width || target.height !== height) {
            target.setSize(width, height);
        }
        return target;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Draw and Release
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Marked Layers Alone for This Picture
    // ------------------------------------------------------------
    // uniforms are the fog pass's own. uLayerOn is left at 0 unless a layer was
    // drawn, so the shader's old route is taken for anything else.
    // ------------------------------------------------------------
    function Na__FogLayers__Draw(renderer, scene, camera, readBuffer, uniforms) {
        uniforms['uLayerOn'].value = 0.0;
        if (!renderer || !scene || !camera || !readBuffer) return;
        if (uniforms['uFogEnabled'].value < 0.5) return;
        if (uniforms['uPlaneAActive'].value < 0.5 && uniforms['uPlaneBActive'].value < 0.5) return;
        if (scene.overrideMaterial) return;                                  // <-- Never inside a capture's own override pass

        const roots    = Na__FogLayers__Roots;
        const children = scene.children;
        roots.length = 0;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!child.visible || !child.userData || child.userData[Na__FogLayers__MARK] !== true) continue;
            if (Na__FogLayers__HasSomethingToDraw(child)) roots.push(child);
        }
        if (roots.length === 0) return;

        const target = Na__FogLayers__EnsureTarget(readBuffer.width, readBuffer.height, readBuffer.samples || 0);
        const hidden = Na__FogLayers__Hidden;
        const was    = {
            target     : renderer.getRenderTarget(),
            autoClear  : renderer.autoClear,
            clearAlpha : renderer.getClearAlpha(),
            shadowAuto : renderer.shadowMap.autoUpdate,
            background : scene.background
        };
        renderer.getClearColor(Na__FogLayers__ClearColour);

        try {
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (!child.visible || child.isLight || roots.indexOf(child) >= 0) continue;
                child.visible = false;                                       // <-- The model and every aid: only the layers and the lights draw
                hidden.push(child);
            }
            scene.background              = null;
            renderer.shadowMap.autoUpdate = false;                           // <-- Nothing here casts a shadow worth a fresh map
            renderer.setRenderTarget(target);
            renderer.setClearColor(0x000000, 0);
            renderer.clear(true, true, false);
            renderer.autoClear = false;
            renderer.render(scene, camera);                                  // <-- The layers' own hooks run again: the same view, one comparison each
        } finally {
            for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
            hidden.length = 0;
            scene.background              = was.background;
            renderer.shadowMap.autoUpdate = was.shadowAuto;
            renderer.setClearColor(Na__FogLayers__ClearColour, was.clearAlpha);
            renderer.autoClear = was.autoClear;
            renderer.setRenderTarget(was.target);
        }

        uniforms['tLayerColour'].value = target.texture;
        uniforms['tLayerDepth'].value  = target.depthTexture;
        uniforms['uLayerTexel'].value.set(1 / target.width, 1 / target.height);
        uniforms['uLayerOn'].value     = 1.0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Give Back the Target's Memory
    // ------------------------------------------------------------
    // The pass's samplers are emptied first: a disposed texture left bound to a
    // uniform is made again by three.js the next time the shader runs, empty but
    // at full size, so every fog off and on kept one more (measured, v2.98.1).
    // ------------------------------------------------------------
    function Na__FogLayers__Release(uniforms) {
        if (uniforms) {
            uniforms['uLayerOn'].value     = 0.0;
            uniforms['tLayerColour'].value = null;
            uniforms['tLayerDepth'].value  = null;
        }
        if (!Na__FogLayers__Target) return;
        Na__FogLayers__Target.dispose();                                     // <-- Its depth texture goes with it (three r184, deallocateRenderTarget)
        Na__FogLayers__Target = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Own Layers API
    // ------------------------------------------------------------
    export {
        Na__FogLayers__Draw,
        Na__FogLayers__Release
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
