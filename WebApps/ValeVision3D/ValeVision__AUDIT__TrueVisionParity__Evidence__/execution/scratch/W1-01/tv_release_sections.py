"""Print chosen TV devlog release sections (at the pin), trimmed, plus their confirmation / sign-off lines."""
import subprocess, re, sys
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
text = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + 'TrueVision__DEVLOG__.md'], capture_output=True).stdout.decode('utf-8', 'replace')
lines = text.splitlines()
head_re = re.compile(r'^#{1,3}\s*TrueVision3D\s+(v2\.\d+\.\d+)\b(.*)$')
want = set(sys.argv[1:]) or {'v2.25.0', 'v2.32.0', 'v2.82.0'}
mode_list = '--list' in want
sections = []
for i, line in enumerate(lines):
    m = head_re.match(line)
    if m:
        sections.append((i, m.group(1), line.strip()))
if mode_list:
    for i, v, l in sections:
        if any(d in l for d in ('10-Sep-2026', '11-Sep-2026', '12-Sep-2026', '13-Sep-2026', '20-Sep-2026')):
            print(i + 1, l[:150])
    sys.exit(0)
for idx, (i, v, l) in enumerate(sections):
    if v not in want:
        continue
    end = sections[idx + 1][0] if idx + 1 < len(sections) else len(lines)
    body = lines[i:end]
    print('=' * 100)
    print('LINE', i + 1, '-', end, ':', l[:160])
    keys = re.compile(r'(NOT tried|tried by Adam|sign-off|signed|Adam confirmed|Confirmed|confirmed|ValeVision|IsPaused|Pause|SetCategoryVisibleByKey|Borrow|PhaseLib|Phase Library|InteractiveOverlay|BeginFrame|EndFrame|ModelToggle)')
    for j, b in enumerate(body):
        if keys.search(b):
            print('  %6d  %s' % (i + 1 + j, b[:240]))
