"""W0-16 scratch: pre-images of the six files this package edits, the vendor bytes read at the pin, and the
Vale Classic scan read from ValeVision's own legacy 35 folder. Read-only on both repositories; writes only
under this scratch folder (preimage/, new/, tv_at_pin/, fetch_report.json).

Usage: python fetch_and_preimage.py
"""
import hashlib, json, os, subprocess, sys

VCB      = r'D:\10_CoreLib__ValeCodebase'
VV       = os.path.join(VCB, 'WebApps', 'ValeVision3D')
NAWEB    = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN      = 'b2aa9151'
TVAPP    = 'na-apps/30__TrueVision__CoreAppCode/'
SCRATCH  = os.path.dirname(os.path.abspath(__file__))

EDITS = [
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__ImportMap__Index__.json',
    '04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md',
    '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
]

# (VV target, source kind, source path, expected git blob id, expected size)
NEW = [
    ('04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js', 'tv',
     TVAPP + '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js',
     '920b5c648833fab3e61d903d6cfe090fb8039ea0', 1201403),
    ('04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js', 'tv',
     TVAPP + '04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js',
     'aed6bfd70defa322824e5cba11b3ad5d6061ee28', 198689),
    ('04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js', 'tv',
     'na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/pdf.min.js',
     '1e2923bf6d1c63ec4885729a40d984c073fecc51', 377116),
    ('04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js', 'tv',
     'na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/pdf.worker.min.js',
     'bd223b5473a0e82636b321831310384eeb472d7c', 1133660),
    ('01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png', 'vv35',
     '02__Src__AppModules/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png',
     '3b2a67a0c61de5a1843719939d2515669d32af46', 244120),
]

# TrueVision files kept beside the evidence for the diffs (reference only, never copied into VV)
TV_REFERENCE = [
    '04__Lib__ThirdParty__VersionLocked/TrueVision__Dependencies__VersionLock__README__.md',
    '04__Lib__ThirdParty__VersionLocked/TrueVision__Dependencies__ImportMap__Index__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html',
    '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js',
]


def git_bytes(repo, rev_path):
    return subprocess.run(['git', '-C', repo, 'show', rev_path], check=True, capture_output=True).stdout


def blob_id(data):
    return hashlib.sha1(b'blob %d\0' % len(data) + data).hexdigest()


def eol(data):
    crlf = data.count(b'\r\n')
    return {'crlf': crlf, 'lf_only': data.count(b'\n') - crlf}


def main():
    report = {'pin': PIN, 'vv_head': subprocess.run(['git', '-C', VCB, 'rev-parse', 'HEAD'], check=True,
              capture_output=True, text=True).stdout.strip(), 'preimages': {}, 'new': {}, 'checks': []}

    def check(name, ok, detail=''):
        report['checks'].append({'check': name, 'ok': bool(ok), 'detail': detail})
        print(('PASS  ' if ok else 'FAIL  ') + name + (('  ' + detail) if detail else ''))
        return ok

    # PRE-IMAGES of the six files this package edits
    os.makedirs(os.path.join(SCRATCH, 'preimage'), exist_ok=True)
    for rel in EDITS:
        data = open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read()
        open(os.path.join(SCRATCH, 'preimage', os.path.basename(rel)), 'wb').write(data)
        report['preimages'][rel] = {'sha1': hashlib.sha1(data).hexdigest(), 'size': len(data), 'eol': eol(data)}

    # THE NEW FILES must not exist yet
    for target, *_ in NEW:
        check('target absent before the copy: ' + target, not os.path.exists(os.path.join(VV, target.replace('/', os.sep))))

    # SOURCE BYTES
    os.makedirs(os.path.join(SCRATCH, 'new'), exist_ok=True)
    for target, kind, src, want_blob, want_size in NEW:
        if kind == 'tv':
            data = git_bytes(NAWEB, PIN + ':' + src)
            origin = 'git show %s:%s' % (PIN, src)
        else:
            data = open(os.path.join(VV, src.replace('/', os.sep)), 'rb').read()
            head = git_bytes(VCB, 'HEAD:WebApps/ValeVision3D/' + src)
            check('Vale scan: working-tree bytes equal the HEAD blob (%s)' % src, data == head)
            origin = 'ValeVision3D working tree ' + src + ' (= HEAD blob)'
        check('blob id of %s = %s' % (target, want_blob[:8]), blob_id(data) == want_blob, blob_id(data))
        check('size of %s = %d' % (target, want_size), len(data) == want_size, str(len(data)))
        out = os.path.join(SCRATCH, 'new', target.replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(data)
        report['new'][target] = {'origin': origin, 'git_blob': blob_id(data), 'sha1': hashlib.sha1(data).hexdigest(),
                                 'md5': hashlib.md5(data).hexdigest(), 'size': len(data), 'eol': eol(data)}

    # jsPDF: TrueVision's blob is ValeVision's own 35 copy at HEAD (either can be the source)
    tv_js = git_bytes(NAWEB, PIN + ':' + NEW[0][2])
    vv_js = git_bytes(VCB, 'HEAD:WebApps/ValeVision3D/02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js')
    check("jsPDF: TrueVision's 05 blob == ValeVision's 35 blob at HEAD", tv_js == vv_js, blob_id(vv_js))
    live35 = open(os.path.join(VV, '02__Src__AppModules', '35__System__PageLayoutSystem', '01__Dependencies__VersionLocked', 'jspdf.umd.js'), 'rb').read()
    check('jsPDF: the 35 working copy equals the blob after CRLF->LF (mixed EOL in the working tree only)',
          live35.replace(b'\r\n', b'\n') == tv_js, 'working copy %d bytes, %s' % (len(live35), eol(live35)))

    # The Classic scan: Vale's (md5 59777a65), never TrueVision's (md5 7614f27e) - TV's is hashed in memory only
    vale = open(os.path.join(SCRATCH, 'new', NEW[4][0].replace('/', os.sep)), 'rb').read()
    tv_scan = git_bytes(NAWEB, PIN + ':' + TVAPP + '01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png')
    check("Classic scan copied is Vale's: md5 starts 59777a65", hashlib.md5(vale).hexdigest().startswith('59777a65'), hashlib.md5(vale).hexdigest())
    check("TrueVision's NA scan differs (md5 starts 7614f27e) and is not the file copied",
          hashlib.md5(tv_scan).hexdigest().startswith('7614f27e') and tv_scan != vale, hashlib.md5(tv_scan).hexdigest())
    check('Vale scan is a PNG', vale[:8] == b'\x89PNG\r\n\x1a\n')
    w = int.from_bytes(vale[16:20], 'big'); h = int.from_bytes(vale[20:24], 'big')
    report['vale_scan_px'] = [w, h]
    print('      Vale scan %d x %d px' % (w, h))

    # Version strings inside the vendor builds
    js = tv_js.decode('utf-8', 'replace')
    check('jsPDF build says 4.1.0', 'jsPDF - PDF Document creation from JavaScript\n * Version 4.1.0' in js or 'Version 4.1.0' in js[:4000])
    h2c = open(os.path.join(SCRATCH, 'new', NEW[1][0].replace('/', os.sep)), 'rb').read().decode('utf-8', 'replace')
    check('html2canvas build says 1.4.1', 'html2canvas 1.4.1' in h2c[:2000], h2c[:120].replace('\n', ' '))
    for idx in (2, 3):
        txt = open(os.path.join(SCRATCH, 'new', NEW[idx][0].replace('/', os.sep)), 'rb').read().decode('utf-8', 'replace')
        check('PDF.js %s carries version 3.11.174' % os.path.basename(NEW[idx][0]), '"3.11.174"' in txt or "'3.11.174'" in txt)

    # Identity: no NA marker or TrueVision token inside the vendor builds
    markers = [b'NaProjectPortal', b'30__TrueVision__AppContent', b'/na-apps/', b'TrueVision', b'TRUEVISION', b'noble-architecture', b'Noble Architecture']
    for target, *_ in NEW[:4]:
        data = open(os.path.join(SCRATCH, 'new', target.replace('/', os.sep)), 'rb').read()
        hits = [m.decode() for m in markers if m in data]
        check('no NA marker or TrueVision token in ' + os.path.basename(target), not hits, ', '.join(hits))

    # Reference copies of TrueVision's files at the pin (diff inputs only)
    for rel in TV_REFERENCE:
        data = git_bytes(NAWEB, PIN + ':' + TVAPP + rel)
        out = os.path.join(SCRATCH, 'tv_at_pin', rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(data)
    lock = git_bytes(NAWEB, PIN + ':na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/DependencyLock__PlanVisionPdfRenderer__.json')
    open(os.path.join(SCRATCH, 'tv_at_pin', 'DependencyLock__PlanVisionPdfRenderer__.json'), 'wb').write(lock)
    report['pdfjs_lock'] = json.loads(lock.decode('utf-8'))['dependency-lock-metadata']

    json.dump(report, open(os.path.join(SCRATCH, 'fetch_report.json'), 'w', encoding='utf-8'), indent=2)
    failed = [c for c in report['checks'] if not c['ok']]
    print('\n%d checks, %d failed' % (len(report['checks']), len(failed)))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
