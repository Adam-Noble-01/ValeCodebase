/* =============================================================================
 * VALE OBJECT LIBRARY - SHARED SETTINGS, MODEL, LAYOUT AND VIEW STATE
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__State__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Core
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Shared settings, model, layout and view state
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

window.ValeObjectLibrary__Modules = window.ValeObjectLibrary__Modules || {};

(function (App) {
    'use strict';

    // =====================================================================
    // REGION | Settings, Data and State
    // =====================================================================

    const Data          = window.ValeObjectLibrary_LibraryData;
    const ReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The Vale graphics: one for each kind of thing on the chart, drawn in navy on white (01_Assets).
    // The ring round each one, in the tier's colour, is CSS - the .tier-* classes in the stylesheet set
    // --ring, and .node__card / .glyph-bubble draw it - so no colour is ever baked into a graphic.
    const Glyph = {
        scheme    : '01_Assets/Logo__ValeGardenHouses__PavilionMark__Navy__.svg',   // <-- The Vale pavilion mark: the whole scheme ...
        library   : '01_Assets/Logo__ValeGardenHouses__PavilionMark__Navy__.svg',   // <-- ... and the centre of the library network
        family    : '01_Assets/Icon__ObjectLibrary__Family__.svg',
        assembly  : '01_Assets/Icon__ObjectLibrary__Assembly__.svg',
        component : '01_Assets/Icon__ObjectLibrary__Component__.svg',
        product   : '01_Assets/Icon__ObjectLibrary__Product__.svg',
        resource  : '01_Assets/Icon__ObjectLibrary__Resource__.svg',
        category  : '01_Assets/Icon__ObjectLibrary__WholeLibrary__.svg',
        range     : '01_Assets/Icon__ObjectLibrary__WholeLibrary__.svg',
        attribute : '01_Assets/Icon__ObjectLibrary__Attribute__.svg'
    };

    const Settings = {
        columnGap      : 100,                                                    // <-- Clear space between columns, holds the connector spine
        tierWidth      : { scheme: 330, family: 276, assembly: 272, component: 258, product: 258, resource: 252, library: 330, category: 276, range: 248 },
        tierHeight     : { scheme: 104, family: 62,  assembly: 54,  component: 44,  product: 44,  resource: 40,  library: 104, category: 62,  range: 54 },
        nameFont       : { scheme: [20, 700], family: [16, 600], assembly: [14.5, 600], component: [13.5, 600], product: [13.5, 600], resource: [13, 600], library: [20, 700], category: [16, 600], range: [14.5, 600] },
        largeFont      : { scheme: 32, family: 26, assembly: 22, component: 20, product: 20, resource: 19, library: 32, category: 26, range: 22 },
        gapSibling     : 36,                                                     // <-- Vertical gaps: same parent / same grandparent / further apart
        gapCousin      : 48,
        gapDistant     : 64,
        lanePadding    : 16,
        laneTitle      : 78,
        laneGroupTitle : 30,
        laneGroupGap   : 16,
        laneItemGap    : 6,
        laneGap        : 220,                                                    // <-- Extra clear space before the Resources column, setting it apart
        zoomMin        : 0.05,
        zoomMax        : 2.5,
        lodFull        : 0.62,                                                   // <-- Below this, boxes show a larger short name only
        lodLow         : 0.3,                                                    // <-- Below this, boxes are shapes and floating labels take over
        stripHeight    : 46,
        duration       : ReducedMotion ? 0 : 450,
        flyDuration    : ReducedMotion ? 0 : 700,
        fontFamily     : "'Segoe UI', 'Open Sans', system-ui, -apple-system, sans-serif"
    };

    // The library root and its category shelves lay out like a Scheme and its Families
    const TierRank = { scheme: 0, library: 0, family: 1, category: 1, range: 2, assembly: 2, component: 3, product: 3, resource: 4 };

    const Model = {
        defs        : new Map(),                                                 // <-- id -> definition (scheme, families, library, categories, resources)
        groups      : new Map(),                                                 // <-- resource group key -> group with its items
        resources   : [],
        trees       : {},                                                        // <-- 'scheme' and 'library': each { key, root, placements, byUid, maxNest }
        root        : null,                                                      // <-- The tree on show (see SetView) - root, every box, lookup, depth
        placements  : [],
        byUid       : new Map(),
        maxNest     : 0,                                                         // <-- deepest sub-assembly level, sets the column count
        issues      : [],
        searchIndex : []
    };

    const Layout = {
        columns        : [],
        headers        : [],                                                     // <-- Tier strip headers; Assemblies spans its sub-assembly columns
        partsColumn    : 0,
        resourceColumn : 0,
        pos            : new Map(),                                              // <-- uid -> { x (left), y (centre), w, h } of every visible box
        prevPos        : new Map(),
        visible        : [],
        links          : [],
        res            : new Map(),                                              // <-- resource id -> box in the library column
        lane           : null,
        bounds         : { x: 0, y: 0, w: 1, h: 1 }
    };

    const State = {
        view          : 'scheme',                                                // <-- 'scheme' (one configured project) or 'library' (every record)
        expanded      : new Set(),
        detail        : 'scheme',                                                // <-- Start collapsed: the user opens the first box themselves
        selection     : null,                                                    // <-- { type: 'node', uid } or { type: 'resource', id }
        resourceHost  : null,                                                    // <-- The part whose own resources are on show
        focus         : null,
        allLinks      : false,
        transform     : null,
        lod           : 'full',
        matches       : new Set(),
        tourIndex     : -1,
        navigatorOn   : true,
        inspectorDismissed : false,                                              // <-- Closed by hand, so a selection no longer reopens it
        attributesWidth    : null,                                               // <-- Dragged width of the attributes column; null fits the JSON
        softFocus     : false,                                                   // <-- Tour step: show the selection without dimming the rest
        booting       : false,
        frameQueued   : false,
        hintTimer     : null
    };

    const Elements    = {};
    const Layers      = {};
    const LabelCache  = new Map();
    const TextWidths  = new Map();
    const MeasureContext = document.createElement('canvas').getContext('2d');
    const Runtime = {
        Zoom       : null,
        NavMapping : { s: 1, ox: 0, oy: 0 }
    };

    // endregion -----------------------------------------------------------

    App.Data           = Data;
    App.ReducedMotion  = ReducedMotion;
    App.Glyph          = Glyph;
    App.Settings       = Settings;
    App.TierRank       = TierRank;
    App.Model          = Model;
    App.Layout         = Layout;
    App.State          = State;
    App.Elements       = Elements;
    App.Layers         = Layers;
    App.LabelCache     = LabelCache;
    App.TextWidths     = TextWidths;
    App.MeasureContext = MeasureContext;
    App.Runtime        = Runtime;
})(window.ValeObjectLibrary__Modules);
