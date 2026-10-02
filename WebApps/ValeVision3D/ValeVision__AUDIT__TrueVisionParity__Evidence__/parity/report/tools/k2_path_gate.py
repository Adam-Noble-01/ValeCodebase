#!/usr/bin/env python3
"""K2 path gate - the checks the two VV harnesses cannot make.

Na__Verify__ModuleGraph__.mjs proves every ES import resolves and
Na__Verify__Exports__.mjs proves every imported NAME exists. Neither reads
CSS @import, fetch / config path strings, `new URL(rel, import.meta.url)`,
HTML <script src>, or folder names passed as path segments (S02a-F01 verifier
note). This gate does, read-only, against any ValeVision3D app root (the live
one or a simulation copy).

Checks
  G1  zero hits of the retired names (default: the seven pre-renumber folder
      names and the three renamed drawing files) outside history documents.
  G2  every CSS @import url(...) resolves (relative to the stylesheet).
  G3  every `new URL('<relative>', import.meta.url)` resolves (relative to the module).
  G4  every app-path string literal ('./02__Src__AppModules/...', '02__Src__AppModules/...',
      '../02__Src__AppModules/...', './04__Lib__...', './01__AppAssets__...') resolves:
      .js/.json -> against the app root (index.html is the document);
      .html     -> against the page, honouring <base href>.
  G5  every quoted NN__System__/NN__Feature__/NN__Data__ folder token names a
      folder that exists (catches path.resolve(..., '47__System__NorthDirection')).

Usage
  python k2_path_gate.py [--root VV_APP_ROOT] [--names regex,...] [--strict-g4]
Exit 0 = PASS, 1 = FAIL.  G4 misses on paths that touch no renamed name are
reported as WARN unless --strict-g4.
"""
import argparse, os, re, sys

DEFAULT_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCOPES = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment', '79__Testing__GenerateObjects']
SKIP_DIRS = {'node_modules', '.wrangler', '.claude', '.git', '__pycache__', 'TestEnv__GlbFiles'}
TEXT_EXT = {'.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm'}
HISTORY = re.compile(r'(DEVLOG|PARITY__TrueVisionLedger|__PLAN__)', re.I)
RETIRED_DEFAULT = [
    r'42__System__DrawingViewCore', r'43__System__FloorPlanViews', r'44__System__PlanAnnotations',
    r'45__System__PlanDimensions', r'46__System__ElevationViews', r'47__System__NorthDirection',
    r'40__System__2dElevationsView', r'Na__AppUtils__SnapshotHistory__', r'Na__DrawView__ComposerPreset',
    r'02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__',
]
RENAMED_TOUCH = re.compile(r'(4[0-9]__System__|91__System__|05__RenderPipeline/Na__RenderEffect__(2dProfileLines|DistanceCulling)|SnapshotHistory|RenderPreset|05__Vendor__JsPdf|06__AppAssets__TitleBlocks|Na__Hotkeys__)')


def files(root):
    for sub in SCOPES:
        base = os.path.join(root, sub)
        if not os.path.isdir(base):
            continue
        for dp, dns, fns in os.walk(base):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                if os.path.splitext(fn)[1].lower() in TEXT_EXT:
                    yield os.path.join(dp, fn)
    for fn in os.listdir(root):
        full = os.path.join(root, fn)
        if os.path.isfile(full) and os.path.splitext(fn)[1].lower() in TEXT_EXT | {'.md'}:
            yield full


def rel(root, p):
    return os.path.relpath(p, root).replace(os.sep, '/')


def strip_js_comments_keep_strings(src):
    """Blank out // and /* */ comments (keeps line numbers and string literals)."""
    out, i, q, n = [], 0, None, len(src)
    while i < n:
        c = src[i]
        if q:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(src[i + 1]); i += 2; continue
            if c == q:
                q = None
            i += 1; continue
        if c in '\'"`':
            q = c; out.append(c); i += 1; continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                out.append(' '); i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            while i < n and not (src[i] == '*' and i + 1 < n and src[i + 1] == '/'):
                out.append('\n' if src[i] == '\n' else ' '); i += 1
            i += 2; out.append('  '); continue
        out.append(c); i += 1
    return ''.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=DEFAULT_ROOT)
    ap.add_argument('--names', default=None, help='comma-separated regexes for G1 (default: renumber set)')
    ap.add_argument('--strict-g4', action='store_true')
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    retired = [x for x in (a.names.split(',') if a.names else RETIRED_DEFAULT) if x]
    g1 = re.compile('|'.join('(?:%s)' % x for x in retired))
    fails, warns = [], []
    folders = set()
    msrc = os.path.join(root, '02__Src__AppModules')
    for dp, dns, fns in os.walk(msrc):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        if dp[len(msrc):].count(os.sep) >= 3:
            dns[:] = []
        for d in dns:
            folders.add(d)
    counts = {'G1': 0, 'G2': 0, 'G3': 0, 'G4': 0, 'G5': 0}
    for p in files(root):
        r = rel(root, p)
        try:
            text = open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        ext = os.path.splitext(p)[1].lower()
        # G1
        if not HISTORY.search(r):
            for i, ln in enumerate(text.splitlines(), 1):
                if g1.search(ln):
                    fails.append('G1 retired name  %s:%d  %s' % (r, i, ln.strip()[:140]))
        if HISTORY.search(r) or ext == '.md':
            continue
        code = strip_js_comments_keep_strings(text) if ext in ('.js', '.mjs', '.cjs') else text
        if ext == '.css':
            code = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)
        # G2
        if ext == '.css':
            for m in re.finditer(r"@import\s+url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", code):
                if re.match(r'^(?:[a-z]+:|//)', m.group(1), re.I):
                    continue  # absolute URL (fonts CDN etc.) - not a repository path
                counts['G2'] += 1
                tgt = os.path.normpath(os.path.join(os.path.dirname(p), m.group(1)))
                if not os.path.exists(tgt):
                    ln = code[:m.start()].count('\n') + 1
                    fails.append('G2 css @import  %s:%d -> %s' % (r, ln, m.group(1)))
        # G3
        if ext in ('.js', '.mjs'):
            for m in re.finditer(r"new\s+URL\(\s*['\"](\.{1,2}/[^'\"$`]+)['\"]\s*,\s*import\.meta\.url", code):
                counts['G3'] += 1
                tgt = os.path.normpath(os.path.join(os.path.dirname(p), m.group(1).split('?')[0].split('#')[0]))
                if not os.path.exists(tgt):
                    ln = code[:m.start()].count('\n') + 1
                    fails.append('G3 new URL       %s:%d -> %s' % (r, ln, m.group(1)))
        # G4
        if ext in ('.js', '.mjs', '.json', '.html', '.htm', '.cjs'):
            base_dir = root
            if ext in ('.html', '.htm'):
                bm = re.search(r"<base\s+href=['\"]([^'\"]+)['\"]", text, re.I)
                base_dir = os.path.normpath(os.path.join(os.path.dirname(p), bm.group(1))) if bm else os.path.dirname(p)
                if r == 'index.html':
                    base_dir = root
            for m in re.finditer(r"['\"](\.{0,2}/?(?:02__Src__AppModules|04__Lib__ThirdParty__[A-Za-z]+|01__AppAssets__[A-Za-z]+|03__Style__AppStylesheets)/[^'\"$`*<>|]+?)['\"]", code):
                s = m.group(1)
                if s.startswith('/'):
                    continue
                if ext in ('.js', '.mjs', '.cjs') and re.search(r'\bfrom\s*$|import\s*\(\s*$', code[max(0, m.start() - 12):m.start()]):
                    continue  # ES imports are the module graph harness's job
                counts['G4'] += 1
                bd = base_dir
                if ext in ('.js', '.mjs', '.cjs', '.json') and s.startswith('../'):
                    bd = os.path.dirname(p)
                tgt = os.path.normpath(os.path.join(bd, s.split('?')[0].split('#')[0]))
                if not os.path.exists(tgt):
                    ln = code[:m.start()].count('\n') + 1
                    msg = 'G4 path string   %s:%d -> %s' % (r, ln, s)
                    if a.strict_g4 or RENAMED_TOUCH.search(s):
                        fails.append(msg)
                    else:
                        warns.append(msg)
        # G5
        if ext in ('.js', '.mjs', '.cjs', '.html', '.json'):
            for m in re.finditer(r"['\"](\d\d__(?:System|Feature|Data|Core|Ui|DevTools)__[A-Za-z0-9_]+)['\"]", code):
                counts['G5'] += 1
                if m.group(1) not in folders:
                    ln = code[:m.start()].count('\n') + 1
                    warns.append('G5 folder token  %s:%d -> %s (no such folder)' % (r, ln, m.group(1)))
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print('K2 path gate  root=%s' % root)
    print('  checked: css @import %d, new URL %d, path strings %d, folder tokens %d' % (counts['G2'], counts['G3'], counts['G4'], counts['G5']))
    for w in warns:
        print('  WARN ' + w)
    for f in fails:
        print('  FAIL ' + f)
    print('RESULT: %s (%d fail, %d warn)' % ('PASS' if not fails else 'FAIL', len(fails), len(warns)))
    sys.exit(0 if not fails else 1)


if __name__ == '__main__':
    main()
