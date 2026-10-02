"""W0-16 scratch: unified diffs of the built (or live) files against their pre-images, and of the two
config files against TrueVision's at the pin (seams only). Writes w0_16_changes_vs_preimage.diff and
w0_16_config_vs_tv.diff beside this script and prints both.

Usage: python diff_report.py [--live]
"""
import difflib, os, sys

VV      = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCRATCH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRATCH)
import apply_w0_16 as A  # noqa: E402

LIVE = '--live' in sys.argv


def text(path):
    return open(path, 'rb').read().decode('utf-8').replace('\r\n', '\n').splitlines(keepends=True)


def current(rel):
    return os.path.join(VV, rel.replace('/', os.sep)) if LIVE else os.path.join(SCRATCH, 'out', os.path.basename(rel))


out = []
for rel in A.EDITS:
    out.extend(difflib.unified_diff(text(os.path.join(SCRATCH, 'preimage', os.path.basename(rel))), text(current(rel)),
                                    'a/' + rel, 'b/' + rel, n=1))
open(os.path.join(SCRATCH, 'w0_16_changes_vs_preimage.diff'), 'w', encoding='utf-8', newline='\n').write(''.join(out))
print(''.join(out))

print('=' * 100)
tv = []
for rel in (A.APPCONFIG, A.SHEETSET, A.TEST_SPEC, A.TEST_TBC):
    tv.extend(difflib.unified_diff(text(os.path.join(SCRATCH, 'tv_at_pin', rel.replace('/', os.sep))), text(current(rel)),
                                   'tv/' + rel, 'vv/' + rel, n=0))
open(os.path.join(SCRATCH, 'w0_16_config_vs_tv.diff'), 'w', encoding='utf-8', newline='\n').write(''.join(tv))
print('config and test pages vs TrueVision at the pin: %d diff lines written to w0_16_config_vs_tv.diff' % len(tv))
