"""Scratch only: let crosscheck_c2.py attest a file the gate itself wrote (FIX-C1): the hash in C2/preimage/written.sha1
counts as the attestation 'gate:W1-GATE'. Exact-once replacement; LF kept."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crosscheck_c2.py')
s = open(P, 'rb').read().decode('utf-8')
old = "    who = [d for d, ts in hash_lists.items() if any(s1[:12] in t or s256[:12] in t for t in ts)]\n    r['attest'] = ('scratch:' + ','.join(who)) if who else 'NONE'\n"
new = ("    who = [d for d, ts in hash_lists.items() if any(s1[:12] in t or s256[:12] in t for t in ts)]\n"
       "    gate_written = os.path.join(OUT, 'preimage', 'written.sha1')\n"
       "    if not who and os.path.isfile(gate_written) and s1 in open(gate_written, encoding='utf-8').read():\n"
       "        r['attest'] = 'gate:W1-GATE (FIX-C1)'\n"
       "        continue\n"
       "    r['attest'] = ('scratch:' + ','.join(who)) if who else 'NONE'\n")
assert s.count(old) == 1
s = s.replace(old, new)
open(P, 'wb').write(s.encode('utf-8'))
print('adapted', P)
