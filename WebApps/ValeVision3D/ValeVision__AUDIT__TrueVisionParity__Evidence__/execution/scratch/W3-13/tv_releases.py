"""For each TV release W3-13 carries, print its devlog heading and every line that speaks of Adam's trial / sign-off.
Reads TrueVision__DEVLOG__.md at the pin (git show)."""
import re
import subprocess

TV_REPO = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN = 'b2aa9151'
raw = subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],
                     check=True, capture_output=True).stdout
text = raw.decode('utf-8').splitlines()
VERS = ['2.104.0', '2.116.0', '2.123.0', '2.124.0', '2.138.0', '2.139.0', '2.154.0', '2.155.0']
heads = [(i, l) for i, l in enumerate(text) if re.match(r'^##\s.*v2\.\d+\.\d+', l)]
for v in VERS:
    idx = [k for k, (i, l) in enumerate(heads) if re.search(r'v' + re.escape(v) + r'\b', l)]
    if not idx:
        print('v' + v, 'NO HEADING')
        continue
    k = idx[0]
    i, l = heads[k]
    end = heads[k + 1][0] if k + 1 < len(heads) else len(text)
    body = text[i:end]
    adam = [b.strip() for b in body if re.search(r'sign(ed)?[- ]off|NOT tried|confirmed|has not tried|tried it', b, re.I)]
    print(':%d %s' % (i + 1, l.strip()))
    for a in adam[:5]:
        print('      ', a[:240])
# Any later entry quoting a confirmation of reference layers / Ref / one red
for i, l in enumerate(text):
    if re.search(r'(reference layer|\bRef\b|one red).*(confirm|signed off|works)', l, re.I) or re.search(r'(confirm|signed off).*(reference layer|\bRef\b)', l, re.I):
        print('REF-CONFIRM? :%d %s' % (i + 1, l.strip()[:240]))
