/* =============================================================================
 * VALE OBJECT LIBRARY - BANDS, CONNECTORS, BOXES AND THE RESOURCE COLUMN
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__RenderTree__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Chart
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Bands, connectors, boxes and the resource column
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

    const Glyph    = App.Glyph;
    const Settings = App.Settings;
    const Model    = App.Model;
    const Layout   = App.Layout;
    const State    = App.State;
    const Layers   = App.Layers;

    // =====================================================================
    // REGION | Rendering - Bands, Connectors, Boxes, Resource Library
    // =====================================================================

    // FUNCTION | Connector path - out of the right edge, down the spine, into the left edge
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Elbow = function (x1, y1, xm, x2, y2) {
        const round = function (v) { return Math.round(v * 10) / 10; };
        const dy    = y2 - y1;
        const sign  = dy < 0 ? -1 : 1;
        const r     = Math.max(0, Math.min(12, Math.abs(dy) / 2, xm - x1, x2 - xm));
        return 'M' + round(x1) + ',' + round(y1)
             + 'H' + round(xm - r)
             + 'Q' + round(xm) + ',' + round(y1) + ' ' + round(xm) + ',' + round(y1 + sign * r)
             + 'V' + round(y2 - sign * r)
             + 'Q' + round(xm) + ',' + round(y2) + ' ' + round(xm + r) + ',' + round(y2)
             + 'H' + round(x2);
    };

    App.ValeObjectLibrary_LinkPath = function (parentBox, childBox) {
        return App.ValeObjectLibrary_Elbow(parentBox.x + parentBox.w, parentBox.y, parentBox.x + parentBox.w + Settings.columnGap / 2, childBox.x, childBox.y);
    };

    App.ValeObjectLibrary_CollapsedLink = function (box) {
        const x = box.x + box.w;
        return App.ValeObjectLibrary_Elbow(x, box.y, x, x, box.y);
    };

    App.ValeObjectLibrary_RefPath = function (fromBox, toBox, offset) {
        const x1 = fromBox.x + fromBox.w + offset;
        const y1 = fromBox.y;
        const x2 = toBox.x;
        const y2 = toBox.y;
        const dx = Math.max(48, (x2 - x1) * 0.5);
        return 'M' + x1 + ',' + y1 + 'C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
    };
    // ------------------------------------------------------------

    // FUNCTION | Faint tier-coloured bands behind each column
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderBands = function () {
        const columns = Layout.columns.filter(function (column) { return column.key !== 'resource'; });
        Layers.bands.selectAll('rect.band')
            .data(columns, function (column) { return column.index; })
            .join('rect')
            .attr('class', 'band')
            .attr('x', function (column) { return column.x - 18; })
            .attr('width', function (column) { return column.w + 36; })
            .attr('y', -50000)
            .attr('height', 100000)
            .attr('fill', function (column) { return column.key === 'parts' ? '#c07a2c' : App.ValeObjectLibrary_TierColour(column.tier); });
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the "contains" connectors, growing from and folding into their parent
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderLinks = function () {
        const selection = Layers.links.selectAll('path.link')
            .data(Layout.links, function (link) { return link.child.uid; });

        selection.enter().append('path')
            .attr('class', 'link')
            .attr('d', function (link) {
                const anchor = App.ValeObjectLibrary_AnchorIn(Layout.prevPos, link.child, false) || Layout.pos.get(link.parent.uid);
                return App.ValeObjectLibrary_CollapsedLink(anchor);
            })
            .style('opacity', 0)
          .merge(selection)
            .transition('layout').duration(Settings.duration).ease(d3.easeCubicOut)
            .attr('d', function (link) { return App.ValeObjectLibrary_LinkPath(Layout.pos.get(link.parent.uid), Layout.pos.get(link.child.uid)); })
            .style('opacity', 1);

        selection.exit()
            .transition('layout').duration(Settings.duration).ease(d3.easeCubicOut)
            .attr('d', function (link) { return App.ValeObjectLibrary_CollapsedLink(App.ValeObjectLibrary_AnchorIn(Layout.pos, link.child, false) || Layout.pos.get(Model.root.uid)); })
            .style('opacity', 0)
            .remove();
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the boxes, sliding out of and back into their parent
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderNodes = function () {
        const selection = Layers.nodes.selectAll('g.node')
            .data(Layout.visible, function (placement) { return placement.uid; });

        const entering = selection.enter().append('g')
            .attr('class', function (placement) { return 'node tier-' + placement.tier; })
            .attr('transform', function (placement) {
                const box    = Layout.pos.get(placement.uid);
                const anchor = App.ValeObjectLibrary_AnchorIn(Layout.prevPos, placement, false) || box;
                return 'translate(' + anchor.x + ',' + (anchor.y - box.h / 2) + ')';
            })
            .style('opacity', 0)
            .on('click', App.ValeObjectLibrary_OnNodeClick)
            .on('dblclick', App.ValeObjectLibrary_OnNodeDoubleClick);

        entering.each(function (placement) {
            App.ValeObjectLibrary_BuildNode(d3.select(this), placement);
        });

        const merged = entering.merge(selection);
        merged.each(function (placement) {
            App.ValeObjectLibrary_UpdateNodeToggle(d3.select(this), placement);
        });
        merged.transition('layout').duration(Settings.duration).ease(d3.easeCubicOut)
            .attr('transform', function (placement) {
                const box = Layout.pos.get(placement.uid);
                return 'translate(' + box.x + ',' + (box.y - box.h / 2) + ')';
            })
            .style('opacity', 1);

        selection.exit()
            .transition('layout').duration(Settings.duration).ease(d3.easeCubicOut)
            .attr('transform', function (placement) {
                const anchor = App.ValeObjectLibrary_AnchorIn(Layout.pos, placement, false) || Layout.pos.get(Model.root.uid);
                return 'translate(' + anchor.x + ',' + (anchor.y - Settings.tierHeight[placement.tier] / 2) + ')';
            })
            .style('opacity', 0)
            .remove();
    };
    // ------------------------------------------------------------

    // FUNCTION | Build the inside of one box (once, when it first appears)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_BuildNode = function (group, placement) {
        const def       = placement.def;
        const width     = Settings.tierWidth[placement.tier];
        const height    = Settings.tierHeight[placement.tier];
        const nameFont  = Settings.nameFont[placement.tier];
        const largeSize = Settings.largeFont[placement.tier];
        const captionY  = height <= 46 ? 18 : height <= 56 ? 22 : height <= 64 ? 25 : 30;
        const nameY     = captionY + nameFont[0] + 4;
        const body      = group.append('g').attr('class', 'node__body');

        // A closed box with things inside shows as a small stack of cards
        body.append('rect').attr('class', 'node__stack').attr('x', 8).attr('y', 8).attr('width', width).attr('height', height).attr('rx', 9);
        body.append('rect').attr('class', 'node__stack').attr('x', 4).attr('y', 4).attr('width', width).attr('height', height).attr('rx', 9);
        body.append('rect').attr('class', 'node__card').attr('width', width).attr('height', height).attr('rx', 9);

        // The kind of thing it is: its Vale graphic in a bubble, ringed in the tier colour (the ring is CSS - .node__bubble
        // takes --ring from the .tier-* class on the box), with the writing starting beyond it
        const bubble = height >= 100 ? 68 : height - 12;
        const bubbleX = 12 + bubble / 2;
        const glyphSize = Math.round(bubble * 0.8);
        const textX = 12 + bubble + 12;
        body.append('circle').attr('class', 'node__bubble').attr('cx', bubbleX).attr('cy', height / 2).attr('r', bubble / 2 - 1.5);
        body.append('image').attr('class', 'node__glyph').attr('href', Glyph[placement.tier] || Glyph.resource)
            .attr('x', bubbleX - glyphSize / 2).attr('y', height / 2 - glyphSize / 2).attr('width', glyphSize).attr('height', glyphSize);

        // Full detail - caption, badges, name
        const text = body.append('g').attr('class', 'node__text');
        let caption = App.ValeObjectLibrary_TierLabel(placement).toUpperCase();
        if (placement.tier === 'scheme' && def.data.Version) {
            caption += ' · ' + def.data.Version;
        }
        if (placement.tier === 'product' && def.data['Product Code']) {
            caption += ' · ' + def.data['Product Code'];                       // <-- The catalogue code tells two "Finial"s apart
        }
        if (App.ValeObjectLibrary_IsUnavailable(def)) {
            caption += ' · UNAVAILABLE';
            group.classed('is-unavailable', true);
        }
        text.append('text').attr('class', 'node__caption').attr('x', textX).attr('y', captionY).text(caption);

        let right = width - 14;
        if (placement.qty > 1) {
            const label     = '×' + placement.qty;
            const pillWidth = App.ValeObjectLibrary_TextWidth(label, App.ValeObjectLibrary_Font(11, 700)) + 12;
            const pill = text.append('g').attr('class', 'node__qty').attr('transform', 'translate(' + (right - pillWidth) + ',' + (captionY - 12) + ')');
            pill.append('rect').attr('width', pillWidth).attr('height', 17).attr('rx', 8.5);
            pill.append('text').attr('x', pillWidth / 2).attr('y', 12.5).attr('text-anchor', 'middle').text(label);
            pill.append('title').text('Quantity: ' + placement.qty + ' in ' + placement.parent.def.name);
            right -= pillWidth + 8;
        }
        const copies = def.placements.length;
        if (copies > 1) {
            const label = String(copies);
            const badge = text.append('g').attr('class', 'node__copies')
                .attr('transform', 'translate(' + (right - 14 - App.ValeObjectLibrary_TextWidth(label, App.ValeObjectLibrary_Font(10.5, 700))) + ',' + (captionY - 10) + ')');
            badge.append('rect').attr('x', 3.5).attr('y', 0.5).attr('width', 7).attr('height', 7).attr('rx', 1.5);
            badge.append('rect').attr('x', 0.5).attr('y', 3.5).attr('width', 7).attr('height', 7).attr('rx', 1.5);
            badge.append('text').attr('x', 14).attr('y', 9.5).text(label);
            badge.append('title').text(placement.tree === 'library'
                ? 'One library record, shown in ' + copies + ' places in the library'
                : 'One library record, used in ' + copies + ' places in this scheme');
        }

        const nameText = App.ValeObjectLibrary_FitText(def.name, App.ValeObjectLibrary_Font(nameFont[0], nameFont[1]), width - textX - 20);
        text.append('text').attr('class', 'node__name').attr('x', textX).attr('y', nameY)
            .attr('font-size', nameFont[0]).attr('font-weight', nameFont[1]).text(nameText);
        if (placement.tier === 'scheme' || placement.tier === 'library') {
            const stats = placement.tier === 'scheme' ? App.ValeObjectLibrary_SchemeStats() : App.ValeObjectLibrary_LibraryStats();
            text.append('text').attr('class', 'node__stats').attr('x', textX).attr('y', nameY + 24)
                .text(App.ValeObjectLibrary_FitText(stats, App.ValeObjectLibrary_Font(12, 400), width - textX - 20));
        }

        // Zoomed out - a larger short name only
        const large = App.ValeObjectLibrary_FitLarge(App.ValeObjectLibrary_ShortName(def), largeSize, width - textX - 18);
        body.append('text').attr('class', 'node__name-large').attr('x', textX).attr('y', height / 2).attr('dy', '0.36em')
            .attr('font-size', large.size).attr('font-weight', 700)
            .text(large.text);

        if (nameText !== def.name) {
            group.append('title').text(def.name);
        }

        // The open / close pill on the right edge
        if (placement.children.length) {
            const toggle = body.append('g').attr('class', 'node__toggle')
                .attr('transform', 'translate(' + width + ',' + (height / 2) + ')')
                .on('click', function (event) {
                    event.stopPropagation();
                    App.ValeObjectLibrary_HideHint();
                    App.ValeObjectLibrary_ToggleNode(placement);
                })
                .on('dblclick', function (event) { event.stopPropagation(); });
            toggle.append('rect').attr('y', -10).attr('height', 20).attr('rx', 10);
            toggle.append('text').attr('dy', '0.35em').attr('text-anchor', 'middle');
            toggle.append('title');
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Refresh the open / close pill and the stacked-card look
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateNodeToggle = function (group, placement) {
        if (!placement.children.length) {
            return;
        }
        const open  = State.expanded.has(placement.uid);
        const label = open ? '−' : '+' + placement.children.length;
        const width = open ? 22 : Math.max(26, App.ValeObjectLibrary_TextWidth(label, App.ValeObjectLibrary_Font(11, 700)) + 14);
        group.classed('is-open', open).classed('has-hidden', !open);
        const toggle = group.select('.node__toggle');
        toggle.select('rect').attr('x', -width / 2).attr('width', width);
        toggle.select('text').text(label);
        toggle.select('title').text(open ? 'Close ' + placement.def.name : 'Open ' + placement.def.name + ' - ' + App.ValeObjectLibrary_Plural(placement.children.length, 'item', 'items') + ' inside');
    };

    App.ValeObjectLibrary_SchemeStats = function () {
        const used = { assembly: new Set(), part: new Set() };
        Model.placements.forEach(function (placement) {
            if (placement.tier === 'assembly') { used.assembly.add(placement.def.id); }
            if (App.ValeObjectLibrary_IsPart(placement.tier)) { used.part.add(placement.def.id); }
        });
        return App.ValeObjectLibrary_Plural(Model.root.children.length, 'family', 'families') + ' · '
             + App.ValeObjectLibrary_Plural(used.assembly.size, 'assembly', 'assemblies') + ' · '
             + App.ValeObjectLibrary_Plural(used.part.size, 'part', 'parts');
    };

    App.ValeObjectLibrary_LibraryStats = function () {
        const counts = App.ValeObjectLibrary_LibraryCounts();
        return App.ValeObjectLibrary_Plural(Model.trees.library.root.children.length, 'category', 'categories') + ' · '
             + App.ValeObjectLibrary_Plural(counts.records, 'record', 'records');
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the shared Resource library column (once - it never folds)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderLane = function () {
        const lane    = Layout.lane;
        const padding = Settings.lanePadding;
        const layer   = Layers.lane;
        layer.selectAll('*').remove();
        if (!lane) {
            return;
        }

        layer.append('rect').attr('class', 'lane__frame').attr('x', lane.x).attr('y', lane.y).attr('width', lane.w).attr('height', lane.h).attr('rx', 16);

        const titles = layer.append('g').attr('class', 'lane__titles');
        titles.append('text').attr('class', 'lane__kicker').attr('x', lane.x + padding).attr('y', lane.y + 26).text(lane.empty ? 'RESOURCES' : 'THIS PART');
        titles.append('text').attr('class', 'lane__title').attr('x', lane.x + padding).attr('y', lane.y + 50).text('Resources');
        titles.append('text').attr('class', 'lane__subtitle').attr('x', lane.x + padding).attr('y', lane.y + 68)
            .text(lane.empty ? 'Open a component, product or assembly' : 'Attached to this level only');
        if (lane.empty) {
            return;
        }
        lane.groups.forEach(function (group) {
            titles.append('text').attr('class', 'lane__group').attr('x', lane.x + padding + 2).attr('y', group.y + 19)
                .text(group.key.toUpperCase() + ' · ' + group.count);
        });

        const items = layer.selectAll('g.res')
            .data(Model.resources.filter(function (resource) { return Layout.res.has(resource.id); }), function (resource) { return resource.id; })
            .join('g')
            .attr('class', 'res')
            .attr('transform', function (resource) {
                const box = Layout.res.get(resource.id);
                return 'translate(' + box.x + ',' + (box.y - box.h / 2) + ')';
            })
            .on('click', function (event, resource) {
                event.stopPropagation();
                App.ValeObjectLibrary_HideHint();
                App.ValeObjectLibrary_Select({ type: 'resource', id: resource.id });
            })
            .on('dblclick', function (event) { event.stopPropagation(); });

        items.each(function (resource) {
            const group  = d3.select(this);
            const box    = Layout.res.get(resource.id);
            const font   = Settings.nameFont.resource;
            const body   = group.append('g').attr('class', 'res__body');
            const singular = (Model.groups.get(resource.group) || {}).singular || resource.group;
            const caption  = singular.toUpperCase() + (resource.paintNumber ? '  ' + String(resource.paintNumber).padStart(2, '0') : '');
            body.append('rect').attr('class', 'res__card').attr('width', box.w).attr('height', box.h).attr('rx', 8);
            body.append('rect').attr('class', 'res__bar').attr('x', 9).attr('y', 9).attr('width', 4).attr('height', box.h - 18).attr('rx', 2)
                .attr('fill', App.ValeObjectLibrary_TierColour('resource'));
            const text = body.append('g').attr('class', 'res__text');
            text.append('text').attr('class', 'res__caption').attr('x', 22).attr('y', 16).text(caption);
            const usesLabel = resource.attributes && resource.attributes.length
                ? App.ValeObjectLibrary_Plural(resource.attributes.length, 'attribute', 'attributes')
                : App.ValeObjectLibrary_Plural(resource.users.length, 'object', 'objects');
            text.append('text').attr('class', 'res__count').attr('x', box.w - 12).attr('y', 16).attr('text-anchor', 'end').text(usesLabel);
            if (resource.attributes && resource.attributes.length) {                // <-- The data box marks the attribute count
                const countWidth = App.ValeObjectLibrary_TextWidth(usesLabel, App.ValeObjectLibrary_Font(10.5, 700));
                text.append('image').attr('class', 'res__attr-glyph').attr('href', Glyph.attribute)
                    .attr('x', box.w - 12 - countWidth - 20).attr('y', 3).attr('width', 16).attr('height', 16);
            }
            text.append('text').attr('class', 'res__name').attr('x', 22).attr('y', 31).attr('font-size', font[0]).attr('font-weight', font[1])
                .text(App.ValeObjectLibrary_FitText(resource.name, App.ValeObjectLibrary_Font(font[0], font[1]), box.w - 52));
            if (resource.attributes && resource.attributes.length && box.h >= 52
                && State.selection && State.selection.type === 'resource' && State.selection.id === resource.id) {
                text.append('text').attr('class', 'res__attrs').attr('x', 22).attr('y', 46)
                    .text(App.ValeObjectLibrary_FitText(resource.attributes.map(function (attribute) { return attribute.label; }).join(' · '), App.ValeObjectLibrary_Font(10, 600), box.w - 36));
            }
            if (resource.data.Swatch) {
                body.append('rect').attr('class', 'res__swatch').attr('x', box.w - 26).attr('y', 21).attr('width', 14).attr('height', 12).attr('rx', 3)
                    .attr('fill', resource.data.Swatch);
            }
            const large = App.ValeObjectLibrary_FitLarge(resource.name, Settings.largeFont.resource, box.w - 32);
            body.append('text').attr('class', 'res__name-large').attr('x', 22).attr('y', box.h / 2).attr('dy', '0.36em')
                .attr('font-size', large.size).attr('font-weight', 700)
                .text(large.text);
            group.append('title').text(resource.name + ' - used by ' + usesLabel + ' in the library');
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the dashed "uses a Resource" links
    // ------------------------------------------------------------
    // Links are drawn only from the open Component, Product or Assembly
    // to the resources that object names. A closed assembly does not
    // also draw the resources of the parts inside it.
    App.ValeObjectLibrary_RefPairs = function () {
        const pairs = new Map();
        if (State.focus) {
            State.focus.refPairs.forEach(function (pair) {
                pairs.set(pair[0] + '|' + pair[1], { from: pair[0], to: pair[1], strong: true });
            });
        }
        return Array.from(pairs.values()).filter(function (pair) { return Layout.pos.has(pair.from); });
    };

    App.ValeObjectLibrary_RenderRefs = function (fadeIn) {
        const force = App.ValeObjectLibrary_IsForce();
        const data  = App.ValeObjectLibrary_RefPairs().filter(function (pair) { return Layout.res.has(pair.to); });
        Layers.svg.classed('has-many-refs', data.length > 600);

        Layers.refs.selectAll('path.ref')
            .data(data, function (pair) { return pair.from + '|' + pair.to; })
            .join('path')
            .attr('class', 'ref')
            .classed('is-strong', function (pair) { return pair.strong; })
            .attr('d', function (pair) {
                if (force) {
                    return App.ValeObjectLibrary_ForceRefPath(pair);                 // <-- The network draws straight lines, moved every tick
                }
                const placement = Model.byUid.get(pair.from);
                const offset    = placement.children.length ? 13 : 0;             // <-- Start past the open / close pill
                return App.ValeObjectLibrary_RefPath(Layout.pos.get(pair.from), Layout.res.get(pair.to), offset);
            });

        Layers.refs.interrupt();
        if (fadeIn && Settings.duration) {
            Layers.refs.style('opacity', 0).transition().delay(Settings.duration * 0.75).duration(250).style('opacity', 1);
        } else {
            Layers.refs.style('opacity', 1);
        }
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
