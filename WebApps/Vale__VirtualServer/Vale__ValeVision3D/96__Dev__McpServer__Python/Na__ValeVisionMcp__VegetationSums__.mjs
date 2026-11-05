// =============================================================================
// VALEVISION 3D MCP - THE APP'S OWN SUMS FOR A PROJECT'S PLANTS, IN NODE
// =============================================================================
//
// FILE       : Na__ValeVisionMcp__VegetationSums__.mjs
// PURPOSE    : Lay a project's Vegetation__SceneData over the app's defaults, and work
//              out every plant of every path, with the modules the app itself draws from
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - NO COPY OF THE SUMS. It imports Na__Vegetation__SceneData__.js and
//   Na__Vegetation__PathModel__.js from the app, neither of which imports three.js or needs
//   a page. So what it says about a path is what the app will draw, plant for plant.
// - A project's own pinned copy of an asset first, else the library, as Na__VegLib__ResolveRecipe.
//
// INPUT, on stdin:  { "sceneData": {...}, "appDir": "...", "libraryFiles": { "<assetId>": "<path>" } }
// OUTPUT, on stdout: { "normalised": {...}, "paths": [...], "plops": [...] }
//
// FRAMES: integer mm in three.js axes, as saved.
//
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const input   = JSON.parse(readFileSync(0, 'utf8'));
const appDir  = input.appDir;
const vegDir  = join(appDir, '02__Src__AppModules', '24__System__Vegetation');
const dataUrl = pathToFileURL(join(vegDir, '02__Core__Data', 'Na__Vegetation__SceneData__.js')).href;
const pathUrl = pathToFileURL(join(vegDir, '01__Core__Engine', 'Na__Vegetation__PathModel__.js')).href;

const { Na__VegData__Normalise, Na__VegData__PlopSizeMm } = await import(dataUrl);
const { Na__VegPath__PlantsFor, Na__VegPath__Line }       = await import(pathUrl);

const config     = JSON.parse(readFileSync(join(vegDir, 'Na__Vegetation__AppConfig__.json'), 'utf8'));
const normalised = Na__VegData__Normalise(input.sceneData, config);

function recipeOf(assetId) {
    const pinned = normalised.Vegetation__SceneData__Assets[assetId];
    if (pinned) return pinned;
    const file = (input.libraryFiles || {})[assetId];
    return file ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function ownSize(recipe) {
    return [recipe.Asset__Size.Size__WidthMm, recipe.Asset__Size.Size__DepthMm, recipe.Asset__Size.Size__HeightMm];
}

function describe(plop) {
    const recipe = recipeOf(plop.Vegetation__Plop__AssetId);
    return {
        uid        : plop.Vegetation__Plop__Uid,
        assetId    : plop.Vegetation__Plop__AssetId,
        assetName  : recipe ? recipe.Asset__Name : null,
        positionMm : plop.Vegetation__Plop__PositionMm,
        yawDeg     : plop.Vegetation__Plop__YawDeg,
        scale      : plop.Vegetation__Plop__Scale || 1,
        measuresMm : recipe ? Na__VegData__PlopSizeMm(plop, ownSize(recipe)) : null
    };
}

const paths = normalised.Vegetation__SceneData__Paths.map((path) => {
    const palette = normalised.Vegetation__SceneData__Palettes.find((row) => row.Vegetation__Palette__Uid === path.Vegetation__Path__PaletteUid);
    const items   = palette ? (palette.Vegetation__Palette__Items || []).map((item) => ({
        assetId : item.Vegetation__PaletteItem__AssetId,
        weight  : item.Vegetation__PaletteItem__Weight,
        scale   : item.Vegetation__PaletteItem__PlantScale,
        recipe  : recipeOf(item.Vegetation__PaletteItem__AssetId)
    })) : [];
    const line = Na__VegPath__Line(path.Vegetation__Path__PointsMm, path.Vegetation__Path__Curved === true);
    return {
        uid       : path.Vegetation__Path__Uid,
        name      : path.Vegetation__Path__Name,
        lengthMm  : Math.round(line.total),
        spacingMm : path.Vegetation__Path__SpacingMm,
        plantScale: path.Vegetation__Path__PlantScale > 0 ? path.Vegetation__Path__PlantScale : 1,
        plants    : Na__VegPath__PlantsFor(path, items).map(describe)
    };
});

process.stdout.write(JSON.stringify({
    normalised,
    paths,
    plops : normalised.Vegetation__SceneData__Plops.map(describe)
}));
