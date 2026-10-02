import subprocess, os, hashlib
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(__file__), 'tv')
os.makedirs(OUT, exist_ok=True)
MD = '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/02__Core__Markdown/'
files = [MD + 'Na__LayoutEditor__Statement__Md__' + n + '__.js' for n in ('Tokenise', 'Inline', 'Render', 'Serialise', 'Figure')]
files += ['80__Testing__PrototypeEnvironment/Na__Test__StatementRoundTrip__.test.mjs',
          '80__Testing__PrototypeEnvironment/Na__Test__StatementFigureTitle__.test.mjs']
for f in files:
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + f], capture_output=True, check=True).stdout
    name = os.path.basename(f)
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(data)
    print(name, len(data), data.count(b'\n'), 'CRLF' if b'\r\n' in data else 'LF', hashlib.sha1(data).hexdigest())
# log of the folder at the pin
log = subprocess.run(['git', '-C', REPO, 'log', '--oneline', PIN, '--', APP + MD], capture_output=True).stdout.decode('utf-8', 'replace')
print(log)
log = subprocess.run(['git', '-C', REPO, 'log', '--oneline', PIN, '--', APP + files[5], APP + files[6]], capture_output=True).stdout.decode('utf-8', 'replace')
print(log)
