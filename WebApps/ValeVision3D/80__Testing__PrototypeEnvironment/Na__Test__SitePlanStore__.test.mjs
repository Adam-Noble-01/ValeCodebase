// =============================================================================
// VALEVISION3D - TEST - SITE PLAN STORE (two stores, and the keys that name them)
// =============================================================================
//
// FILE       : Na__Test__SitePlanStore__.test.mjs
// PURPOSE    : Prove the site plan store keeps Existing and Proposed apart, and
//              that a project built before the split still reads exactly as it did
// CREATED    : 20-Sep-2026
//
// RUN        : node 80__Testing__PrototypeEnvironment/Na__Test__SitePlanStore__.test.mjs
//
// HOW IT WORKS:
// - Na__SitePlan__Store__.js cannot be imported into Node as it stands: Node reads
//   a .js file in this tree as CommonJS (no package.json declares module type), and
//   the module imports the project-data client, the URL helpers and the GLB parser.
// - So the SHIPPED FILE is read, its import statements are removed, stubs are put in
//   their place, and the result is written to a temp .mjs and imported. Everything
//   below the imports is byte-for-byte the code that ships. Nothing is paraphrased.
// - fetch is stubbed to always throw, so only the project data is read and the test
//   never touches the network.
//
// WHAT IT GUARDS:
// - The DEFAULT store (proposed) publishes UNQUALIFIED category keys, so every
//   viewport saved before there were two stores keeps its layer toggles and its
//   edge overrides with no migration. This is the whole backward-compatibility
//   story and it is one easy line to break.
// - The two stores publish the SAME layer names, so without qualification they
//   would overwrite each other in the store's layer map.
// - A project holding only an Existing site plan - which is RB05 - still answers
//   DefaultStoreId, or nothing would draw.
// - ValeVision only: the shared exporter's TrueVision stems are read as
//   ValeVision__SitePlan__ (the prefix this app's SheetRecords tests, read from
//   the shipped file), a ValeVision stem is read as it is, both manifest names
//   are tried, the remote manifest carries the build token, and every URL is
//   this project's VaApps/Projects/<folderId>/ copy - R2 then GitHub Pages on
//   the live site, the Flask repository copy first on localhost - and never
//   Noble Architecture's portal.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SitePlanStore__.test.mjs
// - Source version: 1.0.0 (unversioned in TrueVision; as shipped with TrueVision3D v2.132.0, 21-Sep-2026;
//                   read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4
// - Parity        : adapted. Every TrueVision check is kept, in order, with its words; what differs is what
//                   this app's store is: its stubs and its stems.
// - Divergences   :
//   - Banner reads ValeVision3D.
//   - The stubs are this app's: the store also imports Na__CfApi__BuildContentCdnUrl,
//     Na__AppUtils__InitBuildManifest and Na__AppUtils__ResolveAssetUrl, and the project is
//     2026 / 3047__Doous (a four-digit year), as the master index answers in ValeVision.
//   - Layers go IN with the exporter's stems (TrueVision__SitePlan__...) and are expected OUT as
//     ValeVision__SitePlan__... (the store renames them on read, S04a-V04); the key qualification checks
//     run on the ValeVision stem. The fixture URLs are this app's CDN folder.
//   - A ValeVision-only section after TrueVision's checks: the stem rename, both manifest names, the build
//     token, and the R2 / repository-copy order on the live site and on localhost.
// - Back-port     : none.
//
// =============================================================================

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SRC  = path.resolve(HERE, '../02__Src__AppModules/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js')
const RECORDS = path.resolve(HERE, '../02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js')
const TMP = path.join(os.tmpdir(), 'Na__SitePlan__Store__UnderTest__.mjs')

let src = fs.readFileSync(SRC, 'utf8')

// Remove every import STATEMENT (single-line and braced multi-line) and prepend
// stubs. The module body itself is untouched, so what runs below is the shipped
// code, not a paraphrase of it.
const before = src
src = src.replace(/^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*$/gm, '')
if (src === before) { console.error('FAIL: no import statements were stubbed'); process.exit(1) }
if (/^\s*import\s/m.test(src)) { console.error('FAIL: an import statement survived'); process.exit(1) }

// THIS APP'S HOSTS, as Na__CfApi__BuildContentCdnUrl and Na__AppUtils__ResolveAssetUrl answer them.
const R2   = 'https://cdn.noble-architecture.com/VaApps/Projects'
const GH   = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects'
const WCP  = 'http://localhost:8000/Whitecardopedia/Projects'
const FOLDER_ID = '2026/3047__Doous'

src = `
    const Na__CfApi__GetLoadedProjectData       = () => globalThis.__PROJECT_DATA;
    const Na__CfApi__BuildContentCdnUrl         = (folder, year, rel) => '${R2}/' + year + '/' + folder + '/' + rel;
    const Na__AppUtils__IsRunningOnLocalhost    = () => !!globalThis.__LOCALHOST;   // <-- off: no local manifest fetch in Node
    const Na__AppUtils__GetProjectFolderFromUrl = () => '3047__Doous';
    const Na__AppUtils__GetYearFromUrl          = () => '2026';
    const Na__AppUtils__InitBuildManifest       = async () => globalThis.__BUILD_TOKEN || '';
    const Na__AppUtils__ResolveAssetUrl         = (id, file) => ({ primary : '${R2}/' + id + '/' + file,
                                                                   fallback : (globalThis.__LOCALHOST ? '${WCP}/' : '${GH}/') + id + '/' + file });
    const Na__SpGlb__ParseLinework              = (b) => (globalThis.__PARSE_LINE || (() => ({ segments : new Float32Array(0), segmentCount : 0, boundsMm : null })))(b);
    const Na__SpGlb__ParseFill                  = (b) => (globalThis.__PARSE_FILL || (() => ({ rings : [] })))(b);
` + src
fs.writeFileSync(TMP, src, 'utf8')

globalThis.window = { location : { origin : 'http://127.0.0.1:8523' }, dispatchEvent () {}, addEventListener () {} }
globalThis.CustomEvent = class { constructor (t, o) { this.type = t; Object.assign(this, o) } }
globalThis.fetch = async () => { throw new Error('no network in this harness') }   // <-- project data only

const S = await import(pathToFileURL(TMP).href + '?v=' + Math.random().toString(36).slice(2))

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`)
}

// The exporter writes TrueVision stems; this app's store reads them as ValeVision ones.
const XS = (name) => 'TrueVision__SitePlan__' + name                                 // <-- in: what the shared exporter writes
const VS = (name) => 'ValeVision__SitePlan__' + name                                 // <-- out: what this app's store publishes

// ---- Key qualification: the whole backward-compatibility story ----------------
const STEM = VS('OsMapping')

check('the DEFAULT store leaves a key unqualified (old sheets keep matching)',
  S.Na__SpStore__QualifyKey(STEM, 'proposed'), STEM)
check('no store id given also leaves it unqualified',
  S.Na__SpStore__QualifyKey(STEM, null), STEM)
check('the existing store suffixes it',
  S.Na__SpStore__QualifyKey(STEM, 'existing'), STEM + '@existing')

check('a bare key splits to the default store',
  S.Na__SpStore__SplitKey(STEM), { stem : STEM, storeId : 'proposed' })
check('a suffixed key splits back',
  S.Na__SpStore__SplitKey(STEM + '@existing'), { stem : STEM, storeId : 'existing' })
check('an @ that is NOT a store id stays part of the stem',
  S.Na__SpStore__SplitKey(VS('Odd@thing')),
  { stem : VS('Odd@thing'), storeId : 'proposed' })
check('round trip, existing', S.Na__SpStore__SplitKey(S.Na__SpStore__QualifyKey(STEM, 'existing')).stem, STEM)
check('round trip, proposed', S.Na__SpStore__SplitKey(S.Na__SpStore__QualifyKey(STEM, 'proposed')).stem, STEM)

// The prefix SheetRecords tests, read from the shipped file rather than assumed.
const recordsPrefix = (fs.readFileSync(RECORDS, 'utf8').match(/Na__LeRec__SITEPLAN_CATEGORY_PREFIX\s*=\s*'([^']+)'/) || [])[1]
check('BOTH forms still start with the site plan prefix that SheetRecords tests',
  [STEM, STEM + '@existing'].every(k => !!recordsPrefix && k.indexOf(recordsPrefix) === 0), true)

check('StoreIdForKey routes a load to the right store',
  [ S.Na__SpStore__StoreIdForKey(STEM), S.Na__SpStore__StoreIdForKey(STEM + '@existing') ],
  [ 'proposed', 'existing' ])

// ---- Reading the project data -------------------------------------------------
const layer = (key) => ({
  Layer__CategoryKey : key,
  Layer__Label : 'OS Mapping',
  Layer__DrawOrder : 20,
  Layer__LineworkUrl : `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/` + key + '__LineworkModel__.glb',
  Layer__Style : { LineHex : '#666666', LineWeightMm : 0.13 },
  Layer__VisibleAtScales : [ 500, 1250 ]
})

// A project built BEFORE the split: one legacy key, no array.
globalThis.__PROJECT_DATA = { SitePlan__DataStore : {
  SitePlan__FolderName : 'SitePlan__DrawingData',
  SitePlan__ExportedIso : '2026-09-17T19:30:36Z',
  SitePlan__Layers : [ layer(XS('OsMapping')) ]
} }
await S.Na__SpStore__ResolveAll()
check('a legacy single key resolves as the PROPOSED store',
  S.Na__SpStore__GetLayers('proposed').map(l => l.Layer__CategoryKey), [ STEM ])
check('and its keys are UNQUALIFIED, so a saved viewport still matches',
  S.Na__SpStore__GetLayers('proposed')[0].Layer__CategoryKey, STEM)
check('the existing store is empty', S.Na__SpStore__GetLayers('existing').length, 0)
check('the default store id is proposed', S.Na__SpStore__DefaultStoreId(), 'proposed')

// A project with BOTH stores. NOTE Reload() re-resolves immediately, so the new
// project data must be in place BEFORE it, not after.
globalThis.__PROJECT_DATA = { SitePlan__DataStores : [
  { SitePlan__StoreId : 'existing', SitePlan__FolderName : 'SitePlan__DrawingData__Existing',
    SitePlan__ExportedIso : '2026-09-20T15:00:00Z', SitePlan__Layers : [ layer(XS('OsMapping')) ] },
  { SitePlan__StoreId : 'proposed', SitePlan__FolderName : 'SitePlan__DrawingData__Proposed',
    SitePlan__ExportedIso : '2026-09-20T16:00:00Z', SitePlan__Layers : [ layer(XS('OsMapping')) ] },
] }
await S.Na__SpStore__Reload()

check('both stores resolve',
  S.Na__SpStore__GetStores().filter(s => s.Store__Available).map(s => s.Store__Id).sort(),
  [ 'existing', 'proposed' ])
check('THE COLLISION IS GONE: the same layer name yields two distinct keys',
  S.Na__SpStore__GetLayers().map(l => l.Layer__CategoryKey).sort(),
  [ STEM, STEM + '@existing' ])
check('GetLayers(store) is scoped to that store',
  [ S.Na__SpStore__GetLayers('existing').length, S.Na__SpStore__GetLayers('proposed').length ], [ 1, 1 ])
check('each layer remembers its store and stem',
  S.Na__SpStore__GetLayers('existing').map(l => [ l.Layer__StoreId, l.Layer__Stem ]), [ [ 'existing', STEM ] ])
check('each store keeps its own export time (so the paint tokens differ)',
  [ S.Na__SpStore__GetDescriptor('existing').SitePlan__ExportedIso,
    S.Na__SpStore__GetDescriptor('proposed').SitePlan__ExportedIso ],
  [ '2026-09-20T15:00:00Z', '2026-09-20T16:00:00Z' ])

// Existing ONLY - which is exactly RB05 today.
globalThis.__PROJECT_DATA = { SitePlan__DataStores : [
  { SitePlan__StoreId : 'existing', SitePlan__FolderName : 'SitePlan__DrawingData__Existing',
    SitePlan__ExportedIso : '2026-09-20T15:00:00Z', SitePlan__Layers : [ layer(XS('OsMapping')) ] },
] }
await S.Na__SpStore__Reload()
check('RB05 case: with only an Existing store, a viewport naming none gets it',
  S.Na__SpStore__DefaultStoreId(), 'existing')
check('and the aggregate status is ready, so the Add button enables',
  S.Na__SpStore__GetStatus(), S.Na__SpStore__STATUS_READY)

// ---- Z-index: authored wins, otherwise derived from the published draw order --
// PS01's manifest was written before the Z-index existed. It must still stack
// correctly, with no re-export, or the red line ends up under the trees.
const zLayer = (key, drawOrder, zl, zf) => {
  const l = layer(key)
  l.Layer__DrawOrder = drawOrder
  if (zl !== undefined) l.Layer__ZIndexLine = zl
  if (zf !== undefined) l.Layer__ZIndexFill = zf
  return l
}
globalThis.__PROJECT_DATA = { SitePlan__DataStore : {
  SitePlan__FolderName : 'SitePlan__DrawingData',
  SitePlan__ExportedIso : '2026-09-17T19:30:36Z',
  SitePlan__Layers : [
    zLayer(XS('OsMapping'), 20),                 // PS01, unauthored
    zLayer(XS('ExistingBuildings'), 40),
    zLayer(XS('ProposedBuildingsSecondary'), 70),
    zLayer(XS('ProposedBuildings'), 71),
    zLayer(XS('RedLineBoundary'), 90),
    zLayer(XS('Waterbodies'), 35, 7, 4),          // authored
    zLayer(XS('TreesMixedWoodland'), 56, 6, 3),
  ]
} }
await S.Na__SpStore__Reload()
const byKey = {}
S.Na__SpStore__GetLayers('proposed').forEach(l => { byKey[l.Layer__Stem] = l })

check("PS01's unauthored draw orders derive to a sane 1-10 hierarchy",
  [ 'OsMapping', 'ExistingBuildings', 'ProposedBuildingsSecondary', 'ProposedBuildings', 'RedLineBoundary' ]
    .map(s => byKey[VS(s)].Layer__ZIndexLine),
  [ 2, 4, 7, 8, 9 ])
check('and the red line still ends up highest of them',
  byKey[VS('RedLineBoundary')].Layer__ZIndexLine
    > byKey[VS('ProposedBuildings')].Layer__ZIndexLine, true)
check('an AUTHORED z-index wins over the derived one',
  [ byKey[VS('Waterbodies')].Layer__ZIndexLine,
    byKey[VS('Waterbodies')].Layer__ZIndexFill ], [ 7, 4 ])
check("REQ-10: water LINES sit above tree LINES...",
  byKey[VS('Waterbodies')].Layer__ZIndexLine
    > byKey[VS('TreesMixedWoodland')].Layer__ZIndexLine, true)
check('...and the two fills stack independently of the lines',
  byKey[VS('Waterbodies')].Layer__ZIndexFill
    !== byKey[VS('Waterbodies')].Layer__ZIndexLine, true)

// ---- The style whitelist: a new field must be named or it is deleted ---------
check('the style keeps the new fields (F8: this rebuild is a closed list)',
  Object.keys(S.Na__SpStore__GetLayers('proposed')[0].Layer__Style).sort(),
  [ 'FillColourId', 'FillHex', 'FillMaterialId', 'FillOpacity', 'HatchPatternId',
    'LineColourId', 'LineDashScale', 'LineHex', 'LineType', 'LineWeightMm', 'LineWeightPt' ])

// ---- A FILL LAYER WITH NO LINEWORK (21-Sep-2026, Site Plan Export 1.4.0) -------
// Adam tags just the FACE of a drive or a patio with a fill tag; its edges stay on
// the lines they belong to. The export then ships that layer's fill GLB alone.
// The store used to drop any layer without a linework URL, and to fetch linework
// before anything else - so the wash vanished twice over, with no error.
const HS  = VS('HardStandingAndDriveways')
const OSM = VS('OsMapping')
const fillOnly = { Layer__CategoryKey : XS('HardStandingAndDriveways'), Layer__Label : 'Hard Standing and Driveways', Layer__DrawOrder : 32,
  Layer__LineworkUrl : null, Layer__FillUrl : `${R2}/${FOLDER_ID}/SitePlan__DrawingData/` + XS('HardStandingAndDriveways') + '__FillModel__.glb',
  Layer__Style : { LineHex : '#999999', FillHex : '#E4E4E4', FillOpacity : 1 } }
const neither  = { Layer__CategoryKey : XS('Nothing'), Layer__LineworkUrl : null, Layer__FillUrl : null }
globalThis.__PROJECT_DATA = { SitePlan__DataStore : {
  SitePlan__FolderName : 'SitePlan__DrawingData', SitePlan__ExportedIso : '2026-09-21T15:00:00Z',
  SitePlan__Layers : [ layer(XS('OsMapping')), fillOnly, neither ]
} }
await S.Na__SpStore__Reload()
check('a layer with a fill and NO linework is kept; a layer with neither is still dropped',
  S.Na__SpStore__GetLayers('proposed').map(l => l.Layer__CategoryKey).sort(), [ HS, OSM ])

// Serve every URL; count what gets fetched and parsed.
const fetched = []
let lineParses = 0
globalThis.fetch = async (url) => { fetched.push(String(url)); return { ok : true, status : 200, arrayBuffer : async () => new ArrayBuffer(8) } }
globalThis.__PARSE_LINE = () => { lineParses++; return { segments : new Float64Array([0, 0, 1, 1]), segmentCount : 1, boundsMm : { MinX : 0, MinY : 0, MaxX : 1, MaxY : 1 } } }
globalThis.__PARSE_FILL = () => ({ rings : [ { face : 0, outer : true, points : new Float64Array([0, 0, 10, 0, 10, 10]) } ], boundsMm : { MinX : 0, MinY : 0, MaxX : 10, MaxY : 10 } })

const hsData = await S.Na__SpStore__LoadLayer(HS)
check('the faces-only layer LOADS: no segments, its rings, bounds taken from the fill',
  [ hsData.segmentCount, hsData.segments.length, hsData.rings.length, hsData.boundsMm && hsData.boundsMm.MaxX ], [ 0, 0, 1, 10 ])
check('and it never asked for, or parsed, a linework file',
  [ lineParses, fetched.some(u => u.indexOf('LineworkModel') !== -1), fetched.every(u => u.indexOf('FillModel') !== -1) ], [ 0, false, true ])
const osmData = await S.Na__SpStore__LoadLayer(OSM)
check('a normal layer still fetches and parses its linework', [ osmData.segmentCount, lineParses ], [ 1, 1 ])

// Its fill IS the layer, so a fill that fails must reject - not cache an empty layer.
globalThis.__PROJECT_DATA = { SitePlan__DataStore : {
  SitePlan__FolderName : 'SitePlan__DrawingData', SitePlan__ExportedIso : '2026-09-21T16:00:00Z',
  SitePlan__Layers : [ fillOnly ]
} }
await S.Na__SpStore__Reload()
globalThis.fetch = async () => ({ ok : false, status : 404 })
const failed = await S.Na__SpStore__LoadLayer(HS).then(() => 'resolved', () => 'rejected')
check('a faces-only layer whose fill fails to load REJECTS (retried next time), where a lined layer would draw on',
  [ failed, S.Na__SpStore__GetLayerData(HS) ], [ 'rejected', null ])
globalThis.fetch = async () => { throw new Error('no network in this harness') }
delete globalThis.__PARSE_LINE
delete globalThis.__PARSE_FILL

// =============================================================================
// ValeVision only: stems, manifest names, the build token and where files come from
// =============================================================================

// ---- Stems: the exporter's are renamed, this app's are read as they are --------
globalThis.__PROJECT_DATA = { SitePlan__DataStore : {
  SitePlan__ExportedIso : '2026-10-02T09:00:00Z',
  SitePlan__Layers : [ layer(XS('Waterbodies')), layer(VS('RedLineBoundary')), layer('SomeOtherKey') ]
} }
await S.Na__SpStore__Reload()
check('an exporter stem is read in this app\'s token, a ValeVision stem as it is, any other key untouched',
  S.Na__SpStore__GetLayers('proposed').map(l => l.Layer__CategoryKey).sort(),
  [ 'SomeOtherKey', VS('RedLineBoundary'), VS('Waterbodies') ].sort())
check('no published key carries the exporter token',
  S.Na__SpStore__GetLayers().some(l => /^TrueVision__/.test(l.Layer__CategoryKey) || /^TrueVision__/.test(l.Layer__Stem)), false)

// ---- The manifest, on the live site: R2 first, then GitHub Pages, both names ---
const asked = []
globalThis.__BUILD_TOKEN = '20261002-1'
globalThis.__PROJECT_DATA = {}                                                      // <-- no project data key: the manifest is the only source
globalThis.fetch = async (url) => { asked.push(String(url)); return { ok : false, status : 404 } }
await S.Na__SpStore__Reload()
const proposedAsks = asked.filter(u => u.indexOf('/SitePlan__DrawingData__Proposed/') !== -1)
check('live: the proposed store asks R2 (with the build token) then GitHub Pages, the exporter\'s manifest name first',
  proposedAsks.slice(0, 4),
  [ `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/TrueVision__SitePlanData__Manifest__.json?v=20261002-1`,
    `${GH}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/TrueVision__SitePlanData__Manifest__.json?v=20261002-1`,
    `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/ValeVision__SitePlanData__Manifest__.json?v=20261002-1`,
    `${GH}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/ValeVision__SitePlanData__Manifest__.json?v=20261002-1` ])
check('live: the legacy single folder is still asked for the proposed store, after the named one',
  asked.some(u => u.indexOf(`${R2}/${FOLDER_ID}/SitePlan__DrawingData/`) === 0), true)
check('every URL asked is this project\'s own folder, never Noble Architecture\'s portal',
  asked.every(u => (u.indexOf(`${R2}/${FOLDER_ID}/`) === 0 || u.indexOf(`${GH}/${FOLDER_ID}/`) === 0)
                && !/NaProjectPortal|na-project-portal|30__TrueVision__AppContent/.test(u)), true)
check('with no data anywhere every store resolves EMPTY (dormant), and says why',
  [ S.Na__SpStore__GetStatus(), S.Na__SpStore__GetStatus('existing'), !!S.Na__SpStore__GetNote('proposed') ],
  [ S.Na__SpStore__STATUS_EMPTY, S.Na__SpStore__STATUS_EMPTY, true ])

// ---- On localhost: the Flask repository copy first, unversioned, then R2 -------
asked.length = 0
globalThis.__LOCALHOST = true
await S.Na__SpStore__Reload()
const localAsks = asked.filter(u => u.indexOf('/SitePlan__DrawingData__Proposed/') !== -1)
check('localhost: the repository copy the Flask server serves is read first, both names, before R2',
  localAsks.slice(0, 3),
  [ `${WCP}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/TrueVision__SitePlanData__Manifest__.json`,
    `${WCP}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/ValeVision__SitePlanData__Manifest__.json`,
    `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/TrueVision__SitePlanData__Manifest__.json?v=20261002-1` ])
check('localhost: GitHub Pages is never asked',
  asked.some(u => u.indexOf(GH) === 0), false)

// A manifest found under THIS app's name, in the repository copy, is read and its stems renamed.
asked.length = 0
globalThis.fetch = async (url) => {
  asked.push(String(url))
  if (String(url) === `${WCP}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/ValeVision__SitePlanData__Manifest__.json`) {
    return { ok : true, status : 200, json : async () => ({
      SitePlanData__SchemaVersion : 1, SitePlanData__ExportedIso : '2026-10-02T10:00:00Z',
      SitePlanData__Layers : [ { Layer__CategoryKey : XS('RedLineBoundary'), Layer__LineworkFile : XS('RedLineBoundary') + '__LineworkModel__.glb',
                                 Layer__BoundsMm : { MinX : 0, MinZ : 0, MaxX : 5, MaxZ : 6 } } ]
    }) }
  }
  return { ok : false, status : 404 }
}
await S.Na__SpStore__Reload()
const fromManifest = S.Na__SpStore__GetDescriptor('proposed')
check('localhost: ValeVision\'s manifest name is accepted, from the repository copy',
  fromManifest && [ fromManifest.SitePlan__Source, fromManifest.SitePlan__FolderName ], [ 'manifest', 'SitePlan__DrawingData__Proposed' ])
check('its layer is read in this app\'s token, with its GLB on this project\'s R2 folder',
  fromManifest && fromManifest.SitePlan__Layers.map(l => [ l.Layer__CategoryKey, l.Layer__LineworkUrl ]),
  [ [ VS('RedLineBoundary'), `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/` + XS('RedLineBoundary') + '__LineworkModel__.glb' ] ])
check('and the red line is what a new viewport centres on',
  S.Na__SpStore__GetFocusBoundsMm('proposed'), { MinX : 0, MinY : 0, MaxX : 5, MaxY : 6 })

// The GLB itself: on localhost the repository copy first, then R2, with the export time.
asked.length = 0
globalThis.__PARSE_LINE = () => ({ segments : new Float64Array([0, 0, 1, 1]), segmentCount : 1, boundsMm : null })
await S.Na__SpStore__LoadLayer(VS('RedLineBoundary')).catch(() => null)
const glb = XS('RedLineBoundary') + '__LineworkModel__.glb?v=' + encodeURIComponent('2026-10-02T10:00:00Z')
check('localhost: a GLB is asked of the repository copy, then R2, each with the export time',
  asked.slice(0, 2),
  [ `${WCP}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/` + glb, `${R2}/${FOLDER_ID}/SitePlan__DrawingData__Proposed/` + glb ])
delete globalThis.__PARSE_LINE
globalThis.__LOCALHOST = false
globalThis.fetch = async () => { throw new Error('no network in this harness') }

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
