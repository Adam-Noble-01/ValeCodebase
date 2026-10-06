// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - GLOBAL DEPTH RANGE
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__DepthRange__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Global Depth Range
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Calculate ONE view-space depth range for the whole output image,
//              before any depth-derived layer renders.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - ValeVision's camera near and far planes are deliberately broad so a whole
//   site stays in frustum. Normalising a depth map against them compresses an
//   entire orangery into a couple of grey levels. This module derives a tight
//   range from the geometry that is actually visible instead.
// - The range is calculated ONCE per preview or per export batch and is shared
//   by every tile. Per-tile normalisation would reset contrast at every tile
//   boundary, which is exactly the artefact the acceptance tests look for on a
//   facade spanning several tiles.
// - Bounds come from each visible structural mesh's own world-space bounding
//   box rather than one global box for the whole model. Eight corners per mesh
//   is cheap, runs once, and gives a materially tighter range on the oblique
//   views architects actually frame.
// - Output is in Three.js scene units, which ValeVision treats as metres. The
//   manifest records metres, with a millimetre equivalent for inspection.
//
// TWO STAGES, AND WHY THE SECOND ONE EXISTS:
// - Stage one derives a PROVISIONAL range from bounding boxes. On a real site
//   that range is far too wide, and the reason is structural rather than a bug:
//   the landscape plane's own bounding box straddles the camera, so the near
//   end collapses onto the camera near plane, and its far corner pushes the far
//   end out to the edge of the site. On the Doous orangery that gave 0.1 m to
//   99.9 m, which left the entire building inside bytes 102 to 191. A Qwen
//   depth adapter is trained on maps that use the whole range on the subject,
//   so a map that flat conditions weakly.
// - Stage two therefore MEASURES. The G-buffer is rendered once at probe
//   resolution, the normalised depth of every covered pixel is histogrammed,
//   and robust percentiles give the range the image actually occupies. That is
//   the same thing a per-image normalisation does for a learned depth
//   estimator, except here the depths are exact rather than inferred.
// - Percentiles rather than min and max, because one stray near-camera blade of
//   grass or one distant boundary post should not spend half the range.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Millimetre to Scene Unit Conversion
    // @delegate: ../../04__MathUtils/Na__Math__Units.js
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Derivation Modes (Probe Pass)
    // @delegate: ./Na__ExportRenderLayers__FullscreenPass__.js
    // ------------------------------------------------------------
    import { Na__ErlFullscreen__MODE as Na__ErlFullscreenModes } from './Na__ExportRenderLayers__FullscreenPass__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Scratch Objects
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Reused Working Objects (No Per-Mesh Allocation)
    // ------------------------------------------------------------
    const Na__ErlDepth__ScratchBox     = new THREE.Box3();
    const Na__ErlDepth__ScratchCorner  = new THREE.Vector3();
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Bounding Box Corner Selectors
    // ------------------------------------------------------------
    // Eight (x, y, z) picks that walk every corner of an axis-aligned box.
    // ------------------------------------------------------------
    const Na__ErlDepth__CORNER_PICKS = [
        [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
        [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Range Calculation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Accumulate One Mesh's World Bounds Into View-Space Depth
    // ------------------------------------------------------------
    // Returns { near, far } for this mesh alone, or null when the mesh has
    // no usable geometry bounds.
    // ------------------------------------------------------------
    function Na__ErlDepth__MeasureMesh(object, viewMatrix) {
        const geometry = object.geometry;
        if (!geometry) return null;

        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (!geometry.boundingBox) return null;

        Na__ErlDepth__ScratchBox.copy(geometry.boundingBox);
        Na__ErlDepth__ScratchBox.applyMatrix4(object.matrixWorld);      // <-- World-space AABB of this mesh

        const min = Na__ErlDepth__ScratchBox.min;
        const max = Na__ErlDepth__ScratchBox.max;

        let near = Infinity;
        let far  = -Infinity;

        for (let i = 0; i < 8; i++) {
            const pick = Na__ErlDepth__CORNER_PICKS[i];
            Na__ErlDepth__ScratchCorner.set(
                pick[0] ? max.x : min.x,
                pick[1] ? max.y : min.y,
                pick[2] ? max.z : min.z
            );
            Na__ErlDepth__ScratchCorner.applyMatrix4(viewMatrix);       // <-- Into camera view space

            const depth = -Na__ErlDepth__ScratchCorner.z;               // <-- View space looks down -Z; depth is positive forward
            if (depth < near) near = depth;
            if (depth > far)  far  = depth;
        }

        return { near, far };
    }
    // ------------------------------------------------------------


    // FUNCTION | Calculate the Global View-Space Depth Range for an Export
    // ------------------------------------------------------------
    // options:
    //   camera         {THREE.Camera}  The output camera, matrices already current
    //   classification {object}        Result of Na__ExportRenderLayers__Classify
    //   config         {object}        ExportRenderLayers__Config block
    //
    // Returns:
    //   {
    //     nearM, farM, rangeM,         <-- Scene units (metres)
    //     nearMm, farMm, rangeMm,      <-- Millimetre equivalents for the manifest
    //     invert,                      <-- Configured polarity flag
    //     meshCount,                   <-- How many meshes contributed
    //     isFallback                   <-- True when no geometry could be measured
    //   }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__DepthRange__Calculate(options) {
        const { camera, classification, config } = options;

        camera.updateMatrixWorld();
        const viewMatrix = camera.matrixWorldInverse;                   // <-- Kept current by updateMatrixWorld

        let near = Infinity;
        let far  = -Infinity;
        let meshCount = 0;

        const meshes = (classification && classification.meshObjects) || [];
        for (let i = 0, len = meshes.length; i < len; i++) {
            const measured = Na__ErlDepth__MeasureMesh(meshes[i], viewMatrix);
            if (!measured) continue;
            meshCount++;
            if (measured.near < near) near = measured.near;
            if (measured.far  > far)  far  = measured.far;
        }


        // FALLBACK | No measurable geometry - fall back to the camera planes
        // ------------------------------------------------------------
        if (meshCount === 0 || !Number.isFinite(near) || !Number.isFinite(far)) {
            const fallbackNear = Math.max(camera.near || 0.1, 0.01);
            const fallbackFar  = Math.max(fallbackNear + 1, camera.far || 1000);
            return Na__ErlDepth__Package(fallbackNear, fallbackFar, config, 0, true);
        }


        // CLAMP | Never let the near plane fall behind the camera
        // ------------------------------------------------------------
        const cameraNear = Math.max(camera.near || 0.1, 0.01);
        if (near < cameraNear) near = cameraNear;                       // <-- Geometry straddling the camera would otherwise give a negative near
        if (far  < near)       far  = near + cameraNear;


        // PADDING | Small configurable breathing room at both ends
        // ------------------------------------------------------------
        const paddingRatio = Number.isFinite(config && config.ExportRenderLayers__Config__DepthPaddingRatio)
            ? config.ExportRenderLayers__Config__DepthPaddingRatio
            : 0.02;
        const padding = (far - near) * Math.max(0, paddingRatio);

        near = Math.max(cameraNear, near - padding);
        far  = far + padding;

        return Na__ErlDepth__Package(near, far, config, meshCount, false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Package a Near/Far Pair Into the Public Range Shape
    // ------------------------------------------------------------
    // Enforces the configured minimum range so a single flat elevation-on
    // view cannot collapse into a divide-by-zero or a pure black image.
    // ------------------------------------------------------------
    function Na__ErlDepth__Package(near, far, config, meshCount, isFallback) {
        const minRangeMm = Number.isFinite(config && config.ExportRenderLayers__Config__DepthMinRangeMm)
            ? config.ExportRenderLayers__Config__DepthMinRangeMm
            : 1000;
        const minRangeUnits = Na__Math__ConvertMmToUnits(minRangeMm);   // <-- Config is integer mm; the scene is in units

        let rangeM = far - near;
        if (rangeM < minRangeUnits) {
            far    = near + minRangeUnits;
            rangeM = minRangeUnits;
        }

        return {
            nearM   : near,
            farM    : far,
            rangeM  : rangeM,
            nearMm  : Math.round(Na__Math__ConvertUnitsToMm(near)),
            farMm   : Math.round(Na__Math__ConvertUnitsToMm(far)),
            rangeMm : Math.round(Na__Math__ConvertUnitsToMm(rangeM)),
            invert  : !!(config && config.ExportRenderLayers__Config__DepthInvert),
            meshCount,
            isFallback
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measured Refinement
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Probe Defaults
    // ------------------------------------------------------------
    const Na__ErlDepth__PROBE_LONG_EDGE   = 256;    // <-- Long edge of the measurement render
    const Na__ErlDepth__PROBE_MIN_SAMPLES = 256;    // <-- Below this the measurement is not trusted
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the Histogram Bin Holding a Cumulative Fraction
    // ------------------------------------------------------------
    // Returns the bin index as a 0..1 position across the 256 buckets.
    // ------------------------------------------------------------
    function Na__ErlDepth__Percentile(histogram, totalSamples, fraction) {
        const targetCount = Math.max(1, Math.floor(totalSamples * fraction));
        let running = 0;

        for (let bin = 0; bin < 256; bin++) {
            running += histogram[bin];
            if (running >= targetCount) return bin / 255;
        }

        return 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Refine a Provisional Range From the Depths Actually On Screen
    // ------------------------------------------------------------
    // options:
    //   renderer, scene, camera
    //   gbuffer          {object}  Structural G-buffer pass
    //   fullscreen       {object}  Full screen derivation pass
    //   pool             {object}  Render target pool
    //   meshLayer        {number}  Export layer holding structural surfaces
    //   provisionalRange {object}  Result of Calculate()
    //   config           {object}  ExportRenderLayers__Config block
    //   outputWidth      {number}  Full output width, for the probe aspect
    //   outputHeight     {number}
    //
    // Returns a refined range in the same shape, or the provisional range
    // unchanged when the probe is disabled or finds too little geometry.
    //
    // The caller must have tagged the classification onto the export layers
    // before calling; nothing here mutates scene state that it does not
    // immediately put back.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__DepthRange__RefineFromRender(options) {
        const {
            renderer, scene, camera,
            gbuffer, fullscreen, pool, meshLayer,
            provisionalRange, config,
            outputWidth, outputHeight
        } = options;

        if (config.ExportRenderLayers__Config__DepthProbeEnabled === false) return provisionalRange;


        // PROBE SIZE | Long edge from config, short edge from the output aspect
        // ------------------------------------------------------------
        const longEdge = Number.isFinite(config.ExportRenderLayers__Config__DepthProbeLongEdgePx)
            ? Math.max(32, Math.round(config.ExportRenderLayers__Config__DepthProbeLongEdgePx))
            : Na__ErlDepth__PROBE_LONG_EDGE;

        const aspect = (outputHeight > 0) ? (outputWidth / outputHeight) : 1;
        const probeWidth  = (aspect >= 1) ? longEdge : Math.max(32, Math.round(longEdge * aspect));
        const probeHeight = (aspect >= 1) ? Math.max(32, Math.round(longEdge / aspect)) : longEdge;

        const savedAutoClear = renderer.autoClear;

        try {
            renderer.autoClear = false;                                  // <-- Explicit clears only, as everywhere else

            const structuralTarget = pool.acquireStructural(probeWidth, probeHeight);
            const outputTarget     = pool.acquireOutput(probeWidth, probeHeight);

            camera.updateMatrixWorld();

            gbuffer.render({
                renderer, scene, camera,
                target      : structuralTarget,
                depthRange  : provisionalRange,
                exportLayer : meshLayer
            });

            fullscreen.setPerTile({
                structuralTexture : structuralTarget.texture,
                luminanceTexture  : null,
                width             : probeWidth,
                height            : probeHeight,
                camera
            });

            fullscreen.render({
                renderer,
                target     : outputTarget,
                mode       : Na__ErlFullscreenModes.DEPTH_PROBE,
                background : 0x000000,
                edgeColour : 0x000000
            });


            // HISTOGRAM | Normalised depth of every covered pixel
            // ------------------------------------------------------------
            const pixels = new Uint8Array(probeWidth * probeHeight * 4);
            renderer.readRenderTargetPixels(outputTarget, 0, 0, probeWidth, probeHeight, pixels);

            const histogram = new Uint32Array(256);
            let sampleCount = 0;

            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i + 1] < 128) continue;                       // <-- G carries coverage
                histogram[pixels[i]]++;                                  // <-- R carries normalised depth
                sampleCount++;
            }

            if (sampleCount < Na__ErlDepth__PROBE_MIN_SAMPLES) {
                console.warn(`[ExportRenderLayers] Depth probe found only ${sampleCount} covered pixels; keeping the bounding-box range.`);
                return provisionalRange;
            }


            // PERCENTILES | Robust ends, so one stray sample cannot dominate
            // ------------------------------------------------------------
            const lowFraction = Number.isFinite(config.ExportRenderLayers__Config__DepthProbeLowPercentile)
                ? config.ExportRenderLayers__Config__DepthProbeLowPercentile
                : 0.02;
            const highFraction = Number.isFinite(config.ExportRenderLayers__Config__DepthProbeHighPercentile)
                ? config.ExportRenderLayers__Config__DepthProbeHighPercentile
                : 0.98;

            const lowNormalised  = Na__ErlDepth__Percentile(histogram, sampleCount, lowFraction);
            const highNormalised = Na__ErlDepth__Percentile(histogram, sampleCount, highFraction);


            // MAP BACK | Normalised positions become metres in the old range
            // ------------------------------------------------------------
            const measuredNear = provisionalRange.nearM + lowNormalised  * provisionalRange.rangeM;
            const measuredFar  = provisionalRange.nearM + highNormalised * provisionalRange.rangeM;

            if (!(measuredFar > measuredNear)) return provisionalRange;

            const cameraNear = Math.max(camera.near || 0.1, 0.01);
            const paddingRatio = Number.isFinite(config.ExportRenderLayers__Config__DepthPaddingRatio)
                ? config.ExportRenderLayers__Config__DepthPaddingRatio
                : 0.02;
            const padding = (measuredFar - measuredNear) * Math.max(0, paddingRatio);

            const refined = Na__ErlDepth__Package(
                Math.max(cameraNear, measuredNear - padding),
                measuredFar + padding,
                config,
                provisionalRange.meshCount,
                false
            );
            refined.measuredPixels = sampleCount;
            refined.probeSize      = `${probeWidth}x${probeHeight}`;

            console.log(
                `[ExportRenderLayers] Depth range refined from ${provisionalRange.nearM.toFixed(2)}-${provisionalRange.farM.toFixed(2)}m `
                + `to ${refined.nearM.toFixed(2)}-${refined.farM.toFixed(2)}m across ${sampleCount} probe pixels.`
            );

            return refined;

        } catch (probeError) {
            console.warn('[ExportRenderLayers] Depth probe failed; keeping the bounding-box range.', probeError);
            return provisionalRange;

        } finally {
            renderer.autoClear = savedAutoClear;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Global Depth Range API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__DepthRange__Calculate,
        Na__ExportRenderLayers__DepthRange__RefineFromRender
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
