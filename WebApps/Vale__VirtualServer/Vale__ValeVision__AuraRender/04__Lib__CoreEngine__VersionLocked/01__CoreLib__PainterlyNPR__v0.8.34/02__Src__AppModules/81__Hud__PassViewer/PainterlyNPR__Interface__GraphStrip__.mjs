/* =============================================================================
   PAINTERLYNPR - HUD | PASS VIEWER - GRAPH STRIP
   =============================================================================

   FILE       : PainterlyNPR__Interface__GraphStrip__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - PassViewer - GraphStrip
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The render-graph strip along the foot: every pass a node with its
                state and time, a click to see its buffer, and the badge naming it
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Nodes are built from the pass registry.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__RenderGraph__Graph       as  Graph,
    PainterlyNPR__RenderGraph__PASSES      as  PASSES,
    PainterlyNPR__RenderGraph__PASS_BY_ID  as  PASS_BY_ID,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__PassViewer__VIEWS as VIEWS } from './PainterlyNPR__PassViewer__ViewList__.mjs';
import { PainterlyNPR__PassViewer__Present } from './PainterlyNPR__PassViewer__Views__.mjs';

// =============================================================================
// REGION | Pass Viewer - Graph Strip
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Render-Graph Strip
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__BuildGraph() {
        const list  =  $('#PainterlyNPR__App__GraphNodes');
        list.innerHTML  =  '';
        for (const pass of PASSES) {
            const li  =  document.createElement('li');
            li.className  =  'PainterlyNPR__Graph__Node';
            li.dataset.pass  =  pass.Id;
            li.innerHTML  =  `
                <button type="button" class="PainterlyNPR__Graph__Button" title="${VIEWS[pass.Views[0]].Label}">
                    <canvas class="PainterlyNPR__Graph__Thumb" width="192" height="128"></canvas>
                    <span class="PainterlyNPR__Graph__Label">${pass.Label}</span>
                    <span class="PainterlyNPR__Graph__Home">${pass.Home}</span>
                    <span class="PainterlyNPR__Graph__Time">waiting</span>
                </button>`;
            li.querySelector('button').addEventListener('click', () => PainterlyNPR__Interface__SelectPass(pass.Id));
            list.appendChild(li);
            pass.Node  =  li;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Update One Node's State and Time
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__UpdateNode(pass) {
        if (!pass.Node) return;
        pass.Node.dataset.status  =  pass.Status;
        const time  =  pass.Node.querySelector('.PainterlyNPR__Graph__Time');
        time.textContent  =  pass.Status === 'Cached' ? `cached · ${pass.LastMs.toFixed(1)} ms` : (pass.Status === 'Running' ? 'running…' : (pass.Status === 'Pending' ? 'queued' : `${pass.LastMs.toFixed(1)} ms`));
    }
    // ------------------------------------------------------------


    // FUNCTION | Select a Pass - show its buffer, offer its other views
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SelectPass(id) {
        const pass  =  PASS_BY_ID[id];
        State.View  =  pass.Views[0];
        const chips  =  $('#PainterlyNPR__App__ViewChips');
        chips.innerHTML  =  '';
        if (pass.Views.length > 1) {
            for (const key of pass.Views) {
                const b  =  document.createElement('button');
                b.type  =  'button';
                b.className  =  'PainterlyNPR__Chip';
                b.textContent  =  VIEWS[key].Label.split(' - ')[0];
                b.addEventListener('click', () => { State.View = key; PainterlyNPR__PassViewer__Present(); PainterlyNPR__Interface__MarkChips(); });
                b.dataset.view  =  key;
                chips.appendChild(b);
            }
        }
        for (const node of $$('.PainterlyNPR__Graph__Node')) node.classList.toggle('PainterlyNPR__Graph__Node--selected', node.dataset.pass === id && id !== 'Composite');
        PainterlyNPR__Interface__MarkChips();
        if (!Graph.Refining) PainterlyNPR__PassViewer__Present();
    }

    function PainterlyNPR__Interface__MarkChips() {
        for (const chip of $$('.PainterlyNPR__Chip')) chip.classList.toggle('PainterlyNPR__Chip--active', chip.dataset.view === State.View);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Badge Over the Sheet Naming the Buffer Shown
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__UpdateViewBadge() {
        const badge  =  $('#PainterlyNPR__App__ViewBadge');
        badge.hidden  =  State.View === 'Final';
        $('#PainterlyNPR__App__ViewName').textContent  =  VIEWS[State.View].Label;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__BuildGraph,
        PainterlyNPR__Interface__SelectPass,
        PainterlyNPR__Interface__UpdateNode,
        PainterlyNPR__Interface__UpdateViewBadge,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
