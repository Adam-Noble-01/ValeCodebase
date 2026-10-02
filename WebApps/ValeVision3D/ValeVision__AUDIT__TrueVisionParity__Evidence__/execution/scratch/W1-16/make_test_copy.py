# =============================================================================
# W1-16 | TrueVision's Na__Test__SheetImages__ - its Geometry and Painter parts -
#         as a scratch copy that runs against ValeVision's tree
# =============================================================================
#
# The test is ported whole by W3-09 (wp_canonical test_ownership: porter W3-09,
# sections run earlier by W1-16). This makes a copy OUTSIDE the repository,
# read from TrueVision at the pin, with exactly two changes:
#   1. SRC points at ValeVision's 02__Src__AppModules (or, for the mutation
#      control, at a copy holding a planted fault);
#   2. the regions "The Record" (needs SheetRecords 1.39.0, W1-19) and "The
#      Save Step" (needs Publish, W3-18) are cut out - everything from the
#      rule above "REGION | The Record" to the rule above "REGION | Result".
# Every check in the Geometry and Painter regions is TrueVision's, untouched.
#
# Usage: python make_test_copy.py <out file> [<src root>]
# =============================================================================
import subprocess
import sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TEST = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__SheetImages__.test.mjs'
VV_SRC = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules'
RULE = '// ' + '-' * 77

out = sys.argv[1]
src = (sys.argv[2] if len(sys.argv) > 2 else VV_SRC).replace('\\', '/')

text = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TEST], capture_output=True, check=True).stdout.decode('utf-8')

old_src = "const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"
if text.count(old_src) != 1:
    raise SystemExit('STOP: the SRC line was not found exactly once')
text = text.replace(old_src, "const SRC        = '" + src + "';")

start_marker = '\n' + RULE + '\n// REGION | The Record\n'
end_marker = '\n' + RULE + '\n// REGION | Result\n'
if text.count(start_marker) != 1 or text.count(end_marker) != 1:
    raise SystemExit('STOP: region markers not found exactly once')
start = text.index(start_marker)
end = text.index(end_marker)
if not start < end:
    raise SystemExit('STOP: region markers out of order')
cut = text[start:end]
if 'REGION | Geometry' in cut or 'REGION | Painter' in cut:
    raise SystemExit('STOP: the cut would remove a Geometry or Painter check')
text = text[:start] + text[end:]

with open(out, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(text)
print('wrote', out, '- SRC', src, '- cut', cut.count('check('), 'record/save-step checks')
