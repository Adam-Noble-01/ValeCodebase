"""W0-19 scratch: a G4-style identity scan of this package's files (W0-04's lint has not landed yet).
Flags NA-only markers and TV app tokens outside the PORT NOTE block and outside TV's verbatim DEVELOPMENT LOG.
Usage: python identity_scan.py [candidate|live]"""
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
where_from = sys.argv[1] if len(sys.argv) > 1 else 'candidate'
BLUEPRINTS = ('Server__ValeVisionPublished__Api__.py', 'Server__ValeVisionStatements__Api__.py')
FILES = [os.path.join(HERE, 'candidate', name) if where_from == 'candidate' else os.path.join(r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia', name)
         for name in BLUEPRINTS] + [
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__PublishedApi__.test.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__StatementServer__.py',
]
MARKERS = re.compile(r'TrueVision__|\[TrueVision3D|TRUEVISION3D|/api/truevision|NaProjectPortal|30__TrueVision__AppContent|'
                     r'na-apps/30__TrueVision|na-project-portal|/q/|/s/|Noble Architecture Ltd|_T0[1-4]_|RB05|ProjectVision|'
                     r'na-projectvision-local-dev|8090|-Projects/|\byear 26\b')
total = 0
for path in FILES:
    in_port_note = in_devlog = False
    data = open(path, 'rb').read()
    print(f'{os.path.basename(path)}: {len(data)} bytes, {data.count(chr(10).encode())} lines, CRLF {data.count(b"\r\n")}, BOM {data.startswith(b"\xef\xbb\xbf")}')
    for number, line in enumerate(data.decode('utf-8').split('\n'), 1):
        if 'PORT NOTE:' in line:
            in_port_note = True
        elif in_port_note and line.startswith('# ----'):
            in_port_note = False
        if 'DEVELOPMENT LOG:' in line:
            in_devlog = True
        elif in_devlog and line.startswith('# ===='):
            in_devlog = False
        for match in MARKERS.finditer(line):
            where = 'PORT NOTE (exempt)' if in_port_note else ('DEVELOPMENT LOG (TV verbatim)' if in_devlog else 'CODE/TEXT')
            if where == 'CODE/TEXT':
                total += 1
            print(f'  {os.path.basename(path)}:{number}: [{where}] {match.group(0)} :: {line.strip()[:120]}')
print('hits outside PORT NOTE / TV development log:', total)
sys.exit(1 if total else 0)
