"""W0-16 scratch: read-only GETs against Adam's running Flask server (WCP server.py, port 8000) for the
files this package copied and the legacy 35 copies it left in place. Compares each body with the file on
disk. Never posts, never writes. Usage: python flask_gets.py
"""
import hashlib, json, os, sys, urllib.request, urllib.error

BASE = 'http://localhost:8000'
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PATHS = [
    '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js',
    '04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js',
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js',
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js',
    '01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html',
    '02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js',
    '02__Src__AppModules/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png',
    '02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Config.json',
]


def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Cache-Control': 'no-cache'}), timeout=15) as r:
            return r.status, r.headers.get('Content-Type'), r.read()
    except urllib.error.HTTPError as e:
        return e.code, None, b''
    except Exception as e:  # noqa: BLE001
        return 'ERR ' + str(e), None, b''


rows, bad = [], 0
status, _, body = get(BASE + '/api/check-localhost')
rows.append({'url': '/api/check-localhost', 'status': status, 'body': body[:80].decode('utf-8', 'replace')})
print('/api/check-localhost', status, body[:80])
for rel in PATHS:
    status, ctype, body = get(BASE + '/ValeVision3D/' + rel)
    disk = open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read()
    same = body == disk
    bad += (status != 200) or not same
    rows.append({'url': '/ValeVision3D/' + rel, 'status': status, 'content_type': ctype, 'bytes': len(body), 'equals_disk': same})
    print('%s  %-12s %8d bytes  equals disk: %s  %s' % (status, (ctype or '')[:24], len(body), same, rel))
cfg = json.loads(get(BASE + '/ValeVision3D/' + PATHS[5])[2].decode('utf-8'))
served = {'JsPdfScriptPath': cfg['LayoutEditor__Pdf__Config']['LayoutEditor__Pdf__JsPdfScriptPath'],
          'ClassicScanAssets': cfg['LayoutEditor__TitleBlock__Config']['LayoutEditor__TitleBlock__ClassicScanAssets']}
print('served config:', json.dumps(served))
json.dump({'rows': rows, 'served_config': served}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flask_gets.json'), 'w'), indent=2)
sys.exit(1 if bad else 0)
