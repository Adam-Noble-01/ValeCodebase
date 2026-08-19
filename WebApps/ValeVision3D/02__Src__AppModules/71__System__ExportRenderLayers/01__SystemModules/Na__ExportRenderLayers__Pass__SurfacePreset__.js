// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - COMPOSED SURFACE PRESETS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__Pass__SurfacePreset__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Composed Surface Presets
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Put every structural surface onto one export-only material for
//              the duration of a composed render, and take it straight back
//              off afterwards.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Two passes are COMPOSED rather than derived: Clay Render and Line Art.
//   Both go through the existing tiled beauty exporter, so ValeVision's own
//   profile lines, exact CAD linework, fog, FXAA and vertical correction all
//   behave exactly as they already do. Only the surface materials change.
// - That is why this file is a PRESET rather than a pass generator: it has no
//   render step at all. It supplies apply() and revert(), and the batch
//   exporter wraps the beauty render between them.
//
// THE TWO PRESETS:
// - clay     - a neutral unlit-looking architectural render. Flat, even, no
//              material palette, exact linework retained. This is the image a
//              Qwen edit model reads as "the building, without the finishes".
// - lineart  - flat white surfaces with NO shading at all, which leaves the
//              profile-line pass and the exact CAD linework as the only marks
//              on the page. ValeVision's own profile-line renderer produces a
//              far better architectural line drawing than a hand-rolled edge
//              composite does, because it is the same renderer that has been
//              tuned against real Vale models for years. Line Art therefore
//              uses it rather than deriving edges from a G-buffer.
//
// AMBIENT OCCLUSION SUPPRESSION:
// - Line Art additionally switches ambient occlusion off for the duration of
//   the render, because a soft occlusion gradient in the corners of a line
//   drawing is exactly the kind of tonal information the pass exists to
//   remove. Ambient occlusion is a MaxEngine capability, so the call is
//   guarded and is a no-op under PureEngine, which never had it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation as the Whitecard preset.
//
// 19-Aug-2026 - Version 1.1.0
// - Generalised to two presets. Whitecard renamed to Clay throughout, and
//   Line Art moved off its hand-rolled edge composite onto the composed
//   profile-line path.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Preset Identifiers
    // ------------------------------------------------------------
    const Na__ErlPreset__CLAY     = 'clay';
    const Na__ErlPreset__LINE_ART = 'lineart';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Colour Config Value With a Fallback
    // ------------------------------------------------------------
    function Na__ErlPreset__ReadColour(config, key, fallback) {
        const value = config ? config[key] : undefined;
        if (typeof value !== 'string' || !value.startsWith('#')) return fallback;
        const parsed = parseInt(value.slice(1), 16);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Neutral Clay Surface Material
    // ------------------------------------------------------------
    // Lit, so the massing still reads, but with no material identity and no
    // environment tint. envMapIntensity rather than nulling scene.environment,
    // because nulling it would invalidate the shader programs of every live
    // material and cost a visible hitch when the export finishes.
    // ------------------------------------------------------------
    function Na__ErlPreset__CreateClayMaterial(config) {
        const material = new THREE.MeshStandardMaterial({
            color           : Na__ErlPreset__ReadColour(config, 'ExportRenderLayers__Config__ClayColourHex', 0xf2f0ec),
            roughness       : Number.isFinite(config.ExportRenderLayers__Config__ClayRoughness)
                ? config.ExportRenderLayers__Config__ClayRoughness
                : 0.9,
            metalness       : 0.0,
            side            : THREE.DoubleSide,
            envMapIntensity : 0.0
        });
        material.name = 'ExportRenderLayers_ClaySurface';
        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Flat Line Art Surface Material
    // ------------------------------------------------------------
    // Unlit and pure white on purpose. Every tonal cue is removed so the only
    // marks left in the composed frame are the profile lines and the exact
    // CAD linework, which is what makes this a line drawing rather than a
    // very pale render.
    // ------------------------------------------------------------
    function Na__ErlPreset__CreateLineArtMaterial(config) {
        const material = new THREE.MeshBasicMaterial({
            color : Na__ErlPreset__ReadColour(config, 'ExportRenderLayers__Config__BackgroundColourLineArtHex', 0xffffff),
            side  : THREE.DoubleSide,
            fog   : false                                                // <-- Fog would grey the far end of a drawing
        });
        material.toneMapped = false;                                     // <-- No tone curve on a flat white page
        material.name = 'ExportRenderLayers_LineArtSurface';
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Preset Lifecycle
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Force Ambient Occlusion Off, Reporting Whether It Moved
    // ------------------------------------------------------------
    // toggleAo flips the state and returns the NEW state, so switching it off
    // deterministically means toggling and then correcting if it landed on.
    // Returns true when this call actually changed something, so revert()
    // knows whether it owes a toggle back.
    // ------------------------------------------------------------
    function Na__ErlPreset__SuppressAmbientOcclusion(getPipelineState) {
        const pipeline = (typeof getPipelineState === 'function') ? getPipelineState() : null;
        if (!pipeline || typeof pipeline.toggleAo !== 'function') return false;   // <-- PureEngine never had it

        const stateAfterToggle = pipeline.toggleAo();
        if (stateAfterToggle === true) {
            pipeline.toggleAo();                                         // <-- It was already off; put it back
            return false;
        }

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Switch Ambient Occlusion Back On
    // ------------------------------------------------------------
    function Na__ErlPreset__RestoreAmbientOcclusion(getPipelineState) {
        const pipeline = (typeof getPipelineState === 'function') ? getPipelineState() : null;
        if (!pipeline || typeof pipeline.toggleAo !== 'function') return;
        pipeline.toggleAo();
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Composed Surface Preset
    // ------------------------------------------------------------
    // kind {'clay'|'lineart'}
    //
    // Returns { apply(options), revert() }.
    //
    // apply() options: { classification, guard, config, getPipelineState }
    // The guard remembers every material before it is replaced, so revert()
    // is belt-and-braces - the guard alone would already restore the scene.
    // revert() is idempotent and safe to call after a mid-pass throw.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__SurfacePreset__Create(kind) {
        const presetKind = (kind === Na__ErlPreset__LINE_ART) ? Na__ErlPreset__LINE_ART : Na__ErlPreset__CLAY;

        let surfaceMaterial   = null;
        let touchedObjects    = [];
        let pipelineGetter    = null;
        let occlusionWasOn    = false;


        return {

            // FUNCTION | Swap Every Structural Surface to the Preset Material
            // ------------------------------------------------------------
            apply(options) {
                const { classification, guard, config, getPipelineState = null } = options;

                pipelineGetter  = getPipelineState;
                surfaceMaterial = (presetKind === Na__ErlPreset__LINE_ART)
                    ? Na__ErlPreset__CreateLineArtMaterial(config)
                    : Na__ErlPreset__CreateClayMaterial(config);

                if (presetKind === Na__ErlPreset__LINE_ART) {
                    occlusionWasOn = Na__ErlPreset__SuppressAmbientOcclusion(pipelineGetter);
                }

                touchedObjects = [];

                classification.meshes.forEach((entry) => {
                    guard.rememberMaterial(entry.object);                // <-- Remember BEFORE the swap
                    touchedObjects.push({ object: entry.object, original: entry.object.material });

                    entry.object.material = Array.isArray(entry.object.material)
                        ? entry.object.material.map(() => surfaceMaterial)     // <-- Preserve slot count
                        : surfaceMaterial;
                });
            },
            // ------------------------------------------------------------


            // FUNCTION | Put the Original Materials Back and Dispose the Preset
            // ------------------------------------------------------------
            revert() {
                touchedObjects.forEach((record) => { record.object.material = record.original; });
                touchedObjects = [];

                if (occlusionWasOn) {
                    Na__ErlPreset__RestoreAmbientOcclusion(pipelineGetter);
                    occlusionWasOn = false;
                }

                if (surfaceMaterial) { surfaceMaterial.dispose(); surfaceMaterial = null; }
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Composed Surface Preset API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__SurfacePreset__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
