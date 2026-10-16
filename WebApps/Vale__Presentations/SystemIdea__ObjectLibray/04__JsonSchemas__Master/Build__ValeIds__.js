/* =============================================================================
   VALE OBJECT LIBRARY - BUILD VALE ID INDEX
   =============================================================================

   FILE       : Build__ValeIds__.js
   PURPOSE    : Give every assembly, component and product a Vale ID in the
                lantern style (45_2011), and write the ironmongery schema
   CREATED    : 16-Oct-2026

   Re-run after a library change:
   node Build__ValeIds__.js

   A record that already has a lantern asset id such as 45_2011 keeps it.
   Everything else takes the next number in its series.

   ============================================================================= */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const Here = __dirname;
const Root = path.join(Here, '..');
const ctx  = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(Root, '02_Data', 'ValeObjectLibrary__LibraryData__.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(Root, '02_Data', 'ValeObjectLibrary__ResourceLibraries__.js'), 'utf8'), ctx);
const Data = ctx.window.ValeObjectLibrary_LibraryData;

const Series = [
    { number: '10', name: 'Column assemblies',           holds: 'The column assemblies, one record per size and range.' },
    { number: '11', name: 'Column parts',                holds: 'Bases, shafts and capitals.' },
    { number: '12', name: 'Pilasters',                   holds: 'Pilaster assemblies.' },
    { number: '13', name: 'Internal columns',            holds: 'Internal column assemblies and their bases, shafts and capitals.' },
    { number: '14', name: 'Entablatures',                holds: 'The entablature assembly, architrave, frieze and cornice.' },
    { number: '15', name: 'Doors and windows',           holds: 'Door and window assemblies, and the leaf, cill, mullion and glazing parts.' },
    { number: '16', name: 'Rainwater goods',             holds: 'Hoppers, pipes, elbows, outlets and brackets.' },
    { number: '17', name: 'Tie bars and lighting',       holds: 'Tie bars, junction pieces, soffit blocks and lighting hooks.' },
    { number: '18', name: 'Framework timber sections',   holds: 'Upright sections.' },
    { number: '19', name: 'Cill nosings',                holds: 'One nosing per size.' },
    { number: '20', name: 'Internal joinery and eaves',  holds: 'Window boards, skirtings, staff beads and eaves gutters.' },
    { number: '21', name: 'Ironmongery',                 holds: 'Door handles, hinges, locks, bolts, window gear and cabin hooks.' },
    { number: '22', name: 'Roof finials',                holds: 'Cast and timber finials. Lantern finials stay in series 50.' },
    { number: '23', name: 'Roof crestings',              holds: 'Ridge crestings and decorative strips.' },
    { number: '30', name: 'Roof lantern assemblies',     holds: 'The built ridge, hip, glaze bar, base frame, vent and interior joinery.' },
    { number: '31', name: 'Other products',              holds: 'Bought-in parts that do not sit in a series above.' },
    { number: '45', name: 'Glaze bar',                   holds: 'Lantern glaze bar parts. Existing lantern asset ids.' },
    { number: '46', name: 'Base frame',                  holds: 'Lantern head beam, eaves extrusion and lead cover flashing.' },
    { number: '47', name: 'Ridge',                       holds: 'Lantern ridge parts.' },
    { number: '48', name: 'Hip',                         holds: 'Lantern hip parts.' },
    { number: '49', name: 'Lantern interior joinery',    holds: 'Wales cornice, ply packer and eaves trim.' },
    { number: '50', name: 'Lantern finials',             holds: 'Ball finial and spire finial from the Lantern Designer.' },
    { number: '60', name: 'Aluminium sheet',             holds: 'One Vale ID for each aluminium blank and thickness.' },
    { number: '61', name: 'Plywood sheet',               holds: 'One Vale ID for each plywood board and thickness.' },
    { number: '62', name: 'OSB sheet',                   holds: 'One Vale ID for each OSB thickness.' }
];

const ironmongeryBlock = {
    'Door Handles' : 1000,
    'Hinges'       : 2000,
    'Locks'        : 3000,
    'Shoot Bolts'  : 4000,
    'Window Gear'  : 5000,
    'Cabin Hooks'  : 6000
};

function seriesNumber(record) {
    const id       = record.id;
    const category = record.category || '';
    const lantern  = record.data && record.data['Lantern Asset ID'];
    if (lantern && /^\d{2}_\d{4}$/.test(lantern)) {
        return lantern.slice(0, 2);
    }
    if (category === 'Ironmongery' || /^PRD-(VG-IRN|LEVER|LOCK|SHOOT|ESPAG|CABIN)/.test(id)) { return '21'; }
    if (category === 'Roof Finials') { return '22'; }
    if (category === 'Roof Crestings') { return '23'; }
    if (category === 'Columns' && record.tier === 'assembly') { return '10'; }
    if (/CLASSICAL|BELTON-COLUMN|ARGORY|STOP-CHAMFER|HARDWICK|CRAGSIDE|GOTHIC/.test(id) && record.tier === 'component') { return '11'; }
    if (category === 'Pilasters' || id.indexOf('PILASTER') !== -1) { return '12'; }
    if (category === 'Internal Columns' || id.indexOf('INTERNAL') !== -1) { return '13'; }
    if (category === 'Entablatures' || /^CMP-(ARCHITRAVE|FRIEZE|CORNICE)$/.test(id)) { return '14'; }
    if (/DOOR|WINDOW|GLAZING|MULLION|^CMP-CILL$/.test(id)) { return '15'; }
    if (/RAIN|RW-|GUTTER-OUTLET|BRACKET/.test(id) && category !== 'Ironmongery') { return '16'; }
    if (/TIE-BAR|LIGHTING/.test(id)) { return '17'; }
    if (id.indexOf('UPRIGHT') !== -1) { return '18'; }
    if (id.indexOf('CILL-NOSING') !== -1) { return '19'; }
    if (/WINDOW-BOARD|SKIRTING|STAFF-BEAD|EAVES-GUTTER/.test(id)) { return '20'; }
    if (/^ASM-(RIDGE|HIP|GLAZE|RAFTER|BASE|INTERIOR|ETR)/.test(id)) { return '30'; }
    if (record.group === 'Aluminium Sheets') { return '60'; }
    if (record.group === 'Plywood Sheets') { return '61'; }
    if (record.group === 'OSB') { return '62'; }
    return '31';
}

function pad4(number) {
    return String(number).padStart(4, '0');
}

const counters = {};
function nextIn(series, start) {
    const floor = start || 1000;
    if (!counters[series] || counters[series] < floor) {
        counters[series] = floor;
    }
    counters[series] += 1;
    return series + '_' + pad4(counters[series]);
}

const records = (Data.library || []).concat(Data.resources || []).filter(function (record) {
    return record && record.id && (record.tier === 'assembly' || record.tier === 'component' || record.tier === 'product' || record.resourceType === 'SheetMaterial');
});

const byId = {};
const used = {};
records.forEach(function (record) {
    const lantern = record.data && record.data['Lantern Asset ID'];
    let valeId = lantern && (/^\d{2}_\d{4}$/.test(lantern) || /^VGH_/.test(lantern)) ? lantern : '';
    if (!valeId) {
        const series = seriesNumber(record);
        const block  = series === '21' ? ironmongeryBlock[record.range] : 0;
        valeId = nextIn(series, block);
    }
    if (used[valeId]) {
        throw new Error(valeId + ' is already ' + used[valeId] + ', cannot also be ' + record.id);
    }
    used[valeId] = record.id;
    byId[record.id] = {
        valeId   : valeId,
        name     : record.name,
        tier     : record.tier || 'resource',
        category : record.category || record.group || '',
        range    : record.range || '',
        series   : valeId.slice(0, 2)
    };
});

const seriesOut = Series.map(function (series) {
    const items = Object.keys(byId).filter(function (id) { return byId[id].series === series.number; })
        .map(function (id) { return byId[id]; })
        .sort(function (a, b) { return a.valeId.localeCompare(b.valeId); });
    return {
        Series__Number : series.number,
        Series__Name   : series.name,
        Series__Holds  : series.holds,
        Series__From   : items.length ? items[0].valeId : '',
        Series__To     : items.length ? items[items.length - 1].valeId : '',
        Series__Count  : items.length,
        Series__Items  : items.map(function (item) {
            return { Vale__Id: item.valeId, Record__Name: item.name, Record__Tier: item.tier };
        })
    };
});

const ironmongery = Object.keys(byId).filter(function (id) { return byId[id].series === '21'; })
    .map(function (id) {
        const record = records.filter(function (item) { return item.id === id; })[0];
        return {
            Resource__Code     : byId[id].valeId,
            Resource__Type     : 'IronmongeryProduct',
            Resource__Name     : record.name,
            Resource__Range    : record.range || '',
            Resource__LibraryId: record.id,
            Resource__Summary  : record.summary || '',
            Resource__ValeSpec : (record.data && record.data['Product Code']) || '',
            Resource__Attributes : {
                Resource__ProductData : {
                    'Vale ID'      : byId[id].valeId,
                    'Range'        : record.range || '',
                    'ValeSpec Code': (record.data && record.data['Product Code']) || ''
                }
            }
        };
    })
    .sort(function (a, b) { return a.Resource__Code.localeCompare(b.Resource__Code); });

const ironmongeryDoc = {
    Vale__IronmongeryLibrary: {
        Library__Name    : 'Vale ironmongery',
        Library__Purpose : 'One product per handle, hinge, lock, bolt, window gear and cabin hook. Each has a Vale ID in series 21, in the same style as a lantern asset id. A component names the Vale ID.',
        Library__Series  : '21'
    }
};
ironmongery.forEach(function (product) {
    ironmongeryDoc.Vale__IronmongeryLibrary['Resource__' + product.Resource__Code] = product;
});

const seriesDoc = {
    Vale__IdSeries: {
        Library__Name    : 'Vale ID series',
        Library__Purpose : 'Every assembly, component and product has one Vale ID. The form is the lantern asset id: a two-digit series, an underscore, then four digits, as in 45_2011. A record that already has a lantern asset id keeps it.',
        Series           : seriesOut
    }
};

function formatJson(value, indent) {
    const level = indent || 0;
    const pad   = '    '.repeat(level);
    const inner = '    '.repeat(level + 1);
    if (value === null) { return 'null'; }
    if (typeof value === 'number' || typeof value === 'boolean') { return String(value); }
    if (typeof value === 'string') { return JSON.stringify(value); }
    if (Array.isArray(value)) {
        if (!value.length) { return '[]'; }
        return '[\n' + value.map(function (item) { return inner + formatJson(item, level + 1); }).join(',\n') + '\n' + pad + ']';
    }
    const keys = Object.keys(value);
    if (!keys.length) { return '{}'; }
    return '{\n' + keys.map(function (key) {
        return inner + JSON.stringify(key) + ' : ' + formatJson(value[key], level + 1);
    }).join(',\n') + '\n' + pad + '}';
}

fs.writeFileSync(path.join(Here, 'ValeObjectLibrary__Schema__Ironmongery__.json'), formatJson(ironmongeryDoc) + '\n');
fs.writeFileSync(path.join(Here, 'ValeObjectLibrary__Schema__ValeIdSeries__.json'), formatJson(seriesDoc) + '\n');

const idMap = {};
Object.keys(byId).forEach(function (id) { idMap[id] = byId[id].valeId; });

const seriesScheme = {
    id       : 'vale-id-series',
    title    : 'Vale ID series',
    file     : '04__JsonSchemas__Master/ValeObjectLibrary__Schema__ValeIdSeries__.json',
    lead     : 'The numbered series. A Vale ID is a two-digit series, an underscore, then four digits, the same form as a lantern asset id such as 45_2011. Open a series to see every record in it.',
    sections : seriesOut.filter(function (series) { return series.Series__Count; }).map(function (series) {
        return {
            title : series.Series__Number + '  ' + series.Series__Name,
            code  : series.Series__From + (series.Series__From === series.Series__To ? '' : ' to ' + series.Series__To),
            body  : series.Series__Items.map(function (item) {
                return item.Vale__Id + '   ' + item.Record__Name;
            }).join('\n')
        };
    })
};

const ironScheme = {
    id       : 'ironmongery',
    title    : 'Ironmongery products',
    file     : '04__JsonSchemas__Master/ValeObjectLibrary__Schema__Ironmongery__.json',
    lead     : 'Series 21. Door handles start at 21_1001, hinges at 21_2001, locks at 21_3001, shoot bolts at 21_4001, window gear at 21_5001 and cabin hooks at 21_6001.',
    sections : ironmongery.map(function (product) {
        return {
            title : product.Resource__Name,
            code  : product.Resource__Code,
            body  : formatJson(product)
        };
    })
};

const runtime = [
    '/* =============================================================================',
    '   VALE OBJECT LIBRARY - VALE ID INDEX',
    '   =============================================================================',
    '',
    '   FILE       : ValeObjectLibrary__ValeIds__.js',
    '   PURPOSE    : Vale ID for every assembly, component and product',
    '   CREATED    : 16-Oct-2026',
    '',
    '   Generated by 04__JsonSchemas__Master/Build__ValeIds__.js.',
    '   Edit the builder and re-run it. Do not edit this file by hand.',
    '',
    '   ============================================================================= */',
    '(function () {',
    "    'use strict';",
    '    var data = window.ValeObjectLibrary_LibraryData;',
    '    if (!data) { return; }',
    '    data.valeIds = ' + JSON.stringify(idMap) + ';',
    '    data.resourceSchemes = (data.resourceSchemes || []).concat(' + JSON.stringify([seriesScheme, ironScheme]) + ');',
    '})();',
    ''
].join('\n');

fs.writeFileSync(path.join(Root, '02_Data', 'ValeObjectLibrary__ValeIds__.js'), runtime);
console.log('Records: ' + Object.keys(byId).length);
console.log('Ironmongery: ' + ironmongery.length);
seriesOut.forEach(function (series) {
    if (!series.Series__Count) { return; }
    console.log(series.Series__Number + '  ' + series.Series__Name.padEnd(28) + '  ' + series.Series__Count + '  ' + series.Series__From);
});
