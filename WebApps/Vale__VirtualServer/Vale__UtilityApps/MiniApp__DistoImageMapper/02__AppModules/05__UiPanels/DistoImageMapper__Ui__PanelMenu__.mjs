/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | PANEL MENU
   =============================================================================

   FILE       : DistoImageMapper__Ui__PanelMenu__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : UiPanels - PanelMenu
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The right-hand menu: its sections folding one at a time, the groups
                nested inside them, the grip that widens it, and folding it away
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - Adam, 06-Nov-2026: "Move menu to right side. Add dropdown nested menus like ValeVision
     3D as the menu is too complex and overwhelming when you first open it, nest complexity.
     Ensure menu can be dragged left to resize if user needs wider."
   - ONE SECTION AT A TIME, as ValeVision 3D's Tools & Settings opens its rows (Adam's
     pick): unfolding one folds the rest, and pressing an open one folds it. On a first
     visit only the survey's summary shows (his pick); every section starts folded.
   - NESTED GROUPS (details elements) hold what is used less: they open and shut on
     their own, inside their section.
   - THE GRIP on the menu's left edge widens it as it is dragged left, between the
     config's Panel limits. Double-click it, or press Home on it, for the usual width.
     The arrow keys move it in steps.
   - All of it is the settings file's Panel block (AppCore - UserConfig): WidthPx,
     Folded, OpenSection and OpenGroups. A phone always starts with the menu folded.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__UserConfig__Get, DistoImageMapper__UserConfig__Save } from '../01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs';


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Phones
    // ------------------------------------------------------------
    const PHONE_QUERY  =  '(max-width: 760px)';                             // <-- As the stylesheet's phone layout
    // ------------------------------------------------------------


    // MODULE VARIABLES | Elements and a Drag
    // ------------------------------------------------------------
    let Elements  =  null;                                                   // <-- { Stage, Panel, Grip, Toggle }
    let Buttons   =  [];
    let Drag      =  null;                                                   // <-- { PointerId, StartX, StartWidth }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Width
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Settings File's Panel Block, and the Config's Limits
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__Saved() {
        return DistoImageMapper__UserConfig__Get('Panel');
    }

    function DistoImageMapper__Ui__PanelMenu__Cfg() {
        return DistoImageMapper__Config__Section('Panel');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Width Inside the Limits: Never Wider Than a Share of the Window
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__Clamp(widthPx) {
        const config   =  DistoImageMapper__Ui__PanelMenu__Cfg();
        const room     =  Elements.Stage.clientWidth || window.innerWidth;
        const maximum  =  Math.max(config.WidthMinimumPx, Math.min(config.WidthMaximumPx, room * config.WidthMaximumShare));
        const width    =  Number.isFinite(widthPx) ? widthPx : config.WidthDefaultPx;
        return Math.round(Math.min(Math.max(width, config.WidthMinimumPx), maximum));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Set the Menu's Width (the stage's grid reads the variable)
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__ApplyWidth(widthPx) {
        const width  =  DistoImageMapper__Ui__PanelMenu__Clamp(widthPx);
        Elements.Stage.style.setProperty('--DistoImageMapper_PanelWidth', `${width}px`);
        Elements.Grip.setAttribute('aria-valuenow', String(width));
        return width;
    }

    function DistoImageMapper__Ui__PanelMenu__KeepWidth(widthPx) {
        DistoImageMapper__Ui__PanelMenu__Saved().WidthPx  =  DistoImageMapper__Ui__PanelMenu__ApplyWidth(widthPx);
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Grip: Drag Left to Widen, Double-Click or Home for the Usual Width, Arrows in Steps
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__BindGrip() {
        const grip  =  Elements.Grip;
        grip.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            event.preventDefault();
            Drag  =  { PointerId : event.pointerId, StartX : event.clientX, StartWidth : Number(grip.getAttribute('aria-valuenow')) };
            grip.setPointerCapture(event.pointerId);
            Elements.Stage.classList.add('is-resizing-panel');
        });
        grip.addEventListener('pointermove', event => {
            if (!Drag || event.pointerId !== Drag.PointerId) return;
            DistoImageMapper__Ui__PanelMenu__ApplyWidth(Drag.StartWidth + Drag.StartX - event.clientX);   // <-- By the distance moved: grabbing the grip off its middle never jumps the edge
        });
        const release  =  event => {
            if (!Drag || event.pointerId !== Drag.PointerId) return;
            Drag  =  null;
            Elements.Stage.classList.remove('is-resizing-panel');
            DistoImageMapper__Ui__PanelMenu__KeepWidth(Number(grip.getAttribute('aria-valuenow')));
        };
        grip.addEventListener('pointerup', release);
        grip.addEventListener('pointercancel', release);
        grip.addEventListener('dblclick', () => DistoImageMapper__Ui__PanelMenu__KeepWidth(DistoImageMapper__Ui__PanelMenu__Cfg().WidthDefaultPx));
        grip.addEventListener('keydown', event => {
            const step  =  DistoImageMapper__Ui__PanelMenu__Cfg().KeyStepPx;
            const now   =  Number(grip.getAttribute('aria-valuenow'));
            if (event.key === 'ArrowLeft')  DistoImageMapper__Ui__PanelMenu__KeepWidth(now + step);
            else if (event.key === 'ArrowRight') DistoImageMapper__Ui__PanelMenu__KeepWidth(now - step);
            else if (event.key === 'Home') DistoImageMapper__Ui__PanelMenu__KeepWidth(DistoImageMapper__Ui__PanelMenu__Cfg().WidthDefaultPx);
            else return;
            event.preventDefault();
        });
        window.addEventListener('resize', () => DistoImageMapper__Ui__PanelMenu__ApplyWidth(DistoImageMapper__Ui__PanelMenu__Saved().WidthPx));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sections, Groups and Folding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Show One Section Unfolded ('' for none)
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__ShowSection(key) {
        for (const button of Buttons) {
            const isOpen  =  button.dataset.menu === key;
            button.setAttribute('aria-expanded', String(isOpen));
            button.closest('.DistoImageMapper__Menu__Item').classList.toggle('is-open', isOpen);
            const panel  =  document.getElementById(button.getAttribute('aria-controls'));
            if (panel) panel.hidden  =  !isOpen;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Unfold a Section, Folding the Rest ('' folds them all), and Remember It
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__PanelMenu__OpenSection(key) {
        if (!Elements) return;
        DistoImageMapper__Ui__PanelMenu__ShowSection(key || '');
        DistoImageMapper__Ui__PanelMenu__Saved().OpenSection  =  key || '';
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fold the Whole Menu Away, or Bring It Back
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__PanelMenu__SetFolded(isFolded, remember) {
        Elements.Stage.classList.toggle('is-panel-collapsed', isFolded);
        Elements.Toggle.setAttribute('aria-expanded', String(!isFolded));
        if (!remember) return;
        DistoImageMapper__Ui__PanelMenu__Saved().Folded  =  isFolded;
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Menu (Once): { Stage, Panel, Grip, Toggle }
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__PanelMenu__Mount(elements) {
        Elements  =  elements;
        const saved  =  DistoImageMapper__Ui__PanelMenu__Saved();

        Buttons  =  Array.from(Elements.Panel.querySelectorAll('[data-menu]'));
        Buttons.forEach(button => button.addEventListener('click', () => {
            const isOpen  =  button.getAttribute('aria-expanded') === 'true';
            DistoImageMapper__Ui__PanelMenu__OpenSection(isOpen ? '' : button.dataset.menu);
        }));
        const known  =  Buttons.some(button => button.dataset.menu === saved.OpenSection);
        DistoImageMapper__Ui__PanelMenu__ShowSection(known ? saved.OpenSection : '');   // <-- A first visit: every section folded

        const groups  =  saved.OpenGroups && typeof saved.OpenGroups === 'object' ? saved.OpenGroups : (saved.OpenGroups = {});
        Elements.Panel.querySelectorAll('details[data-menu-group]').forEach(group => {
            group.open  =  Boolean(groups[group.dataset.menuGroup]);
            group.addEventListener('toggle', () => {
                groups[group.dataset.menuGroup]  =  group.open;
                DistoImageMapper__UserConfig__Save();
            });
        });

        DistoImageMapper__Ui__PanelMenu__ApplyWidth(saved.WidthPx);
        DistoImageMapper__Ui__PanelMenu__BindGrip();

        Elements.Toggle.addEventListener('click', () => {
            const isFolded  =  !Elements.Stage.classList.contains('is-panel-collapsed');
            DistoImageMapper__Ui__PanelMenu__SetFolded(isFolded, !window.matchMedia(PHONE_QUERY).matches);   // <-- A phone's folding is never kept
        });
        const isPhone  =  window.matchMedia(PHONE_QUERY).matches;
        DistoImageMapper__Ui__PanelMenu__SetFolded(isPhone || saved.Folded === true, false);   // <-- A phone starts on the view, not the menu
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
