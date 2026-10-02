"""Scratch only: the gate's end checks ran at 09:41:25, so the draft's '09:40' end times become '09:42' (the report is
recomposed after this); and compose_report_c2.py accepts a live W1.md that already ends with the part-1 bytes (an
earlier composition of this gate). Exact-count replacements; LF kept."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.join(HERE, 'W1__part2.md')
s = open(P2, 'rb').read().decode('utf-8')
pairs = [('09:17-09:40', '09:17-09:42', 1), ('09:17 - 09:40', '09:17 - 09:42', 1), ('end 09:40', 'end 09:41', 1)]
for old, new, n in pairs:
    assert s.count(old) == n, (old, s.count(old))
    s = s.replace(old, new)
open(P2, 'wb').write(s.encode('utf-8'))

C = os.path.join(HERE, 'compose_report_c2.py')
c = open(C, 'rb').read().decode('utf-8')
old = "if hashlib.sha1(live).hexdigest() not in (P1_SHA1, hashlib.sha1(new).hexdigest()):\n"
new = "if hashlib.sha1(live).hexdigest() not in (P1_SHA1, hashlib.sha1(new).hexdigest()) and not live.endswith(part1):\n"
assert c.count(old) == 1
c = c.replace(old, new)
open(C, 'wb').write(c.encode('utf-8'))
print('retimed and compose check widened')
