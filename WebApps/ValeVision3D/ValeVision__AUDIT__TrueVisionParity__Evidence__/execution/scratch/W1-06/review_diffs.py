# W1-06 scratch: print what each candidate changes - against TrueVision at the pin for the whole-file ports,
# against ValeVision's live file for the hunk replays. Line endings normalised for the comparison only.
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
CAND = os.path.join(HERE, 'candidates')
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

AGAINST_TV = [
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs',
]
AGAINST_VV = [
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
]


def read(path):
    with open(path, 'rb') as fh:
        return fh.read().decode('utf-8').replace('\r\n', '\n').split('\n')


def show(a_path, b_path, a_name, b_name, rel):
    a = read(a_path)
    b = read(b_path)
    diff = list(difflib.unified_diff(a, b, a_name, b_name, lineterm='', n=0))
    added = sum(1 for d in diff if d.startswith('+') and not d.startswith('+++'))
    removed = sum(1 for d in diff if d.startswith('-') and not d.startswith('---'))
    print('=' * 110)
    print('%s   (+%d / -%d)' % (rel, added, removed))
    for line in diff:
        print(line)


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    only = sys.argv[2:] or None
    if which in ('tv', 'all'):
        for rel in AGAINST_TV:
            if only and not any(o in rel for o in only):
                continue
            show(os.path.join(TV, rel), os.path.join(CAND, rel), 'TV@b2aa9151', 'candidate', rel)
    if which in ('vv', 'all'):
        for rel in AGAINST_VV:
            if only and not any(o in rel for o in only):
                continue
            show(os.path.join(VV, rel), os.path.join(CAND, rel), 'VV live', 'candidate', rel)


if __name__ == '__main__':
    main()
