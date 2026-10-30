/* =============================================================================
   PAINTERLYNPR - EXPORT | ASSET FACTORY - GLB
   =============================================================================

   FILE       : PainterlyNPR__AssetFactory__Glb__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - AssetFactory - Glb
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The MOD file: an asset's base proxy as a binary glTF (GLB) with its
                material applied, for the three.js apps
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Written from the catalogue stage's package: the asset's own triangles, as
     the engine draws them (the base asset, before any plop's randomisation), one
     primitive per material class, its colour the class's albedo.
   - glTF and the engine agree: metres, +Y up; the asset's front is +Z and its
     origin its base centre on the ground. Double-sided, since the engine's
     triangles carry no winding promise.
   - The node carries the asset's Id and names in extras, as the SketchUp side
     will find them.

   ============================================================================= */

import { PainterlyNPR__Engine__ENGINE_VERSION as ENGINE_VERSION } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Hex,
    PainterlyNPR__Maths__Linear,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | Asset Factory - Glb
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Writing a GLB
// -----------------------------------------------------------------------------

    // FUNCTION | An Asset's Base Proxy as a GLB Blob
    // ------------------------------------------------------------
    // stage: BuildStage's result (the package, the asset's object Ids). The
    // asset's vertices are the casters, ahead of the stage's ground.
    function PainterlyNPR__AssetFactory__Glb(stage, asset) {
        const pkg   =  stage.Package;
        const ids   =  new Set(stage.ObjectIds);
        const V     =  pkg.Vertices;
        const byMaterial  =  new Map();
        for (let v = 0; v < pkg.CasterCount; v++) {
            const o  =  v * 8;
            if (!ids.has(V[o + 6])) continue;
            const m  =  V[o + 7];
            if (!byMaterial.has(m)) byMaterial.set(m, []);
            byMaterial.get(m).push(o);
        }
        const chunks = [], bufferViews = [], accessors = [], primitives = [], materials = [];
        let offset  =  0;
        const view  =  (array) => {
            bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: array.byteLength, target: 34962 });
            chunks.push(array);
            offset  +=  array.byteLength;
            return bufferViews.length - 1;
        };
        for (const [materialId, starts] of byMaterial) {
            const count     =  starts.length;
            const position  =  new Float32Array(count * 3);
            const normal    =  new Float32Array(count * 3);
            const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
            starts.forEach((o, i) => {
                for (let k = 0; k < 3; k++) {
                    position[i * 3 + k]  =  V[o + k];
                    normal[i * 3 + k]    =  V[o + 3 + k];
                    if (V[o + k] < min[k]) min[k] = V[o + k];
                    if (V[o + k] > max[k]) max[k] = V[o + k];
                }
            });
            accessors.push({ bufferView: view(position), componentType: 5126, count: count, type: 'VEC3', min: min, max: max });
            accessors.push({ bufferView: view(normal), componentType: 5126, count: count, type: 'VEC3' });
            const material  =  MATERIAL_CLASSES[materialId];
            const colour    =  PainterlyNPR__Maths__Linear(PainterlyNPR__Maths__Hex(material.Albedo));
            materials.push({ name: material.Key, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [colour[0], colour[1], colour[2], 1], metallicFactor: 0, roughnessFactor: 0.92 }, extras: { MaterialClass: material.Key, Label: material.Label } });
            primitives.push({ attributes: { POSITION: accessors.length - 2, NORMAL: accessors.length - 1 }, material: materials.length - 1, mode: 4 });
        }
        const id    =  asset.Identity;
        const stem  =  `${asset.AssetId}__MOD__${id.Stem}`;
        const json  =  {
            asset       :  { version: '2.0', generator: `PainterlyNPR ${ENGINE_VERSION} - asset factory (88__Export__AssetFactory)` },
            scene       :  0,
            scenes      :  [{ name: stem, nodes: [0] }],
            nodes       :  [{ name: stem, mesh: 0, extras: { AssetId: asset.AssetId, DisplayName: id.DisplayName, Collection: id.CollectionName, Type: id.Type, Name: id.Name, Variant: id.Variant, Units: 'Metres', UpAxis: '+Y', FrontAxis: '+Z', Origin: 'BaseCentre' } }],
            meshes      :  [{ name: stem, primitives: primitives }],
            materials   :  materials,
            accessors   :  accessors,
            bufferViews :  bufferViews,
            buffers     :  [{ byteLength: offset }],
        };
        return PainterlyNPR__AssetFactory__GlbPack(json, chunks, offset);
    }
    // ------------------------------------------------------------


    // FUNCTION | Pack the JSON and the Binary Into One GLB (glTF 2.0, binary)
    // ------------------------------------------------------------
    // A 12-byte header, the JSON chunk padded with spaces and the BIN chunk with
    // zeros, each to four bytes.
    function PainterlyNPR__AssetFactory__GlbPack(json, chunks, binLength) {
        const pad4     =  (n) => (n + 3) & ~3;
        const jsonRaw  =  new TextEncoder().encode(JSON.stringify(json));
        const jsonLen  =  pad4(jsonRaw.length);
        const binLen   =  pad4(binLength);
        const total    =  12 + 8 + jsonLen + 8 + binLen;
        const out      =  new ArrayBuffer(total);
        const dv       =  new DataView(out);
        const bytes    =  new Uint8Array(out);
        dv.setUint32(0, 0x46546C67, true);                                    // <-- 'glTF'
        dv.setUint32(4, 2, true);
        dv.setUint32(8, total, true);
        dv.setUint32(12, jsonLen, true);
        dv.setUint32(16, 0x4E4F534A, true);                                   // <-- 'JSON'
        bytes.set(jsonRaw, 20);
        bytes.fill(0x20, 20 + jsonRaw.length, 20 + jsonLen);
        const binAt  =  20 + jsonLen;
        dv.setUint32(binAt, binLen, true);
        dv.setUint32(binAt + 4, 0x004E4942, true);                            // <-- 'BIN\0'
        let at  =  binAt + 8;
        for (const chunk of chunks) { bytes.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), at); at += chunk.byteLength; }
        return new Blob([out], { type: 'model/gltf-binary' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetFactory__Glb,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
