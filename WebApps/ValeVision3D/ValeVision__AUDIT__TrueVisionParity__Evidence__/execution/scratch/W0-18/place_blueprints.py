"""
W0-18 scratch: copy the validated candidate blueprints into WebApps/Whitecardopedia (new files, never an overwrite
unless --replace names the file's current sha1). The running server has not imported them, so placing them changes
nothing it serves until server.py registers them. Usage: python place_blueprints.py [--replace]
"""
import hashlib
import os
import sys

WCP  = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ('Server__ValeVisionSheetImages__Api__.py', 'Server__ValeVisionUserConfig__Api__.py')

for name in NAMES:
    source = os.path.join(HERE, 'candidate', name)
    target = os.path.join(WCP, name)
    data = open(source, 'rb').read()
    compile(data, target, 'exec')                                         # <-- Never place a file that does not compile
    if os.path.exists(target):
        if open(target, 'rb').read() == data:
            print('unchanged', name)
            continue
        if '--replace' not in sys.argv:
            print('STOP: exists and differs, nothing written:', target)
            sys.exit(2)
    temp = target + '.w018.tmp'                                           # <-- Not *.py: no reloader watches it
    with open(temp, 'wb') as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, target)
    print('placed', name, len(data), 'bytes sha1', hashlib.sha1(data).hexdigest()[:8], 'crlf', data.count(b'\r\n'))
