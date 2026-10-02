# W2-34 build: Spell Check (55__Feature__SpellCheck) from TrueVision at b2aa9151, with the named VV seams.
# Writes the candidates to scratch/W2-34/out/<app-relative path>. --place copies the new files into the live tree
# (refusing to overwrite) and appends the Spell Check region to the CSS index (CRLF kept, pre-image checked).
import os, sys, hashlib, subprocess

HERE    = os.path.dirname(os.path.abspath(__file__))
OUT     = os.path.join(HERE, 'out')
VV      = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))          # WebApps/ValeVision3D
TVREPO  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN     = 'b2aa9151'
TVAPP   = 'na-apps/30__TrueVision__CoreAppCode/'
SC      = '02__Src__AppModules/55__Feature__SpellCheck/'
TE      = '80__Testing__PrototypeEnvironment/'
CSS_IDX = os.path.join(VV, '03__Style__AppStylesheets', 'Na__CoreUi__Styles__Index__.css')
CSS_IDX_SHA1_BEFORE = 'd582db6c6fea2e26fb03bb6b1ee5c21ef6039e02'


def tv(rel):
    data = subprocess.run(['git', '-C', TVREPO, 'show', PIN + ':' + TVAPP + rel], capture_output=True, check=True).stdout
    assert b'\r\n' not in data, rel + ' is not LF at the pin'
    return data.decode('utf-8')


def rep(text, old, new, count=1):
    found = text.count(old)
    if found != count:
        raise SystemExit('expected %d of %r, found %d' % (count, old[:90], found))
    return text.replace(old, new)


def port_note(ported_from, parity, divergences, back_port='none.', marker='//', source='1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)'):
    m = marker
    lines = [m + ' PORT NOTE:',
             m + ' - Ported from   : TrueVision3D ' + ported_from,
             m + ' - Source version: ' + source,
             m + ' - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-34}}',
             m + ' - Parity        : ' + parity.replace('\n', '\n' + m + '                   '),
             m + ' - Divergences   :']
    for d in divergences:
        first = True
        for part in d.split('\n'):
            lines.append(m + ('   - ' if first else '     ') + part)
            first = False
    bp = back_port.split('\n')
    lines.append(m + ' - Back-port     : ' + bp[0])
    for part in bp[1:]:
        lines.append(m + '                   ' + part)
    return '\n'.join(lines) + '\n'


files = {}

# -----------------------------------------------------------------------------
# Na__SpellCheck__.js - the door (verbatim but the banner, two DESCRIPTION names, the PORT NOTE)
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__.js')
t = rep(t, '// TRUEVISION3D - SPELL CHECK\n', '// VALEVISION3D - SPELL CHECK\n')
t = rep(t, '//   box in TrueVision can have it:', '//   box in ValeVision can have it:')
t = rep(t, '//   50__TrueVision__UserConfig/TrueVision__UserSpellings__.json at the app\n', '//   50__ValeVision__UserConfig/ValeVision__UserSpellings__.json at the app\n')
t = rep(t, "// PORT NOTE:\n// - Authored in   : TrueVision3D first (22-Sep-2026)\n// - ValeVision    : not yet ported - it waits for Adam's sign-off.\n",
        port_note(SC + 'Na__SpellCheck__.js', 'verbatim',
                  ['Banner reads ValeVision3D, and DESCRIPTION names this app and its dictionary\n'
                   '(50__ValeVision__UserConfig/ValeVision__UserSpellings__.json) where TrueVision\'s\n'
                   'names its own. (No console output in this file.)']))
files[SC + 'Na__SpellCheck__.js'] = t

# -----------------------------------------------------------------------------
# Na__SpellCheck__Dictionary__.js - adapted: dictionary place, route, K_GROUPS, the /api/health service name
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__Dictionary__.js')
t = rep(t, '// TRUEVISION3D - SPELL CHECK - DICTIONARY\n', '// VALEVISION3D - SPELL CHECK - DICTIONARY\n')
t = rep(t, "// PURPOSE    : The words TrueVision's spell check must never mark: read from the user config folder, found in a text, and added or taken out through the ProjectVision local server\n",
           "// PURPOSE    : The words ValeVision's spell check must never mark: read from the user config folder, found in a text, and added or taken out through the Whitecardopedia local server\n")
t = rep(t, '//   50__TrueVision__UserConfig/TrueVision__UserSpellings__.json - groups of\n', '//   50__ValeVision__UserConfig/ValeVision__UserSpellings__.json - groups of\n')
t = rep(t, "//   or curly) only INSIDE it - the ProjectVision server's definition, word\n", "//   or curly) only INSIDE it - the Whitecardopedia server's definition, word\n")
t = rep(t, '//   ProjectVision local server the dictionary is asked of its route, which\n', '//   Whitecardopedia local server the dictionary is asked of its route, which\n')
t = rep(t, '// - Server side: na-apps/ProjectVision__TrueVisionUserConfig__Api__.py.\n', '// - Server side: WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py.\n')
t = rep(t, "// PORT NOTE:\n// - Authored in   : TrueVision3D first (22-Sep-2026)\n// - ValeVision    : not yet ported. Nothing here is app-specific but the\n//                   server route and the file's place at the app root.\n",
        port_note(SC + 'Na__SpellCheck__Dictionary__.js', 'adapted',
                  ['Banner reads ValeVision3D; console prefix [ValeVision3D SpellCheck] (4).',
                   "The dictionary is this app's (DR-20): SETTINGS_DEFAULTS.dictionaryFile\n"
                   '50__ValeVision__UserConfig/ValeVision__UserSpellings__.json and K_GROUPS\n'
                   'ValeVision__UserSpellings__Groups (K2 F9, K3).',
                   "The local server is Whitecardopedia's server.py: SETTINGS_DEFAULTS.apiPath\n"
                   '/api/valevision/user-config/spellings (its blueprint\n'
                   'Server__ValeVisionUserConfig__Api__.py, K2 R5) and SERVER_SERVICE\n'
                   "'whitecardopedia-local-dev', the name its GET /api/health gives (DR-28 (A),\n"
                   "F.8 C28). The private helper keeps TrueVision's name,\n"
                   'Na__SpellCheck__IsProjectVisionServer.',
                   'PURPOSE, DESCRIPTION, INTEGRATION, the helper\'s heading, the three\n'
                   'ReadOnlyMessage fallbacks and the two Post errors name ValeVision and the\n'
                   "Whitecardopedia local server where TrueVision's name TrueVision and the\n"
                   'ProjectVision local server; the app-root comment says index.html (K2 F8).'],
                  back_port='none (DR-42 default). Reading the service name from the config would\nremove the SERVER_SERVICE seam.'))
t = rep(t, "    const Na__SpellCheck__APP_ROOT_URL   = new URL('../../', import.meta.url);           // <-- 55__Feature__SpellCheck / 02__Src__AppModules: the folder Index.html is in\n",
           "    const Na__SpellCheck__APP_ROOT_URL   = new URL('../../', import.meta.url);           // <-- 55__Feature__SpellCheck / 02__Src__AppModules: the folder index.html is in\n")
t = rep(t, "    const Na__SpellCheck__SERVER_SERVICE = 'na-projectvision-local-dev';                 // <-- The name the ProjectVision local server gives in /api/health\n",
           "    const Na__SpellCheck__SERVER_SERVICE = 'whitecardopedia-local-dev';                  // <-- The name the Whitecardopedia local server (server.py) gives in /api/health\n")
t = rep(t, "    const Na__SpellCheck__K_GROUPS       = 'TrueVision__UserSpellings__Groups';\n", "    const Na__SpellCheck__K_GROUPS       = 'ValeVision__UserSpellings__Groups';\n")
t = rep(t, "        dictionaryFile   : '50__TrueVision__UserConfig/TrueVision__UserSpellings__.json',\n", "        dictionaryFile   : '50__ValeVision__UserConfig/ValeVision__UserSpellings__.json',\n")
t = rep(t, "        apiPath          : '/api/truevision/user-config/spellings',\n", "        apiPath          : '/api/valevision/user-config/spellings',\n")
t = rep(t, '[TrueVision3D SpellCheck]', '[ValeVision3D SpellCheck]', 4)
t = rep(t, '    // HELPER FUNCTION | Is the ProjectVision Local Server the One Answering (never throws)\n', '    // HELPER FUNCTION | Is the Whitecardopedia Local Server the One Answering (never throws)\n')
t = rep(t, "L('Restart', 'Restart the ProjectVision local server to add words to the dictionary.')", "L('Restart', 'Restart the Whitecardopedia local server to add words to the dictionary.')")
t = rep(t, "Correct it in 50__TrueVision__UserConfig, then reload TrueVision.'", "Correct it in 50__ValeVision__UserConfig, then reload ValeVision.'")
t = rep(t, "L('ReadOnly', 'Words can be added to the dictionary only with the ProjectVision local server.')", "L('ReadOnly', 'Words can be added to the dictionary only with the Whitecardopedia local server.')")
t = rep(t, "error : 'the ProjectVision local server is running without the dictionary route ('", "error : 'the Whitecardopedia local server is running without the dictionary route ('")
t = rep(t, "') - serve the app with the ProjectVision local server' }", "') - serve the app with the Whitecardopedia local server' }")
files[SC + 'Na__SpellCheck__Dictionary__.js'] = t

# -----------------------------------------------------------------------------
# Na__SpellCheck__Field__.js - verbatim but the banner, the console prefix and the PORT NOTE
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__Field__.js')
t = rep(t, '// TRUEVISION3D - SPELL CHECK - FIELD\n', '// VALEVISION3D - SPELL CHECK - FIELD\n')
t = rep(t, '[TrueVision3D SpellCheck]', '[ValeVision3D SpellCheck]', 1)
t = rep(t, '// PORT NOTE:\n// - Authored in   : TrueVision3D first (22-Sep-2026)\n// - ValeVision    : not yet ported. Nothing here is app-specific.\n',
        port_note(SC + 'Na__SpellCheck__Field__.js', 'verbatim',
                  ['Banner reads ValeVision3D; console prefix [ValeVision3D SpellCheck] (1).']))
files[SC + 'Na__SpellCheck__Field__.js'] = t

# -----------------------------------------------------------------------------
# Na__SpellCheck__WordBar__.js - the five inline fallback labels name this app (S06b verifier: not optional)
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__WordBar__.js')
t = rep(t, '// TRUEVISION3D - SPELL CHECK - WORD BAR\n', '// VALEVISION3D - SPELL CHECK - WORD BAR\n')
t = rep(t, '//     added from the app       "Velux" is in the dictionary: Added in TrueVision\n', '//     added from the app       "Velux" is in the dictionary: Added in ValeVision\n')
t = rep(t, '// - WHERE IT CANNOT WRITE - no ProjectVision local server, or one started\n', '// - WHERE IT CANNOT WRITE - no Whitecardopedia local server, or one started\n')
t = rep(t, '// PORT NOTE:\n// - Authored in   : TrueVision3D first (22-Sep-2026)\n// - ValeVision    : not yet ported. Nothing here is app-specific.\n',
        port_note(SC + 'Na__SpellCheck__WordBar__.js', 'adapted (strings only)',
                  ['Banner reads ValeVision3D. (No console output in this file.)',
                   'The five inline fallback labels (AddWordTitle, RemoveTitle, Added, AlreadyThere,\n'
                   "Removed) name the ValeVision dictionary where TrueVision's name its own, so a\n"
                   'config that does not load never shows TrueVision here; DESCRIPTION names this\n'
                   "app's group (Added in ValeVision) and the Whitecardopedia local server."]))
t = rep(t, "L('AddWordTitle', 'Add {word} to the TrueVision spelling dictionary.'", "L('AddWordTitle', 'Add {word} to the ValeVision spelling dictionary.'")
t = rep(t, "L('RemoveTitle', 'Take {word} out of the TrueVision spelling dictionary.'", "L('RemoveTitle', 'Take {word} out of the ValeVision spelling dictionary.'")
t = rep(t, "L('Added', 'Added \"{word}\" to the TrueVision dictionary.'", "L('Added', 'Added \"{word}\" to the ValeVision dictionary.'")
t = rep(t, "L('AlreadyThere', '\"{word}\" is already in the TrueVision dictionary.'", "L('AlreadyThere', '\"{word}\" is already in the ValeVision dictionary.'")
t = rep(t, "L('Removed', 'Took \"{word}\" out of the TrueVision dictionary.'", "L('Removed', 'Took \"{word}\" out of the ValeVision dictionary.'")
files[SC + 'Na__SpellCheck__WordBar__.js'] = t

# -----------------------------------------------------------------------------
# Na__SpellCheck__Styles__.css - verbatim but the banner and the PORT NOTE (TV's header holds both)
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__Styles__.css')
t = rep(t, '/* TRUEVISION3D - SPELL CHECK - STYLES                                */\n', '/* VALEVISION3D - SPELL CHECK - STYLES                                */\n')
t = rep(t, ' * PORT NOTE:\n * - Authored in : TrueVision3D first (22-Sep-2026)\n * - ValeVision  : not yet ported.\n',
        port_note(SC + 'Na__SpellCheck__Styles__.css', 'verbatim (the rules are TrueVision\'s; the banner and this note are the only differences)',
                  ['Banner reads ValeVision3D.'], marker=' *'))
files[SC + 'Na__SpellCheck__Styles__.css'] = t

# -----------------------------------------------------------------------------
# Na__SpellCheck__Config__.json - Vale values for the dictionary, the route and the names; keys TV's
# -----------------------------------------------------------------------------
t = tv(SC + 'Na__SpellCheck__Config__.json')
t = rep(t, '"Meta__Description" : "The Spell Check feature: TrueVision\'s text boxes checked by the browser\'s own spell check, with the practice\'s dictionary of words it must never mark - manufacturers, product names, trade words - kept in 50__TrueVision__UserConfig/TrueVision__UserSpellings__.json at the app root.',
           '"Meta__Description" : "The Spell Check feature: ValeVision\'s text boxes checked by the browser\'s own spell check, with the practice\'s dictionary of words it must never mark - manufacturers, product names, trade words - kept in 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json at the app root.')
t = rep(t, '        "Meta__Author"      : "Adam Noble - Noble Architecture"\n    },\n',
           '        "Meta__Author"      : "Adam Noble - Noble Architecture",\n'
           '        "Meta__PortedFrom"  : "TrueVision3D 02__Src__AppModules/55__Feature__SpellCheck/Na__SpellCheck__Config__.json 1.0.0, as TrueVision3D v2.144.0 shipped it (22-Sep-2026; read at HEAD b2aa9151), ported 02-Oct-2026 (parity package W2-34). Every key, setting and switch is TrueVision\'s. ValeVision\'s values: Dictionary__File (this app\'s 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json, DR-20), Dictionary__ApiPath (the Whitecardopedia server\'s /api/valevision/user-config/spellings, K2 R5), and this app\'s and its server\'s names in Meta__Description, Dictionary__Description and the eight labels that name them (AddWordTitle, RemoveTitle, ReadOnly, Restart, Unreadable, Added, AlreadyThere, Removed)."\n'
           '    },\n')
t = rep(t, 'File is relative to the TrueVision app root (the folder Index.html is in); ApiPath is the ProjectVision local server\'s route for Add to Dictionary.',
           'File is relative to the ValeVision app root (the folder index.html is in); ApiPath is the Whitecardopedia local server\'s route for Add to Dictionary.')
t = rep(t, '"Dictionary__File"             : "50__TrueVision__UserConfig/TrueVision__UserSpellings__.json",', '"Dictionary__File"             : "50__ValeVision__UserConfig/ValeVision__UserSpellings__.json",')
t = rep(t, '"Dictionary__ApiPath"          : "/api/truevision/user-config/spellings",', '"Dictionary__ApiPath"          : "/api/valevision/user-config/spellings",')
t = rep(t, 'to the TrueVision spelling dictionary (50__TrueVision__UserConfig/TrueVision__UserSpellings__.json), so', 'to the ValeVision spelling dictionary (50__ValeVision__UserConfig/ValeVision__UserSpellings__.json), so')
t = rep(t, 'out of the TrueVision spelling dictionary. It was added', 'out of the ValeVision spelling dictionary. It was added')
t = rep(t, 'only with the ProjectVision local server."', 'only with the Whitecardopedia local server."')
t = rep(t, '"Restart the ProjectVision local server to add', '"Restart the Whitecardopedia local server to add')
t = rep(t, 'Correct it in 50__TrueVision__UserConfig, then reload TrueVision."', 'Correct it in 50__ValeVision__UserConfig, then reload ValeVision."')
t = rep(t, 'the TrueVision dictionary', 'the ValeVision dictionary', 3)
assert 'TrueVision' not in t.replace(t[t.index('"Meta__PortedFrom"'):t.index('\n', t.index('"Meta__PortedFrom"'))], ''), 'TrueVision left in the config'
assert 'ProjectVision' not in t
files[SC + 'Na__SpellCheck__Config__.json'] = t

# -----------------------------------------------------------------------------
# README__SpellCheck__.md - this app's names and places, VV's counts, a provenance paragraph at the foot
# -----------------------------------------------------------------------------
t = tv(SC + 'README__SpellCheck__.md')
t = rep(t, 'Spell-checked text boxes for TrueVision, and the practice', 'Spell-checked text boxes for ValeVision, and the practice')
t = rep(t, '    na-apps/30__TrueVision__CoreAppCode/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json\n',
           '    WebApps/ValeVision3D/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json\n')
t = rep(t, 'Server side: `na-apps/ProjectVision__TrueVisionUserConfig__Api__.py` (registered by `ProjectVision__LocalServer__Main__.py`).',
           'Server side: `WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py` (registered by `WebApps/Whitecardopedia/server.py`).')
t = rep(t, 'Open `TrueVision__UserSpellings__.json` and put', 'Open `ValeVision__UserSpellings__.json` and put')
t = rep(t, '\nTrueVision__UserSpellings__Groups\n', '\nValeVision__UserSpellings__Groups\n')
t = rep(t, '- **Reload TrueVision** to pick up a hand edit.', '- **Reload ValeVision** to pick up a hand edit.')
t = rep(t, 'Adding needs the **ProjectVision local server**. On the website', 'Adding needs the **Whitecardopedia local server**. On the website')
t = rep(t, 'button says **restart the ProjectVision local server**, and once', 'button says **restart the Whitecardopedia local server**, and once')
t = rep(t, '| Practice and Software | 14 | TrueVision, ProjectVision, SketchUp ... |', '| Practice and Software | 13 | ValeVision, Whitecardopedia, SketchUp ... |')
t = rep(t, '| Added in TrueVision | 0 |', '| Added in ValeVision | 0 |')
t = rep(t, '339 entries in all.', '338 entries in all.')
t = rep(t, 'The other text boxes in TrueVision are the', 'The other text boxes in ValeVision are the')
t = rep(t, '- NOT in ValeVision.\n',
        '\n---\n\n'
        'Ported from TrueVision3D\'s `README__SpellCheck__.md` (as of TrueVision3D v2.144.0, read at HEAD b2aa9151) by parity\n'
        'package W2-34 on 02-Oct-2026. Changes for ValeVision: this app\'s name; its dictionary,\n'
        '`50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` (decision DR-20: TrueVision\'s five shared groups word\n'
        'for word, the Practice and Software group re-seeded with Vale\'s apps, the app\'s own group titled "Added in\n'
        'ValeVision"); the Whitecardopedia local server and its blueprint in place of TrueVision\'s ProjectVision server - the\n'
        'module knows that server by the service name its `GET /api/health` gives, `whitecardopedia-local-dev` (DR-28); the\n'
        'counts of this app\'s dictionary; and TrueVision\'s closing "NOT in ValeVision" gone. Adding a word needs the local\n'
        'server: off it the dictionary is read from its file, read-only. The Specification tab\'s row editor, the first box\n'
        'to use the feature, reaches ValeVision with the Specification Scrapbook (package W2-35).\n')
files[SC + 'README__SpellCheck__.md'] = t

# -----------------------------------------------------------------------------
# Na__Test__SpellCheckField__.html - verbatim but the names, the place it is opened and a PORT NOTE
# -----------------------------------------------------------------------------
t = tv(TE + 'Na__Test__SpellCheckField__.html')
t = rep(t, '<title>TrueVision3D - Spell-Checked Field</title>', '<title>ValeVision3D - Spell-Checked Field</title>')
t = rep(t, '// TRUEVISION3D - TEST - SPELL-CHECKED FIELD\n', '// VALEVISION3D - TEST - SPELL-CHECKED FIELD\n')
t = rep(t, "// - It needs the dictionary: the shipped 50__TrueVision__UserConfig file,\n//   read through the ProjectVision local server's route or as a file.\n",
           "// - It needs the dictionary: the shipped 50__ValeVision__UserConfig file,\n//   read through the Whitecardopedia local server's route or as a file.\n")
t = rep(t, '//     Serve the repository root and open\n//     /na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__SpellCheckField__.html\n',
           '//     Open it on the Whitecardopedia local server (WebApps/Whitecardopedia/server.py):\n//     /ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__SpellCheckField__.html\n')
t = rep(t, '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n',
        '// -----------------------------------------------------------------------------\n//\n'
        + port_note(TE + 'Na__Test__SpellCheckField__.html', 'verbatim (every check, word and step is TrueVision\'s)',
                    ['Banner and title read ValeVision3D; DESCRIPTION names this app\'s dictionary\n'
                     'folder and its local server, USAGE the address it is opened at.'])
        + '//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n')
files[TE + 'Na__Test__SpellCheckField__.html'] = t

# -----------------------------------------------------------------------------
# Na__Test__SpellCheckDictionary__.test.mjs - TV's checks in order on VV's files, then VV's own checks
# -----------------------------------------------------------------------------
t = tv(TE + 'Na__Test__SpellCheckDictionary__.test.mjs')
t = rep(t, '// TRUEVISION3D - TEST - SPELL CHECK DICTIONARY\n', '// VALEVISION3D - TEST - SPELL CHECK DICTIONARY\n')
t = rep(t, '//   50__TrueVision__UserConfig/TrueVision__UserSpellings__.json over a stubbed\n//   fetch - first as the ProjectVision local server answers its route, then\n',
           '//   50__ValeVision__UserConfig/ValeVision__UserSpellings__.json over a stubbed\n//   fetch - first as the Whitecardopedia local server answers its route, then\n')
t = rep(t, '//   word bar\'s own sentence. Broken after it was read, Add says where and\n//   stays on for when the file is put right.\n',
           '//   word bar\'s own sentence. Broken after it was read, Add says where and\n//   stays on for when the file is put right.\n'
           '// - VALEVISION3D: the config names this app\'s dictionary and route and no\n'
           '//   TrueVision or ProjectVision; the module knows the Whitecardopedia server\n'
           '//   by the service name its GET /api/health gives (whitecardopedia-local-dev,\n'
           '//   DR-28 (A)) and not TrueVision\'s ProjectVision server; off localhost the\n'
           '//   static file at 50__ValeVision__UserConfig is read and the route is never\n'
           '//   asked; the Vale software words are known and the NA apps are not; and with\n'
           '//   no config at all the fallback sentences name ValeVision and the\n'
           '//   Whitecardopedia local server.\n')
t = rep(t, '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n',
        '// -----------------------------------------------------------------------------\n//\n'
        + port_note(TE + 'Na__Test__SpellCheckDictionary__.test.mjs', 'adapted - every TrueVision check is kept, in its order, against ValeVision\'s\nmodule, config and dictionary',
                    ['Reads 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json; the stubbed\n'
                     'server answers /api/valevision/user-config/spellings and, at /api/health, the\n'
                     'service whitecardopedia-local-dev on localhost:8000.',
                     'The Add rule is compared with WCP/Server__ValeVisionUserConfig__Api__.py\'s\n'
                     'clean_word (TrueVision: na-apps/ProjectVision__TrueVisionUserConfig__Api__.py),\n'
                     'with no byte-code written (Whitecardopedia\'s __pycache__ is tracked) and the\n'
                     'flask bundled beside server.py when present.',
                     'The specification line says 3047 (a Vale project number) where TrueVision\'s\n'
                     'says RB05; check names say Whitecardopedia where TrueVision\'s say\n'
                     'ProjectVision; ValeVision checks follow TrueVision\'s.'])
        + '//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n')
t = rep(t, "const WORDS    = path.join(APP, '50__TrueVision__UserConfig', 'TrueVision__UserSpellings__.json');\nconst API_FILE = path.resolve(APP, '..', 'ProjectVision__TrueVisionUserConfig__Api__.py');\n",
           "const WORDS    = path.join(APP, '50__ValeVision__UserConfig', 'ValeVision__UserSpellings__.json');\nconst API_FILE = path.resolve(APP, '..', 'Whitecardopedia', 'Server__ValeVisionUserConfig__Api__.py');\nconst BUNDLED  = path.join(path.dirname(API_FILE), 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies');   // <-- The flask server.py itself runs on\n")
t = rep(t, '// A browser\'s worth of globals, and a ProjectVision server behind fetch\n', '// A browser\'s worth of globals, and a Whitecardopedia server behind fetch\n')
t = rep(t, "location      : { origin : 'http://localhost:8090', hostname : 'localhost', port : '8090' },", "location      : { origin : 'http://localhost:8000', hostname : 'localhost', port : '8000' },")
t = rep(t, "json(200, { status : 'ok', service : 'na-projectvision-local-dev' })", "json(200, { status : 'ok', service : server.service })")
t = rep(t, "const server = { route : true, writable : true, health : true, posts : [], answer : null, document : null, broken : null, fileReads : 0 };",
           "const server = { route : true, writable : true, health : true, posts : [], answer : null, document : null, broken : null, fileReads : 0, service : 'whitecardopedia-local-dev' };")
t = rep(t, "if (/\\/api\\/truevision\\/user-config\\/spellings$/.test(where)) {", "if (/\\/api\\/valevision\\/user-config\\/spellings$/.test(where)) {")
t = rep(t, "if (/TrueVision__UserSpellings__\\.json$/.test(where)) { server.fileReads++; return json(200, shipped()); }", "if (/ValeVision__UserSpellings__\\.json$/.test(where)) { server.fileReads++; return json(200, shipped()); }")
t = rep(t, "console.log('\\nTrueVision3D - Spell Check dictionary\\n\\n  What a word is');", "console.log('\\nValeVision3D - Spell Check dictionary\\n\\n  What a word is');")
t = rep(t, "const code = 'import sys, json\\nsys.path.insert(0, ' + JSON.stringify(path.dirname(API_FILE)) + ')\\nimport ProjectVision__TrueVisionUserConfig__Api__ as api\\n",
           "const code = 'import sys, os, json\\nsys.dont_write_bytecode = True\\nif os.path.exists(' + JSON.stringify(BUNDLED) + '): sys.path.insert(0, ' + JSON.stringify(BUNDLED) + ')\\nsys.path.insert(0, ' + JSON.stringify(path.dirname(API_FILE)) + ')\\nimport Server__ValeVisionUserConfig__Api__ as api\\n")
t = rep(t, "check('every shipped entry\\'s words are known (339 entries, more words)', D.Na__SpellCheck__WordCount() >= 339, true);",
           "check('every shipped entry\\'s words are known (338 entries, more words)', D.Na__SpellCheck__WordCount() >= 338, true);")
t = rep(t, "const line = 'Kingspan K15 by Kingspam, with Velux’s conservation rooflights to the RB05 roofs.';", "const line = 'Kingspan K15 by Kingspam, with Velux’s conservation rooflights to the 3047 roofs.';")
t = rep(t, "doc.TrueVision__UserSpellings__Groups[doc.TrueVision__UserSpellings__Groups.length - 1].Group__Words", "doc.ValeVision__UserSpellings__Groups[doc.ValeVision__UserSpellings__Groups.length - 1].Group__Words")
t = rep(t, 'server.broken = "TrueVision__UserSpellings__.json is not valid JSON: line 3, column 1 (Expecting value)";', 'server.broken = "ValeVision__UserSpellings__.json is not valid JSON: line 3, column 1 (Expecting value)";')
t = rep(t, 'server.broken    = "TrueVision__UserSpellings__.json is not valid JSON: line 14, column 5 (Expecting \',\' delimiter)";', 'server.broken    = "ValeVision__UserSpellings__.json is not valid JSON: line 14, column 5 (Expecting \',\' delimiter)";')
t = rep(t, "check('a ProjectVision server without the route: read from the file, and \"restart\"'", "check('a Whitecardopedia server without the route: read from the file, and \"restart\"'")
VV_CHECKS = r"""
// -----------------------------------------------------------------------------
// VALEVISION3D: THIS APP'S DICTIONARY, ROUTE AND SERVER
// -----------------------------------------------------------------------------
console.log('\n  ValeVision3D');
const configText = fs.readFileSync(CONFIG, 'utf8');
const configDoc  = JSON.parse(configText);
check('the config names this app\'s dictionary and its route',
    [ configDoc.SpellCheck__Dictionary.Dictionary__File, configDoc.SpellCheck__Dictionary.Dictionary__ApiPath ],
    [ '50__ValeVision__UserConfig/ValeVision__UserSpellings__.json', '/api/valevision/user-config/spellings' ]);
const configShown = JSON.stringify(Object.assign({}, configDoc, { SpellCheck__Meta : Object.assign({}, configDoc.SpellCheck__Meta, { Meta__PortedFrom : '' }) }));
check('...and nothing it shows or describes names TrueVision or ProjectVision', /TrueVision|ProjectVision/.test(configShown), false);
check('the settings read are this app\'s', [ D.Na__SpellCheck__GetSettings().dictionaryFile, D.Na__SpellCheck__GetSettings().apiPath ], [ '50__ValeVision__UserConfig/ValeVision__UserSpellings__.json', '/api/valevision/user-config/spellings' ]);
check('the Vale software words are known, and Noble Architecture\'s apps are not',
    [ 'ValeVision', 'Whitecardopedia', 'SketchUp', 'TrueVision', 'ProjectVision', 'PlanVision' ].map(known), [ true, true, true, false, false, false ]);

// TrueVision's ProjectVision server, answering /api/health with its own name, is not this app's server.
const wantedFetch = globalThis.fetch;
const asked = [];
globalThis.fetch = async (url, init) => { asked.push(decodeURIComponent(String(url))); return wantedFetch(url, init); };
server.route = false; server.service = 'na-' + 'projectvision-local-dev';
const D6 = await load(path.join(DIR, 'Na__SpellCheck__Dictionary__.js'), STUBS);
await D6.Na__SpellCheck__Ready();
check('a server whose /api/health names another app\'s server, without the route: "no-server", not "restart"', [ D6.Na__SpellCheck__IsKnown('Kingspan'), D6.Na__SpellCheck__WhyReadOnly() ], [ true, 'no-server' ]);
server.service = 'whitecardopedia-local-dev';
asked.length = 0;
const D7 = await load(path.join(DIR, 'Na__SpellCheck__Dictionary__.js'), STUBS);
await D7.Na__SpellCheck__Ready();
check('the Whitecardopedia server without the route: "restart", in this app\'s words',
    [ D7.Na__SpellCheck__WhyReadOnly(), D7.Na__SpellCheck__ReadOnlyMessage() ],
    [ 'restart', 'Restart the Whitecardopedia local server to add words to the dictionary.' ]);
check('...known by asking /api/health of the page\'s own origin', asked.includes('http://localhost:8000/api/health'), true);
server.route = true;

globalThis.localhost = false;
asked.length = 0;
const D8 = await load(path.join(DIR, 'Na__SpellCheck__Dictionary__.js'), STUBS);
await D8.Na__SpellCheck__Ready();
const fileAsked = asked.filter((where) => /UserSpellings__\.json$/.test(where));
check('off localhost: the static file at 50__ValeVision__UserConfig is read, the route and /api/health never asked',
    [ fileAsked.length === 1 && /\/50__ValeVision__UserConfig\/ValeVision__UserSpellings__\.json$/.test(fileAsked[0]), asked.some((where) => /\/api\//.test(where)), D8.Na__SpellCheck__IsKnown('Kingspan') ],
    [ true, false, true ]);
check('...read-only, saying so in this app\'s words', [ D8.Na__SpellCheck__WhyReadOnly(), D8.Na__SpellCheck__ReadOnlyMessage() ],
    [ 'no-server', 'Words can be added to the dictionary only with the Whitecardopedia local server.' ]);
globalThis.localhost = true;

// With no config at all, every fallback sentence the user can see is this app's.
globalThis.fetch = async (url, init) => (/Na__SpellCheck__Config__\.json$/.test(decodeURIComponent(String(url))) ? { ok : false, status : 404, json : async () => null } : wantedFetch(url, init));
const D9 = await load(path.join(DIR, 'Na__SpellCheck__Dictionary__.js'), STUBS);
await D9.Na__SpellCheck__Ready();
check('no config: the defaults are this app\'s dictionary and route, and the dictionary is writable through it',
    [ D9.Na__SpellCheck__GetSettings().dictionaryFile, D9.Na__SpellCheck__GetSettings().apiPath, D9.Na__SpellCheck__IsWritable() ],
    [ '50__ValeVision__UserConfig/ValeVision__UserSpellings__.json', '/api/valevision/user-config/spellings', true ]);
globalThis.__NaDictionary = D9;
const Bar9 = await load(path.join(DIR, 'Na__SpellCheck__WordBar__.js'), BAR_STUBS);
check('...and the word bar\'s own fallback names the ValeVision dictionary', Bar9.Na__SpellBar__Describe({ word : 'Zenitherm', start : 0, end : 9 }).title, 'Add Zenitherm to the ValeVision spelling dictionary.');
server.route = false;
const D10 = await load(path.join(DIR, 'Na__SpellCheck__Dictionary__.js'), STUBS);
await D10.Na__SpellCheck__Ready();
check('...and the restart fallback names the Whitecardopedia local server', D10.Na__SpellCheck__ReadOnlyMessage(), 'Restart the Whitecardopedia local server to add words to the dictionary.');
server.route = true;
globalThis.fetch = wantedFetch;
"""
t = rep(t, "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');\n",
        VV_CHECKS + "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');\n")
files[TE + 'Na__Test__SpellCheckDictionary__.test.mjs'] = t

# -----------------------------------------------------------------------------
# The CSS index region (TV :185-190 verbatim), appended after the Colour Palette region
# -----------------------------------------------------------------------------
TV_IDX = tv('03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css')
REGION = ('/* ----------------------------------------------------------------- */\n'
          '/* REGION  |  Spell Check - the Browser\'s Spell Check, the Practice\'s Words */\n'
          '/* ----------------------------------------------------------------- */\n'
          '/* Its own feature, like the Colour Palette: any text box in the app  */\n'
          '/* can be a spell-checked one, so it belongs to no one system\'s region. */\n'
          "@import url('../02__Src__AppModules/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css');\n"
          '/* endregion -------------------------------------------------------- */\n')
assert TV_IDX.count(REGION) == 1, 'TV region text differs'
CP_TAIL = ("@import url('../02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css');\r\n"
           '/* endregion -------------------------------------------------------- */\r\n').encode('utf-8')

os.makedirs(OUT, exist_ok=True)
for rel, text in files.items():
    path = os.path.join(OUT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as handle:
        handle.write(text.encode('utf-8'))
    print('built', rel, len(text.encode('utf-8')), 'B', hashlib.sha1(text.encode('utf-8')).hexdigest()[:8])

idx_before = open(CSS_IDX, 'rb').read()
print('css index sha1', hashlib.sha1(idx_before).hexdigest())
region_crlf = REGION.replace('\n', '\r\n').encode('utf-8')
if region_crlf in idx_before:
    idx_after = idx_before
    print('css index: region already present')
else:
    assert hashlib.sha1(idx_before).hexdigest() == CSS_IDX_SHA1_BEFORE, 'CSS index changed under W2-34'
    assert idx_before.endswith(CP_TAIL), 'CSS index does not end with the Colour Palette region'
    idx_after = idx_before + b'\r\n' + region_crlf
    assert idx_after.count(b'\r\n') == idx_after.count(b'\n')
with open(os.path.join(OUT, 'Na__CoreUi__Styles__Index__.css.candidate'), 'wb') as handle:
    handle.write(idx_after)

if '--place' in sys.argv:
    for rel, text in files.items():
        path = os.path.join(VV, rel.replace('/', os.sep))
        data = text.encode('utf-8')
        if os.path.exists(path):
            if open(path, 'rb').read() == data:
                print('same   ', rel); continue
            if '--replace-own' not in sys.argv:                            # <-- Only W2-34's own new files, re-placed after a fix
                raise SystemExit('refusing to overwrite ' + rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp = path + '.w234.tmp'
        with open(tmp, 'wb') as handle:
            handle.write(data)
        os.replace(tmp, path)
        print('placed ', rel)
    if idx_after != idx_before:
        tmp = CSS_IDX + '.w234.tmp'
        with open(tmp, 'wb') as handle:
            handle.write(idx_after)
        os.replace(tmp, CSS_IDX)
        print('placed  css index', hashlib.sha1(idx_before).hexdigest()[:8], '->', hashlib.sha1(idx_after).hexdigest()[:8])

if '--unplace' in sys.argv:                                                     # restore: remove the new files, put back the index
    for rel, text in files.items():
        path = os.path.join(VV, rel.replace('/', os.sep))
        if os.path.exists(path) and (open(path, 'rb').read() == text.encode('utf-8') or '--force-own' in sys.argv):
            os.remove(path); print('removed', rel)
    cur = open(CSS_IDX, 'rb').read()
    if cur == idx_after and idx_after != idx_before:
        pass
    if cur.endswith(b'\r\n' + region_crlf):
        with open(CSS_IDX, 'wb') as handle:
            handle.write(cur[:-len(b'\r\n' + region_crlf)])
        print('css index restored')
