# W0-08 scratch: G0 preflight - pre-images (bytes + SHA-1) of the three owned files and a check that
# every entry of the live WCP precache list exists on disk after W0-02's renumber.
import hashlib
import json
import os
import re
import shutil

VCB = r'D:\10_CoreLib__ValeCodebase'
WEBAPPS = os.path.join(VCB, 'WebApps')
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')

OWNED = [
    r'WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__AutoSave__.js',
    r'WebApps\Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability\Whitecardopedia__Pwa__ServiceWorker__Logic__.js',
    r'WebApps\Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability\Whitecardopedia__Pwa__ServiceWorker__Registrar__.js',
]

manifest = {}
for rel in OWNED:
    src = os.path.join(VCB, rel)
    data = open(src, 'rb').read()
    dest = os.path.join(PRE, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not os.path.exists(dest):
        shutil.copyfile(src, dest)
    manifest[rel] = {
        'sha1': hashlib.sha1(data).hexdigest(),
        'bytes': len(data),
        'crlf': data.count(b'\r\n'),
        'lf_only': data.count(b'\n') - data.count(b'\r\n'),
    }
with open(os.path.join(HERE, 'preimage_manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, indent=1)
print(json.dumps(manifest, indent=1))

# Precache list check (live logic file)
logic = open(os.path.join(VCB, OWNED[1]), 'r', encoding='utf-8').read()
block = logic.split('PWA_SW_SHELL_PRECACHE_RELATIVE    = [', 1)[1].split('];', 1)[0]
entries = re.findall(r"'([^']+)'", block)
missing = [e for e in entries if not os.path.isfile(os.path.join(WEBAPPS, e.replace('/', os.sep)))]
print(f'precache entries: {len(entries)}; missing on disk: {len(missing)}')
for m in missing:
    print('  MISSING', m)
