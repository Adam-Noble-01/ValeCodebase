// W2-36 acceptance harness. node acceptance_check.mjs [--panels <dir of the 40__Ui__Panels files>] [--config <AppConfig>]
//   Defaults: the live ValeVision panels and config. Pointing --panels / --config at the pre-change backups
//   is the mutation proof: the old files must FAIL the behaviour checks.
// Needs scratch/W2-36/tv/ (extract_tv.py) for the TrueVision parity runs.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : null; };
const VV = process.env.W236_VV_ROOT || 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const LE = path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor');
const PANELS = opt('--panels') || path.join(LE, '40__Ui__Panels');
const CONFIG = opt('--config') || path.join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json');
const SCRAP = opt('--scrap') || path.join(LE, '56__Feature__ScrapbookCustom', 'Na__LayoutEditor__ScrapbookCustom__.js');
const TVLE = path.join(HERE, '..', 'tv', '02__Src__AppModules', '51__System__LayoutEditor');
const TVPANELS = path.join(TVLE, '40__Ui__Panels');

let pass = 0, fail = 0;
const ok = (cond, label, detail) => { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label + (detail ? '\n        ' + String(detail).slice(0, 600) : '')); } };

function probe(dir, panel, scenario, config) {
    const file = path.join(dir, 'Na__LayoutEditor__Panel__' + panel + '__.js');
    const r = spawnSync(process.execPath, [ '--no-warnings', '--import', pathToFileURL(path.join(HERE, 'register.mjs')).href, path.join(HERE, 'panel_probe.mjs') ], {
        env : { ...process.env, W236_PANEL : pathToFileURL(file).href, W236_SCENARIO : scenario, W236_CONFIG : config || CONFIG }, encoding : 'utf8'
    });
    if (r.status !== 0) return { thrown : 'probe exit ' + r.status + ': ' + r.stderr };
    return JSON.parse(r.stdout);
}
const clean = (o) => o.thrown === null && o.console.error.length === 0;

console.log('W2-36 acceptance - panels: ' + PANELS);

// ---------------------------------------------------------------- 1. Text: several selected
const tm = probe(PANELS, 'Text', 'text-many');
ok(clean(tm), 'Text: registers, builds and refreshes without a throw or console error', tm.thrown);
ok(tm.sizeBox === '3.5', 'Text, 3 items of 3.5 / 5 / 7 mm selected: the Size box shows the FIRST item\'s size (3.5)', 'Size box: ' + tm.sizeBox);
ok(tm.note === 'Editing 3 selected text items: a change here goes to all of them.', 'Text, 3 selected: the note reads "Editing 3 selected text items: a change here goes to all of them."', 'note: ' + tm.note);
ok(JSON.stringify(tm.writes) === JSON.stringify([ [ 'ApplyToSelection', 'annotation', [ 'a1', 'a2', 'a3' ], { sizeMm : 6 } ] ]), 'Text, 3 selected: a Size change goes to all three (one ApplyToSelection), not to the new-text settings', JSON.stringify(tm.writes));
const tn = probe(PANELS, 'Text', 'text-noneofkind');
ok(clean(tn) && tn.note === 'Nothing selected is text: these settings apply to new text.', 'Text, two vectors selected: the note says nothing selected is text', 'note: ' + tn.note);
const to = probe(PANELS, 'Text', 'text-one');
ok(clean(to) && to.sizeBox === '5' && /^Editing the selected text/.test(to.note), 'Text, one item selected: unchanged (its size, the selected-text note)', JSON.stringify([ to.sizeBox, to.note ]));
const tvTm = probe(TVPANELS, 'Text', 'text-many'), tvTn = probe(TVPANELS, 'Text', 'text-noneofkind');
ok(tvTm.sizeBox === tm.sizeBox && JSON.stringify(tvTm.writes) === JSON.stringify(tm.writes) && tvTn.note === tn.note, 'PARITY: TrueVision\'s Panel__Text at the pin reads and writes the same (its note differs only by its config, below)');

// ---------------------------------------------------------------- 2. the multi-select notes in config
const cfg = JSON.parse(readFileSync(CONFIG, 'utf8')).LayoutEditor__Labels__Config;
[ [ 'TextManyNote', 'Editing {count} selected text items: a change here goes to all of them.' ],
  [ 'DimManyNote', 'Editing {count} selected dimensions: a change here goes to all of them.' ],
  [ 'ShapeManyNote', 'Editing {count} selected vectors: a change here goes to all of them.' ] ].forEach(([ k, v ]) => {
    const value = cfg['LayoutEditor__Labels__' + k];
    ok(value === v && !/Click one/.test(value), 'config ' + k + ' = the panel\'s own words, no "Click one ... on its own"', value);
});
const panelSrc = (n) => readFileSync(path.join(PANELS, 'Na__LayoutEditor__Panel__' + n + '__.js'), 'utf8');
ok(/FormatLabel\('DimManyNote', 'Editing \{count\} selected dimensions: a change here goes to all of them\.'/.test(panelSrc('Dimensions')), 'Dimensions panel reads DimManyNote with the same fallback the config now holds');

// ---------------------------------------------------------------- 3. Vectors: Edges off with several selected (1.8.1), pictures (1.8.2)
const se = probe(PANELS, 'Shapes', 'shapes-edges-off');
ok(clean(se), 'Vectors: registers, builds and refreshes without a throw or console error', se.thrown);
ok(se.note === 'Editing 2 selected vectors: a change here goes to all of them.', 'Vectors, a room and a line selected: the note reads "Editing 2 selected vectors: ..."', 'note: ' + se.note);
ok(JSON.stringify(se.writes) === JSON.stringify([ [ 'ApplyToSelection', 'shape', [ 'room', 'line' ], { stroked : false } ] ]), 'Vectors, coloured room + plain line, untick Edges: ONE write, { stroked : false } to both - no fill written, so both fills are unchanged', JSON.stringify(se.writes));
ok(JSON.stringify(se.writesOne) === JSON.stringify([ [ 'UpdateShape', 'room', { stroked : false, fillColour : '#e6c7a0' } ] ]), 'Vectors, ONE room selected, untick Edges: unchanged (edges off, its own fill kept on)', JSON.stringify(se.writesOne));
const sp = probe(PANELS, 'Shapes', 'shapes-picture');
ok(clean(sp) && sp.noteMixed === 'Editing 2 selected vectors: a change here goes to all of them.', 'Vectors, a picture + 2 vectors selected: the picture is left out (2 vectors)', 'note: ' + sp.noteMixed);
ok(sp.notePicture === 'Nothing selected: these settings apply to new shapes.', 'Vectors, a picture alone selected: not read as a vector', 'note: ' + sp.notePicture);
const tvSe = probe(TVPANELS, 'Shapes', 'shapes-edges-off'), tvSp = probe(TVPANELS, 'Shapes', 'shapes-picture');
ok(JSON.stringify(tvSe.writes) === JSON.stringify(se.writes) && JSON.stringify(tvSe.writesOne) === JSON.stringify(se.writesOne), 'PARITY: TrueVision\'s Panel__Shapes 1.9.0 writes the same on Edges off (several and one)', JSON.stringify([ tvSe.writes, tvSe.writesOne ]));
ok(tvSp.noteMixed.replace(/ selected vectors/, '') === sp.noteMixed.replace(/ selected vectors/, '') && /Editing 2 /.test(tvSp.noteMixed) && tvSp.notePicture === sp.notePicture, 'PARITY: TrueVision\'s picture guard counts and reads the same', JSON.stringify([ tvSp.noteMixed, tvSp.notePicture ]));

// ---------------------------------------------------------------- 4. Layers: labels (1.1.1) and Off red (1.3.0)
const ly = probe(PANELS, 'Layers', 'layers');
ok(clean(ly), 'Layers: registers, builds and refreshes without a throw or console error', ly.thrown);
const row = (id) => (ly.rows || []).find((r) => r.id === id) || {};
ok(row('L2').eye === 'Off' && / na-le-btn--eye is-off$/.test(row('L2').eyeClass) && row('L2').eyePressed === 'true', 'Layers: a hidden layer\'s button reads Off and carries na-le-btn--eye is-off, aria-pressed true', JSON.stringify(row('L2')));
ok(row('L1').eye === 'On' && !/is-off/.test(row('L1').eyeClass) && /na-le-btn--eye/.test(row('L1').eyeClass) && row('L1').eyePressed === 'false', 'Layers: a shown layer\'s button reads On, no is-off, aria-pressed false', JSON.stringify(row('L1')));
ok(row('L3').lock === 'Unlock' && /is-locked/.test(row('L3').lockClass), 'Layers: a locked layer\'s button still reads Unlock with is-locked', JSON.stringify(row('L3')));
ok(row('L4').typeLabel === 'Floor Areas' && row('L5').typeLabel === 'Images', 'Layers: area and image layers read "Floor Areas" and "Images" in the type select', JSON.stringify([ row('L4').typeLabel, row('L5').typeLabel ]));
ok((ly.filterLabels || []).includes('area=Floor Areas') && ly.filterLabels.includes('image=Images'), 'Layers: ... and in the filter', JSON.stringify(ly.filterLabels));
ok((ly.rows || []).every((r) => JSON.stringify(r.buttons) === JSON.stringify([ 'layer-eye', 'layer-lock', 'layer-grip' ])), 'Layers: no Ref switch yet (reference layers arrive with W3-13)', JSON.stringify((ly.rows || []).map((r) => r.buttons)));
const tvLy = probe(TVPANELS, 'Layers', 'layers');
const strip = (r) => ({ id : r.id, eye : r.eye, eyeClass : r.eyeClass, eyePressed : r.eyePressed, lock : r.lock, lockClass : r.lockClass, lockPressed : r.lockPressed, typeLabel : r.typeLabel });
ok(JSON.stringify((tvLy.rows || []).map(strip)) === JSON.stringify((ly.rows || []).map(strip)) && JSON.stringify(tvLy.filterLabels) === JSON.stringify(ly.filterLabels), 'PARITY: TrueVision\'s Panel__Layers 1.3.0 gives the same On/Off, Lock and type labels (it adds only its Ref button)');
const css = readFileSync(path.join(LE, '40__Ui__Panels', 'Na__LayoutEditor__Styles__Panels__.css'), 'utf8').replace(/\r\n/g, '\n');
const red = css.match(/\.na-le-btn--eye\.is-off,\n\.na-le-btn--lock\.is-locked,[^{]*\{([^}]*)\}/);
ok(!!red && /background\s*:\s*#fbf3f3/.test(red[1]) && /color\s*:\s*#9b3b3b/.test(red[1]), 'Styles__Panels (W1-38): .na-le-btn--eye.is-off shares the locked Unlock\'s rule - #9b3b3b on #fbf3f3', red && red[1].replace(/\s+/g, ' '));

// ---------------------------------------------------------------- 5. Render Composites: the % weight (1.7.0)
const st = probe(PANELS, 'Styles', 'styles');
ok(clean(st), 'Render Composites: registers, builds and refreshes without a throw or console error', st.thrown);
const w = (k) => (st.weights || []).find((x) => x.key === k) || {};
ok(w('enhance').unit === '%' && w('profileLinework').unit === 'px' && w('projectedLinework').unit === '×', 'Render Composites: a percent weight shows %, beside px and x', JSON.stringify(st.weights));
ok((st.weights || []).every((x) => x.unitClass === 'na-le-adv-unit' && x.clusterClass === 'na-le-row__adv na-le-adv'), 'Render Composites: % sits in the same unit slot and cluster as x and px (so it lines up with them)');
ok(w('enhance').title === 'How much of the effect to apply: 0 is none of it, 100 is all of it', 'Render Composites: the percent weight has its own hover text', w('enhance').title);
const comp = JSON.parse(readFileSync(path.join(LE, '25__System__RenderStyles', 'Na__LayoutEditor__RenderComposites__Config__.json'), 'utf8'));
ok(/"kind"\s*:\s*"percent"/.test(JSON.stringify(comp).replace(/\\"/g, '"')) || JSON.stringify(comp).includes('percent'), 'the live Render Composites config carries a percent weight (Enhance Whitecard), so the % shows in the app');
const tvSt = probe(TVPANELS, 'Styles', 'styles');
ok(JSON.stringify(tvSt.weights) === JSON.stringify(st.weights), 'PARITY: TrueVision\'s Panel__Styles 1.7.0 builds the same weights');

// ---------------------------------------------------------------- 6. ScrapbookCustom: the measured-room hunk
const scrap = readFileSync(SCRAP, 'utf8');
ok(/if \(copy\.Shape__Area && typeof copy\.Shape__Area === 'object'\) \{\n\s+delete copy\.Shape__Area\.Area__Group;\n\s+delete copy\.Shape__Area\.Area__ScaleDenominator;/.test(scrap.replace(/\r\n/g, '\n')), 'ScrapbookCustom: a captured measured room drops its group and hand-set scale');

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
