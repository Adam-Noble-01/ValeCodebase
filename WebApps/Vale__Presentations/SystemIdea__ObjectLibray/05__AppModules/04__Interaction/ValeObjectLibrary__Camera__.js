/* =============================================================================
 * VALE OBJECT LIBRARY - ZOOM, PAN, FIT, GRID AND LEVEL OF DETAIL
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Camera__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Interaction
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Zoom, pan, fit, grid and level of detail
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
    const Elements = App.Elements;
    const Layers   = App.Layers;
    const Runtime  = App.Runtime;

    // =====================================================================
    // REGION | Camera - Zoom, Pan, Fit, Grid and Level of Detail
    // =====================================================================

    // FUNCTION | Wire up D3 zoom - wheel zooms, left or middle drag pans
    // ------------------------------------------------------------
    App.ValeObjectLibrary_InitZoom = function () {
        Runtime.Zoom = d3.zoom()
            .scaleExtent([Settings.zoomMin, Settings.zoomMax])
            .filter(function (event) {
                if (event.type === 'wheel') { return true; }
                if (event.type === 'dblclick') { return false; }
                if (event.type === 'mousedown') { return event.button === 0 || event.button === 1; }   // <-- Middle button pans, as in CAD
                return !event.button;
            })
            .on('start', function (event) {
                Layers.svg.classed('is-moving', true);
                if (event.sourceEvent) {
                    if (event.sourceEvent.type === 'mousedown') {
                        Layers.svg.classed('is-panning', true);
                    }
                }
            })
            .on('zoom', function (event) {
                State.transform = event.transform;
                Layers.viewport.attr('transform', event.transform);
                App.ValeObjectLibrary_QueueFrame();
            })
            .on('end', function () {
                Layers.svg.classed('is-panning', false).classed('is-moving', false);
            });

        Layers.svg.call(Runtime.Zoom).on('dblclick.zoom', null);

        Layers.svg.on('click', function (event) {
            if (!event.target.closest('.node, .res')) {
                App.ValeObjectLibrary_Select(null);
            }
        });
        Layers.svg.on('dblclick', function (event) {
            if (!event.target.closest('.node, .res')) {
                App.ValeObjectLibrary_CollapseToTop();                        // <-- Empty canvas: close every branch and return to the root
            }
        });
        Elements.canvas.addEventListener('mousedown', function (event) {
            if (event.button === 1) {
                event.preventDefault();                                      // <-- No browser auto-scroll on a middle-button drag
            }
        });
        Elements.canvas.addEventListener('auxclick', function (event) {
            if (event.button === 1 && event.detail === 2) {
                App.ValeObjectLibrary_FitAll();                                  // <-- Double middle-click = zoom extents, as in CAD
            }
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Batch every per-frame update behind one animation frame
    // ------------------------------------------------------------
    App.ValeObjectLibrary_QueueFrame = function () {
        if (State.frameQueued || !State.transform) {
            return;
        }
        State.frameQueued = true;
        window.requestAnimationFrame(function () {
            State.frameQueued = false;
            const transform = State.transform;
            App.ValeObjectLibrary_UpdateGrid(transform);
            App.ValeObjectLibrary_UpdateLod(transform.k);
            App.ValeObjectLibrary_UpdateTierStrip(transform);
            App.ValeObjectLibrary_UpdateFloatingLabels(transform);
            App.ValeObjectLibrary_PlaceHint(transform);
            Elements.zoomReadout.textContent = Math.round(transform.k * 100) + '%';
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | CAD grid - the spacing steps by fives so it never gets too dense
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateGrid = function (transform) {
        let step = 10;
        while (step * transform.k < 14) { step *= 5; }
        while (step * transform.k > 70) { step /= 5; }
        const minor = step * transform.k;
        setPattern(Elements.gridMinor, minor);
        setPattern(Elements.gridMajor, minor * 5);

        function setPattern(pattern, size) {
            const wrap = function (value) { return ((value % size) + size) % size; };
            pattern.setAttribute('width', size);
            pattern.setAttribute('height', size);
            pattern.setAttribute('x', wrap(transform.x));
            pattern.setAttribute('y', wrap(transform.y));
            pattern.firstElementChild.setAttribute('d', 'M' + size + ' 0H0V' + size);
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Level of detail - full text, then a larger short name, then shapes
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateLod = function (k) {
        const lod = k >= Settings.lodFull ? 'full' : k >= Settings.lodLow ? 'mid' : 'low';
        if (lod !== State.lod) {
            State.lod = lod;
            Elements.chart.setAttribute('data-lod', lod);
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Let the zoom go out far enough to see everything, however big the library grows
    // ------------------------------------------------------------
    App.ValeObjectLibrary_UpdateZoomExtent = function () {
        if (!Runtime.Zoom) {
            return;
        }
        const view = App.ValeObjectLibrary_ViewArea();
        const fitK = Math.min((view.width - 96) / Layout.bounds.w, (view.bottom - view.top) / Layout.bounds.h);
        State.zoomMin = Math.max(0.002, Math.min(Settings.zoomMin, fitK * 0.8));
        Runtime.Zoom.scaleExtent([State.zoomMin, Settings.zoomMax]);
    };
    // ------------------------------------------------------------

    // FUNCTION | Fit a chart-space box into the view
    // ------------------------------------------------------------
    App.ValeObjectLibrary_FitBox = function (box, options) {
        const opts   = Object.assign({ maxK: 1, padding: 48, duration: Settings.flyDuration }, options);
        const view   = App.ValeObjectLibrary_ViewArea();
        const width  = Math.max(80, view.width - opts.padding * 2);
        const height = Math.max(80, view.bottom - view.top);
        let k = Math.min(width / Math.max(box.w, 1), height / Math.max(box.h, 1), opts.maxK);
        k = Math.max(State.zoomMin || Settings.zoomMin, Math.min(Settings.zoomMax, k));
        const tx = view.width / 2 - k * (box.x + box.w / 2);
        const ty = (view.top + view.bottom) / 2 - k * (box.y + box.h / 2);
        const target = d3.zoomIdentity.translate(tx, ty).scale(k);
        Layers.svg.interrupt('camera');
        if (opts.duration) {
            Layers.svg.transition('camera').duration(opts.duration).ease(d3.easeCubicInOut).call(Runtime.Zoom.transform, target);
        } else {
            Layers.svg.call(Runtime.Zoom.transform, target);
        }
    };

    // SUB FUNCTION | The part of the canvas not covered by the strip, toolbar or tour card
    App.ValeObjectLibrary_ViewArea = function () {
        const width   = Elements.canvas.clientWidth;
        const height  = Elements.canvas.clientHeight;
        const touring = State.tourIndex >= 0 && !Elements.tour.hidden;
        let reserve = Elements.toolbar.offsetHeight + 32;
        if (touring) {
            reserve = Math.max(reserve, Elements.tour.offsetHeight + parseFloat(Elements.tour.style.bottom || 80) + 18);
        }
        return { width: width, height: height, top: Settings.stripHeight + 20, bottom: Math.max(Settings.stripHeight + 120, height - reserve) };
    };
    // ------------------------------------------------------------

    // FUNCTION | Keep a box on screen, moving the camera only when it is off screen or too small
    // ------------------------------------------------------------
    App.ValeObjectLibrary_EnsureVisible = function (box) {
        const t      = State.transform;
        const view   = App.ValeObjectLibrary_ViewArea();
        const margin = 40;
        const inside = t.applyX(box.x) >= margin && t.applyX(box.x + box.w) <= view.width - margin
                    && t.applyY(box.y) >= view.top && t.applyY(box.y + box.h) <= view.bottom;
        if (inside && t.k >= Settings.lodFull) {
            return;
        }
        const k  = Math.min(1.1, Math.max(t.k, 0.85));
        const tx = view.width / 2 - k * (box.x + box.w / 2);
        const ty = (view.top + view.bottom) / 2 - k * (box.y + box.h / 2);
        Layers.svg.interrupt('camera');
        Layers.svg.transition('camera').duration(Settings.flyDuration).ease(d3.easeCubicInOut)
            .call(Runtime.Zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    };
    // ------------------------------------------------------------

    // FUNCTION | Camera shortcuts
    // ------------------------------------------------------------
    App.ValeObjectLibrary_FitAll = function () {
        App.ValeObjectLibrary_AfterSettle(function () {
            App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_ContentBounds(), { maxK: 1 });
        });
    };

    App.ValeObjectLibrary_FitSelection = function () {
        const selection = State.selection;
        if (!selection) {
            App.ValeObjectLibrary_FitAll();
            return;
        }
        if (selection.type === 'resource') {
            const anchors = State.focus ? State.focus.refPairs.map(function (pair) { return pair[0]; }) : [];
            App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_BoxOf(anchors, [selection.id]), { maxK: 1.1 });
            return;
        }
        App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_SubtreeBox(App.ValeObjectLibrary_NearestVisible(Model.byUid.get(selection.uid))), { maxK: 1.2 });
    };

    // SUB FUNCTION | A box, plus whatever is open inside it; a part shows with its siblings
    App.ValeObjectLibrary_SubtreeBox = function (placement) {
        const base = App.ValeObjectLibrary_IsPart(placement.tier) && placement.parent ? placement.parent : placement;
        const uids = [base.uid];
        (function walk(node) {
            if (!State.expanded.has(node.uid)) {
                return;
            }
            node.children.forEach(function (child) {
                uids.push(child.uid);
                walk(child);
            });
        })(base);
        return App.ValeObjectLibrary_BoxOf(uids, []);
    };

    App.ValeObjectLibrary_ViewCentre = function () {
        const view = App.ValeObjectLibrary_ViewArea();
        return [view.width / 2, (view.top + view.bottom) / 2];
    };

    App.ValeObjectLibrary_ZoomBy = function (factor) {
        Layers.svg.interrupt('camera');
        Layers.svg.transition('camera').duration(220).call(Runtime.Zoom.scaleBy, factor, App.ValeObjectLibrary_ViewCentre());
    };

    App.ValeObjectLibrary_ZoomReset = function () {
        Layers.svg.interrupt('camera');
        Layers.svg.transition('camera').duration(300).call(Runtime.Zoom.scaleTo, 1, App.ValeObjectLibrary_ViewCentre());
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
