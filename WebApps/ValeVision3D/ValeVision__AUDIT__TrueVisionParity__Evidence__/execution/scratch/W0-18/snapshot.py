"""W0-18 scratch: SHA-1, size and line endings of every file this package owns (pre-images)."""
import hashlib
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = {
    'server.py'      : r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py',
    '.gitignore'     : r'D:\10_CoreLib__ValeCodebase\.gitignore',
    'sheet_api'      : r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionSheetImages__Api__.py',
    'userconfig_api' : r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionUserConfig__Api__.py',
    'spellings'      : r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\50__ValeVision__UserConfig\ValeVision__UserSpellings__.json',
    'test_sheet'     : r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__SheetImagesApi__.test.py',
    'test_spell'     : r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__UserSpellingsApi__.test.py',
    'shared_lib (W0-09, read only)': r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Server__ValeVisionShared__Lib__.py',
}

save = '--save-preimages' in sys.argv
pre = os.path.join(HERE, 'preimage')
for label, path in FILES.items():
    if not os.path.exists(path):
        print('%-32s MISSING (new file)' % label)
        continue
    data = open(path, 'rb').read()
    print('%-32s %7d bytes  sha1=%s  crlf=%d lf=%d  final_nl=%s' % (
        label, len(data), hashlib.sha1(data).hexdigest()[:8], data.count(b'\r\n'), data.count(b'\n'), data.endswith(b'\n')))
    if save and 'read only' not in label:
        os.makedirs(pre, exist_ok=True)
        shutil.copy2(path, os.path.join(pre, os.path.basename(path)))
