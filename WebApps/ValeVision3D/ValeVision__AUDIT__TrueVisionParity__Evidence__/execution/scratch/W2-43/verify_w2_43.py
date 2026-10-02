"""W2-43 verification (scratch, read-only on both apps' trees).

1. REVERSE-SEAM CHECK. For each landed ValeVision file: undo the package's declared seams (banner, PORT NOTE,
   and for the test the S02b-F49 labels) and require the result to equal TrueVision's bytes at the pin exactly.
   Also require the live file to equal build_w2_43.py's output (nothing edited by hand after the build).
2. TV BASELINE. Mirror TrueVision's FlushJoins module and test at the pin into scratch/W2-43/tvrun/ (the test
   resolves ../02__Src__AppModules from its own folder) so `node tvrun/80__Testing__PrototypeEnvironment/...`
   reproduces TrueVision's own 8/8 without touching TrueVision's working tree.

Usage: python verify_w2_43.py
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('build_w2_43', os.path.join(HERE, 'build_w2_43.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def reverse(rel, vv, tv):
    """Undo the seams by taking TrueVision's text for every span the build replaced."""
    # The build's own transform applied to TV must reproduce the live file; then reversing is the identity
    # check below: replace each VV span with TV's span and compare.
    pairs = []
    if rel.endswith('FlushJoins__.js'):
        pairs.append(('// VALEVISION3D - PROJECTED LINEWORK - FLUSH JOINS\n', '// TRUEVISION3D - PROJECTED LINEWORK - FLUSH JOINS\n'))
    elif rel.endswith('Storeys__.js'):
        pairs.append(('// VALEVISION3D - PROJECTED LINEWORK - STOREYS\n', '// TRUEVISION3D - PROJECTED LINEWORK - STOREYS\n'))
    else:
        pairs.append(('// VALEVISION3D - TEST - FLUSH JOINS (a seam between two flush faces is not a line)\n',
                      '// TRUEVISION3D - TEST - FLUSH JOINS (a seam between two flush faces is not a line)\n'))
        pairs.append(("A measured house's first floor walls start\n", "RB05's first floor walls start\n"))
        pairs.append(('(the measured first floor wall)', "(RB05\\'s first floor wall)"))
    out = vv
    for new, old in pairs:
        if out.count(new) != 1:
            return None, 'seam text not found exactly once: ' + new.strip()
        out = out.replace(new, old)
    # PORT NOTE: modules - swap VV's block for TV's; test - remove the inserted block.
    vv_rows = out.split('\n')
    tv_rows = tv.split('\n')
    v0 = next(i for i, r in enumerate(vv_rows) if r.startswith('// PORT NOTE:'))
    v1 = next(i for i in range(v0 + 1, len(vv_rows)) if vv_rows[i].startswith('// ----'))
    if rel.endswith('.test.mjs'):
        # The inserted block is "PORT NOTE .. Back-port", "//", rule, "//" - four extra trailing rows.
        del vv_rows[v0:v1 + 2]
    else:
        t0 = next(i for i, r in enumerate(tv_rows) if r.startswith('// PORT NOTE:'))
        t1 = next(i for i in range(t0 + 1, len(tv_rows)) if tv_rows[i].startswith('// ----'))
        vv_rows[v0:v1] = tv_rows[t0:t1]
    return '\n'.join(vv_rows), None


def main():
    failures = 0
    for rel, fn in build.FILES:
        raw = build.tv_bytes(rel)
        tv = raw.decode('utf-8')
        target = os.path.join(build.VV_ROOT, rel.replace('/', os.sep))
        with open(target, 'rb') as fh:
            live = fh.read()
        same_as_build = live == fn(tv).encode('utf-8')
        back, problem = reverse(rel, live.decode('utf-8'), tv)
        ok = same_as_build and problem is None and back == tv
        failures += 0 if ok else 1
        print('%-4s %s  (live == build: %s; seams reversed == TV bytes: %s%s)' % (
            'OK' if ok else 'FAIL', rel, same_as_build, back == tv, '; ' + problem if problem else ''))

    # TV baseline mirror
    mirror = os.path.join(HERE, 'tvrun')
    for rel in ('02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlushJoins__.js',
                '80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs'):
        path = os.path.join(mirror, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(build.tv_bytes(rel))
    print('TV mirror for the baseline run: ' + mirror)
    print('verify: %d problem(s)' % failures)
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
