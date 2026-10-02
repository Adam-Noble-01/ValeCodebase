"""git log -S at the TV pin: the commit that introduced each string W1-01 ports, with its date and subject."""
import subprocess
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/'
CASES = [
    ('Na__RenderLoop__IsPaused', '05__RenderPipeline/Na__RenderLoop__Invalidation.js'),
    ('Na__RenderLoop__PauseReasons', '05__RenderPipeline/Na__RenderLoop__Invalidation.js'),
    ('Na__InteractiveOverlays__BeginFrame', '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js'),
    ('Na__InteractiveOverlays__BeginFrame', '01__AppCore/Na__AppFlow__LoadingSequence.js'),
    ('Na__InteractiveOverlays__EndFrame();', '01__AppCore/Na__AppFlow__LoadingSequence.js'),
    ('Na__ModelToggle__BorrowRegistry', '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'),
    ('Na__ModelToggle__SetCategoryVisibleByKey', '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'),
    ('Na__ModelToggle__Generation', '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'),
    ('Na__PhaseLib__SetCacheLimit', '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js'),
]
for needle, rel in CASES:
    r = subprocess.run(['git', '-C', REPO, 'log', '--reverse', '-S', needle, '--format=%h %ad %s', '--date=format:%d-%b-%Y', PIN, '--', APP + rel],
                       capture_output=True)
    out = r.stdout.decode('utf-8', 'replace').strip().splitlines()
    print('%-45s %-75s' % (needle, rel))
    for line in out:
        print('      ', line)
# Last commit that touched each file at the pin
print()
for rel in sorted(set(r for _, r in CASES)):
    r = subprocess.run(['git', '-C', REPO, 'log', '-3', '--format=%h %ad %s', '--date=format:%d-%b-%Y', PIN, '--', APP + rel], capture_output=True)
    print('LAST', rel)
    for line in r.stdout.decode('utf-8', 'replace').strip().splitlines():
        print('      ', line)
