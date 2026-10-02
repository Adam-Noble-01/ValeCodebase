"""Scratch (W0-02): save byte-exact pre-images of every file the renumber rewrites, plus a SHA-1
manifest, so W0-02 can restore its own edits without git if a stop condition hits.

Reads the dry-run report written by k2_renumber_apply__exec.py --mode dry-run --report ...
"""
import hashlib, json, os, shutil

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, 'renumber_dryrun_report.json')
OUT = os.path.join(HERE, 'preimage')

r = json.load(open(REPORT, encoding='utf-8'))
files = list(r['files_rewritten'])
manifest = {}
if os.path.exists(OUT):
    raise SystemExit('preimage folder already exists - refusing to overwrite: ' + OUT)
for rel in files:
    src = os.path.join(VV, rel.replace('/', os.sep))
    data = open(src, 'rb').read()
    dst = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as f:
        f.write(data)
    manifest[rel] = {'sha1': hashlib.sha1(data).hexdigest(), 'bytes': len(data),
                     'crlf': data.count(b'\r\n'), 'lf_only': data.count(b'\n') - data.count(b'\r\n'),
                     'bom': data.startswith(b'\xef\xbb\xbf')}
json.dump(manifest, open(os.path.join(HERE, 'preimage_manifest.json'), 'w', encoding='utf-8'), indent=1)
print('saved %d pre-images to %s' % (len(manifest), OUT))
