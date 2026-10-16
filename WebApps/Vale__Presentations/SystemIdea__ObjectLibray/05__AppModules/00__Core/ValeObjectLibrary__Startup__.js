/* =============================================================================
 * VALE OBJECT LIBRARY - CACHE THE PAGE ELEMENTS AND START THE CHART
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Startup__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Core
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Cache the page elements and start the chart
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
    const Settings = App.Settings;
    const Model    = App.Model;
    const Layout   = App.Layout;
    const State    = App.State;
    const Elements = App.Elements;
    const Layers   = App.Layers;

    // =====================================================================
    // REGION | Start-Up
    // =====================================================================

    // FUNCTION | Find every element the script talks to
    // ------------------------------------------------------------
    App.ValeObjectLibrary_CacheElements = function () {
        const byId = function (suffix) { return document.getElementById('ValeObjectLibrary_' + suffix); };
        Object.assign(Elements, {
            workspace       : byId('Workspace'),
            canvas          : byId('Canvas'),
            schemes         : byId('Schemes'),
            schemesBody     : byId('SchemesBody'),
            chart           : byId('Chart'),
            gridMinor       : byId('GridMinor'),
            gridMajor       : byId('GridMajor'),
            labels          : byId('Labels'),
            tierStrip       : byId('TierStrip'),
            hint            : byId('Hint'),
            issues          : byId('Issues'),
            toolbar         : document.querySelector('.toolbar'),
            zoomOut         : byId('ZoomOut'),
            zoomIn          : byId('ZoomIn'),
            zoomReadout     : byId('ZoomReadout'),
            fitAll          : byId('FitAll'),
            fitSelection    : byId('FitSelection'),
            detailButtons   : Array.from(document.querySelectorAll('.js-detail')),
            viewButtons     : Array.from(document.querySelectorAll('.js-view')),
            links           : byId('Links'),
            navigatorToggle : byId('NavigatorToggle'),
            navigator       : byId('Navigator'),
            navCanvas       : byId('NavigatorCanvas'),
            navZoom         : byId('NavigatorZoom'),
            tour            : byId('Tour'),
            tourCount       : byId('TourCount'),
            tourTitle       : byId('TourTitle'),
            tourText        : byId('TourText'),
            tourProgress    : byId('TourProgress'),
            tourBack        : byId('TourBack'),
            tourNext        : byId('TourNext'),
            tourClose       : byId('TourClose'),
            tourButton      : byId('TourButton'),
            help            : byId('Help'),
            helpButton      : byId('HelpButton'),
            searchInput     : byId('SearchInput'),
            searchResults   : byId('SearchResults'),
            inspectorBody   : byId('AttributesBody'),
            inspectorTitle  : byId('AttributesTitle'),
            inspectorClose  : null,
            inspectorOpen   : null,
            attributesBody  : byId('AttributesBody'),
            attributesTitle : byId('AttributesTitle'),
            attributesPanel : byId('Attributes'),
            attributesGrip  : byId('AttributesGrip')
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Start the page
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Boot = function () {
        App.ValeObjectLibrary_CacheElements();
        if (!window.d3) {
            App.ValeObjectLibrary_ShowFatal('The chart library (D3) did not load. Check the internet connection, then refresh the page.');
            return;
        }
        if (!Data || !Data.tiers) {
            App.ValeObjectLibrary_ShowFatal('The library data did not load. It should be at 02_Data/ValeObjectLibrary__LibraryData__.js, next to this page.');
            return;
        }

        Object.keys(Data.tiers).forEach(function (key) {
            document.documentElement.style.setProperty('--Tier_' + key, Data.tiers[key].colour);
        });

        App.ValeObjectLibrary_BuildModel();
        App.ValeObjectLibrary_BuildSearchIndex();

        Layers.svg      = d3.select(Elements.chart);
        Layers.viewport = d3.select('#ValeObjectLibrary_Viewport');
        Layers.bands    = Layers.viewport.select('.layer-bands');
        Layers.links    = Layers.viewport.select('.layer-links');
        Layers.refs     = Layers.viewport.select('.layer-refs');
        Layers.nodes    = Layers.viewport.select('.layer-nodes');
        Layers.lane     = Layers.viewport.select('.layer-lane');

        App.ValeObjectLibrary_InitZoom();
        App.ValeObjectLibrary_InitControls();
        App.ValeObjectLibrary_InitSearch();
        App.ValeObjectLibrary_InitNavigator();
        App.ValeObjectLibrary_InitKeyboard();
        App.ValeObjectLibrary_InitAttributesColumn();

        if (App.ValeObjectLibrary_IsNarrow() || window.innerWidth < 1100) {
            App.ValeObjectLibrary_SetInspectorOpen(false, true);
        }

        // A link to an object opens on it: page.html#CMP-DOOR-STILE (scheme
        // view), page.html#library or page.html#library/PRD-VG726
        let linked = decodeURIComponent(location.hash.slice(1));
        let view   = 'scheme';
        if (linked === 'schemes') {
            view   = 'schemes';
            linked = '';
        } else if (linked === 'library' || linked.indexOf('library/') === 0) {
            view   = 'library';
            linked = linked.slice(8);
        } else if (linked) {
            const def = Model.defs.get(linked);
            if (def && !(def.placementsIn.scheme || []).length && (def.placementsIn.library || []).length) {
                view = 'library';                                            // <-- Only on the library shelves
            }
        }

        State.transform = d3.zoomIdentity;
        App.ValeObjectLibrary_SetView(view, { force: true, fit: false });
        App.ValeObjectLibrary_ShowIssues();

        State.booting = true;
        if (linked && App.ValeObjectLibrary_SelectById(linked, { reveal: true, revealUses: true })) {
            const linkedSelection = State.selection;
            App.ValeObjectLibrary_AfterSettle(function () {
                App.ValeObjectLibrary_FitBox(linkedSelection.type === 'resource'
                    ? App.ValeObjectLibrary_BoxOf(State.focus.refPairs.map(function (pair) { return pair[0]; }), [linkedSelection.id])
                    : App.ValeObjectLibrary_SubtreeBox(Model.byUid.get(linkedSelection.uid)), { maxK: 1, duration: App.ValeObjectLibrary_IsForce() ? Settings.flyDuration : 0 });
            });
        } else if (App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_FitAll();
        } else if (State.view !== 'schemes') {
            App.ValeObjectLibrary_FitBox(Layout.bounds, { maxK: 1, duration: 0 });
        }
        State.booting = false;

        App.ValeObjectLibrary_ShowHint();
        if (window.ResizeObserver) {
            new ResizeObserver(App.ValeObjectLibrary_QueueFrame).observe(Elements.canvas);
        }
        window.addEventListener('resize', App.ValeObjectLibrary_QueueFrame);

        // Handle for testing from the browser console
        window.ValeObjectLibrary_App = {
            Model: Model, Layout: Layout, State: State, Settings: Settings,
            select: App.ValeObjectLibrary_SelectById, setDetail: App.ValeObjectLibrary_SetDetail, setView: App.ValeObjectLibrary_SetView,
            fitAll: App.ValeObjectLibrary_FitAll, tour: App.ValeObjectLibrary_TourStart
        };
    };

    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
