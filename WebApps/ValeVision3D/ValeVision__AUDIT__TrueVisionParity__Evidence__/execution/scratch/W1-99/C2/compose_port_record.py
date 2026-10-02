"""W1-99 (continuation): compose port_records/W1-99.md - this pass's record (C2/W1-99__part2.md) on top, then part 1's
record byte for byte (C2/W1-99__part1__as_written.md, sha1 67293d10), as the W1 gate report keeps its two parts.
Refuses unless the live record is still part 1's bytes (or already this composition). LF throughout, as part 1's."""
import hashlib, os

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
LIVE = os.path.join(EXEC, 'port_records', 'W1-99.md')
P1 = os.path.join(HERE, 'W1-99__part1__as_written.md')
P2 = os.path.join(HERE, 'W1-99__part2.md')
P1_SHA = '67293d10c05add4525c9f8296915ced0f5bebaa6'

sha1 = lambda b: hashlib.sha1(b).hexdigest()
p1 = open(P1, 'rb').read()
assert sha1(p1) == P1_SHA, 'part 1 copy changed'
p2 = open(P2, 'rb').read()
assert b'\r' not in p2 and p2.endswith(b'preserved as written\n\n'), 'part 2 draft ends unexpectedly'
p2.decode('ascii')
out = p2 + p1
cur = open(LIVE, 'rb').read()
if sha1(cur) not in (P1_SHA, sha1(out)):
    raise SystemExit('REFUSED: the live record is neither part 1 nor this composition (%s)' % sha1(cur)[:8])
assert out.endswith(p1) and out[len(p2):] == p1
tmp = LIVE + '.tmp'
open(tmp, 'wb').write(out)
os.replace(tmp, LIVE)
print('written %s: %d bytes (part 2 %d + part 1 %d), sha1 %s' % (LIVE, len(out), len(p2), len(p1), sha1(out)[:8]))
