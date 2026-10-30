/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | VOLUMETRIC CLOUDS - SETTINGS
   =============================================================================

   FILE       : PainterlyNPR__VolumetricClouds__Settings__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - VolumetricClouds - Settings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a cloud setting means: the cloud types, the ranges a value may
                take, and one resolved, clamped parameter set for the renderer
   CREATED    : 29-Oct-2026

   DESCRIPTION:
   - Pure: no WebGL, no DOM. Reads Na__VolumetricClouds__Config.json, nothing else.
   - A setting names a cloud type (a preset) and may override any of its numbers.
     Resolve returns every number the renderer needs, each inside its range, so a
     saved drawing with a stray value still draws - and draws the same.
   - The derived values (shape tile, weather tile, extinction) live here too, so the
     renderer never invents a number of its own (manifest section 14: JSON describes
     settings and recipes; code implements behaviour).

   ---------------------------------------------------------------------------

   WHY THE CLOUD SIZE DRIVES THREE TILES

   One "cloud size" moves the shape noise, the weather that decides where clouds
   stand, and the detail that erodes their edges together. Moving them apart reads
   as a different kind of cloud, not a bigger one: a large weather field over a
   small shape is a sky full of crumbs; a small weather field over a large shape is
   one cloud cut into slices. Their ratios are fixed here; the presets choose the
   size.

   ============================================================================= */

import Config from './Na__VolumetricClouds__Config.json' with { type: 'json' };

// =============================================================================
// REGION | Volumetric Clouds - Settings
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Ratios Between the Three Tiles, and the Extinction Scale
    // ------------------------------------------------------------
    const SHAPE_TILE_PER_SIZE    =  2.6;                                     // <-- One shape texture tile spans this many cloud sizes
    const WEATHER_TILE_PER_SIZE  =  5.5;                                     // <-- The weather field repeats far less often than the shapes
    const DETAIL_PER_SHAPE       =  5.0;                                     // <-- Detail noise runs this many times finer than the shape
    const EXTINCTION_PER_DENSITY =  14.0;                                    // <-- Per km at density 1: a kilometre of cloud is all but opaque
    const NUMERIC_KEYS           =  ['Coverage', 'BaseKm', 'ThicknessKm', 'ScaleKm', 'Density', 'Erosion', 'DriftKm', 'WindDeg'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading the Config
// -----------------------------------------------------------------------------

    // FUNCTION | The Whole Config, Read Only
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudSettings__Config() {
        return Config;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cloud Types a Host Can Offer, in the Config's Order
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudSettings__Presets() {
        return Object.entries(Config.Presets).map(([key, preset]) => ({ Key: key, Label: preset.Label }));
    }
    // ------------------------------------------------------------


    // FUNCTION | One Cloud Type's Numbers - a copy, for a host to start a setting from
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudSettings__Preset(key) {
        const preset  =  Config.Presets[key] || Config.Presets[Config.DefaultPreset];
        const out     =  { Preset: Config.Presets[key] ? key : Config.DefaultPreset };
        for (const name of NUMERIC_KEYS) out[name] = preset[name];
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Value's Range, for a Host's Slider
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudSettings__Range(name) {
        return Config.Ranges[name] || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resolving a Setting
// -----------------------------------------------------------------------------

    // FUNCTION | Clamp a Number Into Its Range, or Fall Back to the Preset's
    // ------------------------------------------------------------
    function PainterlyNPR__CloudSettings__Clamp(name, value, fallback) {
        const range  =  Config.Ranges[name];
        const v      =  Number.isFinite(value) ? value : fallback;
        return range ? Math.min(range.Max, Math.max(range.Min, v)) : v;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Setting - every number the renderer reads, clamped
    // ------------------------------------------------------------
    // The preset gives each value; a finite number in the setting overrides it. The
    // profile is the preset's alone: it is what makes a type that type.
    export function PainterlyNPR__CloudSettings__Resolve(setting) {
        const s       =  setting || {};
        const key     =  Config.Presets[s.Preset] ? s.Preset : Config.DefaultPreset;
        const preset  =  Config.Presets[key];
        const v       =  {};
        for (const name of NUMERIC_KEYS) v[name] = PainterlyNPR__CloudSettings__Clamp(name, s[name], preset[name]);
        const wind     =  v.WindDeg * Math.PI / 180;
        const quality  =  Config.Quality;
        return {
            Preset        :  key,
            Coverage      :  v.Coverage,
            BaseKm        :  v.BaseKm,
            TopKm         :  v.BaseKm + v.ThicknessKm,
            ThicknessKm   :  v.ThicknessKm,
            ScaleKm       :  v.ScaleKm,
            Extinction    :  v.Density * EXTINCTION_PER_DENSITY,
            Erosion       :  v.Erosion,
            Profile       :  preset.Profile.slice(0, 4),
            ShapeTileKm   :  v.ScaleKm * SHAPE_TILE_PER_SIZE,
            WeatherTileKm :  v.ScaleKm * WEATHER_TILE_PER_SIZE,
            DetailRatio   :  DETAIL_PER_SHAPE,
            DriftKm       :  [Math.cos(wind) * v.DriftKm, Math.sin(wind) * v.DriftKm],   // <-- Drift slides the whole sky along the wind
            PlanetKm      :  Config.Planet.RadiusKm,
            Quality       :  Object.assign({}, quality),
            Values        :  v,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Resolved Setting as a Short String - for a host's cache key
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudSettings__Key(resolved) {
        const v  =  resolved.Values;
        return [resolved.Preset, ...NUMERIC_KEYS.map(k => v[k].toFixed(4))].join('|');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
