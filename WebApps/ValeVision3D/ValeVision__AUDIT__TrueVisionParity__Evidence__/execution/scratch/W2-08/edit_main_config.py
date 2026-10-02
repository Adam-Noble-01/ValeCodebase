# W2-08 - align the RenderEffect__ProfileLines Drawing2d keys of VV's main config with TV (b2aa9151).
# Byte-level edit, CRLF preserved, hash-guarded against the pre-edit snapshot.
import hashlib, json, sys

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\02__AppData\Na__AppConfig__Main.json'
EXPECT_SHA = 'bc6e10b5a0241cf5064aa947da92fc15765389b9964e1f0d9b8a44f96ea103b1'
NL = b'\r\n'

raw = open(PATH, 'rb').read()
sha = hashlib.sha256(raw).hexdigest()
if sha != EXPECT_SHA:
    sys.exit('ABORT: file changed under us (' + sha + ')')

old_lines = [
    b'        "RenderEffect__ProfileLines__Drawing2dDescription"   : "Profile lines on 2D drawings (floor plans, elevations, sections). Rendered through the ortho-aware pre-pass at a fixed width; null colour and threshold fall back to the 3D values above.",',
    b'        "RenderEffect__ProfileLines__Drawing2dEnabled"       : true,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeColor"     : null,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeThresholdNormal": null,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeWidth"     : 1.0',
]
old = NL.join(old_lines) + NL

desc = ('The same silhouette edges applied to the 2D drawings - floor plans, elevations and sections. '
        'A parallel view has no shading, so without this every rounded form (curved walls, cylinders, bay windows, downpipes) '
        'reads as a blank patch on the sheet. Rendered through the ortho-aware pre-pass at a FIXED width rather than one scaled '
        'by camera distance, because a drawn line keeps its weight on the sheet at any zoom. A null colour and threshold fall '
        'back to the 3D values above.')
moved = ('Removed 02-Oct-2026, aligned with TrueVision3D v2.27.0 and v2.30.2. Drawing2dEdgeWidth 1.0 set the fixed profile '
         'width of the live floor plan, elevation and section views, which ValeVision renders through its composer preset '
         '(40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js, reading Na__DrawView__ConfigState__.js). With the key '
         'gone they take DrawingView__Render__ProfileEdgeWidth in 40__System__DrawingViewCore/Na__DrawView__AppConfig__.json - '
         'the same 1.0, as is the built-in fallback - so no live view and no sheet moves. A Layout Editor bake takes its width '
         'from the profileLinework Composite__Weight in 51__System__LayoutEditor/25__System__RenderStyles/'
         'Na__LayoutEditor__RenderComposites__Config__.json (default 1.0, per viewport); a bake given no Profile Linework weight '
         'falls back to the drawing-view width. Re-adding Drawing2dEdgeWidth here would override the drawing-view JSON again: '
         'the live views and that bake fallback alike.')

new_lines = [
    b'        "RenderEffect__ProfileLines__Drawing2d__Description"       : ' + json.dumps(desc).encode('utf-8') + b',',
    b'        "RenderEffect__ProfileLines__Drawing2dEnabled"             : true,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeColor"           : null,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeThresholdNormal" : null,',
    b'        "RenderEffect__ProfileLines__Drawing2dEdgeWidthMoved"      : ' + json.dumps(moved).encode('utf-8'),
]
new = NL.join(new_lines) + NL

if raw.count(old) != 1:
    sys.exit('ABORT: anchor count ' + str(raw.count(old)))
out = raw.replace(old, new)
json.loads(out.decode('utf-8'))                       # must still parse
assert b'\n' not in out.replace(b'\r\n', b'')         # CRLF only
open(PATH, 'wb').write(out)
print('written', len(raw), '->', len(out), hashlib.sha256(out).hexdigest())
