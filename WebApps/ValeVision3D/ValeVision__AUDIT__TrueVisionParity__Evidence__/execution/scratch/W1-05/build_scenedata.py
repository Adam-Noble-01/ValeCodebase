"""W1-05 - the ValeVision section bindings module registers its block with the drawings save.

VV 41__System__CrossSectionView/Na__CrossSectionView__SceneData.js is ValeVision's own (DIV-2; TV's 41
SceneData and Serialize are never ported, DR-41). The drawings data module (now TrueVision's ProjectData
1.6.0) no longer imports it: this module hands Na__SectSceneData__GetProjectBlock to
Na__DrawData__RegisterSectionBlockProvider when it initialises, exactly where TrueVision's section scene
data registers its own (TV Na__SectionCut__SceneData__.js :82, :293-294).

Edits (the file's own line endings are kept - it is LF - and its non-ASCII comment bytes are untouched):
  1. INTEGRATION: two lines on the registration.
  2. DEVELOPMENT LOG: a 1.2.0 entry, and the log put newest first (folders 40-55 run TrueVision's way,
     G4 PortNotes; the 01-Oct-2026 baseline held this file's log-order finding only while unwritten).
  3. MODULE IMPORTS: the drawings save path import.
  4. Initialize: the registration as its first act.
Reads the live file (hash-checked), writes the candidate into this scratch folder only.
"""
import hashlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIVE = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\41__System__CrossSectionView\Na__CrossSectionView__SceneData.js')
OUT = HERE / 'candidate__Na__CrossSectionView__SceneData.js'
LIVE_SHA1 = 'e163813afa5032567e414e29112cef393c655349'


def swap(text, old, new, count=1, label=''):
    found = text.count(old)
    if found != count:
        sys.exit(f'[{label}] expected {count} match(es), found {found}:\n{old}')
    return text.replace(old, new)


def build():
    raw = LIVE.read_bytes()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != LIVE_SHA1:
        sys.exit(f'live file changed under this package: sha1 {sha} != {LIVE_SHA1}')
    if b'\r' in raw:
        sys.exit('expected an LF file')
    t = raw.decode('utf-8')

    # 1. INTEGRATION ------------------------------------------------------------------------------
    t = swap(t,
        '// - Na__PresentationMode__DevMenu__SceneEditor imports the capture API.\n',
        '// - Na__PresentationMode__DevMenu__SceneEditor imports the capture API.\n'
        '// - Initialize registers GetProjectBlock with the drawings data\n'
        '//   (Na__DrawData__RegisterSectionBlockProvider), so every drawings save\n'
        '//   carries this block as its third key - the hook TrueVision\'s section\n'
        '//   scene data uses. The block keeps this module\'s own entry schema\n'
        '//   (TD06, DR-41): TrueVision\'s 41 SceneData and Serialize never come here.\n',
        label='integration')

    # 2. DEVELOPMENT LOG: new entry, newest first --------------------------------------------------
    old_log = (
        '// DEVELOPMENT LOG:\n'
        '// 09-Sep-2026 - Drawing approach scenes (port Phase 2)\n'
        '// - The scene-activated listener returns early when the synthetic approach\n'
        '// - scene of a 2D drawing flight is announced, so the drawing cut applied by\n'
        '// - Na__DrawView__SectionAdapter__ is not cleared a moment later.\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.0.0\n'
        '// - Initial implementation (per-scene cross section persistence).\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.0.1\n'
        '// - Fixed: scenes with no ValeVision/SketchUp binding now CLEAR every live\n'
        '//   section on activation, instead of leaving the previous scene\'s cuts on.\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.1.0\n'
        '// - Capture/restore now include fill colour, line colour, and line width so\n'
        '//   localhost scene setup persists style to R2 for web playback.\n'
        '//\n'
    )
    new_log = (
        '// DEVELOPMENT LOG:\n'
        '// 01-Oct-2026 - Version 1.2.0 ({{VVREL:W1-05}})\n'
        '// - The drawings save carries the bindings by registration: Initialize\n'
        '//   hands GetProjectBlock to Na__DrawData__RegisterSectionBlockProvider, the\n'
        '//   hook TrueVision\'s drawings data has always had (TD06), now that the\n'
        '//   drawings data is TrueVision\'s ProjectData 1.6.0 taken whole and no longer\n'
        '//   imports this module. The block and its entries are unchanged.\n'
        '// - This log now reads newest first, as every log in folders 40-55 does.\n'
        '//\n'
        '// 09-Sep-2026 - Drawing approach scenes (port Phase 2)\n'
        '// - The scene-activated listener returns early when the synthetic approach\n'
        '// - scene of a 2D drawing flight is announced, so the drawing cut applied by\n'
        '// - Na__DrawView__SectionAdapter__ is not cleared a moment later.\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.1.0\n'
        '// - Capture/restore now include fill colour, line colour, and line width so\n'
        '//   localhost scene setup persists style to R2 for web playback.\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.0.1\n'
        '// - Fixed: scenes with no ValeVision/SketchUp binding now CLEAR every live\n'
        '//   section on activation, instead of leaving the previous scene\'s cuts on.\n'
        '//\n'
        '// 15-Jul-2026 - Version 1.0.0\n'
        '// - Initial implementation (per-scene cross section persistence).\n'
        '//\n'
    )
    t = swap(t, old_log, new_log, label='log')

    # 3. MODULE IMPORTS ----------------------------------------------------------------------------
    t = swap(t,
        "    } from './Na__CrossSectionView__SystemLogic.js';\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n",
        "    } from './Na__CrossSectionView__SystemLogic.js';\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "    // MODULE IMPORTS | Drawings Save Path (registers this block as the third key)\n"
        "    // ------------------------------------------------------------\n"
        "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js\n"
        "    // ------------------------------------------------------------\n"
        "    import { Na__DrawData__RegisterSectionBlockProvider } from '../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "// endregion -------------------------------------------------------------------\n",
        label='import')

    # 4. INITIALIZE --------------------------------------------------------------------------------
    t = swap(t,
        "        if (Na__SectSceneData__Initialized) return;\n"
        "        Na__SectSceneData__Initialized = true;\n"
        "\n"
        "        // PROJECT LOAD | Seed the block from project.json (loading sequence event)\n",
        "        if (Na__SectSceneData__Initialized) return;\n"
        "        Na__SectSceneData__Initialized = true;\n"
        "\n"
        "        // The drawings save carries this block as its third key.\n"
        "        Na__DrawData__RegisterSectionBlockProvider(Na__SectSceneData__GetProjectBlock);\n"
        "\n"
        "        // PROJECT LOAD | Seed the block from project.json (loading sequence event)\n",
        label='initialize')

    data = t.encode('utf-8')
    OUT.write_bytes(data)
    print('wrote', OUT, 'sha1', hashlib.sha1(data).hexdigest(), 'lines', t.count('\n'),
          'CR bytes', data.count(b'\r'), 'non-ascii bytes', sum(1 for b in data if b > 127))


if __name__ == '__main__':
    build()
