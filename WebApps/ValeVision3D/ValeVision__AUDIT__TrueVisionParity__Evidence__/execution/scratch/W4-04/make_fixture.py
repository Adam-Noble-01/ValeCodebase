# Writes the ValeVision statement fixture (LF) for W4-04. Run once; the file is then committed by Adam.
# Built in Python so the zero-width spaces, tabs and trailing whitespace are exact.
import os

ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\TestEnv__StatementFixtures'
NAME = 'TestEnv__StatementFixture__DesignStatement__.md'
ZW = '\u200b'

DIVIDER = [
    '<div style="margin-top: 9mm; margin-bottom: 9mm;">   ',
    '    <div style="border-top: 1.6px solid #1f3a5f; /* house divider */ margin: 0 auto; width: 100%;">  ',
    '    </div>',
    '</div>',
]

PIC_SITE = ('<img class="na-figure" src="./02__DocImages/02__Site__Location/Location__Context__.png" '
            'style="zoom: 28%; display: block; margin-left: auto; margin-right: auto;" />')
CROPPED = [
    '<div class="na-figure" style="zoom: 100%; display: block; overflow: hidden; box-sizing: content-box; '
    'width: 120.00mm; height: 90.00mm; margin-left: auto; margin-right: auto;">',
    '    <img src="./02__DocImages/03__Existing__House/Rear__Garden__.jpg" style="display: block; max-width: none; width: 160.00mm;" />',
    '</div>',
]
PIC_PLAIN_ZW = ('<img class="na-figure" src="./02__DocImages/03__Existing__House/Side__Path__.jpg" '
                'style="zoom: 30%; display: block; margin-left: 0; margin-right: auto;" />')
FIG_TITLED = [
    '<figure class="na-figure-block" style="margin-left: auto; margin-right: auto;">',
    '<img class="na-figure" src="./02__DocImages/04__Proposal__Visuals/Orangery__Garden__View__.png" '
    'style="zoom: 32%; display: block; margin-left: auto; margin-right: auto;" />',
    '<figcaption class="na-figure-title"><strong>Fig 4.1  -</strong>  The Orangery From the Garden</figcaption>',
    '</figure>',
]
FIG_HIDDEN = [
    '<figure class="na-figure-block" style="margin-left: auto; margin-right: auto;">',
    '<img class="na-figure" src="./02__DocImages/04__Proposal__Visuals/Orangery__Interior__.png" '
    'style="zoom: 26%; display: block; margin-left: auto; margin-right: auto;" />',
    '<figcaption class="na-figure-title" hidden><strong>Fig 4.2  -</strong>  Inside the Orangery</figcaption>',
    '</figure>',
]
LOGO = ('<img src="./02__DocImages/00__Brand/ValeGardenHouses__Logo__.png" '
        'style="zoom: 18%; display: block; margin-left: auto; margin-right: 0;" />')

lines = []
add = lines.extend

add([LOGO, '', '',
     '## Design and Access Statement  -  Orangery Extension', '',
     '##### Applicant', '', 'Mr and Mrs A. Sample', '',
     '##### Site Address', '',
     'The Old Rectory', 'Church Lane', 'Sampleton', 'Exampleshire', 'AB1 2CD', '',
     '##### Local Planning Authority', '', 'Exampleshire District Council', '',
     '##### Date', '', '20<sup>th</sup> September 2026', '', ''])
add(DIVIDER + ['', '', ''])
add(['<div class="na-le-stmt-std-marker" data-na-standard-section="Contents">The contents of this statement are listed here.</div>', '', ''])
add(DIVIDER + ['', '', '', ''])
add(['### 1.0 |  Introduction', '', '',
     '#### 1.1 |  Purpose of This Statement', '',
     'This statement accompanies a householder application for a **timber orangery** to the rear of',
     'The Old Rectory. It explains the *design*, the ==materials== and how the building is reached.', '',
     'It replaces an earlier ~~conservatory~~ scheme, withdrawn in 2025.  ', 'The new scheme is smaller.', '',
     '#### 1.2 |  The Documents', '',
     '1. Drawings VG-001 to VG-006, at 1:50 and 1:100.',
     '2. This statement.',
     '3. A heritage note, as an appendix.', '', ''])
add(['### 2.0 |  The Site', '', '',
     '#### 2.1 |  Location', '',
     'The house stands at the end of a lane, set back behind a beech hedge. Its rear garden faces south west.', '', ''])
add([PIC_SITE, '', ZW + '\t\t**Fig 2.1  -**  Site Location  -  The House and Its Garden in Context', '', ''])
add(['Figure 2.1 above shows the site. It is prose, not a caption, and stays where it is.', '', ''])
add(CROPPED + ['', '   **Fig 2.2  -**  The Rear Garden  -  Where the Orangery Will Stand', '', ''])
add([PIC_PLAIN_ZW, '', ZW + 'Fig 2.3  -  The Side Path', '', '', '', ''])
add(DIVIDER + ['', '', '', ''])
add(['### 3.0 |  The Proposal', '', '',
     '#### 3.1 |  Materials', '',
     '- Hardwood frame, painted',
     '  - Sapele, factory primed',
     '  - Two finish coats on site',
     '- Lantern roof in toughened glass',
     '',
     '- Stone plinth to match the house', '',
     '| Element | Existing | Proposed |',
     '| :--- | :-: | ---: |',
     '| Walls | Brick, painted | Stone plinth and timber frame |',
     '| Roof | Slate | Glazed lantern \\| leaded flat |',
     '| Height | 2.4 m | 3.1 m |', '', '',
     '> The orangery is read as a garden building, not as a second house.',
     '> It stays below the first floor sills.', '',
     '<!-- A writer\'s note that never prints -->', '',
     '#### 3.2 |  Appearance', '', ''])
add(FIG_TITLED + ['', ''])
add(FIG_HIDDEN + ['', ''])
add(['A picture with no caption under it stays a bare picture:', '',
     '<img src="./02__DocImages/00__Brand/ValeGardenHouses__Mark__.png" style="zoom: 20%;" />', '', ''])
add(['---', '', '',
     '## ', '',
     '### 4.0 |  Conclusion', '', '',
     'The proposal is modest, well made and in keeping. We ask that it be approved.', '',
     'Vale Garden Houses',
     'Planning Team', ''])

text = '\n'.join(lines)
os.makedirs(ROOT, exist_ok=True)
path = os.path.join(ROOT, NAME)
with open(path, 'wb') as fh:
    fh.write(text.encode('utf-8'))
print(path, len(text.encode('utf-8')), 'bytes', text.count('\n'), 'newlines')
