"""Fetch the TrueVision sources W0-19 ports, read at the pin b2aa9151 (bytes, as git show returns them)."""
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')

FILES = [
    'na-apps/ProjectVision__TrueVisionPublished__Api__.py',
    'na-apps/ProjectVision__TrueVisionStatements__Api__.py',
    'na-apps/ProjectVision__LocalServer__Main__.py',
    'na-apps/ProjectVision__TrueVisionSheetImages__Api__.py',
    'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py',
    'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__ScrapbookApi__.test.py',
    'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__ScrapbookServer__.py',
    '.gitignore',
    '.gitattributes',
    'na-apps/30__TrueVision__CoreAppCode/.gitignore',
    'na-apps/30__TrueVision__CoreAppCode/.gitattributes',
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    proc = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + rel], capture_output=True)
    if proc.returncode != 0:
        print('MISSING', rel, proc.stderr.decode('utf-8', 'replace').strip())
        continue
    data = proc.stdout
    name = rel.replace('/', '__SLASH__') if rel.startswith('.') or '/.git' in rel else os.path.basename(rel)
    if rel.endswith('.gitignore') or rel.endswith('.gitattributes'):
        name = rel.replace('/', '__')
    path = os.path.join(OUT, name)
    with open(path, 'wb') as handle:
        handle.write(data)
    crlf = data.count(b'\r\n')
    print('%-90s %7d bytes %5d lines crlf=%d sha1=%s' % (rel, len(data), data.count(b'\n'), crlf, hashlib.sha1(data).hexdigest()[:8]))

# Last commit that touched each file up to the pin
for rel in FILES[:7]:
    proc = subprocess.run(['git', '-C', NAWEB, 'log', '--format=%h %ad %s', '--date=short', PIN, '--', rel], capture_output=True)
    print('LOG', rel)
    print(proc.stdout.decode('utf-8', 'replace'))
