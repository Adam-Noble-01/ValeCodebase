"""W0-99 - tidy this package's own scratch: move the two binary index files of the incident out of the repository (to the
session scratchpad), and remove the redundant second copy of the end-of-Wave-0 port-order map. Only scratch/W0-99 files."""
import hashlib, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION = (r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins'
           r'\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W0-99__index_incident')
os.makedirs(SESSION, exist_ok=True)
for name in ('index__after_add_A', 'index__rebuilt'):
    src = os.path.join(HERE, 'index_incident', name)
    if os.path.exists(src):
        h = hashlib.sha1(open(src, 'rb').read()).hexdigest()
        dst = os.path.join(SESSION, name)
        shutil.copyfile(src, dst)
        assert hashlib.sha1(open(dst, 'rb').read()).hexdigest() == h
        os.remove(src)
        print('moved %s (sha1 %s) -> %s' % (name, h[:8], dst))
d = os.path.join(HERE, 'index_incident')
if os.path.isdir(d) and not os.listdir(d):
    os.rmdir(d)
copy = os.path.join(HERE, 'pom', 'port_order_map__endW0__copy.json')
main = os.path.join(HERE, 'pom', 'port_order_map__endW0.json')
if os.path.exists(copy):
    assert open(copy, 'rb').read() == open(main, 'rb').read()
    os.remove(copy)
    print('removed the identical copy of the end-of-Wave-0 map')
