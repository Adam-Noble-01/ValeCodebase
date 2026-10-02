"""W0-03 scratch: save byte-exact pre-images of every file W0-03 edits or renames, with a SHA-1 manifest.

Usage: python save_preimages.py            (writes preimage/ + preimage_manifest.json, refuses to overwrite)
       python save_preimages.py --verify   (checks the live files still match the manifest; exit 1 on drift)
"""
import hashlib, json, os, shutil, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
MANIFEST = os.path.join(HERE, 'preimage_manifest.json')

FILES = [
    '02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js',
    '02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js',
    '02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js',
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js',
    '02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js',
    'index.html',
]
# The two new names must not exist before the rename.
NEW_NAMES = [
    '02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
]


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def eol(b):
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    return 'CRLF' if crlf and not lf else ('LF' if lf and not crlf else ('mixed' if crlf and lf else 'none'))


def main():
    if '--verify' in sys.argv:
        man = json.load(open(MANIFEST, encoding='utf-8'))
        bad = 0
        for rel, rec in man['files'].items():
            p = os.path.join(VV, rel)
            if not os.path.exists(p):
                print('MISSING', rel); bad += 1; continue
            h = sha1(open(p, 'rb').read())
            if h != rec['sha1']:
                print('CHANGED', rel, rec['sha1'][:12], '->', h[:12]); bad += 1
        print('verify:', 'OK' if not bad else '%d drifted' % bad)
        sys.exit(1 if bad else 0)
    if os.path.exists(MANIFEST):
        print('manifest exists - refusing to overwrite pre-images'); sys.exit(1)
    for n in NEW_NAMES:
        if os.path.exists(os.path.join(VV, n)):
            print('NEW NAME ALREADY EXISTS', n); sys.exit(1)
    man = {'vv_root': VV, 'files': {}}
    for rel in FILES:
        src = os.path.join(VV, rel)
        b = open(src, 'rb').read()
        dst = os.path.join(PRE, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(b)
        man['files'][rel] = {'sha1': sha1(b), 'bytes': len(b), 'eol': eol(b), 'bom': b.startswith(b'\xef\xbb\xbf')}
        print('%s %-5s %7d %s' % (sha1(b)[:12], eol(b), len(b), rel))
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(man, fh, indent=1)
    print('saved', len(FILES), 'pre-images')


if __name__ == '__main__':
    main()
