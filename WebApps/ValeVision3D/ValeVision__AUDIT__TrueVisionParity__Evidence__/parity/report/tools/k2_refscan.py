#!/usr/bin/env python3
"""K2 reference scanner (READ-ONLY on both apps and WCP).

Counts and classifies every reference to a pattern inside ValeVision3D (and,
with --app tv, TrueVision3D), so each rename row in the K2 target maps carries
an importer list that was produced by a grep of the live trees, not copied
from a slice report.

Scanned roots (never an app root or git root - .claude worktrees and
node_modules are skipped):
  VV: 02__Src__AppModules, 03__Style__AppStylesheets, 80__Testing__PrototypeEnvironment,
      79__Testing__GenerateObjects, and the files at the app root (index.html, *.md,
      *.json, *.js).
  WCP (with --wcp): server.py, Server__*.py, the shared SW logic / registrar,
      WebApps/live_sw.js, WebApps/Na__Pwa__ServiceWorker__.js, CloudflareWorker/src.
  TV: 02__Src__AppModules, 03__Style__AppStylesheets, 80__Testing__PrototypeEnvironment,
      Index.html.

Classification of each hit line:
  import   - static or dynamic ES import / export-from of the path
  css      - @import / url() / a stylesheet list entry
  string   - any other string literal (fetch path, config value, precache entry)
  comment  - the line is a comment (// * /* # <!--) or the hit sits after //
  history  - devlog / ledger / plan documents (never rewritten)

Usage:
  python k2_refscan.py PATTERN [PATTERN ...] [--app vv|tv] [--wcp] [--json OUT] [--lines]
PATTERN is a Python regex. Each pattern is reported separately.
"""
import argparse, json, os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
WEBAPPS = r'D:\10_CoreLib__ValeCodebase\WebApps'

TEXT_EXT = {'.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm', '.md', '.py', '.txt', '.toml', '.jsonc', '.webmanifest', '.mdh'}
SKIP_DIRS = {'node_modules', '.wrangler', '.claude', '.git', '__pycache__'}
HISTORY_FILES = re.compile(r'(DEVLOG|PARITY__TrueVisionLedger|__PLAN__|LOG__Whitecardopedia__DEVLOG)', re.I)


def iter_files(app, wcp):
    if app == 'vv':
        root = VV
        subs = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment', '79__Testing__GenerateObjects']
    else:
        root = TV
        subs = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
    for sub in subs:
        base = os.path.join(root, sub)
        for dp, dns, fns in os.walk(base):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                if os.path.splitext(fn)[1].lower() in TEXT_EXT:
                    full = os.path.join(dp, fn)
                    yield ('VV/' if app == 'vv' else 'TV/') + os.path.relpath(full, root).replace(os.sep, '/'), full
    for fn in os.listdir(root):
        full = os.path.join(root, fn)
        if os.path.isfile(full) and os.path.splitext(fn)[1].lower() in TEXT_EXT:
            yield ('VV/' if app == 'vv' else 'TV/') + fn, full
    if wcp and app == 'vv':
        extra = [
            os.path.join(WCP, 'server.py'),
            os.path.join(WCP, 'Server__ValeVisionScrapbook__Api__.py'),
            os.path.join(WCP, '02__Src__AppModules', '62__Feature__AppInstallability', 'Whitecardopedia__Pwa__ServiceWorker__Logic__.js'),
            os.path.join(WCP, '02__Src__AppModules', '62__Feature__AppInstallability', 'Whitecardopedia__Pwa__ServiceWorker__Registrar__.js'),
            os.path.join(WEBAPPS, 'live_sw.js'),
            os.path.join(WEBAPPS, 'Na__Pwa__ServiceWorker__.js'),
        ]
        for full in extra:
            if os.path.isfile(full):
                yield 'WEBAPPS/' + os.path.relpath(full, WEBAPPS).replace(os.sep, '/'), full
        wsrc = os.path.join(WCP, 'CloudflareWorker', 'src')
        for dp, dns, fns in os.walk(wsrc):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                if os.path.splitext(fn)[1].lower() in TEXT_EXT:
                    full = os.path.join(dp, fn)
                    yield 'WEBAPPS/' + os.path.relpath(full, WEBAPPS).replace(os.sep, '/'), full


def classify(rel, line, m_start):
    if HISTORY_FILES.search(rel):
        return 'history'
    s = line.strip()
    if s.startswith(('//', '*', '/*', '#', '<!--')):
        return 'comment'
    before = line[:m_start]
    if '//' in before and not re.search(r'https?:$', before.split('//')[0][-6:] + ':'):
        # crude: a // before the hit that is not part of a URL
        idx = before.rfind('//')
        if idx >= 0 and not before[max(0, idx - 6):idx].endswith(('http:', 'https:')):
            if before.count("'") % 2 == 0 and before.count('"') % 2 == 0 and before.count('`') % 2 == 0:
                return 'comment'
    if re.search(r'\bfrom\s*[\'"]', line) or re.search(r'\bimport\s*\(', line) or re.search(r'^\s*import\s+[\'"]', line) or re.search(r'\bexport\s+\*\s+from', line):
        return 'import'
    if '@import' in line or 'url(' in line or re.search(r'\.css[\'"]', line):
        return 'css'
    return 'string'


def scan(patterns, app, wcp, want_lines):
    regs = [(p, re.compile(p)) for p in patterns]
    res = {p: {} for p in patterns}
    for rel, full in iter_files(app, wcp):
        try:
            text = open(full, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        lines = text.splitlines()
        for p, rg in regs:
            if not rg.search(text):
                continue
            for i, ln in enumerate(lines, 1):
                for m in rg.finditer(ln):
                    kind = classify(rel, ln, m.start())
                    rec = res[p].setdefault(rel, {'refs': 0, 'kinds': {}, 'lines': []})
                    rec['refs'] += 1
                    rec['kinds'][kind] = rec['kinds'].get(kind, 0) + 1
                    if want_lines:
                        rec['lines'].append([i, kind, ln.strip()[:220]])
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('patterns', nargs='+')
    ap.add_argument('--app', default='vv', choices=['vv', 'tv'])
    ap.add_argument('--wcp', action='store_true')
    ap.add_argument('--json')
    ap.add_argument('--lines', action='store_true')
    a = ap.parse_args()
    res = scan(a.patterns, a.app, a.wcp, a.lines or bool(a.json))
    if a.json:
        json.dump(res, open(a.json, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    for p in a.patterns:
        files = res[p]
        tot = sum(r['refs'] for r in files.values())
        kinds = {}
        for r in files.values():
            for k, v in r['kinds'].items():
                kinds[k] = kinds.get(k, 0) + v
        live = [f for f, r in files.items() if any(k != 'history' for k in r['kinds'])]
        print('=== %s : %d files (%d non-history), %d refs %s' % (p, len(files), len(live), tot, kinds))
        for f in sorted(files):
            r = files[f]
            print('  %3d %-60s %s' % (r['refs'], f, r['kinds']))
            if a.lines:
                for ln in r['lines']:
                    print('        :%d [%s] %s' % tuple(ln))


if __name__ == '__main__':
    main()
