"""Compose execution/gate_reports/W1.md = this gate's PART 2 (C2/W1__part2.md) + the part-1 report byte for byte
(C2/W1__part1__as_written_0235.md, the copy taken before this gate wrote anything; sha1 fd31b67b...). Refuses if the
live W1.md is no longer the part-1 report it copied (unless it is already exactly what this script composes). LF."""
import hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEC = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(EXEC, 'gate_reports', 'W1.md')
P1 = os.path.join(HERE, 'W1__part1__as_written_0235.md')
P2 = os.path.join(HERE, 'W1__part2.md')
P1_SHA1 = 'fd31b67bf262188561ed04a3a6d8f167c9c7e5cf'

part1 = open(P1, 'rb').read()
assert hashlib.sha1(part1).hexdigest() == P1_SHA1, 'part-1 copy changed'
part2 = open(P2, 'rb').read()
assert b'\r\n' not in part2 and b'\r\n' not in part1
assert part2.endswith(b'preserved as written\n\n'), 'part 2 must end with the PART 1 heading and a blank line'
new = part2 + part1
live = open(OUT, 'rb').read()
if hashlib.sha1(live).hexdigest() not in (P1_SHA1, hashlib.sha1(new).hexdigest()) and not live.endswith(part1):
    sys.exit('W1.md changed since the gate copied it (sha1 %s) - nothing written' % hashlib.sha1(live).hexdigest())
open(OUT, 'wb').write(new)
back = open(OUT, 'rb').read()
assert back == new
print('written', OUT, len(new), 'bytes, sha1', hashlib.sha1(new).hexdigest()[:12], '(part 2', len(part2), '+ part 1', len(part1), ')')
