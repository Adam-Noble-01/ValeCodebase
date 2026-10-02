import subprocess, re, os
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                      capture_output=True, check=True).stdout.decode('utf-8', 'replace')
lines = data.split('\n')
out = os.path.join(os.path.dirname(__file__), 'tv_devlog_at_pin.md')
open(out, 'w', encoding='utf-8').write(data)
# release headings
heads = [(i, l) for i, l in enumerate(lines) if re.match(r'^##\s+TrueVision3D v2\.(95|96|97|98|99|16[0-9]|17[0-2])\.0', l)]
for i, l in heads:
    print(i + 1, l[:160])
print('---- mentions')
for i, l in enumerate(lines):
    if re.search(r'Md__(Tokenise|Inline|Render|Serialise|Figure)|StatementRoundTrip|StatementFigureTitle|CONFIRMED|NOT tried|sign-off|confirmed by Adam', l, re.I):
        # only show around relevant releases
        print(i + 1, l[:200])
