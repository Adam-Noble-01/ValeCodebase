// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - GRAY CONTROL PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__GrayControl__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Gray Control Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A neutral monochrome clay view with the scene's real lighting
//              and shadows, no material colour, and optional exact linework.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Gray is a first-class Qwen control type: the Fun Union 2602 weight adds it
//   explicitly. It is also a genuinely useful image-edit reference on its own,
//   because it communicates light, volume and surface relief without committing
//   to a material palette.
// - Real directional lighting and shadow maps are used exactly as the live
//   scene has them. What is suppressed is material identity - colour, texture,
//   metalness and roughness are all replaced by one fixed clay.
// - Environment reflections are suppressed by envMapIntensity rather than by
//   nulling scene.environment. Nulling it would invalidate the shader programs
//   of every live material and cost a visible hitch when the export finishes;
//   the intensity route touches only this one export material.
// - Because the lighting rig is shared, PureEngine and MaxEngine produce
//   comparable Gray output. It is registered as adapter-specific rather than
//   engine-parity-critical, since environment lighting still differs slightly
//   between the two pipelines.
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

    // MODULE IMPORTS | Export Line Material Factory
    // @delegate: ./Na__ExportRenderLayers__ExportLineMaterial__.js
    // ------------------------------------------------------------
    import {
        Na__ExportRenderLayers__CreateExportLineMaterial,
        Na__ExportRenderLayers__ResolveLiveLineResolution,
        Na__ExportRenderLayers__ApplyExportLineWidth
    } from './Na__ExportRenderLayers__ExportLineMaterial__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clay Material Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Neutral Clay Material
    // ------------------------------------------------------------
    // Exposed so the tiled pass renderer can reuse it as the greyscale
    // luminance reference for the Canny and HED-compatible families.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CreateClayMaterial(options) {
        const { colourHex = 0xb4b4b4, roughness = 0.85 } = options || {};

        const material = new THREE.MeshStandardMaterial({
            color            : colourHex,
            roughness        : roughness,
            metalness        : 0.0,
            side             : THREE.DoubleSide,
            fog              : false,
            flatShading      : false,
            envMapIntensity  : 0.0                                       // <-- Suppress reflections without touching scene.environment
        });
        material.name = 'ExportRenderLayers_NeutralClay';
        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Colour Config Value With a Fallback
    // ------------------------------------------------------------
    function Na__ErlGray__ReadColour(config, key, fallback) {
        const value = config ? config[key] : undefined;
        if (typeof value !== 'string' || !value.startsWith('#')) return fallback;
        const parsed = parseInt(value.slice(1), 16);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generator
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Gray Control Pass Generator
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Pass__GrayControl() {
        let clayMaterial    = null;
        let lineMaterial    = null;
        let includeLines    = false;
        let baseLineWidthPx = 1.6;


        return {

            needsGBuffer   : false,
            needsLuminance : false,


            // FUNCTION | Build the Clay and Optional Line Materials
            // ------------------------------------------------------------
            begin(ctx) {
                includeLines = ctx.config.ExportRenderLayers__Config__GrayIncludeLinework === true;

                clayMaterial = Na__ExportRenderLayers__CreateClayMaterial({
                    colourHex : Na__ErlGray__ReadColour(ctx.config, 'ExportRenderLayers__Config__GrayBaseColourHex', 0xb4b4b4),
                    roughness : Number.isFinite(ctx.config.ExportRenderLayers__Config__GrayRoughness)
                        ? ctx.config.ExportRenderLayers__Config__GrayRoughness
                        : 0.85
                });
                ctx.surfaces.applyClipping(clayMaterial);

                if (!includeLines) return;

                baseLineWidthPx = Number.isFinite(ctx.config.ExportRenderLayers__Config__LineArtLineWidthPx)
                    ? ctx.config.ExportRenderLayers__Config__LineArtLineWidthPx
                    : 1.6;

                lineMaterial = Na__ExportRenderLayers__CreateExportLineMaterial({
                    colourHex      : 0x303030,                           // <-- Soft graphite, not pure black; the clay is mid grey
                    lineWidthPx    : baseLineWidthPx,
                    liveResolution : Na__ExportRenderLayers__ResolveLiveLineResolution(ctx.classification),
                    lineworkConfig : ctx.lineworkConfig
                });
                ctx.surfaces.applyClipping(lineMaterial);

                ctx.classification.lineObjects.forEach((object) => {
                    ctx.guard.rememberMaterial(object);                  // <-- Remember BEFORE the swap
                    object.material = lineMaterial;
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Draw One Gray Control Tile
            // ------------------------------------------------------------
            render(ctx) {
                ctx.surfaces.renderSurfaces({
                    renderer         : ctx.renderer,
                    scene            : ctx.scene,
                    camera           : ctx.camera,
                    target           : ctx.outputTarget,
                    overrideMaterial : clayMaterial,
                    clearColour      : 0xffffff,                         // <-- Neutral white sky behind the clay model
                    clearAlpha       : 1.0,
                    clear            : true
                });

                if (!includeLines) return;

                Na__ExportRenderLayers__ApplyExportLineWidth(lineMaterial, baseLineWidthPx, ctx);
                ctx.surfaces.renderLinework({
                    renderer : ctx.renderer,
                    scene    : ctx.scene,
                    camera   : ctx.camera,
                    target   : ctx.outputTarget,
                    clear    : false
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Export Materials
            // ------------------------------------------------------------
            end() {
                if (clayMaterial) { clayMaterial.dispose(); clayMaterial = null; }
                if (lineMaterial) { lineMaterial.dispose(); lineMaterial = null; }
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Gray Control Pass Generator
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Pass__GrayControl,
        Na__ExportRenderLayers__CreateClayMaterial
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
