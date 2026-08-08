/* =============================================================================
   NAAUDIO - HUD OVERLAY | HELP OVERLAY
   =============================================================================

   FILE       : NaAudio__Hud__HelpOverlay__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - HelpOverlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Say what this build actually is, and how to work it
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A dismissible card covering navigation, the shortcuts, the three demonstration
     modules, and an honest statement of what is and is not built.
   - Opens once on a first visit and thereafter only when asked, via the question mark
     button or the H key.

   ---------------------------------------------------------------------------

   THE SCOPE SECTION IS THE POINT

   A prototype that looks finished is a liability. This build renders a convincing
   spatial environment with three working modules, and somebody opening it cold could
   easily conclude the DAW described in the manifest exists.

   So the overlay states plainly what is real and what is designed-but-unbuilt. That is
   not modesty - it is the difference between a demonstration that informs the next
   decision and one that misleads it.

   ============================================================================= */

// =============================================================================
// REGION | Help Overlay
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Key and Content
    // ------------------------------------------------------------
    const SEEN_STORAGE_KEY  =  'NaAudio__HelpOverlay__Seen';

    const NAVIGATION_ROWS  =  [
        ['Orbit',            'Left mouse drag on empty space'],
        ['Pan',              'Right mouse drag, or two fingers'],
        ['Zoom',             'Scroll wheel'],
        ['Select a module',  'Click its pad'],
        ['Move a module',    'Drag its pad'],
        ['Clear selection',  'Click the floor']
    ];

    const SHORTCUT_ROWS  =  [
        ['Space',   'Start and stop the transport'],
        ['1 to 4',  'Fly to overview, plan, eye level, wide stage'],
        ['F',       'Frame the selected module'],
        ['L',       'Lock or unlock the selected module'],
        ['H',       'Show this card']
    ];

    const MODULE_ROWS  =  [
        ['Circular Sequencer', 'Steps on a circle rather than a grid, so the division count is free. Click a step to switch it on. Each ring is one drum voice, each with its own shape.'],
        ['CubeMod',            'Six XY pads on the faces of one cube - twelve dimensions of control. Drag a face to move its pad, click a side face to turn it forward.'],
        ['DelayCloud',         'A box whose dimensions are the effect. Length is reverb decay, width is delay time, height is damping. The spheres bounce, and each bounce is a tap.']
    ];

    const BUILT_ROWS  =  [
        'The 3D environment, lighting, camera and pointer interaction',
        'A lookahead audio scheduler with sample playback and voice management',
        'Three spatial modules, working, from the design manifest',
        'Patch cables that are the routing rather than a picture of it',
        'The working and locked module states, with real CPU and audio consequences',
        'A catalogued starter sample bank, loops and impulse responses'
    ];

    const NOT_BUILT_ROWS  =  [
        'The four synthesis engines - ChaosEngine, ContemplationEngine, FluxEngine, HarmonyEngine. CubeMod currently drives a small stand-in voice.',
        'The wider effect and modulator set - WaveFold, FractalEcho, DimensionMatrix, GravityMix and the rest. Deliberately absent rather than stubbed out.',
        'Rendered bounce and looped animation capture on lock. A locked module currently falls silent and freezes rather than replaying itself.',
        'A timeline. Integrating linear arrangement into a spatial context is named in the manifest as an open question, and it is still open.',
        'Saving. Nothing is written to disk - this is a static build with no server behind it yet.'
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let overlayElement  =  null;
    let toggleButton    =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Content Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Two-Column Definition Section
    // ------------------------------------------------------------
    function NaAudio__HelpOverlay__Section(titleText, rows, isKeyColumn) {
        const section  =  document.createElement('section');
        section.className  =  'NaAudio__Help__Section';

        const heading  =  document.createElement('h3');
        heading.className    =  'NaAudio__Help__Heading';
        heading.textContent  =  titleText;
        section.appendChild(heading);

        const list  =  document.createElement('dl');
        list.className  =  'NaAudio__Help__List';

        for (let i = 0; i < rows.length; i++) {
            const term  =  document.createElement('dt');
            term.className    =  'NaAudio__Help__Term' + (isKeyColumn ? ' NaAudio__Help__Term--key' : '');
            term.textContent  =  rows[i][0];

            const detail  =  document.createElement('dd');
            detail.className    =  'NaAudio__Help__Detail';
            detail.textContent  =  rows[i][1];

            list.appendChild(term);
            list.appendChild(detail);
        }

        section.appendChild(list);
        return section;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Bulleted Section
    // ------------------------------------------------------------
    function NaAudio__HelpOverlay__BulletSection(titleText, items, modifierClass) {
        const section  =  document.createElement('section');
        section.className  =  'NaAudio__Help__Section' + (modifierClass ? ' ' + modifierClass : '');

        const heading  =  document.createElement('h3');
        heading.className    =  'NaAudio__Help__Heading';
        heading.textContent  =  titleText;
        section.appendChild(heading);

        const list  =  document.createElement('ul');
        list.className  =  'NaAudio__Help__Bullets';

        for (let i = 0; i < items.length; i++) {
            const item  =  document.createElement('li');
            item.textContent  =  items[i];
            list.appendChild(item);
        }

        section.appendChild(list);
        return section;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Help Overlay and Its Toggle Button
    // ------------------------------------------------------------
    export function NaAudio__HelpOverlay__Build(mountElement, appMeta) {
        overlayElement  =  document.createElement('div');
        overlayElement.className  =  'NaAudio__Help';

        const card  =  document.createElement('div');
        card.className  =  'NaAudio__Help__Card';

        const header  =  document.createElement('header');
        header.className  =  'NaAudio__Help__Header';

        const title  =  document.createElement('h2');
        title.className    =  'NaAudio__Help__Title';
        title.textContent  =  (appMeta ? appMeta.AppName : 'AudioSPACE') + '  -  ' + (appMeta ? appMeta.AppStage : 'Environment Prototype');
        header.appendChild(title);

        const closeButton  =  document.createElement('button');
        closeButton.className    =  'NaAudio__Help__Close';
        closeButton.textContent  =  'Close';
        closeButton.addEventListener('click', function () { NaAudio__HelpOverlay__SetVisible(false); });
        header.appendChild(closeButton);

        card.appendChild(header);

        const intro  =  document.createElement('p');
        intro.className    =  'NaAudio__Help__Intro';
        intro.textContent  =  'A spatial environment for building a piece of music as a place rather than as a list of tracks. Everything you can see is a control, and everything that makes a sound is somewhere.';
        card.appendChild(intro);

        const columns  =  document.createElement('div');
        columns.className  =  'NaAudio__Help__Columns';

        const left  =  document.createElement('div');
        left.appendChild(NaAudio__HelpOverlay__Section('Navigation', NAVIGATION_ROWS, false));
        left.appendChild(NaAudio__HelpOverlay__Section('Keyboard',   SHORTCUT_ROWS,   true));

        const right  =  document.createElement('div');
        right.appendChild(NaAudio__HelpOverlay__Section('The three modules', MODULE_ROWS, false));

        columns.appendChild(left);
        columns.appendChild(right);
        card.appendChild(columns);

        const scope  =  document.createElement('div');
        scope.className  =  'NaAudio__Help__Columns NaAudio__Help__Columns--scope';
        scope.appendChild(NaAudio__HelpOverlay__BulletSection('What is built', BUILT_ROWS, 'NaAudio__Help__Section--built'));
        scope.appendChild(NaAudio__HelpOverlay__BulletSection('What is not built yet', NOT_BUILT_ROWS, 'NaAudio__Help__Section--pending'));
        card.appendChild(scope);

        overlayElement.appendChild(card);
        mountElement.appendChild(overlayElement);

        NaAudio__HelpOverlay__BuildToggle(mountElement);
        NaAudio__HelpOverlay__BindKeyboard();

        return overlayElement;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Persistent Question Mark Button
    // ------------------------------------------------------------
    function NaAudio__HelpOverlay__BuildToggle(mountElement) {
        toggleButton  =  document.createElement('button');
        toggleButton.className    =  'NaAudio__Help__Toggle';
        toggleButton.textContent  =  '?';
        toggleButton.title        =  'Show help  (H)';
        toggleButton.addEventListener('click', function () { NaAudio__HelpOverlay__SetVisible(true); });
        mountElement.appendChild(toggleButton);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind H and Escape
    // ------------------------------------------------------------
    function NaAudio__HelpOverlay__BindKeyboard() {
        window.addEventListener('keydown', function (event) {
            const target  =  event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

            if (event.code === 'KeyH') {
                NaAudio__HelpOverlay__SetVisible(!overlayElement.classList.contains('NaAudio__Help--visible'));
            } else if (event.code === 'Escape') {
                NaAudio__HelpOverlay__SetVisible(false);
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Show or Hide the Help Card
    // ------------------------------------------------------------
    export function NaAudio__HelpOverlay__SetVisible(isVisible) {
        if (!overlayElement) return;

        overlayElement.classList.toggle('NaAudio__Help--visible', isVisible);
        if (toggleButton) toggleButton.style.display  =  isVisible ? 'none' : '';

        if (isVisible) NaAudio__HelpOverlay__MarkSeen();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Card if This Is a First Visit
    // ------------------------------------------------------------
    export function NaAudio__HelpOverlay__ShowIfFirstVisit(showOnFirstBoot) {
        if (!showOnFirstBoot) return;
        if (NaAudio__HelpOverlay__HasBeenSeen()) return;
        NaAudio__HelpOverlay__SetVisible(true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the Card Has Been Seen Before
    // ------------------------------------------------------------
    // Wrapped in a try, because localStorage throws outright in a browser with storage
    // disabled or in some private modes - and being unable to remember that help was
    // shown is not a reason to fail the boot.
    function NaAudio__HelpOverlay__HasBeenSeen() {
        try {
            return window.localStorage.getItem(SEEN_STORAGE_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember That the Card Has Been Seen
    // ------------------------------------------------------------
    function NaAudio__HelpOverlay__MarkSeen() {
        try {
            window.localStorage.setItem(SEEN_STORAGE_KEY, 'true');
        } catch (error) {
            // Storage unavailable. The card will simply open again next time.
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
