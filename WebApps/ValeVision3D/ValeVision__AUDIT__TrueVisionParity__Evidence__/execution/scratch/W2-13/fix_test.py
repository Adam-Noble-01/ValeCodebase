from pathlib import Path
import sys

p = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__LineworkModifiers__.test.mjs")
t = p.read_bytes().decode("utf-8")
assert "\r\n" not in t

old1 = """    check('scales back to 1: the render widths again', near(stone.material.linewidth, 1.5) && near(brick.material.linewidth, 3));
"""
new1 = """    check('scales back to 1: the render widths again', near(stone.material.linewidth, 1.5) && near(brick.material.linewidth, 3));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    check('the render over: every node back on its own material at its own base width', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)));
"""
old2 = """    check('no override, no rules: nothing swapped or hidden', Na__Test__SameSnapshot(Na__Test__Snapshot(scene), new Map([...Na__Test__Snapshot(scene)].map(([n, s]) => [n, { ...s, material : atRest.get(n) ? atRest.get(n).material : s.material }]))) === ''
        && [stone, oak, render, glass].every((n) => n.material === atRest.get(n).material && n.visible));
"""
new2 = """    check('no override, no rules: nothing swapped, hidden or restyled', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)));
"""
for o, n in ((old1, new1), (old2, new2)):
    if t.count(o) != 1:
        sys.exit("STOP: %d matches for %r" % (t.count(o), o[:80]))
    t = t.replace(o, n)
p.write_bytes(t.encode("utf-8"))
print("ok")
