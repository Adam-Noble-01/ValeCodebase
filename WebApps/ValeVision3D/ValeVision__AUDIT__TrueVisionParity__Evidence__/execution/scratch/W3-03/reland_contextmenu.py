"""Re-land SheetTools__ContextMenu__ after its PORT NOTE gained the Legacy field: only if the live file is still exactly
the first landing (staged/...js.v1). One whole write."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import port_w3_03 as P  # noqa: E402

REL = P.ST + 'Na__LayoutEditor__SheetTools__ContextMenu__.js'
live = os.path.join(P.VV, REL)
v1 = open(os.path.join(HERE, 'staged', 'Na__LayoutEditor__SheetTools__ContextMenu__.js.v1'), 'rb').read()
assert open(live, 'rb').read() == v1, 'live ContextMenu changed since the first landing - stop'
out = P.whole('Na__LayoutEditor__SheetTools__ContextMenu__.js').encode('utf-8')
with open(os.path.join(HERE, 'staged', 'Na__LayoutEditor__SheetTools__ContextMenu__.js'), 'wb') as f:
    f.write(out)
with open(live, 'wb') as f:
    f.write(out)
print('re-landed', len(out), 'bytes')
