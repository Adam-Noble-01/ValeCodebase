// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - VIEWPORT IDENTITY
// =============================================================================
//
// FILE       : Na__LayoutEditor__ViewportIdentity__.js
// NAMESPACE  : Na__LeViewId
// MODULE     : Layout Editor - Viewport Identity
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Say what a viewport is a drawing OF - plan or elevation, and which way an elevation faces - and name unnamed elevation viewports from it
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - TITLING ELEVATIONS BY HAND IS A CHORE, and what a title says is already
//   known: an elevation's bearing against the project's north says North,
//   East, South or West. This module reaches in for those facts, once, for
//   everything that wants them:
//       Describe(viewport) -> { kind, phase, facing, name, drawing }
// - PHASE IS NEVER KNOWN HERE. In TrueVision it is the model group a viewport
//   draws - existing building or proposed scheme. This app loads one model
//   per project and has no groups to read, so every phase is unknown and a
//   title writes Existing or Proposed only when its own settings say so.
// - FACING is the elevation record's azimuth read against the project's north
//   (47__System__NorthDirection). Until north is set it is empty, and a title
//   shows {{Direction}} rather than the app's old guess that the model's -Z
//   axis is north - a guess that seeds a building's north elevation as east
//   whenever the model was not drawn with north up the page.
// - NAME is a name somebody TYPED on the viewport. A paste's placeholder
//   ("East Elevation copy") is not one: a sheet's proposed elevations are
//   often copies of its existing ones, still carrying those names, and a
//   title reading "EAST ELEVATION COPY" is nobody's intention.
// - UNNAMED ELEVATION VIEWPORTS ARE NAMED HERE, through the model's
//   RegisterViewportNamer: "North Elevation" in the panels, the link
//   menus, the toasts and the frame caption, once north is set. A typed name
//   always wins, and nothing is ever written to a record - it is a name
//   derived on the spot, so it can never go stale.
// - A CHANGE OF NORTH changes names without changing a sheet. CHANGED_EVENT
//   says so, for whoever draws them.
//
// INTEGRATION:
// - Na__LayoutEditor__ModeController__ calls Initialize once.
// - 57__Feature__ScrapbookParametric/...ScrapbookParametric__ViewportLink__
//   fills a parametric title's facts from Describe.
// // @delegate: ./Na__LayoutEditor__ViewportTitleText__.js
// // @delegate: ../../47__System__NorthDirection/Na__North__ProjectJson__Data__.js
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js,
//                   its 1.0.0 (TrueVision v2.85.0)
// - Ported on     : 20-Sep-2026 for ValeVision3D v2.67.0
// - Parity        : adapted
// - Divergences   : NO PHASE. TrueVision reads Existing or Proposed off the model group a viewport
//                   draws (its Model Source and phase library). This app loads one model per
//                   project, so PhaseOf answers unknown for every viewport and a title writes no
//                   qualifier unless its own settings force one. NO SITE PLAN BRANCH: this app has
//                   no site plan viewports. Everything else - facing, typed names, the namer - is
//                   TrueVision's.
// - Back-port     : n/a. If model groups ever arrive here, take TrueVision's PhaseOf whole.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
// - Ported from TrueVision3D's 1.0.0, without the phase and site plan branches
//   (see PORT NOTE).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Model, Labels, the Model Source, Copy Names and the Title Text
    // ------------------------------------------------------------
    import {
        Na__LeModel__KIND_3D,
        Na__LeModel__ResolveViewportSource,
        Na__LeModel__RegisterViewportNamer
    } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
    import { Na__LeClip__IsCopyName } from './Na__LayoutEditor__ViewportClipboard__.js';
    import {
        Na__LeViewText__KIND_NONE,
        Na__LeViewText__KIND_ELEVATION,
        Na__LeViewText__KIND_SECTION,
        Na__LeViewText__KIND_PLAN,
        Na__LeViewText__KIND_3D,
        Na__LeViewText__PHASE_NONE,
        Na__LeViewText__MODE_AUTO,
        Na__LeViewText__WORDS,
        Na__LeViewText__Compose
    } from './Na__LayoutEditor__ViewportTitleText__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Elevations and the Project's North
    // ------------------------------------------------------------
    import { Na__ElevData__IsSection } from '../../46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js';
    import { Na__NorthCfg__Load } from '../../47__System__NorthDirection/Na__North__ConfigState__.js';
    import { Na__NorthData__CHANGED_EVENT, Na__NorthData__IsSet, Na__NorthData__FacingWordForAzimuth } from '../../47__System__NorthDirection/Na__North__ProjectJson__Data__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Location, Key Prefix and the Event
    // ------------------------------------------------------------
    const Na__LeViewId__ConfigUrl     = new URL('./Na__LayoutEditor__ViewportIdentity__Config__.json', import.meta.url);
    const Na__LeViewId__PREFIX        = 'LayoutEditor__ViewportIdentity__';
    const Na__LeViewId__CHANGED_EVENT = 'na-layouteditor-viewport-identity-changed';   // <-- detail : { reason : 'north' | 'config' }
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Fetched Config and Whether the Namer Is In
    // ------------------------------------------------------------
    let Na__LeViewId__Config      = null;
    let Na__LeViewId__LoadPromise = null;
    let Na__LeViewId__Initialized = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch the Config Once (and the North System's, for Its Compass Words)
    // ------------------------------------------------------------
    // Never rejects: every value has a fallback equal to the shipped one. A
    // name asked for before this settles is written in the fallbacks, which
    // are the same words.
    // ------------------------------------------------------------
    function Na__LeViewId__Ready() {
        if (!Na__LeViewId__LoadPromise) {
            Na__LeViewId__LoadPromise = (async () => {
                try {
                    const response = await fetch(Na__LeViewId__ConfigUrl, { cache : 'no-store' });
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    Na__LeViewId__Config = await response.json();
                } catch (error) {
                    console.warn('[ValeVision3D LayoutEditor] Viewport identity config unavailable - using built-in defaults.', error);
                    Na__LeViewId__Config = null;
                }
                await Na__NorthCfg__Load();
                Na__LeViewId__Announce('config');
                return Na__LeViewId__Config;
            })();
        }
        return Na__LeViewId__LoadPromise;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Block of the Config, or an Empty One
    // ------------------------------------------------------------
    function Na__LeViewId__Block(name) {
        const block = Na__LeViewId__Config ? Na__LeViewId__Config[Na__LeViewId__PREFIX + name] : null;
        return (block && typeof block === 'object' && !Array.isArray(block)) ? block : {};
    }
    // ------------------------------------------------------------


    // FUNCTION | The Words a Name Is Written In, in the Title Text's Own Keys
    // ------------------------------------------------------------
    function Na__LeViewId__Words() {
        const block = Na__LeViewId__Block('Words');
        const words = {};
        Object.keys(Na__LeViewText__WORDS).forEach((key) => {
            const value = block['Words__' + key];
            words[key] = (typeof value === 'string' && value.trim() !== '') ? value.trim() : Na__LeViewText__WORDS[key];
        });
        return words;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Naming Settings
    // ------------------------------------------------------------
    function Na__LeViewId__Naming() {
        const block = Na__LeViewId__Block('Naming');
        return { nameElevations : block.Naming__NameElevationViewports !== false, includePhase : block.Naming__IncludePhase !== false };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Facts About a Viewport
// -----------------------------------------------------------------------------

    // FUNCTION | Which Design Phase a Viewport Draws: Always Unknown in This App
    // ------------------------------------------------------------
    // '' for every viewport. This app loads one model per project: there is
    // no existing-against-proposed to read, as there is in TrueVision's model
    // groups. Kept as a function so whatever asks for a phase asks here, and
    // the day this app has phases this is the one place that learns of them.
    // ------------------------------------------------------------
    function Na__LeViewId__PhaseOf(viewport) {
        return Na__LeViewText__PHASE_NONE;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Facts About a Viewport, From What It Has Already Been Resolved To
    // ------------------------------------------------------------
    // parts is { plan, elevation, scene } as the model resolves them. This is
    // the namer's route: the model hands the parts over, so nothing here
    // calls ResolveViewportSource, which would call the namer.
    // ------------------------------------------------------------
    function Na__LeViewId__DescribeFrom(viewport, parts) {
        const none = { kind : Na__LeViewText__KIND_NONE, phase : Na__LeViewText__PHASE_NONE, facing : '', name : '', drawing : '' };
        if (!viewport) return none;
        const given     = parts || {};
        const typed     = (typeof viewport.Viewport__Name === 'string') ? viewport.Viewport__Name.trim() : '';
        const name      = (typed !== '' && !Na__LeClip__IsCopyName(viewport)) ? typed : '';   // <-- A paste's placeholder is not a name anybody chose
        const phase     = Na__LeViewId__PhaseOf(viewport);

        if (viewport.Viewport__Kind === Na__LeModel__KIND_3D) {
            const scene = given.scene || null;
            return { kind : Na__LeViewText__KIND_3D, phase : phase, facing : '', name : name, drawing : (scene && typeof scene.PresentationMode__Scene__Name === 'string') ? scene.PresentationMode__Scene__Name : '' };
        }
        if (given.plan) {
            return { kind : Na__LeViewText__KIND_PLAN, phase : phase, facing : '', name : name, drawing : given.plan.FloorPlan__Name || '' };
        }
        if (given.elevation) {
            const section = Na__ElevData__IsSection(given.elevation);
            return {
                kind    : section ? Na__LeViewText__KIND_SECTION : Na__LeViewText__KIND_ELEVATION,
                phase   : phase,
                facing  : Na__NorthData__FacingWordForAzimuth(Number(given.elevation.Elevation__AzimuthDeg)),   // <-- '' until north is set
                name    : name,
                drawing : given.elevation.Elevation__Name || ''
            };
        }
        return Object.assign({}, none, { phase : phase, name : name });           // <-- A 2D viewport whose drawing has gone: still a viewport, of nothing
    }
    // ------------------------------------------------------------


    // FUNCTION | The Facts About a Viewport
    // ------------------------------------------------------------
    // { kind, phase, facing, name, drawing } - see the title text module.
    // ------------------------------------------------------------
    function Na__LeViewId__Describe(viewport) {
        if (!viewport) return Na__LeViewId__DescribeFrom(null, null);
        const source = Na__LeModel__ResolveViewportSource(viewport);
        return Na__LeViewId__DescribeFrom(viewport, { plan : source.plan, elevation : source.elevation, scene : source.scene });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Viewport's Title, Composed
    // ------------------------------------------------------------
    // options as the title text module's: { phaseMode, uppercase, override }.
    // Returns { text, resolved, missing }.
    // ------------------------------------------------------------
    function Na__LeViewId__TitleFor(viewport, options) {
        return Na__LeViewText__Compose(Na__LeViewId__Describe(viewport), options || {}, Na__LeViewId__Words());
    }
    // ------------------------------------------------------------


    // FUNCTION | Has North Been Set (what an unresolved direction is waiting for)
    // ------------------------------------------------------------
    function Na__LeViewId__IsNorthSet() {
        return Na__NorthData__IsSet();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Naming Unnamed Elevation Viewports
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Model's Namer: a Name for an Elevation Viewport Nobody Has Named
    // ------------------------------------------------------------
    // '' - no opinion - for anything but an elevation whose direction is
    // known, so plans, sections, 3D pictures and every viewport on a project
    // without a north keep exactly the names they had.
    // ------------------------------------------------------------
    function Na__LeViewId__NameFor(viewport, parts) {
        const naming = Na__LeViewId__Naming();
        if (!naming.nameElevations) return '';
        const facts = Na__LeViewId__DescribeFrom(viewport, parts);
        if (facts.kind !== Na__LeViewText__KIND_ELEVATION || facts.facing === '') return '';
        const told = Na__LeViewText__Compose(
            { kind : facts.kind, phase : naming.includePhase ? facts.phase : Na__LeViewText__PHASE_NONE, facing : facts.facing, name : '', drawing : '' },
            { phaseMode : Na__LeViewText__MODE_AUTO, uppercase : false }, Na__LeViewId__Words());
        return told.resolved ? told.text : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Tell Whoever Draws Names That They May Have Changed
    // ------------------------------------------------------------
    function Na__LeViewId__Announce(reason) {
        window.dispatchEvent(new CustomEvent(Na__LeViewId__CHANGED_EVENT, { detail : { reason : reason } }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Install the Namer and Follow North (once)
    // ------------------------------------------------------------
    function Na__LeViewId__Initialize() {
        if (Na__LeViewId__Initialized) return false;
        Na__LeViewId__Initialized = true;
        Na__LeModel__RegisterViewportNamer(Na__LeViewId__NameFor);
        window.addEventListener(Na__NorthData__CHANGED_EVENT, () => Na__LeViewId__Announce('north'));
        void Na__LeViewId__Ready();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Viewport Identity API
    // ------------------------------------------------------------
    export {
        Na__LeViewId__CHANGED_EVENT,
        Na__LeViewId__Ready,
        Na__LeViewId__Words,
        Na__LeViewId__PhaseOf,
        Na__LeViewId__DescribeFrom,
        Na__LeViewId__Describe,
        Na__LeViewId__TitleFor,
        Na__LeViewId__IsNorthSet,
        Na__LeViewId__NameFor,
        Na__LeViewId__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
