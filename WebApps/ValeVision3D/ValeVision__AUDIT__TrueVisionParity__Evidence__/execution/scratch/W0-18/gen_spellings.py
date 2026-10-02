"""
W0-18 scratch: build VV/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json from TrueVision's dictionary
read at the pin (scratch/W0-18/tv_pin/TrueVision__UserSpellings__.json), K1 DR-20 default:
  - TV's schema and house style; the key prefix swapped to ValeVision__UserSpellings__;
  - TV's shared groups kept word for word (ManufacturersAndBrands, ProductNames, StoneAndQuarryNames,
    ConstructionTerms, Abbreviations); ConstructionTerms' note no longer names TrueVision;
  - TV's practice's-software group replaced by Vale's (same key and title; Vale Garden Houses' apps and the
    software its drawings come from) - a seed for Adam to curate;
  - AddedInTheApp titled 'Added in ValeVision', empty and last;
  - written by the blueprint's own house-style writer, so it round-trips byte for byte; UTF-8, no BOM, LF.
Usage: python gen_spellings.py <output path> [--candidate-dir <dir with the blueprint>]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
sys.dont_write_bytecode = True
candidate_dir = os.path.join(HERE, 'candidate')
if '--candidate-dir' in sys.argv:
    candidate_dir = sys.argv[sys.argv.index('--candidate-dir') + 1]
sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)
sys.path.insert(0, candidate_dir)

import Server__ValeVisionUserConfig__Api__ as api            # noqa: E402

out_path = sys.argv[1]
tv_text = open(os.path.join(HERE, 'tv_pin', 'TrueVision__UserSpellings__.json'), 'rb').read().decode('utf-8')
tv = json.loads(tv_text)
TV_PREFIX = 'TrueVision__UserSpellings__'

tv_meta = tv[TV_PREFIX + 'Meta']
meta = {
    'Meta__FileName'    : api.SPELLINGS_FILE_NAME,
    'Meta__Description' : ("The ValeVision spelling dictionary: the words the spell check in ValeVision's text boxes accepts "
                           "that the browser's own dictionary does not know - manufacturers, product names, stone and quarry "
                           "names, construction terms, abbreviations and Vale Garden Houses' apps and software. Read by "
                           "02__Src__AppModules/55__Feature__SpellCheck; written by hand, and by Add to Dictionary through "
                           "the Whitecardopedia local server (WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py)."),
    'Meta__Version'     : tv_meta['Meta__Version'],
    'Meta__Created'     : tv_meta['Meta__Created'],
    'Meta__Author'      : tv_meta['Meta__Author'],
    'Meta__HowItWorks'  : tv_meta['Meta__HowItWorks'],
    'Meta__HowToAdd'    : tv_meta['Meta__HowToAdd'],
    'Meta__Matching'    : tv_meta['Meta__Matching'],
}
assert list(meta.keys()) == list(tv_meta.keys()), (list(meta.keys()), list(tv_meta.keys()))

VALE_SOFTWARE_NOTE  = "Vale Garden Houses' own apps and the software its drawings come from."
NA_ONLY_WORDS       = {'PlanVision', 'ProjectVision', 'TrueVision'}             # <-- Noble Architecture's own apps
VALE_APP_WORDS      = ['ValeVision', 'Whitecardopedia']                         # <-- Vale's apps a note may name
CONSTRUCTION_NOTE   = ("Trade words a general dictionary does not carry. Several come from the specifications already "
                       "written (cill, rooflight, monocouche, weatherboarding).")

groups = []
for group in tv[TV_PREFIX + 'Groups']:
    group = dict(group)
    key = group['Group__Key']
    if key == 'ConstructionTerms':
        assert 'TrueVision' in group['Group__Note']
        group['Group__Note'] = CONSTRUCTION_NOTE
    elif key == 'PracticeAndSoftware':
        words = [word for word in group['Group__Words'] if word not in NA_ONLY_WORDS] + VALE_APP_WORDS
        words.sort(key=lambda entry: (api._match_key(entry), entry))
        group['Group__Note'] = VALE_SOFTWARE_NOTE
        group['Group__Words'] = words
    elif key == api.APP_GROUP_KEY:
        assert group['Group__Words'] == []
        group['Group__Title'] = api.APP_GROUP_TITLE
        assert group['Group__Note'] == api.APP_GROUP_NOTE
    groups.append(group)
assert [g['Group__Key'] for g in groups] == [g['Group__Key'] for g in tv[TV_PREFIX + 'Groups']]

document = {
    api.KEY_META    : meta,
    api.KEY_UPDATED : api._now_iso(),
    api.KEY_GROUPS  : groups,
}
text = api.dump_house_style(document)
assert api.dump_house_style(json.loads(text)) == text, 'does not round-trip'
data = text.encode('utf-8')
assert not data.startswith(b'\xef\xbb\xbf') and b'\r' not in data

os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
if os.path.exists(out_path) and '--overwrite' not in sys.argv:
    print('STOP: exists already, nothing written:', out_path)
    sys.exit(2)
with open(out_path, 'wb') as handle:
    handle.write(data)

total = sum(len(g['Group__Words']) for g in groups)
print('written', out_path, len(data), 'bytes,', text.count('\n'), 'lines,', total, 'entries in', len(groups), 'groups')
for g in groups:
    print('  %-22s %-28s %3d' % (g['Group__Key'], g['Group__Title'], len(g['Group__Words'])))
