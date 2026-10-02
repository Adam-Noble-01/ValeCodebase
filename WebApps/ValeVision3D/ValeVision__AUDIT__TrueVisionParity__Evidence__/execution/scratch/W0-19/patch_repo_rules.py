"""
W0-19 scratch: append the published-documents and statement rules to the ValeCodebase .gitignore (under W0-18's
"ValeVision3D project content" section) and the statement eol rule to .gitattributes. Reads bytes, checks each file is
the version read before (sha1), keeps its LF line endings, saves pre-images, writes atomically.
Usage: python patch_repo_rules.py [--dry-run] [--out DIR]   (--out writes the results to DIR instead of the repository)
"""
import hashlib
import os
import sys

REPO     = r'D:\10_CoreLib__ValeCodebase'
HERE     = os.path.dirname(os.path.abspath(__file__))
PREIMAGE = os.path.join(HERE, 'preimage')
OUT      = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
DRY      = '--dry-run' in sys.argv

FILES = {
    '.gitignore': {
        'sha1': '7de61e295f618a5d22d8c0efb498de8eb3b34477',                      # <-- W0-18's version
        'ends_with': b'WebApps/ValeVision3D/50__ValeVision__UserConfig/*.tmp\n',
        'append': (
            "\n"
            "# PUBLISHED DOCUMENTS (WebApps/Whitecardopedia/Server__ValeVisionPublished__Api__.py).\n"
            "# A publish files each drawing's baked files into its project's\n"
            "# 06__Layout__PublishedDocuments/<document id>/: the manifest, sheet and element\n"
            "# JSON, SVG linework, WebP tiers, a print PNG and a PDF. Until Adam answers\n"
            "# K1 DR-29 only the JSON is committed. An ALLOWLIST, as for the statements\n"
            "# below: everything under the folder is excluded, its folders are re-included\n"
            "# so git can look inside them, and only *.json comes back. The zips in\n"
            "# 00__Archive__Revisions (every superseded revision, local only - TrueVision3D's\n"
            "# **/00__Archive/ rule misses the name) are never committed. If Adam answers\n"
            "# DR-29 \"commit rasters and PDFs\" (TrueVision3D commits every published file\n"
            "# but the archive), add the .json line's twin for each of .svg, .webp, .png\n"
            "# and .pdf, e.g.\n"
            "#     !WebApps/Whitecardopedia/Projects/**/06__Layout__PublishedDocuments/**/*.webp\n"
            "WebApps/Whitecardopedia/Projects/**/06__Layout__PublishedDocuments/**\n"
            "!WebApps/Whitecardopedia/Projects/**/06__Layout__PublishedDocuments/**/\n"
            "!WebApps/Whitecardopedia/Projects/**/06__Layout__PublishedDocuments/**/*.json\n"
            "WebApps/Whitecardopedia/Projects/**/00__Archive__Revisions/\n"
            "\n"
            "# STATEMENT DOCUMENTS (WebApps/Whitecardopedia/Server__ValeVisionStatements__Api__.py)\n"
            "# - the words are tracked, the pictures are not (TrueVision3D's own rule). A\n"
            "# statement folder under 10__StatementDocs holds its markdown, its generated\n"
            "# HTML and the photography it is built from. AN ALLOWLIST, not a list of\n"
            "# picture extensions: a statement folder collects whatever the job needed -\n"
            "# photographs, renders, a zip somebody dropped in - so NOTHING under\n"
            "# 10__StatementDocs is tracked except .md, .html and .json. The first line\n"
            "# excludes the folder; the second re-includes the directories, without which\n"
            "# git cannot look inside to find the rest. What a delete moved into\n"
            "# 00__Deleted__Quarantine stays out whole: a deleted statement is never\n"
            "# published again through the repository.\n"
            "WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**\n"
            "!WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/\n"
            "!WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.md\n"
            "!WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.html\n"
            "!WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.json\n"
            "WebApps/Whitecardopedia/Projects/**/10__StatementDocs/00__Deleted__Quarantine/\n"
        ),
    },
    '.gitattributes': {
        'sha1': 'ba3dfe345280bdcc5e817bb02cf49b8b8d8e1c4c',                      # <-- '* text=auto', as at HEAD 7b4e593a
        'ends_with': b'* text=auto\n',
        'append': (
            "\n"
            "# Statement documents keep LF in the working tree on every checkout (K1 DR-37\n"
            "# item 1). The Statement Writer's markdown tokeniser reads LF only: a statement\n"
            "# checked out with CRLF (core.autocrlf=true, as on this machine) would render\n"
            "# with no headings, rules or tables. A statement's markdown, its HTML and its\n"
            "# JSON are therefore text with eol=lf whatever the checkout's own setting.\n"
            "WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.md text eol=lf\n"
            "WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.html text eol=lf\n"
            "WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**/*.json text eol=lf\n"
        ),
    },
}

os.makedirs(PREIMAGE, exist_ok=True)
for name, spec in FILES.items():
    path = os.path.join(REPO, name)
    data = open(path, 'rb').read()
    sha1 = hashlib.sha1(data).hexdigest()
    if sha1 != spec['sha1']:
        print('STOP:', name, 'is', sha1[:8], 'not the version read before', spec['sha1'][:8], '- nothing written')
        sys.exit(2)
    assert b'\r\n' not in data, name + ' has CRLF line endings'
    assert data.endswith(spec['ends_with']), name + ' does not end where expected'
    result = data + spec['append'].encode('utf-8')
    assert b'\r' not in result
    if DRY:
        print('dry run', name, len(data), '->', len(result), 'bytes')
        continue
    if OUT:
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, name), 'wb') as handle:
            handle.write(result)
        print('wrote', os.path.join(OUT, name))
        continue
    with open(os.path.join(PREIMAGE, name), 'wb') as handle:
        handle.write(data)
    temp = path + '.w019.tmp'
    with open(temp, 'wb') as handle:
        handle.write(result)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)
    print('patched', name, 'sha1', sha1[:8], '->', hashlib.sha1(result).hexdigest()[:8], '(+%d lines)' % result[len(data):].count(b'\n'))
