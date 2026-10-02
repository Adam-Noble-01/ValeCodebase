# Extract TV sources for W4-01 at the pin b2aa9151 into scratch/W4-01/tv (bytes, exactly as git show returns them)
import subprocess, os

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')

def show(path):
    return subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + path], capture_output=True, check=True).stdout

def ls(prefix):
    out = subprocess.run(['git', '-C', REPO, 'ls-tree', '-r', '--name-only', PIN, '--', prefix], capture_output=True, check=True).stdout
    return [l for l in out.decode('utf-8').splitlines() if l]

APP = 'na-apps/30__TrueVision__CoreAppCode/'
files = [APP + '02__Src__AppModules/53__Data__Layout__PublishedSchema/' + n for n in (
    'Na__PublishedSchema__.json', 'Na__PublishedSchema__Paths__.js', 'Na__PublishedSchema__Version__.js', 'README__PublishedSchema__.md')]
files.append(APP + '80__Testing__PrototypeEnvironment/Na__Test__PublishedSchema__.test.mjs')
EX = 'na-project-portal/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/06__Layout__PublishedDocuments/'
files += ls(EX)

for f in files:
    data = show(f)
    rel = f.replace(APP, 'APP/').replace('na-project-portal/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/', 'EXAMPLE/')
    dest = os.path.join(OUT, *rel.split('/'))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as fh:
        fh.write(data)
    print(len(data), b'\r\n' in data, rel)
print(len(files), 'files')
