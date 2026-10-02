"""Report size, sha1 and line-ending census of files."""
import hashlib
import sys

for path in sys.argv[1:]:
    with open(path, 'rb') as fh:
        data = fh.read()
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n') - crlf
    cr = data.count(b'\r') - crlf
    bom = data.startswith(b'\xef\xbb\xbf')
    print('%-60s %8d B  sha1 %s  CRLF %d  LF %d  CR %d  BOM %s  endsNL %s' % (
        path.replace('\\', '/').split('/')[-1], len(data), hashlib.sha1(data).hexdigest()[:8], crlf, lf, cr, bom,
        data.endswith(b'\n')))
