"""W0-18 scratch: a G4-style identity scan of this package's files (W0-04's lint has not landed yet).
Flags NA-only markers and TV app tokens outside the PORT NOTE block and outside TV's verbatim DEVELOPMENT LOG."""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
FILES = [
    r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionSheetImages__Api__.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionUserConfig__Api__.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\50__ValeVision__UserConfig\ValeVision__UserSpellings__.json',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__SheetImagesApi__.test.py',
    r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__UserSpellingsApi__.test.py',
]
MARKERS = re.compile(r'TrueVision__|\[TrueVision3D|TRUEVISION3D|/api/truevision|NaProjectPortal|30__TrueVision__AppContent|'
                     r'na-apps/30__TrueVision|na-project-portal|/q/|/s/|Noble Architecture Ltd|_T0[1-4]_|RB05|ProjectVision')
total = 0
for path in FILES:
    in_port_note = in_devlog = False
    for number, line in enumerate(open(path, encoding='utf-8').read().split('\n'), 1):
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
            print(f'{path.rsplit(chr(92), 1)[-1]}:{number}: [{where}] {match.group(0)} :: {line.strip()[:120]}')
print('hits outside PORT NOTE / TV development log:', total)
