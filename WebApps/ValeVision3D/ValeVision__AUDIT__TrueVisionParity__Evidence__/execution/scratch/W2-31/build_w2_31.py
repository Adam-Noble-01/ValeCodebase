# W2-31 build: candidates for the four files, from TrueVision at the pin and the live VV bytes.
#   python build_w2_31.py            -> writes candidate/ and preimage/ (+ snapshot.json); touches nothing live
#   python build_w2_31.py --apply    -> lands candidate/ over the live files, refusing if any live file moved
#   python build_w2_31.py --restore  -> puts the preimages back (removes the new file), refusing if a landed file moved
import hashlib, json, os, subprocess, sys

PIN   = 'b2aa9151'
TVGIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV    = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE  = os.path.dirname(os.path.abspath(__file__))
CAND  = os.path.join(HERE, 'candidate')
PRE   = os.path.join(HERE, 'preimage')

LE = '02__Src__AppModules/51__System__LayoutEditor/'
F_LOCK = LE + '50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js'
F_BAR  = LE + '50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js'
F_CSS  = LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css'
F_MC   = LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
FILES  = [F_LOCK, F_BAR, F_CSS, F_MC]


def tv(path):
    data = subprocess.run(['git', '-C', TVGIT, 'show', PIN + ':' + TVAPP + path], capture_output=True, check=True).stdout
    assert b'\r\n' not in data, path
    return data.decode('utf-8')


def live(path):
    p = os.path.join(VV, path.replace('/', os.sep))
    return open(p, 'rb').read() if os.path.exists(p) else None


def sha1(b):
    return hashlib.sha1(b).hexdigest() if b is not None else None


def sub(text, old, new, count=1):
    n = text.count(old)
    assert n == count, ('expected %d, found %d' % (count, n), old[:120])
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# 1. SpecLockstep 1.0.0 - new, whole, verbatim (banner + PORT NOTE)
# -----------------------------------------------------------------------------
def build_lock():
    t = tv(F_LOCK)
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - SPECIFICATION LOCKSTEP QUESTION\n',
               '// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION LOCKSTEP QUESTION\n')
    old_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : the Statement Writer\'s question (Na__LayoutEditor__\n'
        '//                   Statement__Page__, TrueVision3D v2.157.0), made a module\n'
        '//                   of its own because the specification has no single page\n'
        '// - ValeVision    : not yet ported.\n')
    new_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-31}} - whole, new. TrueVision made it a\n'
        '//                   module of its own from the Statement Writer\'s question (Na__LayoutEditor__\n'
        '//                   Statement__Page__, TrueVision3D v2.157.0), because the specification has no\n'
        '//                   single page. NOT tried by Adam in TrueVision (DR-01 (c)).\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '//   - Its stylesheet is linked by Na__LayoutEditor__Loader__ (Na__LeLoad__STYLESHEETS) when the\n'
        '//     editor first loads, where TrueVision\'s CSS index loads it with the app (INTEGRATION\n'
        '//     above); the rules are TrueVision\'s.\n'
        '// - Back-port     : none.\n')
    t = sub(t, old_note, new_note)
    assert 'TRUEVISION3D' not in t and '[TrueVision3D' not in t and 'NaProjectPortal' not in t
    return t.encode('utf-8')


# -----------------------------------------------------------------------------
# 2. SpecEditor Bar 1.3.0 - whole: TrueVision's 1.4.0 at the pin less its Share hunks,
#    banner, PORT NOTE, and the document-code seam (OC-09, DR-11)
# -----------------------------------------------------------------------------
def build_bar():
    t = tv(F_BAR)
    t = sub(t, '// TRUEVISION3D - LAYOUT EDITOR - SPECIFICATION EDITOR - BAR AND ALERTS\n',
               '// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION EDITOR - BAR AND ALERTS\n')
    old_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : the ValeVision3D v2.47.0 split of the same module (same unit, same functions)\n'
        '// - Parity        : verbatim (moved code)\n'
        '// - Divergences   : the project code\'s import path (TrueVision3D\'s drawing core is 40__System__DrawingViewCore); the go-to chips read Na__LeModel__GetTabLabel (short tab names, TrueVision first on 19-Sep-2026)\n'
        '// - Back-port     : n/a (ValeVision3D\'s copy is already split into the same units)\n')
    new_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js\n'
        '// - Source version: 1.3.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151). TrueVision\'s file\n'
        '//                   at the pin is 1.4.0; its one 1.4.0 change, the Share button in Read (v2.166.0),\n'
        '//                   is left out and comes with the document-sharing port (DR-05; D-S06b-07 (a)).\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-31}} - taken whole. This app\'s copy\n'
        '//                   before it was its 1.2.0 (19-Sep-2026): the unit this app split out of\n'
        '//                   Na__LayoutEditor__SpecEditor__.js first (15-Sep-2026, v2.47.0; TrueVision\n'
        '//                   took the same split), with TrueVision\'s Reload buttons (1.1.0) and tab-label\n'
        '//                   chips (1.2.0). NOT tried by Adam in TrueVision (DR-01 (c)).\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - The project code the summary shows and the document number defaults to is\n'
        '//     Na__DrawData__GetDocumentCode() (the loaded project\'s own code, DR-11), where TrueVision\n'
        '//     reads Na__DrawData__GetProjectCode(): here that is the ?project= token, which can be a\n'
        '//     folder id such as 2026/3047__Doous and defaulted the number to 2026/3047__Doous_SPEC.\n'
        '//     The same seam as Na__LayoutEditor__SpecPdf__ and Na__LayoutEditor__SpecDocument__.\n'
        '//   - No Share button yet (TrueVision 1.4.0; see Source version).\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : the document-code accessor in place of the ?project= code, offered with\n'
        '//                   SpecPdf\'s.\n')
    t = sub(t, old_note, new_note)
    # -- TrueVision 1.4.0 out: its log entry, the Share import and the Share button
    t = sub(t,
        '// DEVELOPMENT LOG:\n'
        '// 29-Sep-2026 - Version 1.4.0\n'
        '// - SHARE after Print, in Read only (and so in the web viewer, which is\n'
        '//   always on Read): a link that opens this specification\'s Read view on\n'
        '//   any device (66__Feature__DocumentSharing, TrueVision3D v2.166.0).\n'
        '//\n'
        '// 29-Sep-2026 - Version 1.3.0\n',
        '// DEVELOPMENT LOG:\n'
        '// 29-Sep-2026 - Version 1.3.0\n')
    t = sub(t,
        '    import { Na__LeShareUi__Open } from \'../66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js\';   // <-- Share: the link to this specification\'s Read view\n',
        '')
    t = sub(t,
        '        // SHARE | Read only: a link that opens this specification\'s Read view on\n'
        '        // any device (66__Feature__DocumentSharing). Its own click, so the bar\'s\n'
        '        // delegated handler passes \'share\' by as an action it does not know.\n'
        '        const share = Na__LeSpecEd__Button(L(\'SpecShare\', \'Share\'), \'share\', L(\'SpecShareTitle\', \'A link that opens this specification, read-only, on any device\'));\n'
        '        share.setAttribute(\'data-na-spec-only\', Na__LeSpecEd__VIEW_READ);\n'
        '        share.addEventListener(\'click\', () => { Na__LeShareUi__Open(share, { kind : \'specification\' }); });\n'
        '        bar.appendChild(share);\n',
        '')
    # -- the document-code seam (OC-09, DR-11)
    t = sub(t,
        '    import { Na__DrawData__GetProjectCode } from \'../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js\';\n',
        '    import { Na__DrawData__GetDocumentCode } from \'../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js\';   // <-- The project\'s own code (ValeVision, DR-11): this app\'s ?project= can be a folder id\n')
    t = sub(t,
        '        const code  = Na__DrawData__GetProjectCode();\n',
        '        const code  = Na__DrawData__GetDocumentCode();                    // <-- ValeVision seam (DR-11): the project\'s own code, never the ?project= folder id\n')
    assert 'Share' not in t.split('// DEVELOPMENT LOG:')[1], 'Share left in the code'
    assert 'GetProjectCode' not in t.split('// DEVELOPMENT LOG:')[1]
    assert 'TRUEVISION3D' not in t and '[TrueVision3D' not in t and 'NaProjectPortal' not in t
    return t.encode('utf-8')


# -----------------------------------------------------------------------------
# 3. Styles__Specification - whole: TrueVision's sheet, banner, PORT NOTE, and this
#    app's one removed rule (.na-le-tabs__tab--spec, W1-34)
# -----------------------------------------------------------------------------
def build_css():
    t = tv(F_CSS)
    t = sub(t, '/* REGION  |  TrueVision3D - Layout Editor Styles (specification)     */\n',
               '/* REGION  |  ValeVision3D - Layout Editor Styles (specification)     */\n')
    old_head = (
        ' * AUTHORED : 14-Sep-2026 for TrueVision3D v2.36.0 (Project Specification & Margin Notes)\n'
        ' * PORT NOTE: TrueVision3D first; ValeVision not yet ported. The palette is the\n'
        ' *            panels\' own, so the tab reads as part of the drawing editor.\n'
        ' * EXTENDED : 14-Sep-2026 - Edit and Read: the reading mode\'s A4 pages and how\n'
        ' *            they print (Na__LayoutEditor__SpecDocument__).\n'
        ' * SPLIT    : 15-Sep-2026 (v2.55.0) - the notes, panels and notes margin rules moved verbatim to\n'
        ' *            Styles__Specification__Notes, and the read document and print rules to\n'
        ' *            Styles__Specification__Read; the CSS index imports both straight after this sheet.\n'
        ' *            The split ValeVision3D made in v2.47.0.\n'
        ' * EXTENDED : 29-Sep-2026 (v2.162.0) - The Lockstep Question (Na__LayoutEditor__SpecLockstep__),\n'
        ' *            the Statement Writer\'s card for the specification, and the bar\'s out-of-step state.\n'
        ' */\n')
    new_head = (
        ' * AUTHORED : 14-Sep-2026 for TrueVision3D v2.36.0 (Project Specification & Margin Notes)\n'
        ' *            The palette is the panels\' own, so the tab reads as part of the drawing editor.\n'
        ' * EXTENDED : 14-Sep-2026 - Edit and Read: the reading mode\'s A4 pages and how\n'
        ' *            they print (Na__LayoutEditor__SpecDocument__).\n'
        ' * SPLIT    : 15-Sep-2026 (v2.55.0) - the notes, panels and notes margin rules moved verbatim to\n'
        ' *            Styles__Specification__Notes, and the read document and print rules to\n'
        ' *            Styles__Specification__Read; the CSS index imports both straight after this sheet.\n'
        ' *            The split ValeVision3D made in v2.47.0.\n'
        ' * EXTENDED : 29-Sep-2026 (v2.162.0) - The Lockstep Question (Na__LayoutEditor__SpecLockstep__),\n'
        ' *            the Statement Writer\'s card for the specification, and the bar\'s out-of-step state.\n'
        ' *\n'
        ' * PORT NOTE:\n'
        ' * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css\n'
        ' * - Source version: none of its own - the sheet as TrueVision3D v2.163.0 left it (29-Sep-2026; read at\n'
        ' *                   b2aa9151; its EXTENDED line says v2.162.0, the devlog v2.163.0).\n'
        ' * - Ported on     : 14-Sep-2026 (the first copy), taken whole 02-Oct-2026 for ValeVision3D {{VVREL:W2-31}}.\n'
        ' *                   New here: the region "The Lockstep Question" (TrueVision v2.163.0, NOT tried by\n'
        ' *                   Adam there, DR-01 (c)) and the .na-le-spec__spacer rule in TrueVision\'s place\n'
        ' *                   (no visual change). TrueVision\'s own PORT NOTE line is replaced by this note; its\n'
        ' *                   palette sentence stays under AUTHORED.\n'
        ' * - Parity        : adapted (every rule and comment is TrueVision\'s but one rule left out)\n'
        ' * - Divergences   :\n'
        ' *   - Banner reads ValeVision3D.\n'
        ' *   - No .na-le-tabs__tab--spec margin rule (removed 02-Oct-2026 for ValeVision3D v2.71.2): the tab\n'
        ' *     strip 2.0.0 (TrueVision3D v2.158.0) names its tab --specification, so the rule matched nothing.\n'
        ' *   - Loads: linked by Na__LayoutEditor__Loader__.js (Na__LeLoad__STYLESHEETS) after Styles__Panels,\n'
        ' *     with Styles__Specification__Notes and __Read straight after it; TrueVision imports all three\n'
        ' *     from Na__CoreUi__Styles__Index__.css (SPLIT above), so the cascade order is the same.\n'
        ' * - Legacy        : TrueVision\'s copy of this sheet has no module version, so the Source version names\n'
        ' *                   the release that left it instead.\n'
        ' * - Back-port     : the dead .na-le-tabs__tab--spec rule\'s deletion, offered with the TrueVision lane\n'
        ' *                   (WT-08).\n'
        ' */\n')
    t = sub(t, old_head, new_head)
    t = sub(t,
        '.na-le-tabs__tab--spec {\n'
        '    margin-left                        : 8px;\n'
        '}\n'
        '\n', '')
    assert 'TrueVision3D -' not in t and 'NaProjectPortal' not in t
    return t.encode('utf-8')


# -----------------------------------------------------------------------------
# 4. ModeController - hunk replay of TrueVision 1.31.0 at this app's sites (CRLF kept)
# -----------------------------------------------------------------------------
def build_mc():
    raw = live(F_MC)
    assert raw.count(b'\r\n') == raw.count(b'\n'), 'ModeController is not pure CRLF'
    t = raw.decode('utf-8').replace('\r\n', '\n')

    # -- imports: TrueVision's SpecData line and the SpecLockstep line (TV :354-355)
    t = sub(t,
        '    import { Na__LeSpec__CHANGED_EVENT, Na__LeSpec__OPEN_EVENT, Na__LeSpec__GOTO_EVENT, Na__LeSpec__Initialize, Na__LeSpec__EnsureLoaded } from \'../50__Feature__Specification/Na__LayoutEditor__SpecData__.js\';\n',
        '    import { Na__LeSpec__CHANGED_EVENT, Na__LeSpec__OPEN_EVENT, Na__LeSpec__GOTO_EVENT, Na__LeSpec__Initialize, Na__LeSpec__EnsureLoaded, Na__LeSpec__StartWatch, Na__LeSpec__StopWatch } from \'../50__Feature__Specification/Na__LayoutEditor__SpecData__.js\';\n'
        '    import { Na__LeSpecLock__Mount } from \'../50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js\';\n')
    # -- the question, mounted with the specification page where this session may author (TV :557)
    t = sub(t,
        '        Na__LeSpecEd__Mount(host, { editable : editable, showToast : toast });    // <-- The Project Specification page, over the shell\n'
        '    }\n',
        '        Na__LeSpecEd__Mount(host, { editable : editable, showToast : toast });    // <-- The Project Specification page, over the shell\n'
        '        if (editable) Na__LeSpecLock__Mount(host);                             // <-- The question when the specification and its local file are out of step, over every view\n'
        '    }\n')
    # -- Enter from the 3D view (not the return from the specification page): the watch starts (TV :710)
    t = sub(t,
        '            Na__LeMode__RestartSheetKeys();                                // <-- Pointer, keys, tools and the margin grip, started afresh from the 3D Model tab\n'
        '        }\n'
        '        const specLoad    = Na__LeSpec__EnsureLoaded();',
        '            Na__LeMode__RestartSheetKeys();                                // <-- Pointer, keys, tools and the margin grip, started afresh from the 3D Model tab\n'
        '            if (!Na__LeVw__IsViewerMode()) Na__LeSpec__StartWatch();        // <-- The specification\'s local file is watched while the editor is open (localhost, authoring)\n'
        '        }\n'
        '        const specLoad    = Na__LeSpec__EnsureLoaded();')
    # -- Leave: the watch stops (TV :768)
    t = sub(t,
        '    function Na__LeMode__Leave() {\n'
        '        if (!Na__LeMode__Active) return false;\n',
        '    function Na__LeMode__Leave() {\n'
        '        if (!Na__LeMode__Active) return false;\n'
        '        Na__LeSpec__StopWatch();                                                // <-- Looked at again the moment the editor reopens\n')

    # -- records: Source version hunk list, "Not yet taken", the log entry
    t = sub(t,
        '// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,\n'
        '//                   1.18.2, 1.18.3, 1.18.4, 1.18.5 and 1.18.6 entries name.',
        '// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,\n'
        '//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6 and 1.18.7 entries name.')
    t = sub(t,
        '//     design phases, the specification lockstep, note regions, the left column\'s two tabs, the\n',
        '//     design phases, note regions, the left column\'s two tabs, the\n')
    t = sub(t,
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.18.6 ',
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.18.7 (the specification lockstep, {{VVREL:W2-31}})\n'
        '// - THE SPECIFICATION IS KEPT IN STEP WITH ITS LOCAL FILE while the drawing\n'
        '//   editor is open (Na__LayoutEditor__SpecData__Lockstep__): the watch starts\n'
        '//   when the editor opens from the 3D view and stops when it closes, never in\n'
        '//   the web viewer. The question it raises (Na__LayoutEditor__SpecLockstep__)\n'
        '//   is mounted onto the host with the specification page, where this session\n'
        '//   may author. From TrueVision3D 1.31.0 (v2.163.0), TrueVision\'s three lines\n'
        '//   and comments at this app\'s sites; NOT tried by Adam in TrueVision.\n'
        '//\n'
        '// 02-Oct-2026 - Version 1.18.6 ')
    return t.replace('\n', '\r\n').encode('utf-8')


BUILDERS = {F_LOCK: build_lock, F_BAR: build_bar, F_CSS: build_css, F_MC: build_mc}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    snap_path = os.path.join(HERE, 'snapshot.json')
    if mode == '--build':
        snap = {}
        for f in FILES:
            out = BUILDERS[f]()
            pre = live(f)
            for root, data in ((CAND, out), (PRE, pre)):
                if data is None: continue
                p = os.path.join(root, f.replace('/', os.sep))
                os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, 'wb').write(data)
            snap[f] = {'pre': sha1(pre), 'cand': sha1(out), 'pre_bytes': len(pre) if pre else 0, 'cand_bytes': len(out)}
            print('%-100s pre %s (%s B) -> cand %s (%s B)' % (f, snap[f]['pre'], snap[f]['pre_bytes'], snap[f]['cand'], snap[f]['cand_bytes']))
        json.dump(snap, open(snap_path, 'w'), indent=2)
    elif mode == '--apply':
        snap = json.load(open(snap_path))
        for f in FILES:
            if sha1(live(f)) != snap[f]['pre']:
                sys.exit('REFUSED: live file moved since the snapshot: ' + f)
        for f in FILES:
            data = open(os.path.join(CAND, f.replace('/', os.sep)), 'rb').read()
            assert sha1(data) == snap[f]['cand']
            p = os.path.join(VV, f.replace('/', os.sep))
            if snap[f]['pre'] is None:
                with open(p, 'xb') as h: h.write(data)
            else:
                with open(p, 'wb') as h: h.write(data)
            print('landed', f)
    elif mode == '--restore':
        snap = json.load(open(snap_path))
        for f in FILES:
            if sha1(live(f)) != snap[f]['cand']:
                sys.exit('REFUSED: landed file moved since landing: ' + f)
        for f in FILES:
            p = os.path.join(VV, f.replace('/', os.sep))
            if snap[f]['pre'] is None:
                os.remove(p)
            else:
                open(p, 'wb').write(open(os.path.join(PRE, f.replace('/', os.sep)), 'rb').read())
            print('restored', f)
    elif mode == '--check':
        snap = json.load(open(snap_path))
        ok = True
        for f in FILES:
            live_sha = sha1(live(f))
            state = 'landed' if live_sha == snap[f]['cand'] else ('pre' if live_sha == snap[f]['pre'] else 'MOVED')
            print(state, f)
            ok = ok and state == 'landed'
        print('CHECK', 'PASS' if ok else 'FAIL')


if __name__ == '__main__':
    main()
