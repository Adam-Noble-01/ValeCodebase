/* =============================================================================
 * VALE OBJECT LIBRARY - THE DIRECTOR'S GUIDED WALKTHROUGH
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Tour__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Tour
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : The director's guided walkthrough
 * CREATED    : 16-Oct-2026
 *
 * DESCRIPTION:
 * - Part of the Object Library demo
 * - Loaded by ValeObjectLibrary__Demo__2.0.0__.html
 * - Shares state through window.ValeObjectLibrary__Modules
 *
 * -----------------------------------------------------------------------------
 *
 * DEVELOPMENT LOG:
 * 16-Oct-2026 - Version 2.0.0
 * - Separated from ValeObjectLibrary__Demo__2.0.0__.html
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Data     = App.Data;
    const Model    = App.Model;
    const Layout   = App.Layout;
    const State    = App.State;
    const Elements = App.Elements;

    // =====================================================================
    // REGION | Guided Tour - The Director's Walkthrough
    // =====================================================================

    // FUNCTION | Start, step and end the tour
    // ------------------------------------------------------------
    App.ValeObjectLibrary_TourStart = function () {
        if (!(Data.tour || []).length) {
            return;
        }
        State.tourIndex = 0;
        Elements.tour.hidden = false;
        App.ValeObjectLibrary_HideHint();
        App.ValeObjectLibrary_TourApply();
        Elements.tourNext.focus();
    };

    App.ValeObjectLibrary_TourEnd = function () {
        State.tourIndex = -1;
        Elements.tour.hidden = true;
    };

    App.ValeObjectLibrary_TourStep = function (delta) {
        const next = State.tourIndex + delta;
        if (next < 0) {
            return;
        }
        if (next >= Data.tour.length) {
            App.ValeObjectLibrary_TourEnd();
            return;
        }
        State.tourIndex = next;
        App.ValeObjectLibrary_TourApply();
    };
    // ------------------------------------------------------------

    // FUNCTION | Set the chart up for one step and frame the camera on it
    // ------------------------------------------------------------
    App.ValeObjectLibrary_TourApply = function () {
        const steps = Data.tour;
        const index = State.tourIndex;
        const step  = steps[index];

        App.ValeObjectLibrary_SetView(step.view || 'scheme', { fit: false });
        App.ValeObjectLibrary_ApplyDetail(step.show || 'assembly');
        (step.reveal || []).forEach(function (id) {
            App.ValeObjectLibrary_RevealDef(id);
        });
        State.allLinks = false;

        let target = null;
        const def = step.select ? Model.defs.get(step.select) : null;
        if (def && def.tier === 'resource') {
            target = { type: 'resource', id: def.id };
        } else if (def && def.placements[0]) {
            App.ValeObjectLibrary_RevealPlacement(def.placements[0]);
            target = { type: 'node', uid: def.placements[0].uid };
        }
        if (step.reveal) {
            State.detail = 'custom';
        }

        State.selection = target;
        if (target && target.type === 'node') {
            const placed = Model.byUid.get(target.uid);
            State.resourceHost = placed && App.ValeObjectLibrary_OwnsResources(placed.tier) ? placed.uid : null;
        } else {
            State.resourceHost = null;
        }
        State.softFocus = step.dim === false;
        App.ValeObjectLibrary_Refresh();
        App.ValeObjectLibrary_RenderInspector();
        App.ValeObjectLibrary_UpdateHash();
        if (step.panel && Elements.inspectorBody) {
            const section = Elements.inspectorBody.querySelector('[data-section="' + step.panel + '"]');
            if (section) {
                Elements.inspectorBody.scrollTop = section.offsetTop - 12;       // <-- Open the panel at the part the step talks about
            }
        }

        // Card text first, so the camera knows how much room the card takes
        Elements.tourCount.textContent    = 'Step ' + (index + 1) + ' of ' + steps.length;
        Elements.tourTitle.textContent    = step.title || '';
        Elements.tourText.textContent     = App.ValeObjectLibrary_TourText(step, def);
        Elements.tourProgress.style.width = ((index + 1) / steps.length * 100) + '%';
        Elements.tourBack.disabled        = index === 0;
        Elements.tourBack.style.visibility = index === 0 ? 'hidden' : 'visible';
        Elements.tourNext.textContent     = index === steps.length - 1 ? 'Finish' : 'Next';
        Elements.tour.style.bottom        = (Elements.toolbar.offsetHeight + 28) + 'px';

        App.ValeObjectLibrary_AfterSettle(function () {
            if (State.tourIndex === index) {
                App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_TourFocusBox(step, target), { maxK: 1 });
            }
        });
    };

    // SUB FUNCTION | Fill in the {tokens} in a step's text
    App.ValeObjectLibrary_TourText = function (step, def) {
        const counts = App.ValeObjectLibrary_LibraryCounts();
        let name = '', code = '', placements = 0, total = 0, definitions = 0, siblings = 0, schemeTotal = 0;
        if (def) {
            name        = def.name;
            code        = def.data['Product Code'] || def.id;
            schemeTotal = def.totalIn.scheme || 0;
            if (def.tier === 'resource') {
                placements  = def.placementCount;
                definitions = def.users.length;
                total       = def.pieceCount;
            } else {
                placements = def.placements.length;
                total      = def.totalQty;
                const shelf = (def.placementsIn.library || []).find(function (p) { return p.parent && p.parent.tier === 'category'; });
                siblings    = shelf ? shelf.parent.children.length : 0;
            }
        }
        return String(step.text || '')
            .replace(/\{name\}/g, name)
            .replace(/\{code\}/g, code)
            .replace(/\{placements\}/g, placements)
            .replace(/\{total\}/g, total)
            .replace(/\{definitions\}/g, definitions)
            .replace(/\{records\}/g, counts.records)
            .replace(/\{categories\}/g, Model.trees.library.root.children.length)
            .replace(/\{siblings\}/g, siblings)
            .replace(/\{schemeTotal\}/g, schemeTotal);
    };

    // SUB FUNCTION | What the camera frames for a step
    // 'all', 'column:<tier>[,<tier>]', 'selection', 'parent' (the selection
    // with its brothers and sisters), 'twins' (every place it is used),
    // 'uses' (a Resource and everything that uses it)
    App.ValeObjectLibrary_TourFocusBox = function (step, target) {
        const focus = step.focus || 'all';
        if (focus.indexOf('column:') === 0) {
            const tiers = focus.slice(7).split(',');
            return App.ValeObjectLibrary_BoxOf(Layout.visible.filter(function (p) { return tiers.indexOf(p.tier) !== -1; }).map(function (p) { return p.uid; }), []);
        }
        if (!target || focus === 'all') {
            return Layout.bounds;
        }
        if (target.type === 'resource') {
            const anchors = State.focus ? State.focus.refPairs.map(function (pair) { return pair[0]; }) : [];
            return App.ValeObjectLibrary_BoxOf(anchors, [target.id]);
        }
        const placement = Model.byUid.get(target.uid);
        if (focus === 'twins') {
            return App.ValeObjectLibrary_BoxOf(placement.def.placements.map(function (p) { return App.ValeObjectLibrary_NearestVisible(p).uid; }), []);
        }
        if (focus === 'parent' && placement.parent) {
            return App.ValeObjectLibrary_SubtreeBox(placement.parent);
        }
        return App.ValeObjectLibrary_SubtreeBox(placement);
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
