# W1-29 scratch: keep the pre-image of every file this package writes, with a SHA-1 manifest.
# The KeyScope module is new: its absence is recorded (a restore deletes it).
import hashlib
import json
import os
import shutil

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')

FILES = [
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js',
]

os.makedirs(PRE, exist_ok=True)
manifest = {}
for rel in FILES:
    src = os.path.join(VV, *rel.split('/'))
    if not os.path.exists(src):
        manifest[rel] = {'exists': False}
        print(f'{rel}: absent (new file)')
        continue
    data = open(src, 'rb').read()
    dst = os.path.join(PRE, os.path.basename(rel))
    if os.path.exists(dst):
        old = open(dst, 'rb').read()
        if old != data:
            raise SystemExit(f'REFUSED: a different pre-image of {rel} is already saved; not overwriting it')
    else:
        shutil.copyfile(src, dst)
    manifest[rel] = {
        'exists': True,
        'sha1': hashlib.sha1(data).hexdigest(),
        'bytes': len(data),
        'crlf': data.count(b'\r\n'),
        'lf_only': data.count(b'\n') - data.count(b'\r\n'),
        'bom': data[:3] == b'\xef\xbb\xbf',
    }
    print(f"{rel}: sha1 {manifest[rel]['sha1']} {len(data)} bytes crlf={manifest[rel]['crlf']} lf_only={manifest[rel]['lf_only']}")

out = os.path.join(HERE, 'preimage_manifest.json')
if os.path.exists(out):
    prev = json.load(open(out, encoding='utf-8'))
    if prev != manifest:
        raise SystemExit('REFUSED: preimage_manifest.json already exists with different content')
json.dump(manifest, open(out, 'w', encoding='utf-8'), indent=1)
print('manifest:', out)
