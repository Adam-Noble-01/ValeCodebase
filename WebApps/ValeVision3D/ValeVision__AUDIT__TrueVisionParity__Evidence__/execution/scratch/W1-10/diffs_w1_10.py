# Scratch (W1-10): unified diffs of each candidate (or live file with --live) against TrueVision at the pin,
# and of the AppConfig and stylesheet against this app's pre-images. Writes ./diffs/*.diff and prints them.
import difflib, os, subprocess, sys

HERE  = os.path.dirname(os.path.abspath(__file__))
APP   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN   = 'b2aa9151'
LIVE  = '--live' in sys.argv
ELEV  = '02__Src__AppModules/45__System__ElevationViews/'
FILES = [ELEV + 'Na__Elevation__AutoNameText__.js', ELEV + 'Na__Elevation__AutoName__.js',
         ELEV + 'Na__Elevation__ProjectJson__Data__.js', ELEV + 'Na__Elevation__Styles__DevMenu__.css',
         ELEV + 'Na__Elevation__AppConfig__.json', '80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html']
os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)

def ours(rel):
    base = APP if LIVE else os.path.join(HERE, 'candidates')
    return open(os.path.join(base, rel.replace('/', os.sep)), 'rb').read().decode('utf-8')

def tv(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/' + rel],
                          capture_output=True, check=True).stdout.decode('utf-8')

def pre(rel):
    path = os.path.join(HERE, 'preimage', rel.replace('/', os.sep))
    if not os.path.exists(path):
        path = os.path.join(APP, rel.replace('/', os.sep))
    return open(path, 'rb').read().decode('utf-8')

for rel in FILES:
    name = rel.split('/')[-1]
    d = ''.join(difflib.unified_diff(tv(rel).splitlines(True), ours(rel).splitlines(True), 'TV@' + PIN + '/' + name, 'VV/' + name, n=1))
    open(os.path.join(HERE, 'diffs', name + '.vs_tv.diff'), 'w', encoding='utf-8').write(d)
    print('=' * 20, name, 'vs TrueVision:', d.count('\n+') - 1, 'added /', d.count('\n-') - 1, 'removed lines')
    if '--print' in sys.argv: print(d)
for rel in [ELEV + 'Na__Elevation__AppConfig__.json', ELEV + 'Na__Elevation__Styles__DevMenu__.css', ELEV + 'Na__Elevation__ProjectJson__Data__.js']:
    name = rel.split('/')[-1]
    d = ''.join(difflib.unified_diff(pre(rel).splitlines(True), ours(rel).splitlines(True), 'VV-before/' + name, 'VV-after/' + name, n=1))
    open(os.path.join(HERE, 'diffs', name + '.vs_vv_before.diff'), 'w', encoding='utf-8').write(d)
    print('=' * 20, name, 'vs this app before:', d.count('\n+') - 1, 'added /', d.count('\n-') - 1, 'removed lines')
