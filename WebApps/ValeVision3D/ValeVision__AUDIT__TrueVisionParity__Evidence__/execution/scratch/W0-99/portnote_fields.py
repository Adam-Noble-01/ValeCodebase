"""W0-99 - read-only: PORT NOTE fields (Ported from / Authored in / Twin / Source version / Parity) and the newest
DEVELOPMENT LOG version of the named VV files, as they stand now."""
import os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FILES = [
    '01__AppCore/Na__AppFlow__LoadingSequence.js',
    '03__AppUtils/Na__AppUtils__ProjectLoader.js',
    '03__AppUtils/Na__AppUtils__R2AssetUpload__.js',
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js',
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
    '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js',
    '44__System__PlanDimensions/Na__PlanDimensions__Styles__.css',
    '50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js',
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js',
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
    '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js',
    '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js',
    '51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js',
    '51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js',
    '51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css',
    '05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js',
    '10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js',
    '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js',
    '40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js',
    '05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js',
]
KEYS = ('Ported from', 'Authored in', 'Twin', 'Source version', 'Parity', 'Back-port')
for rel in FILES:
    p = os.path.join(VV, '02__Src__AppModules', *rel.split('/'))
    t = open(p, encoding='utf-8', errors='replace').read()
    print('=== ' + rel)
    for k in KEYS:
        m = re.search(r'^\s*(?://|\*|#)\s*-\s*' + re.escape(k) + r'\s*:\s*(.*)$', t, re.M)
        if m:
            print('   %-14s %s' % (k, m.group(1).strip()[:190]))
    vers = re.findall(r'^\s*(?://|\*|#)\s*(\d\d-[A-Z][a-z]{2}-\d{4})\s*-\s*Version\s+(\d+\.\d+\.\d+)', t, re.M)
    if vers:
        print('   log: first %s %s | versions %s' % (vers[0][0], vers[0][1], ', '.join(v for _, v in vers[:6])))
