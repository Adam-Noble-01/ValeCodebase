"""W0-18 scratch: one wording fix in this package's own .gitignore block ("three lines" -> "these lines"). LF kept."""
import hashlib
import os
import sys

TARGET = r'D:\10_CoreLib__ValeCodebase\.gitignore'
data = open(TARGET, 'rb').read()
if not hashlib.sha1(data).hexdigest().startswith('fe49ff80'):
    print('STOP: .gitignore is not the version this package wrote')
    sys.exit(2)
old = b'# names, the archive still excluded - three lines added under this one:\n'
new = b'# names, the archive still excluded - these lines added under this one:\n'
assert data.count(old) == 1
out = data.replace(old, new)
assert b'\r' not in out
temp = TARGET + '.w018.tmp'
with open(temp, 'wb') as handle:
    handle.write(out)
os.replace(temp, TARGET)
print('.gitignore sha1', hashlib.sha1(out).hexdigest()[:8], len(out), 'bytes')
