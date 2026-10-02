# W0-10 scratch: set up the staged worker tree and record pre-images.
#
# - Records the SHA-1 of every live worker source file and of the two live
#   inputs the package reads (VV app config, WCP master index) in
#   scratch/W0-10/preimage_manifest.json, so the end of the package can prove
#   nothing it depends on changed under it.
# - Copies the live src/index.js into the staged tree with CRLF turned into LF
#   for editing (the final step turns the staged files back into CRLF, the
#   worker folder's own line ending).
# Writes only inside execution/prepared/W0-10/ and execution/scratch/W0-10/.
import hashlib
import json
import os
import sys

sys.dont_write_bytecode = True

VCB = r'D:\10_CoreLib__ValeCodebase'
WORKER = os.path.join(VCB, 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
EXEC = os.path.join(VCB, 'WebApps', 'ValeVision3D', 'ValeVision__AUDIT__TrueVisionParity__Evidence__', 'execution')
STAGE_WORKER = os.path.join(EXEC, 'prepared', 'W0-10', 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
SCRATCH = os.path.join(EXEC, 'scratch', 'W0-10')

INPUTS = [
    os.path.join(VCB, 'WebApps', 'ValeVision3D', '02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json'),
    os.path.join(VCB, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json'),
]


def sha1(path):
    with open(path, 'rb') as handle:
        return hashlib.sha1(handle.read()).hexdigest()


manifest = {'worker': {}, 'inputs': {}}
for dirpath, dirnames, filenames in os.walk(WORKER):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.wrangler')]
    for name in filenames:
        full = os.path.join(dirpath, name)
        manifest['worker'][os.path.relpath(full, VCB).replace('\\', '/')] = sha1(full)
for full in INPUTS:
    manifest['inputs'][os.path.relpath(full, VCB).replace('\\', '/')] = sha1(full)

os.makedirs(SCRATCH, exist_ok=True)
with open(os.path.join(SCRATCH, 'preimage_manifest.json'), 'w', encoding='utf-8', newline='\n') as handle:
    json.dump(manifest, handle, indent=4, sort_keys=True)
    handle.write('\n')

os.makedirs(os.path.join(STAGE_WORKER, 'src', 'handlers'), exist_ok=True)
os.makedirs(os.path.join(STAGE_WORKER, 'tests'), exist_ok=True)

live_index = os.path.join(WORKER, 'src', 'index.js')
staged_index = os.path.join(STAGE_WORKER, 'src', 'index.js')
if os.path.exists(staged_index):
    print('staged index.js already exists - left as it is')
else:
    data = open(live_index, 'rb').read()
    assert b'\r\n' in data and data.count(b'\n') == data.count(b'\r\n'), 'live index.js is not uniformly CRLF'
    with open(staged_index, 'wb') as handle:
        handle.write(data.replace(b'\r\n', b'\n'))
    print('staged index.js written (LF for editing):', staged_index)

print(json.dumps(manifest, indent=2))
