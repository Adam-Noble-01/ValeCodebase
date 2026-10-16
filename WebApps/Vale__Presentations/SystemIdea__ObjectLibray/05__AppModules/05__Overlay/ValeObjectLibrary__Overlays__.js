/* =============================================================================
 * VALE OBJECT LIBRARY - TIER STRIP, FLOATING LABELS AND THE NAVIGATOR
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Overlays__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Overlay
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Tier strip, floating labels and the navigator
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

    const Data       = App.Data;
    const Settings   = App.Settings;
    const Model      = App.Model;
    const Layout     = App.Layout;
    const State      = App.State;
    const Elements   = App.Elements;
    const Layers     = App.Layers;
    const LabelCache = App.LabelCache;
    const Runtime    = App.Runtime;
    const Force      = App.Force;                                                // <-- The network's simulation nodes (set by RenderNetwork, loaded before this)

    // =====================================================================
    // REGION | Overlays - Tier Strip, Floating Labels, Navigator
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
                assembly  : 'Open everything - select a component or product to see the Resources it uses',
                component : 'Open everything - select a component or product to see the Resources it uses',
                product   : 'Open everything - select a component or product to see the Resources it uses',
                resource  : 'Open everything - select a component or product to see the Resources it uses'
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
                App.ValeObjectLibrary_El('span', { class: 'strip-legend__hint', text: App.ValeObjectLibrary_Plural(counts.records, 'record', 'records') + ' · collection ring = what it holds · +N = closed, heavy ring = open' })));
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
                ? Math.max(App.ValeObjectLibrary_TextWidth(candidate.name, App.ValeObjectLibrary_Font(11.5, 600)), captionWidth) + 14
                : App.ValeObjectLibrary_TextWidth(candidate.name, App.ValeObjectLibrary_Font(12, 600)) + 32;
            const height = force && candidate.caption ? 30 : 22;
            const simNode = force ? Force.nodes.get(candidate.key) : null;
            const toLeft  = simNode && simNode.labelSide
                ? simNode.labelSide === 'left'                               // <-- In a column, every label sits on the column's outer side
                : candidate.box.x + candidate.box.w / 2 < centre;
            const outside = toLeft
                ? transform.applyX(candidate.box.x) - 4 - width                  // <-- Network: on the outer side, away from the centre
                : transform.applyX(candidate.box.x + candidate.box.w) + 4;
            const left   = force ? outside : transform.applyX(candidate.box.x) - 2;
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
                label = force && candidate.caption
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
            const lit = candidate.key.indexOf('res:') === 0
                ? focus && focus.res.has(candidate.key.slice(4))
                : focus && (focus.nodes.has(candidate.key) || focus.twins.has(candidate.key));
            label.classList.toggle('is-dim', dimming && !lit);
        });
        LabelCache.forEach(function (label, key) {
            if (!used.has(key) && !label.hidden) {
                label.hidden = true;
            }
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the navigator - the whole chart in miniature, with the view on it
    // ------------------------------------------------------------
    App.ValeObjectLibrary_DrawNavigator = function () {
        if (!State.navigatorOn) {
            return;
        }
        const canvas = Elements.navCanvas;
        const ratio  = window.devicePixelRatio || 1;
        const width  = 200;
        const height = 128;
        if (canvas.width !== Math.round(width * ratio)) {
            canvas.width  = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
        }
        const context = canvas.getContext('2d');
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const b     = Layout.bounds;
        const pad   = 80;
        const bx    = b.x - pad;
        const by    = b.y - pad;
        const bw    = b.w + pad * 2;
        const bh    = b.h + pad * 2;
        const scale = Math.min(width / bw, height / bh);
        const ox    = (width - bw * scale) / 2 - bx * scale;
        const oy    = (height - bh * scale) / 2 - by * scale;
        Runtime.NavMapping  = { s: scale, ox: ox, oy: oy };

        const lane = Layout.lane;
        if (lane) {
            context.fillStyle = 'rgba(0, 131, 0, 0.07)';
            context.fillRect(ox + lane.x * scale, oy + lane.y * scale, lane.w * scale, lane.h * scale);
        }

        Layout.pos.forEach(function (box, uid) {
            context.fillStyle = App.ValeObjectLibrary_TierColour(Model.byUid.get(uid).tier);
            context.fillRect(ox + box.x * scale, oy + (box.y - box.h / 2) * scale, Math.max(1.5, box.w * scale), Math.max(1.5, box.h * scale));
        });
        context.fillStyle = App.ValeObjectLibrary_TierColour('resource');
        Layout.res.forEach(function (box) {
            context.fillRect(ox + box.x * scale, oy + (box.y - box.h / 2) * scale, Math.max(1.5, box.w * scale), Math.max(1.2, box.h * scale));
        });

        const t     = State.transform;
        const view  = App.ValeObjectLibrary_ViewArea();
        const left  = ox + t.invertX(0) * scale;
        const top   = oy + t.invertY(Settings.stripHeight) * scale;
        const right = ox + t.invertX(view.width) * scale;
        const lower = oy + t.invertY(view.height) * scale;
        context.fillStyle   = 'rgba(23, 43, 58, 0.08)';
        context.strokeStyle = '#172b3a';
        context.lineWidth   = 1.5;
        context.fillRect(left, top, right - left, lower - top);
        context.strokeRect(left, top, right - left, lower - top);

        Elements.navZoom.textContent = Math.round(t.k * 100) + '%';
    };
    // ------------------------------------------------------------

    // FUNCTION | Click or drag in the navigator to move the view
    // ------------------------------------------------------------
    App.ValeObjectLibrary_InitNavigator = function () {
        let dragging = false;
        const canvas = Elements.navCanvas;
        function moveTo(event) {
            const rect = canvas.getBoundingClientRect();
            const x    = (event.clientX - rect.left - Runtime.NavMapping.ox) / Runtime.NavMapping.s;
            const y    = (event.clientY - rect.top - Runtime.NavMapping.oy) / Runtime.NavMapping.s;
            Layers.svg.interrupt('camera');
            Layers.svg.call(Runtime.Zoom.translateTo, x, y, App.ValeObjectLibrary_ViewCentre());
        }
        canvas.addEventListener('pointerdown', function (event) {
            dragging = true;
            canvas.setPointerCapture(event.pointerId);
            moveTo(event);
        });
        canvas.addEventListener('pointermove', function (event) {
            if (dragging) {
                moveTo(event);
            }
        });
        canvas.addEventListener('pointerup', function () { dragging = false; });
        canvas.addEventListener('pointercancel', function () { dragging = false; });
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
