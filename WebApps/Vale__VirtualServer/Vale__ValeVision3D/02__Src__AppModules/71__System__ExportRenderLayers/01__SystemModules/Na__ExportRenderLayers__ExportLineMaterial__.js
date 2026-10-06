// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - EXPORT LINE MATERIAL
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__ExportLineMaterial__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Export Line Material
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the export-only fat-line material a pass uses when it
//              needs to draw the exact CAD linework itself, at the same screen
//              weight the beauty exporter produces.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Only Gray Control uses this now, and only when its optional linework is
//   switched on. Every other pass that shows linework is COMPOSED: Line Art
//   and Canny Edges render through ValeVision's own profile-line pipeline,
//   which draws the model's real linework materials without replacing them.
// - The module survives the removal of the passes that once shared it because
//   the width-compensation convention below is genuinely easy to get wrong,
//   and it should exist in exactly one place when the next pass needs it.
//
// LINE WEIGHT, AND WHY IT IS NOT THE OBVIOUS THING:
// - LineMaterial converts its pixel linewidth into clip space against its own
//   resolution uniform. The tempting move is to set that uniform to the tile
//   framebuffer size, which is wrong: it makes a line one tile-pixel wide, so
//   at 6144px output the line ends up roughly three times thinner relative to
//   the frame than the viewport shows.
// - The beauty exporter solves it the other way round. It LEAVES every line
//   material's resolution at its load-time value and instead multiplies the
//   width by outputHeight / tileFramebufferHeight. This module follows exactly
//   that convention, so a line carries the same weight in a structural pass as
//   it does in the Beauty render.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Extracted from the Line Art pass module when Line Art moved to the
//   composed profile-line path and the MLSD and Linework Buffer passes were
//   removed. Content is unchanged; only the passes around it went away.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fat Line Material
    // ------------------------------------------------------------
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Line Material Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Live Load-Time Linework Resolution
    // ------------------------------------------------------------
    // Every model linework material shares the resolution the loader gave it,
    // and the beauty exporter deliberately never changes it. Export materials
    // must adopt the same value or their widths resolve on a different basis
    // and the two renders disagree.
    //
    // Falls back to a sensible viewport-scale value when the model has no
    // linework at all, which keeps a mesh-only project from dividing by zero.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__ResolveLiveLineResolution(classification) {
        const objects = (classification && classification.lineObjects) || [];

        for (let i = 0; i < objects.length; i++) {
            const material = objects[i].material;
            if (material && material.resolution && material.resolution.x > 0) {
                return material.resolution.clone();
            }
        }

        return new THREE.Vector2(1920, 1080);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Beauty Exporter's Line Width Compensation
    // ------------------------------------------------------------
    // material    {LineMaterial}
    // baseWidthPx {number}  The authored width, before compensation
    // ctx         {object}  Render context; ctx.height is the CURRENT tile
    //                       framebuffer height, ctx.outputHeight the full image
    //
    // Called per tile, because the tile framebuffer size is only known once
    // the tile plan exists. The base width is passed in rather than read back
    // off the material so repeated calls cannot compound.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__ApplyExportLineWidth(material, baseWidthPx, ctx) {
        if (!material || !Number.isFinite(baseWidthPx)) return;

        const tileHeight = Math.max(1, ctx.height || 1);
        const scale      = Math.max(1e-3, (ctx.outputHeight || tileHeight) / tileHeight);

        material.linewidth = baseWidthPx * scale;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Export-Only Fat Line Material
    // ------------------------------------------------------------
    // The depth bias mirrors the model loader's own linework bias so lines
    // resolve in front of the surface they sit on under the logarithmic
    // depth buffer, exactly as they do in the live viewport.
    //
    // liveResolution is the load-time resolution shared by the model's own
    // linework materials; see the module header for why it is not the tile
    // framebuffer size.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CreateExportLineMaterial(options) {
        const {
            colourHex      = 0x000000,
            lineWidthPx    = 1.6,
            liveResolution = null,
            lineworkConfig = null
        } = options;

        const material = new LineMaterial({
            color        : colourHex,
            linewidth    : lineWidthPx,
            resolution   : liveResolution ? liveResolution.clone() : new THREE.Vector2(1920, 1080),
            worldUnits   : false,
            vertexColors : false,                                        // <-- Export linework is single-colour by definition
            depthTest    : true,
            depthWrite   : true,
            transparent  : false,
            dashed       : false
        });
        material.toneMapped = false;
        material.name = 'ExportRenderLayers_ExportLine';

        const depthBias = (lineworkConfig && Number.isFinite(lineworkConfig.RenderConfig__Linework__DepthBias))
            ? lineworkConfig.RenderConfig__Linework__DepthBias
            : 0.00015;

        material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <logdepthbuf_fragment>',
                `#include <logdepthbuf_fragment>
                if (gl_FragDepth > 0.0) {
                    gl_FragDepth -= ${depthBias};
                }`
            );
        };

        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Export Line Material API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__CreateExportLineMaterial,
        Na__ExportRenderLayers__ResolveLiveLineResolution,
        Na__ExportRenderLayers__ApplyExportLineWidth
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
