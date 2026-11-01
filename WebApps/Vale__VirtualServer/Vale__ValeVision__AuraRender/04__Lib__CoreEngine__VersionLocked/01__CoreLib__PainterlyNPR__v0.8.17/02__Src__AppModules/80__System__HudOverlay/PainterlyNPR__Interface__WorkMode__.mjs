/* =============================================================================
   PAINTERLYNPR - INTERFACE | WORK MODE
   =============================================================================

   FILE       : PainterlyNPR__Interface__WorkMode__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - WorkMode
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The header's Rendered / Proxy switch: draw the pen and wash when the
                camera rests, or keep the proxy preview and work on the scene
                without the renderer kicking in
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "Add a button to the app to toggle between rendered mode
     and proxy mode so you can work without the renderer kicking in".
   - The mode lives in the render graph (Graph.Proxy, SetProxy): this module is
     its switch, its key (P), its mark on the sheet and its memory - per viewer,
     as the folds are, so a blocked store only means it is not remembered.
   - v0.7.1: Shift + R switches it too, as in ValeVision AURA (Adam: "To both
     apps add the hotkey shift + R"); R alone is the navigation's reset.

   ============================================================================= */

import FoldsConfig from './Na__Interface__Folds__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__RenderGraph__SetProxy,
    PainterlyNPR__RenderGraph__Graph  as  Graph,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from './PainterlyNPR__Interface__Dom__.mjs';

// =============================================================================
// REGION | Interface - Work Mode
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__Folds__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const WORK_MODE  =  PainterlyNPR__ConfigAccess__Section(FoldsConfig, 'PainterlyNPR__InterfaceFolds__Config', 'WorkMode', ['Store', 'Default', 'Key', 'ShiftKey']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Work Mode - 'Rendered' or 'Proxy'
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SetWorkMode(mode, remember) {
        const proxy  =  mode === 'Proxy';
        for (const button of $$('[data-work-mode]')) button.setAttribute('aria-pressed', String((button.dataset.workMode === 'Proxy') === proxy));
        if (Ui.Root) Ui.Root.classList.toggle('PainterlyNPR--proxy', proxy);
        if (proxy !== Graph.Proxy) {
            PainterlyNPR__RenderGraph__SetProxy(proxy);
            if (!proxy) PainterlyNPR__Interface__Status('Rendered - drawing the pen and wash …');
        }
        if (remember === false) return;
        try { localStorage.setItem(WORK_MODE.Store, proxy ? 'Proxy' : 'Rendered'); }
        catch (error) { /* <-- Private window or blocked storage: the mode still switches, it is just not remembered */ }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Switch and Its Key, and Restore This Viewer's Mode
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__WireWorkMode() {
        for (const button of $$('[data-work-mode]')) button.addEventListener('click', () => PainterlyNPR__Interface__SetWorkMode(button.dataset.workMode));
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
            const key  =  e.key.toLowerCase();
            const shiftKey  =  e.shiftKey && key === WORK_MODE.ShiftKey;           // <-- Shift + R (v0.7.1); R alone is the camera's reset
            if (shiftKey && e.repeat) return;                                    // <-- A held Shift + R switches once
            if (key !== WORK_MODE.Key && !shiftKey) return;
            if (shiftKey) e.preventDefault();
            PainterlyNPR__Interface__SetWorkMode(Graph.Proxy ? 'Rendered' : 'Proxy');
        });
        let saved  =  null;
        try { saved = localStorage.getItem(WORK_MODE.Store); } catch (error) { saved = null; }
        PainterlyNPR__Interface__SetWorkMode(saved === 'Proxy' ? 'Proxy' : WORK_MODE.Default, false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__SetWorkMode,
        PainterlyNPR__Interface__WireWorkMode,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
