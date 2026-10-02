"""W1 gate: evidence for the seven STALE AppConfigParity allow-list rows and the FocusNote row - the live VV value
against TrueVision's at the pin b2aa9151 (git show, read-only). Prints each path, whether each app has the key and
whether the values are equal."""
import json, os, subprocess, sys

VVR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
VV = os.path.join(VVR, r'02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json')
TV_REL = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
vv = json.loads(open(VV, encoding='utf-8').read())
tv = json.loads(subprocess.run(['git', '-C', r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb', 'show', 'b2aa9151:' + TV_REL], capture_output=True).stdout.decode('utf-8'))

ROWS = [('value', 'MarginNotes', 'Description'), ('value', 'Labels', 'NoSheets'), ('value', 'Labels', 'TabsPreviousTitle'),
        ('value', 'Labels', 'TabsNextTitle'), ('value', 'Labels', 'SpecificationTab'), ('vv-only', 'Labels', 'MarginToggle'),
        ('vv-only', 'Labels', 'MarginToggleTitle'), ('value', 'Panels', 'FocusNote')]
MISSING = object()
for kind, block, key in ROWS:
    b, k = 'LayoutEditor__%s__Config' % block, 'LayoutEditor__%s__%s' % (block, key)
    v = vv.get(b, {}).get(k, MISSING)
    t = tv.get(b, {}).get(k, MISSING)
    state = ('equal' if (v is not MISSING and t is not MISSING and v == t) else
             'absent in both' if (v is MISSING and t is MISSING) else
             'VV only' if t is MISSING else 'TV only' if v is MISSING else 'DIFFER')
    print('%-8s %-40s VV:%-7s TV:%-7s -> %s' % (kind, block + '/' + key, 'has' if v is not MISSING else 'absent', 'has' if t is not MISSING else 'absent', state))
    if state == 'DIFFER':
        print('           VV: %s' % (json.dumps(v)[:300]))
        print('           TV: %s' % (json.dumps(t)[:300]))
