// W1-18 scratch probe: can ValeVision's vendored jsPDF 4.1.0 (UMD) run under Node, and what do clip() and
// clip('evenodd') write into a page's content stream? Writes nothing to disk.
const path = require('node:path');
const zlib = require('node:zlib');
const UMD = path.resolve(__dirname, '..', '..', '..', '..', '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js');
const lib = require(UMD);
const { jsPDF } = lib;
console.log('jsPDF loaded:', typeof jsPDF, 'version', jsPDF.version);
const doc = new jsPDF({ unit : 'mm', format : 'a4', compress : false });
doc.saveGraphicsState();
doc.lines([[10, 0], [0, 10], [-10, 0]], 20, 20, [1, 1], null, true);
doc.clip();
doc.discardPath();
doc.restoreGraphicsState();
doc.saveGraphicsState();
doc.lines([[10, 0], [0, 10], [-10, 0]], 40, 20, [1, 1], null, true);
doc.lines([[4, 0], [0, 4], [-4, 0]], 43, 23, [1, 1], null, true);
doc.clip('evenodd');
doc.discardPath();
doc.restoreGraphicsState();
const out = doc.output();
const m = out.match(/stream\r?\n([\s\S]*?)endstream/);
console.log(m ? m[1] : out.slice(0, 2000));
