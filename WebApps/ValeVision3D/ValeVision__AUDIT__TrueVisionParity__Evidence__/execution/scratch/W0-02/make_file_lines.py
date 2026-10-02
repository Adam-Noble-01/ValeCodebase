"""Scratch (W0-02): one Port Record line per changed path (what and why), computed from
git's rename pairs, the byte pre-images saved before the renumber and the current files."""
import os, re, subprocess, json, collections

VCB = r'D:\10_CoreLib__ValeCodebase'
APP = 'WebApps/ValeVision3D/'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')

FOLDERS = [('40__System__2dElevationsView', '91__System__2dElevationsView', 'D1'),
           ('42__System__DrawingViewCore', '40__System__DrawingViewCore', 'D2'),
           ('43__System__FloorPlanViews', '42__System__FloorPlanViews', 'D3'),
           ('44__System__PlanAnnotations', '43__System__PlanAnnotations', 'D4'),
           ('45__System__PlanDimensions', '44__System__PlanDimensions', 'D5'),
           ('46__System__ElevationViews', '45__System__ElevationViews', 'D6'),
           ('47__System__NorthDirection', '46__System__NorthDirection', 'D7')]
FILE_MOVES = {
    '02__Src__AppModules/40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js': 'F1 (FR-08, DR-03: a file follows its base name, K2 N5)',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory__.js': 'F2 (FR-10, DR-04: TV\'s file name, K2 F1)',
    '02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js': 'F3 (FR-11, DR-04: TV\'s path)',
    '02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js': 'F4 (FR-09, DR-04: TV\'s interface name)',
}
HAND = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js':
        'hand edit: PORT NOTE per K2 section 3 (VV-bodied twin), RenderFrame(camera) optional argument (S02a-F14), log 1.3.1',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js':
        'hand edit: banner line 2 = TV text, MaxEngine-only qualifier into a new PORT NOTE (F.8 C11), log 1.0.1',
}

r = subprocess.run(['git', '-C', VCB, 'diff', 'HEAD', '-M', '--name-status', '--', 'WebApps/ValeVision3D'],
                   capture_output=True, text=True, encoding='utf-8')
rows = []
for line in r.stdout.splitlines():
    parts = line.split('\t')
    st = parts[0]
    if st.startswith('R'):
        old, new = parts[1][len(APP):], parts[2][len(APP):]
    else:
        old = new = parts[1][len(APP):]
    rows.append((st, old, new))


def lf(b):
    return b.decode('utf-8').replace('\r\n', '\n')


def describe(old, new):
    pre_path = os.path.join(PRE, old.replace('/', os.sep))
    if not os.path.exists(pre_path):
        return None
    a = lf(open(pre_path, 'rb').read()).split('\n')
    b = lf(open(os.path.join(VCB, (APP + new).replace('/', os.sep)), 'rb').read()).split('\n')
    removed = collections.Counter(a) - collections.Counter(b)
    added = collections.Counter(b) - collections.Counter(a)
    rem_text = '\n'.join(k for k, v in removed.items() for _ in range(v))
    kinds = []
    fold = collections.Counter()
    for o, n, d in FOLDERS:
        c = rem_text.count(o)
        if o == '40__System__2dElevationsView':
            c -= rem_text.count('40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js')   # <-- T1 repoints these to 05, not 91
        if c:
            fold['%s->%s' % (o[:2], n[:2])] += c
    if fold:
        kinds.append('folder names ' + ', '.join('%s x%d' % (k, v) for k, v in sorted(fold.items())))
    for tok, label in [('Na__DrawView__ComposerPreset__', 'ComposerPreset->RenderPreset'),
                       ('DRAWING VIEW CORE - COMPOSER PRESET', 'banner'),
                       ('Na__AppUtils__SnapshotHistory__.js', 'SnapshotHistory file name'),
                       ('05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js', 'DistanceCulling path'),
                       ('Na__RenderEffect__2dProfileLines__.js', '2dProfileLines path')]:
        c = rem_text.count(tok)
        if c:
            kinds.append('%s x%d' % (label, c))
    t8 = len(re.findall(r'Import paths follow the ValeVision folder numbers', rem_text))
    if t8:
        kinds.append('false PORT NOTE bullet removed (T8)')
    if 'Snapshot history imported from Na__AppUtils__SnapshotHistory__.js' in rem_text:
        kinds.append('false SnapshotHistory PORT NOTE bullet removed (T8)')
    if 'File name carries the ValeVision double-underscore suffix.' in rem_text:
        kinds.append('own PORT NOTE divergence -> "none." (T8)')
    if "'../../04__MathUtils/Na__Math__Units.js'" in rem_text:
        kinds.append('own import one level shallower (T4)')
    if "'../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js'" in rem_text:
        kinds.append('own import normalised to ./ (T4)')
    return '; '.join(kinds) if kinds else 'text changed'


moved_pure, lines = [], []
for st, old, new in sorted(rows, key=lambda x: x[2]):
    why = []
    if old in FILE_MOVES:
        why.append('moved ' + FILE_MOVES[old])
    else:
        for o, n, d in FOLDERS:
            if old.startswith('02__Src__AppModules/' + o + '/'):
                why.append('moved with folder %s (%s -> %s)' % (d, o, n))
    desc = describe(old, new)
    if new in HAND:
        desc = (desc + '; ' if desc else '') + HAND[new]
    if st.startswith('R') and (desc is None):
        moved_pure.append((st, old, new, why))
        continue
    src = (' (was ' + old + ')') if old != new else ''
    lines.append('- `VV/%s`%s - %s%s' % (new, src, (why[0] + '; ') if why else '', desc or 'unchanged content'))

print('## rewritten or hand-edited (%d)' % len(lines))
for l in lines:
    print(l)
print()
print('## moved only, content unchanged (%d)' % len(moved_pure))
for st, old, new, why in moved_pure:
    print('- `VV/%s` (was `%s`, %s) - %s' % (new, old.split('/', 1)[1], st, why[0] if why else 'moved'))
