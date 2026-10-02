"""Print the TV devlog release heading that owns each given line number, plus any
confirmation lines (tried / sign-off / NOT) inside that entry."""
import re
import sys

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-25\tv\TrueVision__DEVLOG__.md'
lines = open(PATH, encoding='utf-8').read().split('\n')
heads = [i for i, l in enumerate(lines) if re.match(r'^## TrueVision3D v', l)]
for arg in sys.argv[1:]:
    n = int(arg) - 1
    start = max([h for h in heads if h <= n], default=None)
    if start is None:
        print(arg, 'no heading')
        continue
    after = [h for h in heads if h > start]
    end = after[0] if after else len(lines)
    print('line', arg, '->', start + 1, lines[start])
    for i in range(start, end):
        low = lines[i].lower()
        if any(k in low for k in ('tried', 'sign-off', 'signed off', 'confirmed', 'not verified', 'adam')):
            print('   ', i + 1, lines[i][:220])
