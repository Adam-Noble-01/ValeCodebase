# W1-23 - unified diff of before/ against candidate/ (or live) for the seven files, CR stripped for reading.
#   python -B diff_candidates.py [candidate|live]  -> prints and writes w1_23_changes.diff
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_w1_23 as build  # noqa: E402

which = sys.argv[1] if len(sys.argv) > 1 else 'candidate'
chunks = []
for leaf, live in build.FILES.items():
    a = open(os.path.join(HERE, 'before', leaf), 'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')
    bpath = os.path.join(HERE, 'candidate', leaf) if which == 'candidate' else live
    b = open(bpath, 'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')
    diff = list(difflib.unified_diff(a, b, 'before/' + leaf, which + '/' + leaf, n=1, lineterm=''))
    chunks.append('\n'.join(diff))
text = '\n'.join(chunks) + '\n'
with open(os.path.join(HERE, 'w1_23_changes.diff'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(text)
print(text)
