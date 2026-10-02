"""Find the TV devlog release headings (at the pin) whose sections mention the W1-01 names."""
import subprocess, re
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
text = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + 'TrueVision__DEVLOG__.md'], capture_output=True).stdout.decode('utf-8', 'replace')
lines = text.splitlines()
head_re = re.compile(r'^#{1,3}\s*(TrueVision3D\s+v2\.\d+\.\d+.*)$')
needles = ['IsPaused', 'BorrowRegistry', 'RestoreRegistry', 'SetCategoryVisibleByKey', 'PhaseLibrary', 'Phase Library',
           'InteractiveOverlays', 'Interactive Overlays', 'BeginFrame', 'hold reasons', 'PauseReasons', 'Na__RenderLoop__Pause']
current = None
current_line = 0
hits = {}
confirm = {}
for i, line in enumerate(lines, 1):
    m = head_re.match(line)
    if m:
        current = m.group(1)[:110]
        current_line = i
        continue
    for n in needles:
        if n in line:
            hits.setdefault((current_line, current), set()).add(n)
for (ln, head), ns in sorted(hits.items(), key=lambda kv: kv[0][0], reverse=True):
    print('%6d  %s' % (ln, head))
    print('        ', sorted(ns))
