# W4-01 | Build ValeVision3D's published-schema example folder from TrueVision's AA00 example (read at b2aa9151)
#
# Schema data only: the 06__Layout__PublishedDocuments folder. Every key, file name, folder name, tier and
# number is TrueVision's; only identity VALUES change (policy 9, DR-11, DR-12, DR-23, DR-43):
#   - document ids follow ValeVision's DR-11 default {project}_{drawing}: AA00_T02_D02 -> 0000_D02, no phase
#   - the project is the dummy Vale project 2026/0000__ExampleProjectStructure (folderId form)
#   - no Noble Architecture address, wordmark or resolver; links take ValeVision's DR-23 (a) form
#   - TrueVision3D as the publishing app -> ValeVision3D; app versions -> the W4 release (v2.71.6, provisional)
#   - the statement share entry is dropped (DR-23 (a): statements omitted; the Statement Writer is off, DR-10)
# Binary files (webp, png) are copied byte for byte. The archive zip is rebuilt with the same entries,
# dates and compression, its text entries transformed the same way.
#
# Usage: python build_fixture.py <TV example 06 folder> <output 06 folder>

import io, os, re, sys, zipfile, shutil

SRC, DST = sys.argv[1], sys.argv[2]

VV_REF      = 'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/TestEnv__ExampleProjects/2026/0000__ExampleProjectStructure/06__Layout__PublishedDocuments'
VV_FOLDERID = '2026/0000__ExampleProjectStructure'
VV_BASE     = 'https://app.valegardenhouses.com/ValeVision/'
VV_TOKEN    = '2026%2F0000__ExampleProjectStructure'
VV_REL      = 'v2.71.6'
VV_README   = 'WebApps/ValeVision3D/02__Src__AppModules/53__Data__Layout__PublishedSchema/README__PublishedSchema__.md'

# Ordered: most specific first. Each must hit at least once somewhere (checked at the end).
GLOBAL = [
    ('na-project-portal/26-Projects/AA00__ExampleProjectStructure/30__TrueVision__AppContent/06__Layout__PublishedDocuments', VV_REF),
    ('"26-Projects/AA00__ExampleProjectStructure"', '"' + VV_FOLDERID + '"'),
    ('"30__TrueVision__AppContent/06__Layout__PublishedDocuments"', '"06__Layout__PublishedDocuments"'),
    ('stays inside 30__TrueVision__AppContent', 'stays inside the project folder'),
    ('https://www.noble-architecture.com/s/?AA00&open=', VV_BASE + '?project=' + VV_TOKEN + '&open='),
    ('"Resolver__BaseUrl"      : "https://www.noble-architecture.com/s/"', '"Resolver__BaseUrl"      : "' + VV_BASE + '"'),
    ('"Resolver__QueryPattern" : "?{projectCode}&open={documentKey}"', '"Resolver__QueryPattern" : "?project={projectCode}&open={documentKey}"'),
    ('"Resolver__Note"         : "What the addresses above were built against. s/index.html at the website root looks the project code up in q/index.json and opens the project with the key handed through; that page must never move, and must go on answering every form listed in a record like this one."',
     '"Resolver__Note"         : "What the addresses above were built against. ValeVision3D has no resolver page (DR-23 (a)): the address is the app itself, {projectCode} is filled with the project\'s folderId (never the bare code, which several Vale schemes share) and the app opens the project and hands the key through. The app address must go on answering every form listed in a record like this one."'),
    ('"Qr__TargetUrl" : "https://www.noble-architecture.com/q/a7k2m9"', '"Qr__TargetUrl" : "' + VV_BASE + '?project=' + VV_TOKEN + '"'),
    ('"Qr__Note"      : "The reader draws the QR block itself from this - the code is six characters and the module grid is cheap. Nothing is baked as an image, and the root q/ folder is never moved."',
     '"Qr__Note"      : "The reader draws the QR block itself from this - the code is six characters and the module grid is cheap. Nothing is baked as an image. ValeVision3D ships the Project QR switched off (DR-12 (A)) and has no resolver: this dummy block only keeps the schema\'s QR shape exercised, and its module pattern encodes nothing."'),
    ('TrueVision3D Layout Editor v2.142.0', 'ValeVision3D Layout Editor ' + VV_REL),
    ('TrueVision3D Layout Editor', 'ValeVision3D Layout Editor'),
    ('"Publish__ByAppVersion"     : "v2.142.0"', '"Publish__ByAppVersion"     : "' + VV_REL + '"'),
    ('"Publish__ReaderMinVersion" : "v2.142.0"', '"Publish__ReaderMinVersion" : "' + VV_REL + '"'),
    ('"Publish__ByAppVersion"  : "v2.166.0"', '"Publish__ByAppVersion"  : "' + VV_REL + '"'),
    ('NOBLE ARCHITECTURE', 'VALE GARDEN HOUSES'),
    ('"Document__IdNote"        : "The document id is composed from project code, phase and number and is never stored on the sheet. It is the folder name here because a renumber or a phase change must make a NEW folder - see TrueVision__NOTES__DrawingNumberingSchema__.md."',
     '"Document__IdNote"        : "The document id is composed from project code and number - ValeVision3D\'s {project}_{drawing} until Vale\'s phases are supplied (DR-11), when the phase joins it - and is never stored on the sheet. It is the folder name here because a renumber or a phase change must make a NEW folder."'),
    ('"Meta__ExampleNote" : "DUMMY DATA. This is the AA00 example project, hand-written to show the shape. No app wrote it."',
     '"Meta__ExampleNote" : "DUMMY DATA. This is ValeVision3D\'s example project (2026/0000__ExampleProjectStructure), seeded from TrueVision3D\'s example project (read at b2aa9151) with Vale identity values, hand-written to show the shape. No app wrote it. Provisional: replaced by a real ValeVision publish of 2026/3047__Doous once publishing works."'),
    ('"Meta__ExampleNote": "WORKED EXAMPLE, hand-made like everything in this folder. A real record has no ExampleNote. The statement entry is illustrative: AA00 has no statements folder."',
     '"Meta__ExampleNote": "WORKED EXAMPLE, hand-made like everything in this folder. A real record has no ExampleNote. ValeVision3D lists no statements (DR-23 (a); the Statement Writer is switched off, DR-10)."'),
    ('"Publish__DocumentCount" : 8', '"Publish__DocumentCount" : 7'),
    ('AA00_T02_', '0000_'),
    ('AA00', '0000'),
]
# Phase values (DR-11 default: no phase until Vale supplies its stage list)
PHASE = re.compile(r'("(?:Document__Phase|Fields__Phase)"\s*:\s*)"T02"|("Fields__PhaseName"\s*:\s*)"Planning Approval"')

def _phase(m):
    return (m.group(1) or m.group(2)) + 'null'

# ReadMe: identity and location passages, applied AFTER the global pass (each must hit exactly once)
CALLOUT = ('\n\n> **ValeVision3D copy.** Seeded on 02-Oct-2026 (parity package W4-01) from TrueVision3D\'s AA00\n'
           '> example (read at b2aa9151): schema data only. Every key, file name, folder name, tier and number is\n'
           '> TrueVision\'s; the identity values are Vale\'s - document ids `{project}_{drawing}` (`0000_D02`, DR-11),\n'
           '> the dummy project `2026/0000__ExampleProjectStructure`, share links in ValeVision\'s own form (DR-23),\n'
           '> the Vale wordmark, no statement entry. Where the text below describes R2, the sync or the publish order,\n'
           '> it describes TrueVision\'s publish: ValeVision\'s published documents move to its own Flask service on the\n'
           '> VPS (TODO(OVH-MIGRATION)). Provisional: replaced by a real ValeVision publish of `2026/3047__Doous` once\n'
           '> publishing works.')
URL_LINE = VV_BASE + '?project=' + VV_TOKEN + '&open=Sheet_001'
def _cols(*pairs):
    line = ''
    for col, text in pairs:
        line = line.ljust(col) + text
    return line
_a, _b, _c = URL_LINE.index('app.'), URL_LINE.index('2026'), URL_LINE.index('Sheet_001')
URL_BLOCK = '\n'.join([URL_LINE,
                       _cols((_a, '|'), (_b, '|'), (_c, '|')),
                       _cols((_a, 'the app itself'), (_b, 'project folderId'), (_c, 'document key')),
                       _cols((_a, '(no resolver page)'), (_b, '(never the bare code)'), (_c, '(never changes)'))])
README = [
    ('**Written 23-Sep-2026. Adam Noble — Noble Architecture.**',
     '**Written 23-Sep-2026. Adam Noble — Noble Architecture.**' + CALLOUT),
    ('published drawing for every job. It is deliberately here, in the project portal, and not\nin the TrueVision app tree, because it is a *document* about documents.',
     'published drawing for every job. In ValeVision3D it lives in the app\'s test folder, beside the\ntest that walks it (`Na__Test__PublishedSchema__`), and not beside the code, because it is a\n*document* about documents.'),
    ('| Code | `na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/53__Data__Layout__PublishedSchema/README__PublishedSchema__.md` |',
     '| Code | `' + VV_README + '` |'),
    ('The plan that owns all of this is\n`na-apps/30__TrueVision__CoreAppCode/TrueVision__PLAN__PublishingSystem__.md`, section 1.5.',
     'The plan that owns all of this is TrueVision3D\'s `TrueVision__PLAN__PublishingSystem__.md`,\nsection 1.5; ValeVision3D follows it through the parity programme (DR-22).'),
    ('exactly as it does today, from `TrueVision__ProjectData__.json`.',
     'exactly as it does today, from the project\'s `project.json`.'),
    (URL_LINE + '\n            |                       |          |\n            s/index.html            project    document key\n            (never moves)           code       (never changes)',
     URL_BLOCK),
    ('- **The link carries no folder, no year and no app path.** `s/index.html` at the website root\n  looks the code up in `q/index.json` (the QR resolver\'s index) and opens the project with the\n  key handed through; the app opens that document\'s **read** view.',
     '- **The link is the app\'s own address.** ValeVision3D has no resolver page (DR-23 (a)): `project=`\n  carries the project\'s folderId, which the app already resolves - never the bare code, which\n  several Vale schemes share - and `open=` hands the key through; the app opens that document\'s\n  **read** view.'),
    ('The statement entry here is illustrative - 0000 has no statements folder.',
     'ValeVision3D lists no statement entry (DR-23 (a); the Statement Writer is switched off, DR-10).'),
    ('`0000_D02` — project code, phase, drawing number.',
     '`0000_D02` — project code and drawing number: ValeVision3D\'s `{project}_{drawing}` (DR-11) until\nVale\'s phases are supplied, when the phase joins it (before the first publish).'),
    ('(see `TrueVision__NOTES__DrawingNumberingSchema__.md`)',
     '(TrueVision3D\'s `TrueVision__NOTES__DrawingNumberingSchema__.md` sets the rule)'),
]

def readme_pass(text):
    for old, new in README:
        n = text.count(old)
        if n != 1:
            raise SystemExit('README replacement hit %d times: %r' % (n, old[:80]))
        text = text.replace(old, new)
    return text

hits = {old: 0 for old, _ in GLOBAL}

def transform(text):
    for old, new in GLOBAL:
        n = text.count(old)
        if n:
            hits[old] += n
            text = text.replace(old, new)
    text, n = PHASE.subn(_phase, text)
    hits['<phase>'] = hits.get('<phase>', 0) + n
    return text

# The statement share entry: one object in ShareLinks__Documents, removed whole (with its leading comma)
STATEMENT = re.compile(r',\r?\n\s*\{\r?\n\s*"Share__Key"\s*:\s*"Statement_1".*?"Share__RecordedIso"\s*:\s*"[^"]*"\r?\n\s*\}', re.S)

TEXT_EXT = {'.json', '.md', '.note', '.svg'}

def rename(rel):
    return rel.replace('AA00_T02_', '0000_')

if os.path.exists(DST):
    print('refusing: output exists', DST); sys.exit(2)

count = 0
for base, dirs, files in os.walk(SRC):
    for name in files:
        src = os.path.join(base, name)
        rel = os.path.relpath(src, SRC)
        dst = os.path.join(DST, rename(rel))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        ext = os.path.splitext(name)[1].lower()
        raw = open(src, 'rb').read()
        if ext in TEXT_EXT:
            text = transform(raw.decode('utf-8'))
            if name == 'PublishedDocuments__ShareLinks__.json':
                text, n = STATEMENT.subn('', text)
                hits['<statement entry>'] = n
            if name == 'PublishedDocuments__ReadMe__.md':
                text = readme_pass(text)
            open(dst, 'wb').write(text.encode('utf-8'))
        elif ext == '.zip':
            zin = zipfile.ZipFile(io.BytesIO(raw))
            buf = io.BytesIO()
            zout = zipfile.ZipFile(buf, 'w')
            for info in zin.infolist():
                data = zin.read(info.filename)
                if os.path.splitext(info.filename)[1].lower() in TEXT_EXT:
                    data = transform(data.decode('utf-8')).encode('utf-8')
                new = zipfile.ZipInfo(rename(info.filename), date_time=info.date_time)
                new.compress_type = info.compress_type
                new.external_attr = info.external_attr
                new.create_system = info.create_system
                zout.writestr(new, data)
            zout.close()
            open(dst, 'wb').write(buf.getvalue())
        else:
            shutil.copyfile(src, dst)
        count += 1

print(count, 'files written')
missing = [old for old, n in hits.items() if n == 0]
for old, n in hits.items():
    print('%4d  %s' % (n, old[:110]))
if missing:
    print('UNUSED REPLACEMENTS:', len(missing))
