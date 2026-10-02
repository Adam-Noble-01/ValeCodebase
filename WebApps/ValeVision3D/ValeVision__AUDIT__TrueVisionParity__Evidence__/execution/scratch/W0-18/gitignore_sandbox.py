"""
W0-18 scratch: prove the .gitignore block in a throwaway git repository (outside both repos): every raster under
*/05__Layout__DrawingDocs__Images/ (its 00__Archive included) is ignored and git status shows none of them, while the
project's JSON, its own pictures, its other folders and the spelling dictionary are not ignored. Runs with
core.ignorecase true (this machine) and false (a case-sensitive clone).
Usage: python gitignore_sandbox.py <sandbox parent dir> [<.gitignore to test, default: the live one>]
"""
import os
import shutil
import subprocess
import sys
import tempfile

parent = sys.argv[1]
gitignore = sys.argv[2] if len(sys.argv) > 2 else r'D:\10_CoreLib__ValeCodebase\.gitignore'
os.makedirs(parent, exist_ok=True)
repo = tempfile.mkdtemp(prefix='w018_gitignore_', dir=parent)

IGNORED = [
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.jpg',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.png',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/Source Render.jpeg',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/SOURCE.PNG',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/Scan.tif',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/Sketch.gif',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/Board.pdf',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.webp.k2j3h4.tmp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.webp.k2j3h4.copying',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/Loose__0123456789.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/00__Archive/3047_D01/FrontCgi__0123456789.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/00__Archive/3047_D01/FrontCgi__0123456789__02.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/00__Archive/3047_D02/RearCgi__abcdef0123.png',
    'WebApps/Whitecardopedia/Projects/2025/FN-62104__Fenner Scheme-01/05__Layout__DrawingDocs__Images/FN-62104_D01/Site__0123456789.jpg',
    'WebApps/Whitecardopedia/Projects/2025/FN-62104__Fenner Scheme-01/05__Layout__DrawingDocs__Images/00__Archive/FN-62104_D01/Site__0123456789.jpg',
    'WebApps/ValeVision3D/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json.a1b2c3.tmp',
]
NOT_IGNORED = [
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/ValeVision__DrawingNotes__.json',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/IMG01__FrontView__Thumbnail.png',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/PresentationMode/Thumbnails/Scene01.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/LayoutEditor/Snapshots/0123456789abcdef.webp',
    'WebApps/Whitecardopedia/Projects/2026/3047__Doous/LayoutEditor/Linework/Plan01.json',
    'WebApps/ValeVision3D/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json',
    'WebApps/ValeVision3D/01__AppAssets__ValeVision/Logo.png',
]


def git(*args):
    return subprocess.run(['git', '-C', repo] + list(args), capture_output=True, text=True, encoding='utf-8')


failures = 0
def check(label, ok, extra=''):
    global failures
    print(('PASS ' if ok else 'FAIL ') + label + ((' :: ' + str(extra)) if (extra and not ok) else ''))
    failures += 0 if ok else 1


try:
    git('init', '-q')
    shutil.copyfile(gitignore, os.path.join(repo, '.gitignore'))
    for rel in IGNORED + NOT_IGNORED:
        path = os.path.join(repo, *rel.split('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as handle:
            handle.write(b'x')
    for ignorecase in ('true', 'false'):
        git('config', 'core.ignorecase', ignorecase)
        result = git('check-ignore', '--no-index', '-v', '-n', *(IGNORED + NOT_IGNORED))
        verdict = {}
        for line in result.stdout.splitlines():
            source, _, path = line.partition('\t')
            verdict[path] = not source.startswith('::')
        missed = [rel for rel in IGNORED if not verdict.get(rel)]
        wrong  = [rel for rel in NOT_IGNORED if verdict.get(rel)]
        check(f'core.ignorecase={ignorecase}: every file under */05__Layout__DrawingDocs__Images/ (00__Archive included) is ignored', not missed, missed)
        check(f'core.ignorecase={ignorecase}: the project JSON, its other pictures and folders and the dictionary are not', not wrong, wrong)
        status = git('status', '--porcelain', '--untracked-files=all')
        listed = [line[3:].strip('"') for line in status.stdout.splitlines()]
        images = [path for path in listed if '05__Layout__DrawingDocs__Images' in path or path.endswith('.tmp')]
        check(f'core.ignorecase={ignorecase}: git status shows nothing under the images folder and no .tmp', images == [], images)
        expected = sorted(['.gitignore'] + NOT_IGNORED)
        check(f'core.ignorecase={ignorecase}: git status shows exactly the files that are not ignored', sorted(listed) == expected, sorted(set(listed) ^ set(expected)))
    rules = git('check-ignore', '--no-index', '-v', IGNORED[0]).stdout.strip()
    print('matching rule:', rules)
finally:
    shutil.rmtree(repo, ignore_errors=True)
print('FAILURES:', failures)
sys.exit(1 if failures else 0)
