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
   - A dismissible card covering the three modes, navigation, the shortcuts, the three
     demonstration modules, the sequencer control bank and the wiring system, plus an
     honest statement of what is and is not built.
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

    const MODE_ROWS  =  [
        ['Play',        'Work the controls. Steps, faces, knobs and sliders are all live, and modules are pinned where they stand so a control drag can never move one.'],
        ['Build',       'Arrange the space. Drag any module pad to reposition it, and every control and cable is frozen - a stray click cannot alter a pattern you have already programmed.'],
        ['Wiring',      'Patch the signal. Modules are pinned and every control is frozen; the sockets and the leads are the only live things in the scene.'],
        ['Which is on', 'The coloured rule across the top edge, the switch beneath it, and the pointer cursor. Blue is Build, green is Play, ochre is Wiring.']
    ];

    const WIRING_ROWS  =  [
        ['The output post', 'The tapered post at the centre is the way out of the space. Anything with a path of leads into it is audible; anything without one is silent, however loud it is. The column on top is the master meter.'],
        ['Sockets',         'Green is an input, terracotta is an output. Every instrument has one of each. They are always visible and come forward in Wiring mode.'],
        ['Patching',        'Drag from a socket to a socket. Either direction - the lead sorts out which way the signal runs. Or click one socket, move, and click the second, which is easier across a long span.'],
        ['Unplugging',      'Click the lead itself, anywhere along its length. A socket with three leads in it cannot say which one a click meant; the lead can.'],
        ['Series, parallel','Two instruments straight into the post are heard dry, side by side. One into an effect and the effect into the post is heard only processed. Nothing enforces either - they are just what the leads do.'],
        ['Escape',          'Drops a lead you are holding.']
    ];

    const NAVIGATION_ROWS  =  [
        ['Orbit',            'Left mouse drag on empty space'],
        ['Pan',              'Right mouse drag, or two fingers'],
        ['Zoom',             'Scroll wheel'],
        ['Select a module',  'Click its pad, in either mode'],
        ['Move a module',    'Drag its pad, in Build mode only'],
        ['Clear selection',  'Click the floor'],
        ['Patch two modules','Drag socket to socket, in Wiring mode only'],
        ['Unplug a lead',    'Click the lead, in Wiring mode only']
    ];

    const SHORTCUT_ROWS  =  [
        ['Tab',     'Step through Build, Play and Wiring. Shift+Tab steps back'],
        ['Space',   'Start and stop the transport'],
        ['1 to 4',  'Fly to overview, plan, eye level, wide stage'],
        ['F',       'Frame the selected module'],
        ['L',       'Lock or unlock the selected module'],
        ['H',       'Show this card']
    ];

    const MODULE_ROWS  =  [
        ['Circular Sequencer', 'Steps on a circle rather than a grid, so the division count is free. Click a step to switch it on - lit steps are solid, silent ones nearly transparent. A triangle outside the rings points at the start of the cycle. Each ring is one drum voice, each with its own shape.'],
        ['CubeMod',            'Six XY pads on the faces of one cube - twelve dimensions of control. Drag a face to move its pad, click a side face to turn it forward.'],
        ['DelayCloud',         'A box whose dimensions are the effect. Length is reverb decay, width is delay time, height is damping. The spheres bounce, and each bounce is a tap.']
    ];

    const SEQUENCER_ROWS  =  [
        ['Opening it up', 'The small square on the near corner of the pad doubles the base width and reveals the control bank. Press it again to fold it away.'],
        ['Cycle',         'How long one revolution takes - four bars down to a quarter of a bar. The slider clicks into those positions rather than sweeping between them.'],
        ['Feel',          'Where the steps sit on the circle. Regular is even; on-beat snaps to the beat grid; triplet and dotted push every other step late by a third or a quarter.'],
        ['Wobble',        'How far a step can drift from its slot, like a record player losing a little speed. A drifting step also detunes slightly flat, because a slow platter is a flat one.'],
        ['Chance',        'How often that drift happens. Wobble sets the size, Chance sets the odds - the pair together is what gives it its loose, unquantised feel.'],
        ['Bank',          'Four kit positions. A placeholder for a larger kit browser, but the kits behind it are real.']
    ];

    const BUILT_ROWS  =  [
        'The 3D environment, lighting, camera and pointer interaction',
        'Build, Play and Wiring modes, gating every handle in the scene',
        'A ground field that forms soft islands under clusters of modules',
        'Hand patching - sockets on every module, leads you drag, and one output post',
        'A lookahead audio scheduler with sample playback and voice management',
        'Three spatial modules, working, from the design manifest',
        'The sequencer control bank - cycle, feel, wobble, chance and kit',
        'Patch cables that are the routing rather than a picture of it, as leads with plugs and sprung slack',
        'The working and locked module states, with real CPU and audio consequences',
        'A catalogued starter sample bank, loops and impulse responses'
    ];

    const NOT_BUILT_ROWS  =  [
        'Wiring utilities - splitters, mergers, switchboards, sends and returns. The socket and lead system was built with them in mind, and none of them exist yet.',
        'Grouping. The ground field already carries a colour per source that nothing reads, so a group tinting its own island is close - but there is no way to make a group.',
        'The four synthesis engines - ChaosEngine, ContemplationEngine, FluxEngine, HarmonyEngine. CubeMod currently drives a small stand-in voice.',
        'The wider effect and modulator set - WaveFold, FractalEcho, DimensionMatrix, GravityMix and the rest. Deliberately absent rather than stubbed out.',
        'Per-step velocity on the sequencer. The step blocks are sized from a velocity value that is wired through and currently pinned at full for every step - there is no gesture to change it yet.',
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
        intro.textContent  =  'A spatial environment for building a piece of music as a place rather than as a list of tracks. Everything you can see is a control, everything that makes a sound is somewhere, and the ground only exists where the music does.';
        card.appendChild(intro);

        const columns  =  document.createElement('div');
        columns.className  =  'NaAudio__Help__Columns';

        const left  =  document.createElement('div');
        left.appendChild(NaAudio__HelpOverlay__Section('Three modes', MODE_ROWS,       false));
        left.appendChild(NaAudio__HelpOverlay__Section('Navigation', NAVIGATION_ROWS, false));
        left.appendChild(NaAudio__HelpOverlay__Section('Keyboard',   SHORTCUT_ROWS,   true));

        const right  =  document.createElement('div');
        right.appendChild(NaAudio__HelpOverlay__Section('The three modules',           MODULE_ROWS,    false));
        right.appendChild(NaAudio__HelpOverlay__Section('The sequencer control bank',  SEQUENCER_ROWS, false));
        right.appendChild(NaAudio__HelpOverlay__Section('Signal and wiring',            WIRING_ROWS,    false));

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
