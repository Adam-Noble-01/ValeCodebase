"""Who edits each of this package's files, per hot_file_ownership.json and wp_canonical.json."""
import json

BASE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data'
hot = json.load(open(BASE + r'\hot_file_ownership.json', encoding='utf-8'))['files']
wps = json.load(open(BASE + r'\wp_canonical.json', encoding='utf-8'))
packages = wps['packages'] if isinstance(wps, dict) and 'packages' in wps else wps
if isinstance(packages, dict):
    packages = list(packages.values())

needles = ['Styles__Fonts__.css', 'PdfFonts__.js', 'SpecPdf__.js', 'SpecDocument__.js', 'PdfExporter__.js',
           'LayoutEditor__AppConfig__.json', 'ConfigState__SheetSetup__.js', 'Na__Test__SpecificationPdf__.html',
           'Na__Test__AppConfigParity__']
for needle in needles:
    print('==', needle)
    for entry in hot:
        if entry['file'].endswith(needle) or needle in entry['file']:
            print('   hot:', entry['file'], '->', entry.get('rule'))
    editors = []
    for p in packages:
        if not isinstance(p, dict):
            continue
        blob = json.dumps(p.get('edits', [])) + json.dumps(p.get('vv_targets', []))
        if needle in blob:
            editors.append(p.get('wp_id'))
    print('   packages listing it:', editors)
