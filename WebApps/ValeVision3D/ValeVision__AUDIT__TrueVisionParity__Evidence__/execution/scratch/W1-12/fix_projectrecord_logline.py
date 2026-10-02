# =============================================================================
# W1-12 SCRATCH - FIX ONE WRAPPED PORT NOTE LINE IN THE LANDED ProjectRecord
# =============================================================================
#
# A wrapped Divergences line began "DEVELOPMENT LOG is ValeVision's own ...", which
# Na__Verify__PortNotes__ reads as a second DEVELOPMENT LOG heading: the PORT NOTE
# block ended there and the watermark read an empty log. The wording changes; the
# file keeps its CRLF line ending. The scratch source and candidate are updated to
# match, so apply_w1_12.py --restore still recognises the landed file.
#
# =============================================================================

import hashlib
import os
import sys

HERE      = os.path.dirname(os.path.abspath(__file__))
LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__ProjectRecord__.js'
SOURCE    = os.path.join(HERE, 'source_lf__Na__LayoutEditor__ProjectRecord__.js')
CANDIDATE = os.path.join(HERE, 'candidate__Na__LayoutEditor__ProjectRecord__.js')
LANDED    = '2ab0ef7baa56cff366334fad7fa031908d4a68a2'

OLD = ("//   - MODULE, PURPOSE and DESCRIPTION describe this body; TrueVision's describe its admin system. The\n"
       "//     DEVELOPMENT LOG is ValeVision's own (TrueVision's 1.1.0 entry is the fallback not taken).\n")
NEW = ("//   - MODULE, PURPOSE and DESCRIPTION describe this body; TrueVision's describe its admin system. The log\n"
       "//     below is ValeVision's own sequence (TrueVision's 1.1.0 entry is the fallback not taken).\n")

live = open(LIVE, 'rb').read()
if hashlib.sha1(live).hexdigest() != LANDED:
    sys.exit('STOP: the live ProjectRecord is not the file W1-12 landed - nothing written')
if open(CANDIDATE, 'rb').read() != live:
    sys.exit('STOP: the scratch candidate does not match the landed file - nothing written')

old_crlf = OLD.replace('\n', '\r\n').encode('utf-8')
new_crlf = NEW.replace('\n', '\r\n').encode('utf-8')
if live.count(old_crlf) != 1:
    sys.exit('STOP: the line to fix is not there exactly once')
fixed = live.replace(old_crlf, new_crlf, 1)
if fixed.count(b'\r\n') != fixed.count(b'\n'):
    sys.exit('STOP: line endings would be mixed')
for line in fixed.decode('utf-8').split('\r\n'):
    body = line.lstrip('/ ').lstrip()
    if body.startswith('DEVELOPMENT LOG') and line.strip() != '// DEVELOPMENT LOG:':
        sys.exit('STOP: another line still begins with DEVELOPMENT LOG: %r' % line)
    if body.startswith('PORT NOTE') and line.strip() != '// PORT NOTE:':
        sys.exit('STOP: a line begins with PORT NOTE: %r' % line)

source = open(SOURCE, 'rb').read().decode('utf-8')
if source.count(OLD) != 1:
    sys.exit('STOP: the scratch source does not carry the line once')
open(SOURCE, 'wb').write(source.replace(OLD, NEW, 1).encode('utf-8'))
open(CANDIDATE, 'wb').write(fixed)
open(LIVE, 'wb').write(fixed)                                                   # <-- one whole write
print('fixed: sha1 %s -> %s (%d bytes, CRLF %d)' % (LANDED, hashlib.sha1(fixed).hexdigest(), len(fixed), fixed.count(b'\r\n')))
