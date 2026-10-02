# W4-05: (1) no NA runtime string in the five landed files' code (comment lines skipped);
#        (2) nothing outside 52__Feature__StatementWriter imports them (02__Src__AppModules + index.html).
import os, re, sys

VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
SRC  = VV + '02__Src__AppModules/'
FEAT = '51__System__LayoutEditor/52__Feature__StatementWriter/'
MINE = [
    '01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js',
    '01__Core__Data/Na__LayoutEditor__Statement__Images__.js',
    '04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Move__.js',
    '04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Typing__.js',
    '07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js',
]
NA = re.compile(r'Noble Architecture|TrueVision|noble-architecture|RB05|NaProjectPortal|/q/\?|\bT0[1-4]\b', re.I)

fail = 0
for rel in MINE:
    text = open(SRC + FEAT + rel, encoding='utf-8').read()
    for n, line in enumerate(text.split('\n'), 1):
        if line.lstrip().startswith('//'):
            continue
        code = re.sub(r'\s//\s.*$', '', line)                                   # trailing comments
        if NA.search(code):
            fail += 1
            print('NA string', rel, n, line.strip())
print('identity: %d hit(s) in code lines of %d files' % (fail, len(MINE)))

names = [os.path.basename(r) for r in MINE]
importers = []
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for f in files:
        if not f.endswith(('.js', '.mjs', '.html')):
            continue
        p = os.path.join(root, f).replace('\\', '/')
        if FEAT in p:
            continue
        t = open(p, encoding='utf-8', errors='replace').read()
        for nm in names:
            if nm in t:
                importers.append((p, nm))
idx = open(VV + 'index.html', encoding='utf-8', errors='replace').read()
for nm in names:
    if nm in idx:
        importers.append(('index.html', nm))
for p, nm in importers:
    print('outside reference', p, nm)
print('outside references: %d' % len(importers))
sys.exit(1 if (fail or importers) else 0)
