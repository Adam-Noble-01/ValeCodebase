// =============================================================================
// VALEVISION 3D MCP - THE APP'S OWN SUMS FOR A PROJECT'S FIGURES, IN NODE
// =============================================================================
//
// FILE       : Na__ValeVisionMcp__EntourageSums__.mjs
// PURPOSE    : Lay a project's Entourage__SceneData over the app's defaults, and say what each
//              figure will draw, with the modules the app itself draws from
// CREATED    : 05-Nov-2026
//
// DESCRIPTION:
// - NO COPY OF THE SUMS. It imports Na__Entourage__SceneData__.js and
//   Na__Entourage__FigureBuilder__.js from the app, neither of which imports three.js or needs
//   a page. So what it says about a figure is what the app will draw, segment for segment.
// - A project's own pinned copy of an asset first, else the library, as Na__EntLib__ResolveAsset.
//
// INPUT, on stdin:  { "sceneData": {...}, "appDir": "...", "libraryFiles": { "<assetId>": "<path>" } }
// OUTPUT, on stdout: { "normalised": {...}, "figures": [...] }
//
// FRAMES: integer mm in three.js axes, as saved.
//
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const input   = JSON.parse(readFileSync(0, 'utf8'));
const appDir  = input.appDir;
const entDir  = join(appDir, '02__Src__AppModules', '23__System__Entourage');
const dataUrl = pathToFileURL(join(entDir, '02__Core__Data', 'Na__Entourage__SceneData__.js')).href;
const makeUrl = pathToFileURL(join(entDir, '01__Core__Engine', 'Na__Entourage__FigureBuilder__.js')).href;

const { Na__EntData__Normalise }                            = await import(dataUrl);
const { Na__EntBuild__BuildFigure, Na__EntBuild__RulesFrom } = await import(makeUrl);

const config     = JSON.parse(readFileSync(join(entDir, 'Na__Entourage__AppConfig__.json'), 'utf8'));
const normalised = Na__EntData__Normalise(input.sceneData, config);
const rules      = Na__EntBuild__RulesFrom(normalised.Entourage__SceneData__LineRules);

function recipeOf(assetId) {
    const pinned = normalised.Entourage__SceneData__Assets[assetId];
    if (pinned) return pinned;
    const file = input.libraryFiles[assetId];
    return file ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

const figures = normalised.Entourage__SceneData__Figures.map((figure) => {
    const recipe = recipeOf(figure.Entourage__Figure__AssetId);
    const built  = recipe ? Na__EntBuild__BuildFigure(recipe, figure.Entourage__Figure__Seed, rules) : null;
    const scale  = figure.Entourage__Figure__Scale > 0 ? figure.Entourage__Figure__Scale : 1;
    return {
        uid        : figure.Entourage__Figure__Uid,
        assetId    : figure.Entourage__Figure__AssetId,
        assetName  : recipe ? recipe.Asset__Name : null,
        positionMm : figure.Entourage__Figure__PositionMm,
        scale,
        seed       : figure.Entourage__Figure__Seed,
        measuresMm : recipe ? { width : Math.round(recipe.Asset__Size.Size__WidthMm * scale), height : Math.round(recipe.Asset__Size.Size__HeightMm * scale) } : null,
        drawn      : built ? { outlineSegments : built.outer.length / 4, innerSegments : built.inner.length / 4 } : null
    };
});

process.stdout.write(JSON.stringify({ normalised, figures }));
