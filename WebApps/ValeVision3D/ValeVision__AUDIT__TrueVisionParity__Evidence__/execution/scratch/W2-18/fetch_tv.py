"""W2-18 - read the TrueVision sources at the pin b2aa9151 (bytes, exactly as git show returns them)."""
import subprocess, os
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = [
    LE + '26__System__DraftMode/Na__LayoutEditor__DraftMode__.js',
    LE + '26__System__DraftMode/Na__LayoutEditor__DraftMode__Config__.json',
    LE + '26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css',
    LE + '26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__Panel__DrawingGrid__.js',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__Config__.json',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js',
    LE + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js',
    LE + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json',
    LE + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js',
    LE + '33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js',
    LE + '33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__Config__.json',
    LE + '33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__OrthoMode__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingGrid__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingAxes__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__LoaderStylesheets__.test.mjs',
    '03__Style__AppStylesheets/Na__LayoutEditor__Styles__Index__.css',
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
os.makedirs(OUT, exist_ok=True)
for f in FILES:
    r = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + f], capture_output=True)
    if r.returncode != 0:
        print('MISSING', f, r.stderr.decode().strip()[:200])
        continue
    b = r.stdout
    blob = subprocess.run(['git', '-C', REPO, 'rev-parse', PIN + ':' + APP + f], capture_output=True).stdout.decode().strip()
    with open(os.path.join(OUT, os.path.basename(f)), 'wb') as fh:
        fh.write(b)
    print(os.path.basename(f), len(b), 'B', b.count(b'\n'), 'lines', 'CRLF' if b'\r\n' in b else 'LF', 'blob', blob[:8])
