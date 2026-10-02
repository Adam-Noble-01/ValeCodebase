"""W1 gate: print the follow-up / issues sections of every W1 Port Record (the heading that says follow-up, issue,
foreign, records note or for the orchestrator, down to the next heading of the same or a higher level). Read-only."""
import os, re, sys
PR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\port_records'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
want = sys.argv[1:]
for fn in sorted(os.listdir(PR)):
    if not (fn.startswith('W1-') and fn.endswith('.md')):
        continue
    if want and fn[:-3] not in want:
        continue
    lines = open(os.path.join(PR, fn), encoding='utf-8', errors='replace').read().split('\n')
    print('#' * 120)
    print('# ' + fn)
    i = 0
    while i < len(lines):
        m = re.match(r'^(#+)\s+(.*)$', lines[i])
        if m and re.search(r'follow|issue|for adam|orchestrator', m.group(2), re.I):
            level = len(m.group(1))
            j = i + 1
            while j < len(lines):
                m2 = re.match(r'^(#+)\s+', lines[j])
                if m2 and len(m2.group(1)) <= level:
                    break
                j += 1
            print('\n'.join(lines[i:j]))
            i = j
            continue
        i += 1
