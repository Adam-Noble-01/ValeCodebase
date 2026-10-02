# =============================================================================
# W1-03 APPLY SCRIPT - ortho depth bias (TV MultiModel 1.3.0 / v2.38.1) and the
# supersampler present clamp (TV v2.103.0), replayed as hunks into ValeVision.
# =============================================================================
#
# Usage (from anywhere):
#   python apply_w1_03.py --dry-run    build candidates + diffs in scratch/W1-03/candidate
#   python apply_w1_03.py --apply      write the three live files (pre-images hash-checked)
#
# - TV text is read ONLY at the pin with `git show b2aa9151:...` (bytes).
# - Every VV file is read as bytes, its pre-image SHA-1 checked, edited with
#   exact-count replacements, and written back with its own line ending
#   (MultiModel and Supersampler LF, the Main config CRLF).
# =============================================================================

import hashlib
import os
import subprocess
import sys
import difflib

PIN       = 'b2aa9151'
TV_GIT    = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP    = 'na-apps/30__TrueVision__CoreAppCode/'
VV_ROOT   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCRATCH   = os.path.join(VV_ROOT, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-03')

FILES = {
    'multimodel'  : ('02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js',         '172dcfe3d84d13e76a851bb5f90bb595c0f70cf6', b'\n'),
    'config'      : ('02__Src__AppModules/02__AppData/Na__AppConfig__Main.json',                   '2fc9f5ca6d4f2d57a5fbb396bf84cac7c2a27bff', b'\r\n'),
    'supersampler': ('02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__Supersampler__.js', '489a852de20934d58bca1482e34fd945876a8d8c', b'\n'),
}

VVREL = '{{VVREL:W1-03}}'


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def sha1(data):
    return hashlib.sha1(data).hexdigest()


def tv_show(rel):
    out = subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True)
    return out.stdout


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('ABORT: anchor "%s" found %d times (expected 1)' % (label, count))
    return text.replace(old, new, 1)


def extract_block(text, start_line, end_line, label, end_after=None):
    """Lines from the one line equal to start_line through the first line equal to
    end_line after it (inclusive). Returns the block as text ending in a newline."""
    lines = text.split('\n')
    starts = [i for i, l in enumerate(lines) if l == start_line]
    if len(starts) != 1:
        raise SystemExit('ABORT: TV start "%s" found %d times' % (label, len(starts)))
    s = starts[0]
    e = None
    for i in range(s + 1, len(lines)):
        if lines[i] == end_line:
            e = i
            break
    if e is None:
        raise SystemExit('ABORT: TV end of "%s" not found' % label)
    return '\n'.join(lines[s:e + 1]) + '\n'


# -----------------------------------------------------------------------------
# TrueVision hunks, read at the pin
# -----------------------------------------------------------------------------

tv_mm_bytes = tv_show('02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js')
tv_ss_bytes = tv_show('02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__Supersampler__.js')
tv_cf_bytes = tv_show('02__Src__AppModules/02__AppData/Na__AppConfig__Main.json')
for name, data in (('MultiModel', tv_mm_bytes), ('Supersampler', tv_ss_bytes), ('Main config', tv_cf_bytes)):
    if b'\r\n' in data:
        raise SystemExit('ABORT: TV %s at the pin is not LF' % name)
tv_mm = tv_mm_bytes.decode('utf-8')
tv_ss = tv_ss_bytes.decode('utf-8')
tv_cf = tv_cf_bytes.decode('utf-8')

# TV import line (TV indents its imports four spaces inside a #Region; VV's sit at column 0)
TV_IMPORT = "    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';"
if tv_mm.split('\n').count(TV_IMPORT) != 1:
    raise SystemExit('ABORT: TV import line not found once')
VV_IMPORT = TV_IMPORT.strip() + '\n'

# TV helper: Na__ModelLoader__GlslFloat (TV MultiModel :518-527)
tv_helper = extract_block(tv_mm,
                          '    // HELPER FUNCTION | A Number as a GLSL Float Literal',
                          '    }',
                          'GlslFloat helper')
tv_helper += '    // ------------------------------------------------------------\n'
if (tv_helper + '\n\n    // FUNCTION | Upgrade Imported Linework Root to Fat Lines\n') not in tv_mm:
    raise SystemExit('ABORT: TV helper is not followed by its rule and the Upgrade function as expected')

# TV depth bias block (TV MultiModel :582-617)
tv_depth = extract_block(tv_mm,
                         '            // DEPTH BIAS | Pull line fragments forward so a line wins against its own face',
                         '            };',
                         'depth bias block')

# TV supersampler clamp (TV Supersampler :365-379), with its context checked
tv_clamp = extract_block(tv_ss,
                         '                        // THE CANVAS IS PREMULTIPLIED, SO NO CHANNEL MAY STAND',
                         '                        total.rgb = min(total.rgb, vec3(total.a));',
                         'present clamp')
SS_CONTEXT_BEFORE = ('                        total.rgb = mix(\n'
                     '                            pow(linear, vec3(0.41666)) * 1.055 - vec3(0.055),\n'
                     '                            linear * 12.92,\n'
                     '                            vec3(lessThanEqual(linear, vec3(0.0031308)))\n'
                     '                        );\n')
SS_CONTEXT_AFTER  = '                    #endif\n                    gl_FragColor = total;\n'
if (SS_CONTEXT_BEFORE + tv_clamp + SS_CONTEXT_AFTER) not in tv_ss:
    raise SystemExit('ABORT: TV clamp context differs from the expected present pass')

# TV config key (TV Main config :90)
TV_KEY_LINE = '            "RenderConfig__Linework__OrthoDepthBiasMm"               : 2,'
if tv_cf.split('\n').count(TV_KEY_LINE) != 1:
    raise SystemExit('ABORT: TV config key line not found once')


# -----------------------------------------------------------------------------
# VV MultiModel
# -----------------------------------------------------------------------------

VV_OLD_DEPTH = (
    '            // DEPTH BIAS | Pull line fragments forward when logarithmic depth buffer is used\n'
    '            // ------------------------------------------------------------\n'
    '            const depthBias = (lineworkConfig.RenderConfig__Linework__DepthBias != null)\n'
    '                ? lineworkConfig.RenderConfig__Linework__DepthBias\n'
    '                : 0.00015;\n'
    '            fatLineMaterial.onBeforeCompile = (shader) => {\n'
    '                shader.fragmentShader = shader.fragmentShader.replace(\n'
    "                    '#include <logdepthbuf_fragment>',\n"
    '                    `#include <logdepthbuf_fragment>\n'
    '                    if (gl_FragDepth > 0.0) {\n'
    '                        gl_FragDepth -= ${depthBias};\n'
    '                    }`\n'
    '                );\n'
    '            };\n'
)

MM_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js - hunks\n'
    '//                   only: the camera-aware linework depth bias and its GLSL float literals (TrueVision\n'
    '//                   MultiModel 1.3.0, TrueVision3D v2.38.1), beside the linetype categories (1.3.1,\n'
    '//                   1.3.2) and the content stamp (1.4.0) this file already carried; the rest of the\n'
    "//                   file is ValeVision's own\n"
    '// - Source version: 1.4.0 (TrueVision3D v2.64.1, 18-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + VVREL + '\n'
    '// - Parity        : diverged (two independent lines since 10-Feb-2026: TrueVision\'s hunks are replayed\n'
    '//                   into ValeVision\'s file, never taken whole)\n'
    '// - Divergences   :\n'
    '//   - ValeVision\'s own loader: the ValeVision and NaModel namespaces and storey categories, resilient\n'
    '//     loads under a concurrency cap, the indexed and exempt material pass, and the linework colour\n'
    '//     helpers kept in this file.\n'
    '//   - Not taken from TrueVision: the LineworkColours__ module split with its edge lightness reduction,\n'
    '//     and the instance consolidation - 3D-tab concerns outside the drawing system.\n'
    '//   - Banner and console prefix read ValeVision3D.\n'
    '// - Back-port     : none.\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
)

MM_NEW_LOG_ENTRY = (
    '// 01-Oct-2026 - Version 1.3.1\n'
    '// - The linework depth bias is camera-aware, ported from TrueVision3D\n'
    '//   MultiModel 1.3.0 (v2.38.1, 14-Sep-2026). Through an orthographic camera the\n'
    '//   logarithmic depth buffer writes LINEAR depth (gl_FragCoord.z), so the fixed\n'
    '//   0.00015 was that share of the whole camera range: 75 mm across the drawing\n'
    "//   cameras' 10 mm to 500 m, and every SketchUp line up to 75 mm behind a face\n"
    '//   drew through it in plans, elevations and their Layout Editor base images -\n'
    '//   the line bleed at fascias and parapets. An orthographic camera now takes\n'
    '//   RenderConfig__Linework__OrthoDepthBiasMm as a distance (2 mm, in the app\n'
    '//   config); perspective renders keep the constant unchanged.\n'
    '// - Bias values go into the shader as GLSL float literals, inside\n'
    '//   USE_LOGARITHMIC_DEPTH_BUFFER: a whole-number config value pasted in as-is\n'
    '//   was a compile error.\n'
    '// - Header: PORT NOTE added; the three June entries below put newest first.\n'
    '//   Ported for ValeVision3D ' + VVREL + '.\n'
    '//\n'
)

LOG_HEAD = '// DEVELOPMENT LOG:\n'
LOG_END  = '// =============================================================================\n'


def edit_multimodel(text):
    # 1. PORT NOTE before the DEVELOPMENT LOG (after the rule and blank comment line)
    text = replace_once(text,
                        '// -----------------------------------------------------------------------------\n//\n' + LOG_HEAD,
                        '// -----------------------------------------------------------------------------\n//\n' + MM_PORT_NOTE + LOG_HEAD,
                        'MultiModel log head')

    # 2. The log: split into entries, put the June entries newest first, add 1.3.1 on top
    head_at = text.index(LOG_HEAD) + len(LOG_HEAD)
    end_at  = text.index(LOG_END, head_at)
    body    = text[head_at:end_at]
    lines   = body.split('\n')[:-1]                                        # body ends with '\n'
    import re
    entry_re = re.compile(r'^// \d{2}-[A-Za-z]{3}-\d{4} - Version (\d+\.\d+\.\d+)$')
    entries, current = [], None
    for line in lines:
        m = entry_re.match(line)
        if m:
            current = {'version': m.group(1), 'lines': [line]}
            entries.append(current)
        else:
            if current is None:
                raise SystemExit('ABORT: text before the first log entry')
            current['lines'].append(line)
    versions = [e['version'] for e in entries]
    if versions != ['1.3.0', '1.2.3', '1.2.2', '1.1.0', '1.2.0', '1.2.1']:
        raise SystemExit('ABORT: unexpected log order %r' % versions)
    for e in entries:
        if e['lines'][-1] != '//':
            raise SystemExit('ABORT: entry %s does not end with a blank comment line' % e['version'])
    by_version = {e['version']: e for e in entries}
    new_order  = ['1.3.0', '1.2.3', '1.2.2', '1.2.1', '1.2.0', '1.1.0']
    new_body   = MM_NEW_LOG_ENTRY + ''.join('\n'.join(by_version[v]['lines']) + '\n' for v in new_order)
    if sorted(new_body[len(MM_NEW_LOG_ENTRY):].split('\n')) != sorted(body.split('\n')):
        raise SystemExit('ABORT: reorder changed the entries\' text')
    text = text[:head_at] + new_body + text[end_at:]

    # 3. Import, after the LineSegments2 import (TV's position)
    text = replace_once(text,
                        "import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';\n",
                        "import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';\n" + VV_IMPORT,
                        'LineSegments2 import')

    # 4. GlslFloat helper, right before the Upgrade function (TV's position)
    text = replace_once(text,
                        '    // FUNCTION | Upgrade Imported Linework Root to Fat Lines\n',
                        tv_helper + '\n\n    // FUNCTION | Upgrade Imported Linework Root to Fat Lines\n',
                        'Upgrade function title')

    # 5. The depth bias block, TV's verbatim
    text = replace_once(text, VV_OLD_DEPTH, tv_depth, 'VV depth bias block')
    return text


# -----------------------------------------------------------------------------
# VV Supersampler
# -----------------------------------------------------------------------------

SS_OLD_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 05__RenderPipeline/Na__RenderEffect__Supersampler__.js 1.0.0\n'
    '// - Ported on     : 12-Sep-2026 for ValeVision3D v2.23.0\n'
    '// - Parity        : verbatim\n'
    '// - Divergences   : File header only. The TARGET ROUTE has no caller here yet and is kept\n'
    '//                   anyway - the point of the file is that both trees hold the same one.\n'
    "// - To port       : v1.1.0's present(target, scale) is not in TrueVision's copy yet.\n"
    '// - Round trip    : this began as ValeVision\'s own\n'
)

SS_NEW_PORT_NOTE = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 05__RenderPipeline/Na__RenderEffect__Supersampler__.js 1.0.0\n'
    '// - Source version: 1.0.0 as TrueVision3D v2.103.0 left it - its present-pass clamp, which\n'
    '//                   TrueVision did not log in this header (TrueVision3D v2.103.0, 21-Sep-2026;\n'
    '//                   read at b2aa9151)\n'
    '// - Ported on     : 12-Sep-2026 for ValeVision3D v2.23.0; the v2.103.0 clamp 01-Oct-2026 for\n'
    '//                   ValeVision3D ' + VVREL + '\n'
    '// - Parity        : verbatim\n'
    "// - Divergences   : File header only (banner, and ValeVision's own DESCRIPTION and log), plus\n"
    "//                   where one comment line sits in present()'s notes. The TARGET ROUTE has no\n"
    '//                   caller here yet and is kept anyway - the point of the file is that both\n'
    '//                   trees hold the same one. The v2.103.0 clamp sits on that route, inside\n'
    '//                   NA_ENCODE_SRGB, so no render this app makes today compiles it; the depth\n'
    "//                   fog's layer images will.\n"
    "// - Back-port     : none. TrueVision took v1.1.0's present(target, scale) in v2.56.0\n"
    '//                   (16-Sep-2026) without a log entry; that and the v2.103.0 clamp are\n'
    "//                   TrueVision header records for the TrueVision lane.\n"
    '// - Round trip    : this began as ValeVision\'s own\n'
)

SS_NEW_LOG_ENTRY = (
    '// 01-Oct-2026 - Version 1.1.1\n'
    '// - The present pass holds the encoded colour down to the alpha - min(rgb, a) -\n'
    '//   ported from TrueVision3D v2.103.0 (21-Sep-2026), which did not log it in\n'
    '//   this header. The canvas is premultiplied, and wherever a supersampled\n'
    "//   layer's samples differ the sRGB encode of the averaged colour lands ABOVE\n"
    '//   the straight-averaged alpha: not a premultiplied colour at all, and\n'
    '//   undefined by WebGL (Chrome clamps it to white). It sits on the TARGET\n'
    '//   ROUTE, inside NA_ENCODE_SRGB, which no caller here uses yet, so every\n'
    "//   render this app makes today is unchanged; the depth fog's layer images\n"
    '//   need it. An opaque frame cannot notice.\n'
    "// - PORT NOTE: Source version added; the To port line removed, as TrueVision\n"
    '//   took present(target, scale) in v2.56.0. Ported for ValeVision3D\n'
    '//   ' + VVREL + '.\n'
    '//\n'
)


def edit_supersampler(text):
    text = replace_once(text, SS_OLD_PORT_NOTE, SS_NEW_PORT_NOTE, 'Supersampler PORT NOTE')
    text = replace_once(text, LOG_HEAD + '// 16-Sep-2026 - Version 1.1.0\n',
                        LOG_HEAD + SS_NEW_LOG_ENTRY + '// 16-Sep-2026 - Version 1.1.0\n', 'Supersampler log head')
    text = replace_once(text, SS_CONTEXT_BEFORE + SS_CONTEXT_AFTER,
                        SS_CONTEXT_BEFORE + tv_clamp + SS_CONTEXT_AFTER, 'present pass encode block')
    return text


# -----------------------------------------------------------------------------
# VV Main config
# -----------------------------------------------------------------------------

CF_ANCHOR = '            "RenderConfig__Linework__DepthBias"           : 0.00015,\n'
CF_NEW    = '            "RenderConfig__Linework__OrthoDepthBiasMm"    : 2,\n'


def edit_config(text):
    return replace_once(text, CF_ANCHOR, CF_ANCHOR + CF_NEW, 'DepthBias config line')


# -----------------------------------------------------------------------------
# Driver
# -----------------------------------------------------------------------------

EDITORS = {'multimodel': edit_multimodel, 'config': edit_config, 'supersampler': edit_supersampler}


def build():
    results = {}
    for key, (rel, pre_sha, eol) in FILES.items():
        path = os.path.join(VV_ROOT, rel.replace('/', os.sep))
        data = open(path, 'rb').read()
        if sha1(data) != pre_sha:
            raise SystemExit('ABORT: %s changed since it was read (sha1 %s, expected %s)' % (rel, sha1(data), pre_sha))
        if eol == b'\n' and b'\r' in data:
            raise SystemExit('ABORT: %s is not LF-only' % rel)
        if eol == b'\r\n' and data.count(b'\r\n') != data.count(b'\n'):
            raise SystemExit('ABORT: %s is not CRLF throughout' % rel)
        text = data.decode('utf-8')
        if eol == b'\r\n':
            text = text.replace('\r\n', '\n')
        new_text = EDITORS[key](text)
        if eol == b'\r\n':
            new_text = new_text.replace('\n', '\r\n')
        new_data = new_text.encode('utf-8')
        results[key] = (rel, path, data, new_data)
    return results


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    results = build()
    cand_dir = os.path.join(SCRATCH, 'candidate')
    os.makedirs(cand_dir, exist_ok=True)
    for key, (rel, path, old, new) in results.items():
        name = os.path.basename(rel)
        open(os.path.join(cand_dir, name), 'wb').write(new)
        diff = difflib.unified_diff(old.decode('utf-8').splitlines(True), new.decode('utf-8').splitlines(True),
                                    'a/WebApps/ValeVision3D/' + rel, 'b/WebApps/ValeVision3D/' + rel, n=3)
        open(os.path.join(cand_dir, name + '.diff'), 'w', encoding='utf-8', newline='').write(''.join(diff))
        print('%-45s %s -> %s  (%d -> %d bytes)' % (name, sha1(old)[:12], sha1(new)[:12], len(old), len(new)))
    if mode == '--apply':
        for key, (rel, path, old, new) in results.items():
            if sha1(open(path, 'rb').read()) != sha1(old):
                raise SystemExit('ABORT at write time: %s changed' % rel)
        for key, (rel, path, old, new) in results.items():
            open(path, 'wb').write(new)
            print('WROTE', rel, sha1(new))
    else:
        print('dry run only; candidates in', cand_dir)


if __name__ == '__main__':
    main()
