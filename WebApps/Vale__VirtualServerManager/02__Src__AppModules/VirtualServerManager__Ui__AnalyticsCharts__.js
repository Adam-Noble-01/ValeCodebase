/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 06 CHART KIT (D3)
   =============================================================================

   FILE       : VirtualServerManager__Ui__AnalyticsCharts__.js
   NAMESPACE  : Vsm.Charts
   MODULE     : Ui - Analytics Charts
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The charts tab 06 (User analytics) draws, on the vendored D3
                7.9.0: stacked columns with a date brush, lines with a
                crosshair, weekday-by-hour heatmaps, bar lists, funnels,
                histograms, a butterfly, the people-by-day strip, meters,
                sparklines, the one hover tip, and every chart's table twin
   CREATED    : 18-Nov-2026

   DESCRIPTION:
   - D3 is window.d3, from 04__Lib__ThirdParty__VersionLocked/01__Vendor__D3__v7.9.0/
     dist/d3.min.js (one script tag, before this file). Charts.Ready() is false
     when it did not load: tab 06 says so and the other tabs carry on.
   - TWO SERIES, ONE MEANING EACH: clients (no sign-in) and staff (signed in), in
     tab 05's Insights colours (--Vsm_InsClient blue, --Vsm_InsStaff orange),
     checked colour-blind safe on white (CVD dE 24.7, normal-vision dE 33.6).
     Magnitude uses each one's own light-to-dark ramp (heatmaps, the strip); the
     journeys use the client blue as an ordinal ramp, evenly stepped in Lab (each
     step >= 0.06 lighter, the lightest >= 2:1 on white); a refusal wears the
     reserved critical red, always beside its icon, never next to the staff
     orange (the two are too close to share a chart). Text never wears a series
     colour.
   - MARKS: columns at most 24 px wide, list bars 12 px, 2 px apart, rounded only
     at the data end (4 px) and square on the baseline; lines 2 px with an 8 px
     end dot in a 2 px white ring; gridlines and the baseline are solid hairlines.
   - EVERY CHART draws into its card at the card's width (tab 06 redraws on a
     resize), tells its numbers on hover and keyboard focus through one tip (the
     value first, then what it is), and has a table twin (Charts.Table) with the
     same numbers. Bars, rows and names that narrow the page are buttons.
   - Labels come from the ledger (project names, link labels, targets): they are
     set with textContent, never as HTML.

   =============================================================================

   DEVELOPMENT LOG:
   18-Nov-2026 - Version 0.17.0
   - Initial build (manager 0.17.0, tab 06).

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Charts = Vsm.Charts = {};
    var d3 = window.d3;

// -----------------------------------------------------------------------------
// REGION | Tokens, Ramps and Number Words
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Colours (the stylesheet's tokens; these only if a token is missing)
    // ------------------------------------------------------------
    var Vsm__Fallback = {
        client  : ['--Vsm_InsClient', '#2a78d6'],
        staff   : ['--Vsm_InsStaff', '#eb6834'],
        critical: ['--Vsm_AnaCritical', '#d03b3b'],
        good    : ['--Vsm_AnaGood', '#006300'],
        zero    : ['--Vsm_AnaZero', '#f1f3f5'],
        navy    : ['--Vale_PrimaryBrand', '#172b3a']
    };
    var Vsm__Tokens = null;

    var Vsm__RampStops = {                                                     // <-- Light to dark, one hue each (lightness checked monotone)
        client: ['#eaf2fd', '#b7d3f6', '#6da7ec', '#2a78d6', '#1c5cab', '#0d366b'],
        staff : ['#fdeee6', '#f8c7ae', '#f19a70', '#eb6834', '#b9471a', '#7a2c0c']
    };
    var Vsm__OrdinalEnds = ['#0d366b', '#86b6ef'];                             // <-- Journeys: blue 700 to 250, stepped evenly in Lab

    Charts.Margin = { t: 14, r: 72, b: 28, l: 46 };                            // <-- Shared by the period charts, so their days line up
    Charts.WeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    Charts.WeekDaysLong = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is D3 Here, Colours, Ramps
    // ------------------------------------------------------------
    Charts.Ready = function() { return !!(d3 && d3.version && d3.select); };

    Charts.Color = function(name) {
        if (!Vsm__Tokens) {
            var cs = window.getComputedStyle(document.documentElement);
            Vsm__Tokens = {};
            Object.keys(Vsm__Fallback).forEach(function(k) {
                Vsm__Tokens[k] = cs.getPropertyValue(Vsm__Fallback[k][0]).trim() || Vsm__Fallback[k][1];
            });
        }
        return Vsm__Tokens[name] || name;
    };

    Charts.Ramp = function(name) { return d3.piecewise(d3.interpolateLab, Vsm__RampStops[name] || Vsm__RampStops.client); };

    Charts.Ordinal = function(n) {                                             // <-- n steps, darkest first
        var f = d3.interpolateLab(Vsm__OrdinalEnds[0], Vsm__OrdinalEnds[1]);
        return d3.range(n).map(function(i) { return d3.color(f(n > 1 ? i / (n - 1) : 0)).formatHex(); });
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Numbers in Words ("1,284", "12.9K", "46%", "3 h 20 min", "1.2 s")
    // ------------------------------------------------------------
    Charts.Num = function(n) { return (Math.round(Number(n) || 0)).toLocaleString('en-GB'); };

    Charts.Compact = function(n) {
        var a = Math.abs(Number(n) || 0);
        var trim = function(v) { return (Math.round(v * 10) / 10).toString(); };
        if (a < 1e4) return Charts.Num(n);
        if (a < 1e6) return trim(n / 1e3) + 'K';
        return trim(n / 1e6) + 'M';
    };

    Charts.Pct = function(part, whole) {
        if (!whole) return '0%';
        var p = part / whole * 100;
        return (p > 0 && p < 1 ? '<1' : Math.round(p)) + '%';
    };

    Charts.Dur = function(seconds) {
        var s = Math.round(Number(seconds) || 0);
        if (s < 60) return s + ' s';
        var m = Math.round(s / 60);
        if (m < 60) return m + ' min';
        return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    };

    Charts.Secs = function(s) {
        if (s == null || isNaN(s)) return '—';
        return s < 10 ? (Math.round(s * 10) / 10) + ' s' : s < 120 ? Math.round(s) + ' s' : Charts.Dur(s);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Hover Tip, Keys, Bindings
// -----------------------------------------------------------------------------

    // FUNCTION | One Tip for the Tab: { head, rows: [{ key, value, label }], note }
    // ------------------------------------------------------------
    // The value leads (bold), the series name follows; each row keys its series
    // with a short line in the series colour. Built with textContent: labels are
    // ledger data.
    // ------------------------------------------------------------
    function Vsm__TipEl() { return Vsm.El('Vsm__AnaTip'); }

    function Vsm__TipFill(box, tip) {
        box.textContent = '';
        var add = function(parent, tag, cls, text) {
            var n = document.createElement(tag);
            if (cls) n.className = cls;
            if (text != null) n.textContent = text;
            parent.appendChild(n);
            return n;
        };
        if (tip.head) add(box, 'div', 'Vsm__AnaTipHead', tip.head);
        (tip.rows || []).forEach(function(r) {
            var row = add(box, 'div', 'Vsm__AnaTipRow');
            add(row, 'span', r.key ? 'Vsm__AnaTipKey is-' + r.key : '');
            add(row, 'b', '', r.value == null ? '' : String(r.value));
            add(row, 'span', '', r.label || '');
        });
        if (tip.note) add(box, 'div', 'Vsm__AnaTipNote', tip.note);
    }

    function Vsm__TipPlace(box, x, y) {
        box.hidden = false;
        var r = box.getBoundingClientRect(), px = x + 14, py = y + 14;
        if (px + r.width > window.innerWidth - 8) px = x - r.width - 14;
        if (py + r.height > window.innerHeight - 8) py = y - r.height - 14;
        box.style.left = Math.max(4, px) + 'px';
        box.style.top = Math.max(4, py) + 'px';
    }

    Charts.Tip = {
        Show: function(event, tip) {
            var box = Vsm__TipEl();
            if (!box || !tip) return;
            Vsm__TipFill(box, tip);
            Vsm__TipPlace(box, event.clientX, event.clientY);
        },
        ShowAt: function(node, tip) {                                          // <-- Keyboard focus: beside the element
            var box = Vsm__TipEl();
            if (!box || !tip || !node) return;
            var r = node.getBoundingClientRect();
            Vsm__TipFill(box, tip);
            Vsm__TipPlace(box, r.left + Math.min(r.width, 160), r.top + r.height / 2);
        },
        Hide: function() { var box = Vsm__TipEl(); if (box) box.hidden = true; }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Tip on Hover and Focus, a Click That Also Answers Enter and Space
    // ------------------------------------------------------------
    Charts.Bind = function(sel, tipFn, onClick) {
        sel.on('pointermove', function(event, d) { var t = tipFn && tipFn(d); if (t) Charts.Tip.Show(event, t); })
           .on('pointerleave', function() { Charts.Tip.Hide(); })
           .on('focus', function(event, d) { var t = tipFn && tipFn(d); if (t) Charts.Tip.ShowAt(this, t); })
           .on('blur', function() { Charts.Tip.Hide(); });
        if (!onClick) return;
        sel.attr('tabindex', 0).attr('role', 'button')
           .on('click', function(event, d) { Charts.Tip.Hide(); onClick(d, event); })
           .on('keydown', function(event, d) {
               if (event.key !== 'Enter' && event.key !== ' ') return;
               event.preventDefault();
               Charts.Tip.Hide();
               onClick(d, event);
           });
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Legend: [['client', 'Clients'], ['staff', 'Staff']] as boxes (bars) or short lines (lines)
    // ------------------------------------------------------------
    Charts.Keys = function(keys, shape) {
        var box = document.createElement('span');
        box.className = 'Vsm__AnaKeys';
        keys.forEach(function(k) {
            var s = document.createElement('span'), i = document.createElement('i');
            i.className = 'Vsm__AnaKey is-' + k[0] + (shape === 'line' ? ' is-line' : '');
            s.appendChild(i);
            s.appendChild(document.createTextNode(k[1]));
            box.appendChild(s);
        });
        return box;
    };

    Charts.Empty = function(el, text, isError) {
        el.textContent = '';
        var d = document.createElement('div');
        d.className = 'Vsm__AnaEmpty' + (isError ? ' is-error' : '');
        d.textContent = text;
        el.appendChild(d);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Plumbing: Frame, Bands, Grid, Time Labels, Rounded Marks
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | The Card's Width, an SVG at Exactly That Size
    // ------------------------------------------------------------
    function Vsm__Width(el) { return Math.max(280, Math.floor(el.clientWidth || el.getBoundingClientRect().width || 640)); }

    function Vsm__Svg(el, W, H, label) {
        el.textContent = '';
        return d3.select(el).append('svg').attr('class', 'Vsm__AnaSvg').attr('width', W).attr('height', H)
            .attr('viewBox', [0, 0, W, H]).attr('role', 'img').attr('aria-label', label || '');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Time Buckets Across the Plot (the same band for columns and lines)
    // ------------------------------------------------------------
    function Vsm__Band(n, W, m) {
        return d3.scaleBand().domain(d3.range(n)).range([m.l, W - m.r]).paddingInner(n > 60 ? 0.12 : 0.24).paddingOuter(0.08);
    }

    function Vsm__TimeLabel(unit) {
        return unit === 'hour' ? d3.timeFormat('%H:%M') : unit === 'month' ? d3.timeFormat('%b %Y') : d3.timeFormat('%-d %b');
    }

    function Vsm__XLabels(svg, list, centers, unit, y, plotWidth) {
        var fmt = Vsm__TimeLabel(unit), n = list.length;
        var every = Math.max(1, Math.ceil(n * 46 / Math.max(1, plotWidth)));
        var g = svg.append('g');
        list.forEach(function(b, i) {
            if (i % every) return;
            g.append('text').attr('x', centers[i]).attr('y', y).attr('text-anchor', 'middle').text(fmt(new Date(b.t0)));
        });
    }

    function Vsm__GridY(svg, y, x0, x1, fmt, ticks) {
        var g = svg.append('g');
        (ticks || y.ticks(4)).forEach(function(v) {
            var yy = Math.round(y(v)) + 0.5;
            g.append('line').attr('class', v === 0 ? 'is-base' : 'is-grid').attr('x1', x0).attr('x2', x1).attr('y1', yy).attr('y2', yy);
            g.append('text').attr('x', x0 - 8).attr('y', yy).attr('dy', '0.32em').attr('text-anchor', 'end').text(fmt(v));
        });
    }

    var Vsm__LogTicks = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200];   // <-- Times: seconds to two hours
    // ------------------------------------------------------------
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Bar Shapes: the Data End Rounded, the Foot Square on the Baseline
    // ------------------------------------------------------------
    function Vsm__Rect(x, y, w, h) {
        return 'M' + x.toFixed(1) + ',' + y.toFixed(1) + 'h' + w.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-w).toFixed(1) + 'Z';
    }

    function Vsm__TopRounded(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h));
        return 'M' + x.toFixed(1) + ',' + (y + h).toFixed(1) + 'V' + (y + r).toFixed(1) + 'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' +
               (x + r).toFixed(1) + ',' + y.toFixed(1) + 'H' + (x + w - r).toFixed(1) + 'Q' + (x + w).toFixed(1) + ',' + y.toFixed(1) + ' ' +
               (x + w).toFixed(1) + ',' + (y + r).toFixed(1) + 'V' + (y + h).toFixed(1) + 'Z';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | The Range a Drag Chose, Shown on a Period Chart: [first, last] bucket inside it
    // ------------------------------------------------------------
    function Vsm__RangeIdx(list, range) {
        if (!range) return null;
        var lo = -1, hi = -1;
        list.forEach(function(b, i) { if (b.t0 >= range[0] && b.t0 < range[1]) { if (lo < 0) lo = i; hi = i; } });
        return lo < 0 ? null : [lo, hi];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Period Charts: Stacked Columns (with the brush) and Lines (with the crosshair)
// -----------------------------------------------------------------------------

    // FUNCTION | Stacked Columns: clients at the foot, staff above, 2 px apart
    // ------------------------------------------------------------
    // spec: { buckets: [{ t0, t1, c, s }], unit, height, range: [t0, t1] | null,
    //         tip(bucket, i), onRange([t0, t1] | null), label,
    //         single: 'critical' (one series instead: each bucket's n, in that colour) }
    // Drag across the plot to choose a range of days (it snaps to whole buckets);
    // click a column to choose that one; click outside a chosen range to clear it.
    // ------------------------------------------------------------
    Charts.Columns = function(el, spec) {
        var list = spec.buckets || [], n = list.length;
        var W = Vsm__Width(el), H = spec.height || 220, m = Charts.Margin;
        var svg = Vsm__Svg(el, W, H, spec.label);
        if (!n) return;
        if (spec.single) list = list.map(function(b) { return Object.assign({}, b, { c: 0, s: 0, one: b.n || 0 }); });
        var x = Vsm__Band(n, W, m), centers = list.map(function(b, i) { return x(i) + x.bandwidth() / 2; });
        var bw = Math.max(1, Math.min(24, x.bandwidth())), r = Math.min(4, bw / 2);
        var max = d3.max(list, function(b) { return (b.c || 0) + (b.s || 0) + (b.one || 0); }) || 0;
        var y = d3.scaleLinear().domain([0, Math.max(4, max)]).nice(4).range([H - m.b, m.t]);
        var idx = Vsm__RangeIdx(list, spec.range);
        if (idx) {
            svg.append('rect').attr('class', 'is-range').attr('x', centers[idx[0]] - x.step() / 2).attr('y', m.t)
               .attr('width', centers[idx[1]] - centers[idx[0]] + x.step()).attr('height', H - m.b - m.t);
        }
        Vsm__GridY(svg, y, m.l, W - m.r, Charts.Compact);
        var hover = svg.append('rect').attr('class', 'is-hover').attr('y', m.t).attr('width', x.step()).attr('height', H - m.b - m.t).attr('opacity', 0);
        var base = y(0), bars = svg.append('g');
        list.forEach(function(b, i) {
            var c = b.c || 0, s = b.s || 0;
            if (b.one) {
                var ho = Math.max(1, base - y(b.one));
                bars.append('path').attr('class', 'is-' + spec.single).attr('opacity', idx && (i < idx[0] || i > idx[1]) ? 0.3 : 1)
                    .attr('d', Vsm__TopRounded(centers[i] - bw / 2, base - ho, bw, ho, r));
                return;
            }
            if (!c && !s) return;
            var x0 = centers[i] - bw / 2;
            var hc = c ? Math.max(1, base - y(c)) : 0, hsAll = s ? Math.max(1, base - y(s)) : 0;
            var g = bars.append('g').attr('opacity', idx && (i < idx[0] || i > idx[1]) ? 0.3 : 1);
            if (c) g.append('path').attr('class', 'is-client').attr('d', s ? Vsm__Rect(x0, base - hc, bw, hc) : Vsm__TopRounded(x0, base - hc, bw, hc, r));
            if (s) {
                var gap = c ? 2 : 0;                                           // <-- The surface gap is cut from the upper segment, so the top stays true
                g.append('path').attr('class', 'is-staff').attr('d', Vsm__TopRounded(x0, base - hc - hsAll, bw, Math.max(1, hsAll - gap), r));
            }
        });
        Vsm__XLabels(svg, list, centers, spec.unit, H - m.b + 17, W - m.l - m.r);
        svg.on('pointermove', function(event) {
            var p = d3.pointer(event, svg.node());
            if (p[0] < m.l || p[0] > W - m.r || p[1] > H - m.b + 4) { hover.attr('opacity', 0); Charts.Tip.Hide(); return; }
            var i = d3.bisectCenter(centers, p[0]);
            hover.attr('x', centers[i] - x.step() / 2).attr('opacity', 1);
            if (spec.tip) Charts.Tip.Show(event, spec.tip(list[i], i));
        }).on('pointerleave', function() { hover.attr('opacity', 0); Charts.Tip.Hide(); });
        if (!spec.onRange) return;
        var brush = d3.brushX().extent([[m.l, m.t], [W - m.r, H - m.b]]).on('end', function(event) {
            if (!event.sourceEvent) return;                                    // <-- Our own move (showing the range): not a choice
            var sel = event.selection;
            if (!sel) {
                if (idx) { spec.onRange(null); return; }                       // <-- A click outside the range clears it
                var p = d3.pointer(event.sourceEvent, svg.node()), i = d3.bisectCenter(centers, p[0]);
                if (list[i]) spec.onRange([list[i].t0, list[i].t1]);
                return;
            }
            var lo = -1, hi = -1;
            centers.forEach(function(cx, j) { if (cx >= sel[0] && cx <= sel[1]) { if (lo < 0) lo = j; hi = j; } });
            if (lo < 0) lo = hi = d3.bisectCenter(centers, (sel[0] + sel[1]) / 2);
            spec.onRange(lo === 0 && hi === n - 1 ? null : [list[lo].t0, list[hi].t1]);
        });
        var gb = svg.append('g').attr('class', 'Vsm__AnaBrush').call(brush);
        if (idx) gb.call(brush.move, [centers[idx[0]] - x.step() / 2, centers[idx[1]] + x.step() / 2]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Lines: one per series, 2 px, the last point dotted, a crosshair that lists every series
    // ------------------------------------------------------------
    // spec: { buckets, unit, series: [{ key, label, values: [n | null] }], height,
    //         range, yFormat, dots, minTop, log (a log scale for times: one slow
    //         outlier no longer flattens the rest), tip(i), label }
    // ------------------------------------------------------------
    Charts.Lines = function(el, spec) {
        var list = spec.buckets || [], n = list.length, series = spec.series || [];
        var W = Vsm__Width(el), H = spec.height || 190, m = Charts.Margin;
        var svg = Vsm__Svg(el, W, H, spec.label);
        if (!n) return;
        var x = Vsm__Band(n, W, m), centers = list.map(function(b, i) { return x(i) + x.bandwidth() / 2; });
        var max = d3.max(series, function(s) { return d3.max(s.values, function(v) { return v == null ? 0 : v; }); }) || 0;
        var y, ticks = null;
        if (spec.log) {
            var low = d3.min(series, function(s) { return d3.min(s.values, function(v) { return v > 0 ? v : null; }); }) || 1;
            var lo = Vsm__LogTicks.filter(function(t) { return t <= low; }).pop() || Vsm__LogTicks[0];
            var hi = Vsm__LogTicks.find(function(t) { return t >= Math.max(max, lo * 4); }) || Math.max(max, lo * 4);
            y = d3.scaleLog().domain([lo, hi]).range([H - m.b, m.t]).clamp(true);
            ticks = Vsm__LogTicks.filter(function(t) { return t >= lo && t <= hi; });
            if (ticks.length > 6) ticks = ticks.filter(function(t, i) { return i % 2 === 0 || t === hi; });
            series = series.map(function(s) { return Object.assign({}, s, { values: s.values.map(function(v) { return v == null ? null : Math.max(lo, v); }) }); });
        } else {
            y = d3.scaleLinear().domain([0, Math.max(spec.minTop || 4, max)]).nice(4).range([H - m.b, m.t]);
        }
        var fmt = spec.yFormat || Charts.Compact;
        var idx = Vsm__RangeIdx(list, spec.range);
        if (idx) {
            svg.append('rect').attr('class', 'is-range').attr('x', centers[idx[0]] - x.step() / 2).attr('y', m.t)
               .attr('width', centers[idx[1]] - centers[idx[0]] + x.step()).attr('height', H - m.b - m.t);
        }
        Vsm__GridY(svg, y, m.l, W - m.r, fmt, ticks);
        if (spec.log) svg.append('line').attr('class', 'is-base').attr('x1', m.l).attr('x2', W - m.r).attr('y1', H - m.b + 0.5).attr('y2', H - m.b + 0.5);
        var ends = [];
        series.forEach(function(s) {
            var line = d3.line().defined(function(v) { return v != null; }).x(function(v, i) { return centers[i]; })
                .y(function(v) { return y(v); }).curve(spec.log ? d3.curveLinear : d3.curveMonotoneX);   // <-- Straight between medians: no made-up values
            svg.append('path').attr('class', 'is-line is-' + s.key).attr('d', line(s.values));
            s.values.forEach(function(v, i) {                                  // <-- A point with no neighbours draws no line: give it a dot
                var lone = v != null && (i === 0 || s.values[i - 1] == null) && (i === n - 1 || s.values[i + 1] == null);
                if (lone || (spec.dots && v != null)) svg.append('circle').attr('class', 'is-dot is-' + s.key).attr('cx', centers[i]).attr('cy', y(v)).attr('r', lone ? 4 : 3);
            });
            var last = -1;
            s.values.forEach(function(v, i) { if (v != null) last = i; });
            if (last >= 0) {
                svg.append('circle').attr('class', 'is-dot is-' + s.key).attr('cx', centers[last]).attr('cy', y(s.values[last])).attr('r', 4);
                ends.push({ s: s, x: centers[last], y: y(s.values[last]), v: s.values[last] });
            }
        });
        ends.sort(function(a, b) { return a.y - b.y; });                       // <-- End labels only where they stand apart; the legend carries the rest
        var apart = ends.every(function(e, i) { return !i || e.y - ends[i - 1].y >= 14; });
        if (apart) ends.forEach(function(e) {
            svg.append('text').attr('x', e.x + 9).attr('y', e.y).attr('dy', '0.32em').attr('class', 'is-strong').text(fmt(e.v));
        });
        Vsm__XLabels(svg, list, centers, spec.unit, H - m.b + 17, W - m.l - m.r);
        var cross = svg.append('line').attr('class', 'is-cross').attr('y1', m.t).attr('y2', H - m.b).attr('opacity', 0);
        var marks = svg.append('g').attr('pointer-events', 'none');
        svg.append('rect').attr('class', 'is-hit').attr('x', m.l).attr('y', 0).attr('width', W - m.l - m.r).attr('height', H - m.b + 4)
            .on('pointermove', function(event) {
                var p = d3.pointer(event, svg.node()), i = d3.bisectCenter(centers, p[0]);
                var cx = Math.round(centers[i]) + 0.5;
                cross.attr('x1', cx).attr('x2', cx).attr('opacity', 1);
                marks.selectAll('circle').data(series.filter(function(s) { return s.values[i] != null; })).join('circle')
                    .attr('class', function(s) { return 'is-dot is-' + s.key; }).attr('r', 4)
                    .attr('cx', centers[i]).attr('cy', function(s) { return y(s.values[i]); });
                if (spec.tip) Charts.Tip.Show(event, spec.tip(i));
            })
            .on('pointerleave', function() { cross.attr('opacity', 0); marks.selectAll('circle').remove(); Charts.Tip.Hide(); });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grids: the Weekday-by-Hour Heatmap and the People-by-Day Strip
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Count's Shade: nothing is grey, the rest climb the ramp (square-root, so small counts still show)
    // ------------------------------------------------------------
    function Vsm__Shade(ramp, max) {
        var f = Charts.Ramp(ramp), zero = Charts.Color('zero');
        return function(n) { return !n || !max ? zero : f(0.18 + 0.82 * Math.sqrt(Math.min(1, n / max))); };
    }

    function Vsm__ScaleKey(svg, x, y, ramp, max, words) {                      // <-- "Fewer [5 steps] More", with the top count
        var shade = Vsm__Shade(ramp, max), g = svg.append('g');
        g.append('text').attr('x', x).attr('y', y + 8).attr('text-anchor', 'end').text('none');
        g.append('rect').attr('x', x + 6).attr('y', y).attr('width', 12).attr('height', 10).attr('rx', 2).attr('fill', shade(0));
        [0.02, 0.15, 0.4, 0.7, 1].forEach(function(t, i) {
            g.append('rect').attr('x', x + 22 + i * 14).attr('y', y).attr('width', 12).attr('height', 10).attr('rx', 2).attr('fill', shade(Math.max(1e-9, t * max)));
        });
        g.append('text').attr('x', x + 22 + 5 * 14 + 4).attr('y', y + 8).text(Charts.Num(max) + ' ' + (words || 'events'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Heatmap: 7 weekdays by 24 hours
    // ------------------------------------------------------------
    // spec: { cells: [[n, ...24] x 7], ramp: 'staff' | 'client', tip(day, hour, n), label, words }
    // ------------------------------------------------------------
    Charts.Heatmap = function(el, spec) {
        var W = Vsm__Width(el), m = { t: 2, r: 4, b: 46, l: 36 };
        var cw = (W - m.l - m.r) / 24, ch = Math.max(14, Math.min(22, cw * 0.75));
        var H = m.t + 7 * ch + m.b;
        var svg = Vsm__Svg(el, W, H, spec.label);
        var flat = [];
        spec.cells.forEach(function(row, r) { row.forEach(function(n, c) { flat.push({ r: r, c: c, n: n }); }); });
        var max = d3.max(flat, function(d) { return d.n; }) || 0, shade = Vsm__Shade(spec.ramp, max);
        Charts.WeekDays.forEach(function(name, r) {
            svg.append('text').attr('x', m.l - 8).attr('y', m.t + r * ch + ch / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text(name);
        });
        var cells = svg.append('g').selectAll('rect').data(flat).join('rect').attr('class', 'is-cell')
            .attr('x', function(d) { return m.l + d.c * cw + 1; }).attr('y', function(d) { return m.t + d.r * ch + 1; })
            .attr('width', Math.max(1, cw - 2)).attr('height', ch - 2).attr('rx', 2)
            .attr('fill', function(d) { return shade(d.n); });
        Charts.Bind(cells, function(d) { return spec.tip ? spec.tip(d.r, d.c, d.n) : null; });
        for (var h = 0; h < 24; h += 3) {
            svg.append('text').attr('x', m.l + h * cw + cw / 2).attr('y', m.t + 7 * ch + 14).attr('text-anchor', 'middle').text((h < 10 ? '0' : '') + h + ':00');
        }
        Vsm__ScaleKey(svg, m.l + 30, m.t + 7 * ch + 26, spec.ramp, max, spec.words);
    };
    // ------------------------------------------------------------


    // FUNCTION | Strip: one row per person, one cell per day (or week), shaded by how much they did
    // ------------------------------------------------------------
    // spec: { rows: [{ key, name, sub, cells: [n], text }], buckets, unit, ramp,
    //         tip(row, i), onRow(row), label, words }
    // ------------------------------------------------------------
    Charts.Strip = function(el, spec) {
        var rows = spec.rows || [], list = spec.buckets || [], nb = list.length;
        var W = Vsm__Width(el), m = { t: 2, r: 168, b: 44, l: 210 }, rh = 22;
        var H = m.t + rows.length * rh + m.b;
        var svg = Vsm__Svg(el, W, H, spec.label);
        if (!rows.length || !nb) return;
        var cw = (W - m.l - m.r) / nb, pad = cw > 5 ? 1 : 0.25;
        var max = d3.max(rows, function(r) { return d3.max(r.cells); }) || 0, shade = Vsm__Shade(spec.ramp, max);
        var cut = function(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
        var g = svg.selectAll('g.is-row').data(rows).join('g').attr('class', 'is-row')
            .attr('transform', function(d, i) { return 'translate(0,' + (m.t + i * rh) + ')'; });
        var name = g.append('text').attr('class', 'is-name').attr('x', 0).attr('y', rh / 2).attr('dy', '0.32em');
        name.append('tspan').text(function(d) { return cut(d.name, 22); });
        name.append('tspan').attr('class', 'Vsm__Muted').attr('dx', 6).style('fill', 'var(--Vale_TextSecondary)').style('font-size', '11px')
            .text(function(d) { return cut(d.sub, Math.max(0, 30 - String(d.name || '').length)); });
        if (spec.onRow) Charts.Bind(name, function(d) { return { head: d.name, rows: [{ value: d.text, label: '' }], note: 'Click: narrow every chart to ' + d.name }; }, spec.onRow);
        g.each(function(d) {
            var row = d3.select(this);
            var cells = row.selectAll('rect').data(d.cells.map(function(n, i) { return { n: n, i: i, row: d }; })).join('rect').attr('class', 'is-cell')
                .attr('x', function(c) { return m.l + c.i * cw + pad; }).attr('y', 3).attr('width', Math.max(0.75, cw - 2 * pad)).attr('height', rh - 6)
                .attr('rx', cw > 6 ? 2 : 0).attr('fill', function(c) { return shade(c.n); });
            Charts.Bind(cells, function(c) { return spec.tip ? spec.tip(c.row, c.i) : null; });
        });
        g.append('text').attr('x', W - m.r + 12).attr('y', rh / 2).attr('dy', '0.32em').text(function(d) { return d.text; });
        var centers = list.map(function(b, i) { return m.l + i * cw + cw / 2; });
        Vsm__XLabels(svg, list, centers, spec.unit, m.t + rows.length * rh + 14, W - m.l - m.r);
        Vsm__ScaleKey(svg, m.l + 30, m.t + rows.length * rh + 26, spec.ramp, max, spec.words);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Distributions: Grouped Columns (histograms)
// -----------------------------------------------------------------------------

    // FUNCTION | Histogram: per bin, a column for each series, side by side
    // ------------------------------------------------------------
    // spec: { bins: [{ label, c, s }], keys: ['client', 'staff'], share: true (c and s
    //         are 0..1), height, tip(bin), label }
    // ------------------------------------------------------------
    Charts.Histogram = function(el, spec) {
        var bins = spec.bins || [], keys = spec.keys || ['client', 'staff'];
        var W = Vsm__Width(el), H = spec.height || 200, m = { t: 12, r: 10, b: 30, l: 44 };
        var svg = Vsm__Svg(el, W, H, spec.label);
        if (!bins.length) return;
        var x = d3.scaleBand().domain(d3.range(bins.length)).range([m.l, W - m.r]).paddingInner(0.22).paddingOuter(0.06);
        var inner = d3.scaleBand().domain(keys).range([0, x.bandwidth()]).paddingInner(keys.length > 1 ? 0.1 : 0);
        var bw = Math.min(24, inner.bandwidth()), r = Math.min(4, bw / 2);
        var field = { client: 'c', staff: 's', critical: 'n' };
        var max = d3.max(bins, function(b) { return d3.max(keys, function(k) { return b[field[k]] || 0; }); }) || 0;
        var y = d3.scaleLinear().domain([0, spec.share ? Math.max(0.1, max) : Math.max(4, max)]).nice(4).range([H - m.b, m.t]);
        Vsm__GridY(svg, y, m.l, W - m.r, spec.share ? function(v) { return Math.round(v * 100) + '%'; } : Charts.Compact);
        var hover = svg.append('rect').attr('class', 'is-hover').attr('y', m.t).attr('width', x.step()).attr('height', H - m.b - m.t).attr('opacity', 0);
        bins.forEach(function(b, i) {
            var mid = x(i) + x.bandwidth() / 2, groupW = keys.length * bw + (keys.length - 1) * 2;
            keys.forEach(function(k, j) {
                var v = b[field[k]] || 0;
                if (!v) return;
                var h = Math.max(1, y(0) - y(v)), x0 = mid - groupW / 2 + j * (bw + 2);
                svg.append('path').attr('class', 'is-' + k).attr('d', Vsm__TopRounded(x0, y(0) - h, bw, h, r));
            });
            svg.append('text').attr('x', mid).attr('y', H - m.b + 17).attr('text-anchor', 'middle').text(b.short || b.label);
        });
        svg.append('rect').attr('class', 'is-hit').attr('x', m.l).attr('y', 0).attr('width', W - m.l - m.r).attr('height', H)
            .on('pointermove', function(event) {
                var p = d3.pointer(event, svg.node());
                var i = Math.max(0, Math.min(bins.length - 1, Math.floor((p[0] - x(0) + x.step() * x.paddingInner() / 2) / x.step())));
                hover.attr('x', x(i) - x.step() * x.paddingInner() / 2).attr('opacity', 1);
                if (spec.tip) Charts.Tip.Show(event, spec.tip(bins[i], i));
            })
            .on('pointerleave', function() { hover.attr('opacity', 0); Charts.Tip.Hide(); });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lists (HTML, D3 Data Joins): Bars, Funnels, Meters, the Butterfly
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | A Segment's Width: its share of the longest row (2 px gaps taken out first)
    // ------------------------------------------------------------
    function Vsm__SegWidth(f, both) {
        f = Math.max(0, Math.min(1, f || 0));
        return both ? 'max(2px, calc((100% - 2px) * ' + f.toFixed(4) + '))' : 'max(2px, ' + (f * 100).toFixed(2) + '%)';
    }
    // ------------------------------------------------------------


    // FUNCTION | Bars: name, bar, figure; split clients | staff, or one series
    // ------------------------------------------------------------
    // spec: { rows: [{ key, label, sub, c, s, n, text, fill, active, tip }],
    //         split: true (c, s) | false (n, in spec.color or each row's fill),
    //         color, head: [name, bar, figure], onClick(row), empty, more, max }
    // ------------------------------------------------------------
    Charts.Bars = function(el, spec) {
        var rows = spec.rows || [];
        el.textContent = '';
        if (!rows.length) { Charts.Empty(el, spec.empty || 'Nothing in this period.'); return; }
        var total = function(r) { return spec.split ? (r.c || 0) + (r.s || 0) : (r.n || 0); };
        var max = spec.max || d3.max(rows, total) || 1;
        var root = d3.select(el);
        if (spec.head) root.append('div').attr('class', 'Vsm__AnaBarsHead').selectAll('span').data(spec.head).join('span').text(function(t) { return t; });
        var row = root.append('div').attr('class', 'Vsm__AnaBars').selectAll('div').data(rows).join('div')
            .attr('class', function(r) { return 'Vsm__AnaBar' + (spec.onClick ? ' is-click' : '') + (r.active ? ' is-active' : ''); });
        var label = row.append('span').attr('class', 'Vsm__AnaLabel').attr('title', function(r) { return r.title || (r.label + (r.sub ? ' · ' + r.sub : '')); });
        label.append('span').text(function(r) { return r.label; });
        label.filter(function(r) { return !!r.sub; }).append('span').attr('class', 'Vsm__Muted').text(function(r) { return '  ' + r.sub; });
        row.append('span').attr('class', 'Vsm__AnaTrack').each(function(r) {
            var t = d3.select(this), segs = [];
            if (spec.split) {
                if (r.c) segs.push(['is-client', r.c]);
                if (r.s) segs.push(['is-staff', r.s]);
            } else if (r.n) {
                segs.push([r.fill ? '' : 'is-' + (spec.color || 'client'), r.n, r.fill]);
            }
            segs.forEach(function(sg, i) {
                t.append('span').attr('class', 'Vsm__AnaSeg ' + sg[0] + (i === segs.length - 1 ? ' is-end' : ''))
                 .style('width', Vsm__SegWidth(sg[1] / max, segs.length > 1)).style('background', sg[2] || null);
            });
        });
        row.append('span').attr('class', 'Vsm__AnaNum').text(function(r) { return r.text != null ? r.text : Charts.Num(total(r)); });
        Charts.Bind(row, function(r) { return r.tip; }, spec.onClick);
        if (spec.more) root.append('div').attr('class', 'Vsm__AnaEmpty').text(spec.more);
    };
    // ------------------------------------------------------------


    // FUNCTION | Funnel: ordered steps, each its own step of the blue ramp, the share of the first step beside it
    // ------------------------------------------------------------
    // spec: { steps: [{ label, n, tip }], words: 'devices', empty }
    // ------------------------------------------------------------
    Charts.Funnel = function(el, spec) {
        var steps = spec.steps || [], first = steps.length ? steps[0].n : 0;
        if (!first) { Charts.Empty(el, spec.empty || 'Nobody in this period.'); return; }
        var fills = Charts.Ordinal(steps.length);
        Charts.Bars(el, {
            split: false, max: first,
            rows: steps.map(function(s, i) {
                return { label: s.label, n: s.n, fill: fills[i],
                         text: Charts.Num(s.n) + ' · ' + Charts.Pct(s.n, first),
                         tip: s.tip || { head: s.label, rows: [{ value: Charts.Num(s.n), label: (spec.words || 'devices') + ', ' + Charts.Pct(s.n, first) + ' of the first step' }] } };
            })
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Meters: a part against its whole ("5 of 21"), the track a lighter step of the fill
    // ------------------------------------------------------------
    // spec: { rows: [{ label, sub, n, of, text, color, tip, key }], onClick(row), empty }
    // ------------------------------------------------------------
    Charts.Meters = function(el, spec) {
        var rows = spec.rows || [];
        el.textContent = '';
        if (!rows.length) { Charts.Empty(el, spec.empty || 'Nothing to show.'); return; }
        var row = d3.select(el).append('div').attr('class', 'Vsm__AnaBars').selectAll('div').data(rows).join('div')
            .attr('class', function() { return 'Vsm__AnaMeter' + (spec.onClick ? ' is-click' : ''); });
        var label = row.append('span').attr('class', 'Vsm__AnaLabel').attr('title', function(r) { return r.label + (r.sub ? ' · ' + r.sub : ''); });
        label.append('span').text(function(r) { return r.label; });
        label.filter(function(r) { return !!r.sub; }).append('span').attr('class', 'Vsm__Muted').text(function(r) { return '  ' + r.sub; });
        row.append('span').attr('class', function(r) { return 'Vsm__AnaMeterTrack is-' + (r.color || 'staff'); })
            .append('span').attr('class', 'Vsm__AnaMeterFill')
            .style('width', function(r) { return r.of ? Math.max(r.n ? 3 : 0, Math.min(100, r.n / r.of * 100)).toFixed(2) + '%' : '0'; });
        row.append('span').attr('class', 'Vsm__AnaNum').text(function(r) { return r.text; });
        Charts.Bind(row, function(r) { return r.tip; }, spec.onClick);
    };
    // ------------------------------------------------------------


    // FUNCTION | Butterfly: the share of staff (left) and of clients (right) who did each thing
    // ------------------------------------------------------------
    // spec: { rows: [{ label, s, c, tip }] (s, c: 0..1), heads: [left, middle, right], empty }
    // ------------------------------------------------------------
    Charts.Butterfly = function(el, spec) {
        var rows = spec.rows || [];
        el.textContent = '';
        if (!rows.length) { Charts.Empty(el, spec.empty || 'Nothing in this period.'); return; }
        var max = d3.max(rows, function(r) { return Math.max(r.s || 0, r.c || 0); }) || 1;
        var root = d3.select(el).append('div').attr('class', 'Vsm__AnaFly');
        var heads = spec.heads || ['Staff', 'What', 'Clients'];
        root.append('div').attr('class', 'is-head is-left').text(heads[0]);
        root.append('div').attr('class', 'is-head is-mid').text(heads[1]);
        root.append('div').attr('class', 'is-head').text(heads[2]);
        rows.forEach(function(r) {
            var side = function(cls, key, v) {
                var s = root.append('div').attr('class', 'Vsm__AnaFlySide ' + cls).datum(r);
                if (v) s.append('span').attr('class', 'Vsm__AnaSeg is-' + key).style('width', 'max(2px, calc((100% - 44px) * ' + (v / max).toFixed(4) + '))');
                s.append('span').attr('class', 'Vsm__AnaNum').text(v ? Charts.Pct(v, 1) : '—');
                Charts.Bind(s, function(d) { return d.tip; });
            };
            side('is-left', 'staff', r.s);
            var name = root.append('div').attr('class', 'Vsm__AnaFlyName').attr('title', r.label).text(r.label).datum(r);
            Charts.Bind(name, function(d) { return d.tip; });
            side('is-right', 'client', r.c);
        });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Pieces: Sparkline, Table Twin
// -----------------------------------------------------------------------------

    // FUNCTION | Sparkline: the period before in grey, this period in navy, ending in a dot
    // ------------------------------------------------------------
    // spec: { now: [n | null], prev: [n | null] | null, w, h }  ->  an <svg> element
    // ------------------------------------------------------------
    Charts.Spark = function(spec) {
        var now = spec.now || [], prev = spec.prev || [], w = spec.w || 96, h = spec.h || 30, pad = 4;
        var all = prev.concat(now), n = all.length;
        var svg = d3.create('svg').attr('class', 'Vsm__AnaSvg').attr('width', w).attr('height', h).attr('viewBox', [0, 0, w, h]).attr('aria-hidden', 'true');
        if (n < 1) return svg.node();
        var max = d3.max(all, function(v) { return v == null ? 0 : v; }) || 0;
        var x = d3.scaleLinear().domain([0, Math.max(1, n - 1)]).range([pad, w - pad]);
        var y = d3.scaleLinear().domain([0, max || 1]).range([h - pad, pad]);
        var line = d3.line().defined(function(d) { return d.v != null; }).x(function(d) { return x(d.i); }).y(function(d) { return y(d.v); });
        var pts = all.map(function(v, i) { return { v: v, i: i }; });
        if (prev.length) svg.append('path').attr('class', 'is-spark is-prev').attr('d', line(pts.slice(0, prev.length + 1)));
        svg.append('path').attr('class', 'is-spark is-now').attr('d', line(pts.slice(prev.length)));
        for (var i = n - 1; i >= prev.length; i--) {
            if (all[i] == null) continue;
            svg.append('circle').attr('class', 'is-spark-dot').attr('cx', x(i)).attr('cy', y(all[i])).attr('r', 3);
            break;
        }
        return svg.node();
    };
    // ------------------------------------------------------------


    // FUNCTION | Mini Lines: a small multiple's trend, one thin line per series, on its own scale
    // ------------------------------------------------------------
    // spec: { series: [{ key, values: [n] }], w, h }  ->  an <svg> element
    // ------------------------------------------------------------
    Charts.MiniLines = function(spec) {
        var series = spec.series || [], w = spec.w || 150, h = spec.h || 26, pad = 3;
        var n = d3.max(series, function(s) { return s.values.length; }) || 0;
        var svg = d3.create('svg').attr('class', 'Vsm__AnaSvg').attr('width', w).attr('height', h).attr('viewBox', [0, 0, w, h]).attr('aria-hidden', 'true');
        if (n < 2) return svg.node();
        var max = d3.max(series, function(s) { return d3.max(s.values); }) || 1;
        var x = d3.scaleLinear().domain([0, n - 1]).range([pad, w - pad]);
        var y = d3.scaleLinear().domain([0, max]).range([h - pad, pad]);
        svg.append('line').attr('class', 'is-base').attr('x1', pad).attr('x2', w - pad).attr('y1', h - pad + 0.5).attr('y2', h - pad + 0.5);
        series.forEach(function(s) {
            svg.append('path').attr('class', 'is-line is-' + s.key).style('stroke-width', '1.5px')
               .attr('d', d3.line().x(function(v, i) { return x(i); }).y(function(v) { return y(v || 0); })(s.values));
        });
        return svg.node();
    };
    // ------------------------------------------------------------


    // FUNCTION | Table Twin: every chart's numbers as a sortable table
    // ------------------------------------------------------------
    // spec: { cols: [{ label, num }], rows: [[cell, ...]], note, empty }
    // ------------------------------------------------------------
    Charts.Table = function(el, spec) {
        var cols = spec.cols || [], rows = spec.rows || [];
        el.textContent = '';
        if (!rows.length) { Charts.Empty(el, spec.empty || 'No rows in this period.'); return; }
        var wrap = d3.select(el).append('div').attr('class', 'Vsm__AnaTableWrap');
        var table = wrap.append('table').attr('class', 'Vsm__Table');
        table.append('tr').selectAll('th').data(cols).join('th').attr('class', function(c) { return c.num ? 'is-num' : null; }).text(function(c) { return c.label; });
        rows.forEach(function(r) {
            table.append('tr').selectAll('td').data(r).join('td')
                .attr('class', function(v, i) { return cols[i] && cols[i].num ? 'is-num' : null; })
                .text(function(v) { return v == null ? '' : typeof v === 'number' ? Charts.Num(v) : String(v); });
        });
        if (spec.note) d3.select(el).append('p').attr('class', 'Vsm__AnaNote').text(spec.note);
        Vsm.SortTables(el);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
