// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - DETERMINISTIC COLOUR HASH
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__ColourHash__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Deterministic Colour Hash
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn a stable string key into a flat, well-separated RGB colour
//              so object, category and material ID masks are reproducible
//              across repeated exports of an unchanged scene.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - THREE object uuids are regenerated on every load, so they can never drive
//   an ID mask that has to match between two export sessions. Keys here are
//   category path plus object name, category name, or material name.
// - FNV-1a 32-bit: fast, no dependencies, and well distributed for short
//   ASCII keys. The 32 bits are split into a hue-led HSL colour rather than
//   raw RGB bytes so adjacent hash values stay visually distinguishable, which
//   matters when a human has to read an ID mask.
// - Every channel is floored at a small non-zero value so no generated ID can
//   collide with the pure black mask background.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | FNV-1a 32-Bit Parameters
    // ------------------------------------------------------------
    const Na__ErlHash__FNV_OFFSET_BASIS = 0x811c9dc5;
    const Na__ErlHash__FNV_PRIME        = 0x01000193;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Colour Spread
    // ------------------------------------------------------------
    const Na__ErlHash__MIN_CHANNEL      = 24;    // <-- Floor so no ID collides with a black background
    const Na__ErlHash__SATURATION_MIN   = 0.55;  // <-- Keep IDs vivid enough to read by eye
    const Na__ErlHash__SATURATION_SPAN  = 0.35;
    const Na__ErlHash__LIGHTNESS_MIN    = 0.35;
    const Na__ErlHash__LIGHTNESS_SPAN   = 0.30;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hashing
// -----------------------------------------------------------------------------

    // FUNCTION | Hash a String to an Unsigned 32-Bit Integer
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__HashString(key) {
        let hash = Na__ErlHash__FNV_OFFSET_BASIS;
        const text = String(key || '');

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i) & 0xff;
            hash = Math.imul(hash, Na__ErlHash__FNV_PRIME);              // <-- imul keeps the 32-bit wrap exact
        }

        return hash >>> 0;                                               // <-- Unsigned
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Hue, Saturation and Lightness to RGB Bytes
    // ------------------------------------------------------------
    // Written out rather than routed through THREE.Color so the byte values
    // recorded in the manifest are exactly the bytes written to the PNG,
    // with no colour-space transfer applied anywhere in between.
    // ------------------------------------------------------------
    function Na__ErlHash__HslToRgbBytes(hue, saturation, lightness) {
        const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const sector = hue * 6;
        const second = chroma * (1 - Math.abs((sector % 2) - 1));
        const match  = lightness - chroma / 2;

        let r = 0, g = 0, b = 0;
        if      (sector < 1) { r = chroma; g = second; b = 0;      }
        else if (sector < 2) { r = second; g = chroma; b = 0;      }
        else if (sector < 3) { r = 0;      g = chroma; b = second; }
        else if (sector < 4) { r = 0;      g = second; b = chroma; }
        else if (sector < 5) { r = second; g = 0;      b = chroma; }
        else                 { r = chroma; g = 0;      b = second; }

        return [
            Math.max(Na__ErlHash__MIN_CHANNEL, Math.round((r + match) * 255)),
            Math.max(Na__ErlHash__MIN_CHANNEL, Math.round((g + match) * 255)),
            Math.max(Na__ErlHash__MIN_CHANNEL, Math.round((b + match) * 255))
        ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive a Deterministic Flat Colour From a Stable Key
    // ------------------------------------------------------------
    // Returns { hex, rgb: [r, g, b], css } where hex is a 24-bit integer
    // suitable for THREE.Color and rgb holds the exact PNG bytes.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__ColourFromKey(key) {
        const hash = Na__ExportRenderLayers__HashString(key);

        const hue        = ((hash >>> 16) & 0xffff) / 65536;
        const saturation = Na__ErlHash__SATURATION_MIN + (((hash >>> 8) & 0xff) / 255) * Na__ErlHash__SATURATION_SPAN;
        const lightness  = Na__ErlHash__LIGHTNESS_MIN  + ((hash & 0xff) / 255) * Na__ErlHash__LIGHTNESS_SPAN;

        const rgb = Na__ErlHash__HslToRgbBytes(hue, saturation, lightness);
        const hex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];

        return {
            hex,
            rgb,
            css : `#${hex.toString(16).padStart(6, '0')}`
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Deterministic Colour Hash API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__HashString,
        Na__ExportRenderLayers__ColourFromKey
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
