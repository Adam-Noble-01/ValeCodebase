"""
W0-18 scratch: append the ValeVision3D project-content block (K1 DR-29 default: JSON only; sheet-picture rasters never
committed) to D:/10_CoreLib__ValeCodebase/.gitignore. Reads bytes, keeps the file's own LF line endings, writes the
whole file once. Refuses to run if the file is not the pre-image read for this package (sha1 e6ccaab0...).
Usage: python patch_gitignore.py [--dry-run]
"""
import hashlib
import os
import sys

TARGET   = r'D:\10_CoreLib__ValeCodebase\.gitignore'
EXPECTED = 'e6ccaab0'
HERE     = os.path.dirname(os.path.abspath(__file__))

BLOCK = """
# -----------------------------------------------------------------------------
# ValeVision3D project content - only its JSON is committed (K1 DR-29 default)
# -----------------------------------------------------------------------------
# The Layout Editor's new content lives in each project's own folder under
# WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/, in TrueVision3D's folder
# names. Until Adam answers K1 DR-29, only its JSON is committed: rasters,
# PDFs and archives stay on this machine and on R2.
#
# SHEET PICTURES (WebApps/Whitecardopedia/Server__ValeVisionSheetImages__Api__.py).
# The save files each picture a drawing shows into
# 05__Layout__DrawingDocs__Images/<document id>/, named <name>__<first ten hex
# digits of its SHA-256>.webp (or .jpg / .png), and 00__Archive beside the
# document folders holds the pictures no drawing uses any more. NOTHING under
# the folder is committed: the stored pictures, the archive, a source picture
# copied in by hand, a temporary file a crash left. If Adam answers DR-29
# "commit pictures", this becomes TrueVision3D's allow-list of the stored
# names, the archive still excluded - three lines added under this one:
#     !**/05__Layout__DrawingDocs__Images/*/
#     **/05__Layout__DrawingDocs__Images/00__Archive/
#     !**/05__Layout__DrawingDocs__Images/*/*__<[0-9a-f] ten times>.webp (one line each for .webp, .jpg, .png)
**/05__Layout__DrawingDocs__Images/**

# THE SPELLING DICTIONARY (WebApps/ValeVision3D/50__ValeVision__UserConfig/,
# written by WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py):
# the dictionary is committed; a temporary file its atomic write leaves if the
# server is stopped mid-write (<file>.<random>.tmp) is not.
WebApps/ValeVision3D/50__ValeVision__UserConfig/*.tmp
"""

data = open(TARGET, 'rb').read()
sha1 = hashlib.sha1(data).hexdigest()
if not sha1.startswith(EXPECTED):
    print('STOP: .gitignore is', sha1, 'not the pre-image', EXPECTED)
    sys.exit(2)
assert b'\r' not in data, '.gitignore is not LF'
assert data.endswith(b'\n')
assert b'05__Layout__DrawingDocs__Images' not in data
out = data + BLOCK.encode('ascii')
assert b'\r' not in out
if '--dry-run' in sys.argv:
    sys.stdout.write(BLOCK)
    sys.exit(0)
if '--write-candidate' in sys.argv:
    candidate = sys.argv[sys.argv.index('--write-candidate') + 1]
    with open(candidate, 'wb') as handle:
        handle.write(out)
    print('candidate written to', candidate, len(out), 'bytes')
    sys.exit(0)
temp = TARGET + '.w018.tmp'
with open(temp, 'wb') as handle:
    handle.write(out)
os.replace(temp, TARGET)
print('.gitignore', len(data), '->', len(out), 'bytes; sha1', hashlib.sha1(out).hexdigest()[:8], '; lines', data.count(b'\n'), '->', out.count(b'\n'))
