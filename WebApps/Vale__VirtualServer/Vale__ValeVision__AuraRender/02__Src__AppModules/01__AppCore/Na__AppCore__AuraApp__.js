// =============================================================================
// VALEVISION AURA - APP CORE - THE APP (START-UP, ACCESS, TABS)
// =============================================================================
//
// FILE       : Na__AppCore__AuraApp__.js
// NAMESPACE  : Na__Aura
// MODULE     : App Core
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Start ValeVision AURA: who is here (Managers and App Admins only),
//              which project, its drawing set, the PainterlyNPR engine, and the
//              tabs (the 3D Environment, then the drawing sheets)
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE WAY IN: /aura/?project=<library id>, from a project in ValeVision
//   Gallery or from a card on /aura/ itself (0.5.8: the projects switched on,
//   then AURA's own scenes, 41__Feature__SceneIndex), signed in with the shared
//   Vale sign-in. Management and AppAdmin only for now (Adam, 30-Oct-2026):
//   anyone else is told plainly and sent back to the Gallery; every API route
//   refuses them too.
// - AURA'S OWN SCENES (0.5.8, ids AuraScene__<Name>): Example Cottage and Test,
//   no project behind them. Their crumbs lead back to /aura/, and they draw the
//   demo cottage without the "no whitecard" note.
// - ONLY SWITCHED-ON PROJECTS: a project opens once it is ticked "Available in
//   ValeVision AURA" in the Gallery's Project Editor. The API refuses the rest
//   (403, notSwitchedOn) and the page says why.
// - A PROJECT DRAWS ITS OWN MODEL (0.5.4: its AURA scene, made from ValeVision
//   3D's whitecard on its first open), else the engine's demo cottage; the
//   drawing set (sheets, viewports, notes, the engine's settings, saved views)
//   is the project's own.
// - THE ENGINE is booted once, on the 3D Environment's canvas, whichever tab
//   opens first: the sheets' pictures are drawn by the same engine.
// - Tabs: the 3D Environment pauses the sheets' render queue while it has the
//   engine; a sheet tab resumes it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 0.5.10
// - One hand for every word on the sheet: the Example Cottage's leader note
//   is the standard (the Steady hand with StepsPerChar 150 and MinNeatness
//   0.75, capitals, M018, Forest ink), for new notes, the title block and the
//   viewport titles (config only here; see the DEVLOG).
//
// 30-Oct-2026 - Version 0.5.9
// - A sun slider is the open scene's (Na__Environment3d__SceneSun__ keeps it):
//   the engine's settings are not saved again for it.
//
// 30-Oct-2026 - Version 0.5.8
// - /aura/ on its own shows the scene index (cards like Theia's) instead of
//   "Open AURA from a project". AURA's own scenes get crumbs back to it, no
//   ValeVision 3D menu item and no "no whitecard" note.
//
// 30-Oct-2026 - Version 0.4.8
// - Developer tools in the avatar menu (App Admins only): Download a
//   parameter dump, every setting the page holds in one JSON file
//   (Na__AppCore__ParameterDump__).
//
// 30-Oct-2026 - Version 0.3.1
// - Undo and redo start with the saving (Na__DrawingSet__History__, its
//   arrows in the header's #auraHistory); an undo or redo reopens the tab it
//   was made on and keeps the selection if it is still there (Na__Aura__Restored).
//
// 30-Oct-2026 - Version 0.2.2
// - The refresh guard starts with the saving (Na__DrawingSet__RefreshGuard__).
//
// 30-Oct-2026 - Version 0.1.2
// - A project that is not switched on for AURA gets its own message (Not
//   switched on for AURA) instead of the API's bare refusal.
//
// 30-Oct-2026 - Version 0.1.0
// - First build: the 3D Environment, A1 to A4 sheets in Vale's drawing page,
//   elevation, roof plan and 3D viewports, handwritten notes and leaders.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Load, Na__AppConfig__Get } from './Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__On, Na__AppState__Select, Na__AppState__Touch } from './Na__AppCore__AppState__.js';
    import { Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__Boot, Na__EngineHost__OnChange, Na__EngineHost__Settings, Na__EngineHost__Version } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__EngineHost__SceneNotes, Na__EngineHost__SceneOpen } from '../10__System__EngineHost/Na__EngineHost__Scene__.js';
    import { Na__Environment3d__Mount, Na__Environment3d__Show } from '../11__System__Environment3d/Na__Environment3d__Stage__.js';
    import { Na__Tabs__Mount, Na__Tabs__Open, Na__Tabs__Render, Na__Tabs__FromAddress } from '../20__System__DrawingSheets/Na__DrawingSheets__Tabs__.js';
    import { Na__Workspace__Mount, Na__Workspace__Show } from '../20__System__DrawingSheets/Na__DrawingSheets__Workspace__.js';
    import { Na__RenderQueue__Pause } from '../21__System__Viewports/Na__Viewports__RenderQueue__.js';
    import { Na__Persistence__Load, Na__Persistence__Start, Na__Persistence__Save } from '../40__Feature__DrawingSet/Na__DrawingSet__Persistence__.js';
    import { Na__RefreshGuard__Start } from '../40__Feature__DrawingSet/Na__DrawingSet__RefreshGuard__.js';
    import { Na__History__Start } from '../40__Feature__DrawingSet/Na__DrawingSet__History__.js';
    import { Na__ParameterDump__Download } from './Na__AppCore__ParameterDump__.js';
    import { Na__SceneIndex__Render } from '../41__Feature__SceneIndex/Na__SceneIndex__Page__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Aura__LOGO     = '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
    const Na__Aura__GALLERY  = '/project-gallery/';
    const Na__Aura__HOME     = './';                                             // <-- /aura/ on its own: the scene index
    const Na__Aura__SCENE_ID = /^AuraScene__/;                                   // <-- AURA's own scenes (no project behind them)
    const Na__Aura__Params   = new URLSearchParams(window.location.search);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Start-Up Spinner: change its words, or lift it (index.html draws it)
    // ------------------------------------------------------------
    const Na__Aura__Loader = {
        say(text) {
            const line = document.getElementById('auraLoadingText');
            if (line && text) line.textContent = text;
        },
        hide() {
            const overlay = document.getElementById('auraLoadingOverlay');
            if (!overlay || overlay.classList.contains('hidden')) return;
            overlay.classList.add('hidden');                                     // <-- Fades out, as ValeVision 3D's does
            setTimeout(() => overlay.remove(), 700);
        }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Whole-Page Message (no access, no project, no WebGL 2)
    // ------------------------------------------------------------
    function Na__Aura__Message(title, text, action) {
        Na__Aura__Loader.hide();
        ['auraTabs', 'auraEnvironment', 'auraSheets'].forEach((id) => { const el = document.getElementById(id); if (el) el.hidden = true; });
        const box = document.getElementById('auraMessage');
        Na__Dom__Clear(box);
        box.hidden = false;
        box.appendChild(Na__Dom__Icon('brush', 'aura-message__icon'));
        box.appendChild(Na__Dom__El('h1', 'aura-message__title', title));
        box.appendChild(Na__Dom__El('p', 'aura-message__text', text));
        if (action) {
            const link = Na__Dom__El('a', 'aura-button aura-button--primary', action.label, { href: action.href });
            box.appendChild(link);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Breadcrumbs: ValeVision Gallery > the project > AURA
    // ------------------------------------------------------------
    function Na__Aura__Crumbs(project) {
        const crumbs = document.getElementById('auraCrumbs');
        if (!crumbs) return;
        Na__Dom__Clear(crumbs);
        if (project.kind === 'scene') {                                          // <-- AURA's own scene: back to /aura/, not the Gallery
            const home = Na__Dom__El('a', 'aura-crumbs__link', null, { href: Na__Aura__HOME });
            home.appendChild(Na__Dom__Icon('back', 'aura-crumbs__chevron'));
            home.appendChild(Na__Dom__El('strong', null, 'AURA scenes'));
            crumbs.appendChild(home);
            crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__sep', '/'));
            crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__current', project.title));
            if (project.audience === 'Owner') crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__code', 'Only you'));
            crumbs.hidden = false;
            return;
        }
        const gallery = Na__Dom__El('a', 'aura-crumbs__link', null, { href: Na__Aura__GALLERY });
        gallery.appendChild(Na__Dom__Icon('back', 'aura-crumbs__chevron'));
        gallery.appendChild(Na__Dom__El('strong', null, 'ValeVision Gallery'));
        crumbs.appendChild(gallery);
        crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__sep', '/'));
        crumbs.appendChild(Na__Dom__El('a', 'aura-crumbs__link', project.title, { href: `${Na__Aura__GALLERY}?id=${encodeURIComponent(project.id)}` }));
        if (project.code) crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__code', project.code));
        crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__sep', '/'));
        crumbs.appendChild(Na__Dom__El('span', 'aura-crumbs__current', 'AURA'));
        crumbs.hidden = false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Header's Save State ("Saved", "Saving...", "Not saved")
    // ------------------------------------------------------------
    function Na__Aura__SaveState(text, kind) {
        const el = document.getElementById('auraSaveState');
        if (!el) return;
        el.textContent = text;
        el.dataset.state = kind || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tabs
// -----------------------------------------------------------------------------

    // FUNCTION | Show a Tab's Content (the strip has already marked it)
    // ------------------------------------------------------------
    function Na__Aura__ShowTab(tab) {
        const env = document.getElementById('auraEnvironment');
        const sheets = document.getElementById('auraSheets');
        const onEnv = tab === 'environment';
        env.hidden = !onEnv;
        sheets.hidden = onEnv;
        Na__RenderQueue__Pause(onEnv);                                          // <-- The live drawing has the engine
        if (onEnv) Na__Environment3d__Show();
        else {
            const sheet = Na__AppState__Data.doc.AuraDrawingSet__Sheets.find((s) => s.Sheet__Id === tab);
            if (sheet) Na__Workspace__Show(sheet);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is a Selected Viewport or Note on the Open Sheet?
    // ------------------------------------------------------------
    function Na__Aura__OnOpenSheet(sel) {
        const d = Na__AppState__Data;
        const sheet = (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab);
        if (!sheet || !sel) return false;
        return sel.kind === 'viewport' ? (sheet.Sheet__Viewports || []).some((v) => v.Viewport__Id === sel.id)
                                       : (sheet.Sheet__Annotations || []).some((a) => a.Annotation__Id === sel.id);
    }
    // ------------------------------------------------------------


    // FUNCTION | An Undo or Redo Wrote a Step Back: open the tab it was made on, drawn again
    // ------------------------------------------------------------
    // Showing a sheet clears the selection; what was selected is selected
    // again if it is still on the sheet now open.
    // ------------------------------------------------------------
    function Na__Aura__Restored(restore) {
        const keep = Na__AppState__Data.selection;
        Na__Tabs__Open(restore && restore.tab ? restore.tab : Na__AppState__Data.tab);
        if (keep && Na__Aura__OnOpenSheet(keep)) Na__AppState__Select(keep.kind, keep.id);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Project: its record, its drawing set, the engine, the tabs
    // ------------------------------------------------------------
    async function Na__Aura__OpenProject(projectId) {
        const d = Na__AppState__Data;
        Na__Aura__Loader.say('Opening the project...');
        let project;
        try {
            project = (await Na__Api__Get(`projects/${encodeURIComponent(projectId)}`)).project;
        } catch (error) {
            if (error.status === 403 && error.data && error.data.notSwitchedOn) {
                Na__Aura__Message('Not switched on for AURA',
                    'Projects open in AURA one at a time, once they are ticked "Available in ValeVision AURA" in ValeVision Gallery\'s Project Editor.',
                    { label: 'Back to ValeVision Gallery', href: Na__Aura__GALLERY });
            }
            else if (error.status === 403) Na__Aura__Message('Not available', error.message, { label: 'Back to ValeVision Gallery', href: Na__Aura__GALLERY });
            else if (error.status === 404 && Na__Aura__SCENE_ID.test(projectId)) Na__Aura__Message('Scene not found', `There is no AURA scene "${projectId}" open to you.`, { label: 'Back to AURA scenes', href: Na__Aura__HOME });
            else if (error.status === 404) Na__Aura__Message('Project not found', `There is no project "${projectId}" in the library.`, { label: 'Back to ValeVision Gallery', href: Na__Aura__GALLERY });
            else Na__Aura__Message('AURA could not open this project', error.message, { label: 'Back to ValeVision Gallery', href: Na__Aura__GALLERY });
            return;
        }
        d.project = project;
        document.title = `${project.title} - ValeVision AURA`;
        Na__Aura__Crumbs(project);

        Na__Aura__Loader.say('Loading the drawing set...');
        await Na__Persistence__Load(project, d.user);

        Na__Aura__Loader.say('Starting the pen and wash engine...');
        const canvas = document.getElementById('auraEngineCanvas');
        const boot = Na__EngineHost__Boot(canvas, document.getElementById('auraEngineStatus'), d.doc.AuraDrawingSet__Engine.Settings);
        if (!boot.ok) {
            Na__Aura__Message('AURA needs WebGL 2', `${boot.error} AURA runs in current Edge and Chrome on any desktop graphics card of the last decade.`);
            return;
        }
        document.getElementById('auraEngineVersion').textContent = `PainterlyNPR v${Na__EngineHost__Version()}`;
        Na__EngineHost__OnChange((reason) => {
            if (reason === 'sun') return;                                        // <-- The open scene's, kept by Na__Environment3d__SceneSun__ (0.5.9)
            d.doc.AuraDrawingSet__Engine.Settings = Na__EngineHost__Settings();
            Na__AppState__Touch('engine');
        });

        Na__Aura__Loader.say('Loading the AURA scene...');
        const scene = await Na__EngineHost__SceneOpen(projectId, (text) => Na__Aura__Loader.say(text));   // <-- The project's own model in the cottage's place, before anything is drawn (0.5.4)

        Na__Environment3d__Mount(document.getElementById('auraEnvironment'), canvas);
        Na__Workspace__Mount(document.getElementById('auraSheets'), () => Na__Tabs__Render());
        Na__Persistence__Start(Na__Aura__SaveState);
        Na__RefreshGuard__Start();                                               // <-- Ctrl + R and F5 ask first: save, cancel, or abandon (0.2.2)
        Na__History__Start(document.getElementById('auraHistory'));              // <-- Undo and redo: Ctrl + Z, Ctrl + Y and the header's arrows (0.3.1)
        Na__AppState__On('restored', Na__Aura__Restored);                       // <-- After the modules' own listeners: they take their state from the drawing set first
        document.getElementById('auraTabs').hidden = false;
        Na__Tabs__Mount(document.getElementById('auraTabs'), Na__Aura__ShowTab);
        Na__Tabs__Open(Na__Tabs__FromAddress());
        Na__Aura__Loader.hide();
        if (!(project.kind === 'scene' && scene && scene.Reason === 'noWhitecard')) {
            Na__EngineHost__SceneNotes(projectId, scene);                        // <-- A newer whitecard, or no scene: a note once the app is up (an AURA scene is the cottage on purpose)
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Start the App: config, sign-in, the level gate, then the project
    // ------------------------------------------------------------
    async function Na__Aura__Boot() {
        await Na__AppConfig__Load();
        const projectId = (Na__Aura__Params.get('project') || '').trim();
        const brand = document.querySelector('.aura-header__brand');
        if (brand) brand.setAttribute('href', Na__Aura__GALLERY);
        Na__Aura__Loader.say('Checking your sign-in...');
        window.ValeUserLogin.Init({
            appName   : 'ValeVision AURA',
            logoUrl   : Na__Aura__LOGO,
            apiBase   : 'api/',
            mountEl   : '#auraUserSlot',
            required  : true,
            menuItems : [
                { label: 'Open ValeVision Gallery', onClick: () => { window.location.href = Na__Aura__GALLERY; } },
                ...(projectId && !Na__Aura__SCENE_ID.test(projectId) ? [{ label: 'Open this project in ValeVision 3D', onClick: () => { window.location.href = `/valevision/?project=${encodeURIComponent(projectId)}`; } }] : []),
                ...(projectId ? [{ label: 'All AURA scenes', onClick: () => { window.location.href = Na__Aura__HOME; } }] : []),
                { label: 'Save the drawing set now', minLevel: 'Management', onClick: () => Na__Persistence__Save() },
                { label: 'Download a parameter dump', adminOnly: true, section: 'Developer tools', onClick: () => Na__ParameterDump__Download() }   // <-- Every setting, one JSON file (0.4.8)
            ],
            onReady   : async (user) => {
                Na__AppState__Data.user = user;
                const minimum = Na__AppConfig__Get('Access__MinimumLevel', 'Management');
                if (!window.ValeUserLogin.HasLevel(minimum)) {                   // <-- Managers and App Admins only, for now
                    Na__Aura__Message('AURA is not open to you yet',
                        'ValeVision AURA is in its first version and open to Vale managers only for now. Your projects are all in ValeVision Gallery.',
                        { label: 'Back to ValeVision Gallery', href: Na__Aura__GALLERY });
                    return;
                }
                if (!projectId) {                                                // <-- /aura/ on its own: the projects switched on, then AURA's own scenes (0.5.8)
                    Na__Aura__Loader.hide();
                    await Na__SceneIndex__Render(document.getElementById('auraRoot'));
                    return;
                }
                await Na__Aura__OpenProject(projectId);
            }
        });
    }
    // ------------------------------------------------------------

    Na__Aura__Boot().catch((error) => {
        console.error('[AURA] Start-up failed:', error);
        Na__Aura__Message('AURA could not start', String(error && error.message || error));
    });

// endregion -------------------------------------------------------------------
