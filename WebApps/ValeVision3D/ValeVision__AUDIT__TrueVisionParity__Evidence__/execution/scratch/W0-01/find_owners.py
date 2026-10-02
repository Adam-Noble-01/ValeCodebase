import json, re, io, sys

SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json'
d = json.load(open(SRC, encoding='utf-8'))

TERMS = sys.argv[1:] or ['ShowPublished', 'GetDocumentId', 'na-app-scene-ready', 'IMAGES_DIR',
                         'Link__QueryPattern', 'Sheet__FontFamily', 'PdfFonts', 'DocumentCodeFormat',
                         'viewer guard', 'CODE_PATTERN', 'SHEET_IMAGES_DIR', 'FontCdnBase',
                         'LayoutEditor__Style__FontFamily', 'GetDocumentCode', 'DocumentCode']
out = io.StringIO()
for t in TERMS:
    out.write('=' * 30 + ' ' + t + '\n')
    for p in d['packages']:
        hits = []
        for field in ('title', 'goal', 'vv_adaptations', 'acceptance', 'notes', 'vv_targets', 'hot_files'):
            v = p.get(field)
            vals = v if isinstance(v, list) else [v]
            for s in vals:
                if isinstance(s, str) and t in s:
                    i = s.find(t)
                    hits.append('%s: ...%s...' % (field, s[max(0, i - 160): i + 200].replace('\n', ' ')))
        if hits:
            out.write('-- %s (%s) %s\n' % (p['wp_id'], p['wave'], p['title']))
            for h in hits[:4]:
                out.write('     ' + h + '\n')
sys.stdout.buffer.write(out.getvalue().encode('utf-8'))
