"""W1-99: the release named on the lines W0-99 listed as unresolved placeholders in the Whitecardopedia Flask files
(its Port Record, section 5), read now. Read-only; opens only the five named files."""
import os, re

WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
FILES = ['Server__ValeVisionShared__Lib__.py', 'Server__ValeVisionSheetImages__Api__.py',
         'Server__ValeVisionUserConfig__Api__.py', 'Server__ValeVisionPublished__Api__.py',
         'Server__ValeVisionStatements__Api__.py']
PAT = re.compile(r'for ValeVision3D (\S+)')
for f in FILES:
    lines = open(os.path.join(WCP, f), 'rb').read().decode('utf-8', 'replace').splitlines()
    hits = [(i, PAT.search(ln).group(1)) for i, ln in enumerate(lines, 1) if PAT.search(ln)]
    print('%-45s %s' % (f, ', '.join(':%d %s' % h for h in hits) or '(no "for ValeVision3D" line)'))
