// W1-22 scratch: measure title block cell needs the way this app's SheetChrome measures them today
// (Na__LeChrome__MeasureTextMm: jsPDF's built-in Helvetica, the vendored jsPDF 4.1.0), with the
// shipped style values: values 2.2 mm 'normal', labels 1.6 mm 'normal' upper case tracked 0.05 mm,
// 1.4 mm of padding either side. Usage: node measure_helvetica.cjs
'use strict';
const path = require('path');

const VV = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
global.window = global;                                   // jsPDF's UMD looks for a global
const jspdf = require(path.join(VV, '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js'));
const JsPdf = jspdf.jsPDF || (global.jspdf && global.jspdf.jsPDF);
const doc = new JsPdf({ unit : 'mm', format : [ 210, 297 ] });
const MM_PER_POINT = 25.4 / 72;

function measure(text, fontMm, weight, trackingMm) {
    const value = String(text);
    if (value === '') return 0;
    const tracking = (trackingMm > 0) ? trackingMm * value.length : 0;
    doc.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(fontMm / MM_PER_POINT);
    return doc.getTextWidth(value) + tracking;
}
const PAD = 1.4 * 2;
const value = (t) => measure(t, 2.2, 'normal', 0);
const label = (t) => measure(String(t).toUpperCase(), 1.6, 'normal', 0.05);
const need  = (l, v) => Math.max(label(l), value(v)) + PAD;
const floor = (l) => label(l) + PAD;
const r2 = (n) => Math.round(n * 100) / 100;

const ROWS = [
    [ 'Client', 'Client', 'Mordaunt' ],
    [ 'SiteAddress', 'Site Address', 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE' ],
    [ 'Title', 'Drawing Title', 'Permitted Development Compliance - Existing Conditions & Design Proposal Elevations' ],
    [ 'DrawingNumber', 'Drawing No.', '57079-12' ],
    [ 'DocumentId', 'Document ID', '57079_D12' ],
    [ 'Revision', 'Rev', 'B' ],
    [ 'RevisionPrefixed', 'Rev', 'Revision B' ],
    [ 'Scale', 'Scale', '1:50 @ ISO A2' ],
    [ 'Date', 'Date', '19 Sep 2026' ],
    [ 'DrawnBy', 'Drawn By', 'Vale Garden Houses' ],
    [ 'Status', 'Status', 'FOR PLANNING' ]
];
console.log('jsPDF', JsPdf.version || '(no version)');
console.log('\nNEEDS (wider of label and value + 2.8) and FLOORS (label + 2.8):');
ROWS.forEach(([ key, l, v ]) => console.log('  ' + key.padEnd(17) + ' need ' + r2(need(l, v)).toFixed(2).padStart(6) + '   floor ' + r2(floor(l)).toFixed(2).padStart(6) + '   value ' + r2(value(v) + PAD).toFixed(2).padStart(6) + '   "' + v + '"'));

console.log('\nOther values (value + 2.8):');
[ 'Proposed Orangery - Elevations', '57079_D100', '99999_D100', '3047_D01', '63592_D12', 'WW88_T04_D100', 'PS01_T02_D100',
  '1:50 & 1:100 @ ISO A2', '1:100 & 1:200 @ ISO A2', '1:20, 1:50 & 1:100 @ ISO A3', '1:20 & 1:50 & 1:100 @ ISO A3', 'Mr & Mrs Featherstonehaugh',
  '255 Musters Road, West Bridgford, Nottinghamshire, NG2 7DD' ].forEach((t) => console.log('  ' + r2(value(t) + PAD).toFixed(2).padStart(6) + '  (text ' + r2(value(t)).toFixed(2) + ')  "' + t + '"'));

console.log('\nStatuses (value + 2.8):');
[ 'PRELIMINARY', 'FOR INFORMATION', 'FOR COMMENT', 'FOR COORDINATION', 'FOR APPROVAL', 'FOR PLANNING', 'FOR BUILDING CONTROL', 'FOR PRICING', 'FOR TENDER', 'FOR CONSTRUCTION', 'AS BUILT', 'SUPERSEDED' ]
    .forEach((t) => console.log('  ' + r2(need('Status', t)).toFixed(2).padStart(6) + '  "' + t + '"'));
