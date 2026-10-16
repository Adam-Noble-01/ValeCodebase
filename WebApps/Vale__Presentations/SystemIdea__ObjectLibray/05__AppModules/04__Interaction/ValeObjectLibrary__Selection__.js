/* =============================================================================
 * VALE OBJECT LIBRARY - SELECTION, HIGHLIGHTING AND REVEALING
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Selection__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Interaction
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Selection, highlighting and revealing
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
 * 16-Oct-2026 - Version 2.0.1
 * - Opening a branch in the library network collapses the shelves outside that group
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const TierRank   = App.TierRank;
    const Model      = App.Model;
    const Layout     = App.Layout;
    const State      = App.State;
    const Elements   = App.Elements;
    const Layers     = App.Layers;
    const LabelCache = App.LabelCache;

    // =====================================================================
    // REGION | Selection, Highlighting and Revealing
    // =====================================================================

    // FUNCTION | Work out what the selection lights up
    // ------------------------------------------------------------
    // Lit up: the selected box, its route back to the Scheme, everything
    // open inside it, and every other place the same library record is
    // used (its "twins"). Dashed lines to the Resources are drawn for a
    // selected Component or Product (what it draws on) and a selected
    // Resource (everything that uses it) - for a whole Family or Assembly
    // they would only be a tangle; the panel lists those instead.
    App.ValeObjectLibrary_ComputeFocus = function () {
        const selection = State.selection;
        if (!selection) {
            State.focus = null;
            return;
        }
        const focus = { nodes: new Set(), links: new Set(), res: new Set(), twins: new Set(), refPairs: [], selectedUid: null, selectedRes: null };

        function addRoute(placement) {
            for (let node = placement; node; node = node.parent) {
                if (Layout.pos.has(node.uid)) {
                    focus.nodes.add(node.uid);
                    if (node.parent) {
                        focus.links.add(node.uid);
                    }
                }
            }
        }

        if (selection.type === 'node') {
            const placement = Model.byUid.get(selection.uid);
            if (!placement) {
                State.focus = null;
                return;
            }
            const anchor = App.ValeObjectLibrary_NearestVisible(placement);
            if (anchor === placement) {
                focus.selectedUid = placement.uid;
            }
            addRoute(anchor);

            (function walkOpen(node) {
                if (node !== anchor) {
                    focus.nodes.add(node.uid);
                    focus.links.add(node.uid);
                }
                if (State.expanded.has(node.uid)) {
                    node.children.forEach(walkOpen);
                }
            })(anchor);

            if (anchor === placement && App.ValeObjectLibrary_OwnsResources(placement.tier)) {
                placement.def.uses.forEach(function (id) {
                    focus.res.add(id);
                    focus.refPairs.push([placement.uid, id]);
                });
            }

            placement.def.placements.forEach(function (twin) {
                if (twin === placement) {
                    return;
                }
                const visibleTwin = App.ValeObjectLibrary_NearestVisible(twin);
                if (visibleTwin === twin) {
                    focus.twins.add(twin.uid);
                }
                addRoute(visibleTwin);
            });
        } else {
            const resource = Model.defs.get(selection.id);
            if (!resource) {
                State.focus = null;
                return;
            }
            focus.selectedRes = resource.id;
            const host = App.ValeObjectLibrary_ResourceHostPlacement();
            if (host && Layout.pos.has(host.uid)) {
                addRoute(host);
                host.def.uses.forEach(function (id) {
                    focus.res.add(id);
                    focus.refPairs.push([host.uid, id]);
                });
            }
            focus.res.add(resource.id);
        }
        State.focus = focus;
    };
    // ------------------------------------------------------------

    // FUNCTION | Push selection, reuse and search states onto the chart
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ApplyStateClasses = function () {
        const focus   = State.focus;
        const matches = State.matches;
        Layers.svg.classed('has-focus', !!focus && !State.softFocus);           // <-- A tour step can select without dimming the rest
        Layers.nodes.selectAll('g.node')
            .classed('is-related', function (p) { return !!focus && focus.nodes.has(p.uid); })
            .classed('is-selected', function (p) { return !!focus && focus.selectedUid === p.uid; })
            .classed('is-twin', function (p) { return !!focus && focus.twins.has(p.uid); })
            .classed('is-match', function (p) { return matches.size > 0 && matches.has(p.def.id); })
            .classed('is-match-inside', function (p) {                           // <-- A closed box with a search match somewhere inside it
                if (!matches.size || matches.has(p.def.id) || State.expanded.has(p.uid)) {
                    return false;
                }
                for (const id of matches) {
                    if (p.subtreeDefs.has(id)) {
                        return true;
                    }
                }
                return false;
            });
        Layers.links.selectAll('path.link')
            .classed('is-path', function (link) { return !!focus && focus.links.has(link.child.uid); });
        Layers.lane.selectAll('g.res')
            .classed('is-related', function (r) { return !!focus && focus.res.has(r.id); })
            .classed('is-selected', function (r) { return !!focus && focus.selectedRes === r.id; })
            .classed('is-match', function (r) { return matches.size > 0 && matches.has(r.id); });
        App.ValeObjectLibrary_QueueFrame();                                          // <-- Floating labels follow the dimming
    };
    // ------------------------------------------------------------

    // FUNCTION | Select a box or a Resource (or null to clear)
    // ------------------------------------------------------------
    // options.refresh : re-lay out first (something was opened)
    // options.fly     : bring it into view if it is off screen or too small
    App.ValeObjectLibrary_Select = function (target, options) {
        const opts = options || {};
        App.ValeObjectLibrary_RememberResourceHost(target);
        State.selection = target || null;
        State.softFocus = false;
        if (opts.refresh || App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_Refresh();                                     // <-- The network lays out again; resources stay in the attributes column
        } else {
            App.ValeObjectLibrary_SyncLane();
            App.ValeObjectLibrary_UpdateZoomExtent();
            App.ValeObjectLibrary_ComputeFocus();
            App.ValeObjectLibrary_ApplyStateClasses();
            App.ValeObjectLibrary_RenderRefs(false);
        }
        App.ValeObjectLibrary_RenderInspector();
        App.ValeObjectLibrary_UpdateHash();
        if (target && opts.fly) {
            App.ValeObjectLibrary_AfterSettle(function () {
                if (State.selection === target) {
                    App.ValeObjectLibrary_EnsureVisible(App.ValeObjectLibrary_TargetBox(target));
                }
            });
        } else if (target && target.type === 'node' && App.ValeObjectLibrary_IsForce() && State.focus && State.focus.res.size) {
            App.ValeObjectLibrary_AfterSettle(function () {                      // <-- Network: keep a part and the Resources it brought in on screen
                if (State.selection === target && State.focus) {
                    App.ValeObjectLibrary_EnsureVisible(App.ValeObjectLibrary_BoxOf([target.uid], Array.from(State.focus.res)));
                }
            });
        }
    };

    App.ValeObjectLibrary_TargetBox = function (target) {
        if (target.type === 'resource') {
            return App.ValeObjectLibrary_BoxOf([], [target.id]);
        }
        return App.ValeObjectLibrary_BoxOf([App.ValeObjectLibrary_NearestVisible(Model.byUid.get(target.uid)).uid], []);
    };
    // ------------------------------------------------------------

    // FUNCTION | Select a record by its library id - its first place in the scheme
    // ------------------------------------------------------------
    App.ValeObjectLibrary_SelectById = function (id, options) {
        const opts = options || {};
        const def  = Model.defs.get(id);
        if (!def) {
            return false;
        }
        if (def.tier === 'resource') {
            const opened = opts.revealUses ? App.ValeObjectLibrary_RevealDef(id) : false;
            App.ValeObjectLibrary_Select({ type: 'resource', id: id }, { fly: opts.fly, refresh: opened });
            return true;
        }
        const placement = def.placements[0];
        if (!placement) {
            return false;
        }
        const opened = opts.reveal ? App.ValeObjectLibrary_RevealPlacement(placement) : false;
        if (opts.reveal && App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_FocusBranch(placement.children.length ? placement : placement.parent);
        }
        App.ValeObjectLibrary_Select({ type: 'node', uid: placement.uid }, { fly: opts.fly, refresh: opened || State.branchFocus });
        return true;
    };
    // ------------------------------------------------------------

    // FUNCTION | Go to one placement from the panel - open its route, select it, fly to it
    // ------------------------------------------------------------
    App.ValeObjectLibrary_GoTo = function (placement) {
        if (placement.tree !== State.view) {
            App.ValeObjectLibrary_SetView(placement.tree, { fit: false });           // <-- A link into the other view switches to it first
        }
        const opened = App.ValeObjectLibrary_RevealPlacement(placement);
        if (App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_FocusBranch(placement.children.length ? placement : placement.parent);
        }
        App.ValeObjectLibrary_Select({ type: 'node', uid: placement.uid }, { fly: true, refresh: opened || State.branchFocus });
    };
    // ------------------------------------------------------------

    // FUNCTION | Go to a record wherever it can be shown - this view first, else the other
    // ------------------------------------------------------------
    App.ValeObjectLibrary_JumpTo = function (def) {
        if (State.view === 'schemes') {
            App.ValeObjectLibrary_SetView('scheme', { fit: false });
        }
        if (def.tier === 'resource') {
            App.ValeObjectLibrary_Select({ type: 'resource', id: def.id }, { fly: true });
            return;
        }
        let view = State.view;
        if (!(def.placementsIn[view] || []).length) {
            view = view === 'scheme' ? 'library' : 'scheme';
            if (!(def.placementsIn[view] || []).length) {
                return;
            }
            App.ValeObjectLibrary_SetView(view, { fit: false });
        }
        App.ValeObjectLibrary_SelectById(def.id, { reveal: true, fly: true });
    };
    // ------------------------------------------------------------

    // FUNCTION | Switch between the Scheme view and the whole Library view
    // ------------------------------------------------------------
    // Both views are built from the same records at start-up; switching
    // swaps which tree is on show, rebuilds the columns and redraws.
    // options.fit    : false keeps the camera (the caller will move it)
    // options.detail : how far to open the new view
    // options.force  : redraw even if this view is already on show
    App.ValeObjectLibrary_SetView = function (view, options) {
        const opts = options || {};
        if (view === 'schemes') {
            State.view = 'schemes';
            Elements.workspace.classList.add('is-schemes');
            if (Elements.schemes) {
                Elements.schemes.hidden = false;
            }
            App.ValeObjectLibrary_RenderSchemes();
            App.ValeObjectLibrary_UpdateControls();
            App.ValeObjectLibrary_UpdateHash();
            App.ValeObjectLibrary_HideHint();
            return;
        }
        Elements.workspace.classList.remove('is-schemes');
        if (Elements.schemes) {
            Elements.schemes.hidden = true;
        }
        const tree = Model.trees[view];
        if (!tree) {
            return;
        }
        const changed = State.view !== view || opts.force;
        State.view       = view;
        Model.root       = tree.root;
        Model.placements = tree.placements;
        Model.byUid      = tree.byUid;
        Model.maxNest    = tree.maxNest;
        Model.defs.forEach(function (def) {
            def.placements = def.placementsIn[view] || [];
            def.totalQty   = def.totalIn[view] || 0;
        });
        if (!changed) {
            return;
        }

        State.selection    = null;
        State.resourceHost = null;
        State.focus        = null;
        State.softFocus = false;
        State.matches   = new Set();
        App.ValeObjectLibrary_ForceStop();
        App.ValeObjectLibrary_BuildColumns();
        if (view === 'library') {
            Layout.lane = null;                                              // <-- In the network, Resources are nodes, not a column
            Layout.res  = new Map();
        } else {
            App.ValeObjectLibrary_LayoutLane();
        }

        [Layers.nodes, Layers.links, Layers.refs, Layers.bands, Layers.lane].forEach(function (layer) {
            layer.selectAll('*').interrupt('layout').remove();               // <-- Nothing animates across from the other view
        });
        Layout.pos     = new Map();
        Layout.prevPos = new Map();
        LabelCache.forEach(function (label) { label.remove(); });
        LabelCache.clear();
        Elements.tierStrip.textContent = '';
        Layers.svg.classed('is-network', view === 'library');
        if (view !== 'library') {
            App.ValeObjectLibrary_RenderLane();
        }
        App.ValeObjectLibrary_BuildTierStrip();

        App.ValeObjectLibrary_ApplyDetail(opts.detail || 'scheme');      // <-- Always start collapsed; the user opens the first box
        App.ValeObjectLibrary_Refresh();
        App.ValeObjectLibrary_RenderInspector();
        App.ValeObjectLibrary_UpdateHash();
        const firstName = Model.root && Model.root.def ? Model.root.def.name : 'the first box';
        const hintText  = Elements.hint.querySelector('.hint__text');
        hintText.textContent = view === 'library'
            ? 'Click ' + firstName + ' to open a collection and find the objects in it. A Scheme is where those objects are assembled.'
            : 'Click ' + firstName + ' to open it, then click each box to work down through the nesting';
        if (!State.booting && State.tourIndex < 0) {
            App.ValeObjectLibrary_ShowHint();
        }
        if (opts.fit !== false) {
            App.ValeObjectLibrary_FitAll();
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Open every box on the route to a placement
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RevealPlacement = function (placement) {
        let opened = false;
        for (let node = placement.parent; node; node = node.parent) {
            if (!State.expanded.has(node.uid)) {
                State.expanded.add(node.uid);
                opened = true;
            }
        }
        if (opened) {
            State.detail = 'custom';
        }
        return opened;
    };

    App.ValeObjectLibrary_RevealDef = function (id) {
        const def = Model.defs.get(id);
        if (!def) {
            return false;
        }
        const placements = def.tier === 'resource'
            ? def.users.reduce(function (list, user) { return list.concat(user.placements); }, [])
            : def.placements;
        let opened = false;
        placements.forEach(function (placement) {
            opened = App.ValeObjectLibrary_RevealPlacement(placement) || opened;
        });
        return opened;
    };
    // ------------------------------------------------------------

    // FUNCTION | Open one branch and collapse every shelf outside that group
    // ------------------------------------------------------------
    // Used by the library network. The route up to the opened box stays
    // open. Its own children stay on show (that is the group). Every other
    // open branch closes, and the walk then hides the shelves beside it.
    App.ValeObjectLibrary_FocusBranch = function (placement) {
        if (!placement || !App.ValeObjectLibrary_IsForce()) {
            return;
        }
        const keep = new Set();
        for (let node = placement; node; node = node.parent) {
            keep.add(node.uid);
        }
        Array.from(State.expanded).forEach(function (uid) {
            if (!keep.has(uid)) {
                State.expanded.delete(uid);
            }
        });
        for (let node = placement; node; node = node.parent) {
            if (node.children.length) {
                State.expanded.add(node.uid);
            }
        }
        State.branchFocus = true;
        State.detail      = 'custom';
    };
    // ------------------------------------------------------------

    // FUNCTION | Open or close one box
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ToggleNode = function (placement, open) {
        if (!placement.children.length) {
            return;
        }
        const isOpen = State.expanded.has(placement.uid);
        const want   = open === undefined ? !isOpen : open;
        if (want === isOpen && !(want && App.ValeObjectLibrary_IsForce() && !State.branchFocus)) {
            return;                                                          // <-- An already-open shelf in the network still collapses the others
        }
        if (want && App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_FocusBranch(placement);
        } else if (want) {
            State.expanded.add(placement.uid);
            State.detail = 'custom';
        } else {
            State.expanded.delete(placement.uid);
            State.detail = 'custom';
        }
        App.ValeObjectLibrary_Refresh();
    };
    // ------------------------------------------------------------

    // FUNCTION | Open the whole chart to one level
    // ------------------------------------------------------------
    // Levels: scheme, family, assembly, parts (everything open), all
    // (everything open and every Resource link drawn).
    App.ValeObjectLibrary_ApplyDetail = function (level) {
        State.branchFocus = false;                                           // <-- A level button shows every shelf at that depth
        State.expanded.clear();
        const depth = { scheme: 0, family: 1, assembly: 2, parts: 9, all: 9 }[level];
        Model.placements.forEach(function (placement) {
            if (placement.children.length && TierRank[placement.tier] < depth) {
                State.expanded.add(placement.uid);
            }
        });
        State.allLinks = false;                                              // <-- Resource links belong to the selected part, not to every box
        State.detail   = level;
    };

    App.ValeObjectLibrary_SetDetail = function (level) {
        App.ValeObjectLibrary_ApplyDetail(level);
        App.ValeObjectLibrary_Refresh();
    };

    // FUNCTION | Close every open branch and return to the root
    // ------------------------------------------------------------
    // Double-click on empty canvas, and Escape, both come here.
    App.ValeObjectLibrary_CollapseToTop = function () {
        App.ValeObjectLibrary_HideHint();
        App.ValeObjectLibrary_ApplyDetail('scheme');                         // <-- Only the root stays; every shelf below it closes
        App.ValeObjectLibrary_Select(null, { refresh: true });
        App.ValeObjectLibrary_FitAll();
    };
    // ------------------------------------------------------------

    // FUNCTION | Re-lay out and redraw after anything opens or closes
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Refresh = function () {
        if (App.ValeObjectLibrary_IsForce()) {
            App.ValeObjectLibrary_ForceRefresh();                                // <-- The whole-library view is a network, not a tree
            return;
        }
        App.ValeObjectLibrary_BuildColumns();                                // <-- Sub-assemblies and Resources join only once they are open
        App.ValeObjectLibrary_ComputeLayout();
        App.ValeObjectLibrary_SyncLane();
        App.ValeObjectLibrary_BuildTierStrip();
        App.ValeObjectLibrary_UpdateZoomExtent();
        App.ValeObjectLibrary_RenderBands();
        App.ValeObjectLibrary_RenderLinks();
        App.ValeObjectLibrary_RenderNodes();
        App.ValeObjectLibrary_ComputeFocus();
        App.ValeObjectLibrary_ApplyStateClasses();
        App.ValeObjectLibrary_RenderRefs(true);
        App.ValeObjectLibrary_UpdateControls();
        App.ValeObjectLibrary_QueueFrame();
    };
    // ------------------------------------------------------------

    // FUNCTION | Click handlers for the boxes
    // ------------------------------------------------------------
    // A click selects the box and, if it is closed, opens it - one click
    // shows both what it is (panel) and what is inside it (chart).
    App.ValeObjectLibrary_OnNodeClick = function (event, placement) {
        event.stopPropagation();
        App.ValeObjectLibrary_HideHint();
        if (App.ValeObjectLibrary_IsForce() && placement.children.length) {
            if (State.branchFocus && State.expanded.has(placement.uid)
                && State.selection && State.selection.uid === placement.uid) {
                State.expanded.delete(placement.uid);                        // <-- Click the open group again to close it and bring the other shelves back
                State.detail = 'custom';
            } else {
                App.ValeObjectLibrary_FocusBranch(placement);                // <-- One group on show; the shelves outside it collapse
            }
            App.ValeObjectLibrary_Select({ type: 'node', uid: placement.uid }, { refresh: true });
            return;
        }
        const opening = placement.children.length > 0 && !State.expanded.has(placement.uid);
        if (opening) {
            State.expanded.add(placement.uid);
            State.detail = 'custom';
        }
        App.ValeObjectLibrary_Select({ type: 'node', uid: placement.uid }, { refresh: opening });
    };

    App.ValeObjectLibrary_OnNodeDoubleClick = function (event, placement) {
        event.stopPropagation();
        event.preventDefault();
        App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_SubtreeBox(placement), { maxK: 1.2 });
    };
    // ------------------------------------------------------------

    // FUNCTION | Move the selection with the arrow keys
    // ------------------------------------------------------------
    App.ValeObjectLibrary_NavigateSelection = function (direction) {
        const selection = State.selection;
        if (!selection) {
            App.ValeObjectLibrary_Select({ type: 'node', uid: Model.root.uid }, { fly: true });
            return;
        }
        if (selection.type === 'resource') {
            const list  = Model.resources;
            const index = list.findIndex(function (r) { return r.id === selection.id; });
            if (direction === 'up' && index > 0) {
                App.ValeObjectLibrary_Select({ type: 'resource', id: list[index - 1].id }, { fly: true });
            } else if (direction === 'down' && index < list.length - 1) {
                App.ValeObjectLibrary_Select({ type: 'resource', id: list[index + 1].id }, { fly: true });
            } else if (direction === 'left' && State.focus && State.focus.refPairs.length) {
                App.ValeObjectLibrary_Select({ type: 'node', uid: State.focus.refPairs[0][0] }, { fly: true });
            }
            return;
        }
        const placement = App.ValeObjectLibrary_NearestVisible(Model.byUid.get(selection.uid));
        if (direction === 'left') {
            if (placement.parent) {
                App.ValeObjectLibrary_Select({ type: 'node', uid: placement.parent.uid }, { fly: true });
            }
            return;
        }
        if (direction === 'right') {
            if (placement.children.length) {
                const opening = !State.expanded.has(placement.uid);
                if (App.ValeObjectLibrary_IsForce()) {
                    App.ValeObjectLibrary_FocusBranch(placement);
                } else if (opening) {
                    State.expanded.add(placement.uid);
                    State.detail = 'custom';
                }
                App.ValeObjectLibrary_Select({ type: 'node', uid: placement.children[0].uid }, { fly: true, refresh: opening || State.branchFocus });
            } else if (placement.def.uses.length) {
                App.ValeObjectLibrary_Select({ type: 'resource', id: placement.def.uses[0] }, { fly: true });
            }
            return;
        }
        const column = App.ValeObjectLibrary_ColumnOf(placement);
        const stack  = Layout.visible
            .filter(function (p) { return App.ValeObjectLibrary_ColumnOf(p) === column; })
            .sort(function (a, b) { return Layout.pos.get(a.uid).y - Layout.pos.get(b.uid).y; });
        const index = stack.indexOf(placement);
        const next  = stack[direction === 'up' ? index - 1 : index + 1];
        if (next) {
            App.ValeObjectLibrary_Select({ type: 'node', uid: next.uid }, { fly: true });
        }
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
