"""Unified diffs of the W1-01 candidates: whole-file ports against TrueVision at the pin, hunk files against the pre-image.
Writes w1_01_changes.diff in scratch and prints it (or one file's diff with an argument: iovl|phas|invl|togl|lseq)."""
import difflib, os, subprocess, sys
SCR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-01'
CAND = os.path.join(SCR, 'candidate')
PRE = os.path.join(SCR, 'preimage')
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/'

def tv(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:' + TVAPP + rel], capture_output=True).stdout.decode('utf-8')

def lines(text):
    return text.replace('\r\n', '\n').split('\n')

PAIRS = {
    'iovl': ('TV b2aa9151 05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js', lambda: tv('05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js'), 'Na__RenderLoop__InteractiveOverlays__.js'),
    'phas': ('TV b2aa9151 26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js', lambda: tv('26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js'), 'Na__ModelGroup__PhaseLibrary__.js'),
    'invl': ('VV pre-image Na__RenderLoop__Invalidation.js', lambda: open(os.path.join(PRE, 'Na__RenderLoop__Invalidation.js.bak'), 'rb').read().decode('utf-8'), 'Na__RenderLoop__Invalidation.js'),
    'togl': ('VV pre-image Na__UiFeature__ModelToggle__Controls.js', lambda: open(os.path.join(PRE, 'Na__UiFeature__ModelToggle__Controls.js.bak'), 'rb').read().decode('utf-8'), 'Na__UiFeature__ModelToggle__Controls.js'),
    'lseq': ('VV pre-image Na__AppFlow__LoadingSequence.js', lambda: open(os.path.join(PRE, 'Na__AppFlow__LoadingSequence.js.bak'), 'rb').read().decode('utf-8'), 'Na__AppFlow__LoadingSequence.js'),
}
want = sys.argv[1:] or list(PAIRS)
out = []
for key in want:
    label, old, name = PAIRS[key]
    new = open(os.path.join(CAND, name), 'rb').read().decode('utf-8')
    d = list(difflib.unified_diff(lines(old()), lines(new), label, 'candidate ' + name, n=2, lineterm=''))
    added = sum(1 for l in d if l.startswith('+') and not l.startswith('+++'))
    removed = sum(1 for l in d if l.startswith('-') and not l.startswith('---'))
    out.append('#### %s: +%d / -%d' % (name, added, removed))
    out.extend(d)
text = '\n'.join(out) + '\n'
if not sys.argv[1:]:
    open(os.path.join(SCR, 'w1_01_changes.diff'), 'w', encoding='utf-8').write(text)
sys.stdout.reconfigure(encoding='utf-8')
print(text)
