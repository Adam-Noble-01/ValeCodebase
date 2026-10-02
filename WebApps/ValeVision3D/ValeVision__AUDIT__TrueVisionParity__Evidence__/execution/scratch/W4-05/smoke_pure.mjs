// W4-05 scratch smoke: import the three node-loadable landed modules (Data__Index, Images, Publish__Page)
// and check they behave and carry ValeVision identity. Move and Typing need a DOM and are covered by
// node --check and G1/G2 only. Not a shipped test.
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/';
const load = (rel) => import(pathToFileURL(ROOT + rel).href);

const Idx  = await load('01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js');
const Img  = await load('01__Core__Data/Na__LayoutEditor__Statement__Images__.js');
const Page = await load('07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js');

let failed = 0, passed = 0;
const check = (label, ok) => { if (ok) passed++; else { failed++; console.log('FAIL', label); } };

// DATA INDEX
const sk = Idx.Na__LeStmtIdx__Skeleton();
check('description names ValeVision', sk.Statement__Description.startsWith('ValeVision Statement Writer - '));
check('description has no TrueVision', !/TrueVision|Noble/.test(sk.Statement__Description));
const norm = Idx.Na__LeStmtIdx__Normalise({ Statement__Documents : [ { Doc__Folder : '01__Orangery__Statement', Doc__File : 'a.md' }, { Doc__Folder : '' } ], Statement__LastId : 3 });
check('normalise keeps one entry and gives it id 4', norm.Statement__Documents.length === 1 && norm.Statement__Documents[0].Doc__Id === 4 && norm.Statement__LastId === 4);
const name = Idx.Na__LeStmtIdx__NameFor(norm, { title : 'Design & Access Statement', projectCode : '3047', projectName : 'Doous', tranche : '01', folderNames : [], fileNames : [], setup : {} });
check('NameFor folder', name.folder === '02__DesignAccessStatement');
check('NameFor number', name.number === 'S01');
check('notes file is not a statement', !Idx.Na__LeStmtIdx__LooksLikeStatement('3047__ProjectNotes__.md') && Idx.Na__LeStmtIdx__LooksLikeStatement('x.md'));

// IMAGES
const entries = [ { path : '01__S/02_Img/a/x.png', name : 'x.png', folder : '01__S/02_Img/a' },
                  { path : '01__S/00__Images/y.png', name : 'y.png', folder : '01__S/00__Images' } ];
const r = Img.Na__LeStmtImg__Resolve('./02_Old/a/x.png', '01__S', entries);
check('resolve by file name', r.path === '01__S/02_Img/a/x.png' && r.matched === 'name');
const used = Img.Na__LeStmtImg__Used('![a](./02_Old/a/x.png) ![b](https://example.com/z.png)', '01__S', entries);
check('used skips absolute, target is the link\'s own address', used.length === 1 && used[0].target === '01__S/02_Old/a/x.png');
check('unused skips parked', Img.Na__LeStmtImg__Unused('', '01__S', entries).length === 1);

// PUBLISH PAGE
const html = Page.Na__LeStmtPubPage__Build('## 1.0 | Introduction\n\n![a](p.png)\n', { Doc__File : 'f.md' },
    { 'p.png' : { url : '/x/p.webp', width : 2000, sourceWidth : 6000, resized : true } }, { projectCode : '3047', stamp : 'S', styles : {} });
check('generator meta is Vale', html.includes('<meta name="generator" content="Vale Garden Houses - ValeVision Statement Writer">'));
check('no NA name in the page', !/Noble Architecture|TrueVision/.test(html));
check('title from first heading', html.includes('<title>1.0 | Introduction</title>'));
check('picture relinked with srcset and sizes', html.includes('src="/x/p.webp"') && html.includes('srcset="/x/p.webp 2000w"') && html.includes('sizes="6000px"'));
check('viewport 842', Page.Na__LeStmtPubPage__VIEWPORT_PX === 842);

console.log((failed ? 'FAIL' : 'PASS') + ' - ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
