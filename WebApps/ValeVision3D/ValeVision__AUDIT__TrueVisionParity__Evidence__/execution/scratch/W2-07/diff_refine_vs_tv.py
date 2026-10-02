"""Acceptance: git diff --no-index -w of the live ProgressiveRefine against TrueVision's file at the pin.

Writes the diff to refine_vs_tv.diff and classifies every changed line as HEADER (inside the file's opening
comment block, which ends at the second '// ====' rule) or CODE. Exit 0 when every CODE line is the one
K2 C1 console-prefix seam.
Usage: python -B diff_refine_vs_tv.py
"""
import os, re, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\05__RenderPipeline\Na__RenderEffect__ProgressiveRefine__.js'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_PATH = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js'

tv = subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:' + TV_PATH], capture_output=True, check=True).stdout
tmp = tempfile.mkdtemp(prefix='na-w207-diff-')
tv_file = os.path.join(tmp, 'TV__Na__RenderEffect__ProgressiveRefine__.js')
open(tv_file, 'wb').write(tv)
r = subprocess.run(['git', '-c', 'core.autocrlf=false', 'diff', '--no-index', '-w', '--unified=0', tv_file, LIVE], capture_output=True)
diff = r.stdout.decode('utf-8', 'replace')
open(os.path.join(HERE, 'refine_vs_tv.diff'), 'w', encoding='utf-8').write(diff)

def header_end(lines):
    rules = [i for i, l in enumerate(lines) if l.startswith('// =====')]
    return rules[2] if len(rules) >= 3 else None   # rule 0 and 1 frame the banner; rule 2 closes the header

live_lines = open(LIVE, 'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')
tv_lines = tv.decode('utf-8').split('\n')
h_live, h_tv = header_end(live_lines), header_end(tv_lines)

changed = {'header': 0, 'code': []}
old_line = new_line = 0
for line in diff.split('\n'):
    m = re.match(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', line)
    if m:
        old_line, new_line = int(m.group(1)), int(m.group(3))
        continue
    if line.startswith('---') or line.startswith('+++') or line.startswith('diff ') or line.startswith('index '):
        continue
    if line.startswith('-'):
        if old_line - 1 <= h_tv: changed['header'] += 1
        else: changed['code'].append('TV  :' + str(old_line) + '  ' + line[1:].strip())
        old_line += 1
    elif line.startswith('+'):
        if new_line - 1 <= h_live: changed['header'] += 1
        else: changed['code'].append('VV  :' + str(new_line) + '  ' + line[1:].strip())
        new_line += 1

print('header ends at line', h_live + 1, '(VV) /', h_tv + 1, '(TV)')
print('changed header lines:', changed['header'])
print('changed code lines  :', len(changed['code']))
for c in changed['code']:
    print('   ', c)
allowed = all('Progressive refinement disabled: the accumulation buffer could not be created.' in c for c in changed['code'])
ok = allowed and len(changed['code']) == 2
print('RESULT:', 'PASS - header lines only, apart from the one K2 C1 console prefix ([TrueVision3D] -> [ValeVision3D])' if ok else 'FAIL')
sys.exit(0 if ok else 1)
