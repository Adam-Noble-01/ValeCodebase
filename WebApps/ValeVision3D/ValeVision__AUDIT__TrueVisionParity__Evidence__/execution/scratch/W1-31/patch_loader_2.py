# W1-31 - second, small pass on Na__LayoutEditor__Loader__.js (CRLF file): the LOADED bullet
# still said "the three stylesheets" (the list holds eight). Refuses unless the file is the
# first pass's output (sha1 dff89e45...). --restore puts the first pass's output back.
import hashlib
import sys
from pathlib import Path

TARGET = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Loader__.js')
BEFORE = 'dff89e459b78d231dd880a18fd56b168edc64666'
SAVED  = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-31\preimage\Na__LayoutEditor__Loader__.pass1.js')

OLD = '''//   plus tab, a tab rename or drag, or a Dev section action. The full-screen
//   loading screen covers the wait while the modules, the three stylesheets
//   and the editor's configs arrive; then the mode controller is initialised
'''
NEW = '''//   plus tab, a tab rename or drag, or a Dev section action. The full-screen
//   loading screen covers the wait while the modules, the editor's
//   stylesheets and its configs arrive; then the mode controller is initialised
'''


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--restore':
        data = SAVED.read_bytes()
        assert hashlib.sha1(data).hexdigest() == BEFORE
        TARGET.write_bytes(data)
        print('restored first-pass output')
        return
    raw = TARGET.read_bytes()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != BEFORE:
        sys.exit('REFUSED: file is ' + sha + ', expected ' + BEFORE)
    SAVED.write_bytes(raw)
    text = raw.decode('utf-8').replace('\r\n', '\n')
    assert text.count(OLD) == 1, text.count(OLD)
    text = text.replace(OLD, NEW, 1)
    out = text.replace('\n', '\r\n').encode('utf-8')
    TARGET.write_bytes(out)
    print('written', len(out), 'bytes, sha1', hashlib.sha1(out).hexdigest())


if __name__ == '__main__':
    main()
