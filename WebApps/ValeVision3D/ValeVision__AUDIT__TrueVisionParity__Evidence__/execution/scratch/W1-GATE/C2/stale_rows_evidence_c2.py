"""W1 gate (continuation): evidence for FIX-C1. For the eight allow-list rows Na__Test__AppConfigParity__ reports STALE and
for TitleBlock/RowsNote (whose label W1-22 F3 asks to change), compare the live Layout Editor config with TrueVision's at
the pin (git show b2aa9151, read in memory only). Prints equal / differs; for RowsNote a word-level summary of what
differs, with TrueVision's side given only as word counts (its text names a client - it is not written anywhere).
Read-only. Usage: python -B stale_rows_evidence_c2.py [--show-tv]   (--show-tv prints TrueVision's differing words to
the console only, for the reviewer's eyes)."""
import difflib, json, os, subprocess, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
REL = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
vv = json.load(open(os.path.join(VVR, *REL.split('/')), encoding='utf-8'))
tv = json.loads(subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/' + REL], capture_output=True).stdout.decode('utf-8'))


def get(doc, short):
    parts = short.split('/')
    block = 'LayoutEditor__' + parts[0] + '__Config'
    key = parts[1] if parts[1].startswith('LayoutEditor__') else 'LayoutEditor__' + parts[0] + '__' + parts[1]
    cur = doc.get(block, {})
    if key not in cur:
        return '<absent>'
    cur = cur[key]
    for p in parts[2:]:
        if not isinstance(cur, dict) or p not in cur:
            return '<absent>'
        cur = cur[p]
    return cur


ROWS = ['Style/Description', 'Style/FontFamily', 'Style/TitleValueWeightNote', 'TitleBlock/Rows', 'TitleBlock/ClassicFieldAnchors/A3/DrawingNumber',
        'Scales/Description', 'Scales/AvailableScaleDenominators', 'Pdf/Description', 'TitleBlock/RowsNote']
for r in ROWS:
    a, b = get(vv, r), get(tv, r)
    same = json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
    print('%-50s %s   (this app: %s; TrueVision: %s)' % (r, 'EQUAL' if same else 'DIFFERS', 'absent' if a == '<absent>' else type(a).__name__, 'absent' if b == '<absent>' else type(b).__name__))
a, b = get(vv, 'TitleBlock/RowsNote'), get(tv, 'TitleBlock/RowsNote')
if isinstance(a, str) and isinstance(b, str):
    aw, bw = a.split(), b.split()
    sm = difflib.SequenceMatcher(a=bw, b=aw, autojunk=False)
    print('\nTitleBlock/RowsNote word diff (TrueVision -> this app): %d / %d words, ratio %.3f' % (len(bw), len(aw), sm.ratio()))
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            continue
        tv_part = ' '.join(bw[i1:i2]) if '--show-tv' in sys.argv else '<%d TrueVision word(s)>' % (i2 - i1)
        print('  %-7s TV: %s\n          VV: %s' % (op, tv_part, ' '.join(aw[j1:j2]) or '-'))
