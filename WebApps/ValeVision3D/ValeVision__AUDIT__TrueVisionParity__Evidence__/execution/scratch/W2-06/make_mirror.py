"""W2-06 scratch: write the build's outputs (and FlushJoins/Storeys from the live tree) into scratch/W2-06/mirror,
so the ported tests can run against the build before it lands."""
import os, shutil, sys
sys.dont_write_bytecode = True
import build_w2_06 as B

MIRROR = os.path.join(B.HERE, 'mirror')


def main():
    built = B.build_all()
    for rel, target, data, raw in built:
        out = os.path.join(MIRROR, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(data)
    for name in ('Na__ProjectedLinework__FlushJoins__.js', 'Na__ProjectedLinework__Storeys__.js'):
        rel = B.F50 + name
        shutil.copyfile(os.path.join(B.VV_ROOT, rel.replace('/', os.sep)), os.path.join(MIRROR, rel.replace('/', os.sep)))
    test = '80__Testing__PrototypeEnvironment/Na__Test__FlushJoins__.test.mjs'
    shutil.copyfile(os.path.join(B.VV_ROOT, test.replace('/', os.sep)), os.path.join(MIRROR, test.replace('/', os.sep)))
    print('mirror written:', MIRROR)


if __name__ == '__main__':
    main()
