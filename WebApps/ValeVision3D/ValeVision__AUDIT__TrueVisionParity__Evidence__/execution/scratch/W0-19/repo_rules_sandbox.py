"""
W0-19 scratch: prove the .gitignore and .gitattributes rules in a THROWAWAY git repository created under the OS temp
folder (outside both repositories; every git call is pinned to it and refused if its top level is anything else).
1. Ignore: every published file but JSON, the published archive, every statement picture or other file, the statement
   quarantine and temporary files are ignored; published JSON, statement .md/.html/.json, W0-18's rules and the project
   files behave as before. Run with core.ignorecase true (this machine) and false (a case-sensitive clone).
2. EOL after checkout: with core.autocrlf=true (the ValeCodebase setting), a statement's .md, .html and .json come out of
   `git checkout-index` with LF (`git ls-files --eol` w/lf, attr eol=lf), whatever line endings they went in with, while
   a markdown file outside a statement folder still checks out CRLF (the rule is scoped).
Usage: python repo_rules_sandbox.py <dir holding the .gitignore and .gitattributes to test>
"""
import os
import shutil
import subprocess
import sys
import tempfile

rules_dir = sys.argv[1]
repo = tempfile.mkdtemp(prefix='w019_rules_')
P = 'WebApps/Whitecardopedia/Projects/2026/3047__Doous/'
S = 'WebApps/Whitecardopedia/Projects/2025/FN-62104__Fenner Scheme-01/'

IGNORED = [
    P + '06__Layout__PublishedDocuments/3047_D01/03__Viewports__Raster/Viewport_001__Tier01__Fit__0123456789.webp',
    P + '06__Layout__PublishedDocuments/3047_D01/03__Viewports__Raster/Viewport_001__Print__0123456789.png',
    P + '06__Layout__PublishedDocuments/3047_D01/02__Viewports__Vector/Viewport_001__Linework__0123456789.svg',
    P + '06__Layout__PublishedDocuments/3047_D01/Document__Print__0123456789.pdf',
    P + '06__Layout__PublishedDocuments/3047_D01/Document__Manifest__.json.a1b2c3.tmp',
    P + '06__Layout__PublishedDocuments/02__Shared__Images/Image__f89e0e57c8.png',
    P + '06__Layout__PublishedDocuments/PublishedDocuments__ReadMe__.md',
    P + '06__Layout__PublishedDocuments/00__Archive__Revisions/3047_D01__Revision__A.zip',
    P + '06__Layout__PublishedDocuments/00__Archive__Revisions/3047_D01__Revision__A__20261001-120000.zip',
    P + '06__Layout__PublishedDocuments/00__Archive__Revisions/Archive__Index__.json',
    P + '06__Layout__PublishedDocuments/00__Archive__Revisions/Archive__ReadMe__.note',
    P + '10__StatementDocs/01__Design__Statement/02_Images__Content/Site__Photo__.png',
    P + '10__StatementDocs/01__Design__Statement/02_Images__Content/Site__Photo__02.jpg',
    P + '10__StatementDocs/01__Design__Statement/Render.JPEG',
    P + '10__StatementDocs/01__Design__Statement/Scan.tif',
    P + '10__StatementDocs/01__Design__Statement/Dataset.zip',
    P + '10__StatementDocs/01__Design__Statement/Notes.txt',
    P + '10__StatementDocs/01__Design__Statement/9999_S01__Doous__DesignStatement__.md.k2j3h4.tmp',
    P + '10__StatementDocs/00__Deleted__Quarantine/20261001-120000-000001/02__Old__Statement/3047_S02__Doous__Old__.md',
    P + '10__StatementDocs/00__Deleted__Quarantine/20261001-120000-000001/02__Old__Statement/Photo.png',
    S + '10__StatementDocs/01__Statement/Site.png',
    S + '06__Layout__PublishedDocuments/FN-62104_D01/Viewport__Tier01__0123456789.webp',
    P + '05__Layout__DrawingDocs__Images/3047_D01/FrontCgi__0123456789.webp',           # <-- W0-18's rule, unchanged
]
NOT_IGNORED = [
    P + '06__Layout__PublishedDocuments/3047_D01/Document__Manifest__.json',
    P + '06__Layout__PublishedDocuments/3047_D01/Document__Sheet__.json',
    P + '06__Layout__PublishedDocuments/3047_D01/01__Elements__Data/Elements__Text__.json',
    P + '06__Layout__PublishedDocuments/PublishedDocuments__Index__.json',
    P + '06__Layout__PublishedDocuments/PublishedDocuments__ShareLinks__.json',
    P + '10__StatementDocs/01__Design__Statement/9999_S01__Doous__DesignStatement__.md',
    P + '10__StatementDocs/01__Design__Statement/9999_S01__Doous__DesignStatement__.html',
    P + '10__StatementDocs/01__Design__Statement/Statement__Data__.json',
    P + '10__StatementDocs/01__Design__Statement/02_Images__Content/Captions.md',
    S + '10__StatementDocs/01__Statement/FN-62104_S01__Fenner__.md',
    S + '06__Layout__PublishedDocuments/FN-62104_D01/Document__Manifest__.json',
    P + 'project.json',
    P + 'ValeVision__DrawingNotes__.json',
    P + 'ValeVision__StatementDocs__.json',
    P + 'IMG01__FrontView__Thumbnail.png',
    P + 'PresentationMode/Thumbnails/Scene01.webp',
    P + 'LayoutEditor/Snapshots/0123456789abcdef.webp',
    'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/TestEnv__Fixtures/10__StatementDocs/01__Fixture/Figure.png',
    'WebApps/ValeVision3D/02__Src__AppModules/53__Data__Layout__PublishedSchema/Example/06__Layout__PublishedDocuments/X_D01/Viewport.webp',
    'README.md',
]
LF_FILES = {                                                       # <-- statement text files, LF and CRLF in; LF out
    P + '10__StatementDocs/01__Design__Statement/9999_S01__Doous__DesignStatement__.md': b'# Statement\r\n\r\n#### 1.1 | Site\r\n',
    P + '10__StatementDocs/01__Design__Statement/9999_S01__Doous__DesignStatement__.html': b'<html>\n<body>\n</body>\n</html>\n',
    P + '10__StatementDocs/01__Design__Statement/Statement__Data__.json': b'{\r\n    "a": 1\r\n}\r\n',
    S + '10__StatementDocs/01__Statement/FN-62104_S01__Fenner__.md': b'# Fenner\n\nLine two.\n',
}
CRLF_FILES = {                                                     # <-- outside a statement folder: the checkout's own setting
    'README.md': b'# Readme\nLine two.\n',
    P + '06__Layout__PublishedDocuments/3047_D01/Document__Sheet__.json': b'{\n    "Sheet": 1\n}\n',
}


def git(*args):
    return subprocess.run(['git', '-C', repo] + list(args), capture_output=True, text=True, encoding='utf-8')


failures = 0
def check(label, ok, extra=''):
    global failures
    print(('PASS ' if ok else 'FAIL ') + label + ((' :: ' + str(extra)) if (extra and not ok) else ''))
    failures += 0 if ok else 1


try:
    git('init', '-q')
    top = git('rev-parse', '--show-toplevel').stdout.strip()
    assert os.path.normcase(os.path.realpath(top)) == os.path.normcase(os.path.realpath(repo)), ('NOT THE SANDBOX', top)
    shutil.copyfile(os.path.join(rules_dir, '.gitignore'), os.path.join(repo, '.gitignore'))
    shutil.copyfile(os.path.join(rules_dir, '.gitattributes'), os.path.join(repo, '.gitattributes'))
    for rel in IGNORED + NOT_IGNORED:
        path = os.path.join(repo, *rel.split('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as handle:
            handle.write(LF_FILES.get(rel) or CRLF_FILES.get(rel) or b'x')

    # 1. IGNORE RULES
    for ignorecase in ('true', 'false'):
        git('config', 'core.ignorecase', ignorecase)
        result = git('check-ignore', '--no-index', '-v', '-n', *(IGNORED + NOT_IGNORED))
        verdict = {}
        for line in result.stdout.splitlines():
            source, _, path = line.partition('\t')
            pattern = source.split(':', 2)[2] if source.count(':') >= 2 else ''
            verdict[path.strip('"')] = bool(pattern) and not pattern.startswith('!')     # <-- A '!' re-include as the last match means NOT ignored
        missed = [rel for rel in IGNORED if not verdict.get(rel)]
        wrong  = [rel for rel in NOT_IGNORED if verdict.get(rel)]
        check(f'core.ignorecase={ignorecase}: every published file but JSON, the archive, every statement picture or other file, the quarantine and temporary files are ignored', not missed, missed)
        check(f'core.ignorecase={ignorecase}: published JSON, statement .md/.html/.json, project files and anything outside the Projects folder are not', not wrong, wrong)
        status = git('status', '--porcelain', '--untracked-files=all')
        listed = sorted(line[3:].strip('"') for line in status.stdout.splitlines())
        expected = sorted(['.gitattributes', '.gitignore'] + NOT_IGNORED)
        check(f'core.ignorecase={ignorecase}: git status lists exactly the files that are not ignored', listed == expected, sorted(set(listed) ^ set(expected)))
    git('config', 'core.ignorecase', 'true')
    png = IGNORED[11]
    md = NOT_IGNORED[5]
    rule_png = git('check-ignore', '--no-index', '-v', png).stdout.strip()
    rule_md = git('check-ignore', '--no-index', '-v', '-n', md).stdout.strip()
    print('a statement .png ->', rule_png.split('\t')[0])
    print('a statement .md  ->', rule_md.split('\t')[0])

    # 2. EOL AFTER CHECKOUT (core.autocrlf=true, as the ValeCodebase is set)
    git('config', 'core.autocrlf', 'true')
    git('config', 'core.safecrlf', 'false')
    added = git('add', '--', *(list(LF_FILES) + list(CRLF_FILES)))
    check('the statement and control files are staged in the sandbox', added.returncode == 0, added.stderr)
    for rel in list(LF_FILES) + list(CRLF_FILES):
        os.remove(os.path.join(repo, *rel.split('/')))
    out = git('checkout-index', '-f', '--', *(list(LF_FILES) + list(CRLF_FILES)))
    check('git checkout-index writes them back from the index', out.returncode == 0, out.stderr)
    eol = {}
    for line in git('ls-files', '--eol', '--', *(list(LF_FILES) + list(CRLF_FILES))).stdout.splitlines():
        info, _, path = line.partition('\t')
        eol[path.strip('"')] = info.split()
    for rel in LF_FILES:
        data = open(os.path.join(repo, *rel.split('/')), 'rb').read()
        check('after checkout ' + rel.rsplit('/', 1)[-1] + ' is LF: ' + ' '.join(eol.get(rel, [])), eol.get(rel, [''])[:2] == ['i/lf', 'w/lf'] and 'eol=lf' in ' '.join(eol.get(rel, [])) and b'\r\n' not in data, eol.get(rel))
    for rel in CRLF_FILES:
        data = open(os.path.join(repo, *rel.split('/')), 'rb').read()
        check('outside a statement folder ' + rel.rsplit('/', 1)[-1] + ' follows the checkout (CRLF): ' + ' '.join(eol.get(rel, [])), eol.get(rel, ['', ''])[1] == 'w/crlf' and b'\r\n' in data, eol.get(rel))
finally:
    def _writable_then_retry(function, path, _info):
        os.chmod(path, 0o666)                                        # <-- git marks its object files read-only; Windows will not delete those
        function(path)
    shutil.rmtree(repo, onerror=_writable_then_retry)
print('FAILURES:', failures)
sys.exit(1 if failures else 0)
