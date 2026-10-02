// W4-16 scratch check: the five modules import and link under node, the header and footer
// switch off and on again without losing anything, the Vale defaults are drawn, and no NA or
// TrueVision runtime string is left in the adapted files' code or the config JSON.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/';
const SEC = DIR + '09__Standard__Sections/';
const imp = (p) => import(pathToFileURL(p).href);

let fails = 0;
const check = (ok, label) => { console.log((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) fails++; };

const Head  = await imp(SEC + 'Na__LayoutEditor__Statement__Standard__Header__.js');
const Foot  = await imp(SEC + 'Na__LayoutEditor__Statement__Standard__Footer__.js');
const Toc   = await imp(SEC + 'Na__LayoutEditor__Statement__Standard__Contents__.js');
const Sched = await imp(SEC + 'Na__LayoutEditor__Statement__Standard__DrawingSchedule__.js');
const Fin   = await imp(SEC + 'Na__LayoutEditor__Statement__Standard__Finishes__.js');
const Tok   = await imp(DIR + '02__Core__Markdown/Na__LayoutEditor__Statement__Md__Tokenise__.js');
const config = JSON.parse(readFileSync(SEC + 'Na__LayoutEditor__Statement__Standard__Config__.json', 'utf8'));

check(typeof Sched.Na__LeStmtSched__Definition === 'function' || Object.keys(Sched).length > 0, 'DrawingSchedule links (imports Md__Inline) - exports: ' + Object.keys(Sched).join(','));
check(Object.keys(Fin).length > 0, 'Finishes links (imports Md__Inline, Md__Tokenise) - exports: ' + Object.keys(Fin).join(','));

// Definitions: every section's Id is in the config's enabled list, and the list names no hub.
const ids = [ Head.Na__LeStmtHead__Definition(), Toc.Na__LeStmtToc__Definition(), Foot.Na__LeStmtFoot__Definition() ].map((d) => d.Id);
for (const id of ids) check(config.StatementStandard__EnabledSections.includes(id), 'enabled list names ' + id);
check(!config.StatementStandard__EnabledSections.some((id) => /hub/i.test(id)), 'enabled list leaves the hub out');
check(!('StatementStandard__TrueVisionHub__Config' in config), 'no hub config block');

// Header: new body -> Unwrap (markdown) -> tokenise -> Adopt gives the same body back (config and built-in).
for (const [ label, cfg ] of [ [ 'config', config ], [ 'built-in', null ] ]) {
    const def  = Head.Na__LeStmtHead__Definition();
    const body = def.NewBody(cfg);
    check(/Prepared By: Vale Garden Houses/.test(body) && !/Noble/.test(body), 'header new body is Vale (' + label + ')');
    const md   = Head.Na__LeStmtHead__Unwrap(body, cfg);
    check(md.includes('AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png'), 'header writes back the Vale logo (' + label + ')');
    const blocks = Tok.Na__LeStmtMd__Tokenise(md);
    const back = Head.Na__LeStmtHead__Adopt(Array.isArray(blocks) ? blocks : blocks.Blocks || blocks.blocks);
    // TrueVision's Adopt folds a one-line indented value onto its label line ("Site Address: x"), so the
    // round trip is compared as fields (key + words), as TrueVision's own suite does; the logo line must be
    // recognised (back.Start === 0 and no stray Logo field), which is the seam this package re-applies.
    const norm = (text) => String(text || '').split('\n').filter((l) => l.trim() !== '').map((l) => l.trim()).join(' ').replace(/:\s+/g, ': ');
    check(!!back && back.Start === 0 && !/^Logo:/m.test(back.Body) && norm(back.Body) === norm(body),
          'header off/on round trip, Vale logo line taken over (' + label + ')' + (back ? '' : ' - not adopted'));
    const html = Head.Na__LeStmtHead__Build(cfg, { body });
    check(/alt="Vale Garden Houses"/.test(html) && !/Noble|TrueVision/.test(html), 'header draws the Vale logo alt, no NA string (' + label + ')');
}

// Footer: new body names Vale and draws no NA string.
for (const [ label, cfg ] of [ [ 'config', config ], [ 'built-in', null ] ]) {
    const def  = Foot.Na__LeStmtFoot__Definition();
    const body = def.NewBody(cfg, {});
    check(/Vale Garden Houses/.test(body) && !/Noble/.test(body), 'footer new body is Vale (' + label + ')');
    const html = Foot.Na__LeStmtFoot__Build(cfg, { body });
    check(!/Noble|TrueVision/.test(html), 'footer draws no NA string (' + label + ')');
}

// Contents fallback names this app.
for (const [ label, cfg ] of [ [ 'config', config ], [ 'built-in', null ] ]) {
    const fb = Toc.Na__LeStmtToc__Definition().Fallback(cfg);
    check(/ValeVision's Statement Writer/.test(fb), 'contents fallback names ValeVision (' + label + ')');
}

// No NA / TrueVision runtime string: code lines (comments stripped) of the three adapted modules, and the whole JSON.
for (const name of [ 'Header', 'Footer', 'Contents' ]) {
    const src = readFileSync(SEC + 'Na__LayoutEditor__Statement__Standard__' + name + '__.js', 'utf8');
    const code = src.split('\n').filter((line) => !/^\s*\/\//.test(line)).map((line) => line.replace(/\s\/\/ <--.*$/, '')).join('\n');
    check(!/Noble Architecture|TrueVision|noble-architecture|NA_Company_Logo/.test(code), name + ' code has no NA/TrueVision runtime string');
}
const json = readFileSync(SEC + 'Na__LayoutEditor__Statement__Standard__Config__.json', 'utf8');
check(!/Noble Architecture|TrueVision|noble-architecture|NA_Company_Logo|_T0[1-4]_|\(T0[1-4]\)/.test(json), 'config JSON has no NA/TrueVision string or NA phase example');

console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
