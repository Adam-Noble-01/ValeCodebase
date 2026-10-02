# W1-03 scratch: build the "before" module copies the browser harness imports.
# The pre-edit bytes saved in before/ are copied into harness/old/; only the two
# relative import specifiers of MultiModel are rewritten to absolute URLs on the
# Flask server, so the copy links from the scratch folder. Nothing else changes.
import hashlib, os

SCRATCH = os.path.dirname(os.path.abspath(__file__))
BEFORE  = os.path.join(SCRATCH, 'before')
OLD     = os.path.join(SCRATCH, 'harness', 'old')
os.makedirs(OLD, exist_ok=True)

EXPECT = {
    'Na__ModelLoader__MultiModel.js'      : '172dcfe3d84d13e76a851bb5f90bb595c0f70cf6',
    'Na__RenderEffect__Supersampler__.js' : '489a852de20934d58bca1482e34fd945876a8d8c',
}
REWRITE = {
    'Na__ModelLoader__MultiModel.js': [
        (b"from '../03__AppUtils/Na__AppUtils__ResilientLoad__.js';",
         b"from '/ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js';"),
        (b"from './Na__ModelLoader__ContentStamp__.js';",
         b"from '/ValeVision3D/02__Src__AppModules/15__ModelLoader/Na__ModelLoader__ContentStamp__.js';"),
    ],
}

for name, sha in EXPECT.items():
    data = open(os.path.join(BEFORE, name), 'rb').read()
    assert hashlib.sha1(data).hexdigest() == sha, name + ' before-copy is not the pre-image'
    for old, new in REWRITE.get(name, []):
        assert data.count(old) == 1, (name, old)
        data = data.replace(old, new)
    open(os.path.join(OLD, name), 'wb').write(data)
    print(name, 'pre-image', sha[:12], '-> harness copy', hashlib.sha1(data).hexdigest()[:12])
