/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | SNAPSHOT EXPORTER
   =============================================================================

   FILE       : VghLantern__Env3d__SnapshotExporter__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - SnapshotExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render the 3D view to a raster image for the drawing sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The bridge between the 3D environment and the drawing output. The Drawing
     Editor places front elevation, side elevation and plan as vector SVG, and the
     3D view as the raster image this module produces.
   - Renders offscreen at a supersampled size then hands back a PNG data URL, so
     the 3D view on a printed sheet holds up next to true vector linework.
   - Never captures the live canvas at screen size. The visible panel is sized for
     the UI, not for print, and capturing it would give a soft, low-resolution
     image at A3.

   ---------------------------------------------------------------------------

   WHY A SEPARATE RENDER RATHER THAN A CANVAS READ:
   The live renderer runs at the panel's pixel size with a capped device ratio.
   Print needs a specific pixel budget and a transparent background. This module
   temporarily resizes the renderer, draws once, reads the pixels, then restores
   the previous size - all inside one frame, so the user never sees a flicker.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireString,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__SceneManager__Resize, VghLantern__Env3d__SceneManager__Invalidate } from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Snapshot Exporter Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Output Guards
    // ------------------------------------------------------------
    const MAX_OUTPUT_PIXELS  =  36000000;                                    // <-- ~6000x6000; beyond this WebGL contexts start failing
    const MIN_OUTPUT_PX      =  64;                                          // <-- Below this an export is pointless
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Size Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Render Size for an Export
    // ------------------------------------------------------------
    // Honours a caller-supplied size, else the config default, then applies the
    // supersample factor and clamps to the safe pixel budget.
    function VghLantern__Env3d__SnapshotExporter__ResolveSize(options) {
        const opts  =  options || {};

        const baseWidth   =  Math.max(MIN_OUTPUT_PX, Number(opts.WidthPx)  || VghLantern__Env3d__ConfigAccess__RequireNumber('Snapshot', 'DefaultWidthPx'));
        const baseHeight  =  Math.max(MIN_OUTPUT_PX, Number(opts.HeightPx) || VghLantern__Env3d__ConfigAccess__RequireNumber('Snapshot', 'DefaultHeightPx'));
        const factor      =  Math.max(1, Number(opts.SupersampleFactor) || VghLantern__Env3d__ConfigAccess__RequireNumber('Snapshot', 'SupersampleFactor'));

        let width   =  Math.round(baseWidth  * factor);
        let height  =  Math.round(baseHeight * factor);

        // Scale both axes down together if the budget is exceeded, preserving aspect.
        const pixels  =  width * height;
        if (pixels > MAX_OUTPUT_PIXELS) {
            const shrink  =  Math.sqrt(MAX_OUTPUT_PIXELS / pixels);
            width   =  Math.round(width  * shrink);
            height  =  Math.round(height * shrink);
        }

        return { Width : width, Height : height, BaseWidth : baseWidth, BaseHeight : baseHeight };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capture
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Downscale a Canvas to the Requested Output Size
    // ------------------------------------------------------------
    // The supersampled render is averaged down here, which is what removes the
    // stair-stepping on profile edges that FXAA alone leaves behind.
    function VghLantern__Env3d__SnapshotExporter__Downscale(sourceCanvas, targetWidth, targetHeight, mimeType) {
        if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
            return sourceCanvas.toDataURL(mimeType);
        }

        const scratch   =  document.createElement('canvas');
        scratch.width   =  targetWidth;
        scratch.height  =  targetHeight;

        const context  =  scratch.getContext('2d');
        context.imageSmoothingEnabled  =  true;
        context.imageSmoothingQuality  =  'high';
        context.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

        return scratch.toDataURL(mimeType);
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Current 3D View as a Data URL
    // ------------------------------------------------------------
    // Returns null when the surface is not renderable, so the Drawing Editor can
    // fall back to leaving the 3D viewport frame empty rather than breaking.
    export function VghLantern__Env3d__SnapshotExporter__Capture(surface, options) {
        if (!surface || surface.IsDestroyed || !surface.Camera) return null;

        const size        =  VghLantern__Env3d__SnapshotExporter__ResolveSize(options);
        const mimeType    =  (options && options.MimeType) || VghLantern__Env3d__ConfigAccess__RequireString('Snapshot', 'OutputMimeType');
        const transparent =  (options && options.TransparentBackground !== undefined)
            ? options.TransparentBackground
            : VghLantern__Env3d__ConfigAccess__RequireBoolean('Snapshot', 'TransparentBackground');

        const renderer  =  surface.Renderer;

        // PRESERVE THE LIVE VIEW STATE
        const previousSize   =  renderer.getSize(new THREE.Vector2());
        const previousRatio  =  renderer.getPixelRatio();
        const previousAlpha  =  renderer.getClearAlpha();
        const previousAspect =  surface.Camera.aspect;

        try {
            renderer.setPixelRatio(1);                                        // <-- Size is explicit, so no device scaling
            renderer.setSize(size.Width, size.Height, false);
            if (transparent) renderer.setClearAlpha(0);

            surface.Camera.aspect  =  size.Width / size.Height;
            surface.Camera.updateProjectionMatrix();

            renderer.render(surface.Scene, surface.Camera);
            return VghLantern__Env3d__SnapshotExporter__Downscale(
                renderer.domElement, size.BaseWidth, size.BaseHeight, mimeType
            );

        } catch (err) {
            console.error('[VghLantern Env3d] Snapshot capture failed:', err);
            return null;

        } finally {
            // RESTORE, whatever happened above - a half-restored renderer would
            // leave the visible panel at print resolution.
            renderer.setPixelRatio(previousRatio);
            renderer.setSize(previousSize.x, previousSize.y, false);
            renderer.setClearAlpha(previousAlpha);
            surface.Camera.aspect  =  previousAspect;
            surface.Camera.updateProjectionMatrix();

            VghLantern__Env3d__SceneManager__Resize(surface);
            VghLantern__Env3d__SceneManager__Invalidate(surface);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture a Named Preset View Without Disturbing the User's Camera
    // ------------------------------------------------------------
    // Used by the Drawing Editor to grab a consistent isometric regardless of how
    // the user happens to have orbited the live view.
    export function VghLantern__Env3d__SnapshotExporter__CapturePreset(surface, presetKey, bounds, options, applyPresetFn) {
        if (!surface || !surface.Camera || typeof applyPresetFn !== 'function') return null;

        const savedPosition  =  surface.Camera.position.clone();
        const savedTarget    =  surface.Controls ? surface.Controls.target.clone() : null;

        // Sheet snapshots frame tighter than the live view: the bounding-sphere fit
        // plus the interactive padding leaves a wide flat lantern tiny in its frame.
        const framePadding    =  VghLantern__Env3d__ConfigAccess__RequireNumber('Snapshot', 'FramePaddingFactor');

        try {
            applyPresetFn(surface, presetKey, bounds, framePadding > 0 ? framePadding : null);
            return VghLantern__Env3d__SnapshotExporter__Capture(surface, options);

        } finally {
            surface.Camera.position.copy(savedPosition);
            if (savedTarget && surface.Controls) surface.Controls.target.copy(savedTarget);
            if (surface.Controls) surface.Controls.update();
            VghLantern__Env3d__SceneManager__Invalidate(surface);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
