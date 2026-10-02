// =============================================================================
// VALEVISION3D - VERIFY - UI PARITY WITH TRUEVISION (FOLD, STRIP, VEIL, PANELS)
// =============================================================================
//
// FILE       : Na__Verify__UiParity__.mjs
// NAMESPACE  : Na__Verify
// MODULE     : UI Parity Gate
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the CSS that makes the drawing editor look and move like TrueVision's - the header fold, the tab strip, the loading veils, the panels and the stylesheet order - is TrueVision's, rule for rule
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - RULE FOR RULE, COMMENTS ASIDE. Each guarded region is read from both
//   apps, its comments stripped, and every rule compared in order: the
//   selector (and any @media around it) and every declaration, whitespace
//   folded. One character changed in any guarded rule is a failure; a
//   comment that names this app instead of TrueVision is not.
// - THE CHECKS (S10's WP-S10-05, R3 C.2 (j2), F.5.1 G4-UI):
//   [1] fold   - the AppHeader fold region ("Contextual Fold"), the bar
//                lifting off on a drawing tab. Equal to TrueVision's since
//                v2.70.0; W1-33 keeps it so.
//   [2] strip  - the tab strip region this app keeps in Styles__Boot (drawn
//                before the editor loads) against the "Tab Strip" region of
//                TrueVision's Styles__Main. W1-34 brings it level.
//   [3] veil   - the LoadingOverlays veil region against TrueVision's
//                "Layout Editor Loading Veils" (this app's region is still
//                titled "Layout Editor Return-to-Model Veil" until W1-33).
//   [4] panels - Styles__Panels, the whole sheet. W1-38 takes it verbatim.
//   [5] order  - the editor stylesheets in TrueVision's CSS-index order:
//                Na__LeLoad__STYLESHEETS holds TrueVision's Layout Editor
//                sequence for the files this app has (Surfaces first,
//                WebViewer last), none of them also in the CSS index, every
//                listed file present; Colour Palette and Spell Check, when
//                here, in the CSS index after Boot in TrueVision's order.
//   [6] motion - no prefers-reduced-motion query in AppHeader: TrueVision
//                took its branch out because it switched the fold off on
//                the studio PC (TV AppHeader, region "Why There Is No ...").
//   [7] token  - a warning, never a failure: the shared service-worker
//                token is older than this app's newest release, so a warm
//                client may hold old modules. The bump is Adam's (DR-07).
// - A REPORT UNTIL EACH OWNER LANDS (F.8 C2). Checks 2, 3 and 4 fail today
//   by design: their owners are W1-34, W1-33 and W1-38. So the run is a
//   report and exits 0 unless --block names the checks that must pass:
//   --block 1,3 once W1-33 is done, add 2 after W1-34 and 4 after W1-38,
//   and --block all from W1-99 on.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Verify__UiParity__.mjs <TrueVision app root> [options]
//
//       --pin <commit>     read TrueVision at this commit with git (recommended: the programme pin,
//                          b2aa9151 on 01-Oct-2026); without it TrueVision's working tree is read
//       --block <list>     checks that fail the run: ids or names, comma separated (1,3 or fold,veil), or all
//       --root <app root>  check another copy of this app (default: the app this script sits in)
//       --verbose          list every difference, not the first dozen
//       --self-test        the mutation proof, on copies held in memory: every guarded rule changed by one
//                          character must fail its check (both apps' copies), and each order and motion fault too
//
//   Exit 0 = report printed and no blocking check failed. Exit 1 = a blocking check failed (or a self-test
//   case did). Exit 2 = it could not run. Reads only; writes nothing. Runs in seconds.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first; no TrueVision twin (WP-S10-05 of the parity
//                   plan, landed by package W0-04)
// - Parity        : new
// - Back-port     : TrueVision could run it the other way round; offered with the
//                   TrueVision lane (DR-36), not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W0-04}})
// - Written for the TrueVision parity programme (gate G4-UI): seven checks,
//   report mode with per-check blocking, and the mutation self-test.
//
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | Configuration
// -----------------------------------------------------------------------------

    const Na__Verify__ScriptDir = dirname(fileURLToPath(import.meta.url));                       // <-- 80__Testing__PrototypeEnvironment

    // FILES | App-root relative, the same path in both apps unless noted
    // ------------------------------------------------------------
    const Na__Verify__Files = {
        appHeader      : '03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css',
        overlays       : '03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css',
        cssIndex       : '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        mainSheet      : '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
        bootSheet      : '02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css',
        panelsSheet    : '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
        loader         : '02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js',
        devlog         : 'ValeVision__DEVLOG__.md',
        serviceWorker  : '../Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js'
    };
    const Na__Verify__LeFolder   = '51__System__LayoutEditor/';
    const Na__Verify__AppWide    = [ '54__Feature__ColourPalette/', '55__Feature__SpellCheck/' ];  // <-- TrueVision imports these straight after its LE region
    // ------------------------------------------------------------

    // CHECKS | id, name, owner (the package that makes it pass), what it guards
    // ------------------------------------------------------------
    const Na__Verify__Checks = [
        { id : 1, name : 'fold',   owner : 'W1-33 (equal to TrueVision since v2.70.0)' },
        { id : 2, name : 'strip',  owner : 'W1-34' },
        { id : 3, name : 'veil',   owner : 'W1-33' },
        { id : 4, name : 'panels', owner : 'W1-38' },
        { id : 5, name : 'order',  owner : 'every package that lands an editor stylesheet (W2-18, W2-19, W3-09, W4-08), W5-02' },
        { id : 6, name : 'motion', owner : 'W1-33' },
        { id : 7, name : 'token',  owner : 'Adam at deploy (DR-07); a warning only' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Command Line and Reading Both Apps
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Options
    // ------------------------------------------------------------
    function Na__Verify__ReadOptions(argv) {
        const options = { tv : null, pin : null, block : new Set(), root : null, verbose : false, selfTest : false };
        for (let index = 0; index < argv.length; index++) {
            const arg = argv[index];
            if (arg === '--pin')            options.pin = argv[++index];
            else if (arg === '--tv')        options.tv = argv[++index];
            else if (arg === '--root')      options.root = argv[++index];
            else if (arg === '--verbose')   options.verbose = true;
            else if (arg === '--self-test') options.selfTest = true;
            else if (arg === '--block') {
                String(argv[++index] || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((want) => {
                    const hits = want === 'all' ? Na__Verify__Checks : Na__Verify__Checks.filter((c) => String(c.id) === want || c.name === want);
                    if (!hits.length) throw new Error('--block: no check called "' + want + '" (ids 1-7 or ' + Na__Verify__Checks.map((c) => c.name).join(', ') + ')');
                    hits.forEach((c) => options.block.add(c.id));
                });
            }
            else if (!arg.startsWith('--') && !options.tv) options.tv = arg;
            else throw new Error('Unknown option "' + arg + '" (see the USAGE block at the top of this file)');
        }
        return options;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Reader for One App's Files
    // ------------------------------------------------------------
    // TrueVision is read with git show at the pin when one is given, else from
    // its working tree. Returns { label, read(rel) -> text | null }.
    // ------------------------------------------------------------
    function Na__Verify__Reader(root, pin) {
        const base = resolve(root);
        if (!existsSync(base)) throw new Error('app root not found: ' + base);
        if (!pin) {
            return { label : base, read : (rel) => existsSync(join(base, rel)) ? readFileSync(join(base, rel), 'utf8').replace(/^\uFEFF/, '') : null };
        }
        const top    = execFileSync('git', [ '-C', base, 'rev-parse', '--show-toplevel' ]).toString('utf8').trim();
        const prefix = execFileSync('git', [ '-C', base, 'rev-parse', '--show-prefix' ]).toString('utf8').trim();
        return {
            label : base + ' at ' + pin + ' (git)',
            read  : (rel) => {
                try {
                    return execFileSync('git', [ '-C', top, 'show', pin + ':' + prefix + rel ], { stdio : [ 'ignore', 'pipe', 'ignore' ], maxBuffer : 64 * 1024 * 1024 })
                        .toString('utf8').replace(/^\uFEFF/, '');
                } catch (error) {
                    return null;
                }
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | CSS: Regions and Rules
// -----------------------------------------------------------------------------

    // FUNCTION | Cut One REGION Out of a Stylesheet
    // ------------------------------------------------------------
    // From the comment line that says "REGION | <title>" (the title is the
    // first |-separated segment after REGION) to the next "endregion" line.
    // titles is tried in order. Returns { title, text } or null.
    // ------------------------------------------------------------
    function Na__Verify__Region(css, titles) {
        if (css === null) return null;
        const lines = css.split(/\r?\n/);
        for (const title of titles) {
            let start = lines.findIndex((line) => {
                const at = line.indexOf('REGION');
                if (at === -1 || line.indexOf('endregion') !== -1) return false;
                const rest = line.slice(at + 'REGION'.length).replace(/\*\/\s*$/, '');
                const segs = rest.split('|').map((s) => s.trim()).filter((s, i) => i > 0 || s.length);
                return segs.length > 0 && segs[0] === title;
            });
            if (start === -1) continue;
            let end = lines.findIndex((line, index) => index > start && line.indexOf('endregion') !== -1);
            if (end === -1) end = lines.length - 1;
            // A REGION title usually sits inside a /* ... */ block that opened a line
            // or two above it: start the cut at that opener, so the cut text is
            // well-formed CSS whose comments strip cleanly.
            const before = lines.slice(0, start).join('\n');
            const open   = before.lastIndexOf('/*');
            if (open !== -1 && before.indexOf('*/', open) === -1) start = before.slice(0, open).split('\n').length - 1;
            return { title, text : lines.slice(start, end + 1).join('\n') };
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Every Rule of a Stylesheet Fragment
    // ------------------------------------------------------------
    // Comments are blanked (offsets kept, so a mutation can be aimed at the
    // text), quotes and brackets are respected, and the result is a list of
    // entries in source order:
    //   { key : 'RULE <context>' | 'DECL <context> :: prop: value' | 'STMT ...', spans : [[from, to], ...] }
    // where context is the selector chain, @media included, whitespace folded.
    // ------------------------------------------------------------
    function Na__Verify__ParseCss(css) {
        const code    = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
        const fold    = (s) => s.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\s*>\s*/g, ' > ').trim();
        const entries = [];
        const stack   = [];
        let start = -1, quote = null, depth = 0;
        const statement = (from, to) => {
            const raw = code.slice(from, to);
            if (!raw.trim()) return;
            const colon = raw.indexOf(':');
            const lead  = from + raw.search(/\S/);
            if (stack.length && colon !== -1 && !/^\s*@/.test(raw)) {
                const prop  = raw.slice(0, colon).trim();
                const value = raw.slice(colon + 1).replace(/\s+/g, ' ').trim();
                const vFrom = from + colon + 1 + raw.slice(colon + 1).search(/\S|$/);
                entries.push({ key : 'DECL ' + stack.join(' / ') + ' :: ' + prop + ': ' + value, spans : [ [ lead, lead + prop.length ], [ vFrom, to ] ] });
            } else {
                entries.push({ key : 'STMT ' + stack.join(' / ') + ' :: ' + fold(raw), spans : [ [ lead, to ] ] });
            }
        };
        for (let index = 0; index < code.length; index++) {
            const ch = code[index];
            if (quote) { if (ch === '\\') index++; else if (ch === quote) quote = null; continue; }
            if (ch === '"' || ch === '\'') { quote = ch; if (start === -1) start = index; continue; }
            if (ch === '(') { depth++; if (start === -1) start = index; continue; }
            if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
            if (depth > 0) continue;
            if (ch === '{') {
                const raw = start === -1 ? '' : code.slice(start, index);
                stack.push(fold(raw));
                entries.push({ key : 'RULE ' + stack.join(' / '), spans : [ [ start === -1 ? index : start, index ] ] });
                start = -1;
                continue;
            }
            if (ch === ';' || ch === '}') {
                if (start !== -1) statement(start, index);
                if (ch === '}') stack.pop();
                start = -1;
                continue;
            }
            if (start === -1 && !/\s/.test(ch)) start = index;
        }
        if (start !== -1) statement(start, code.length);
        return entries;
    }
    // ------------------------------------------------------------


    // FUNCTION | Compare Two Rule Lists, in Order
    // ------------------------------------------------------------
    // Returns { equal, onlyTv : [keys], onlyVv : [keys], firstDiff } - a
    // multiset difference for the reader, plus the first position where the
    // two sequences part (which also catches a reordering).
    // ------------------------------------------------------------
    function Na__Verify__CompareRules(tvEntries, vvEntries) {
        const tv = tvEntries.map((e) => e.key);
        const vv = vvEntries.map((e) => e.key);
        let firstDiff = -1;
        for (let index = 0; index < Math.max(tv.length, vv.length); index++) {
            if (tv[index] !== vv[index]) { firstDiff = index; break; }
        }
        const count = new Map();
        tv.forEach((k) => count.set(k, (count.get(k) || 0) + 1));
        const onlyVv = [];
        vv.forEach((k) => { if (count.get(k) > 0) count.set(k, count.get(k) - 1); else onlyVv.push(k); });
        const onlyTv = [];
        count.forEach((n, k) => { for (let i = 0; i < n; i++) onlyTv.push(k); });
        return { equal : firstDiff === -1, onlyTv, onlyVv, firstDiff, tvCount : tv.length, vvCount : vv.length,
                 tvAt : tv[firstDiff], vvAt : vv[firstDiff] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Seven Checks
// -----------------------------------------------------------------------------

    // FUNCTION | A Region Check (1-4)
    // ------------------------------------------------------------
    function Na__Verify__RegionCheck(label, tvCss, tvTitles, vvCss, vvTitles) {
        const tvRegion = tvTitles ? Na__Verify__Region(tvCss, tvTitles) : (tvCss === null ? null : { title : '(whole file)', text : tvCss });
        const vvRegion = vvTitles ? Na__Verify__Region(vvCss, vvTitles) : (vvCss === null ? null : { title : '(whole file)', text : vvCss });
        if (!tvRegion) return { status : 'FAIL', summary : label + ': TrueVision\'s region ' + (tvTitles ? '"' + tvTitles[0] + '"' : '') + ' not found', details : [] };
        if (!vvRegion) return { status : 'FAIL', summary : label + ': this app\'s region ' + (vvTitles ? '"' + vvTitles.join('" or "') + '"' : '') + ' not found', details : [] };
        const tv = Na__Verify__ParseCss(tvRegion.text);
        const vv = Na__Verify__ParseCss(vvRegion.text);
        const c  = Na__Verify__CompareRules(tv, vv);
        const rules = tv.filter((e) => e.key.startsWith('RULE ')).length;
        const decls = tv.filter((e) => e.key.startsWith('DECL ')).length;
        const where = tvTitles ? ' (TrueVision "' + tvRegion.title + '"' + (vvRegion.title !== tvRegion.title ? '; here "' + vvRegion.title + '"' : '') + ')' : '';
        if (c.equal) return { status : 'PASS', summary : label + where + ': ' + rules + ' rules, ' + decls + ' declarations, equal to TrueVision\'s', details : [], tv, vv };
        const details = [];
        if (c.onlyTv.length || c.onlyVv.length) {
            c.onlyTv.forEach((k) => details.push('only in TrueVision: ' + k));
            c.onlyVv.forEach((k) => details.push('only here:          ' + k));
        } else {
            details.push('same rules in a different order; first difference at entry ' + (c.firstDiff + 1) + ':');
            details.push('  TrueVision: ' + c.tvAt);
            details.push('  here:       ' + c.vvAt);
        }
        return { status : 'FAIL', summary : label + where + ': TrueVision ' + c.tvCount + ' entries, here ' + c.vvCount + '; '
                 + c.onlyTv.length + ' only in TrueVision, ' + c.onlyVv.length + ' only here', details, tv, vv };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The @import Paths of a CSS Index, App-Root Relative
    // ------------------------------------------------------------
    function Na__Verify__IndexImports(css) {
        if (css === null) return [];
        const code = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
        return Array.from(code.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/g))
            .map((m) => m[1].replace(/^\.\.\//, '').replace(/^(?!0\d__|\.\.)/, '03__Style__AppStylesheets/'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Loader's Na__LeLoad__STYLESHEETS, Layout Editor Relative
    // ------------------------------------------------------------
    function Na__Verify__LoaderList(source) {
        if (source === null) return null;
        const list = source.match(/Na__LeLoad__STYLESHEETS\s*=\s*\[([\s\S]*?)\];/);
        if (!list) return null;
        const code = list[1].replace(/\/\/[^\n]*/g, '');
        return Array.from(code.matchAll(/new\s+URL\(\s*['"]\.\.\/([^'"]+\.css)['"]\s*,\s*import\.meta\.url\s*\)/g)).map((m) => m[1]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Check 5: the Stylesheet Order
    // ------------------------------------------------------------
    // exists(rel) answers whether this app has a file (app-root relative).
    // ------------------------------------------------------------
    function Na__Verify__OrderCheck(tvIndexCss, vvIndexCss, loaderSource, exists) {
        const leRel   = (p) => p.slice(p.indexOf(Na__Verify__LeFolder) + Na__Verify__LeFolder.length);
        const tvIndex = Na__Verify__IndexImports(tvIndexCss);
        const tvLe    = tvIndex.filter((p) => p.indexOf('/' + Na__Verify__LeFolder) !== -1).map(leRel);
        const tvWide  = tvIndex.filter((p) => Na__Verify__AppWide.some((f) => p.indexOf('/' + f) !== -1));
        const loader  = Na__Verify__LoaderList(loaderSource);
        const vvIndex = Na__Verify__IndexImports(vvIndexCss);
        const faults  = [];
        if (!tvLe.length) faults.push('TrueVision\'s CSS index has no Layout Editor @import (wrong root or pin?)');
        if (loader === null) faults.push('Na__LeLoad__STYLESHEETS not found in the loader');
        if (faults.length) return { status : 'FAIL', summary : 'stylesheet order: ' + faults[0], details : faults.slice(1) };

        const leFile   = (rel) => '02__Src__AppModules/' + Na__Verify__LeFolder + rel;
        const expected = tvLe.filter((rel) => exists(leFile(rel)));
        loader.filter((rel) => !exists(leFile(rel))).forEach((rel) => faults.push('listed but not on disk (never pre-register a sheet): ' + rel));
        if (loader.join('\n') !== expected.join('\n')) {
            faults.push('Na__LeLoad__STYLESHEETS is not TrueVision\'s CSS-index sequence for the files this app has:');
            faults.push('  expected: ' + expected.join(', '));
            faults.push('  loader:   ' + loader.join(', '));
        }
        if (expected.length && (loader[0] !== expected[0] || loader[loader.length - 1] !== expected[expected.length - 1])) {
            faults.push('Surfaces must come first and WebViewer last (TrueVision\'s first and last Layout Editor imports: ' + tvLe[0] + ', ' + tvLe[tvLe.length - 1] + ')');
        }
        const twoHomes = vvIndex.filter((p) => p.indexOf('/' + Na__Verify__LeFolder) !== -1 && tvLe.includes(leRel(p)));
        twoHomes.forEach((p) => faults.push('imported by the CSS index as well as linked by the loader (one home only): ' + p));
        const wideHere = tvWide.filter((p) => exists(p));
        const bootAt   = vvIndex.findIndex((p) => /Na__LayoutEditor__Styles__Boot__\.css$/.test(p));
        const wideAt   = wideHere.map((p) => vvIndex.indexOf(p));
        wideHere.forEach((p, i) => {
            if (wideAt[i] === -1)          faults.push('present but not imported by the CSS index (TrueVision imports it after its Layout Editor sheets): ' + p);
            else if (wideAt[i] < bootAt)   faults.push('imported before Styles__Boot; TrueVision imports it after its Layout Editor sheets: ' + p);
        });
        if (wideAt.length === 2 && wideAt[0] !== -1 && wideAt[1] !== -1 && wideAt[0] > wideAt[1]) faults.push('Colour Palette must come before Spell Check, as in TrueVision');
        if (faults.length) return { status : 'FAIL', summary : 'stylesheet order: ' + faults.length + ' fault(s)', details : faults };
        return { status : 'PASS', summary : 'stylesheet order: Na__LeLoad__STYLESHEETS = TrueVision\'s CSS-index Layout Editor sequence for the '
                 + expected.length + ' of ' + tvLe.length + ' sheets this app has (' + expected[0].split('/').pop() + ' first, ' + expected[expected.length - 1].split('/').pop()
                 + ' last), none also in the CSS index; Colour Palette and Spell Check: ' + (wideHere.length ? 'after Boot, in order' : 'not here yet'), details : [] };
    }
    // ------------------------------------------------------------


    // FUNCTION | Check 6: No prefers-reduced-motion in AppHeader
    // ------------------------------------------------------------
    function Na__Verify__MotionCheck(appHeaderCss) {
        if (appHeaderCss === null) return { status : 'FAIL', summary : 'AppHeader not found', details : [] };
        const code = appHeaderCss.replace(/\/\*[\s\S]*?\*\//g, ' ');
        const hit  = /@media[^{]*prefers-reduced-motion/i.test(code);
        return hit ? { status : 'FAIL', summary : 'AppHeader has a prefers-reduced-motion query: TrueVision removed its branch because it switched the fold off (TV AppHeader, "Why There Is No prefers-reduced-motion Branch Here")', details : [] }
                   : { status : 'PASS', summary : 'no prefers-reduced-motion query in AppHeader (comments aside)', details : [] };
    }
    // ------------------------------------------------------------


    // FUNCTION | Check 7: the Shared Service-Worker Token Against This App's Releases
    // ------------------------------------------------------------
    function Na__Verify__TokenCheck(serviceWorker, devlog) {
        const token = serviceWorker === null ? null : (serviceWorker.match(/PWA_SW_VERSION_TOKEN\s*=\s*['"]([^'"]+)['"]/) || [])[1];
        if (!token) return { status : 'WARN', summary : 'service-worker token not found (Whitecardopedia\'s logic file not readable from here)', details : [] };
        const months = { Jan : 1, Feb : 2, Mar : 3, Apr : 4, May : 5, Jun : 6, Jul : 7, Aug : 8, Sep : 9, Oct : 10, Nov : 11, Dec : 12 };
        const releases = devlog === null ? [] : Array.from(devlog.matchAll(/^## ValeVision3D (v\d+\.\d+\.\d+) - (\d{1,2})-([A-Z][a-z]{2})-(\d{4})/gm))
            .map((m) => ({ version : m[1], date : m[2].padStart(2, '0') + '-' + m[3] + '-' + m[4], stamp : Number(m[4]) * 10000 + months[m[3]] * 100 + Number(m[2]) }));
        const t = token.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!t || !releases.length) return { status : 'WARN', summary : 'could not date the token \'' + token + '\' against the devlog\'s releases', details : [] };
        const tokenStamp = Number(t[1]) * 10000 + Number(t[2]) * 100 + Number(t[3]);
        const newer = releases.filter((r) => r.stamp > tokenStamp);
        if (!newer.length) return { status : 'PASS', summary : 'shared service-worker token \'' + token + '\' is not older than this app\'s newest release (' + releases[0].version + ')', details : [] };
        const newest = newer.reduce((a, b) => (b.stamp > a.stamp ? b : a));
        return { status : 'WARN', summary : 'shared service-worker token \'' + token + '\' predates ' + newer.length + ' ValeVision release(s), newest ' + newest.version + ' (' + newest.date
                 + '): a warm client may pair old cached modules with new ones. The bump is Adam\'s, at deploy (DR-07, F.5.6)', details : [] };
    }
    // ------------------------------------------------------------


    // FUNCTION | Run All Seven Checks
    // ------------------------------------------------------------
    function Na__Verify__RunChecks(tv, vv, vvExists) {
        const f = Na__Verify__Files;
        return [
            Na__Verify__RegionCheck('AppHeader fold region', tv.read(f.appHeader), [ 'Contextual Fold' ], vv.read(f.appHeader), [ 'Contextual Fold' ]),
            Na__Verify__RegionCheck('Boot tab-strip region against TrueVision Styles__Main', tv.read(f.mainSheet), [ 'Tab Strip' ], vv.read(f.bootSheet), [ 'Tab Strip' ]),
            Na__Verify__RegionCheck('LoadingOverlays veil region', tv.read(f.overlays), [ 'Layout Editor Loading Veils' ], vv.read(f.overlays), [ 'Layout Editor Loading Veils', 'Layout Editor Return-to-Model Veil' ]),
            Na__Verify__RegionCheck('Styles__Panels (whole sheet)', tv.read(f.panelsSheet), null, vv.read(f.panelsSheet), null),
            Na__Verify__OrderCheck(tv.read(f.cssIndex), vv.read(f.cssIndex), vv.read(f.loader), vvExists),
            Na__Verify__MotionCheck(vv.read(f.appHeader)),
            Na__Verify__TokenCheck(vv.read(f.serviceWorker), vv.read(f.devlog))
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Self-Test: the Mutation Proof (copies in memory; nothing is written)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Change One Character Inside a Span
    // ------------------------------------------------------------
    // The first letter or digit in the span: a letter becomes another letter,
    // a digit the next digit. Returns null when the span has neither.
    // ------------------------------------------------------------
    function Na__Verify__Mutate(text, [ from, to ]) {
        for (let index = from; index < to; index++) {
            const ch = text[index];
            if (/[a-z]/i.test(ch)) return text.slice(0, index) + (ch.toLowerCase() === 'q' ? 'z' : 'q') + text.slice(index + 1);
            if (/[0-9]/.test(ch))  return text.slice(0, index) + String((Number(ch) + 1) % 10) + text.slice(index + 1);
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Guarded Rule, Changed by One Character, Must Fail
    // ------------------------------------------------------------
    // For each region: every selector, property and value of TrueVision's copy
    // is mutated in turn and compared with the unmutated copy; where this
    // app's copy equals TrueVision's (the fold today), this app's copy is
    // mutated the same way and compared with TrueVision's.
    // ------------------------------------------------------------
    function Na__Verify__SelfTest(tv, vv, vvExists) {
        const f = Na__Verify__Files;
        const cases = [];
        const regions = [
            [ '[1] fold',   tv.read(f.appHeader),   [ 'Contextual Fold' ],             vv.read(f.appHeader),   [ 'Contextual Fold' ] ],
            [ '[2] strip',  tv.read(f.mainSheet),   [ 'Tab Strip' ],                   vv.read(f.bootSheet),   [ 'Tab Strip' ] ],
            [ '[3] veil',   tv.read(f.overlays),    [ 'Layout Editor Loading Veils' ], vv.read(f.overlays),    [ 'Layout Editor Loading Veils', 'Layout Editor Return-to-Model Veil' ] ],
            [ '[4] panels', tv.read(f.panelsSheet), null,                              vv.read(f.panelsSheet), null ]
        ];
        regions.forEach(([ label, tvCss, tvTitles, vvCss, vvTitles ]) => {
            const tvRegion = tvTitles ? Na__Verify__Region(tvCss, tvTitles) : { text : tvCss };
            const vvRegion = vvTitles ? Na__Verify__Region(vvCss, vvTitles) : { text : vvCss };
            if (!tvRegion || tvRegion.text === null) { cases.push([ label + ': TrueVision\'s region readable', false ]); return; }
            const base   = Na__Verify__ParseCss(tvRegion.text);
            const same   = Na__Verify__CompareRules(base, Na__Verify__ParseCss(tvRegion.text)).equal;
            let tried = 0, caught = 0;
            const missed = [];
            base.forEach((entry) => entry.spans.forEach((span) => {
                const mutated = Na__Verify__Mutate(tvRegion.text, span);
                if (mutated === null) return;
                tried++;
                if (!Na__Verify__CompareRules(base, Na__Verify__ParseCss(mutated)).equal) caught++; else missed.push(entry.key);
            }));
            cases.push([ label + ': TrueVision\'s copy against itself is equal, and every one of ' + tried + ' one-character mutations (selectors, properties, values) fails'
                         + (missed.length ? ' - MISSED: ' + missed.slice(0, 3).join(' | ') : ''), same && tried > 0 && caught === tried ]);
            if (vvRegion && vvRegion.text !== null && Na__Verify__CompareRules(base, Na__Verify__ParseCss(vvRegion.text)).equal) {
                const own = Na__Verify__ParseCss(vvRegion.text);
                let vTried = 0, vCaught = 0;
                own.forEach((entry) => entry.spans.forEach((span) => {
                    const mutated = Na__Verify__Mutate(vvRegion.text, span);
                    if (mutated === null) return;
                    vTried++;
                    if (!Na__Verify__CompareRules(base, Na__Verify__ParseCss(mutated)).equal) vCaught++;
                }));
                cases.push([ label + ': this app\'s copy (equal to TrueVision\'s today) fails on every one of ' + vTried + ' one-character mutations', vTried > 0 && vCaught === vTried ]);
            }
        });

        // ORDER | swap, drop and pre-register, on copies of the loader source
        // ------------------------------------------------------------
        const loader  = vv.read(f.loader);
        const list    = Na__Verify__LoaderList(loader) || [];
        const tvIndex = tv.read(f.cssIndex);
        const vvIndex = vv.read(f.cssIndex);
        const baseOrder = Na__Verify__OrderCheck(tvIndex, vvIndex, loader, vvExists);
        cases.push([ '[5] order: the loader as it stands ' + (baseOrder.status === 'PASS' ? 'passes' : 'FAILS: ' + baseOrder.summary), baseOrder.status === 'PASS' ]);
        if (list.length >= 3) {
            const swapped  = loader.replace(list[1], '\u0000').replace(list[2], list[1]).replace('\u0000', list[2]);
            const dropped  = loader.replace(new RegExp('\\s*new\\s+URL\\(\\s*[\'"]\\.\\./' + list[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"][^\\n]*'), '');
            const absent   = '26__System__' + 'DraftMode/Na__LayoutEditor__Styles__DraftMode__.css';         // <-- TrueVision's, not landed here yet (W2-18)
            const early    = loader.replace(list[0], absent + '\', import.meta.url).href,\n        new URL(\'../' + list[0]);
            const surfaces = loader.replace(list[0], '\u0000').replace(list[list.length - 1], list[0]).replace('\u0000', list[list.length - 1]);
            cases.push([ '[5] order: two loader entries swapped fails',        Na__Verify__OrderCheck(tvIndex, vvIndex, swapped, vvExists).status === 'FAIL' ]);
            cases.push([ '[5] order: a loader entry dropped fails',            Na__Verify__OrderCheck(tvIndex, vvIndex, dropped, vvExists).status === 'FAIL' ]);
            cases.push([ '[5] order: a sheet this app does not have, pre-registered, fails', Na__Verify__OrderCheck(tvIndex, vvIndex, early, vvExists).status === 'FAIL' ]);
            cases.push([ '[5] order: Surfaces and WebViewer exchanged fails',   Na__Verify__OrderCheck(tvIndex, vvIndex, surfaces, vvExists).status === 'FAIL' ]);
            cases.push([ '[5] order: a loader sheet also imported by the CSS index fails',
                         Na__Verify__OrderCheck(tvIndex, vvIndex + '\n@import url(\'../02__Src__AppModules/' + Na__Verify__LeFolder + list[1] + '\');\n', loader, vvExists).status === 'FAIL' ]);
        }

        // MOTION | a planted query
        // ------------------------------------------------------------
        const header = vv.read(f.appHeader) || '';
        cases.push([ '[6] motion: AppHeader as it stands passes', Na__Verify__MotionCheck(header).status === 'PASS' ]);
        cases.push([ '[6] motion: a planted prefers-reduced-motion query fails',
                     Na__Verify__MotionCheck(header + '\n@media (prefers-reduced-motion: reduce) { .app-header { transition: none; } }\n').status === 'FAIL' ]);
        cases.push([ '[6] motion: the words in a comment do not count',
                     Na__Verify__MotionCheck(header + '\n/* @media (prefers-reduced-motion: reduce) { } */\n').status === 'PASS' ]);

        // TOKEN | dated against releases
        // ------------------------------------------------------------
        const sw = 'const PWA_SW_VERSION_TOKEN = \'2026-09-18-1\';';
        cases.push([ '[7] token: older than a release warns (never fails)',
                     Na__Verify__TokenCheck(sw, '## ValeVision3D v2.71.0 - 28-Sep-2026 - A\n').status === 'WARN' ]);
        cases.push([ '[7] token: not older than the newest release passes',
                     Na__Verify__TokenCheck(sw, '## ValeVision3D v2.60.0 - 18-Sep-2026 - A\n').status === 'PASS' ]);

        console.log('ValeVision3D - UI parity gate self-test (mutations of copies in memory)');
        let failed = 0;
        cases.forEach(([ name, ok ]) => { if (!ok) failed++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name); });
        console.log(failed === 0 ? '\n  Every self-test case passed (' + cases.length + ').' : '\n  ' + failed + ' self-test case(s) FAILED.');
        return failed === 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

    // FUNCTION | Main
    // ------------------------------------------------------------
    function Na__Verify__Main() {
        const options = Na__Verify__ReadOptions(process.argv.slice(2));
        if (!options.tv) throw new Error('give TrueVision\'s app root: node Na__Verify__UiParity__.mjs <TrueVision app root> [--pin <commit>]');
        const vvRoot   = resolve(options.root || resolve(Na__Verify__ScriptDir, '..'));
        const tv       = Na__Verify__Reader(options.tv, options.pin);
        const vv       = Na__Verify__Reader(vvRoot, null);
        const vvExists = (rel) => existsSync(join(vvRoot, rel));
        if (options.selfTest) return Na__Verify__SelfTest(tv, vv, vvExists) ? 0 : 1;

        const results = Na__Verify__RunChecks(tv, vv, vvExists);
        console.log('ValeVision3D - UI parity gate against TrueVision');
        console.log('  TrueVision : ' + tv.label + (options.pin ? '' : '  (working tree; pass --pin <commit> to read the pinned state)'));
        console.log('  this app   : ' + vvRoot);
        console.log('  mode       : ' + (options.block.size ? 'blocking on ' + Array.from(options.block).sort().map((id) => id + ' ' + Na__Verify__Checks[id - 1].name).join(', ')
                                         : 'report (no check blocks; --block 1,3 once W1-33 is done, add 2 after W1-34 and 4 after W1-38, --block all from W1-99)'));
        console.log('');
        let blockingFails = 0, fails = 0;
        results.forEach((result, index) => {
            const check    = Na__Verify__Checks[index];
            const blocking = options.block.has(check.id);
            if (result.status === 'FAIL') { fails++; if (blocking) blockingFails++; }
            console.log('  [' + check.id + '] ' + result.status.padEnd(4) + '  ' + check.name.padEnd(6) + '  ' + result.summary);
            if (result.status !== 'PASS') console.log('                    owner: ' + check.owner + (blocking ? '  (BLOCKING)' : ''));
            const shown = options.verbose ? result.details : result.details.slice(0, 12);
            shown.forEach((line) => console.log('                    ' + line));
            if (shown.length < result.details.length) console.log('                    ... ' + (result.details.length - shown.length) + ' more (--verbose)');
        });
        console.log('');
        if (options.block.size) {
            console.log(blockingFails === 0 ? '  RESULT: PASS (' + fails + ' non-blocking check(s) fail)' : '  RESULT: FAIL (' + blockingFails + ' blocking check(s) fail)');
            return blockingFails === 0 ? 0 : 1;
        }
        console.log('  RESULT: report - ' + fails + ' of ' + results.length + ' checks fail (none blocking)');
        return 0;
    }
    // ------------------------------------------------------------

    try {
        process.exitCode = Na__Verify__Main();
    } catch (error) {
        console.error('Na__Verify__UiParity__: ' + (error && error.message ? error.message : error));
        process.exitCode = 2;
    }

// endregion -------------------------------------------------------------------
