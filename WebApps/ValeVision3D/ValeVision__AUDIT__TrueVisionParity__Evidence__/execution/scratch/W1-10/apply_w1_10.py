"""Scratch (W1-10, never shipped): land the six W1-10 files, or put the tree back.

    python -B apply_w1_10.py            hash-check the three existing files (unchanged since this package read
                                        them) and that the three new ones do not exist; keep pre-images in
                                        ./preimage; write the candidates (bytes as built, LF)
    python -B apply_w1_10.py --restore  only if every landed file is still exactly what this package wrote:
                                        put the three pre-images back byte for byte and remove the new files
"""
import hashlib, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP  = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
CAND = os.path.join(HERE, 'candidates')
PRE  = os.path.join(HERE, 'preimage')
ELEV = '02__Src__AppModules/45__System__ElevationViews/'
EXISTING = {                                                     # sha1 of the live file as this package read it
    ELEV + 'Na__Elevation__ProjectJson__Data__.js' : '62ffc7d0cdb5',
    ELEV + 'Na__Elevation__AppConfig__.json'       : '22a5a109c54b',
    ELEV + 'Na__Elevation__Styles__DevMenu__.css'  : '91661ae74b01',
}
NEW = [ELEV + 'Na__Elevation__AutoNameText__.js', ELEV + 'Na__Elevation__AutoName__.js',
       '80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html']

def p(base, rel): return os.path.join(base, rel.replace('/', os.sep))
def sha1(path): return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:12]

def land():
    for rel, want in EXISTING.items():
        got = sha1(p(APP, rel))
        if got != want: sys.exit('STOP: %s changed since it was read (%s, read %s)' % (rel, got, want))
    for rel in NEW:
        if os.path.exists(p(APP, rel)): sys.exit('STOP: %s already exists' % rel)
    for rel in EXISTING:
        os.makedirs(os.path.dirname(p(PRE, rel)), exist_ok=True)
        shutil.copyfile(p(APP, rel), p(PRE, rel))
        assert sha1(p(PRE, rel)) == EXISTING[rel]
    for rel in list(EXISTING) + NEW:
        data = open(p(CAND, rel), 'rb').read()
        with open(p(APP, rel), 'wb') as fh:
            fh.write(data)
        print('landed  %-80s %6d bytes  sha1 %s' % (rel, len(data), sha1(p(APP, rel))))

def restore():
    for rel in list(EXISTING) + NEW:
        if open(p(APP, rel), 'rb').read() != open(p(CAND, rel), 'rb').read():
            sys.exit('STOP: %s is no longer what W1-10 wrote; restore by hand' % rel)
    for rel in EXISTING:
        shutil.copyfile(p(PRE, rel), p(APP, rel))
        assert sha1(p(APP, rel)) == EXISTING[rel]
        print('restored', rel)
    for rel in NEW:
        os.remove(p(APP, rel))
        print('removed ', rel)

if __name__ == '__main__':
    restore() if '--restore' in sys.argv else land()
