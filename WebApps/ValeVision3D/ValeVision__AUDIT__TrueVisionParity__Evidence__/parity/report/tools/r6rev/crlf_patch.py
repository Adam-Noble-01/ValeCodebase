"""Apply exact (old, new) replacements to a CRLF or LF text file, keeping its line ending.
Usage: python crlf_patch.py <target> <pairs.py>   (pairs.py defines PAIRS = [(old, new), ...])
Each old string must occur exactly once."""
import sys, runpy
target, pairs_file = sys.argv[1], sys.argv[2]
pairs = runpy.run_path(pairs_file)['PAIRS']
raw = open(target, 'rb').read()
crlf = raw.count(b'\r\n') > 0
text = raw.decode('utf-8').replace('\r\n', '\n')
for i, (old, new) in enumerate(pairs, 1):
    n = text.count(old)
    assert n == 1, 'pair %d matched %d times: %r' % (i, n, old[:120])
    text = text.replace(old, new)
out = text.replace('\n', '\r\n') if crlf else text
open(target, 'wb').write(out.encode('utf-8'))
print('patched', target, len(pairs), 'pairs', 'CRLF' if crlf else 'LF')
