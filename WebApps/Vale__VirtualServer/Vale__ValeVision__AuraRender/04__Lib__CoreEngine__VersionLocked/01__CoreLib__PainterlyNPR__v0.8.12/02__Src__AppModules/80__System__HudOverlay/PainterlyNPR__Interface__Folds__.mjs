/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - FOLDS AND INFO
   =============================================================================

   FILE       : PainterlyNPR__Interface__Folds__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Folds
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The panel and the render graph fold away; every group's
                descriptions wait behind an "i", and its eye switches the section
                off and on
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Folds are remembered in this browser.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : a x-slider is known by the Multiplier its config gives it,
                   where Experiment 01 compared its readout function with times();
                   otherwise none

   ============================================================================= */

import FoldsConfig from './Na__Interface__Folds__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__Interface__SyncControls,
    PainterlyNPR__Interface__CONTROLS  as  CONTROLS,
} from './PainterlyNPR__Interface__Controls__.mjs';
import {
    PainterlyNPR__Interface__Get,
    PainterlyNPR__Interface__Set,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from './PainterlyNPR__Interface__Dom__.mjs';

// =============================================================================
// REGION | Interface - Folds And Info
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__Folds__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const FOLDS     =  PainterlyNPR__ConfigAccess__Section(FoldsConfig, 'PainterlyNPR__InterfaceFolds__Config', 'Folds', ['Store']);
    const ICONS     =  PainterlyNPR__ConfigAccess__Section(FoldsConfig, 'PainterlyNPR__InterfaceFolds__Config', 'Icons', ['Info', 'Eye']);
    const SECTIONS  =  PainterlyNPR__ConfigAccess__Section(FoldsConfig, 'PainterlyNPR__InterfaceFolds__Config', 'Sections', ['Off', 'Keep', 'Skip']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Fold the Panel or the Render Graph Away - more room for the sheet
    // ------------------------------------------------------------
    // Remembered per viewer: a convenience, so a blocked or empty store is no
    // matter. The sheet keeps its 3:2 and grows into the room; the desk's resize
    // observer re-places the handles.
    const FOLD_STORE  =  FOLDS.Store;

    function PainterlyNPR__Interface__SetFold(which, folded, remember) {
        Ui.Root.classList.toggle(`PainterlyNPR--fold${which}`, folded);
        for (const button of $$(`[data-fold="${which}"]`)) button.setAttribute('aria-expanded', String(!folded));
        if (which === 'Graph') $('.PainterlyNPR__FoldButton--graph').textContent = folded ? 'Show ▴' : 'Hide ▾';
        if (remember === false) return;
        try {
            const folds  =  { Panel: Ui.Root.classList.contains('PainterlyNPR--foldPanel'), Graph: Ui.Root.classList.contains('PainterlyNPR--foldGraph') };
            localStorage.setItem(FOLD_STORE, JSON.stringify(folds));
        } catch (error) { /* <-- Private window or blocked storage: the fold still works, it is just not remembered */ }
    }

    function PainterlyNPR__Interface__RestoreFolds() {
        let folds  =  null;
        try { folds = JSON.parse(localStorage.getItem(FOLD_STORE) || 'null'); } catch (error) { folds = null; }
        if (!folds) return;
        PainterlyNPR__Interface__SetFold('Panel', !!folds.Panel, false);
        PainterlyNPR__Interface__SetFold('Graph', !!folds.Graph, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Info Bubbles - a group's descriptions behind an "i"
    // ------------------------------------------------------------
    // The descriptions stay in the page as written - agents read them there - but
    // on screen each group's hints fold into one "i" in a bubble at its top
    // right. Hover shows them; a click or a tap pins them open, a second one, a
    // tap elsewhere or Esc puts them away. Beside it, a group with sliders gets
    // an eye that switches the whole section off and on again - A/B at a click.
    // The eye is the library's motif-eye (09-vector-graphic-artist): an almond
    // lid, a solid pupil, a bitten highlight; closed, it is struck through.
    const INFO_I    =  ICONS.Info;
    const INFO_EYE  =  ICONS.Eye;

    // A section switched off sends each slider to the value at which it adds
    // nothing: its Off below, else 1 for a multiplier, else 0, else its minimum.
    // KEEP leaves a slider alone (it shapes an effect another slider turns off);
    // SKIP marks controls that are settings, not effects - a group of only
    // those gets no eye.
    const SECTION_OFF   =  SECTIONS.Off;
    const SECTION_KEEP  =  new Set(SECTIONS.Keep);
    const SECTION_SKIP  =  new Set(SECTIONS.Skip);
    const SectionSaved  =  new Map();                                        // <-- group -> { control: value it had }, while switched off

    function PainterlyNPR__Interface__SectionOffValue(key, input) {
        const spec  =  CONTROLS[key];
        if (key in SECTION_OFF) return SECTION_OFF[key];
        const min = parseFloat(input.min), max = parseFloat(input.max);
        if (spec.Multiplier && min <= 1 && max >= 1) return 1;          // <-- A x-slider (Experiment 01: its Format was times itself)
        if (min <= 0 && max >= 0) return 0;
        return min;
    }

    function PainterlyNPR__Interface__ToggleSection(group, eye) {
        const off     =  !group.classList.contains('PainterlyNPR__Group--off');
        const inputs  =  $$('[data-control]', group).filter(input => CONTROLS[input.dataset.control]);
        const saved   =  SectionSaved.get(group) || {};
        const bumps   =  new Set();
        for (const input of inputs) {
            const key  =  input.dataset.control, spec = CONTROLS[key];
            input.disabled  =  off;
            if (SECTION_KEEP.has(key) || SECTION_SKIP.has(key)) continue;
            if (off) { saved[key] = PainterlyNPR__Interface__Get(spec.Path); PainterlyNPR__Interface__Set(spec.Path, PainterlyNPR__Interface__SectionOffValue(key, input)); }
            else if (key in saved) PainterlyNPR__Interface__Set(spec.Path, saved[key]);
            spec.Bump.forEach(b => bumps.add(b));
        }
        if (off) SectionSaved.set(group, saved); else SectionSaved.delete(group);
        group.classList.toggle('PainterlyNPR__Group--off', off);
        eye.setAttribute('aria-pressed', String(off));
        eye.title  =  off ? 'Section off - click to switch it back on' : 'Switch this section off (A/B)';
        PainterlyNPR__RenderGraph__Bump(...bumps);
        PainterlyNPR__Interface__SyncControls();
        PainterlyNPR__RenderGraph__Request(bumps.has('Sun') ? 'Navigate' : 'Refine');
    }

    function PainterlyNPR__Interface__SectionSwitches(root) {
        for (const group of $$('.PainterlyNPR__Group', root)) {
            const keys  =  $$('[data-control]', group).map(input => input.dataset.control).filter(key => CONTROLS[key]);
            if (!keys.some(key => !SECTION_SKIP.has(key)) || group.querySelector(':scope > .PainterlyNPR__Section__Eye')) continue;
            const eye  =  document.createElement('button');
            eye.type  =  'button';
            eye.className  =  'PainterlyNPR__Section__Eye' + (group.querySelector(':scope > .PainterlyNPR__Info') ? '' : ' PainterlyNPR__Section__Eye--alone');
            eye.setAttribute('aria-pressed', 'false');
            eye.setAttribute('aria-label', 'Switch this section on or off');
            eye.title  =  'Switch this section off (A/B)';
            eye.innerHTML  =  INFO_EYE;
            const summary  =  group.querySelector(':scope > summary');
            if (summary) summary.after(eye); else group.prepend(eye);
            eye.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); PainterlyNPR__Interface__ToggleSection(group, eye); });
        }
    }

    function PainterlyNPR__Interface__InfoBubbles(root) {
        for (const group of $$('.PainterlyNPR__Group', root)) {
            const hints  =  $$(':scope > .PainterlyNPR__Hint', group);
            if (!hints.length || group.querySelector(':scope > .PainterlyNPR__Info')) continue;
            const titleEl  =  group.querySelector(':scope > .PainterlyNPR__Group__Title, :scope > summary');
            const title    =  titleEl ? titleEl.textContent.trim() : 'this group';
            const info     =  document.createElement('div');
            info.className  =  'PainterlyNPR__Info';
            info.innerHTML  =  `<button type="button" class="PainterlyNPR__Info__Button" aria-expanded="false" aria-label="About ${title}" title="About ${title}">${INFO_I}</button><div class="PainterlyNPR__Info__Card" role="note"></div>`;
            const card  =  info.querySelector('.PainterlyNPR__Info__Card');
            for (const hint of hints) card.appendChild(hint);                  // <-- Moved, not copied: the text keeps its ids and stays in the page
            const summary  =  group.querySelector(':scope > summary');
            if (summary) summary.after(info); else group.prepend(info);
            const eye  =  info.querySelector('button');
            eye.addEventListener('click', (event) => {
                event.stopPropagation();
                const open  =  !info.classList.contains('PainterlyNPR__Info--open');
                for (const other of $$('.PainterlyNPR__Info--open')) { other.classList.remove('PainterlyNPR__Info--open'); other.querySelector('button').setAttribute('aria-expanded', 'false'); }
                info.classList.toggle('PainterlyNPR__Info--open', open);
                eye.setAttribute('aria-expanded', String(open));
            });
        }
        PainterlyNPR__Interface__SectionSwitches(root);
    }

    function PainterlyNPR__Interface__CloseInfo() {
        for (const info of $$('.PainterlyNPR__Info--open')) { info.classList.remove('PainterlyNPR__Info--open'); info.querySelector('button').setAttribute('aria-expanded', 'false'); }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__CloseInfo,
        PainterlyNPR__Interface__InfoBubbles,
        PainterlyNPR__Interface__RestoreFolds,
        PainterlyNPR__Interface__SetFold,
        INFO_EYE  as  PainterlyNPR__Interface__INFO_EYE,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
