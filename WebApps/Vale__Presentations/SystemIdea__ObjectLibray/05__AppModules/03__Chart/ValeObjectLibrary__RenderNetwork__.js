/* =============================================================================
 * VALE OBJECT LIBRARY - FORCE-DIRECTED VIEW OF THE WHOLE LIBRARY
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__RenderNetwork__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Chart
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Force-directed view of the whole library
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
 * - An opened group's children sit on a circle around it, spaced so the labels can be read
 *
 * 16-Oct-2026 - Version 2.0.2
 * - Following one branch hides the shelves outside that group, so the ring is not drawn over them
 *
 * 16-Oct-2026 - Version 2.0.3
 * - Related collections sit on one arc (columns together, the roof together) with a pale wash behind each family
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Glyph  = App.Glyph;
    const Model  = App.Model;
    const Layout = App.Layout;
    const State  = App.State;
    const Layers = App.Layers;

    // =====================================================================
    // REGION | Library Network - Force-Directed View of the Whole Library
    // =====================================================================
    // The whole-library view is a network rather than a tree. Vale Object
    // Library sits pinned in the middle; open a node and its contents
    // spring out around it (d3-force, as in Observable's force-directed
    // graph). A selected part's resources are read in the attributes
    // column. The network does not spawn resource bubbles. Layout.pos is
    // refreshed every tick, so selection, camera and labels
    // work exactly as they do in the scheme view.
    // =====================================================================

    const Force = { sim: null, nodes: new Map(), signature: '', pendingFit: null, fitTimer: null, shelfPlan: null };
    App.Force = Force;                                                           // <-- Shared: the floating labels (Overlays) read each bubble's label side from it
    const ForceRadius = { library: 44, category: 20, range: 18, assembly: 22, component: 17, product: 17, resource: 15 };   // <-- Every bubble now holds its graphic, so even the small ones are big enough to read
    const ForceCharge = { library: -1600, category: -620, range: -420, assembly: -300, component: -140, product: -140, resource: -190 };
    const ForceRingSpread = Math.PI * 1.05;                                  // <-- Just past a semicircle on the outer side, so the ring does not curl back through the library

    App.ValeObjectLibrary_IsForce = function () {
        return State.view === 'library';
    };

    App.ValeObjectLibrary_ForceBox = function (node) {
        return { x: node.x - node.r, y: node.y, w: node.r * 2, h: node.r * 2 };
    };

    // FUNCTION | Create the simulation once
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceInit = function () {
        if (Force.sim) {
            return;
        }
        Force.sim = d3.forceSimulation()
            .velocityDecay(0.35)
            .force('link', d3.forceLink())
            .force('charge', d3.forceManyBody().distanceMax(1400))
            .force('collide', d3.forceCollide().radius(function (n) { return n.r + 12; }).iterations(2))
            .force('x', d3.forceX(0).strength(0.008))                       // <-- A light pull to the middle keeps the network round
            .force('y', d3.forceY(0).strength(0.008))
            .force('branches', App.ValeObjectLibrary_ForceBranches())
            .force('shelves', App.ValeObjectLibrary_ForceShelves())          // <-- Related collections stay on their family's arc
            .on('tick', App.ValeObjectLibrary_ForceTick)
            .stop();
    };

    // FUNCTION | Where one child sits on the circle around its opened parent
    // ------------------------------------------------------------
    // The children run around the outer side of the opened box, evenly
    // spaced, and the ring grows with the list so the names stay apart.
    // It does not wrap back through the rest of the library.
    App.ValeObjectLibrary_ForceRing = function (parentNode, grandNode, index, count, childR) {
        let ux = 1;
        let uy = 0;
        if (grandNode) {
            ux = parentNode.x - grandNode.x;
            uy = parentNode.y - grandNode.y;
            const length = Math.hypot(ux, uy) || 1;
            ux /= length;
            uy /= length;
        }
        const outward = Math.atan2(uy, ux);
        const radius  = Math.max(parentNode.r + childR + 100, count <= 1 ? 120 : ((count - 1) * 72) / ForceRingSpread);
        const angle   = count <= 1 ? outward : outward - ForceRingSpread / 2 + (index / (count - 1)) * ForceRingSpread;
        const x       = parentNode.x + Math.cos(angle) * radius;
        const y       = parentNode.y + Math.sin(angle) * radius;
        return {
            x         : x,
            y         : y,
            radius    : radius,
            labelSide : x >= parentNode.x ? 'right' : 'left'                  // <-- The name sits on the outside of the ring
        };
    };

    // FUNCTION | How far a collection sits from the centre
    // ------------------------------------------------------------
    // A closed shelf stays on the family arc. An open one steps outward so
    // its own ring clears the shelves beside it.
    App.ValeObjectLibrary_ShelfRadius = function (placement) {
        const childR  = ForceRadius[placement.tier] || 20;
        const open    = State.expanded.has(placement.uid) ? placement.children.length : 0;
        const libraryR = ForceRadius.library;
        if (open > 1) {
            const ring    = Math.max(childR + 17 + 100, ((open - 1) * 72) / ForceRingSpread);
            const inward  = ring * Math.max(0, -Math.cos(ForceRingSpread / 2));
            return libraryR + inward + 260;
        }
        return libraryR + childR + 200;
    };

    // FUNCTION | Where each collection sits - related ones share an arc
    // ------------------------------------------------------------
    // Columns, the roof, the openings and the interior each take a run of
    // the circle, with a wider gap between families than between siblings.
    // The fullest family takes the upper right. The gap beside it faces
    // right, so the centre's own caption is not written across a wash.
    App.ValeObjectLibrary_ShelfPlan = function () {
        const root = Model.root && Model.root.tier === 'library' ? Model.root : null;
        const empty = { families: [], byUid: new Map(), withinStep: 0, betweenStep: 0 };
        if (!root || !root.children.length) {
            return empty;
        }
        const shelves = root.children.slice().sort(function (a, b) {
            const orderA = a.def.shelfOrder === undefined ? 99 : a.def.shelfOrder;
            const orderB = b.def.shelfOrder === undefined ? 99 : b.def.shelfOrder;
            return orderA - orderB || root.children.indexOf(a) - root.children.indexOf(b);
        });
        const families = [];
        shelves.forEach(function (shelf) {
            const name = shelf.def.shelfFamily || 'Other';
            let family = families[families.length - 1];
            if (!family || family.name !== name) {
                family = { name: name, colour: shelf.def.shelfWash || '#e4eaef', shelves: [] };
                families.push(family);
            }
            family.shelves.push(shelf);
        });
        const within  = 1;
        const between = 1.85;                                               // <-- A clear gap between one family and the next
        let units = 0;
        families.forEach(function (family) {
            units += Math.max(family.shelves.length - 1, 0) * within + between;
        });
        const step        = (Math.PI * 2) / units;
        const withinStep  = step * within;
        const betweenStep = step * between;
        const angles  = new Map();
        let cursor    = 0;
        let largest   = families[0];
        families.forEach(function (family) {
            family.a0 = cursor;
            family.shelves.forEach(function (shelf, index) {
                angles.set(shelf.uid, cursor + index * withinStep);
            });
            family.a1 = cursor + Math.max(family.shelves.length - 1, 0) * withinStep;
            cursor   += (family.a1 - family.a0) + betweenStep;
            if (family.shelves.length > largest.shelves.length) {
                largest = family;
            }
        });
        const centerShift = -((largest.a0 + largest.a1) / 2);              // <-- Fullest family centred on the right, for a moment
        const gapMid      = ((largest.a1 - largest.a0) / 2) + betweenStep / 2;
        const shift       = centerShift - gapMid;                           // <-- Then turn so the gap beside it faces right, clear of the centre's caption
        const byUid = new Map();
        families.forEach(function (family) {
            family.a0 += shift;
            family.a1 += shift;
            family.pad = betweenStep * 0.28;                                // <-- The wash stops short of the next family
            family.shelves.forEach(function (shelf) {
                byUid.set(shelf.uid, { angle: angles.get(shelf.uid) + shift, family: family.name });
            });
        });
        return { families: families, byUid: byUid, withinStep: withinStep, betweenStep: betweenStep };
    };

    // FUNCTION | The point a collection is held to
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ShelfSpot = function (placement) {
        const plan  = Force.shelfPlan;
        const entry = plan && plan.byUid.get(placement.uid);
        if (!entry) {
            return null;
        }
        const radius = App.ValeObjectLibrary_ShelfRadius(placement);
        return {
            x         : Math.cos(entry.angle) * radius,
            y         : Math.sin(entry.angle) * radius,
            angle     : entry.angle,
            labelSide : Math.cos(entry.angle) >= 0 ? 'right' : 'left'       // <-- The name sits on the outside of the wheel
        };
    };

    // FUNCTION | A custom force - related collections stay on their arc
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceShelves = function () {
        let nodes = [];
        function force() {
            nodes.forEach(function (node) {
                const placement = node.placement;
                if (!placement || !placement.parent || placement.parent.parent) {
                    return;                                                  // <-- Only the collections around the centre
                }
                const spot = App.ValeObjectLibrary_ShelfSpot(placement);
                if (!spot) {
                    return;
                }
                node.labelSide = spot.labelSide;
                node.vx += (spot.x - node.x) * 0.72;
                node.vy += (spot.y - node.y) * 0.72;
            });
        }
        force.initialize = function (simNodes) { nodes = simNodes; };
        return force;
    };

    // FUNCTION | A custom force - an opened box's children sit on a circle around it
    // ------------------------------------------------------------
    // The collections around Vale Object Library are held on family arcs.
    // Anything opened further is held on a ring, evenly spaced, instead of
    // fanning into a pile.
    App.ValeObjectLibrary_ForceBranches = function () {
        let nodes = [];
        function force() {
            nodes.forEach(function (node) {
                const placement = node.placement;
                if (!placement || !placement.parent || !placement.parent.parent) {
                    return;                                                  // <-- The centre is pinned; collections are held on the family arc
                }
                const parent = Force.nodes.get(placement.parent.uid);
                const grand  = Force.nodes.get(placement.parent.parent.uid);
                if (!parent) {
                    return;
                }
                const siblings = placement.parent.children;
                const spot     = App.ValeObjectLibrary_ForceRing(parent, grand, siblings.indexOf(placement), siblings.length, node.r);
                node.labelSide = spot.labelSide;
                node.vx += (spot.x - node.x) * 0.65;
                node.vy += (spot.y - node.y) * 0.65;
            });
        }
        force.initialize = function (simNodes) { nodes = simNodes; };
        return force;
    };

    // SUB FUNCTION | How hard a node pushes - an open shelf pushes harder the more it holds
    App.ValeObjectLibrary_ForceChargeOf = function (node) {
        if (node.kind === 'resource') {
            return ForceCharge.resource;
        }
        const placement = node.placement;
        const open      = State.expanded.has(placement.uid) ? placement.children.length : 0;
        if (placement.tier === 'library') {
            return ForceCharge.library;
        }
        if (placement.tier === 'category' || placement.tier === 'range') {
            return ForceCharge[placement.tier] - open * 170;
        }
        if (placement.parent && placement.parent.parent) {
            return open ? -120 - open * 50 : 0;                              // <-- On a ring: leave the circle round; an open one still makes room for its own ring
        }
        return -40 - open * 60;
    };

    App.ValeObjectLibrary_ForceStop = function () {
        if (Force.sim) {
            Force.sim.stop();
        }
        Force.nodes.clear();
        Force.signature  = '';
        Force.shelfPlan  = null;
        Force.pendingFit = null;
        window.clearTimeout(Force.fitTimer);
    };
    // ------------------------------------------------------------

    // FUNCTION | Rebuild the network after anything opens, closes or is selected
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceRefresh = function () {
        App.ValeObjectLibrary_ForceInit();
        Force.shelfPlan = App.ValeObjectLibrary_ShelfPlan();                 // <-- Related collections share an arc; rebuilt as shelves open and close

        // What is open decides what is on show
        const visible = [];
        const links   = [];
        (function walk(placement) {
            visible.push(placement);
            if (State.expanded.has(placement.uid)) {
                let children = placement.children;
                if (State.branchFocus) {
                    const openChild = children.filter(function (child) { return State.expanded.has(child.uid); });
                    if (openChild.length === 1) {
                        children = openChild;                                // <-- The branch being followed; the shelves beside it collapse
                    }
                }
                children.forEach(function (child) {
                    links.push({ parent: placement, child: child });
                    walk(child);
                });
            }
        })(Model.root);
        Layout.visible = visible;
        Layout.links   = links;

        // Nodes for the boxes - a new one starts on its parent, then springs out
        let placementsChanged = false;
        const keep = new Set();
        visible.forEach(function (placement) {
            keep.add(placement.uid);
            if (Force.nodes.has(placement.uid)) {
                return;
            }
            const parent    = placement.parent && Force.nodes.get(placement.parent.uid);
            const grand     = placement.parent && placement.parent.parent && Force.nodes.get(placement.parent.parent.uid);
            const ring      = parent && placement.parent.parent
                ? App.ValeObjectLibrary_ForceRing(parent, grand, placement.parent.children.indexOf(placement), placement.parent.children.length, ForceRadius[placement.tier] || 8)
                : null;
            const shelfSpot = parent && placement.parent && !placement.parent.parent
                ? App.ValeObjectLibrary_ShelfSpot(placement)
                : null;
            const angle     = Math.random() * Math.PI * 2;
            const node      = {
                key       : placement.uid,
                kind      : 'placement',
                placement : placement,
                tier      : placement.tier,
                r         : ForceRadius[placement.tier] || 8,
                charge    : ForceCharge[placement.tier] || -45,
                x         : ring ? ring.x : shelfSpot ? shelfSpot.x : parent ? parent.x + Math.cos(angle) * 14 : 0,
                y         : ring ? ring.y : shelfSpot ? shelfSpot.y : parent ? parent.y + Math.sin(angle) * 14 : 0,
                labelSide : ring ? ring.labelSide : shelfSpot ? shelfSpot.labelSide : null
            };
            if (!placement.parent) {
                node.fx = 0;                                                 // <-- Vale Object Library stays pinned in the middle
                node.fy = 0;
            }
            Force.nodes.set(node.key, node);
            placementsChanged = true;
        });
        Force.nodes.forEach(function (node, key) {
            if (node.kind === 'placement' && !keep.has(key)) {
                Force.nodes.delete(key);
                placementsChanged = true;
            }
        });
        Layout.pos = new Map();
        Force.nodes.forEach(function (node) {
            if (node.kind === 'placement') {
                Layout.pos.set(node.key, App.ValeObjectLibrary_ForceBox(node));
            }
        });

        // Resources stay in the attributes column. Drop any resource bubbles.
        App.ValeObjectLibrary_ComputeFocus();
        Force.nodes.forEach(function (node, key) {
            if (node.kind === 'resource') {
                Force.nodes.delete(key);
            }
        });
        Layout.res = new Map();

        const simLinks = links.map(function (link) {
            return { source: Force.nodes.get(link.parent.uid), target: Force.nodes.get(link.child.uid), kind: 'contains' };
        }).filter(function (link) { return link.source && link.target; });

        const signature = Array.from(Force.nodes.keys()).join(',') + '#' + simLinks.map(function (link) { return link.source.key + '>' + link.target.key; }).join(',');
        if (signature !== Force.signature) {
            Force.signature = signature;
            Force.sim.nodes(Array.from(Force.nodes.values()));
            Force.sim.force('link').links(simLinks)
                .distance(function (link) {
                    if (link.kind === 'ref') { return 95; }                  // <-- A selection's Resources sit close beside it
                    const open = link.target.placement && State.expanded.has(link.target.uid) ? link.target.placement.children.length : 0;
                    if (link.target.placement && link.target.placement.parent && link.target.placement.parent.parent) {
                        return App.ValeObjectLibrary_ForceRing(link.source, null, 0, link.source.placement.children.length, link.target.r).radius;
                    }
                    if (link.target.placement && link.target.placement.parent && !link.target.placement.parent.parent) {
                        return App.ValeObjectLibrary_ShelfRadius(link.target.placement);   // <-- Same distance the family arc holds it to
                    }
                    if (open > 1) {                                          // <-- An opened shelf moves out so its ring clears the others
                        const ring = Math.max(link.target.r + 17 + 100, ((open - 1) * 72) / ForceRingSpread);
                        const inward = ring * Math.max(0, -Math.cos(ForceRingSpread / 2));
                        return link.source.r + inward + 260;
                    }
                    return link.source.r + link.target.r + 170 + open * 8;   // <-- A full shelf sits further out from the centre
                })
                .strength(function (link) {
                    if (link.kind === 'ref') { return 0.35; }
                    return link.target.placement && link.target.placement.parent && link.target.placement.parent.parent ? 0.2 : 0.85;   // <-- The ring force places these; the spring only holds the distance
                });
            Force.sim.force('charge').strength(App.ValeObjectLibrary_ForceChargeOf);
            Force.sim.alpha(Math.max(Force.sim.alpha(), placementsChanged ? 0.75 : 0.3)).restart();
        }

        App.ValeObjectLibrary_ForceRender(links);
        App.ValeObjectLibrary_ApplyStateClasses();
        App.ValeObjectLibrary_RenderRefs(false);
        App.ValeObjectLibrary_UpdateControls();
        App.ValeObjectLibrary_QueueFrame();
    };
    // ------------------------------------------------------------

    // FUNCTION | Draw the network's nodes and lines (positions come from the tick)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceRender = function (links) {
        Layers.links.selectAll('path.link')
            .data(links, function (link) { return link.child.uid; })
            .join('path')
            .attr('class', 'link');

        const nodes = Layers.nodes.selectAll('g.node').data(Layout.visible, function (placement) { return placement.uid; });
        nodes.exit().remove();
        const entering = nodes.enter().append('g')
            .attr('class', function (placement) { return 'node fnode tier-' + placement.tier; })
            .on('click', App.ValeObjectLibrary_OnNodeClick)
            .on('dblclick', App.ValeObjectLibrary_OnNodeDoubleClick)
            .call(App.ValeObjectLibrary_ForceDrag(false));
        entering.each(function (placement) { App.ValeObjectLibrary_BuildForceNode(d3.select(this), placement); });
        entering.merge(nodes).each(function (placement) { App.ValeObjectLibrary_UpdateForceNode(d3.select(this), placement); });

        const resources = [];
        Force.nodes.forEach(function (node) {
            if (node.kind === 'resource') {
                resources.push(node.resource);
            }
        });
        const resourceNodes = Layers.lane.selectAll('g.res').data(resources, function (resource) { return resource.id; });
        resourceNodes.exit().remove();
        resourceNodes.enter().append('g')
            .attr('class', 'res fres')
            .style('--node-colour', function (resource) { return resource.data.Swatch || App.ValeObjectLibrary_TierColour('resource'); })
            .on('click', function (event, resource) {
                event.stopPropagation();
                App.ValeObjectLibrary_HideHint();
                App.ValeObjectLibrary_Select({ type: 'resource', id: resource.id });
            })
            .on('dblclick', function (event) { event.stopPropagation(); })
            .call(App.ValeObjectLibrary_ForceDrag(true))
            .each(function (resource) {
                const group = d3.select(this);
                const resourceBody = group.append('g').attr('class', 'res__body');
                resourceBody.append('circle').attr('class', 'res__card').attr('r', ForceRadius.resource);   // <-- White, ringed in its swatch colour (CSS)
                resourceBody.append('image').attr('class', 'fnode__graphic').attr('href', Glyph.resource)
                    .attr('x', -ForceGraphic.resource.size / 2).attr('y', -ForceGraphic.resource.size / 2)
                    .attr('width', ForceGraphic.resource.size).attr('height', ForceGraphic.resource.size);
                group.append('title').text(resource.name + ' - shared resource, used by ' + App.ValeObjectLibrary_Plural(resource.users.length, 'object', 'objects'));
            });

        App.ValeObjectLibrary_ForceTick();                                       // <-- Put everything where it is now, straight away
    };

    // FUNCTION | A pale wash behind each family of collections
    // ------------------------------------------------------------
    // The wash follows the arc those collections share. It is drawn only
    // while the shelves are on show together; opening one collection hides
    // the others, and the wash goes with them.
    App.ValeObjectLibrary_FamilySector = function (a0, a1, r0, r1) {
        const large = (a1 - a0) > Math.PI ? 1 : 0;
        const at = function (angle, radius) {
            return Math.cos(angle) * radius + ',' + Math.sin(angle) * radius;
        };
        return 'M' + at(a0, r1)
            + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + at(a1, r1)
            + 'L' + at(a1, r0)
            + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + at(a0, r0)
            + 'Z';
    };

    App.ValeObjectLibrary_RenderFamilyShades = function () {
        const plan = Force.shelfPlan;
        if (!Layers.bands) {
            return;
        }
        if (!plan || !App.ValeObjectLibrary_IsForce()) {
            Layers.bands.selectAll('g.family-shade').remove();
            return;
        }
        let showing = 0;
        plan.families.forEach(function (family) {
            family.shelves.forEach(function (shelf) {
                if (Force.nodes.has(shelf.uid)) {
                    showing += 1;
                }
            });
        });
        const drawn = showing < 2 ? [] : plan.families.map(function (family) {
            const visible = family.shelves.filter(function (shelf) { return Force.nodes.has(shelf.uid); });
            if (!visible.length) {
                return null;
            }
            let inner = Infinity;
            let outer = 0;
            visible.forEach(function (shelf) {
                const node = Force.nodes.get(shelf.uid);
                const reach = Math.hypot(node.x, node.y);
                inner = Math.min(inner, reach - node.r);
                outer = Math.max(outer, reach + node.r);
            });
            const a0 = plan.byUid.get(visible[0].uid).angle;
            const a1 = plan.byUid.get(visible[visible.length - 1].uid).angle;
            return {
                key    : family.name,
                colour : family.colour,
                a0     : a0 - family.pad,
                a1     : a1 + family.pad,
                r0     : Math.max(78, inner - 36),
                r1     : outer + 28,
                label  : family.name.toUpperCase(),
                mid    : (a0 + a1) / 2
            };
        }).filter(function (family) { return family; });

        const groups = Layers.bands.selectAll('g.family-shade').data(drawn, function (family) { return family.key; });
        groups.exit().remove();
        const entering = groups.enter().append('g').attr('class', 'family-shade');
        entering.append('path').attr('class', 'family-shade__wash');
        const all = entering.merge(groups);
        all.select('path.family-shade__wash')
            .attr('d', function (family) { return App.ValeObjectLibrary_FamilySector(family.a0, family.a1, family.r0, family.r1); })
            .attr('fill', function (family) { return family.colour; });
        all.select('text.family-shade__label').remove();                     // <-- The name is an HTML label, so it stays readable as you zoom
    };
    // ------------------------------------------------------------

    // The Vale graphics in the network's white bubbles - the pavilion mark at the centre, the box on every
    // category, and each kind of thing's own graphic - sized to sit inside the ring (the ring itself is CSS)
    const ForceGraphic = {
        library   : { size: 70 },
        category  : { size: 40 },
        range     : { size: 32 },
        assembly  : { size: 40 },
        component : { size: 30 },
        product   : { size: 30 },
        resource  : { size: 26 }
    };

    App.ValeObjectLibrary_BuildForceNode = function (group, placement) {
        const r    = ForceRadius[placement.tier] || 8;
        const body = group.style('--node-colour', App.ValeObjectLibrary_TierColour(placement.tier)).append('g').attr('class', 'node__body');
        if (placement.tier === 'library') {
            body.append('circle').attr('class', 'fnode__pulse').attr('r', r);
        }
        body.append('circle').attr('class', 'node__card').attr('r', r);
        if (placement.tier === 'category' || placement.tier === 'range') {          // <-- A shelf is coloured by what it holds, so they can be told apart at a glance
            const kinds = App.ValeObjectLibrary_GroupKinds(placement);
            group.classed('holds-' + (kinds.length === 1 ? kinds[0] : 'mixed'), true);   // <-- One kind: the CSS gives the whole ring that tier's colour
            if (kinds.length > 1) {                                                   // <-- Several kinds: one arc each, drawn over the ring (CSS colours them)
                kinds.forEach(function (kind, index) {
                    const share = 100 / kinds.length;
                    body.append('circle').attr('class', 'node__seg tier-' + kind).attr('r', r).attr('pathLength', 100)
                        .style('stroke-dasharray', share + ' ' + (100 - share))
                        .style('stroke-dashoffset', -index * share);
                });
            }
        }
        const graphic = ForceGraphic[placement.tier];
        if (graphic) {
            body.append('image').attr('class', 'fnode__graphic').attr('href', Glyph[placement.tier])
                .attr('x', -graphic.size / 2).attr('y', -graphic.size / 2)
                .attr('width', graphic.size).attr('height', graphic.size);
        }
        if (placement.tier !== 'library') {
            const badge = body.append('g').attr('class', 'fnode__badge')                // <-- What a closed bubble holds, on its rim
                .attr('transform', 'translate(' + (r * 0.74) + ',' + (r * 0.74) + ')');
            badge.append('rect').attr('y', -7).attr('height', 14).attr('rx', 7);
            badge.append('text').attr('class', 'fnode__count').attr('dy', '0.35em').attr('text-anchor', 'middle');
        } else {
            body.append('text').attr('class', 'fnode__count').attr('dy', '0.35em').attr('text-anchor', 'middle');
        }
        if (App.ValeObjectLibrary_IsUnavailable(placement.def)) {
            group.classed('is-unavailable', true);
        }
        group.append('title').text(placement.def.name + ' - ' + App.ValeObjectLibrary_TierLabel(placement)
            + (placement.def.data['Product Code'] ? ' ' + placement.def.data['Product Code'] : ''));
    };

    App.ValeObjectLibrary_UpdateForceNode = function (group, placement) {
        const open = State.expanded.has(placement.uid) && placement.children.length > 0;
        group.classed('is-expanded', open)
             .classed('is-start', placement.tier === 'library' && !open);       // <-- The closed centre pulses: click me
        group.select('.fnode__count').text(!open && placement.children.length && placement.tier !== 'library' ? '+' + placement.children.length : '');
        const badge = group.select('.fnode__badge');
        if (!badge.empty()) {
            const count = group.select('.fnode__count').text();
            const width = 8 + count.length * 6;
            badge.style('display', count ? null : 'none');                   // <-- An open category shows its contents instead
            badge.select('rect').attr('x', -width / 2).attr('width', width);
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Drag a node to rearrange the network (it springs back when let go)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceDrag = function (isResource) {
        function nodeOf(datum) {
            return Force.nodes.get(isResource ? 'res:' + datum.id : datum.uid);
        }
        return d3.drag()
            .clickDistance(4)
            .subject(function (event, datum) {
                const node = nodeOf(datum);
                return node ? { x: node.x, y: node.y } : { x: event.x, y: event.y };
            })
            .on('start', function (event, datum) {
                const node = nodeOf(datum);
                if (!node) { return; }
                if (!event.active) { Force.sim.alphaTarget(0.25).restart(); }
                node.fx = node.x;
                node.fy = node.y;
                App.ValeObjectLibrary_HideHint();
            })
            .on('drag', function (event, datum) {
                const node = nodeOf(datum);
                if (!node) { return; }
                node.fx = event.x;
                node.fy = event.y;
            })
            .on('end', function (event, datum) {
                const node = nodeOf(datum);
                if (!node) { return; }
                if (!event.active) { Force.sim.alphaTarget(0); }
                if (!(node.placement && !node.placement.parent)) {
                    node.fx = null;                                          // <-- Let go; the centre stays where it is dropped
                    node.fy = null;
                }
            });
    };
    // ------------------------------------------------------------

    // FUNCTION | Every tick - move the drawing, keep the shared position maps current
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ForceTick = function () {
        if (!App.ValeObjectLibrary_IsForce()) {
            return;
        }
        const round = function (v) { return Math.round(v * 10) / 10; };
        Force.nodes.forEach(function (node) {
            const box = App.ValeObjectLibrary_ForceBox(node);
            if (node.kind === 'placement') {
                Layout.pos.set(node.key, box);
            } else {
                Layout.res.set(node.resource.id, box);
            }
        });
        Layers.nodes.selectAll('g.node').attr('transform', function (placement) {
            const node = Force.nodes.get(placement.uid);
            return node ? 'translate(' + round(node.x) + ',' + round(node.y) + ')' : null;
        });
        Layers.lane.selectAll('g.res').attr('transform', function (resource) {
            const node = Force.nodes.get('res:' + resource.id);
            return node ? 'translate(' + round(node.x) + ',' + round(node.y) + ')' : null;
        });
        Layers.links.selectAll('path.link').attr('d', function (link) {
            const a = Force.nodes.get(link.parent.uid);
            const b = Force.nodes.get(link.child.uid);
            return a && b ? 'M' + round(a.x) + ',' + round(a.y) + 'L' + round(b.x) + ',' + round(b.y) : null;
        });
        Layers.refs.selectAll('path.ref').attr('d', App.ValeObjectLibrary_ForceRefPath);
        App.ValeObjectLibrary_RenderFamilyShades();
        Layout.bounds = App.ValeObjectLibrary_ContentBounds();
        App.ValeObjectLibrary_QueueFrame();
        if (Force.pendingFit && Force.sim && Force.sim.alpha() < 0.3) {
            App.ValeObjectLibrary_RunPendingFit(false);
        }
    };

    App.ValeObjectLibrary_ForceRefPath = function (pair) {
        const a = Force.nodes.get(pair.from);
        const b = Force.nodes.get('res:' + pair.to);
        if (!a || !b) {
            return null;
        }
        return 'M' + Math.round(a.x * 10) / 10 + ',' + Math.round(a.y * 10) / 10 + 'L' + Math.round(b.x * 10) / 10 + ',' + Math.round(b.y * 10) / 10;
    };
    // ------------------------------------------------------------

    // FUNCTION | Move the camera once the network has sprung into place
    // ------------------------------------------------------------
    // In the scheme view (or once the network is still) it runs at once.
    App.ValeObjectLibrary_AfterSettle = function (callback) {
        if (App.ValeObjectLibrary_IsForce() && Force.sim && Force.nodes.size > 1 && Force.sim.alpha() >= 0.3) {
            Force.pendingFit = callback;
            window.clearTimeout(Force.fitTimer);
            Force.fitTimer = window.setTimeout(function () { App.ValeObjectLibrary_RunPendingFit(true); }, 1600);   // <-- Never wait for ever
            return;
        }
        callback();
    };

    App.ValeObjectLibrary_RunPendingFit = function (late) {
        window.clearTimeout(Force.fitTimer);
        if (late && Force.pendingFit && Force.sim && Force.sim.alpha() >= 0.3) {
            // The browser is throttling the animation (a background tab) - finish the
            // settling in one go, so the camera frames where the nodes really end up
            const ticks = Math.ceil(Math.log(0.3 / Force.sim.alpha()) / Math.log(1 - Force.sim.alphaDecay()));
            Force.sim.tick(Math.max(1, ticks));
            App.ValeObjectLibrary_ForceTick();
        }
        const callback = Force.pendingFit;
        Force.pendingFit = null;
        if (callback) {
            callback();
        }
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
