/* =============================================================================
   PAINTERLYNPR - INTERFACE | ASSET FILTERS
   =============================================================================

   FILE       : PainterlyNPR__Interface__AssetFilters__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - AssetFilters
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What both tabs of the Assets drawer share: the search row with
                its Filters graphic, the chips that graphic hides, and the
                category headings the cards are laid under
   CREATED    : 03-Nov-2026 (v0.8.23)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "ensure there are categories for assets and materials
     like with the sketchUP plugin / secondly add a filters graphic that hides
     these unless needed as the menu is messy".
   - The chips start hidden on every load, as every fold does: nothing is
     remembered. A filter still applied while they are hidden is marked on the
     graphic, so a short list is never a mystery.

   ============================================================================= */

import CatalogueConfig from './Na__AssetCatalogue__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Interface__Query as $ } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';

// =============================================================================
// REGION | Interface - Asset Filters
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetCatalogue__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const FILTERS  =  PainterlyNPR__ConfigAccess__Section(CatalogueConfig, 'PainterlyNPR__AssetCatalogue__Config', 'Filters', ['Label']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Graphic - a funnel, inline so a wrapper's pin needs no icon file
    // ------------------------------------------------------------
    const FILTER_GRAPHIC  =  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8z"/></svg>';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Search Row and the Hidden Chips
// -----------------------------------------------------------------------------

    // FUNCTION | The Search Row's Markup - the search box and the Filters graphic beside it
    // ------------------------------------------------------------
    // searchAttr: the attribute its tab finds the box by.
    function PainterlyNPR__AssetFilters__SearchRow(searchAttr, hint, label) {
        return `
            <div class="PainterlyNPR__AssetDrawer__SearchRow">
                <input type="search" class="PainterlyNPR__AssetDrawer__Search" ${searchAttr} placeholder="${hint}" aria-label="${label}">
                <button type="button" class="PainterlyNPR__AssetDrawer__FilterButton" data-filters-toggle aria-expanded="false" aria-label="${FILTERS.Label}" title="${FILTERS.Label}">${FILTER_GRAPHIC}</button>
            </div>`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Graphic - it shows and hides its own tab's chips
    // ------------------------------------------------------------
    function PainterlyNPR__AssetFilters__Wire(pane) {
        const button  =  $('[data-filters-toggle]', pane);
        const box     =  $('[data-filters-box]', pane);
        button.addEventListener('click', () => {
            box.hidden  =  !box.hidden;
            button.setAttribute('aria-expanded', String(!box.hidden));
            button.classList.toggle('PainterlyNPR__AssetDrawer__FilterButton--open', !box.hidden);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark the Graphic - the filter applied, or '' for none
    // ------------------------------------------------------------
    function PainterlyNPR__AssetFilters__Mark(pane, applied) {
        const button  =  $('[data-filters-toggle]', pane);
        const title   =  applied ? `${FILTERS.Label}: ${applied}` : FILTERS.Label;
        button.classList.toggle('PainterlyNPR__AssetDrawer__FilterButton--applied', !!applied);
        button.title  =  title;
        button.setAttribute('aria-label', title);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Category Headings
// -----------------------------------------------------------------------------

    // FUNCTION | A Category's Heading - it takes a whole row of its grid
    // ------------------------------------------------------------
    // minor: a type under its collection, a step quieter.
    function PainterlyNPR__AssetFilters__Heading(label, count, minor) {
        const heading  =  document.createElement(minor ? 'h4' : 'h3');
        heading.className  =  'PainterlyNPR__AssetDrawer__Category' + (minor ? ' PainterlyNPR__AssetDrawer__Category--minor' : '');
        heading.textContent  =  `${label} `;
        const number  =  document.createElement('span');
        number.textContent  =  String(count);
        heading.appendChild(number);
        return heading;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetFilters__Heading,
        PainterlyNPR__AssetFilters__Mark,
        PainterlyNPR__AssetFilters__SearchRow,
        PainterlyNPR__AssetFilters__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
