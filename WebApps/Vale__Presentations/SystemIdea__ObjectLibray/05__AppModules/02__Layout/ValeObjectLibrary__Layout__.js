/* =============================================================================
 * VALE OBJECT LIBRARY - TIER COLUMNS, TIDY TREE AND THE RESOURCE COLUMN
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Layout__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Layout
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Tier columns, tidy tree and the resource column
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

    const Settings = App.Settings;
    const Model    = App.Model;
    const Layout   = App.Layout;
    const State    = App.State;
    const Layers   = App.Layers;

    // =====================================================================
    // REGION | Layout - Tier Columns, Tidy Tree, Resource Library Column
    // =====================================================================
    // Every tier owns a fixed column, so everything in a column is the same
    // kind of thing at any zoom. A column is only built once something in it
    // is actually open: sub-assemblies stay out of the scheme until their
    // parent assembly is opened, and the Resources column stays out until a
    // part that uses them is open. When a link has to cross a column (a
    // Product placed straight into a Family), invisible pass-through boxes
    // are inserted for the layout, so the tidy-tree algorithm keeps that
    // column clear for the line and nothing in it can land on top of another box.
    // =====================================================================

    // FUNCTION | Which columns the open boxes need
    // ------------------------------------------------------------
    App.ValeObjectLibrary_VisibleColumns = function () {
        const nests    = [];
        let hasFamily  = false;
        let hasParts   = false;
        function walk(placement) {
            if (placement.tier === 'family' || placement.tier === 'category') {
                hasFamily = true;
            } else if (placement.tier === 'assembly') {
                if (nests.indexOf(placement.nest) === -1) {
                    nests.push(placement.nest);
                }
            } else if (App.ValeObjectLibrary_IsPart(placement.tier)) {
                hasParts = true;
            }
            if (State.expanded.has(placement.uid)) {
                placement.children.forEach(walk);
            }
        }
        if (Model.root) {
            walk(Model.root);
        }
        nests.sort(function (a, b) { return a - b; });
        return { nests: nests, hasFamily: hasFamily, hasParts: hasParts };
    };

    // FUNCTION | Build the columns for what is open, left to right
    // ------------------------------------------------------------
    App.ValeObjectLibrary_BuildColumns = function () {
        const columns = [];
        const library = State.view === 'library';
        const open    = App.ValeObjectLibrary_VisibleColumns();
        const assemblyColumns = {};
        columns.push({ key: library ? 'library' : 'scheme', tier: library ? 'library' : 'scheme' });
        if (open.hasFamily) {
            columns.push({ key: library ? 'category' : 'family', tier: library ? 'category' : 'family' });
        }
        open.nests.forEach(function (nest) {
            columns.push({ key: nest === 0 ? 'assembly' : 'subassembly', tier: 'assembly', nest: nest });
            assemblyColumns[nest] = columns.length - 1;
        });
        if (open.hasParts) {
            columns.push({ key: 'parts', tier: 'component' });
        }
        const showResources = false;                                         // <-- Attributes are the JSON column, not a lane of resource boxes
        if (showResources) {
            columns.push({ key: 'resource', tier: 'resource' });
        }

        let x = 0;
        columns.forEach(function (column, index) {
            if (column.key === 'resource') {
                x += Settings.laneGap;                                        // <-- Set the resource column apart from the scheme
            }
            column.index = index;
            column.w     = Settings.tierWidth[column.tier];
            column.x     = x;
            x += column.w + Settings.columnGap;
        });
        Layout.columns         = columns;
        Layout.assemblyColumns = assemblyColumns;
        Layout.partsColumn     = -1;
        Layout.resourceColumn  = -1;
        columns.forEach(function (column) {
            if (column.key === 'parts')    { Layout.partsColumn = column.index; }
            if (column.key === 'resource') { Layout.resourceColumn = column.index; }
        });
    };

    App.ValeObjectLibrary_ColumnOf = function (placement) {
        if (placement.tier === 'scheme' || placement.tier === 'library') { return 0; }
        if (placement.tier === 'family' || placement.tier === 'category') { return 1; }
        if (placement.tier === 'assembly') { return Layout.assemblyColumns[placement.nest]; }
        return Layout.partsColumn;
    };
    // ------------------------------------------------------------

    // FUNCTION | Lay out every visible box with D3's tidy tree
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ComputeLayout = function () {
        Layout.prevPos = Layout.pos;
        const positions = new Map();
        const visible   = [];
        const links     = [];

        function buildLayoutNode(placement) {
            const node = { placement: placement, col: App.ValeObjectLibrary_ColumnOf(placement), h: Settings.tierHeight[placement.tier], children: [] };
            if (State.expanded.has(placement.uid)) {
                placement.children.forEach(function (child) {
                    let attach = node;
                    const childColumn = App.ValeObjectLibrary_ColumnOf(child);
                    for (let column = node.col + 1; column < childColumn; column++) {
                        const passThrough = { dummy: true, col: column, h: Settings.tierHeight[child.tier], children: [] };
                        attach.children.push(passThrough);
                        attach = passThrough;
                    }
                    attach.children.push(buildLayoutNode(child));
                });
            }
            return node;
        }

        const root = d3.hierarchy(buildLayoutNode(Model.root));
        d3.tree().nodeSize([1, 1]).separation(App.ValeObjectLibrary_Separation)(root);

        root.each(function (node) {
            if (node.data.dummy) {
                return;
            }
            const column    = Layout.columns[node.data.col];
            const placement = node.data.placement;
            positions.set(placement.uid, { x: column.x, y: node.x, w: column.w, h: node.data.h });
            visible.push(placement);
            if (placement.parent) {
                links.push({ parent: placement.parent, child: placement });
            }
        });

        Layout.pos     = positions;
        Layout.visible = visible;
        Layout.links   = links;
        Layout.bounds  = App.ValeObjectLibrary_ContentBounds();
    };

    // SUB FUNCTION | Vertical spacing between neighbours, in pixels
    App.ValeObjectLibrary_Separation = function (a, b) {
        const base = (a.data.h + b.data.h) / 2;
        if (a.parent === b.parent) {
            return base + Settings.gapSibling;
        }
        if (a.parent && b.parent && a.parent.parent === b.parent.parent) {
            return base + Settings.gapCousin;
        }
        return base + Settings.gapDistant;
    };
    // ------------------------------------------------------------

    // FUNCTION | Resources for the open part only - not the whole library
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ResourceHostPlacement = function () {
        const selection = State.selection;
        if (selection && selection.type === 'node') {
            const placement = Model.byUid.get(selection.uid);
            if (placement && placement.tree === State.view && App.ValeObjectLibrary_OwnsResources(placement.tier)) {
                return placement;
            }
            return null;
        }
        if (State.resourceHost) {
            const host = Model.byUid.get(State.resourceHost);
            if (host && host.tree === State.view) {
                return host;
            }
        }
        return null;
    };

    App.ValeObjectLibrary_LaneResourceIds = function () {
        const ids  = new Set();
        const host = App.ValeObjectLibrary_ResourceHostPlacement();
        if (host) {
            host.def.uses.forEach(function (id) { ids.add(id); });
        } else if (State.selection && State.selection.type === 'resource') {
            ids.add(State.selection.id);
        }
        return ids;
    };

    App.ValeObjectLibrary_RememberResourceHost = function (target) {
        if (!target) {
            State.resourceHost = null;
            return;
        }
        if (target.type === 'node') {
            const placement = Model.byUid.get(target.uid);
            State.resourceHost = placement && App.ValeObjectLibrary_OwnsResources(placement.tier) ? placement.uid : null;
            return;
        }
        const host = State.resourceHost && Model.byUid.get(State.resourceHost);
        if (!(host && host.def.uses.indexOf(target.id) !== -1)) {
            State.resourceHost = null;
        }
    };

    App.ValeObjectLibrary_LayoutLane = function () {
        const column = Layout.columns[Layout.resourceColumn];
        if (!column) {
            Layout.res  = new Map();
            Layout.lane = null;
            return;
        }
        const padding = Settings.lanePadding;
        const wanted  = App.ValeObjectLibrary_LaneResourceIds();
        const groups  = [];
        const boxes   = new Map();

        if (!wanted.size) {                                                   // <-- No part is open, so the scheme shows no resources
            Layout.res  = boxes;
            Layout.lane = null;
            return;
        }

        let y = Settings.laneTitle;
        Model.groups.forEach(function (group) {
            const items = group.items.filter(function (resource) { return wanted.has(resource.id); });
            if (!items.length) {
                return;
            }
            items.sort(function (a, b) {
                if (a.cardOrder && b.cardOrder) {
                    return a.cardOrder - b.cardOrder;
                }
                return 0;
            });
            groups.push({ key: group.key, count: items.length, y: y });
            y += Settings.laneGroupTitle;
            items.forEach(function (resource) {
                const itemH = resource.attributes && resource.attributes.length ? 56 : Settings.tierHeight.resource;
                boxes.set(resource.id, { x: column.x + padding, y: y + itemH / 2, w: column.w - padding * 2, h: itemH });
                y += itemH + Settings.laneItemGap;
            });
            y += Settings.laneGroupGap - Settings.laneItemGap;
        });

        const height  = y - Settings.laneGroupGap + padding + 4;
        const host    = App.ValeObjectLibrary_ResourceHostPlacement();
        const hostBox = host && Layout.pos.get(host.uid);
        const offset  = hostBox ? hostBox.y - height / 2 : -height / 2;
        boxes.forEach(function (box) { box.y += offset; });
        groups.forEach(function (group) { group.y += offset; });
        Layout.res  = boxes;
        Layout.lane = { x: column.x, y: offset, w: column.w, h: height, groups: groups, empty: false };
    };

    App.ValeObjectLibrary_SyncLane = function () {
        if (App.ValeObjectLibrary_IsForce() || State.view === 'schemes') {
            return;
        }
        App.ValeObjectLibrary_LayoutLane();
        if (!Layout.lane) {
            Layers.lane.selectAll('*').remove();
            return;
        }
        App.ValeObjectLibrary_RenderLane();
        Layout.bounds = App.ValeObjectLibrary_ContentBounds();
    };
    // ------------------------------------------------------------

    // FUNCTION | Bounding boxes in chart space
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ContentBounds = function () {
        const box = App.ValeObjectLibrary_BoxOf(Array.from(Layout.pos.keys()), App.ValeObjectLibrary_IsForce() ? Array.from(Layout.res.keys()) : []);
        const lane = Layout.lane;
        if (!lane) {
            return box;
        }
        const x0 = Math.min(box.x, lane.x);
        const x1 = Math.max(box.x + box.w, lane.x + lane.w);
        if (lane.h > 900) {                                                   // <-- A full paint card must not shrink the whole scheme
            return { x: x0, y: box.y, w: x1 - x0, h: box.h };
        }
        const y0 = Math.min(box.y, lane.y);
        const y1 = Math.max(box.y + box.h, lane.y + lane.h);
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };

    App.ValeObjectLibrary_BoxOf = function (uids, resourceIds) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        function add(box, rightPad) {
            if (!box) { return; }
            x0 = Math.min(x0, box.x);
            y0 = Math.min(y0, box.y - box.h / 2);
            x1 = Math.max(x1, box.x + box.w + rightPad);
            y1 = Math.max(y1, box.y + box.h / 2);
        }
        (uids || []).forEach(function (uid) { add(Layout.pos.get(uid), 14); });
        (resourceIds || []).forEach(function (id) { add(Layout.res.get(id), 0); });
        if (x0 === Infinity) {
            return Layout.bounds;
        }
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };
    // ------------------------------------------------------------

    // FUNCTION | Nearest visible box for a placement (itself or an ancestor)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_NearestVisible = function (placement) {
        for (let node = placement; node; node = node.parent) {
            if (Layout.pos.has(node.uid)) {
                return node;
            }
        }
        return Model.root;
    };

    App.ValeObjectLibrary_AnchorIn = function (map, placement, includeSelf) {
        for (let node = includeSelf ? placement : placement.parent; node; node = node.parent) {
            if (map.has(node.uid)) {
                return map.get(node.uid);
            }
        }
        return null;
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
