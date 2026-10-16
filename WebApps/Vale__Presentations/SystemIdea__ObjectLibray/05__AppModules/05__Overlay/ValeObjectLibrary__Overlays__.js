/* =============================================================================
 * VALE OBJECT LIBRARY - TIER STRIP AND FLOATING LABELS
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Overlays__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Overlay
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Tier strip and floating labels
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
 * 16-Oct-2026 - Version 2.0.3
 * - Each family of collections has a small name, kept at reading size as the chart zooms
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Data       = App.Data;
    const Settings   = App.Settings;
    const Model      = App.Model;
    const Layout     = App.Layout;
    const State      = App.State;
    const Elements   = App.Elements;
    const LabelCache = App.LabelCache;
    const Force      = App.Force;                                                // <-- The network's simulation nodes (set by RenderNetwork, loaded before this)

    // =====================================================================
    // REGION | Overlays - Tier Strip, Floating Labels
    // =====================================================================

    // FUNCTION | Build the tier header strip - also the legend, and a level control
    // ------------------------------------------------------------
    // Each header reads in two lines (code and library count over the tier
    // name), shrinks to a one-word name as its column narrows, then to its
    // colour dot alone. The Assemblies header spans the sub-assembly
    // columns too - a sub-assembly is still an Assembly.
    App.ValeObjectLibrary_BuildTierStrip = function () {
        const counts    = App.ValeObjectLibrary_LibraryCounts();
        const inLibrary = function (count) { return count + ' in library'; };
        const subAssembliesOpen = Layout.columns.some(function (column) { return column.key === 'subassembly'; });
        Elements.tierStrip.textContent = '';
        Layout.headers  = [];

        // The network has no columns - the strip becomes its colour legend
        if (App.ValeObjectLibrary_IsForce()) {
            const keys = ['library', 'category', 'range', 'assembly', 'component', 'product', 'resource'];
            const levelOf = { library: 'scheme', category: 'family', range: 'assembly', assembly: 'parts', component: 'parts', product: 'parts', resource: 'parts' };
            const titleOf = {
                library   : 'Back to the start: Vale Object Library on its own',
                category  : 'Open the centre to its collections',
                range     : 'Open each collection to its ranges',
                assembly  : 'Open every collection so each object can be found',
                component : 'Open every collection so each object can be found',
                product   : 'Open every collection so each object can be found',
                resource  : 'Open every collection so each object can be found'
            };
            Elements.tierStrip.appendChild(App.ValeObjectLibrary_El('div', { class: 'strip-legend', role: 'toolbar', 'aria-label': 'How far to open the chart' },
                keys.map(function (key) {
                    const level = levelOf[key];
                    const on    = key === 'library' ? State.detail === 'scheme'
                                : key === 'category' ? State.detail === 'family'
                                : key === 'range' ? State.detail === 'assembly'
                                : State.detail === 'parts' || State.detail === 'all';
                    return App.ValeObjectLibrary_El('button', {
                        class   : 'strip-legend__item' + (on ? ' is-on' : ''),
                        type    : 'button',
                        title   : titleOf[key],
                        'data-detail' : level,
                        'data-legend' : key,
                        onclick : function () {
                            App.ValeObjectLibrary_SetDetail(level);
                            App.ValeObjectLibrary_FitAll();
                        }
                    },
                        App.ValeObjectLibrary_GlyphBubble(key),
                        Data.tiers[key].label);
                }),
                App.ValeObjectLibrary_El('span', { class: 'strip-legend__hint', text: App.ValeObjectLibrary_Plural(counts.records, 'record', 'records') + ' · a collection lists the objects in it · +N = closed, heavy ring = open' })));
            return;
        }
        Layout.columns.forEach(function (column) {
            if (column.key === 'subassembly') {
                Layout.headers[Layout.headers.length - 1].x2 = column.x + column.w;
                return;
            }
            Layout.headers.push({ key: column.key, tier: column.tier, x: column.x, x2: column.x + column.w });
        });

        Layout.headers.forEach(function (header) {
            let meta, label, short, dots, level;
            if (header.key === 'parts') {
                meta  = Data.tiers.component.code + ' · ' + Data.tiers.product.code + '   ' + inLibrary(counts.component + counts.product);
                label = 'Components · Products';
                short = 'Parts';
                dots  = ['component', 'product'];
                level = 'parts';
            } else if (header.key === 'library') {
                meta  = App.ValeObjectLibrary_Plural(counts.records, 'record', 'records') + ' in all';
                label = 'Object Library';
                short = 'Library';
                dots  = ['library'];
                level = 'scheme';
            } else if (header.key === 'category') {
                meta  = App.ValeObjectLibrary_Plural(Model.trees.library.root.children.length, 'collection', 'collections');
                label = 'Collections';
                short = 'Collections';
                dots  = ['category'];
                level = 'family';
            } else {
                const tier = Data.tiers[header.tier];
                meta  = tier.code + '   ' + inLibrary(counts[header.tier]);
                label = header.key === 'resource' ? 'Resources · shared library'
                      : header.key === 'assembly' && subAssembliesOpen ? 'Assemblies · sub-assemblies'
                      : tier.plural;
                short = tier.plural;
                dots  = [header.tier];
                level = { scheme: 'scheme', family: 'family', assembly: 'assembly', resource: 'all' }[header.key];
            }
            const button = App.ValeObjectLibrary_El('button', {
                    class : 'tier-head',
                    type  : 'button',
                    title : header.key === 'resource' ? 'Open everything and draw every link to the shared Resources' : 'Open the chart down to the ' + label.replace(' · ', ' and '),
                    onclick : function () {
                        App.ValeObjectLibrary_SetDetail(level);
                        App.ValeObjectLibrary_FitAll();
                    }
                },
                App.ValeObjectLibrary_El('span', { class: 'tier-head__dots' },
                    dots.map(function (tierKey) { return App.ValeObjectLibrary_GlyphBubble(tierKey); })),
                App.ValeObjectLibrary_El('span', { class: 'tier-head__text' },
                    App.ValeObjectLibrary_El('span', { class: 'tier-head__meta', text: meta }),
                    App.ValeObjectLibrary_El('span', { class: 'tier-head__label', text: label })),
                App.ValeObjectLibrary_El('span', { class: 'tier-head__short', text: short })
            );

            // Widths each form needs, so a header never shows a cut-off word
            const spaced    = function (text, size, weight, spacing) { return App.ValeObjectLibrary_TextWidth(text.toUpperCase(), App.ValeObjectLibrary_Font(size, weight)) + text.length * size * spacing; };
            const dotsWidth = dots.length * 24 + (dots.length - 1) * 3;                      // <-- A 24px graphic bubble each (see .tier-head .glyph-bubble)
            header.needFull  = 22 + dotsWidth + 7 + Math.max(App.ValeObjectLibrary_TextWidth(meta, App.ValeObjectLibrary_Font(10.5, 600)), spaced(label, 12, 700, 0.05)) + 4;
            header.needShort = 18 + dotsWidth + 7 + spaced(short, 11, 700, 0.03) + 4;
            header.element   = button;
            Elements.tierStrip.appendChild(button);
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Keep each header over its column, pinned to the edge while the column is in view
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateTierStrip = function (transform) {
        const viewWidth = Elements.canvas.clientWidth;
        Layout.headers.forEach(function (header) {
            const element = header.element;
            const left  = Math.max(transform.applyX(header.x), 6);
            const right = Math.min(transform.applyX(header.x2), viewWidth - 6);
            const width = right - left;
            const shown = width >= 30;
            element.classList.toggle('is-hidden', !shown);
            if (!shown) {
                return;
            }
            element.style.transform = 'translateX(' + Math.round(left) + 'px)';
            element.style.width     = Math.round(width) + 'px';
            element.classList.toggle('is-compact', width < header.needFull && width >= header.needShort);
            element.classList.toggle('is-tiny', width < header.needShort);
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Floating labels - readable names when the boxes are too small
    // ------------------------------------------------------------
    // Most important first (Scheme, Families, Resource groups, Assemblies);
    // a label that would overlap one already placed is skipped, like the
    // place names on a map.
    App.ValeObjectLibrary_UpdateFloatingLabels = function (transform) {
        const layer = Elements.labels;
        const force = App.ValeObjectLibrary_IsForce();
        if (!force && State.lod !== 'low') {                                 // <-- The network is labelled this way at every zoom
            if (!layer.hidden) {
                layer.hidden = true;
            }
            return;
        }
        layer.hidden = false;
        layer.classList.toggle('is-network', force);
        const viewWidth  = Elements.canvas.clientWidth;
        const viewHeight = Elements.canvas.clientHeight;
        const priority   = { scheme: 0, library: 0, family: 1, category: 1, range: 2, assembly: 3, component: 4, product: 4 };
        const candidates = [];
        const focus      = State.focus;
        const dimming    = !!focus && !State.softFocus;

        Layout.visible.forEach(function (placement) {
            let rank = priority[placement.tier];                             // <-- The network's centre holds the Vale pavilion mark, so it is labelled beside it like the rest
            if (placement.tier === 'assembly' && placement.nest > 0) { rank = 3.5; }
            if (!force && rank >= 4 && transform.k < 0.2) { return; }
            if (focus && focus.selectedUid === placement.uid) { rank = -2; }      // <-- The selection's label always wins
            else if (focus && (focus.nodes.has(placement.uid) || focus.twins.has(placement.uid))) { rank = Math.min(rank, 0.5); }
            const shelf = placement.tier === 'category' || placement.tier === 'range';
            candidates.push({ key: placement.uid, rank: rank, box: Layout.pos.get(placement.uid), colour: App.ValeObjectLibrary_TierColour(placement.tier), ring: App.ValeObjectLibrary_NodeRing(placement),
                name: shelf ? App.ValeObjectLibrary_ShelfLabel(placement) : App.ValeObjectLibrary_ShortName(placement.def),
                caption: shelf ? '' : App.ValeObjectLibrary_TierLabel(placement) });
        });
        if (force) {
            Layout.res.forEach(function (box, id) {
                const resource = Model.defs.get(id);
                const rank = focus && focus.selectedRes === id ? -2 : 2.5;
                candidates.push({ key: 'res:' + id, rank: rank, box: box, name: resource.name, colour: resource.data.Swatch || App.ValeObjectLibrary_TierColour('resource'), ring: resource.data.Swatch || App.ValeObjectLibrary_TierColour('resource'),
                    caption: 'Resource · ' + ((Model.groups.get(resource.group) || {}).singular || resource.group) });
            });
            const plan = Force.shelfPlan;
            if (plan && plan.families.length) {
                let shelvesOnShow = 0;
                plan.families.forEach(function (family) {
                    family.shelves.forEach(function (shelf) {
                        if (Force.nodes.has(shelf.uid)) {
                            shelvesOnShow += 1;
                        }
                    });
                });
                if (shelvesOnShow >= 2) {
                    plan.families.forEach(function (family) {
                        const visible = family.shelves.filter(function (shelf) { return Force.nodes.has(shelf.uid); });
                        if (!visible.length) {
                            return;
                        }
                        let reach = Infinity;
                        visible.forEach(function (shelf) {
                            const node = Force.nodes.get(shelf.uid);
                            reach = Math.min(reach, Math.hypot(node.x, node.y) - node.r);
                        });
                        const a0 = plan.byUid.get(visible[0].uid).angle;
                        const a1 = plan.byUid.get(visible[visible.length - 1].uid).angle;
                        const mid = (a0 + a1) / 2;
                        const radius = Math.max(118, reach - 52);           // <-- In the clear band between the centre and the wash
                        candidates.push({
                            key     : 'family:' + family.name,
                            rank    : 0.4,
                            centred : true,
                            box     : { x: Math.cos(mid) * radius, y: Math.sin(mid) * radius, w: 0, h: 0 },
                            name    : family.name,
                            colour  : family.colour
                        });
                    });
                }
            }
        } else if (Layout.lane) {
            Layout.lane.groups.forEach(function (group) {
                candidates.push({ key: 'group:' + group.key, rank: 2, box: { x: Layout.lane.x + Settings.lanePadding, y: group.y + 14, w: 0, h: 0 }, name: group.key, colour: App.ValeObjectLibrary_TierColour('resource') });
            });
        }
        candidates.sort(function (a, b) { return a.rank - b.rank || a.box.y - b.box.y; });

        const placed  = [];
        const used    = new Set();
        const centre  = force ? (Force.nodes.get(Model.root.uid) || { x: 0 }).x : 0;
        candidates.forEach(function (candidate) {
            // Network labels read in two lines: a small, quiet tier caption over the name
            const captionWidth = force && candidate.caption ? App.ValeObjectLibrary_TextWidth(candidate.caption.toUpperCase(), App.ValeObjectLibrary_Font(8.5, 700)) + candidate.caption.length * 0.7 : 0;
            const width  = force
                ? Math.max(App.ValeObjectLibrary_TextWidth(candidate.name, App.ValeObjectLibrary_Font(candidate.centred ? 10 : 11.5, candidate.centred ? 700 : 600)), captionWidth) + (candidate.centred ? candidate.name.length * 1.1 + 8 : 14)
                : App.ValeObjectLibrary_TextWidth(candidate.name, App.ValeObjectLibrary_Font(12, 600)) + 32;
            const height = force && candidate.caption ? 30 : candidate.centred ? 16 : 22;
            const simNode = force ? Force.nodes.get(candidate.key) : null;
            const toLeft  = simNode && simNode.labelSide
                ? simNode.labelSide === 'left'                               // <-- In a column, every label sits on the column's outer side
                : candidate.box.x + candidate.box.w / 2 < centre;
            const outside = toLeft
                ? transform.applyX(candidate.box.x) - 4 - width                  // <-- Network: on the outer side, away from the centre
                : transform.applyX(candidate.box.x + candidate.box.w) + 4;
            const left   = candidate.centred
                ? transform.applyX(candidate.box.x + candidate.box.w / 2) - width / 2
                : force ? outside : transform.applyX(candidate.box.x) - 2;
            const rect   = { x: left, y: transform.applyY(candidate.box.y) - height / 2, w: width, h: height };
            const onLeft = force && left < transform.applyX(candidate.box.x);
            if (rect.x > viewWidth || rect.x + rect.w < 0 || rect.y > viewHeight || rect.y + rect.h < Settings.stripHeight) {
                return;
            }
            const clash = placed.some(function (other) {
                return rect.x < other.x + other.w + 4 && other.x < rect.x + rect.w + 4 && rect.y < other.y + other.h + 2 && other.y < rect.y + rect.h + 2;
            });
            if (clash) {
                return;
            }
            placed.push(rect);
            used.add(candidate.key);
            let label = LabelCache.get(candidate.key);
            if (!label) {
                label = candidate.centred
                    ? App.ValeObjectLibrary_El('div', { class: 'float-label float-label--family' },
                        App.ValeObjectLibrary_El('span', { text: candidate.name }))
                    : force && candidate.caption
                    ? App.ValeObjectLibrary_El('div', { class: 'float-label float-label--two' },
                        App.ValeObjectLibrary_El('span', { class: 'float-label__caption', text: candidate.caption }),
                        App.ValeObjectLibrary_El('span', { class: 'float-label__name', text: candidate.name }))
                    : force
                    ? App.ValeObjectLibrary_El('div', { class: 'float-label' },
                        App.ValeObjectLibrary_El('span', { text: candidate.name }))
                    : App.ValeObjectLibrary_El('div', { class: 'float-label' },
                        App.ValeObjectLibrary_El('span', { class: 'float-label__dot', style: 'background:' + candidate.colour }),
                        App.ValeObjectLibrary_El('span', { text: candidate.name }));
                if (force && candidate.ring) {
                    label.style.setProperty('--label-ring', candidate.ring);        // <-- The label's coloured edge (CSS): the same colour as its bubble's ring
                }
                layer.appendChild(label);
                LabelCache.set(candidate.key, label);
            }
            label.hidden = false;
            label.style.transform = 'translate(' + Math.round(rect.x) + 'px,' + Math.round(rect.y) + 'px)';
            label.classList.toggle('is-left', onLeft);                       // <-- Left of its node: line the text up against the node
            const lit = candidate.centred
                ? false
                : candidate.key.indexOf('res:') === 0
                ? focus && focus.res.has(candidate.key.slice(4))
                : focus && (focus.nodes.has(candidate.key) || focus.twins.has(candidate.key));
            label.classList.toggle('is-dim', !candidate.centred && dimming && !lit);
        });
        LabelCache.forEach(function (label, key) {
            if (!used.has(key) && !label.hidden) {
                label.hidden = true;
            }
        });
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
