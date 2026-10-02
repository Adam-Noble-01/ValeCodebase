// W3-14 scratch: which tiles the library offers in this app, using the engine's own ElementsFor body (lifted verbatim
// from the live VV engine) over the live config, with the six types the panel 1.8.0 registers.
import { readFileSync } from 'node:fs';
const FEAT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/';
const engine = readFileSync(FEAT + 'Na__LayoutEditor__ScrapbookParametric__.js', 'utf8').replace(/\r/g, '');
const panel  = readFileSync(FEAT + 'Na__LayoutEditor__Panel__ScrapbookParametric__.js', 'utf8');
const config = JSON.parse(readFileSync(FEAT + 'Na__LayoutEditor__ScrapbookParametric__Config__.json', 'utf8'));
const body = engine.match(/function Na__LeParam__ElementsFor\(sheet\) \{[\s\S]*?\n    \}/)[0];
const registered = [...panel.matchAll(/Na__LeParam__RegisterType\((Na__LeParam\w+?)__CreateType/g)].map((m) => m[1]);
const typeOf = { Na__LeParamBar : 'ScaleBar', Na__LeParamTitle : 'DrawingTitle', Na__LeParamQr : 'ProjectQr', Na__LeParamArea : 'AreaSchedule', Na__LeParamInfill : 'CabinetInfill', Na__LeParamLegend : 'SiteLegend' };
const Na__LeParam__Types = new Set(registered.map((ns) => typeOf[ns]));
const Na__LeParam__Block = (name) => config['LayoutEditor__ScrapbookParametric__' + name];
const ElementsFor = new Function('Na__LeParam__Block', 'Na__LeParam__Types', body + '\nreturn Na__LeParam__ElementsFor;')(Na__LeParam__Block, Na__LeParam__Types);
const offered = ElementsFor({}).map((e) => e.Element__Id || e.Element__Type);
let failures = 0;
const check = (label, ok, detail) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (ok ? '' : '  ' + JSON.stringify(detail))); if (!ok) failures++; };
console.log('registered types:', [...Na__LeParam__Types].join(', '));
console.log('tiles offered   :', offered.join(', '));
check('the panel registers all six types', Na__LeParam__Types.size === 6, [...Na__LeParam__Types]);
check('five or more tiles, Cabinet Infill among them', offered.length >= 5 && offered.includes('CabinetInfill'), offered);
check('the three Area Schedule tiles are offered', ['AreaScheduleRooms', 'AreaScheduleGroups', 'AreaScheduleProject'].every((id) => offered.includes(id)), offered);
check('no Project Portal tile while the QR code is off', !offered.some((id) => /^ProjectPortal/.test(id)), offered);
check('no Site Plan Legend tile while site plans are dormant', !offered.includes('SiteLegend'), offered);
check('the config still lists both Portal tiles and the legend (the tests need them)',
    config.LayoutEditor__ScrapbookParametric__Elements.Elements__List.filter((e) => e.Element__Type === 'ProjectQr' || e.Element__Type === 'SiteLegend').length === 3);
console.log(failures === 0 ? '\nEVERY CHECK PASSED' : '\n' + failures + ' FAILED');
process.exit(failures === 0 ? 0 : 1);
