"""W2-16 build: TV whole files (from scratch/W2-16/tv, fetched at b2aa9151) -> candidates with VV seams.

  python -B build_w2_16.py --build        write candidate/ (nothing live)
  python -B build_w2_16.py --apply        copy candidates over the live tree (hash-guarded)
  python -B build_w2_16.py --check-live   live == candidate for every file
  python -B build_w2_16.py --restore      put the pre-images back, remove new files (refuses if changed since apply)
"""
import os, sys, re, json, hashlib, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from port_notes import NOTES  # noqa: E402

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
SEP = '// ' + '-' * 77

WHOLE = [
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__.js',
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js',
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js',
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js',
    '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
    '20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js',
    '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js',
    '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js',
    '40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js',
    '20__System__Viewports/Na__LayoutEditor__ModelSource__.js',
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js',
]
JSON_VERBATIM = ['25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__Config__.json']
NEW = {'20__System__Viewports/Na__LayoutEditor__ModelSource__.js', '20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js'}

# expected console-prefix replacements per file
CONSOLE = {
    '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js': 2,
    '20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js': 1,
    '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js': 2,
    '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js': 2,
}
# app-token literals (K2 K3) in the body (outside PORT NOTE and DEVELOPMENT LOG): exact count expected
TOKEN = {
    '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js': 1,
    '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js': 5,
}

TESTS = {}  # filled by tests_w2_16.py (app-relative -> bytes)


def sha(b):
    return hashlib.sha1(b).hexdigest()


def tv_text(rel):
    return open(os.path.join(HERE, 'tv', rel.replace('/', os.sep)), 'rb').read().decode('utf-8')


def header_end(t):
    """Index just after the header block (the line of '=' closing the DEVELOPMENT LOG)."""
    i = t.index('// DEVELOPMENT LOG:')
    j = t.index('// ' + '=' * 77, i)
    return t.index('\n', j) + 1


def build_one(rel):
    t = tv_text(LE + rel)
    assert '\r' not in t
    # 1. banner (H1)
    assert t.count('// TRUEVISION3D - ') == 1, rel
    t = t.replace('// TRUEVISION3D - ', '// VALEVISION3D - ')
    # 2. PORT NOTE (H5)
    note = NOTES[rel]
    if '// PORT NOTE:' in t:
        pat = re.compile(r'// PORT NOTE:\n.*?\n//\n(?=' + re.escape(SEP) + r'\n//\n// DEVELOPMENT LOG:)', re.S)
        assert len(pat.findall(t)) == 1, rel
        t = pat.sub(lambda m: note + '\n', t)
    else:
        anchor = SEP + '\n//\n// DEVELOPMENT LOG:'
        assert t.count(anchor) == 1, rel
        t = t.replace(anchor, SEP + '\n//\n' + note + '\n' + anchor)
    # 3. console prefix (C1) and app-token literals (K3), body only
    h = header_end(t)
    head, body = t[:h], t[h:]
    assert '[TrueVision3D' not in head, rel
    n = body.count('[TrueVision3D')
    assert n == CONSOLE.get(rel, 0), (rel, n)
    body = body.replace('[TrueVision3D', '[ValeVision3D')
    n = body.count('TrueVision__')
    assert n == TOKEN.get(rel, 0), (rel, n)
    body = body.replace('TrueVision__', 'ValeVision__')
    t = head + body
    # nothing else of TrueVision's identity outside the PORT NOTE / log
    for bad in ('TRUEVISION3D', '[TrueVision3D', 'window.TrueVision', 'NaProjectPortal', '/na-apps/', 'na-truevision-api', '/r2/'):
        assert bad not in body, (rel, bad)
    return t.encode('utf-8')


def candidates():
    out = {}
    for rel in WHOLE:
        out[LE + rel] = build_one(rel)
    for rel in JSON_VERBATIM:
        out[LE + rel] = open(os.path.join(HERE, 'tv', (LE + rel).replace('/', os.sep)), 'rb').read()
    tests_dir = os.path.join(HERE, 'tests_candidate')
    if os.path.isdir(tests_dir):
        for name in os.listdir(tests_dir):
            out['80__Testing__PrototypeEnvironment/' + name] = open(os.path.join(tests_dir, name), 'rb').read()
    mc = os.path.join(HERE, 'mc_candidate', 'Na__LayoutEditor__ModeController__.js')
    if os.path.exists(mc):
        out[LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'] = open(mc, 'rb').read()
    return out


def cand_path(rel):
    return os.path.join(HERE, 'candidate', rel.replace('/', os.sep))


def live_path(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    man_pre = json.load(open(os.path.join(HERE, 'preimage', 'manifest.json')))
    if mode == '--build':
        c = candidates()
        for rel, b in c.items():
            p = cand_path(rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(b)
            print('built', rel, sha(b)[:8], b.count(b'\n'), 'lines')
        json.dump({k: sha(v) for k, v in c.items()}, open(os.path.join(HERE, 'candidate', 'manifest.json'), 'w'), indent=1)
    elif mode == '--apply':
        cm = json.load(open(os.path.join(HERE, 'candidate', 'manifest.json')))
        # guard: every target is as recorded (pre-image) or absent for new files
        for rel in cm:
            lp = live_path(rel)
            pre = man_pre.get(rel, 'NOTRECORDED')
            if pre is None or pre == 'NOTRECORDED':
                if os.path.exists(lp):
                    sys.exit('REFUSE: new file already exists ' + rel)
            else:
                cur = hashlib.sha1(open(lp, 'rb').read()).hexdigest()[:8]
                if cur != pre:
                    sys.exit('REFUSE: changed since pre-image ' + rel + ' ' + cur + ' != ' + pre)
        order = sorted(cm, key=lambda r: ('ModeController' in r, r))   # leaves first, the hub last
        for rel in order:
            b = open(cand_path(rel), 'rb').read()
            assert sha(b) == cm[rel]
            lp = live_path(rel)
            os.makedirs(os.path.dirname(lp), exist_ok=True)
            open(lp, 'wb').write(b)
            print('applied', rel)
    elif mode == '--check-live':
        cm = json.load(open(os.path.join(HERE, 'candidate', 'manifest.json')))
        bad = 0
        for rel, h in cm.items():
            cur = sha(open(live_path(rel), 'rb').read()) if os.path.exists(live_path(rel)) else None
            ok = cur == h
            bad += not ok
            print('LIVE == CANDIDATE' if ok else 'DIFFERS', rel)
        sys.exit(1 if bad else 0)
    elif mode == '--restore':
        cm = json.load(open(os.path.join(HERE, 'candidate', 'manifest.json')))
        for rel, h in cm.items():
            lp = live_path(rel)
            if os.path.exists(lp) and sha(open(lp, 'rb').read()) != h:
                sys.exit('REFUSE: changed since apply ' + rel)
        for rel in cm:
            lp = live_path(rel)
            pre = os.path.join(HERE, 'preimage', rel.replace('/', os.sep))
            if man_pre.get(rel):
                shutil.copyfile(pre, lp); print('restored', rel)
            elif os.path.exists(lp):
                os.remove(lp); print('removed', rel)


if __name__ == '__main__':
    main()
