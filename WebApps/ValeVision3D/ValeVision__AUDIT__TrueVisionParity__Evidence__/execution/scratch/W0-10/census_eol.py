# W0-10 scratch: line-ending, encoding and SHA-1 census of the live worker source.
import hashlib
import os
import sys

sys.dont_write_bytecode = True

ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\CloudflareWorker'
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.wrangler')]
    for name in sorted(filenames):
        p = os.path.join(dirpath, name)
        b = open(p, 'rb').read()
        crlf = b.count(b'\r\n')
        lf = b.count(b'\n') - crlf
        nonascii = sum(1 for x in b if x > 127)
        bom = b.startswith(b'\xef\xbb\xbf')
        final_nl = b.endswith(b'\n')
        print('%-75s %6d bytes crlf=%-4d lf=%-4d nonascii=%-3d bom=%s final_nl=%s sha1=%s' % (
            os.path.relpath(p, ROOT), len(b), crlf, lf, nonascii, bom, final_nl, hashlib.sha1(b).hexdigest()))
