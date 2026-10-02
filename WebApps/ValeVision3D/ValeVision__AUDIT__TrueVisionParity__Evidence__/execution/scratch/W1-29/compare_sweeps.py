# W1-29 scratch: compare the before (pre-image) and after (live) sweeps of verify_w1_29.mjs and classify every
# difference, so the Port Record can say exactly what changed and that nothing else did.
import json
import os
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
before = json.load(open(os.path.join(HERE, 'sweep_before.json'), encoding='utf-8'))
after = json.load(open(os.path.join(HERE, 'sweep_after.json'), encoding='utf-8'))

DOC_ROW_KEYS = {'d', 'D', 'o', 'Delete', 'Escape'}
same = 0
diffs = defaultdict(list)
unexpected = []
for scope, sb in before['sweep'].items():
    sa = after['sweep'][scope]
    for press, pb in sb['presses'].items():
        pa = sa['presses'][press]
        if pa == pb:
            same += 1
            continue
        focus, key = press.split(' | ')
        bare = key.split('+')[0]
        # Expected classes of change
        if scope in ('sheet', 'document') and not pa['fired'] and not pa['prevented'] and not pa['warned']:
            cls = 'off-tab key now left alone (sheet/document scope)'
        elif focus == 'contenteditable' and not pa['fired'] and not pa['prevented'] and not pa['warned']:
            cls = 'contenteditable now keeps its letter'
        elif bare in DOC_ROW_KEYS and '+' not in key and not pa['fired'] and not pa['prevented'] and not pa['warned'] and not pb['fired'] and pb['prevented'] and pb['warned']:
            cls = 'documentation row no longer swallowed / warned'
        else:
            cls = 'UNEXPECTED'
            unexpected.append((scope, press, pb, pa))
        diffs[cls].append((scope, press))

print(f"before: {before['handler']}")
print(f"after : {after['handler']}")
print(f'identical presses: {same}')
for cls, rows in diffs.items():
    print(f'{cls}: {len(rows)}')
    by_scope = Counter(s for s, _ in rows)
    print('   by scope:', dict(by_scope))
for row in unexpected:
    print('UNEXPECTED', row)

# The 3D Model tab with the stage focused must be unchanged except the documentation rows.
model_body = []
for scope in ('no reader (before the editor loads)', 'model', 'reader throws'):
    for press, pb in before['sweep'][scope]['presses'].items():
        focus, key = press.split(' | ')
        if focus not in ('body', 'nothing', 'button', 'input text', 'input checkbox', 'textarea', 'select'):
            continue
        pa = after['sweep'][scope]['presses'][press]
        if pa != pb and not (key in DOC_ROW_KEYS):
            model_body.append((scope, press, pb, pa))
print('3D Model tab (no reader / model / failing reader), every focus but contenteditable, any change other than the documentation rows:', len(model_body))
for row in model_body:
    print('   ', row)

# What fires after, per scope (stage focused)
for scope, sa in after['sweep'].items():
    fired = sorted({f for p, v in sa['presses'].items() if p.startswith('body | ') for f in v['fired']})
    print(f"after, {scope:38s} scope reads {sa['scopeReads']:9s} body-focus actions fired: {', '.join(fired) or '-'}")
for scope, sb in before['sweep'].items():
    fired = sorted({f for p, v in sb['presses'].items() if p.startswith('body | ') for f in v['fired']})
    print(f"before, {scope:37s} body-focus actions fired: {', '.join(fired) or '-'}")
sys.exit(1 if unexpected or model_body else 0)
